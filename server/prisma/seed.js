import { PrismaClient } from '@prisma/client';

// Prisma 클라이언트 인스턴스 생성
const prisma = new PrismaClient();

async function main() {
  // 트랜잭션을 이용하여 여러 동작을 원자적으로 수행
  await prisma.$transaction(async (tx) => {
    // 주차장 생성
    const parkingLot = await tx.parkingLot.create({
      data: {
        name: 'Fake Parking Model IoT',
        location: 'Heraklion',
      },
    });

    // 주차장에 속한 주차 공간 생성
    await tx.parkingSpace.createMany({
      data: [
        {
          parkingLotId: parkingLot.id,
          name: 'A1',
        },
        {
          parkingLotId: parkingLot.id,
          name: 'A2',
        },
      ],
    });

    // 또 다른 주차장 생성
    const parkingLot2 = await tx.parkingLot.create({
      data: {
        name: 'Example Parking Lot',
        location: 'Heraklion',
      },
    });

    // 두 번째 주차장에 속한 주차 공간 생성
    await tx.parkingSpace.createMany({
      data: [
        {
          parkingLotId: parkingLot2.id,
          name: 'A1',
        },
        {
          parkingLotId: parkingLot2.id,
          name: 'A2',
        },
        {
          parkingLotId: parkingLot2.id,
          name: 'A3',
        },
        {
          parkingLotId: parkingLot2.id,
          name: 'A4',
        },
        {
          parkingLotId: parkingLot2.id,
          name: 'B1',
        },
        {
          parkingLotId: parkingLot2.id,
          name: 'B2',
        },
        {
          parkingLotId: parkingLot2.id,
          name: 'B3',
        },
        {
          parkingLotId: parkingLot2.id,
          name: 'B4',
        },
      ],
    });
  });
}

// main 함수 실행 후 Prisma 연결 해제
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
