/**
 * useFriendStatusSync Hook 테스트
 */

import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useFriendStatusSync } from '../useFriendStatusSync';
import * as socketService from '../../services/socketService';

// Mock socket service
jest.mock('../../services/socketService', () => ({
  on: jest.fn(),
  off: jest.fn(),
}));

// Mock queryKeys
jest.mock('../../constants/queryKeys', () => ({
  queryKeys: {
    friends: {
      list: (userId: string) => ['friends', 'list', userId],
    },
  },
}));

describe('useFriendStatusSync', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('userId가 undefined일 때 소켓 이벤트를 구독하지 않아야 함', () => {
    renderHook(() => useFriendStatusSync(undefined), { wrapper });

    expect(socketService.on).not.toHaveBeenCalled();
  });

  it('userId가 제공되면 friend:status-changed 이벤트를 구독해야 함', () => {
    renderHook(() => useFriendStatusSync('user-123'), { wrapper });

    expect(socketService.on).toHaveBeenCalledWith(
      'friend:status-changed',
      expect.any(Function)
    );
  });

  it('unmount 시 이벤트 구독을 해제해야 함', () => {
    const { unmount } = renderHook(() => useFriendStatusSync('user-123'), {
      wrapper,
    });

    unmount();

    expect(socketService.off).toHaveBeenCalledWith(
      'friend:status-changed',
      expect.any(Function)
    );
  });

  it('status change 이벤트 수신 시 React Query 캐시를 업데이트해야 함', () => {
    // 캐시에 친구 목록 데이터 미리 설정
    queryClient.setQueryData(['friends', 'list', 'user-123'], {
      friends: [
        { id: 'friend-1', nickname: 'Friend 1', onlineStatus: 'OFFLINE' },
        { id: 'friend-2', nickname: 'Friend 2', onlineStatus: 'ONLINE' },
      ],
      total: 2,
    });

    renderHook(() => useFriendStatusSync('user-123'), { wrapper });

    // 등록된 핸들러 가져오기
    const handler = (socketService.on as jest.Mock).mock.calls[0][1];

    // status change 이벤트 시뮬레이션
    act(() => {
      handler({
        friendId: 'friend-1',
        status: 'ONLINE',
        lastActive: '2024-01-01T00:00:00Z',
      });
    });

    // 캐시 업데이트 확인
    const data = queryClient.getQueryData(['friends', 'list', 'user-123']) as {
      friends: Array<{ id: string; onlineStatus: string; lastActive?: string }>;
      total: number;
    };

    expect(data.friends[0]).toEqual({
      id: 'friend-1',
      nickname: 'Friend 1',
      onlineStatus: 'ONLINE',
      lastActive: '2024-01-01T00:00:00Z',
    });
    // 다른 친구는 변경되지 않아야 함
    expect(data.friends[1].onlineStatus).toBe('ONLINE');
  });

  it('userId가 변경되면 이전 구독을 해제하고 새로 구독해야 함', () => {
    const { rerender } = renderHook(
      ({ userId }: { userId: string }) => useFriendStatusSync(userId),
      {
        wrapper,
        initialProps: { userId: 'user-123' },
      }
    );

    expect(socketService.on).toHaveBeenCalledTimes(1);

    // userId 변경
    rerender({ userId: 'user-456' });

    // 이전 구독 해제
    expect(socketService.off).toHaveBeenCalledTimes(1);
    // 새 구독 등록
    expect(socketService.on).toHaveBeenCalledTimes(2);
  });

  it('캐시에 데이터가 없을 때 에러 없이 처리해야 함', () => {
    renderHook(() => useFriendStatusSync('user-123'), { wrapper });

    const handler = (socketService.on as jest.Mock).mock.calls[0][1];

    // 캐시가 비어있는 상태에서 이벤트 수신
    expect(() => {
      act(() => {
        handler({
          friendId: 'friend-1',
          status: 'ONLINE',
          lastActive: '2024-01-01T00:00:00Z',
        });
      });
    }).not.toThrow();
  });
});
