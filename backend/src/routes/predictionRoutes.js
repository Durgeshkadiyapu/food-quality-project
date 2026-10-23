import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import os from 'os';
import {
  createPrediction,
  getPredictions,
  getPredictionById,
  uploadSpreadsheet
} from '../controllers/predictionController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { ERROR_CODES, HTTP_STATUS } from '../constants/errorCodes.js';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max
});

// Rate limiter for expensive inference requests
const predictionLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMaxPredictions,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: {
        code: ERROR_CODES.TOO_MANY_REQUESTS,
        message: 'Too many prediction requests created from this IP, please try again shortly.',
        details: []
      }
    });
  }
});

router.post('/', predictionLimiter, asyncHandler(createPrediction));
router.post('/upload', upload.single('file'), asyncHandler(uploadSpreadsheet));
router.get('/', asyncHandler(getPredictions));
router.get('/:id', asyncHandler(getPredictionById));

export default router;

