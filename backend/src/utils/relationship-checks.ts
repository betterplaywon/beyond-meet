/**
 * 관계 체크 유틸리티
 * 사용자 간의 차단 및 친구 관계를 확인합니다.
 */

import prisma from '../config/database';

/**
 * 양방향 차단 여부 확인
 * @param userId1 첫 번째 사용자 ID
 * @param userId2 두 번째 사용자 ID
 * @returns 차단 여부 (true: 차단됨, false: 차단 안됨)
 */
export const checkBlockStatus = async (userId1: string, userId2: string): Promise<boolean> => {
  const block = await prisma.blockList.findFirst({
    where: {
      OR: [
        { userId: userId1, blockedUserId: userId2 },
        { userId: userId2, blockedUserId: userId1 },
      ],
    },
  });
  return !!block;
};

/**
 * 양방향 친구 관계 확인
 * @param userId1 첫 번째 사용자 ID
 * @param userId2 두 번째 사용자 ID
 * @returns 친구 관계 정보 (없으면 null)
 */
export const checkFriendshipStatus = async (userId1: string, userId2: string) => {
  return await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: userId1, friendId: userId2 },
        { userId: userId2, friendId: userId1 },
      ],
    },
  });
};

/**
 * 단방향 친구 관계 확인
 * @param userId 사용자 ID
 * @param friendId 친구 ID
 * @returns 친구 관계 정보 (없으면 null)
 */
export const checkOneWayFriendship = async (userId: string, friendId: string) => {
  return await prisma.friendship.findFirst({
    where: {
      userId,
      friendId,
    },
  });
};

/**
 * 단방향 차단 여부 확인
 * @param userId 차단한 사용자 ID
 * @param blockedUserId 차단된 사용자 ID
 * @returns 차단 여부
 */
export const checkOneWayBlock = async (userId: string, blockedUserId: string): Promise<boolean> => {
  const block = await prisma.blockList.findFirst({
    where: {
      userId,
      blockedUserId,
    },
  });
  return !!block;
};
