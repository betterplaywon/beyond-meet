/**
 * 매칭 관련 API
 */

import { apiClient } from './client';
import { ApiResponse, MatchSession } from '../@types';

export const matchApi = {
  /**
   * 랜덤 매칭 요청
   */
  requestRandomMatch: async (): Promise<{
    matched: boolean;
    session?: MatchSession;
    partner?: any;
  }> => {
    const response = await apiClient.post<
      ApiResponse<{
        matched: boolean;
        session?: MatchSession;
        partner?: any;
      }>
    >('/match/random');
    return response.data.data!;
  },

  /**
   * 선택 매칭 요청 (친구에게)
   */
  requestDirectMatch: async (receiverId: string): Promise<MatchSession> => {
    const response = await apiClient.post<ApiResponse<MatchSession>>(
      '/match/direct',
      { receiverId }
    );
    return response.data.data!;
  },

  /**
   * 매칭 취소
   */
  cancelMatch: async (): Promise<void> => {
    await apiClient.post('/match/cancel');
  },

  /**
   * 매칭 수락
   */
  acceptMatch: async (sessionId: string): Promise<void> => {
    await apiClient.post(`/match/${sessionId}/accept`);
  },

  /**
   * 매칭 거절
   */
  rejectMatch: async (sessionId: string): Promise<void> => {
    await apiClient.post(`/match/${sessionId}/reject`);
  },
};
