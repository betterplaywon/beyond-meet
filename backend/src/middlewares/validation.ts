/**
 * Request Validation Middleware
 * Zod 스키마 검증 및 인증 체크 미들웨어
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from './errorHandler';
import { formatZodError } from '../utils/validation';

/**
 * Zod 스키마 검증 미들웨어 팩토리
 * @param schema Zod 스키마
 * @returns Express 미들웨어
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, 'VALIDATION_ERROR', formatZodError(result.error));
    }
    req.body = result.data;
    next();
  };
};

/**
 * 인증 필수 미들웨어
 * authMiddleware 이후에 사용하여 req.user가 존재하는지 확인
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.id) {
    throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
  }
  next();
};

/**
 * Zod 스키마 검증 미들웨어 팩토리 (Route Parameters)
 * @param schema Zod 스키마
 * @returns Express 미들웨어
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      throw new AppError(400, 'VALIDATION_ERROR', formatZodError(result.error));
    }
    // Zod 변환 적용 (타입 단언 사용)
    req.params = result.data as typeof req.params;
    next();
  };
};
