/**
 * Socket.io 서비스
 * 실시간 매칭 및 통화 시그널링
 */

import { io, Socket } from 'socket.io-client';
import { ENV } from '../config/env';
import { useAuthStore } from '../store/authStore';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  /**
   * Socket 연결
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    const token = useAuthStore.getState().accessToken;
    if (!token) {
      console.error('No access token found');
      return;
    }

    this.socket = io(ENV.API_BASE_URL.replace('/api', ''), {
      auth: {
        token,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupEventHandlers();
  }

  /**
   * Socket 연결 해제
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  /**
   * 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  /**
   * 이벤트 emit
   */
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * 이벤트 리스너 등록
   */
  on(event: string, callback: Function): void {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    // 중복 등록 방지
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listeners = this.listeners.get(event)!;
    listeners.push(callback);

    this.socket.on(event, (...args: any[]) => {
      callback(...args);
    });
  }

  /**
   * 이벤트 리스너 제거
   */
  off(event: string, callback?: Function): void {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback as any);

      // listeners에서도 제거
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    } else {
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * 랜덤 매칭 시작
   */
  startRandomMatch(filters?: {
    gender?: string;
    minAge?: number;
    maxAge?: number;
    countries?: string[];
  }): void {
    this.emit('match:start', { type: 'RANDOM', filters });
  }

  /**
   * 매칭 취소
   */
  cancelMatch(): void {
    this.emit('match:cancel');
  }

  /**
   * 친구에게 통화 요청
   */
  requestCall(friendId: string): void {
    this.emit('call:request', { receiverId: friendId });
  }

  /**
   * 통화 요청 수락
   */
  acceptCall(sessionId: string): void {
    this.emit('call:accept', { sessionId });
  }

  /**
   * 통화 요청 거절
   */
  rejectCall(sessionId: string): void {
    this.emit('call:reject', { sessionId });
  }

  /**
   * 통화 종료
   */
  endCall(sessionId: string): void {
    this.emit('call:end', { sessionId });
  }

  /**
   * 온라인 상태 업데이트
   */
  updateStatus(status: 'ONLINE' | 'OFFLINE' | 'IN_CALL'): void {
    this.emit('user:status', { status });
  }
}

export const socketService = new SocketService();
