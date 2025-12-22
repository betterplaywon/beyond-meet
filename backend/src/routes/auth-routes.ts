/**
 * 인증 라우트
 */

import { Router } from 'express';
import * as authController from '../controllers/auth-controller';
import { authenticate } from '../middlewares/auth';
import { authLimiter, passwordResetLimiter, verificationResendLimiter } from '../middlewares/rateLimiter';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    회원가입
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    로그인
 * @access  Public
 */
router.post('/login', authLimiter, authController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    토큰 갱신
 * @access  Public
 */
router.post('/refresh', authController.refresh);

/**
 * @route   POST /api/auth/logout
 * @desc    로그아웃
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    현재 사용자 정보 조회
 * @access  Private
 */
router.get('/me', authenticate, authController.me);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    비밀번호 재설정 요청
 * @access  Public
 */
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    비밀번호 재설정
 * @access  Public
 */
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);

/**
 * @route   POST /api/auth/change-password
 * @desc    비밀번호 변경 (로그인된 사용자)
 * @access  Private
 */
router.post('/change-password', authenticate, authController.changePassword);

/**
 * @route   DELETE /api/auth/account
 * @desc    회원 탈퇴
 * @access  Private
 */
router.delete('/account', authenticate, authLimiter, authController.deleteAccount);

/**
 * @route   POST /api/auth/send-verification-code
 * @desc    회원가입 전 이메일 인증 코드 발송
 * @access  Public
 */
router.post('/send-verification-code', verificationResendLimiter, authController.sendVerificationCode);

/**
 * @route   POST /api/auth/verify-code
 * @desc    회원가입 전 이메일 인증 코드 확인
 * @access  Public
 */
router.post('/verify-code', authController.verifyCode);

/**
 * @route   POST /api/auth/verify-email
 * @desc    이메일 인증 코드 확인 (로그인된 사용자)
 * @access  Private
 */
router.post('/verify-email', authenticate, authController.verifyEmail);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    이메일 인증 코드 재발송 (로그인된 사용자)
 * @access  Private
 */
router.post('/resend-verification', authenticate, verificationResendLimiter, authController.resendVerification);

export default router;
