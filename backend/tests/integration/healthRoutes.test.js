import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import * as dbModule from '../../src/config/database.js';

describe('Health API Integration Tests', () => {
  it('GET /api/v1/health should return 200 when database is ready', async () => {
    vi.spyOn(dbModule, 'isDBConnected').mockReturnValue(true);
    vi.spyOn(dbModule, 'getDBStatus').mockReturnValue({ ready: true, status: 'connected', database: 'food_quality_db' });

    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.dependencies.database.ready).toBe(true);
    expect(res.body.data.dependencies.database.type).toBe('MongoDB');
  });

  it('GET /api/v1/health should return 503 when database is not connected', async () => {
    vi.spyOn(dbModule, 'isDBConnected').mockReturnValue(false);
    vi.spyOn(dbModule, 'getDBStatus').mockReturnValue({ ready: false, status: 'disconnected', database: null });

    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.dependencies.database.ready).toBe(false);
  });
});
