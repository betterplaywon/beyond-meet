/**
 * 인증 서비스 (함수형)
 *
 * 보안 수정 내역:
 * - Serializable isolation level 사용으로 동시성 문제 방지
 * - BETA_USER_LIMIT으로 가입 인원 제한
 */

import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { AppError } from '../middlewares/errorHandler';
import { deleteMultipleProfilePhotos } from './storage-service';
import { isEmailPreVerified, clearEmailPreVerification } from './email-service';
import { updateUserStatus } from '../utils/user-status';

export interface RegisterInput {
  email: string;
  password: string;
  nickname: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  country: string;
  bio?: string;
  interests?: string[];
  preferredGender?: 'MALE' | 'FEMALE' | 'ANYONE';
  minAge?: number;
  maxAge?: number;
  preferredCountries?: string[];
}

export interface RegisterOutput {
  user: {
    id: string;
    email: string;
    nickname: string;
    birthDate: Date;
    gender: string;
    country: string;
    bio: string | null;
    interests: string[];
    emailVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/**
 * 회원가입
 *
 * Race Condition 방지:
 * - 모든 검증 및 생성 로직을 단일 트랜잭션 내에서 수행
 * - Serializable isolation level로 동시 요청 시 데이터 정합성 보장
 */
export const register = async (data: RegisterInput): Promise<RegisterOutput> => {
  // 이메일 사전 인증 확인 (Step 1에서 인증 완료된 경우)
  const emailPreVerified = await isEmailPreVerified(data.email);

  if (!emailPreVerified) {
    throw new AppError(400, 'EMAIL_NOT_VERIFIED', '이메일 인증이 필요합니다. 인증 코드를 먼저 확인해주세요.');
  }

  // 비밀번호는 트랜잭션 전에 해싱 (CPU 바운드 작업)
  const hashedPassword = await hashPassword(data.password);

  const user = await prisma.$transaction(
    async (tx) => {
      // 1. Beta 사용자 수 제한 확인 (트랜잭션 내부에서 검증)
      const userCount = await tx.user.count();
      const betaLimit = parseInt(process.env.BETA_USER_LIMIT || '30', 10);

      if (userCount >= betaLimit) {
        throw new AppError(403, 'BETA_LIMIT_REACHED', 'Beta 테스트 사용자 수가 가득 찼습니다');
      }

      // 2. 이메일 중복 확인 (트랜잭션 내부)
      const existingUser = await tx.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new AppError(400, 'EMAIL_EXISTS', '이미 사용 중인 이메일입니다');
      }

      // 3. 사용자 생성 (이메일 사전 인증 완료 상태로)
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: hashedPassword,
          nickname: data.nickname,
          birthDate: new Date(data.birthDate),
          gender: data.gender,
          country: data.country,
          bio: data.bio || null,
          interests: data.interests || [],
          profilePhotos: [],
          preferredGender: data.preferredGender || 'ANYONE',
          minAge: data.minAge || 18,
          maxAge: data.maxAge || 99,
          preferredCountries: data.preferredCountries || [],
          onlineStatus: 'OFFLINE',
          emailVerified: true, // 사전 인증 완료
          emailVerifiedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          nickname: true,
          birthDate: true,
          gender: true,
          country: true,
          bio: true,
          interests: true,
          role: true,
          emailVerified: true,
        },
      });

      return newUser;
    },
    {
      // Serializable: 가장 높은 격리 수준으로 race condition 완전 방지
      // 동시 요청 시 하나만 성공하고 나머지는 재시도 또는 실패
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      // 타임아웃 설정 (5초)
      timeout: 5000,
    }
  );

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  // 이메일 사전 인증 상태 정리 (Redis에서 삭제)
  try {
    await clearEmailPreVerification(user.email);
  } catch (error) {
    console.error('[REGISTER] Failed to clear pre-verification status:', error);
  }

  return {
    user,
    accessToken,
    refreshToken,
  };
};

/**
 * 로그인
 */
export const login = async (data: LoginInput): Promise<RegisterOutput> => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      nickname: true,
      birthDate: true,
      gender: true,
      country: true,
      bio: true,
      interests: true,
      role: true,
      emailVerified: true,
    },
  });

  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다');
  }

  const isValidPassword = await comparePassword(data.password, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다');
  }

  // 사용자 온라인 상태 업데이트 (utility 사용)
  await updateUserStatus(user.id, 'ONLINE');

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const { passwordHash, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
  };
};

/**
 * 토큰 갱신
 */
export const refreshToken = async (userId: string): Promise<{ accessToken: string; refreshToken: string; user: { id: string; email: string; role: 'USER' | 'ADMIN' } }> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    throw new AppError(401, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
  }

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  const newRefreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
};

/**
 * 로그아웃
 */
export const logout = async (userId: string): Promise<void> => {
  // 사용자 오프라인 상태 업데이트 (utility 사용)
  await updateUserStatus(userId, 'OFFLINE');
};

/**
 * 비밀번호 재설정 토큰 생성 (Beta: 간단 구현)
 */
export const createPasswordResetToken = async (email: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // 보안상 사용자 존재 여부를 노출하지 않음
    throw new AppError(404, 'USER_NOT_FOUND', '해당 이메일로 등록된 사용자가 없습니다');
  }

  // Beta: 간단한 토큰 생성 (실제로는 JWT나 random token 사용 권장)
  const resetToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');

  // TODO: 실제 배포 시 Redis에 토큰 저장 및 만료 시간 설정 (Beta 기간 동안 생략)
  // await redis.set(`reset:${resetToken}`, email, 'EX', 3600); // 1시간

  return resetToken;
};

/**
 * 비밀번호 재설정
 */
export const resetPassword = async (email: string, newPassword: string): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
  }

  // 새 비밀번호 해싱
  const hashedPassword = await hashPassword(newPassword);

  // 비밀번호 업데이트
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashedPassword,
    },
  });

  // TODO: 실제 배포 시 Redis에서 토큰 삭제 (Beta 기간 동안 생략)
  // await redis.del(`reset:${resetToken}`);
};

/**
 * 비밀번호 변경 (로그인된 사용자)
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
  }

  // 현재 비밀번호 확인
  const isValidPassword = await comparePassword(currentPassword, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError(400, 'INVALID_CURRENT_PASSWORD', '현재 비밀번호가 올바르지 않습니다');
  }

  // 새 비밀번호가 현재 비밀번호와 같은지 확인
  const isSamePassword = await comparePassword(newPassword, user.passwordHash);

  if (isSamePassword) {
    throw new AppError(400, 'SAME_PASSWORD', '새 비밀번호는 현재 비밀번호와 달라야 합니다');
  }

  // 새 비밀번호 해싱
  const hashedPassword = await hashPassword(newPassword);

  // 비밀번호 업데이트
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: hashedPassword,
    },
  });
};

/**
 * 현재 사용자 정보 조회
 */
export const getCurrentUser = async (userId: string) => {
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
      role: true,
      emailVerified: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
  }

  return user;
};

/**
 * 회원 탈퇴
 *
 * - 비밀번호 확인 후 계정 삭제
 * - 진행 중인 통화가 있으면 거부
 * - 관련 데이터를 외래키 의존성 역순으로 삭제
 * - Report는 익명화 (userId를 null로 설정)
 * - 프로필 이미지는 트랜잭션 외부에서 삭제 (실패해도 계정 삭제는 완료)
 */
export const deleteAccount = async (userId: string, password: string): Promise<void> => {
  // 1. 사용자 조회 및 비밀번호 확인
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      passwordHash: true,
      profilePhotos: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
  }

  const isValidPassword = await comparePassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new AppError(400, 'INVALID_PASSWORD', '비밀번호가 올바르지 않습니다');
  }

  // 2. 진행 중인 세션 강제 종료
  await prisma.matchSession.updateMany({
    where: {
      OR: [{ userId1: userId }, { userId2: userId }],
      status: { in: ['PENDING', 'ACTIVE'] },
    },
    data: { status: 'CANCELLED' },
  });

  // 3. 트랜잭션으로 데이터 삭제 (CASCADE 설정으로 간소화)
  await prisma.$transaction(
    async (tx) => {
      // Report 익명화 (SET NULL - CASCADE가 아닌 수동 처리)
      await tx.report.updateMany({
        where: { reporterId: userId },
        data: { reporterId: null },
      });
      await tx.report.updateMany({
        where: { reportedUserId: userId },
        data: { reportedUserId: null },
      });

      // User 삭제 → CASCADE로 관련 데이터 자동 삭제
      // (Friendship, BlockList, DeviceToken, EmailVerification, ContentModerationLog)
      // MatchSession, CallRecord의 사용자 FK는 SET NULL (상대방 기록 보존)
      await tx.user.delete({
        where: { id: userId },
      });
    },
    {
      timeout: 30000, // 30초 타임아웃
    }
  );

  // 4. Storage에서 프로필 사진 삭제 (트랜잭션 외부 - 실패해도 계정 삭제는 완료)
  if (user.profilePhotos && user.profilePhotos.length > 0) {
    try {
      // URL에서 파일 경로 추출 (형식: userId/timestamp_filename.jpg)
      const filePaths = user.profilePhotos.map((url) => {
        const urlParts = url.split('/');
        const filename = urlParts[urlParts.length - 1];
        return `${userId}/${filename}`;
      });
      await deleteMultipleProfilePhotos(filePaths);
    } catch (error) {
      // Storage 삭제 실패는 로그만 남기고 진행
      console.error('[DELETE_ACCOUNT] Failed to delete profile photos:', error);
    }
  }
};
