/**
 * 사용자 서비스
 */

import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { supabaseStorage } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

interface UpdateProfileInput {
  nickname?: string;
  bio?: string;
  interests?: string[];
  preferredGender?: 'MALE' | 'FEMALE' | 'ANYONE';
  minAge?: number;
  maxAge?: number;
  preferredCountries?: string[];
}

/**
 * 사용자 프로필 조회
 */
export const getProfile = async (userId: string) => {
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

  // 기본값 보장: minAge, maxAge가 null이면 기본값 설정
  return {
    ...user,
    minAge: user.minAge ?? 20,
    maxAge: user.maxAge ?? 50,
  };
};

/**
 * 다른 사용자 프로필 조회 (제한된 정보)
 */
export const getUserById = async (userId: string, requestingUserId: string) => {
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
};

/**
 * 프로필 업데이트
 */
export const updateProfile = async (userId: string, data: UpdateProfileInput) => {
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

  // 기본값 보장
  return {
    ...user,
    minAge: user.minAge ?? 20,
    maxAge: user.maxAge ?? 50,
  };
};

/**
 * 프로필 사진 업로드 (Supabase Storage)
 */
export const uploadProfilePhoto = async (userId: string, file: Express.Multer.File) => {
  // 1. 현재 사용자 프로필 조회
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profilePhotos: true },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
  }

  // 2. 사진 개수 제한 확인 (최대 6장)
  if (user.profilePhotos.length >= 6) {
    throw new AppError(400, 'MAX_PHOTOS_EXCEEDED', '최대 6장까지 업로드할 수 있습니다');
  }

  // 3. 파일명 생성 (UUID + 확장자)
  const fileExt = file.originalname.split('.').pop();
  const fileName = `${userId}/${uuidv4()}.${fileExt}`;

  // 4. Supabase Storage에 업로드
  const { data, error } = await supabaseStorage
    .from('profile-photos')
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new AppError(500, 'UPLOAD_FAILED', '사진 업로드에 실패했습니다');
  }

  // 5. Public URL 생성
  const { data: urlData } = supabaseStorage
    .from('profile-photos')
    .getPublicUrl(data.path);

  const photoUrl = urlData.publicUrl;

  // 6. DB에 URL 추가
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      profilePhotos: [...user.profilePhotos, photoUrl],
    },
    select: {
      id: true,
      profilePhotos: true,
    },
  });

  return {
    photoUrl,
    profilePhotos: updatedUser.profilePhotos,
  };
};

/**
 * 프로필 사진 삭제
 */
export const deleteProfilePhoto = async (userId: string, photoUrl: string) => {
  // 1. 현재 사용자 프로필 조회
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profilePhotos: true },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
  }

  // 2. 사진이 존재하는지 확인
  if (!user.profilePhotos.includes(photoUrl)) {
    throw new AppError(404, 'PHOTO_NOT_FOUND', '사진을 찾을 수 없습니다');
  }

  // 3. Supabase Storage에서 파일 경로 추출
  const url = new URL(photoUrl);
  const pathParts = url.pathname.split('/profile-photos/');
  const filePath = pathParts[1];

  // 4. Supabase Storage에서 삭제
  if (filePath) {
    const { error } = await supabaseStorage
      .from('profile-photos')
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      // 삭제 실패해도 DB에서는 제거 (Storage와 DB 불일치 방지)
    }
  }

  // 5. DB에서 URL 제거
  const updatedPhotos = user.profilePhotos.filter((url) => url !== photoUrl);

  await prisma.user.update({
    where: { id: userId },
    data: {
      profilePhotos: updatedPhotos,
    },
  });
};

/**
 * 프로필 사진 업데이트 (URL 배열로 직접 설정)
 */
export const updateProfilePhotos = async (userId: string, photoUrls: string[]) => {
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
};

/**
 * 온라인 상태 업데이트
 */
export const updateOnlineStatus = async (
  userId: string,
  status: 'ONLINE' | 'OFFLINE' | 'IN_CALL'
) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      onlineStatus: status,
      lastActive: new Date(),
    },
  });
};

/**
 * 사용자의 친구 ID 목록 조회 (양방향)
 * - 내가 친구로 추가한 사용자
 * - 나를 친구로 추가한 사용자
 */
export const getFriendIds = async (userId: string): Promise<string[]> => {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userId: userId }, { friendId: userId }],
    },
    select: { userId: true, friendId: true },
  });

  const friendIds = new Set<string>();
  friendships.forEach((f) => {
    if (f.userId !== userId) friendIds.add(f.userId);
    if (f.friendId !== userId) friendIds.add(f.friendId);
  });

  return Array.from(friendIds);
};

/**
 * 사용자 통계 조회
 */
export const getUserStats = async (userId: string) => {
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
};
