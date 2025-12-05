/**
 * 어드민 관련 React Query Hooks
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import * as adminApi from '../services/adminApi';

export const adminKeys = {
  all: ['admin'] as const,
  reports: (status?: string) => [...adminKeys.all, 'reports', status] as const,
  moderationLogs: (actionTaken?: string) =>
    [...adminKeys.all, 'moderation-logs', actionTaken] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
};

/**
 * 신고 내역 무한 스크롤 조회 Hook
 */
export const useReports = (status?: string) => {
  return useInfiniteQuery({
    queryKey: adminKeys.reports(status),
    queryFn: ({ pageParam = 1 }) =>
      adminApi.getReports({
        page: pageParam,
        limit: 20,
        status,
      }),
    getNextPageParam: (lastPage) => {
      const { page, limit, total } = lastPage.pagination;
      const hasMore = page * limit < total;
      return hasMore ? page + 1 : undefined;
    },
    initialPageParam: 1,
    meta: {
      errorMessage: '신고 내역을 불러오는데 실패했습니다.',
    },
  });
};

/**
 * 모니터링 로그 무한 스크롤 조회 Hook
 */
export const useModerationLogs = (actionTaken?: string) => {
  return useInfiniteQuery({
    queryKey: adminKeys.moderationLogs(actionTaken),
    queryFn: ({ pageParam = 1 }) =>
      adminApi.getModerationLogs({
        page: pageParam,
        limit: 20,
        actionTaken,
      }),
    getNextPageParam: (lastPage) => {
      const { page, limit, total } = lastPage.pagination;
      const hasMore = page * limit < total;
      return hasMore ? page + 1 : undefined;
    },
    initialPageParam: 1,
    meta: {
      errorMessage: '모니터링 로그를 불러오는데 실패했습니다.',
    },
  });
};

/**
 * 어드민 통계 조회 Hook
 */
export const useAdminStats = () => {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: adminApi.getAdminStats,
  });
};
