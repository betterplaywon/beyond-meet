/**
 * Agora 라우트
 */

import { Router } from 'express';
import * as agoraController from '../controllers/agora-controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// 모든 라우트에 인증 필요
router.use(authenticate);

/**
 * POST /api/agora/token
 * Agora RTC 토큰 발급
 */
router.post('/token', agoraController.getToken);

export default router;
