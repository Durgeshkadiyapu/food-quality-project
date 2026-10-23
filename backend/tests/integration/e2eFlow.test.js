import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import request from 'supertest';
import app from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/config/database.js';
import { Prediction } from '../../src/models/Prediction.js';
import { mockValidPredictionRequest, mockValidMLResponse } from '../fixtures/mockData.js';

describe('End-to-End Flow Tests (Client -> Express -> Python ML Service :8000 -> MongoDB)', () => {
  let mockPythonServer;
  let receivedMLPayload = null;

  beforeAll(async () => {
    // 1. Connect Express to test MongoDB
    const testDbUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_quality_e2e_db';
    await connectDB(testDbUri);
    await Prediction.deleteMany({});

    // 2. Start mock Python FastAPI service on port 8000
    mockPythonServer = http.createServer((req, res) => {
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', modes_available: ['proxy_real', 'synthetic_demo'] }));
        return;
      }

      if (req.method === 'GET' && req.url === '/model-info') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          modes: ['proxy_real', 'synthetic_demo', 'combined_demo'],
          supported_fruits: { proxy_real: ['Apple', 'Banana', 'Tomato'] }
        }));
        return;
      }

      if (req.method === 'POST' && req.url === '/predict') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          receivedMLPayload = JSON.parse(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(mockValidMLResponse));
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    await new Promise((resolve) => mockPythonServer.listen(8000, '127.0.0.1', resolve));
  });

  afterAll(async () => {
    if (mockPythonServer) {
      await new Promise((resolve) => mockPythonServer.close(resolve));
    }
    await Prediction.deleteMany({});
    await disconnectDB();
  });

  it('1. GET /api/v1/ml/status should confirm Python service is reachable and ready', async () => {
    const res = await request(app).get('/api/v1/ml/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reachable).toBe(true);
    expect(res.body.data.ready).toBe(true);
  });

  it('2. POST /api/v1/predictions should call Python ML service, persist to MongoDB, and return saved record', async () => {
    const res = await request(app)
      .post('/api/v1/predictions')
      .send(mockValidPredictionRequest);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.prediction_id).toBeDefined();
    expect(res.body.data.fruit_type).toBe('Apple');
    expect(res.body.data.predicted_class).toBe('Semi-Fresh');
    expect(res.body.data.created_at).toBeDefined();

    // Verify ML adapter passed only the expected 5 model fields + training_mode to Python
    expect(receivedMLPayload).toEqual({
      fruit_type: 'Apple',
      MQ3_raw: 2150,
      MQ135_raw: 1800,
      temperature_C: 28.5,
      humidity_pct: 75.0,
      training_mode: 'proxy_real'
    });

    // Verify record in MongoDB directly
    const inDb = await Prediction.findById(res.body.data.prediction_id);
    expect(inDb).not.toBeNull();
    expect(inDb.fruit_type).toBe('Apple');
    expect(inDb.predicted_class).toBe('Semi-Fresh');
  });

  it('3. GET /api/v1/predictions/:id should retrieve the persisted record', async () => {
    // Get the first record from DB
    const record = await Prediction.findOne();
    expect(record).not.toBeNull();

    const res = await request(app).get(`/api/v1/predictions/${record._id.toString()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.prediction_id).toBe(record._id.toString());
    expect(res.body.data.fruit_type).toBe('Apple');
  });

  it('4. GET /api/v1/predictions should return the record in history with pagination', async () => {
    const res = await request(app).get('/api/v1/predictions?limit=10&page=1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it('5. When ML service is stopped, POST /api/v1/predictions must return 503 and NEVER fabricate predictions or save partial records', async () => {
    // Temporarily close mock ML server
    await new Promise((resolve) => mockPythonServer.close(resolve));

    const countBefore = await Prediction.countDocuments();

    const res = await request(app)
      .post('/api/v1/predictions')
      .send(mockValidPredictionRequest);

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ML_SERVICE_UNAVAILABLE');

    // Confirm database record count has NOT increased
    const countAfter = await Prediction.countDocuments();
    expect(countAfter).toBe(countBefore);
  });
});
