/**
 * 관리자 라우트
 */

import { Router } from 'express';
import * as adminController from '../controllers/admin-controller';
import { authenticate } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/admin';
import { adminLimiter } from '../middlewares/rateLimiter';

const router = Router();

// 모든 라우트에 인증 + 관리자 권한 + Rate Limiting 필요
router.use(authenticate);
router.use(requireAdmin);
router.use(adminLimiter);

/**
 * @route   POST /api/admin/invite-codes
 * @desc    초대 코드 생성
 * @access  Private (Admin)
 */
router.post('/invite-codes', adminController.createInviteCodes);

/**
 * @route   GET /api/admin/invite-codes
 * @desc    초대 코드 목록 조회
 * @access  Private (Admin)
 */
router.get('/invite-codes', adminController.getInviteCodes);

/**
 * @route   PATCH /api/admin/invite-codes/:codeId/deactivate
 * @desc    초대 코드 비활성화
 * @access  Private (Admin)
 */
router.patch('/invite-codes/:codeId/deactivate', adminController.deactivateInviteCode);

/**
 * @route   GET /api/admin/stats
 * @desc    통계 조회
 * @access  Private (Admin)
 */
router.get('/stats', adminController.getStats);

/**
 * @route   GET /api/admin/moderation-logs
 * @desc    모니터링 로그 조회
 * @access  Private (Admin)
 */
router.get('/moderation-logs', adminController.getModerationLogs);

/**
 * @route   GET /api/admin/reports
 * @desc    신고 내역 조회
 * @access  Private (Admin)
 */
router.get('/reports', adminController.getReports);

export default router;
