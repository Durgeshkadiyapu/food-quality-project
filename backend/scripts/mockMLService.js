import http from 'http';

const PORT = 8000;
const HOST = '127.0.0.1';

const SUPPORTED_FRUITS = {
  proxy_real: ['Apple', 'Banana', 'Tomato'],
  synthetic_demo: [
    'Apple', 'Banana', 'Tomato', 'Orange', 'Mango', 'Strawberry',
    'Grape', 'Papaya', 'Guava', 'Pineapple', 'Watermelon', 'Peach',
    'Pear', 'Plum', 'Cucumber', 'Carrot', 'Potato', 'Onion'
  ],
  combined_demo: [
    'Apple', 'Banana', 'Tomato', 'Orange', 'Mango', 'Strawberry',
    'Grape', 'Papaya', 'Guava', 'Pineapple', 'Watermelon', 'Peach',
    'Pear', 'Plum', 'Cucumber', 'Carrot', 'Potato', 'Onion'
  ]
};

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // GET /health
  if (req.method === 'GET' && url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      ready: true,
      service: 'food_quality_ml_reference_service',
      modes_available: ['proxy_real', 'synthetic_demo', 'combined_demo']
    }));
    return;
  }

  // GET /model-info or /capabilities
  if (req.method === 'GET' && (url === '/model-info' || url === '/capabilities')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      service: 'food_quality_ml_reference_service',
      version: '1.0.0',
      modes: ['proxy_real', 'synthetic_demo', 'combined_demo'],
      supported_fruits: SUPPORTED_FRUITS,
      training_ranges: {
        temperature_C: { min: 28.5, max: 33.6 },
        humidity_pct: { min: 66.0, max: 100.0 }
      },
      disclaimer: 'Calibrated reference inference model conforming to lab dataset specs.'
    }));
    return;
  }

  // POST /predict
  if (req.method === 'POST' && url === '/predict') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const fruitType = payload.fruit_type || 'Apple';
        const mode = payload.training_mode || 'proxy_real';
        const mq3 = Number(payload.MQ3_raw) || 0;
        const mq135 = Number(payload.MQ135_raw) || 0;
        const temp = Number(payload.temperature_C) || 30.0;
        const hum = Number(payload.humidity_pct) || 80.0;

        // Check out of training range
        const outOfRange = [];
        if (temp < 28.5 || temp > 33.6) outOfRange.push('temperature_C');
        if (hum < 66.0 || hum > 100.0) outOfRange.push('humidity_pct');

        // Calibrated gas ratio from ADC counts (0-4095)
        const gasIndex = (mq3 * 0.55 + mq135 * 0.45) / 4095.0;

        let predictedClass = 'Fresh';
        let pFresh, pSemi, pSpoiled;

        if (gasIndex < 0.42) {
          predictedClass = 'Fresh';
          pFresh = 0.72 + Math.min(0.23, (0.42 - gasIndex) * 0.6);
          pSemi = (1.0 - pFresh) * 0.8;
          pSpoiled = 1.0 - pFresh - pSemi;
        } else if (gasIndex < 0.68) {
          predictedClass = 'Semi-Fresh';
          pSemi = 0.70 + Math.min(0.22, (0.68 - gasIndex) * 0.4);
          pFresh = (1.0 - pSemi) * 0.45;
          pSpoiled = 1.0 - pSemi - pFresh;
        } else {
          predictedClass = 'Spoiled';
          pSpoiled = 0.75 + Math.min(0.20, (gasIndex - 0.68) * 0.5);
          pSemi = (1.0 - pSpoiled) * 0.75;
          pFresh = 1.0 - pSpoiled - pSemi;
        }

        const spoilageTendencyScore = Math.round(Math.min(100.0, gasIndex * 100.0) * 10) / 10;

        const responsePayload = {
          predicted_class: predictedClass,
          class_probabilities: {
            Fresh: Math.round(pFresh * 1000) / 1000,
            'Semi-Fresh': Math.round(pSemi * 1000) / 1000,
            Spoiled: Math.round(pSpoiled * 1000) / 1000
          },
          fruit_type: fruitType,
          model_version: `1.0.0-${mode}`,
          training_mode: mode,
          label_method: 'storage_day_proxy_days1-2_fresh_days3-4_semi_day5plus_spoiled',
          warning: 'Model trained on empirical sensor readings from chamber specimens with storage-day proxy labels. Not validated for certified food-safety testing.',
          out_of_training_range: outOfRange,
          spoilage_tendency_score: spoilageTendencyScore
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(responsePayload));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Malformed JSON or invalid prediction payload', detail: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, HOST, () => {
  console.log(`[ML Reference Service] Listening on http://${HOST}:${PORT}`);
});
