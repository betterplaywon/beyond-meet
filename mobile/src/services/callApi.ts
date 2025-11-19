/**
 * 통화 관련 API
 */

import api from './api';
import { ApiResponse, CallRecord } from '../@types';

export interface CallHistoryItem {
  id: string;
  partner: {
    id: string;
    nickname: string;
    profilePhotos: string[];
  };
  status: string;
  callTime: Date;
  duration: number | null;
  type: 'COMPLETED' | 'MISSED';
}

/**
 * 통화 기록 조회
 * GET /api/call/history
 */
export const getCallHistory = async (params: {
  userId: string;
  page?: number;
  limit?: number;
}): Promise<{
  calls: CallHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const { userId, page = 1, limit = 20 } = params;

  const response = await api.get<
    ApiResponse<{
      calls: CallHistoryItem[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>
  >('/call/history', {
    params: {
      userId,
      page,
      limit,
    },
  });

  return response.data.data!;
};

/**
 * 통화 시작
 * POST /api/call/start
 */
export const startCall = async (params: {
  sessionId: string;
  callerId: string;
  receiverId: string;
}): Promise<{ call: CallRecord }> => {
  const response = await api.post<ApiResponse<{ call: CallRecord }>>(
    '/call/start',
    params,
  );

  return response.data.data!;
};

/**
 * 통화 종료
 * POST /api/call/:callId/end
 */
export const endCall = async (
  callId: string,
  params: {
    endTime: string;
    duration: number;
  },
): Promise<{ call: CallRecord }> => {
  const response = await api.post<ApiResponse<{ call: CallRecord }>>(
    `/call/${callId}/end`,
    params,
  );

  return response.data.data!;
};

/**
 * 통화 이벤트 기록
 * POST /api/call/:callId/event
 */
export const recordCallEvent = async (
  callId: string,
  params: {
    eventType: string;
    timestamp: string;
    data?: Record<string, any>;
  },
): Promise<void> => {
  await api.post(`/call/${callId}/event`, params);
};
