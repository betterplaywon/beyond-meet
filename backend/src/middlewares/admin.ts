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
 * 관리자 권한 확인 (듀얼 체크: DB role + 이메일 Fallback)
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;

  if (!user?.email) {
    throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
  }

  // Primary: Database role check
  const hasAdminRole = user.role === 'ADMIN';

  // Fallback: Email check (backward compatibility during migration)
  const hasAdminEmail = ADMIN_EMAILS.includes(user.email);

  if (!hasAdminRole && !hasAdminEmail) {
    throw new AppError(403, 'FORBIDDEN', '관리자 권한이 필요합니다');
  }

  // Log migration status for monitoring
  if (hasAdminEmail && !hasAdminRole) {
    console.warn(`[Admin Auth] ${user.email} using legacy auth (email-based). Please re-login to update token.`);
  }

  next();
};
