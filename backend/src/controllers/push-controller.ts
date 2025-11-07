/**
 * 푸시 알림 컨트롤러
 */

import { Request, Response, NextFunction } from 'express';
import * as pushService from '../services/push-service';
import { AppError } from '../middlewares/errorHandler';

/**
 * 디바이스 토큰 등록
 * POST /api/push/register-device
 */
export const registerDevice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, deviceToken, platform } = req.body;

    if (!userId || !deviceToken || !platform) {
      throw new AppError(400, 'MISSING_FIELDS', '필수 필드가 누락되었습니다');
    }

    if (!['IOS', 'ANDROID'].includes(platform)) {
      throw new AppError(400, 'INVALID_PLATFORM', '유효하지 않은 플랫폼입니다');
    }

    await pushService.registerDeviceToken({
      userId,
      deviceToken,
      platform,
    });

    res.status(201).json({
      success: true,
      message: '디바이스 토큰이 등록되었습니다.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 디바이스 토큰 제거
 * DELETE /api/push/unregister-device
 */
export const unregisterDevice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deviceToken } = req.body;

    if (!deviceToken) {
      throw new AppError(400, 'MISSING_DEVICE_TOKEN', '디바이스 토큰이 필요합니다');
    }

    await pushService.unregisterDeviceToken(deviceToken);

    res.status(200).json({
      success: true,
      message: '디바이스 토큰이 제거되었습니다.',
    });
  } catch (error) {
    next(error);
  }
};
