/**
 * Agora 컨트롤러 (함수형)
 */

import { Request, Response, NextFunction } from 'express';
import { generateAgoraToken } from '../services/match-service';
import { AppError } from '../middlewares/errorHandler';

/**
 * Agora 토큰 발급
 * POST /api/agora/token
 */
export const getToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { channelName } = req.body;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    if (!channelName) {
      throw new AppError(400, 'MISSING_CHANNEL_NAME', 'channelName이 필요합니다');
    }

    const token = generateAgoraToken(channelName, userId);

    res.status(200).json({
      success: true,
      data: {
        token,
        channelName,
        appId: process.env.AGORA_APP_ID,
      },
    });
  } catch (error) {
    next(error);
  }
};
