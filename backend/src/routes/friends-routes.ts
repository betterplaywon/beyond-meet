/**
 * Friends 라우트
 */

import { Router } from 'express';
import * as friendsController from '../controllers/friends-controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// 모든 라우트에 인증 필요
router.use(authenticate);

/**
 * GET /api/friends
 * 친구 목록 조회
 */
router.get('/', friendsController.getFriends);

/**
 * POST /api/friends/:friendId
 * 친구 추가
 */
router.post('/:friendId', friendsController.addFriend);

/**
 * DELETE /api/friends/:friendId
 * 친구 삭제
 */
router.delete('/:friendId', friendsController.removeFriend);

/**
 * GET /api/friends/blocked
 * 차단 목록 조회
 */
router.get('/blocked', friendsController.getBlockedUsers);

/**
 * POST /api/friends/block/:blockedUserId
 * 사용자 차단
 */
router.post('/block/:blockedUserId', friendsController.blockUser);

/**
 * DELETE /api/friends/block/:blockedUserId
 * 차단 해제
 */
router.delete('/block/:blockedUserId', friendsController.unblockUser);

export default router;
