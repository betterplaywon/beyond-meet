/**
 * 콘텐츠 모니터링 컨트롤러
 */

import { Request, Response, NextFunction } from 'express';
import * as moderationService from '../services/moderation-service';
import { AppError } from '../middlewares/errorHandler';

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
