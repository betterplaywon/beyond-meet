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
  verifyEmailSchema,
  formatZodError,
} from '../utils/validation';
import {
  sendVerificationEmail,
  verifyEmailCode,
  sendPreRegistrationVerificationEmail,
  verifyPreRegistrationCode,
} from '../services/email-service';

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

/**
 * 비밀번호 변경 (로그인된 사용자)
 * POST /api/auth/change-password
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError(400, 'MISSING_FIELDS', '현재 비밀번호와 새 비밀번호를 모두 입력해주세요');
    }

    // 비밀번호 최소 길이 검증
    if (newPassword.length < 8) {
      throw new AppError(400, 'WEAK_PASSWORD', '비밀번호는 최소 8자 이상이어야 합니다');
    }

    await authService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 회원 탈퇴
 * DELETE /api/auth/account
 */
export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    const { password } = req.body;

    if (!password) {
      throw new AppError(400, 'MISSING_PASSWORD', '비밀번호를 입력해주세요');
    }

    await authService.deleteAccount(userId, password);

    res.status(200).json({
      success: true,
      data: {
        message: '회원 탈퇴가 완료되었습니다.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 회원가입 전 이메일 인증 코드 발송 (비인증)
 * POST /api/auth/send-verification-code
 */
export const sendVerificationCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError(400, 'MISSING_EMAIL', '이메일을 입력해주세요');
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError(400, 'INVALID_EMAIL', '올바른 이메일 형식이 아닙니다');
    }

    await sendPreRegistrationVerificationEmail(email);

    res.status(200).json({
      success: true,
      data: {
        message: '인증 코드가 이메일로 전송되었습니다',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 회원가입 전 이메일 인증 코드 확인 (비인증)
 * POST /api/auth/verify-code
 */
export const verifyCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      throw new AppError(400, 'MISSING_FIELDS', '이메일과 인증 코드를 입력해주세요');
    }

    // Zod 스키마로 코드 검증
    const parseResult = verifyEmailSchema.safeParse({ code });
    if (!parseResult.success) {
      throw new AppError(400, 'VALIDATION_ERROR', formatZodError(parseResult.error));
    }

    await verifyPreRegistrationCode(email, code);

    res.status(200).json({
      success: true,
      data: {
        message: '이메일이 인증되었습니다',
        emailVerified: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 이메일 인증 코드 확인 (로그인된 사용자)
 * POST /api/auth/verify-email
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    // Zod 스키마로 입력 검증
    const parseResult = verifyEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(400, 'VALIDATION_ERROR', formatZodError(parseResult.error));
    }

    const { code } = parseResult.data;

    await verifyEmailCode(userId, code);

    res.status(200).json({
      success: true,
      data: {
        message: '이메일이 인증되었습니다',
        emailVerified: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 이메일 인증 코드 재발송
 * POST /api/auth/resend-verification
 */
export const resendVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    const user = await authService.getCurrentUser(userId);

    if (user.emailVerified) {
      throw new AppError(400, 'ALREADY_VERIFIED', '이미 인증된 이메일입니다');
    }

    await sendVerificationEmail(userId, user.email);

    res.status(200).json({
      success: true,
      data: {
        message: '인증 코드가 이메일로 전송되었습니다',
      },
    });
  } catch (error) {
    next(error);
  }
};
