/**
 * 인증 컨트롤러 (함수형)
 */

import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth-service';
import { verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../middlewares/errorHandler';
import prisma from '../config/database';

/**
 * 회원가입
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      inviteCode,
      email,
      password,
      nickname,
      birthDate,
      gender,
      country,
      bio,
      interests,
      preferredGender,
      minAge,
      maxAge,
      preferredCountries,
    } = req.body;

    if (!inviteCode || !email || !password || !nickname || !birthDate || !gender || !country) {
      throw new AppError(400, 'MISSING_FIELDS', '필수 필드가 누락되었습니다');
    }

    if (!preferredGender || minAge === undefined || maxAge === undefined) {
      throw new AppError(400, 'MISSING_FILTER_FIELDS', '매칭 필터 필드가 누락되었습니다');
    }

    if (minAge < 18 || maxAge > 100 || minAge > maxAge) {
      throw new AppError(400, 'INVALID_AGE_RANGE', '유효하지 않은 나이 범위입니다');
    }

    const result = await authService.register({
      inviteCode,
      email,
      password,
      nickname,
      birthDate,
      gender,
      country,
      bio,
      interests,
      preferredGender,
      minAge,
      maxAge,
      preferredCountries,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 로그인
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'MISSING_FIELDS', '이메일과 비밀번호를 입력해주세요');
    }

    const result = await authService.login({
      email,
      password,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 토큰 갱신
 * POST /api/auth/refresh
 */
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError(400, 'MISSING_REFRESH_TOKEN', 'Refresh token이 필요합니다');
    }

    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded || !decoded.id) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', '유효하지 않은 refresh token입니다');
    }

    const result = await authService.refreshToken(decoded.id);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 로그아웃
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    await authService.logout(userId);

    res.status(200).json({
      success: true,
      data: {
        message: '로그아웃되었습니다',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 현재 사용자 정보
 * GET /api/auth/me
 */
export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

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

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
