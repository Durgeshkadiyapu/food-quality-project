import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import { uploadSpreadsheet } from '../../services/api';
import ErrorBanner from '../common/ErrorBanner';

export default function SpreadsheetUploader({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [fruitType, setFruitType] = useState('');
  const [itemId, setItemId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccessMessage(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a .xlsx or .csv file to upload.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    if (fruitType.trim()) formData.append('fruit_type', fruitType.trim());
    if (itemId.trim()) formData.append('item_id', itemId.trim());

    try {
      const res = await uploadSpreadsheet(formData);
      if (res.success) {
        setSuccessMessage(res.message || 'Chamber log spreadsheet processed successfully!');
        setFile(null);
        if (onUploadSuccess) {
          onUploadSuccess(res.data);
        }
      } else {
        throw new Error(res.message || 'Upload processing failed.');
      }
    } catch (err) {
      setError(err.message || 'Failed to upload and parse chamber spreadsheet.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">
            <FileSpreadsheet size={18} style={{ color: 'var(--color-primary)' }} />
            Chamber Batch Spreadsheet Ingestion
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', margin: 0 }}>
            Upload Arduino chamber log files (.xlsx or .csv) to stream continuous readings into the ML model.
          </p>
        </div>
      </div>

      <div className="card-body">
        {error && (
          <ErrorBanner
            type="danger"
            title="Upload Failed"
            message={error}
          />
        )}

        {successMessage && (
          <div className="banner banner-success" style={{ marginBottom: '1.25rem' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.88rem' }}>{successMessage}</div>
          </div>
        )}

        <form onSubmit={handleUpload}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="upload_item_id" className="form-label">
                <span>Chamber Item ID (Optional)</span>
              </label>
              <input
                type="text"
                id="upload_item_id"
                placeholder="e.g. chamber_tray_1"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                disabled={uploading}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="upload_fruit_type" className="form-label">
                <span>Produce Type (Optional)</span>
              </label>
              <input
                type="text"
                id="upload_fruit_type"
                placeholder="Auto-detected if empty"
                value={fruitType}
                onChange={(e) => setFruitType(e.target.value)}
                disabled={uploading}
              />
            </div>
          </div>

          <div
            style={{
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--color-background-subtle)',
              marginBottom: '1.25rem',
              cursor: 'pointer'
            }}
            onClick={() => document.getElementById('chamber-file-input').click()}
          >
            <input
              type="file"
              id="chamber-file-input"
              accept=".xlsx,.csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={uploading}
            />
            <UploadCloud size={32} style={{ color: 'var(--color-primary)', margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--color-text)' }}>
              {file ? file.name : 'Click to select .xlsx or .csv log file'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
              {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports multi-row chamber sensor time-series'}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={!file || uploading}
            style={{ width: '100%' }}
          >
            {uploading ? (
              <>
                <Loader2 className="spinner" size={14} />
                Processing Ingestion Stream...
              </>
            ) : (
              <>
                <UploadCloud size={14} />
                Upload & Process Spreadsheet
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
