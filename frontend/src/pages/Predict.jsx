import React, { useState } from 'react';
import { Sliders, FileSpreadsheet } from 'lucide-react';
import PredictionForm from '../components/prediction/PredictionForm';
import SpreadsheetPredictionForm from '../components/prediction/SpreadsheetPredictionForm';
import PredictionResult from '../components/prediction/PredictionResult';

export default function Predict() {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'spreadsheet'
  const [currentResult, setCurrentResult] = useState(null);

  const handlePredictionSuccess = (data) => {
    setCurrentResult(data);
    // Smoothly scroll to the results view
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setCurrentResult(null);
  };

  return (
    <div className="container">
      <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Food Quality Prediction</h1>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', margin: 0 }}>
          Evaluate food freshness classification using calibrated sensor telemetry or multi-reading chamber spreadsheets.
        </p>
      </div>

      {currentResult ? (
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <PredictionResult result={currentResult} onReset={handleReset} />
        </div>
      ) : (
        <>
          {/* Segmented Option Selector */}
          <div className="tabs-header" role="tablist" aria-label="Prediction Input Method">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'manual'}
              className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              <Sliders size={16} />
              <span>Manual Sensor Input</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'spreadsheet'}
              className={`tab-btn ${activeTab === 'spreadsheet' ? 'active' : ''}`}
              onClick={() => setActiveTab('spreadsheet')}
            >
              <FileSpreadsheet size={16} />
              <span>Chamber Spreadsheet (.xlsx / .csv)</span>
            </button>
          </div>

          {activeTab === 'manual' ? (
            <PredictionForm onPredictionSuccess={handlePredictionSuccess} />
          ) : (
            <SpreadsheetPredictionForm onPredictionSuccess={handlePredictionSuccess} />
          )}
        </>
      )}
    </div>
  );
}
