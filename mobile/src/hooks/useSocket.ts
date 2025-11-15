/**
 * Socket.io 관련 hooks
 */

import { useEffect, useRef } from 'react';
import * as socketService from '../services/socketService';
import { useAuthStore } from '../store/authStore';

/**
 * Socket 연결 관리
 */
export const useSocket = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !isConnectedRef.current) {
      socketService.connect();
      isConnectedRef.current = true;
    }

    return () => {
      if (isConnectedRef.current) {
        socketService.disconnect();
        isConnectedRef.current = false;
      }
    };
  }, [isAuthenticated]);

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
  const socket = useSocket();
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
    socket.on(event, stableCallback);

    return () => {
      console.log('[DEBUG] Socket listener removed:', event);
      socket.off(event, stableCallback);
    };
  }, [event, socket]); // callback 제거 - 재등록 방지
};
