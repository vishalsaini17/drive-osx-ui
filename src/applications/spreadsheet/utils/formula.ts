import { CellData, Sheet } from '../types';

export function colIndexToLetter(colIndex: number): string {
  let temp = 0;
  let letter = '';
  let col = colIndex + 1;
  while (col > 0) {
    temp = (col - 1) % 26;
    letter = String.fromCharCode(65 + temp) + letter;
    col = Math.floor((col - temp) / 26);
  }
  return letter;
}

export function letterToColIndex(letter: string): number {
  const upper = letter.toUpperCase();
  let col = 0;
  for (let i = 0; i < upper.length; i++) {
    col = col * 26 + (upper.charCodeAt(i) - 64);
  }
  return col - 1;
}

export function cellKeyToCoords(key: string): { col: number; row: number } | null {
  const match = key.trim().match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return null;
  const colLetter = match[1];
  const rowNum = parseInt(match[2], 10);
  return {
    col: letterToColIndex(colLetter),
    row: rowNum - 1,
  };
}

export function coordsToCellKey(col: number, row: number): string {
  return `${colIndexToLetter(col)}${row + 1}`;
}

export function getRangeCellKeys(rangeStr: string): string[] {
  const parts = rangeStr.split(':').map((s) => s.trim());
  if (parts.length === 1) {
    return [parts[0].toUpperCase()];
  }
  if (parts.length === 2) {
    const startCoords = cellKeyToCoords(parts[0]);
    const endCoords = cellKeyToCoords(parts[1]);
    if (!startCoords || !endCoords) return [];

    const minCol = Math.min(startCoords.col, endCoords.col);
    const maxCol = Math.max(startCoords.col, endCoords.col);
    const minRow = Math.min(startCoords.row, endCoords.row);
    const maxRow = Math.max(startCoords.row, endCoords.row);

    const keys: string[] = [];
    for (let c = minCol; c <= maxCol; c++) {
      for (let r = minRow; r <= maxRow; r++) {
        keys.push(coordsToCellKey(c, r));
      }
    }
    return keys;
  }
  return [];
}

// Helper to extract numeric values from range/cells
function getValuesFromRange(
  argsStr: string,
  data: Record<string, CellData>,
  visited: Set<string>
): number[] {
  const values: number[] = [];
  const args = argsStr.split(',').map((a) => a.trim());

  for (const arg of args) {
    if (arg.includes(':')) {
      const keys = getRangeCellKeys(arg);
      for (const k of keys) {
        const val = getCellValue(k, data, visited);
        const num = parseFloat(val);
        if (!isNaN(num)) values.push(num);
      }
    } else if (/^[A-Za-z]+\d+$/.test(arg)) {
      const val = getCellValue(arg.toUpperCase(), data, visited);
      const num = parseFloat(val);
      if (!isNaN(num)) values.push(num);
    } else {
      const num = parseFloat(arg);
      if (!isNaN(num)) values.push(num);
    }
  }
  return values;
}

// Get raw/evaluated string value of cell with circular protection
function getCellValue(
  key: string,
  data: Record<string, CellData>,
  visited: Set<string>
): string {
  if (visited.has(key)) return '#CIRCULAR!';
  visited.add(key);

  const cell = data[key];
  if (!cell || cell.value === undefined || cell.value === null) return '';

  let raw = cell.value.trim();
  if (raw.startsWith('=')) {
    return evaluateFormula(raw, data, visited);
  }
  return raw;
}

export function evaluateFormula(
  formula: string,
  data: Record<string, CellData>,
  visitedSet?: Set<string>
): string {
  if (!formula.startsWith('=')) return formula;

  const visited = visitedSet ? new Set(visitedSet) : new Set<string>();
  const expr = formula.substring(1).trim();

  try {
    const upperExpr = expr.toUpperCase();

    // 1. SUM
    if (upperExpr.startsWith('SUM(') && upperExpr.endsWith(')')) {
      const inner = expr.substring(4, expr.length - 1);
      const nums = getValuesFromRange(inner, data, visited);
      const sum = nums.reduce((a, b) => a + b, 0);
      return String(Number(sum.toFixed(4)));
    }

    // 2. AVERAGE
    if (upperExpr.startsWith('AVERAGE(') && upperExpr.endsWith(')')) {
      const inner = expr.substring(8, expr.length - 1);
      const nums = getValuesFromRange(inner, data, visited);
      if (nums.length === 0) return '0';
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      return String(Number(avg.toFixed(4)));
    }

    // 3. COUNT
    if (upperExpr.startsWith('COUNT(') && upperExpr.endsWith(')')) {
      const inner = expr.substring(6, expr.length - 1);
      const nums = getValuesFromRange(inner, data, visited);
      return String(nums.length);
    }

    // 4. MAX
    if (upperExpr.startsWith('MAX(') && upperExpr.endsWith(')')) {
      const inner = expr.substring(4, expr.length - 1);
      const nums = getValuesFromRange(inner, data, visited);
      if (nums.length === 0) return '0';
      return String(Math.max(...nums));
    }

    // 5. MIN
    if (upperExpr.startsWith('MIN(') && upperExpr.endsWith(')')) {
      const inner = expr.substring(4, expr.length - 1);
      const nums = getValuesFromRange(inner, data, visited);
      if (nums.length === 0) return '0';
      return String(Math.min(...nums));
    }

    // 6. IF
    if (upperExpr.startsWith('IF(') && upperExpr.endsWith(')')) {
      const inner = expr.substring(3, expr.length - 1);
      const args = splitTopLevelCommas(inner);
      if (args.length >= 2) {
        const condStr = evaluateExpressionString(args[0], data, visited);
        const condBool = parseBooleanCondition(condStr);
        const trueVal = args[1] ? evaluateExpressionString(args[1], data, visited) : 'TRUE';
        const falseVal = args[2] ? evaluateExpressionString(args[2], data, visited) : 'FALSE';
        return condBool ? cleanQuotes(trueVal) : cleanQuotes(falseVal);
      }
    }

    // 7. VLOOKUP
    if (upperExpr.startsWith('VLOOKUP(') && upperExpr.endsWith(')')) {
      const inner = expr.substring(8, expr.length - 1);
      const args = splitTopLevelCommas(inner);
      if (args.length >= 3) {
        const lookupVal = cleanQuotes(evaluateExpressionString(args[0], data, visited)).toLowerCase();
        const tableRange = args[1].trim();
        const colIdx = parseInt(evaluateExpressionString(args[2], data, visited), 10) - 1; // 1-indexed

        const rangeKeys = getRangeCellKeys(tableRange);
        if (rangeKeys.length === 0) return '#N/A';

        const startCoords = cellKeyToCoords(tableRange.split(':')[0]);
        const endCoords = cellKeyToCoords(tableRange.split(':')[1] || tableRange.split(':')[0]);
        if (!startCoords || !endCoords) return '#N/A';

        const minCol = Math.min(startCoords.col, endCoords.col);
        const minRow = Math.min(startCoords.row, endCoords.row);
        const maxRow = Math.max(startCoords.row, endCoords.row);

        const targetCol = minCol + colIdx;

        for (let r = minRow; r <= maxRow; r++) {
          const firstColKey = coordsToCellKey(minCol, r);
          const valInFirstCol = getCellValue(firstColKey, data, visited).toLowerCase();

          if (valInFirstCol === lookupVal || valInFirstCol.includes(lookupVal)) {
            const resultKey = coordsToCellKey(targetCol, r);
            return getCellValue(resultKey, data, visited);
          }
        }
        return '#N/A';
      }
    }

    // 8. General Arithmetic / Expression Evaluator
    return evaluateExpressionString(expr, data, visited);
  } catch (err) {
    return '#ERROR!';
  }
}

function cleanQuotes(str: string): string {
  const s = str.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function splitTopLevelCommas(str: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;

    if (char === ',' && depth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current) result.push(current.trim());
  return result;
}

function parseBooleanCondition(cond: string): boolean {
  if (cond.includes('>=')) {
    const parts = cond.split('>=');
    return parseFloat(parts[0]) >= parseFloat(parts[1]);
  }
  if (cond.includes('<=')) {
    const parts = cond.split('<=');
    return parseFloat(parts[0]) <= parseFloat(parts[1]);
  }
  if (cond.includes('<>')) {
    const parts = cond.split('<>');
    return parts[0].trim() !== parts[1].trim();
  }
  if (cond.includes('>')) {
    const parts = cond.split('>');
    return parseFloat(parts[0]) > parseFloat(parts[1]);
  }
  if (cond.includes('<')) {
    const parts = cond.split('<');
    return parseFloat(parts[0]) < parseFloat(parts[1]);
  }
  if (cond.includes('=')) {
    const parts = cond.split('=');
    return parts[0].trim() === parts[1].trim();
  }
  return cond.toUpperCase() === 'TRUE' || cond === '1';
}

function evaluateExpressionString(
  expr: string,
  data: Record<string, CellData>,
  visited: Set<string>
): string {
  // Replace cell references with evaluated numeric or string values
  const replaced = expr.replace(/\b([A-Za-z]+\d+)\b/g, (_, key) => {
    const val = getCellValue(key.toUpperCase(), data, visited);
    if (!isNaN(Number(val)) && val.trim() !== '') {
      return val;
    }
    return `"${val}"`;
  });

  try {
    // If pure arithmetic or comparison expression
    if (/^[0-9\.\s\+\-\*\/\(\)\%\^\>\<\=\!\"]+$/.test(replaced)) {
      // Safe numeric calculation
      const jsExpr = replaced.replace(/\^/g, '**');
      // eslint-disable-next-line no-eval
      const res = eval(jsExpr);
      if (typeof res === 'number') {
        return String(Number(res.toFixed(4)));
      }
      return String(res);
    }
  } catch (e) {
    // Fallback
  }

  return cleanQuotes(replaced);
}

export function formatCellValue(value: string, format?: string): string {
  if (!value) return '';
  const num = parseFloat(value);

  if (isNaN(num)) return value;

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    case 'number':
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    case 'percent':
      return `${(num * (num <= 1 ? 100 : 1)).toFixed(1)}%`;
    case 'date':
      if (value.match(/^\d{4}-\d{2}-\d{2}$/)) return value;
      return new Date().toISOString().split('T')[0];
    default:
      return value;
  }
}
