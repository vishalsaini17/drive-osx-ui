import { Sheet } from '../../spreadsheet/types';
import { coordsToCellKey } from '../../spreadsheet/utils/formula';
import { getUsedRange } from '../../spreadsheet/utils/grid';

export interface SheetChartRow {
  label: string;
  value: string;
}

/**
 * Reads the leftmost used column as labels and the one next to it as values
 * — a fixed, predictable convention rather than a full range picker (which
 * would need its own grid-selection UI to build). Bounded to the sheet's own
 * used range (`getUsedRange`, the same helper the spreadsheet app itself
 * uses) rather than scanning from row 0, so data that doesn't start at A1
 * still gets picked up; capped at `maxRows` so a huge sheet doesn't produce
 * an unreadable chart.
 */
export function extractChartRowsFromSheet(sheet: Sheet, maxRows = 25): SheetChartRow[] {
  const used = getUsedRange(sheet.data);
  const rows: SheetChartRow[] = [];
  for (let row = used.minRow; row <= used.maxRow && rows.length < maxRows; row++) {
    const labelCell = sheet.data[coordsToCellKey(used.minCol, row)];
    const valueCell = sheet.data[coordsToCellKey(used.minCol + 1, row)];
    if (!labelCell?.value && !valueCell?.value) continue;
    rows.push({ label: labelCell?.value ?? '', value: valueCell?.value ?? '' });
  }
  return rows;
}

/** A saved workbook's file content is just `JSON.stringify(sheets)` (see spreadsheet/index.tsx's `saveToDisk`) — parsed and shape-checked here rather than trusted blindly, since the picked file isn't guaranteed to actually be a workbook. */
export function parseWorkbookContent(content: string): Sheet[] {
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed) || parsed.length === 0 || typeof parsed[0]?.data !== 'object') {
    throw new Error('Not a spreadsheet file');
  }
  return parsed as Sheet[];
}
