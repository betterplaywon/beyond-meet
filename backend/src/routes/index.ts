import { Router } from 'express';
import authRoutes from './auth-routes';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    message: 'Beyond Meet API v1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      match: '/api/match',
      calls: '/api/calls',
      agora: '/api/agora',
      friends: '/api/friends',
    },
  });
});

// 라우트 연결
router.use('/auth', authRoutes);

export default router;
