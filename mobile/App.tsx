/**
 * Beyond Meet - React Native App
 * WebRTC 기반 영상 통화 데이팅 앱
 */

import React, { useEffect } from 'react';
import { StatusBar, Alert, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/styles/theme';
import { useAuthStore } from './src/store/authStore';
import * as socketService from './src/services/socketService';

// React Query 클라이언트 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // 401 에러는 재시도하지 않음 (인증 실패)
        if (error?.response?.status === 401) {
          return false;
        }
        return failureCount < 1;
      },
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분
      refetchOnWindowFocus: false, // React Native에서 탭 전환 시 불필요한 재요청 방지
      refetchOnMount: false, // stale 상태일 때만 재요청
    },
    mutations: {
      retry: 0,
    },
  },
  queryCache: new QueryCache({
    onError: (error: any, query) => {
      // 401 Unauthorized 에러 처리
      if (error?.response?.status === 401) {
        const { isAuthenticated } = useAuthStore.getState();

        // 이미 로그아웃 상태면 무시
        if (!isAuthenticated) {
          return;
        }

        console.log('[QUERY ERROR] 401 Unauthorized detected, logging out...');

        // 로그아웃 실행 (Socket은 useLogout에서 처리되므로 여기서는 안 함)
        // navigation은 선언형으로 자동 처리됨
        socketService.disconnect();
        queryClient.clear();
        useAuthStore.getState().logout();

        return;
      }

      // meta.errorMessage가 설정된 쿼리만 Alert 표시
      const errorMessage = query.meta?.errorMessage as string | undefined;
      if (errorMessage) {
        Alert.alert('오류', errorMessage);
      }
    },
  }),
});

function App(): React.JSX.Element {
  // 앱 포그라운드/백그라운드 전환 시 Socket 상태 관리
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const { isAuthenticated } = useAuthStore.getState();

      if (nextAppState === 'active' && isAuthenticated) {
        // 포그라운드 복귀 시 Socket 연결 상태 확인 및 재연결
        if (!socketService.isConnected()) {
          console.log('[APP] Foreground - Socket disconnected, reconnecting...');
          socketService.connect();
        } else {
          console.log('[APP] Foreground - Socket already connected');
        }
      } else if (nextAppState === 'background') {
        console.log('[APP] Background - Socket status:', socketService.isConnected());
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={colors.background}
        />
        <RootNavigator />
        <Toast />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default App;
