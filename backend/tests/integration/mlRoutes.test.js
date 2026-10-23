import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { mlService } from '../../src/services/mlService.js';

describe('ML Routes API Integration Tests', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/v1/ml/status should return 200 when ML service is reachable', async () => {
    vi.spyOn(mlService, 'getHealth').mockResolvedValue({
      reachable: true,
      ready: true,
      status_code: 200,
      details: { status: 'healthy', modes_available: ['proxy_real', 'synthetic_demo'] }
    });

    const res = await request(app).get('/api/v1/ml/status');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reachable).toBe(true);
    expect(res.body.data.ready).toBe(true);
  });

  it('GET /api/v1/ml/status should return 503 when ML service is unreachable', async () => {
    vi.spyOn(mlService, 'getHealth').mockResolvedValue({
      reachable: false,
      ready: false,
      status_code: 503,
      error: 'Prediction service is temporarily unavailable.'
    });

    const res = await request(app).get('/api/v1/ml/status');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.reachable).toBe(false);
    expect(res.body.data.ready).toBe(false);
  });

  it('GET /api/v1/ml/capabilities should return supported modes and scientific disclaimer', async () => {
    const res = await request(app).get('/api/v1/ml/capabilities');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.supported_modes).toContain('proxy_real');
    expect(res.body.data.mode_food_support.proxy_real).toEqual(['Apple', 'Banana', 'Tomato']);
    expect(res.body.data.disclaimer).toBeDefined();
    expect(res.body.data.training_ranges).toBeDefined();
  });
});
