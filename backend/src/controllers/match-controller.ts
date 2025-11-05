/**
 * 매칭 컨트롤러 (함수형)
 */

import { Request, Response, NextFunction } from 'express';
import * as matchService from '../services/match-service';
import { AppError } from '../middlewares/errorHandler';

/**
 * 랜덤 매칭 대기열 추가
 * POST /api/match/queue
 */
export const joinQueue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    const result = await matchService.addToMatchQueue(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 랜덤 매칭 대기열 제거
 * DELETE /api/match/queue
 */
export const leaveQueue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    const result = matchService.removeFromMatchQueue(userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 선택 매칭 요청 (친구에게 통화)
 * POST /api/match/direct
 */
export const requestDirectCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { receiverId } = req.body;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    if (!receiverId) {
      throw new AppError(400, 'MISSING_RECEIVER_ID', 'receiverId가 필요합니다');
    }

    const session = await matchService.requestDirectMatch(userId, receiverId);

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 매칭 수락
 * POST /api/match/:sessionId/accept
 */
export const acceptMatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    const session = await matchService.acceptMatch(sessionId, userId);

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 매칭 거절
 * POST /api/match/:sessionId/reject
 */
export const rejectMatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    const result = await matchService.rejectMatch(sessionId, userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 통화 종료
 * POST /api/match/:sessionId/end
 */
export const endCall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;

    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', '인증이 필요합니다');
    }

    const result = await matchService.endCall(sessionId, userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
