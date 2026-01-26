/**
 * Socket.io 관련 hooks
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as socketService from '../services/socketService';
import { useAuthStore } from '../store/authStore';

/**
 * Socket 연결 관리
 *
 * ⚠️ Socket은 앱 전체에서 공유되는 싱글톤입니다.
 * 개별 컴포넌트의 mount/unmount와 무관하게 유지됩니다.
 *
 * 연결 생명주기:
 * - 로그인 시 connect() (App.tsx 또는 최상위 컴포넌트)
 * - 로그아웃 시 disconnect()
 * - 화면 전환 시 연결 유지
 */
export const useSocket = () => {
  // Socket 접근자 역할만 수행 (연결 관리 X)
  // socketService는 싱글톤이므로 useMemo 불필요
  return {
    emit: socketService.emit,
    on: socketService.on,
    off: socketService.off,
    isConnected: socketService.isConnected,
  };
};

/**
 * Socket 이벤트 리스너
 * useRef를 사용하여 callback 안정화 (리스너 재등록 방지)
 */
export const useSocketEvent = (event: string, callback: Function) => {
  const callbackRef = useRef(callback);

  // callback이 변경되면 ref 업데이트 (리스너 재등록 없이)
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // 안정적인 래퍼 함수 (참조가 변하지 않음)
    const stableCallback = (...args: any[]) => {
      callbackRef.current(...args);
    };

    console.log('[DEBUG] Socket listener registered:', event);
    // socketService를 직접 사용 (useSocket 객체 생성 불필요)
    socketService.on(event, stableCallback);

    return () => {
      console.log('[DEBUG] Socket listener removed:', event);
      socketService.off(event, stableCallback);
    };
  }, [event]); // socket 제거 - 싱글톤이므로 의존성 불필요
};

/**
 * AppState 기반 Socket 재연결 훅
 * 앱이 백그라운드에서 포그라운드로 돌아올 때 Socket 연결 상태를 확인하고 재연결
 *
 * @example
 * ```tsx
 * // RootNavigator에서 사용
 * const AppContent = () => {
 *   useSocketReconnect();
 *   return <Navigator />;
 * };
 * ```
 */
export const useSocketReconnect = (): void => {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const isAuthenticated = useAuthStore(state => !!state.accessToken);

  useEffect(() => {
    // 로그인 상태가 아니면 작동하지 않음
    if (!isAuthenticated) {
      return;
    }

    const handleAppStateChange = (nextAppState: AppStateStatus): void => {
      const previousState = appState.current;

      // 백그라운드/비활성 → 포그라운드 전환 시
      if (
        (previousState === 'background' || previousState === 'inactive') &&
        nextAppState === 'active'
      ) {
        console.log('[SOCKET] 🔄 App returned to foreground, checking connection...');

        // 연결 상태 확인 후 필요시 재연결
        if (!socketService.isConnected()) {
          console.log('[SOCKET] Socket disconnected, reconnecting...');
          socketService.ensureConnected();
        }
      }

      appState.current = nextAppState;
    };

    // AppState 이벤트 구독
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);
};
