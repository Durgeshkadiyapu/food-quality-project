import mongoose from 'mongoose';
import { PREDICTED_CLASSES } from '../constants/errorCodes.js';

const sensorReadingsSchema = new mongoose.Schema(
  {
    MQ3_raw: {
      type: Number,
      required: true
    },
    MQ135_raw: {
      type: Number,
      required: true
    },
    temperature_C: {
      type: Number,
      required: true
    },
    humidity_pct: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const predictionSchema = new mongoose.Schema(
  {
    item_id: {
      type: String,
      trim: true,
      index: true,
      default: null
    },
    fruit_type: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    sensor_readings: {
      type: sensorReadingsSchema,
      required: true
    },
    predicted_class: {
      type: String,
      required: true,
      enum: PREDICTED_CLASSES,
      index: true
    },
    class_probabilities: {
      type: Map,
      of: Number,
      required: true
    },
    requested_model_mode: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    reported_training_mode: {
      type: String,
      required: true,
      trim: true
    },
    model_version: {
      type: String,
      required: true,
      trim: true
    },
    label_method: {
      type: String,
      default: null,
      trim: true
    },
    warnings: {
      type: [String],
      default: []
    },
    out_of_training_range: {
      type: [String],
      default: []
    },
    spoilage_tendency_score: {
      type: Number,
      default: null
    },
    readings_count: {
      type: Number,
      default: 1
    },
    batch_summary: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    raw_ml_response: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true
    },
    last_updated_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// Compound indexes for fast history filtering and sorting
predictionSchema.index({ created_at: -1 });
predictionSchema.index({ fruit_type: 1, created_at: -1 });
predictionSchema.index({ predicted_class: 1, created_at: -1 });
predictionSchema.index({ requested_model_mode: 1, created_at: -1 });

// Transform for public JSON responses
predictionSchema.methods.toJSON = function () {
  const obj = this.toObject ? this.toObject() : { ...this };
  const predictionId = obj._id ? obj._id.toString() : obj.id;
  delete obj._id;
  delete obj.__v;
  delete obj.raw_ml_response;

  // Convert Map to plain object if needed
  if (obj.class_probabilities instanceof Map) {
    obj.class_probabilities = Object.fromEntries(obj.class_probabilities);
  } else if (obj.class_probabilities && typeof obj.class_probabilities.toJSON === 'function') {
    obj.class_probabilities = obj.class_probabilities.toJSON();
  }

  return {
    prediction_id: predictionId,
    ...obj
  };
};

export const Prediction = mongoose.model('Prediction', predictionSchema);
