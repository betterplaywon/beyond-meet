/**
 * Match 라우트
 */

import { Router } from 'express';
import * as matchController from '../controllers/match-controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// 모든 라우트에 인증 필요
router.use(authenticate);

/**
 * POST /api/match/queue
 * 랜덤 매칭 대기열 추가
 */
router.post('/queue', matchController.joinQueue);

/**
 * DELETE /api/match/queue
 * 랜덤 매칭 대기열 제거
 */
router.delete('/queue', matchController.leaveQueue);

/**
 * POST /api/match/direct
 * 선택 매칭 요청 (친구에게 통화)
 */
router.post('/direct', matchController.requestDirectCall);

/**
 * POST /api/match/:sessionId/accept
 * 매칭 수락
 */
router.post('/:sessionId/accept', matchController.acceptMatch);

/**
 * POST /api/match/:sessionId/reject
 * 매칭 거절
 */
router.post('/:sessionId/reject', matchController.rejectMatch);

/**
 * POST /api/match/:sessionId/end
 * 통화 종료
 */
router.post('/:sessionId/end', matchController.endCall);

export default router;
