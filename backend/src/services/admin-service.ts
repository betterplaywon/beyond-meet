/**
 * 관리자 서비스
 */

import prisma from '../config/database';

/**
 * 통계 조회 (병렬 처리 및 aggregate 최적화)
 */
export const getStats = async () => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 모든 쿼리를 병렬로 실행하여 성능 향상
  const [totalUsers, activeUsers, onlineUsers, callStats, todayCalls] = await Promise.all([
    // 전체 사용자 수
    prisma.user.count(),

    // 활성 사용자 수 (최근 7일 이내 활동)
    prisma.user.count({
      where: {
        lastActive: { gte: sevenDaysAgo },
      },
    }),

    // 온라인 사용자 수
    prisma.user.count({
      where: {
        onlineStatus: { in: ['ONLINE', 'IN_CALL'] },
      },
    }),

    // 총 통화 수 + 총 통화 시간 (aggregate로 한번에)
    prisma.callRecord.aggregate({
      where: {
        status: 'COMPLETED',
        duration: { not: null },
      },
      _count: { id: true },
      _sum: { duration: true },
    }),

    // 오늘의 통화 수
    prisma.callRecord.count({
      where: {
        createdAt: { gte: today },
      },
    }),
  ]);

  const totalCallMinutes = Math.floor((callStats._sum.duration || 0) / 60);
  const betaLimit = parseInt(process.env.BETA_USER_LIMIT || '30', 10);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      online: onlineUsers,
      betaLimit,
    },
    calls: {
      total: callStats._count.id,
      today: todayCalls,
      totalMinutes: totalCallMinutes,
    },
  };
};
