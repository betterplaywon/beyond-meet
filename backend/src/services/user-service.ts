/**
 * 사용자 서비스
 */

import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';

interface UpdateProfileInput {
  nickname?: string;
  bio?: string;
  interests?: string[];
  preferredGender?: 'MALE' | 'FEMALE' | 'OTHER';
  minAge?: number;
  maxAge?: number;
  preferredCountries?: string[];
}

export class UserService {
  /**
   * 사용자 프로필 조회
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        birthDate: true,
        gender: true,
        country: true,
        bio: true,
        profilePhotos: true,
        interests: true,
        preferredGender: true,
        minAge: true,
        maxAge: true,
        preferredCountries: true,
        onlineStatus: true,
        lastActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
    }

    return user;
  }

  /**
   * 다른 사용자 프로필 조회 (제한된 정보)
   */
  async getUserById(userId: string, requestingUserId: string) {
    // 차단 여부 확인
    const isBlocked = await prisma.blockList.findFirst({
      where: {
        OR: [
          { userId: requestingUserId, blockedUserId: userId },
          { userId: userId, blockedUserId: requestingUserId },
        ],
      },
    });

    if (isBlocked) {
      throw new AppError(403, 'USER_BLOCKED', '차단된 사용자입니다');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        birthDate: true,
        gender: true,
        country: true,
        bio: true,
        profilePhotos: true,
        interests: true,
        onlineStatus: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
    }

    // 친구 여부 확인
    const isFriend = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: requestingUserId, friendId: userId },
          { userId: userId, friendId: requestingUserId },
        ],
      },
    });

    return {
      ...user,
      isFriend: !!isFriend,
    };
  }

  /**
   * 프로필 업데이트
   */
  async updateProfile(userId: string, data: UpdateProfileInput) {
    // 나이 범위 검증
    if (data.minAge !== undefined && data.maxAge !== undefined) {
      if (data.minAge < 18 || data.maxAge > 100 || data.minAge > data.maxAge) {
        throw new AppError(400, 'INVALID_AGE_RANGE', '유효하지 않은 나이 범위입니다');
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.nickname && { nickname: data.nickname }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.interests && { interests: data.interests }),
        ...(data.preferredGender && { preferredGender: data.preferredGender }),
        ...(data.minAge !== undefined && { minAge: data.minAge }),
        ...(data.maxAge !== undefined && { maxAge: data.maxAge }),
        ...(data.preferredCountries && { preferredCountries: data.preferredCountries }),
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        birthDate: true,
        gender: true,
        country: true,
        bio: true,
        profilePhotos: true,
        interests: true,
        preferredGender: true,
        minAge: true,
        maxAge: true,
        preferredCountries: true,
        onlineStatus: true,
        lastActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * 프로필 사진 업데이트
   */
  async updateProfilePhotos(userId: string, photoUrls: string[]) {
    if (photoUrls.length > 6) {
      throw new AppError(400, 'TOO_MANY_PHOTOS', '최대 6장의 사진만 업로드할 수 있습니다');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        profilePhotos: photoUrls,
      },
      select: {
        id: true,
        profilePhotos: true,
      },
    });

    return user;
  }

  /**
   * 온라인 상태 업데이트
   */
  async updateOnlineStatus(userId: string, status: 'ONLINE' | 'OFFLINE' | 'IN_CALL') {
    await prisma.user.update({
      where: { id: userId },
      data: {
        onlineStatus: status,
        lastActive: new Date(),
      },
    });
  }

  /**
   * 사용자 통계 조회
   */
  async getUserStats(userId: string) {
    // 친구 수
    const friendCount = await prisma.friendship.count({
      where: {
        OR: [
          { userId: userId },
          { friendId: userId },
        ],
      },
    });

    // 총 통화 수
    const totalCalls = await prisma.callRecord.count({
      where: {
        OR: [
          { callerId: userId },
          { receiverId: userId },
        ],
        status: 'COMPLETED',
      },
    });

    // 총 통화 시간 (분)
    const callRecords = await prisma.callRecord.findMany({
      where: {
        OR: [
          { callerId: userId },
          { receiverId: userId },
        ],
        status: 'COMPLETED',
        duration: {
          not: null,
        },
      },
      select: {
        duration: true,
      },
    });

    const totalDuration = callRecords.reduce((sum, record) => sum + (record.duration || 0), 0);
    const totalMinutes = Math.floor(totalDuration / 60);

    // 오늘의 통화 수
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCalls = await prisma.callRecord.count({
      where: {
        OR: [
          { callerId: userId },
          { receiverId: userId },
        ],
        status: 'COMPLETED',
        createdAt: {
          gte: today,
        },
      },
    });

    return {
      friendCount,
      totalCalls,
      totalMinutes,
      todayCalls,
    };
  }
}
