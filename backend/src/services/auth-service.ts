/**
 * 인증 서비스 (함수형)
 */

import prisma from '../config/database';
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
 * 초대 코드 검증
 */
const validateInviteCode = async (code: string) => {
  const inviteCode = await prisma.inviteCode.findUnique({
    where: { code },
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

  if (inviteCode.usedCount >= inviteCode.maxUses) {
    throw new AppError(400, 'INVITE_CODE_EXHAUSTED', '사용 횟수가 초과된 초대 코드입니다');
  }

  return inviteCode;
};

/**
 * 회원가입
 */
export const register = async (data: RegisterInput): Promise<RegisterOutput> => {
  const userCount = await prisma.user.count();
  const betaLimit = parseInt(process.env.BETA_USER_LIMIT || '20', 10);

  if (userCount >= betaLimit) {
    throw new AppError(403, 'BETA_LIMIT_REACHED', 'Beta 테스트 사용자 수가 가득 찼습니다');
  }

  const inviteCode = await validateInviteCode(data.inviteCode);

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new AppError(400, 'EMAIL_EXISTS', '이미 사용 중인 이메일입니다');
  }

  const hashedPassword = await hashPassword(data.password);

  const user = await prisma.$transaction(async (tx) => {
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
        // 매칭 필터 기본값 설정 (더 많은 매칭 기회 제공)
        preferredGender: data.preferredGender || 'ANYONE', // 기본: 모든 성별 매칭 가능
        minAge: data.minAge || 18,
        maxAge: data.maxAge || 99,
        preferredCountries: data.preferredCountries || [], // 빈 배열 = 모든 국가 매칭 가능
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
      },
    });

    await tx.inviteCodeUsage.create({
      data: {
        inviteCodeId: inviteCode.id,
        userId: newUser.id,
      },
    });

    await tx.inviteCode.update({
      where: { id: inviteCode.id },
      data: {
        usedCount: { increment: 1 },
      },
    });

    return newUser;
  });

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
  });

  const refreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
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
  });

  const refreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
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
export const refreshToken = async (userId: string): Promise<{ accessToken: string; refreshToken: string }> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    throw new AppError(401, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다');
  }

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
  });

  const newRefreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
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

  // TODO: 실제 배포 시 Redis에 토큰 저장 및 만료 시간 설정
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

  // TODO: 실제 배포 시 Redis에서 토큰 삭제
  // await redis.del(`reset:${resetToken}`);
};
