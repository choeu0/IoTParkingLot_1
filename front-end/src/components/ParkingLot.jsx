import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Badge, Box, Button, Center, Flex, Grid, Text, useMantineTheme } from '@mantine/core';
import ParkingSpot from './ParkingSpot.jsx';
import { motion, useAnimationControls } from 'framer-motion';
import Mercedes from '../assets/mercedes.svg';

// ParkingLot 컴포넌트 정의
function ParkingLot() {
  // React Router의 useParams 훅을 이용해 URL 파라미터 추출
  let params = useParams();

  // 상태 및 애니메이션 컨트롤 정의
  const [parkingLotData, setParkingLotData] = useState({});
  const [listening, setListening] = useState(false);
  const controlsEntry = useAnimationControls();
  const controlsDeparture = useAnimationControls();
  const [animate, setAnimate] = useState(false);

  // Mantine 테마 객체 얻기
  const theme = useMantineTheme();

  // React Query 훅을 이용해 서버에서 데이터 가져오기
  const { data, isLoading } = useQuery({
    queryFn: async () => {
      const result = await fetch(`/api/parking-lots/${params.id}`);
      return result.json();
    },
    queryKey: [`parking-lots/${params.id}`],
  });

  // useEffect 훅을 이용해 이벤트 리스너 설정 및 데이터 업데이트
  useEffect(() => {
    if (data) {
      setParkingLotData(data);
    }

    if (!listening) {
      // EventSource를 이용해 실시간 이벤트 수신
      const eventSource = new EventSource('http://localhost:5000/events');

      // 주차 공간 상태 업데이트 이벤트 처리
      eventSource.addEventListener(`parking-spot/${params.id}`, (e) => {
        const parkingSpotStateEvent = JSON.parse(e.data);

        setParkingLotData((parkingLot) => {
          let parkingSpaces = parkingLot?.parkingSpaces?.map((parkingSpace) => {
            if (parkingSpace.id === parkingSpotStateEvent.parkingSpaceId) {
              if (parkingSpace.history[0]) {
                parkingSpace.history[0].state = parkingSpotStateEvent.state;
              } else {
                parkingSpace.history.push({ state: parkingSpotStateEvent.state });
              }
            }
            return parkingSpace;
          });

          return {
            ...parkingLot,
            parkingSpaces: parkingSpaces,
          };
        });
      });

      // 주차장 이벤트 처리
      eventSource.addEventListener(`parking-lot/${params.id}`, async (e) => {
        const parkingLotEvent = JSON.parse(e.data);

        switch (parkingLotEvent?.event) {
          case 'ENTRY':
            setParkingLotData((state) => {
              return { ...state, entries: state.entries + 1 };
            });
            await controlsEntry.start((i) => ({ y: [150, 0], opacity: [0, 1, 0] }));
            break;
          case 'DEPARTURE':
            setParkingLotData((state) => {
              return { ...state, departures: state.departures + 1 };
            });
            await controlsDeparture.start((i) => ({ y: [0, 150], opacity: [0, 1, 0] }));
            break;
        }
      });

      setListening(true);
    }
  }, [listening, data]);

  // JSX로 화면 구성
  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <Flex justify={'center'} gap={'sm'}>
        <Text>{data?.name}</Text>
        <Badge variant={'dot'} color={'blue'}>
          Entries: {parkingLotData?.entries}
        </Badge>
        <Badge variant={'dot'} color={'red'}>
          Departures: {parkingLotData?.departures}
        </Badge>
      </Flex>
      <Flex>
        <Flex direction={'column'}>
          {/* 주차 공간 컴포넌트 렌더링 */}
          {parkingLotData?.parkingSpaces?.map((parkingSpace, i) => {
            if (parkingLotData?.parkingSpaces?.length / 2 > i) {
              return (
                <ParkingSpot
                  key={parkingSpace.id}
                  leftAligned={true}
                  occupied={parkingSpace.history[0] && parkingSpace.history[0].state === 'OCCUPIED'}
                  name={parkingSpace.name}
                />
              );
            }
          })}
        </Flex>
        <Box style={{ width: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Text
            style={{
              transform: 'translateY(calc(50% + 50px)) rotate(-90deg)',
              color: theme.colors.gray[3],
              fontSize: theme.fontSizes.xl,
            }}
          >
            {'<----- Entrance'}
          </Text>
        </Box>
        <Flex direction={'column'}>
          {/* 주차 공간 컴포넌트 렌더링 */}
          {parkingLotData?.parkingSpaces?.map((parkingSpace, i) => {
            if (parkingLotData?.parkingSpaces?.length / 2 <= i) {
              return (
                <ParkingSpot
                  key={parkingSpace.id}
                  leftAligned={false}
                  occupied={parkingSpace.history[0] && parkingSpace.history[0].state === 'OCCUPIED'}
                  name={parkingSpace.name}
                />
              );
            }
          })}
        </Flex>
      </Flex>

      {/* 입차 및 출차 애니메이션 */}
      <motion.div
        key={`entry-motion`}
        animate={controlsEntry}
        initial={{ opacity: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        style={{
          position: 'absolute',
          bottom: 0,
          alignItems: 'center',
        }}
      >
        <img
          src={Mercedes}
          height={60}
          alt="mercedes car top view"
          style={{
            transform: 'rotate(90deg) translateY(-80px)',
            filter: `drop-shadow(0px 3px 3px rgba(0, 0, 0, 0.4)`,
          }}
        />
      </motion.div>
      <motion.div
        key={`departure-motion`}
        initial={{ opacity: 0 }}
        animate={controlsDeparture}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        style={{
          position: 'absolute',
          bottom: 0,
          alignItems: 'center',
        }}
      >
        <img
          src={Mercedes}
          height={60}
          alt="mercedes car top view"
          style={{
            transform: 'rotate(-90deg) translateY(-80px)',
            filter: `drop-shadow(0px 3px 3px rgba(0, 0, 0, 0.4)`,
          }}
        />
      </motion.div>
    </Box>
  );
}

// ParkingLot 컴포넌트를 내보냄
export default ParkingLot;
