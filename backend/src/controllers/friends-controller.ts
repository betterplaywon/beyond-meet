/**
 * 친구 컨트롤러 (함수형)
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { FriendParams, BlockUserParams } from '../utils/validation';

/**
 * 친구 목록 조회
 * GET /api/friends
 */
export const getFriends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    // 자신이 추가한 친구만 조회 (단방향 친구 관계)
    const friendships = await prisma.friendship.findMany({
      where: {
        userId: userId,
      },
      include: {
        friend: {
          select: {
            id: true,
            nickname: true,
            profilePhotos: true,
            onlineStatus: true,
            lastActive: true,
          },
        },
      },
    });

    // 친구 정보만 추출
    const friends = friendships.map((friendship) => friendship.friend);

    res.status(200).json({
      success: true,
      data: {
        friends: friends,
        total: friends.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 친구 추가
 * POST /api/friends/:userId
 */
export const addFriend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { friendId } = req.params as FriendParams;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    if (userId === friendId) {
      throw new AppError(400, 'CANNOT_ADD_SELF', '자기 자신을 친구로 추가할 수 없습니다');
    }

    // 트랜잭션으로 모든 체크와 생성을 원자적으로 처리
    const friendship = await prisma.$transaction(async (tx) => {
      // 이미 친구인지 확인 (자신이 추가한 친구만 체크 - 단방향)
      const existingFriendship = await tx.friendship.findFirst({
        where: {
          userId,
          friendId,
        },
      });

      if (existingFriendship) {
        throw new AppError(400, 'ALREADY_FRIENDS', '이미 친구로 추가한 사용자입니다');
      }

      // 차단 여부 확인
      const isBlocked = await tx.blockList.findFirst({
        where: {
          OR: [
            { userId, blockedUserId: friendId },
            { userId: friendId, blockedUserId: userId },
          ],
        },
      });

      if (isBlocked) {
        throw new AppError(403, 'USER_BLOCKED', '차단된 사용자입니다');
      }

      // 친구 추가
      return await tx.friendship.create({
        data: {
          userId,
          friendId,
        },
        include: {
          friend: {
            select: {
              id: true,
              nickname: true,
              profilePhotos: true,
              onlineStatus: true,
            },
          },
        },
      });
    });

    res.status(201).json({
      success: true,
      data: friendship.friend,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 친구 삭제
 * DELETE /api/friends/:userId
 */
export const removeFriend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { friendId } = req.params as FriendParams;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    // 친구 관계 찾기
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: userId, friendId: friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (!friendship) {
      throw new AppError(404, 'FRIENDSHIP_NOT_FOUND', '친구 관계를 찾을 수 없습니다');
    }

    // 친구 삭제
    await prisma.friendship.delete({
      where: { id: friendship.id },
    });

    res.status(200).json({
      success: true,
      data: { removed: true },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 사용자 차단
 * POST /api/friends/block/:userId
 */
export const blockUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { blockedUserId } = req.params as BlockUserParams;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    if (userId === blockedUserId) {
      throw new AppError(400, 'CANNOT_BLOCK_SELF', '자기 자신을 차단할 수 없습니다');
    }

    // 트랜잭션으로 차단 생성 + 친구 관계 삭제를 원자적으로 처리
    await prisma.$transaction(async (tx) => {
      // 이미 차단했는지 확인
      const existingBlock = await tx.blockList.findFirst({
        where: {
          userId,
          blockedUserId,
        },
      });

      if (existingBlock) {
        throw new AppError(400, 'ALREADY_BLOCKED', '이미 차단한 사용자입니다');
      }

      // 차단 추가
      await tx.blockList.create({
        data: {
          userId,
          blockedUserId,
        },
      });

      // 양방향 친구 관계 모두 삭제 (deleteMany로 한번에)
      await tx.friendship.deleteMany({
        where: {
          OR: [
            { userId, friendId: blockedUserId },
            { userId: blockedUserId, friendId: userId },
          ],
        },
      });
    });

    res.status(201).json({
      success: true,
      data: { blocked: true },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 차단 해제
 * DELETE /api/friends/block/:userId
 */
export const unblockUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { blockedUserId } = req.params as BlockUserParams;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    const blockEntry = await prisma.blockList.findFirst({
      where: {
        userId: userId,
        blockedUserId: blockedUserId,
      },
    });

    if (!blockEntry) {
      throw new AppError(404, 'BLOCK_NOT_FOUND', '차단 내역을 찾을 수 없습니다');
    }

    await prisma.blockList.delete({
      where: { id: blockEntry.id },
    });

    res.status(200).json({
      success: true,
      data: { unblocked: true },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 차단 목록 조회
 * GET /api/friends/blocked
 */
export const getBlockedUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    const blockedList = await prisma.blockList.findMany({
      where: { userId: userId },
      include: {
        blockedUser: {
          select: {
            id: true,
            nickname: true,
            profilePhotos: true,
          },
        },
      },
    });

    const blockedUsers = blockedList.map((block) => block.blockedUser);

    res.status(200).json({
      success: true,
      data: blockedUsers,
    });
  } catch (error) {
    next(error);
  }
};
