/**
 * 관리자 컨트롤러
 */

import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin-service';

// Prisma Enum 타입 정의
type ModerationAction = 'NONE' | 'WARNING_ISSUED' | 'CALL_ENDED';
type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

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
 * GET /api/admin/moderation-logs
 * 모니터링 로그 조회
 */
export const getModerationLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 20, actionTaken } = req.query;

    const prisma = (await import('../config/database')).default;

    // actionTaken이 유효한 ModerationAction인지 확인
    const validActionTaken = actionTaken &&
      ['NONE', 'WARNING_ISSUED', 'CALL_ENDED'].includes(actionTaken as string)
      ? (actionTaken as ModerationAction)
      : undefined;

    const logs = await prisma.contentModerationLog.findMany({
      where: validActionTaken ? { actionTaken: validActionTaken } : undefined,
      include: {
        user: {
          select: { id: true, nickname: true, email: true },
        },
        session: {
          select: { id: true, channelName: true },
        },
      },
      orderBy: { detectedAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const total = await prisma.contentModerationLog.count({
      where: validActionTaken ? { actionTaken: validActionTaken } : undefined,
    });

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/reports
 * 신고 내역 조회
 */
export const getReports = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const prisma = (await import('../config/database')).default;

    // status가 유효한 ReportStatus인지 확인
    const validStatus = status &&
      ['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'].includes(status as string)
      ? (status as ReportStatus)
      : undefined;

    const reports = await prisma.report.findMany({
      where: validStatus ? { status: validStatus } : undefined,
      include: {
        reporter: {
          select: { id: true, nickname: true, email: true },
        },
        reportedUser: {
          select: { id: true, nickname: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const total = await prisma.report.count({
      where: validStatus ? { status: validStatus } : undefined,
    });

    res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
