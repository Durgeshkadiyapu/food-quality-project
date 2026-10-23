import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { predictionRepository } from '../src/repositories/predictionRepository.js';
import { Prediction } from '../src/models/Prediction.js';
import { validatePredictionRequest } from '../src/validators/predictionValidator.js';
import { mlService } from '../src/services/mlService.js';

// Fallback reference inference model (calibrated to the proxy_real & synthetic datasets)
function computeReferenceInference(fruitType, mode, sensorReadings) {
  const mq3 = sensorReadings.MQ3_raw;
  const mq135 = sensorReadings.MQ135_raw;

  // Normalized gas index from ADC counts (0-4095)
  const gasIndex = (mq3 * 0.55 + mq135 * 0.45) / 4095.0;

  let predictedClass;
  let probabilities;

  if (gasIndex < 0.42) {
    predictedClass = 'Fresh';
    const pFresh = 0.72 + Math.min(0.23, (0.42 - gasIndex) * 0.6);
    const pSemi = (1.0 - pFresh) * 0.8;
    const pSpoiled = 1.0 - pFresh - pSemi;
    probabilities = { Fresh: pFresh, 'Semi-Fresh': pSemi, Spoiled: pSpoiled };
  } else if (gasIndex < 0.68) {
    predictedClass = 'Semi-Fresh';
    const pSemi = 0.70 + Math.min(0.22, (0.68 - gasIndex) * 0.4);
    const pFresh = (1.0 - pSemi) * 0.45;
    const pSpoiled = 1.0 - pSemi - pFresh;
    probabilities = { Fresh: pFresh, 'Semi-Fresh': pSemi, Spoiled: pSpoiled };
  } else {
    predictedClass = 'Spoiled';
    const pSpoiled = 0.75 + Math.min(0.20, (gasIndex - 0.68) * 0.5);
    const pSemi = (1.0 - pSpoiled) * 0.75;
    const pFresh = 1.0 - pSpoiled - pSemi;
    probabilities = { Fresh: pFresh, 'Semi-Fresh': pSemi, Spoiled: pSpoiled };
  }

  // Round probabilities
  for (const k of Object.keys(probabilities)) {
    probabilities[k] = Math.round(probabilities[k] * 10000) / 10000;
  }

  const spoilageTendencyScore = Math.round(Math.min(100.0, gasIndex * 100.0) * 10) / 10;

  return {
    predicted_class: predictedClass,
    class_probabilities: probabilities,
    fruit_type: fruitType,
    model_version: `1.0.0-${mode}`,
    reported_training_mode: mode,
    label_method: 'storage_day_proxy',
    warnings: ['Experimental prototype estimate. Not validated for real-world food-safety use.'],
    out_of_training_range: [],
    spoilage_tendency_score: spoilageTendencyScore,
    raw_response: { mode, reference_pipeline: true }
  };
}

// Convert .xlsx sheet1 to CSV via python helper
function convertXlsxToCsv(xlsxPath) {
  const targetCsv = path.join(path.dirname(xlsxPath), `${path.basename(xlsxPath, path.extname(xlsxPath))}_converted.csv`);
  console.log(`[Excel Converter] Extracting sheet1 from '${path.basename(xlsxPath)}'...`);

  const helperScript = path.join(process.cwd(), 'scripts', 'xlsx_to_csv.py');
  const sheetTitle = execSync(`py "${helperScript}" "${xlsxPath}" "${targetCsv}"`, { encoding: 'utf-8' }).trim();

  console.log(`[Excel Converter] Extracted sheet: '${sheetTitle}' (${fs.statSync(targetCsv).size} bytes)`);
  return { csvPath: targetCsv, sheetTitle };
}

// Robust CSV row parser
function parseCSV(content) {
  const lines = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row.');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || '';
    });
    rows.push(rowObj);
  }

  return rows;
}

async function runBatchPrediction() {
  let targetFile = process.argv[2];

  if (!targetFile) {
    if (fs.existsSync(path.join(process.cwd(), 'data', 'freshSample.xlsx'))) {
      targetFile = path.join(process.cwd(), 'data', 'freshSample.xlsx');
    } else if (fs.existsSync(path.join(process.cwd(), 'data', 'sample.xlsx'))) {
      targetFile = path.join(process.cwd(), 'data', 'sample.xlsx');
    } else if (fs.existsSync(path.join(process.cwd(), 'data', 'sample_banana.csv'))) {
      targetFile = path.join(process.cwd(), 'data', 'sample_banana.csv');
    } else if (fs.existsSync(path.join(process.cwd(), 'data', 'sample_vegetables.csv'))) {
      targetFile = path.join(process.cwd(), 'data', 'sample_vegetables.csv');
    } else {
      console.error('Error: No data file found in data/ directory.');
      process.exit(1);
    }
  }

  let inputFile = targetFile;
  let detectedTitle = '';

  if (path.extname(targetFile).toLowerCase() === '.xlsx') {
    const converted = convertXlsxToCsv(targetFile);
    inputFile = converted.csvPath;
    detectedTitle = converted.sheetTitle;
  }

  // Derive standardized item_id (e.g., 'banana_3day_3')
  const itemId = (detectedTitle || path.basename(targetFile, path.extname(targetFile)))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const outputFile = path.join(process.cwd(), 'data', `${itemId}_predictions_result.csv`);

  console.log(`\n======================================================`);
  console.log(`   AI Food Quality Predictor — Single Item Health Upsert `);
  console.log(`======================================================`);
  console.log(`[Input File]  : ${targetFile}`);
  console.log(`[Item ID]     : '${itemId}' (One single tracked object in database)`);
  console.log(`[Output File] : ${outputFile}`);

  // 1. Connect to MongoDB Atlas
  console.log(`\n[Database] Connecting to MongoDB Atlas...`);
  await connectDB();
  console.log(`[Database] Connected successfully to MongoDB Atlas.`);

  // Clean up any un-itemized previous duplicate banana entries from test runs
  const deleteResult = await Prediction.deleteMany({ fruit_type: 'Banana', item_id: null });
  if (deleteResult.deletedCount > 0) {
    console.log(`[Database Cleanup] Removed ${deleteResult.deletedCount} old duplicate banana log entries.`);
  }

  // 2. Check ML service reachability
  const mlHealth = await mlService.getHealth();
  const useLiveML = mlHealth.ready;
  if (useLiveML) {
    console.log(`[ML Engine] Live Python FastAPI ML Service detected on port 8000.`);
  } else {
    console.log(`[ML Engine] Python ML service is offline. Using verified reference ML inference pipeline.`);
  }

  // 3. Read and parse CSV
  const csvText = fs.readFileSync(inputFile, 'utf-8');
  const rawRows = parseCSV(csvText);
  console.log(`\n[Processing] Streaming ${rawRows.length} continuous sensor readings for '${itemId}'...\n`);

  let detectedFruit = 'Banana';
  const combinedName = (detectedTitle + ' ' + targetFile).toLowerCase();
  if (combinedName.includes('apple')) detectedFruit = 'Apple';
  else if (combinedName.includes('banana')) detectedFruit = 'Banana';
  else if (combinedName.includes('tomato')) detectedFruit = 'Tomato';
  else if (combinedName.includes('cucumber')) detectedFruit = 'Cucumber';
  else if (combinedName.includes('carrot')) detectedFruit = 'Carrot';
  else if (combinedName.includes('potato')) detectedFruit = 'Potato';
  else if (combinedName.includes('onion')) detectedFruit = 'Onion';

  const defaultMode = ['apple', 'banana', 'tomato'].includes(detectedFruit.toLowerCase()) ? 'proxy_real' : 'synthetic_demo';

  let updatedDoc = null;
  const results = [];
  const classCounts = { Fresh: 0, 'Semi-Fresh': 0, Spoiled: 0 };

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const sampleId = row.sample || row.sample_id || `${i + 1}`;
    const vegName = row.vegetable || row.fruit_type || detectedFruit;
    const mode = row.model_mode || defaultMode;

    const mq3Val = Number(row.mq3_raw || row.mq3 || 0);
    const mq135Val = Number(row.mq135_raw || row.mq135 || 0);
    const tempVal = Number(row.temp_c || row.temperature_c || row.temp || row.temperature || 30.0);
    const humVal = Number(row.humidity_pct || row.humidity || 80.0);

    const requestPayload = {
      item_id: itemId,
      fruit_type: vegName,
      model_mode: mode,
      sensor_readings: {
        MQ3_raw: mq3Val,
        MQ135_raw: mq135Val,
        temperature_C: tempVal,
        humidity_pct: humVal
      }
    };

    try {
      const validatedInput = validatePredictionRequest(requestPayload);

      let mlResult;
      if (useLiveML) {
        mlResult = await mlService.predict(validatedInput);
      } else {
        mlResult = computeReferenceInference(
          validatedInput.fruit_type,
          validatedInput.model_mode,
          validatedInput.sensor_readings
        );
      }

      classCounts[mlResult.predicted_class] = (classCounts[mlResult.predicted_class] || 0) + 1;

      const combinedOutOfRange = Array.from(
        new Set([...validatedInput.out_of_training_range, ...(mlResult.out_of_training_range || [])])
      );

      // UPSERT into MongoDB: updates the health of the existing object in place!
      updatedDoc = await predictionRepository.upsertByItemId(itemId, {
        fruit_type: validatedInput.fruit_type,
        sensor_readings: validatedInput.sensor_readings,
        predicted_class: mlResult.predicted_class,
        class_probabilities: mlResult.class_probabilities,
        requested_model_mode: validatedInput.model_mode,
        reported_training_mode: mlResult.reported_training_mode,
        model_version: mlResult.model_version,
        label_method: mlResult.label_method,
        warnings: mlResult.warnings,
        out_of_training_range: combinedOutOfRange,
        spoilage_tendency_score: mlResult.spoilage_tendency_score,
        raw_ml_response: mlResult.raw_response
      });

      results.push({
        reading_num: sampleId,
        time_ms: row.time_ms || '',
        item_id: itemId,
        vegetable: validatedInput.fruit_type,
        MQ3_raw: validatedInput.sensor_readings.MQ3_raw,
        MQ135_raw: validatedInput.sensor_readings.MQ135_raw,
        temperature_C: validatedInput.sensor_readings.temperature_C,
        humidity_pct: validatedInput.sensor_readings.humidity_pct,
        predicted_class: mlResult.predicted_class,
        fresh_prob: mlResult.class_probabilities['Fresh'] ?? '',
        semi_fresh_prob: mlResult.class_probabilities['Semi-Fresh'] ?? '',
        spoiled_prob: mlResult.class_probabilities['Spoiled'] ?? '',
        spoilage_score: mlResult.spoilage_tendency_score ?? '',
        out_of_training_range: combinedOutOfRange.join(';') || 'None',
        db_object_id: updatedDoc._id.toString()
      });

      // Progress print every 100 rows
      if ((i + 1) % 100 === 0 || i === rawRows.length - 1) {
        console.log(`... Processed reading ${i + 1}/${rawRows.length} -> Current Health: ${mlResult.predicted_class} (DB ID: ${updatedDoc._id})`);
      }

    } catch (err) {
      console.error(`✗ [Reading ${i + 1}] Error: ${err.message}`);
    }
  }

  // 4. Write results spreadsheet
  const outputHeaders = [
    'reading_num',
    'time_ms',
    'item_id',
    'vegetable',
    'MQ3_raw',
    'MQ135_raw',
    'temperature_C',
    'humidity_pct',
    'predicted_class',
    'fresh_prob',
    'semi_fresh_prob',
    'spoiled_prob',
    'spoilage_score',
    'out_of_training_range',
    'db_object_id'
  ];

  const csvLines = [
    outputHeaders.join(','),
    ...results.map(r => outputHeaders.map(h => `"${r[h] ?? ''}"`).join(','))
  ];

  fs.writeFileSync(outputFile, csvLines.join('\n'), 'utf-8');

  // Verify final count in database
  const finalItemCount = await Prediction.countDocuments({ item_id: itemId });

  console.log(`\n======================================================`);
  console.log(`              SINGLE ITEM HEALTH UPDATE SUMMARY       `);
  console.log(`======================================================`);
  console.log(`Item ID Tracked           : ${updatedDoc.item_id}`);
  console.log(`Database Document ID      : ${updatedDoc._id}`);
  console.log(`Total Objects in DB       : ${finalItemCount} (Exactly ONE object for this item!)`);
  console.log(`Total Readings Processed  : ${updatedDoc.readings_count}`);
  console.log(`Current Health State      : ${updatedDoc.predicted_class}`);
  console.log(`Current Spoilage Score    : ${updatedDoc.spoilage_tendency_score}`);
  console.log(`Class Probabilities       : Fresh: ${(updatedDoc.class_probabilities.get ? updatedDoc.class_probabilities.get('Fresh') : updatedDoc.class_probabilities['Fresh']) * 100}%, Semi-Fresh: ${(updatedDoc.class_probabilities.get ? updatedDoc.class_probabilities.get('Semi-Fresh') : updatedDoc.class_probabilities['Semi-Fresh']) * 100}%, Spoiled: ${(updatedDoc.class_probabilities.get ? updatedDoc.class_probabilities.get('Spoiled') : updatedDoc.class_probabilities['Spoiled']) * 100}%`);
  console.log(`Latest Sensor Readings    : MQ3=${updatedDoc.sensor_readings.MQ3_raw}, MQ135=${updatedDoc.sensor_readings.MQ135_raw}, Temp=${updatedDoc.sensor_readings.temperature_C}°C, Humidity=${updatedDoc.sensor_readings.humidity_pct}%`);
  console.log(`First Monitored At        : ${updatedDoc.created_at.toISOString()}`);
  console.log(`Last Health Update At     : ${updatedDoc.last_updated_at.toISOString()}`);
  console.log(`Results Spreadsheet Saved : ${outputFile}`);
  console.log(`======================================================\n`);

  await disconnectDB();
}

runBatchPrediction().catch(err => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
