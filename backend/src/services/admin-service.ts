/**
 * 관리자 서비스
 */

import prisma from '../config/database';

/**
 * 통계 조회
 */
export const getStats = async () => {
  // 전체 사용자 수
  const totalUsers = await prisma.user.count();

  // 활성 사용자 수 (최근 7일 이내 활동)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activeUsers = await prisma.user.count({
    where: {
      lastActive: {
        gte: sevenDaysAgo,
      },
    },
  });

  // 온라인 사용자 수
  const onlineUsers = await prisma.user.count({
    where: {
      onlineStatus: 'ONLINE',
    },
  });

  // 총 통화 수
  const totalCalls = await prisma.callRecord.count({
    where: {
      status: 'COMPLETED',
    },
  });

  // 총 통화 시간 (분)
  const callRecords = await prisma.callRecord.findMany({
    where: {
      status: 'COMPLETED',
      duration: {
        not: null,
      },
    },
    select: {
      duration: true,
    },
  });

  const totalCallDuration = callRecords.reduce((sum, record) => sum + (record.duration || 0), 0);
  const totalCallMinutes = Math.floor(totalCallDuration / 60);

  // 오늘의 통화 수
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayCalls = await prisma.callRecord.count({
    where: {
      status: 'COMPLETED',
      createdAt: {
        gte: today,
      },
    },
  });

  // Beta 사용자 제한
  const betaLimit = parseInt(process.env.BETA_USER_LIMIT || '30', 10);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      online: onlineUsers,
      betaLimit,
    },
    calls: {
      total: totalCalls,
      today: todayCalls,
      totalMinutes: totalCallMinutes,
    },
  };
};
