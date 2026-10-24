import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getRecommendations } from '../controllers/advisorController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';

const router = Router();
router.post('/recommendations', rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest
}), asyncHandler(getRecommendations));

export default router;
