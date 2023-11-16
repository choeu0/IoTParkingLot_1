// 필요한 패키지 및 모듈 가져오기
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import prisma from './prisma.js';
import { ParkingSpaceState, EntranceEvent } from '@prisma/client';
import bodyParser from 'body-parser';
import mqtt from 'mqtt';

// .env 파일에서 환경 변수 로드
dotenv.config();

// Express 애플리케이션 생성
const app = express();
const port = 5000;

// SSE(Server-Sent Events)를 위한 연결된 클라이언트를 저장하는 배열
let clients = [];

// 미들웨어 구성
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan('tiny'));

// MQTT 토픽 정의
const PARKING_SPOT_STATE = 'parking_spot_state';
const PARKING_LOT = 'parking_lot';

// MQTT 클라이언트 생성 및 토픽 구독
const mqttClient = mqtt.connect('mqtt://127.0.0.1', { port: 1883 });
mqttClient.on('connect', function () {
  mqttClient.subscribe(PARKING_SPOT_STATE);
  mqttClient.subscribe(PARKING_LOT);
});

// MQTT 메시지 처리
mqttClient.on('message', async function (topic, message) {
  console.log(`Message: ${topic}/${message.toString()}`);

  if (topic === PARKING_SPOT_STATE) {
    // 주차 공간 상태 메시지 처리
    const [parkingLotId, parkingSpotName, parkingSpotState] = message.toString().split('|');
    console.log(parkingLotId, parkingSpotName, parkingSpotState);

    // Prisma 트랜잭션을 사용하여 원자성 보장
    await prisma.$transaction(async (tx) => {
      const parkingSpace = await tx.parkingSpace.findFirst({
        where: {
          parkingLotId: parseInt(parkingLotId),
          name: parkingSpotName,
        },
      });

      // 새로운 주차 공간 이력 생성
      const newParkingSpotHistory = await tx.parkingSpaceHistory.create({
        data: {
          parkingSpaceId: parkingSpace.id,
          state: parkingSpotState,
        },
      });

      // 연결된 클라이언트에 이벤트 전송
      sendEventsToAll(`parking-spot/${parkingLotId}`, newParkingSpotHistory);
    });
  } else if (topic === PARKING_LOT) {
    // 주차장 이벤트 메시지 처리
    const [parkingLotId, entranceEvent] = message.toString().split('|');
    console.log(parkingLotId, entranceEvent);

    // Prisma 트랜잭션을 사용하여 원자성 보장
    await prisma.$transaction(async (tx) => {
      // 새로운 주차장 이벤트 생성
      const parkingLotEvent = await tx.parkingLotEvent.create({
        data: {
          parkingLotId: parseInt(parkingLotId),
          event: entranceEvent,
        },
      });

      // 연결된 클라이언트에 이벤트 전송
      sendEventsToAll(`parking-lot/${parkingLotId}`, parkingLotEvent);
    });
  } else {
    // 다른 토픽 처리가 필요한 경우 추가
  }
});

// 헬스 체크 엔드포인트 정의
app.get('/health', (req, res) => {
  res.status(StatusCodes.OK).send(ReasonPhrases.OK);
});

// 모든 주차장 가져오는 엔드포인트 정의
app.get('/parking-lots', async (req, res) => {
  res.json(await prisma.parkingLot.findMany());
});

// ID에 따른 주차장 세부 정보를 가져오는 엔드포인트 정의
app.get('/parking-lots/:id', async (req, res) => {
  // Prisma를 사용하여 주차장 세부 정보 및 관련 데이터 검색
  const id = parseInt(req.params.id);
  const parkingLot = await prisma.parkingLot.findUnique({
    select: {
      id: true,
      name: true,
      location: true,
      parkingSpaces: {
        include: {
          history: {
            take: 1,
            orderBy: {
              created_at: 'desc',
            },
          },
        },
      },
    },
    where: {
      id: id,
    },
  });

  // 주차장에 대한 입차 및 출차 이벤트 수 카운트
  const entries = await prisma.parkingLotEvent.count({
    where: {
      event: EntranceEvent.ENTRY,
      parkingLotId: id,
    },
  });

  const departures = await prisma.parkingLotEvent.count({
    where: {
      event: EntranceEvent.DEPARTURE,
      parkingLotId: id,
    },
  });

  // 주차장 세부 정보 및 이벤트 수를 포함하여 JSON 응답 전송
  res.json({ entries, departures, ...parkingLot });
});

// 실시간 업데이트를 위한 Server-Sent Events (SSE) 엔드포인트 정의
app.get('/events', eventsHandler);

// SSE 연결을 처리하는 함수
function eventsHandler(req, res, next) {
  // SSE 응답 헤더 설정
  const headers = {
    'Content-Type': 'text/event-stream',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
  };

  res.set(headers);

  res.flushHeaders();

  // 클라이언트 식별을 위한 고유한 ID 생성
  const clientId = Date.now();

  // 새로운 클라이언트 정보 생성
  const newClient = {
    id: clientId,
    response: res,
  };

  // 연결된 클라이언트 배열에 추가
  clients.push(newClient);

  // 클라이언트 연결이 닫힐 때 클라이언트 배열에서 제거
  req.on('close', () => {
    console.log(`${clientId} Connection closed`);
    clients = clients.filter((client) => client.id !== clientId);
  });
}

// 모든 클라이언트에 이벤트를 전송하는 함수
function sendEventsToAll(eventType, data) {
  clients.forEach((client) => {
    client.response.write(`id: ${client.id}\n`);
    client.response.write(`event: ${eventType}\n`);
    client.response.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// 주기적으로 주차 공간 상태를 업데이트하는 타이머
setInterval(() => {
  // 랜덤한 주차 공간 이력 생성
  const newParkPositionHistory = {
    parkingSpaceId: Math.floor(Math.random() * 12 + 1),
    state:
      Math.round(Math.random()) === 0
        ? ParkingSpaceState.OCCUPIED
        : ParkingSpaceState.FREE,
    id: new Date().getTime(),
    created_at: '2023-01-18T11:53:56.025Z',
  };
  
  // 모든 클라이언트에게 주차 공간 이력 이벤트 전송
  return sendEventsToAll('parking-spot/2', newParkPositionHistory);
}, 500);

// 주기적으로 주차장 이벤트를 업데이트하는 타이머
setInterval(() => {
  // 랜덤한 주차장 이벤트 생성
  const newParkingLotEvent = {
    parkingLotId: Math.floor(Math.random() * 2 + 1),
    event:
      Math.round(Math.random()) === 0
        ? EntranceEvent.ENTRY
        : EntranceEvent.DEPARTURE,
    id: new Date().getTime(),
    created_at: new Date(),
  };
  
  // 모든 클라이언트에게 주차장 이벤트 전송
  return sendEventsToAll('parking-lot/2', newParkingLotEvent);
}, 2000);

// Express 애플리케이션을 지정된 포트에서 실행
app.listen(port, () => {
  console.log(`포트 ${port}에서 수신 대기 중`);
});
