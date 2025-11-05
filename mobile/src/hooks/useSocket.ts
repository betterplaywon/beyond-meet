/**
 * Socket.io 관련 hooks
 */

import { useEffect, useRef } from 'react';
import { socketService } from '../services/socketService';
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
    emit: socketService.emit.bind(socketService),
    on: socketService.on.bind(socketService),
    off: socketService.off.bind(socketService),
    isConnected: socketService.isConnected.bind(socketService),
  };
};

/**
 * Socket 이벤트 리스너
 */
export const useSocketEvent = (event: string, callback: Function) => {
  const socket = useSocket();

  useEffect(() => {
    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }, [event, callback, socket]);
};
