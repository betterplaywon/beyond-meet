/**
 * 사용자 상태 업데이트 유틸리티
 * 사용자의 온라인 상태를 관리합니다.
 */

import { OnlineStatus } from '@prisma/client';
import prisma from '../config/database';

/**
 * 단일 사용자의 온라인 상태 업데이트
 * @param userId 사용자 ID
 * @param status 온라인 상태
 * @returns 업데이트된 사용자 정보
 */
export const updateUserStatus = async (userId: string, status: OnlineStatus) => {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      onlineStatus: status,
      lastActive: new Date(),
    },
  });
};

/**
 * 여러 사용자의 온라인 상태 일괄 업데이트
 * @param userIds 사용자 ID 배열
 * @param status 온라인 상태
 * @returns 업데이트 결과
 */
export const updateMultipleUsersStatus = async (userIds: string[], status: OnlineStatus) => {
  return await prisma.user.updateMany({
    where: { id: { in: userIds } },
    data: {
      onlineStatus: status,
      lastActive: new Date(),
    },
  });
};
