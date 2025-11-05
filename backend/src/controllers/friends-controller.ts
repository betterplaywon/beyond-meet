/**
 * 친구 컨트롤러 (함수형)
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

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

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: userId },
          { friendId: userId },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profilePhotos: true,
            onlineStatus: true,
            lastActive: true,
          },
        },
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
    const friends = friendships.map((friendship) => {
      if (friendship.userId === userId) {
        return friendship.friend;
      } else {
        return friendship.user;
      }
    });

    res.status(200).json({
      success: true,
      data: friends,
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
    const { friendId } = req.params;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    if (userId === friendId) {
      throw new AppError(400, 'CANNOT_ADD_SELF', '자기 자신을 친구로 추가할 수 없습니다');
    }

    // 이미 친구인지 확인
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: userId, friendId: friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (existingFriendship) {
      throw new AppError(400, 'ALREADY_FRIENDS', '이미 친구입니다');
    }

    // 차단 여부 확인
    const isBlocked = await prisma.blockList.findFirst({
      where: {
        OR: [
          { userId: userId, blockedUserId: friendId },
          { userId: friendId, blockedUserId: userId },
        ],
      },
    });

    if (isBlocked) {
      throw new AppError(403, 'USER_BLOCKED', '차단된 사용자입니다');
    }

    // 친구 추가
    const friendship = await prisma.friendship.create({
      data: {
        userId: userId,
        friendId: friendId,
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
    const { friendId } = req.params;

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
    const { blockedUserId } = req.params;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    if (userId === blockedUserId) {
      throw new AppError(400, 'CANNOT_BLOCK_SELF', '자기 자신을 차단할 수 없습니다');
    }

    // 이미 차단했는지 확인
    const existingBlock = await prisma.blockList.findFirst({
      where: {
        userId: userId,
        blockedUserId: blockedUserId,
      },
    });

    if (existingBlock) {
      throw new AppError(400, 'ALREADY_BLOCKED', '이미 차단한 사용자입니다');
    }

    // 차단 추가
    await prisma.blockList.create({
      data: {
        userId: userId,
        blockedUserId: blockedUserId,
      },
    });

    // 친구 관계가 있다면 삭제
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: userId, friendId: blockedUserId },
          { userId: blockedUserId, friendId: userId },
        ],
      },
    });

    if (friendship) {
      await prisma.friendship.delete({
        where: { id: friendship.id },
      });
    }

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
    const { blockedUserId } = req.params;

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
