import { generateFoodAdvice } from '../services/advisorService.js';
import { HTTP_STATUS } from '../constants/errorCodes.js';

export async function getRecommendations(req, res) {
  const advice = await generateFoodAdvice(req.body || {});
  return res.status(HTTP_STATUS.OK).json({ success: true, data: advice });
}
