import { AppError } from '../utils/AppError.js';

export async function generateFoodAdvice(input = {}) {
  if (!process.env.GROQ_API_KEY) {
    throw AppError.mlServiceUnavailable('AI Advisor is not configured. Set GROQ_API_KEY in the backend environment.');
  }
  return { message: 'Advisor integration is being configured.', input };
}
