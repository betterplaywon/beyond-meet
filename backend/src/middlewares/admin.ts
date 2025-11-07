/**
 * 관리자 권한 확인 미들웨어
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * 관리자 이메일 목록 (환경 변수로 관리)
 */
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];

/**
 * 관리자 권한 확인
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const userEmail = req.user?.email;

  if (!userEmail) {
    throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
  }

  if (!ADMIN_EMAILS.includes(userEmail)) {
    throw new AppError(403, 'FORBIDDEN', '관리자 권한이 필요합니다');
  }

  next();
};
