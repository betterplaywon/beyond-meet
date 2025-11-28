/**
 * 어드민 API 서비스
 */

import api from './api';
import { ApiResponse } from '../@types';

// Types
export interface ModerationLog {
  id: string;
  sessionId: string;
  userId: string;
  confidence: number;
  actionTaken: 'NONE' | 'WARNING_ISSUED' | 'CALL_ENDED';
  detectedAt: string;
  metadata: any;
  user: {
    id: string;
    nickname: string | null;
    email: string;
  };
  session: {
    id: string;
    channelName: string;
  };
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  sessionId: string;
  reason: string;
  description: string | null;
  isAiGenerated: boolean;
  status: 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  reporter: {
    id: string;
    nickname: string | null;
    email: string;
  };
  reportedUser: {
    id: string;
    nickname: string | null;
    email: string;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ModerationLogsResponse {
  logs: ModerationLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ReportsResponse {
  reports: Report[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * 모니터링 로그 조회
 * GET /api/admin/moderation-logs
 */
export const getModerationLogs = async (
  params?: PaginationParams & { actionTaken?: string }
): Promise<ModerationLogsResponse> => {
  const response = await api.get<ApiResponse<ModerationLogsResponse>>(
    '/admin/moderation-logs',
    { params }
  );
  return response.data.data!;
};

/**
 * 신고 내역 조회
 * GET /api/admin/reports
 */
export const getReports = async (
  params?: PaginationParams & { status?: string }
): Promise<ReportsResponse> => {
  const response = await api.get<ApiResponse<ReportsResponse>>(
    '/admin/reports',
    { params }
  );
  return response.data.data!;
};

/**
 * 통계 조회
 * GET /api/admin/stats
 */
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  totalReports: number;
  totalModerationLogs: number;
}

export const getAdminStats = async (): Promise<AdminStats> => {
  const response = await api.get<ApiResponse<AdminStats>>('/admin/stats');
  return response.data.data!;
};
