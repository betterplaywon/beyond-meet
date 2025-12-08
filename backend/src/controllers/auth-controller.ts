/**
 * 인증 컨트롤러 (함수형)
 */

import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth-service';
import { verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../middlewares/errorHandler';
import {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  formatZodError,
} from '../utils/validation';

/**
 * 회원가입
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Zod 스키마로 입력 검증
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(400, 'VALIDATION_ERROR', formatZodError(parseResult.error));
    }

    const validatedData = parseResult.data;

    const result = await authService.register({
      inviteCode: validatedData.inviteCode,
      email: validatedData.email,
      password: validatedData.password,
      nickname: validatedData.nickname,
      birthDate: validatedData.birthDate,
      gender: validatedData.gender,
      country: validatedData.country,
      bio: validatedData.bio,
      interests: validatedData.interests,
      preferredGender: validatedData.preferredGender,
      minAge: validatedData.minAge,
      maxAge: validatedData.maxAge,
      preferredCountries: validatedData.preferredCountries,
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
    // Zod 스키마로 입력 검증
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(400, 'VALIDATION_ERROR', formatZodError(parseResult.error));
    }

    const { email, password } = parseResult.data;

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

    // Service 레이어 사용
    const user = await authService.getCurrentUser(userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 비밀번호 재설정 요청 (Beta: 간단 구현)
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError(400, 'MISSING_EMAIL', '이메일을 입력해주세요');
    }

    // Beta 단계: 실제 이메일 전송 없이 임시 토큰만 생성
    const resetToken = await authService.createPasswordResetToken(email);

    // TODO: 실제 배포 시 이메일 전송 기능 추가
    res.status(200).json({
      success: true,
      message: '비밀번호 재설정 요청이 처리되었습니다.',
      // Beta only: 실제 배포 시 제거
      resetToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 비밀번호 재설정
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Zod 스키마로 입력 검증 (비밀번호 강도 포함)
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(400, 'VALIDATION_ERROR', formatZodError(parseResult.error));
    }

    const { email, newPassword } = parseResult.data;

    await authService.resetPassword(email, newPassword);

    res.status(200).json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.',
    });
  } catch (error) {
    next(error);
  }
};
