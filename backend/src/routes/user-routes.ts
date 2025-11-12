/**
 * User 라우트
 */

import { Router } from 'express';
import * as userController from '../controllers/user-controller';
import { authenticate } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = Router();

// 모든 라우트에 인증 필요
router.use(authenticate);

/**
 * GET /api/users/me
 * 내 프로필 조회
 */
router.get('/me', userController.getMyProfile);

/**
 * PUT /api/users/:userId
 * 프로필 업데이트
 */
router.put('/:userId', userController.updateProfile);

/**
 * POST /api/users/me/photos
 * 프로필 사진 업로드
 */
router.post('/me/photos', uploadLimiter, upload.single('photo'), userController.uploadProfilePhoto);

/**
 * DELETE /api/users/me/photos/:photoUrl
 * 프로필 사진 삭제
 */
router.delete('/me/photos/:photoUrl', userController.deleteProfilePhoto);

/**
 * GET /api/users/me/stats
 * 내 통계 조회
 */
router.get('/me/stats', userController.getStats);

/**
 * GET /api/users/:userId
 * 다른 사용자 프로필 조회
 */
router.get('/:userId', userController.getUserById);

export default router;
