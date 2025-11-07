/**
 * 통화 관리 라우트
 */

import { Router } from 'express';
import * as callController from '../controllers/call-controller';
import { authenticate } from '../middlewares/auth';

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
router.post('/:callId/end', authenticate, callController.endCall);

/**
 * @route   GET /api/call/history
 * @desc    통화 기록 조회
 * @access  Private
 */
router.get('/history', authenticate, callController.getCallHistory);

/**
 * @route   POST /api/call/:callId/event
 * @desc    통화 이벤트 기록
 * @access  Private
 */
router.post('/:callId/event', authenticate, callController.recordCallEvent);

export default router;
