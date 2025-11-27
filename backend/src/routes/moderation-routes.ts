import express from 'express';
import * as moderationController from '../controllers/moderation-controller';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

router.post('/analyze', authenticate, moderationController.analyzeFrame);

export default router;
