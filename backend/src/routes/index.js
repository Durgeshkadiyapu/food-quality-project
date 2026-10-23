import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import mlRoutes from './mlRoutes.js';
import predictionRoutes from './predictionRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/ml', mlRoutes);
router.use('/predictions', predictionRoutes);

export default router;
