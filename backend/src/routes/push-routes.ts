/**
 * 푸시 알림 라우트
 */

import { Router } from 'express';
import * as pushController from '../controllers/push-controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

/**
 * @route   POST /api/push/register-device
 * @desc    디바이스 토큰 등록
 * @access  Private
 */
router.post('/register-device', authenticate, pushController.registerDevice);

/**
 * @route   DELETE /api/push/unregister-device
 * @desc    디바이스 토큰 제거
 * @access  Private
 */
router.delete('/unregister-device', authenticate, pushController.unregisterDevice);

export default router;
