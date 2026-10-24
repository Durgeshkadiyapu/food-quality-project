import { Router } from 'express';
import { getMLStatus, getMLCapabilities, explainPrediction } from '../controllers/mlController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/status', asyncHandler(getMLStatus));
router.get('/capabilities', asyncHandler(getMLCapabilities));
router.post('/explain', asyncHandler(explainPrediction));

export default router;
