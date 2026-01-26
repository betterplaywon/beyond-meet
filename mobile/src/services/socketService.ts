/**
 * Socket.io 서비스
 * 실시간 매칭 및 통화 시그널링
 */

import { io, Socket } from 'socket.io-client';
import { ENV } from '../config/env';
import { useAuthStore } from '../store/authStore';

// 재연결 설정 상수
const RECONNECTION_CONFIG = {
  reconnection: true,
  reconnectionDelay: 1000,        // 초기 재연결 대기: 1초
  reconnectionDelayMax: 30000,    // 최대 재연결 대기: 30초 (콜드 스타트 대응)
  reconnectionAttempts: Infinity, // 무한 재연결 시도
  timeout: 20000,                 // 연결 타임아웃: 20초
};

// Private 상태 변수
let socket: Socket | null = null;
let reconnectAttemptCount = 0;    // 재연결 시도 횟수 추적

// 연결 상태 콜백
type ConnectionCallback = (connected: boolean) => void;
const connectionCallbacks: Set<ConnectionCallback> = new Set();
// 현재 연결에 사용된 토큰 (토큰 변경 감지용)
let currentConnectedToken: string | null = null;
// callback -> wrapper function 매핑 (메모리 누수 방지)
const listenerWrappers: WeakMap<Function, Function> = new WeakMap();
// event별 등록된 callback 추적
const listeners: Map<string, Set<Function>> = new Map();
// socket 연결 전에 등록 요청된 리스너들 (pending)
const pendingListeners: Map<string, Set<Function>> = new Map();

/**
 * 대기 중인 리스너들을 socket에 등록
 */
const registerPendingListeners = (): void => {
  if (!socket) return;

  pendingListeners.forEach((callbacks, event) => {
    callbacks.forEach(callback => {
      // on 함수 로직을 직접 실행 (재귀 방지)
      const eventListeners = listeners.get(event) || new Set<Function>();

      const wrapper = (...args: any[]) => {
        console.log('[DEBUG] Event received:', event, args);
        callback(...args);
      };

      listenerWrappers.set(callback, wrapper);
      eventListeners.add(callback);
      listeners.set(event, eventListeners);
      socket!.on(event, wrapper);

      console.log('[SOCKET] Registered pending listener for:', event);
    });
  });

  pendingListeners.clear();
};

/**
 * 연결 상태 변경 알림
 */
const notifyConnectionChange = (connected: boolean): void => {
  connectionCallbacks.forEach(callback => {
    try {
      callback(connected);
    } catch (error) {
      console.error('[SOCKET] Connection callback error:', error);
    }
  });
};

/**
 * 이벤트 핸들러 설정
 */
const setupEventHandlers = (): void => {
  if (!socket) return;

  socket.on('connect', () => {
    console.log('[SOCKET] ✅ Connected! Socket ID:', socket?.id);
    reconnectAttemptCount = 0; // 연결 성공 시 카운터 리셋
    notifyConnectionChange(true);
    // 연결 성공 시 대기 중인 리스너들 등록
    registerPendingListeners();
  });

  socket.on('disconnect', reason => {
    console.log('[SOCKET] ❌ Disconnected. Reason:', reason);
    notifyConnectionChange(false);
  });

  socket.on('error', error => {
    console.error('[SOCKET] ⚠️ Error:', error);
  });

  socket.on('connect_error', error => {
    reconnectAttemptCount++;
    // 개발 환경에서 서버 미실행 시 발생 가능 (정상적인 케이스)
    // 재연결 로직이 자동으로 처리하므로 warn 레벨로 로깅
    console.warn(
      `[SOCKET] ⚠️ Connection Error (attempt ${reconnectAttemptCount}, will retry):`,
      error.message,
    );
  });
};

/**
 * Socket 연결
 */
export const connect = (): void => {
  const token = useAuthStore.getState().accessToken;

  // 이미 연결되어 있고 토큰이 동일하면 재연결 불필요
  if (socket?.connected && currentConnectedToken === token) {
    console.log('[SOCKET] Already connected with current token');
    return;
  }

  // 토큰이 다르면 기존 연결 해제 후 재연결
  if (socket?.connected && currentConnectedToken !== token) {
    console.log('[SOCKET] Token changed, disconnecting old socket...');
    socket.disconnect();
    socket = null;
  }

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
    ...RECONNECTION_CONFIG,
  });

  // 연결된 토큰 기록
  currentConnectedToken = token;

  setupEventHandlers();
};

/**
 * Socket 연결 해제
 */
export const disconnect = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentConnectedToken = null;
    listeners.clear();
    pendingListeners.clear();
  }
};

/**
 * 새 토큰으로 Socket 강제 재연결
 * 토큰 갱신 후 호출하여 새 토큰으로 인증된 Socket 연결을 생성
 */
export const reconnectWithNewToken = (): void => {
  console.log('[SOCKET] Force reconnecting with new token...');
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentConnectedToken = null;
  connect();
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
  // socket이 없거나 연결되지 않은 경우 pending에 저장
  if (!socket || !socket.connected) {
    const pending = pendingListeners.get(event) || new Set<Function>();
    if (!pending.has(callback)) {
      pending.add(callback);
      pendingListeners.set(event, pending);
      console.log('[SOCKET] Listener queued for later registration:', event);
    }
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
  if (callback) {
    // pendingListeners에서도 제거
    const pending = pendingListeners.get(event);
    if (pending) {
      pending.delete(callback);
      if (pending.size === 0) {
        pendingListeners.delete(event);
      }
    }

    // socket이 없으면 여기서 종료
    if (!socket) return;

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
    if (socket) {
      socket.off(event);
    }
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
 * 연결 상태 변경 구독
 * @returns unsubscribe 함수
 */
export const onConnectionChange = (callback: ConnectionCallback): (() => void) => {
  connectionCallbacks.add(callback);
  return () => {
    connectionCallbacks.delete(callback);
  };
};

/**
 * 강제 재연결 (AppState 복귀 시 사용)
 * 연결이 끊어진 상태일 때만 재연결 시도
 */
export const ensureConnected = (): void => {
  const token = useAuthStore.getState().accessToken;

  if (!token) {
    console.log('[SOCKET] Cannot ensure connection - no token');
    return;
  }

  if (socket?.connected) {
    console.log('[SOCKET] Already connected, no action needed');
    return;
  }

  console.log('[SOCKET] 🔄 Ensuring connection (force reconnect)...');

  // 기존 소켓이 있으면 정리
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentConnectedToken = null;
  connect();
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
 * 친구에게 직접 통화 요청
 * 백엔드 match:request 이벤트의 DIRECT 타입 사용
 */
export const requestDirectCall = (targetUserId: string): void => {
  emit('match:request', { type: 'DIRECT', targetUserId });
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

/**
 * 모니터링 경고 전송
 */
export const sendModerationWarning = (sessionId: string, targetUserId: string): void => {
  emit('moderation:warning', { sessionId, targetUserId });
};

/**
 * 모니터링 강제 종료 전송
 */
export const sendModerationForceEnd = (sessionId: string): void => {
  emit('moderation:force-end', { sessionId, reportedUserId: useAuthStore.getState().userId });
};
