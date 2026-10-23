import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { AppError } from './AppError.js';

export function parseSpreadsheetFile(filePath, originalFilename = '') {
  const ext = (path.extname(originalFilename || filePath) || '').toLowerCase();
  let csvPath = filePath;
  let sheetTitle = '';

  if (ext === '.xlsx' || ext === '.xlsc' || ext === '.xls') {
    csvPath = path.join(path.dirname(filePath), `${path.basename(filePath, ext)}_temp_${Date.now()}.csv`);
    const helperScript = path.join(process.cwd(), 'scripts', 'xlsx_to_csv.py');
    try {
      sheetTitle = execSync(`py "${helperScript}" "${filePath}" "${csvPath}"`, { encoding: 'utf-8' }).trim();
    } catch (err) {
      throw AppError.badRequest(`Failed to parse Excel file (${ext}): ${err.message}`);
    }
  } else if (ext !== '.csv') {
    throw AppError.badRequest(`Unsupported file format '${ext}'. Please upload an .xlsx, .xlsc, or .csv file.`);
  }

  if (!fs.existsSync(csvPath)) {
    throw AppError.badRequest('Could not read uploaded spreadsheet data.');
  }

  const content = fs.readFileSync(csvPath, 'utf-8');

  // If a temporary converted CSV was created from .xlsx, clean it up
  if (csvPath !== filePath && fs.existsSync(csvPath)) {
    try { fs.unlinkSync(csvPath); } catch {}
  }

  const lines = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length < 2) {
    throw AppError.badRequest('Spreadsheet must contain at least a header row and one sensor reading row.');
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

  return { rows, sheetTitle };
}
