/**
 * 관리자 서비스
 */

import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

interface CreateInviteCodesInput {
  count: number;
  maxUses: number;
  expiresInDays?: number;
  createdBy?: string;
}

interface GetInviteCodesInput {
  page: number;
  limit: number;
  isActive?: boolean;
}

/**
 * 초대 코드 생성
 */
export const createInviteCodes = async (data: CreateInviteCodesInput) => {
  const { count, maxUses, expiresInDays, createdBy } = data;

  // 만료 날짜 계산
  let expiresAt: Date | undefined;
  if (expiresInDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  // 초대 코드 생성
  const inviteCodes = [];

  for (let i = 0; i < count; i++) {
    const code = generateInviteCode();

    const inviteCode = await prisma.inviteCode.create({
      data: {
        code,
        maxUses,
        expiresAt,
        createdBy,
      },
    });

    inviteCodes.push(inviteCode);
  }

  return inviteCodes;
};

/**
 * 초대 코드 목록 조회
 */
export const getInviteCodes = async (params: GetInviteCodesInput) => {
  const { page, limit, isActive } = params;
  const skip = (page - 1) * limit;

  const where = isActive !== undefined ? { isActive } : {};

  const [inviteCodes, total] = await Promise.all([
    prisma.inviteCode.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.inviteCode.count({ where }),
  ]);

  return {
    inviteCodes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

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

  // 초대 코드 통계
  const totalInviteCodes = await prisma.inviteCode.count();
  const activeInviteCodes = await prisma.inviteCode.count({
    where: { isActive: true },
  });
  const usedInviteCodes = await prisma.inviteCode.count({
    where: {
      usedCount: {
        gte: 1,
      },
    },
  });

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      online: onlineUsers,
    },
    calls: {
      total: totalCalls,
      today: todayCalls,
      totalMinutes: totalCallMinutes,
    },
    inviteCodes: {
      total: totalInviteCodes,
      active: activeInviteCodes,
      used: usedInviteCodes,
    },
  };
};

/**
 * 초대 코드 비활성화
 */
export const deactivateInviteCode = async (codeId: string) => {
  const inviteCode = await prisma.inviteCode.findUnique({
    where: { id: codeId },
  });

  if (!inviteCode) {
    throw new AppError(404, 'INVITE_CODE_NOT_FOUND', '초대 코드를 찾을 수 없습니다');
  }

  await prisma.inviteCode.update({
    where: { id: codeId },
    data: {
      isActive: false,
    },
  });
};

/**
 * 랜덤 초대 코드 생성
 */
function generateInviteCode(): string {
  const prefix = 'BETA2025';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;

  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}
