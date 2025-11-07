/**
 * 인증 라우트
 */

import { Router } from 'express';
import * as authController from '../controllers/auth-controller';
import { authenticate } from '../middlewares/auth';

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
router.post('/login', authController.login);

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
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    비밀번호 재설정
 * @access  Public
 */
router.post('/reset-password', authController.resetPassword);

export default router;
