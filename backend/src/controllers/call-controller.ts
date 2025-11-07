/**
 * 통화 관리 컨트롤러
 */

import { Request, Response, NextFunction } from 'express';
import * as callService from '../services/call-service';
import { AppError } from '../middlewares/errorHandler';

/**
 * 통화 시작
 * POST /api/call/start
 */
export const startCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, callerId, receiverId } = req.body;

    if (!sessionId || !callerId || !receiverId) {
      throw new AppError(400, 'MISSING_FIELDS', '필수 필드가 누락되었습니다');
    }

    const call = await callService.startCall({
      sessionId,
      callerId,
      receiverId,
    });

    res.status(201).json({
      success: true,
      data: {
        call,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 통화 종료
 * POST /api/call/:callId/end
 */
export const endCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { callId } = req.params;
    const { endTime, duration } = req.body;

    if (!callId) {
      throw new AppError(400, 'MISSING_CALL_ID', '통화 ID가 필요합니다');
    }

    const call = await callService.endCall(callId, {
      endTime: endTime ? new Date(endTime) : new Date(),
      duration,
    });

    res.status(200).json({
      success: true,
      data: {
        call,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 통화 기록 조회
 * GET /api/call/history
 */
export const getCallHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, page = '1', limit = '20' } = req.query;

    if (!userId || typeof userId !== 'string') {
      throw new AppError(400, 'MISSING_USER_ID', '사용자 ID가 필요합니다');
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
      throw new AppError(400, 'INVALID_PAGINATION', '페이지 정보가 유효하지 않습니다');
    }

    const result = await callService.getCallHistory(userId, {
      page: pageNum,
      limit: limitNum,
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
 * 통화 이벤트 기록
 * POST /api/call/:callId/event
 */
export const recordCallEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { callId } = req.params;
    const { eventType, timestamp, metadata } = req.body;

    if (!callId) {
      throw new AppError(400, 'MISSING_CALL_ID', '통화 ID가 필요합니다');
    }

    if (!eventType) {
      throw new AppError(400, 'MISSING_EVENT_TYPE', '이벤트 타입이 필요합니다');
    }

    await callService.recordCallEvent(callId, {
      eventType,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      metadata,
    });

    res.status(201).json({
      success: true,
      message: '이벤트가 기록되었습니다.',
    });
  } catch (error) {
    next(error);
  }
};
