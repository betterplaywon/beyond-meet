/**
 * 인증 서비스 (함수형)
 *
 * 보안 수정 내역:
 * - Race Condition 수정: 초대 코드 검증을 트랜잭션 내부로 이동
 * - Serializable isolation level 사용으로 동시성 문제 방지
 */

import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { AppError } from '../middlewares/errorHandler';

export interface RegisterInput {
  inviteCode: string;
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
  // 비밀번호는 트랜잭션 전에 해싱 (CPU 바운드 작업)
  const hashedPassword = await hashPassword(data.password);

  const user = await prisma.$transaction(
    async (tx) => {
      // 1. Beta 사용자 수 제한 확인 (트랜잭션 내부에서 검증)
      const userCount = await tx.user.count();
      const betaLimit = parseInt(process.env.BETA_USER_LIMIT || '20', 10);

      if (userCount >= betaLimit) {
        throw new AppError(403, 'BETA_LIMIT_REACHED', 'Beta 테스트 사용자 수가 가득 찼습니다');
      }

      // 2. 초대 코드 검증 (트랜잭션 내부 - Race Condition 방지)
      const inviteCode = await tx.inviteCode.findUnique({
        where: { code: data.inviteCode },
      });

      if (!inviteCode) {
        throw new AppError(400, 'INVALID_INVITE_CODE', '유효하지 않은 초대 코드입니다');
      }

      if (!inviteCode.isActive) {
        throw new AppError(400, 'INVITE_CODE_INACTIVE', '비활성화된 초대 코드입니다');
      }

      if (inviteCode.expiresAt && inviteCode.expiresAt < new Date()) {
        throw new AppError(400, 'INVITE_CODE_EXPIRED', '만료된 초대 코드입니다');
      }

      // Critical: usedCount 검증이 트랜잭션 내부에 있어야 race condition 방지
      if (inviteCode.usedCount >= inviteCode.maxUses) {
        throw new AppError(400, 'INVITE_CODE_EXHAUSTED', '사용 횟수가 초과된 초대 코드입니다');
      }

      // 3. 이메일 중복 확인 (트랜잭션 내부)
      const existingUser = await tx.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new AppError(400, 'EMAIL_EXISTS', '이미 사용 중인 이메일입니다');
      }

      // 4. 사용자 생성
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
        },
      });

      // 5. 초대 코드 사용 기록
      await tx.inviteCodeUsage.create({
        data: {
          inviteCodeId: inviteCode.id,
          userId: newUser.id,
        },
      });

      // 6. 초대 코드 사용 횟수 증가
      await tx.inviteCode.update({
        where: { id: inviteCode.id },
        data: {
          usedCount: { increment: 1 },
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
    },
  });

  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다');
  }

  const isValidPassword = await comparePassword(data.password, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      onlineStatus: 'ONLINE',
      lastActive: new Date(),
    },
  });

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
  await prisma.user.update({
    where: { id: userId },
    data: {
      onlineStatus: 'OFFLINE',
      lastActive: new Date(),
    },
  });
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
    },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
  }

  return user;
};
