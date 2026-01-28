/**
 * 콘텐츠 모니터링 컨트롤러
 */

import { Request, Response, NextFunction } from 'express';
import * as moderationService from '../services/moderation-service';
import { AppError } from '../middlewares/errorHandler';
import prisma from '../config/database';

/**
 * POST /api/moderation/analyze
 * 비디오 프레임 분석
 */
export const analyzeFrame = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const { sessionId, imageBase64 } = req.body;

    if (!sessionId || !imageBase64) {
      throw new AppError(400, 'MISSING_FIELDS', 'sessionId and imageBase64 required');
    }

    const hasQuota = await moderationService.checkApiQuota();
    if (!hasQuota) {
      return res.status(200).json({
        success: true,
        data: {
          action: 'NONE',
          message: 'Moderation temporarily unavailable (quota exceeded)',
        },
      });
    }

    const result = await moderationService.analyzeImage(imageBase64);

    await moderationService.incrementQuota();

    const action = moderationService.determineAction(result.confidence);

    await moderationService.createModerationLog({
      sessionId,
      userId,
      confidence: result.confidence,
      actionTaken: action,
      metadata: result,
    });

    if (action === 'CALL_ENDED') {
      try {
        const session = await prisma.matchSession.findUnique({
          where: { id: sessionId },
          select: { userId1: true, userId2: true },
        });

        if (session) {
          const reportedUserId = session.userId1 === userId ? session.userId2 : session.userId1;

          await moderationService.createAutoReport({
            reportedUserId,
            sessionId,
            confidence: result.confidence,
          });
        }
      } catch {
        // 자동 신고 생성 실패해도 응답은 정상 반환
      }
    }

    res.status(200).json({
      success: true,
      data: {
        confidence: result.confidence,
        action,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/moderation/report
 * 수동 신고 생성
 */
export const createManualReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const reporterId = req.user!.id;
    const { sessionId, reason, description } = req.body;

    if (!sessionId || !reason) {
      throw new AppError(400, 'MISSING_FIELDS', 'sessionId and reason are required');
    }

    const session = await prisma.matchSession.findUnique({
      where: { id: sessionId },
      select: { userId1: true, userId2: true },
    });

    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Session not found');
    }

    const reportedUserId = session.userId1 === reporterId ? session.userId2 : session.userId1;

    const report = await prisma.report.create({
      data: {
        reporterId,
        reportedUserId,
        sessionId,
        reason,
        description: description || null,
        isAiGenerated: false,
        status: 'PENDING',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        reportId: report.id,
        message: 'Report submitted successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};
