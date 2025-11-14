/**
 * Socket.io 서비스
 * 실시간 매칭 및 통화 시그널링
 */

import { io, Socket } from 'socket.io-client';
import { ENV } from '../config/env';
import { useAuthStore } from '../store/authStore';

// Private 상태 변수
let socket: Socket | null = null;
const listeners: Map<string, Function[]> = new Map();

/**
 * 이벤트 핸들러 설정
 */
const setupEventHandlers = (): void => {
  if (!socket) return;

  socket.on('connect', () => {
    console.log('[SOCKET] ✅ Connected! Socket ID:', socket?.id);
  });

  socket.on('disconnect', reason => {
    console.log('[SOCKET] ❌ Disconnected. Reason:', reason);
  });

  socket.on('error', error => {
    console.error('[SOCKET] ⚠️ Error:', error);
  });

  socket.on('connect_error', error => {
    console.error('[SOCKET] ⚠️ Connection Error:', error.message);
  });
};

/**
 * Socket 연결
 */
export const connect = (): void => {
  if (socket?.connected) {
    return;
  }

  const token = useAuthStore.getState().accessToken;
  if (!token) {
    return;
  }

  const socketUrl = ENV.API_BASE_URL.endsWith('/api')
    ? ENV.API_BASE_URL.slice(0, -4)
    : ENV.API_BASE_URL;

  socket = io(socketUrl, {
    auth: {
      token,
    },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  setupEventHandlers();
};

/**
 * Socket 연결 해제
 */
export const disconnect = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    listeners.clear();
  }
};

/**
 * 이벤트 emit
 */
export const emit = (event: string, data?: any): void => {
  if (!socket) {
    return;
  }

  if (!socket.connected) {
    return;
  }

  socket.emit(event, data);
};

/**
 * 이벤트 리스너 등록
 */
export const on = (event: string, callback: Function): void => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  // 기존 리스너가 있으면 제거 후 재등록
  if (listeners.has(event)) {
    socket.off(event);
    listeners.delete(event);
  }

  listeners.set(event, [callback]);

  socket.on(event, (...args: any[]) => {
    callback(...args);
  });
};

/**
 * 이벤트 리스너 제거
 */
export const off = (event: string, callback?: Function): void => {
  if (!socket) return;

  if (callback) {
    socket.off(event, callback as any);

    // listeners에서도 제거
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  } else {
    socket.off(event);
    listeners.delete(event);
  }
};

/**
 * 연결 상태 확인
 */
export const isConnected = (): boolean => {
  return socket?.connected ?? false;
};

/**
 * 랜덤 매칭 시작
 */
export const startRandomMatch = (filters?: {
  gender?: string;
  minAge?: number;
  maxAge?: number;
  countries?: string[];
}): void => {
  emit('match:request', { type: 'RANDOM', filters });
};

/**
 * 매칭 취소
 */
export const cancelMatch = (): void => {
  emit('match:cancel');
};

/**
 * 친구에게 통화 요청
 */
export const requestCall = (friendId: string): void => {
  emit('call:request', { receiverId: friendId });
};

/**
 * 통화 요청 수락
 */
export const acceptCall = (sessionId: string): void => {
  emit('call:accept', { sessionId });
};

/**
 * 통화 요청 거절
 */
export const rejectCall = (sessionId: string): void => {
  emit('call:reject', { sessionId });
};

/**
 * 통화 종료
 */
export const endCall = (sessionId: string): void => {
  emit('call:end', { sessionId });
};

/**
 * 온라인 상태 업데이트
 */
export const updateStatus = (
  status: 'ONLINE' | 'OFFLINE' | 'IN_CALL',
): void => {
  emit('user:status', { status });
};
