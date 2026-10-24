import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import mlRoutes from './mlRoutes.js';
import predictionRoutes from './predictionRoutes.js';
import advisorRoutes from './advisorRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/ml', mlRoutes);
router.use('/predictions', predictionRoutes);
router.use('/advisor', advisorRoutes);

export default router;
