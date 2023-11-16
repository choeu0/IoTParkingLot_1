import { Box, useMantineTheme, Text } from '@mantine/core';
import Mercedes from '../assets/mercedes.svg';
import { motion, AnimatePresence } from 'framer-motion';

// ParkingSpot 컴포넌트 정의
function ParkingSpot(props) {
  // Mantine 테마 설정
  const theme = useMantineTheme();

  // 컴포넌트 렌더링
  return (
    <Box
      component="div"
      style={{
        borderBottom: '1px solid',
        borderColor: theme.colors.gray[1],
        width: 140,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: props.leftAligned ? 'flex-end' : 'flex-start',
        height: 100,
        position: 'relative',
      }}
    >
      <AnimatePresence>
        {/* 주차 공간이 차있을 경우 */}
        {props.occupied && (
          <motion.div
            key={`${props.name}-motion`}
            initial={{ x: 0, opacity: 0 }}
            animate={{ x: props.leftAligned ? -20 : 20, opacity: 1 }}
            exit={{ x: 0, opacity: 0 }}
            transition={{ duration: 1, type: 'spring', damping: '10' }}
            style={{
              position: 'relative',
              left: props.leftAligned ? undefined : -40,
              right: props.leftAligned ? -40 : undefined,
              alignItems: 'center',
            }}
          >
            {/* 차 이미지 표시 */}
            <img
              src={Mercedes}
              height={60}
              alt="mercedes car top view"
              style={{
                transform: props.leftAligned ? undefined : 'rotate(180deg)',
                filter: `drop-shadow(0px 3px 3px rgba(0, 0, 0, 0.4)`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {/* 주차 공간이 비어있을 경우 */}
      {!props.occupied && (
        <Text
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: theme.colors.gray[9],
          }}
        >
          Available
        </Text>
      )}
      {/* 주차 공간 이름 표시 */}
      <Text
        fz="sm"
        style={{
          position: 'absolute',
          bottom: -5,
          left: props.leftAligned ? undefined : 0,
          right: props.leftAligned ? 0 : undefined,
          color: theme.colors.gray[6],
        }}
      >
        {props.name}
      </Text>
    </Box>
  );
}

// ParkingSpot 컴포넌트를 내보냄
export default ParkingSpot;
