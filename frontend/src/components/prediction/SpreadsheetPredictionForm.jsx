import React, { useState } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  FileCheck,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import ErrorBanner from '../common/ErrorBanner';
import { uploadSpreadsheet } from '../../services/api';
import { useCapabilities } from '../../hooks/useCapabilities';

export default function SpreadsheetPredictionForm({ onPredictionSuccess }) {
  const { capabilities } = useCapabilities();

  const [file, setFile] = useState(null);
  const [fruitType, setFruitType] = useState('');
  const [modelMode, setModelMode] = useState('proxy_real');
  const [itemId, setItemId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const supportedModes = capabilities?.supported_modes || ['proxy_real', 'synthetic_demo', 'combined_demo'];
  const modeFoodMap = capabilities?.mode_food_support || {
    proxy_real: ['Apple', 'Banana', 'Tomato'],
    synthetic_demo: ['Apple', 'Banana', 'Tomato', 'Orange', 'Mango', 'Cucumber', 'Carrot'],
    combined_demo: ['Apple', 'Banana', 'Tomato', 'Orange', 'Mango', 'Cucumber', 'Carrot']
  };

  const availableFoods = modeFoodMap[modelMode] || ['Apple', 'Banana', 'Tomato'];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = selected.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        setError(`Unsupported file format '.${ext}'. Please select an .xlsx or .csv file.`);
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      const ext = dropped.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        setError(`Unsupported file format '.${ext}'. Please select an .xlsx or .csv file.`);
        return;
      }
      setFile(dropped);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'sample,time_ms,MQ3_raw,MQ135_raw,temp_C,humidity_pct\n' +
      '1,1000,2124,2303,30.8,88.85\n' +
      '2,2000,2140,2320,30.7,89.10\n' +
      '3,3000,2155,2345,30.9,88.90\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'food_quality_chamber_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setFile(null);
    setFruitType('');
    setModelMode('proxy_real');
    setItemId('');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please upload an .xlsx or .csv file containing sensor values.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (fruitType.trim()) formData.append('fruit_type', fruitType.trim());
    if (modelMode.trim()) formData.append('model_mode', modelMode.trim());
    if (itemId.trim()) formData.append('item_id', itemId.trim());

    try {
      const response = await uploadSpreadsheet(formData);
      if (response.success && response.data) {
        if (onPredictionSuccess) {
          onPredictionSuccess(response.data);
        }
      } else {
        throw new Error(response.message || 'Spreadsheet processing failed.');
      }
    } catch (err) {
      setError(err.message || 'Failed to upload and analyze chamber spreadsheet.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 'var(--max-width-form)', margin: '0 auto' }}>
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <FileSpreadsheet size={20} style={{ color: 'var(--color-primary)' }} />
            Chamber Batch Spreadsheet Analysis
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: 0 }}>
            Upload an Excel (.xlsx) or CSV spreadsheet containing chamber sensor logs for a food item.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="btn btn-outline btn-sm"
          title="Download a pre-formatted CSV template"
        >
          <Download size={14} />
          Template (.csv)
        </button>
      </div>

      <div className="card-body">
        {error && (
          <ErrorBanner
            type="danger"
            title="Spreadsheet Analysis Failed"
            message={error}
          />
        )}

        <form onSubmit={handleSubmit}>
          {/* Metadata Fields: Item ID, Food Type, Model Mode */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {/* Item ID */}
            <div className="form-group" style={{ margin: 0 }}>
              <div className="form-label">
                <label htmlFor="spreadsheet_item_id">Chamber Item ID</label>
                <span className="form-hint">Optional</span>
              </div>
              <input
                type="text"
                id="spreadsheet_item_id"
                name="item_id"
                placeholder="Auto-detected from file if blank"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                disabled={uploading}
                style={{ padding: '0.65rem 0.85rem' }}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                Identifier for tracking repeated chamber checks
              </span>
            </div>

            {/* Produce / Food Type */}
            <div className="form-group" style={{ margin: 0 }}>
              <div className="form-label">
                <label htmlFor="spreadsheet_fruit_type">Produce / Food Type</label>
                <span className="form-hint">Optional override</span>
              </div>
              <select
                id="spreadsheet_fruit_type"
                name="fruit_type"
                value={fruitType}
                onChange={(e) => setFruitType(e.target.value)}
                className="form-select"
                disabled={uploading}
                style={{ padding: '0.65rem 0.85rem' }}
              >
                <option value="">Auto-Detect from Sheet / Filename</option>
                {availableFoods.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                Leave as auto-detect to deduce from content
              </span>
            </div>

            {/* Model Mode */}
            <div className="form-group" style={{ margin: 0 }}>
              <div className="form-label">
                <label htmlFor="spreadsheet_model_mode">Inference Mode</label>
              </div>
              <select
                id="spreadsheet_model_mode"
                name="model_mode"
                value={modelMode}
                onChange={(e) => setModelMode(e.target.value)}
                className="form-select"
                disabled={uploading}
                style={{ padding: '0.65rem 0.85rem' }}
              >
                {supportedModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode === 'proxy_real' ? 'Proxy Real (Lab)' : mode === 'synthetic_demo' ? 'Synthetic Demo' : 'Combined Demo'}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                Select underlying ML model pipeline
              </span>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '1.5rem 0' }} />

          {/* Drag and Drop Zone */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              Upload Item Values Spreadsheet (.xlsx or .csv)
            </label>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('spreadsheet-file-picker').click()}
              style={{
                border: file ? '2px solid var(--color-primary-light)' : '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: file ? 'var(--color-mint-light)' : 'var(--color-background-subtle)',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              <input
                type="file"
                id="spreadsheet-file-picker"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={uploading}
              />

              {file ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <FileCheck size={42} style={{ color: 'var(--color-primary)' }} />
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-text)' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                    {(file.size / 1024).toFixed(1)} KB • Click or drop another file to replace
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <UploadCloud size={44} style={{ color: 'var(--color-primary)', opacity: 0.85 }} />
                  <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text)' }}>
                    Drag and drop your chamber log sheet here, or click to browse
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                    Supported formats: Microsoft Excel (.xlsx), CSV (.csv)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Guidance Info Box */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-background-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              marginBottom: '1.75rem'
            }}
          >
            <Info size={18} style={{ color: 'var(--color-info)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Spreadsheet Column Format:</strong> The sheet should include rows with columns:
              <br />
              <code>MQ3_raw</code> (or <code>mq3</code>), <code>MQ135_raw</code> (or <code>mq135</code>),{' '}
              <code>temp_C</code> (or <code>temperature</code>), and <code>humidity_pct</code>.
              <br />
              <span style={{ color: 'var(--color-muted)', fontSize: '0.78rem' }}>
                All valid sensor reading rows are processed sequentially. The latest chamber health state and spoilage tendency index will be computed and saved.
              </span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-secondary"
              disabled={uploading}
            >
              <RotateCcw size={16} />
              Reset
            </button>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={!file || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="spinner" size={18} />
                  Streaming & Classifying Readings...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={18} />
                  Analyze Chamber Spreadsheet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
