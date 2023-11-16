import { AppShell, Burger, Header, MediaQuery, Navbar, Text, useMantineTheme } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Outlet, Link } from 'react-router-dom';

function App({ children }) {
  // Mantine 테마 설정
  const theme = useMantineTheme();

  // 네비게이션 바 열림 여부 상태 관리
  const [opened, setOpened] = useState(false);

  return (
    <AppShell
      // 네비게이션 바 설정
      navbar={
        <Navbar p="md" hiddenBreakpoint="sm" hidden={!opened} width={{ sm: 200, lg: 300 }}>
          {/* 주차장 목록으로 이동하는 링크 */}
          <Link to={'parking-lots'}>주차장 목록</Link>
        </Navbar>
      }
      // 헤더 설정
      header={
        <Header height={{ base: 50, md: 70 }} p="md">
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            {/* 화면 크기가 sm보다 큰 경우에만 보이는 버거 아이콘 */}
            <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
              <Burger
                opened={opened}
                onClick={() => setOpened((o) => !o)}
                size="sm"
                color={theme.colors.gray[6]}
                mr="xl"
              />
            </MediaQuery>
          </div>
        </Header>
      }
    >
      {/* 자식 컴포넌트 Outlet */}
      <Outlet />
    </AppShell>
  );
}

export default App;
