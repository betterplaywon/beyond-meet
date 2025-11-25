/**
 * Socket.io 서비스
 * 실시간 매칭 및 통화 시그널링
 */

import { io, Socket } from 'socket.io-client';
import { ENV } from '../config/env';
import { useAuthStore } from '../store/authStore';

// Private 상태 변수
let socket: Socket | null = null;
// callback -> wrapper function 매핑 (메모리 누수 방지)
const listenerWrappers: WeakMap<Function, Function> = new WeakMap();
// event별 등록된 callback 추적
const listeners: Map<string, Set<Function>> = new Map();

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
    console.log('[SOCKET] Already connected');
    return;
  }

  const token = useAuthStore.getState().accessToken;
  console.log('[SOCKET] Access Token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

  if (!token) {
    console.error('[SOCKET] ❌ No access token available');
    return;
  }

  const socketUrl = ENV.API_BASE_URL.endsWith('/api')
    ? ENV.API_BASE_URL.slice(0, -4)
    : ENV.API_BASE_URL;

  console.log('[SOCKET] Connecting to:', socketUrl);

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
    console.error('[SOCKET] Cannot emit - Socket not initialized:', event);
    return;
  }

  if (!socket.connected) {
    console.error('[SOCKET] Cannot emit - Socket not connected:', event);
    return;
  }

  console.log('[DEBUG] Emitting event:', event, data);
  socket.emit(event, data);
};

/**
 * 이벤트 리스너 등록
 * WeakMap을 사용하여 메모리 누수 방지
 */
export const on = (event: string, callback: Function): void => {
  if (!socket) {
    console.warn('[SOCKET] Socket not initialized yet. Listener will be registered after connection.');
    return;
  }

  // 이미 등록된 콜백인지 확인
  const eventListeners = listeners.get(event) || new Set<Function>();
  if (eventListeners.has(callback)) {
    console.log('[DEBUG] Listener already registered:', event);
    return;
  }

  // wrapper 함수 생성 (cleanup을 위해 참조 저장)
  const wrapper = (...args: any[]) => {
    console.log('[DEBUG] Event received:', event, args);
    callback(...args);
  };

  // callback -> wrapper 매핑 저장
  listenerWrappers.set(callback, wrapper);

  // callback 추적
  eventListeners.add(callback);
  listeners.set(event, eventListeners);

  // Socket.io에 wrapper 등록
  socket.on(event, wrapper);
};

/**
 * 이벤트 리스너 제거
 */
export const off = (event: string, callback?: Function): void => {
  if (!socket) return;

  if (callback) {
    // wrapper 함수 가져오기
    const wrapper = listenerWrappers.get(callback);

    if (wrapper) {
      // Socket.io에서 wrapper 제거
      socket.off(event, wrapper as any);

      // WeakMap에서 제거
      listenerWrappers.delete(callback);
    }

    // listeners에서도 제거
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);

      // Set이 비었으면 Map에서 제거
      if (eventListeners.size === 0) {
        listeners.delete(event);
      }
    }
  } else {
    // 모든 리스너 제거
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
