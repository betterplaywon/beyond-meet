import { Router } from 'express';
import authRoutes from './auth-routes';
import userRoutes from './user-routes';
import agoraRoutes from './agora-routes';
import friendsRoutes from './friends-routes';
import callRoutes from './call-routes';
import pushRoutes from './push-routes';
import adminRoutes from './admin-routes';
import moderationRoutes from './moderation-routes';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    message: 'Beyond Meet API v1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      agora: '/api/agora',
      friends: '/api/friends',
      call: '/api/call',
      push: '/api/push',
      admin: '/api/admin',
      moderation: '/api/moderation',
    },
  });
});

// 라우트 연결
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/agora', agoraRoutes);
router.use('/friends', friendsRoutes);
router.use('/call', callRoutes);
router.use('/push', pushRoutes);
router.use('/admin', adminRoutes);
router.use('/moderation', moderationRoutes);

export default router;
