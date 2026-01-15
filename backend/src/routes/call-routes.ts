/**
 * 통화 관리 라우트
 */

import { Router } from 'express';
import * as callController from '../controllers/call-controller';
import { authenticate } from '../middlewares/auth';
import { validateParams } from '../middlewares/validation';
import { callIdParamsSchema, sessionIdParamsSchema } from '../utils/validation';

const router = Router();

/**
 * @route   POST /api/call/start
 * @desc    통화 시작
 * @access  Private
 */
router.post('/start', authenticate, callController.startCall);

/**
 * @route   POST /api/call/:callId/end
 * @desc    통화 종료
 * @access  Private
 */
router.post('/:callId/end', authenticate, validateParams(callIdParamsSchema), callController.endCall);

/**
 * @route   GET /api/call/history
 * @desc    통화 기록 조회
 * @access  Private
 */
router.get('/history', authenticate, callController.getCallHistory);

/**
 * @route   GET /api/call/session/:sessionId
 * @desc    세션 정보 조회 (통화 종료 후 상대방 정보 확인)
 * @access  Private
 */
router.get('/session/:sessionId', authenticate, validateParams(sessionIdParamsSchema), callController.getSessionInfo);

/**
 * @route   POST /api/call/:callId/event
 * @desc    통화 이벤트 기록
 * @access  Private
 */
router.post('/:callId/event', authenticate, validateParams(callIdParamsSchema), callController.recordCallEvent);

export default router;
