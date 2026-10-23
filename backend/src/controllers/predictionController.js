import { predictionService } from '../services/predictionService.js';
import { parsePaginationParams } from '../utils/pagination.js';
import { HTTP_STATUS } from '../constants/errorCodes.js';

export async function createPrediction(req, res) {
  const savedRecord = await predictionService.createPrediction(req.body);

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: savedRecord
  });
}

export async function getPredictions(req, res) {
  const pagination = parsePaginationParams(req.query);

  const filters = {
    fruit_type: req.query.fruit_type,
    predicted_class: req.query.predicted_class,
    model_mode: req.query.model_mode,
    start_date: req.query.start_date,
    end_date: req.query.end_date
  };

  const { records, pagination: paginationMeta } = await predictionService.getPredictions(filters, pagination);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: records,
    pagination: paginationMeta
  });
}

export async function getPredictionById(req, res) {
  const { id } = req.params;
  const record = await predictionService.getPredictionById(id);

  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: record
  });
}

export async function uploadSpreadsheet(req, res) {
  const { AppError } = await import('../utils/AppError.js');
  const fs = await import('fs');

  if (!req.file) {
    throw AppError.badRequest('No file uploaded. Please upload an .xlsx or .csv file with field name "file".');
  }

  try {
    const updatedRecord = await predictionService.processBatchSpreadsheet(
      req.file.path,
      req.file.originalname,
      req.body
    );

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Successfully processed chamber readings from '${req.file.originalname}'.`,
      data: updatedRecord
    });
  } finally {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
  }
}
