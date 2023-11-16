import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, Button, Flex, Text, useMantineTheme } from '@mantine/core';

// ParkingLots 컴포넌트 정의
function ParkingLots({ children }) {
  // Mantine 테마 설정
  const theme = useMantineTheme();

  // 주차장 데이터를 가져오는 React Query hook 사용
  const { data, isLoading } = useQuery({
    queryFn: async () => {
      // API를 통해 주차장 데이터 가져오기
      const result = await fetch('/api/parking-lots');
      return result.json();
    },
    queryKey: ['parking-lots'],
  });

  // 컴포넌트 렌더링
  return (
    <>
      {/* 주차장 목록 제목 */}
      <Text style={{ marginBottom: theme.spacing.md }}>Parking Lots</Text>
      {/* 주차장 목록을 표시하는 Flex 컴포넌트 */}
      <Flex direction={'column'} gap={'sm'}>
        {/* 주차장 데이터가 있을 경우 매핑하여 주차장 목록 표시 */}
        {data?.map((parkingLot) => {
          return (
            // 각 주차장에 대한 Link 및 Button 설정
            <Link
              style={{
                color: 'white',
                textDecoration: 'none',
                padding: theme.spacing,
                cursor: 'pointer',
                paddingBlock: 2,
              }}
              to={`/parking-lots/${parkingLot.id}`}
            >
              {/* 주차장 이름을 표시하는 Button */}
              <Button fullWidth color={'dark'}>
                {parkingLot.name}
              </Button>
            </Link>
          );
        })}
      </Flex>
    </>
  );
}

// ParkingLots 컴포넌트를 내보냄
export default ParkingLots;
