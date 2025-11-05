import { Router } from 'express';
import authRoutes from './auth-routes';
import userRoutes from './user-routes';
import matchRoutes from './match-routes';
import agoraRoutes from './agora-routes';
import friendsRoutes from './friends-routes';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    message: 'Beyond Meet API v1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      match: '/api/match',
      agora: '/api/agora',
      friends: '/api/friends',
    },
  });
});

// 라우트 연결
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/match', matchRoutes);
router.use('/agora', agoraRoutes);
router.use('/friends', friendsRoutes);

export default router;
