/**
 * Beyond Meet - React Native App
 * WebRTC 기반 영상 통화 데이팅 앱
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/styles/theme';

// React Query 클라이언트 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분
    },
    mutations: {
      retry: 0,
    },
  },
});

function App(): React.JSX.Element {
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
