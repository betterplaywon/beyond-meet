/**
 * 관리자 컨트롤러
 */

import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin-service';
import { AppError } from '../middlewares/errorHandler';

/**
 * 초대 코드 생성
 * POST /api/admin/invite-codes
 */
export const createInviteCodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { count, maxUses = 1, expiresInDays } = req.body;

    if (!count || count < 1 || count > 100) {
      throw new AppError(400, 'INVALID_COUNT', '생성할 초대 코드 개수는 1~100개여야 합니다');
    }

    const inviteCodes = await adminService.createInviteCodes({
      count,
      maxUses,
      expiresInDays,
      createdBy: req.user?.id,
    });

    res.status(201).json({
      success: true,
      data: {
        inviteCodes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 초대 코드 목록 조회
 * GET /api/admin/invite-codes
 */
export const getInviteCodes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', isActive } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      throw new AppError(400, 'INVALID_PAGINATION', '페이지 정보가 유효하지 않습니다');
    }

    const result = await adminService.getInviteCodes({
      page: pageNum,
      limit: limitNum,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
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
 * 통계 조회
 * GET /api/admin/stats
 */
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await adminService.getStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 초대 코드 비활성화
 * PATCH /api/admin/invite-codes/:codeId/deactivate
 */
export const deactivateInviteCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { codeId } = req.params;

    if (!codeId) {
      throw new AppError(400, 'MISSING_CODE_ID', '초대 코드 ID가 필요합니다');
    }

    await adminService.deactivateInviteCode(codeId);

    res.status(200).json({
      success: true,
      message: '초대 코드가 비활성화되었습니다.',
    });
  } catch (error) {
    next(error);
  }
};
