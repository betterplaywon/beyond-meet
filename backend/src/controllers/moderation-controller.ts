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

    // 할당량 확인
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

    // AI 분석
    const result = await moderationService.analyzeImage(imageBase64);

    // 할당량 증가
    await moderationService.incrementQuota();

    // 액션 결정
    const action = moderationService.determineAction(result.confidence);

    // 로그 생성
    await moderationService.createModerationLog({
      sessionId,
      userId,
      confidence: result.confidence,
      actionTaken: action,
      metadata: result,
    });

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

    // 세션에서 상대방 ID 가져오기
    const session = await prisma.matchSession.findUnique({
      where: { id: sessionId },
      select: { userId1: true, userId2: true },
    });

    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Session not found');
    }

    // 신고자가 아닌 다른 사용자가 신고 대상
    const reportedUserId = session.userId1 === reporterId ? session.userId2 : session.userId1;

    // 신고 생성
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
