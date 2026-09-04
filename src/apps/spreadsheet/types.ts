export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number; // e.g. 11, 12, 14
  fontFamily?: string;
  color?: string; // Text color
  bgColor?: string; // Fill color
  align?: 'left' | 'center' | 'right';
  border?: {
    top?: boolean;
    bottom?: boolean;
    left?: boolean;
    right?: boolean;
    color?: string;
  };
  format?: 'general' | 'number' | 'currency' | 'percent' | 'date';
  wrapText?: boolean;
}

export interface CellComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  resolved?: boolean;
  avatarColor?: string;
}

export interface CellData {
  value: string; // Raw input (text or formula string e.g. "=SUM(A1:A5)")
  formattedValue?: string; // Evaluated/Formatted output
  style?: CellStyle;
  comment?: CellComment;
}

export interface MergedRegion {
  id: string;
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}

export interface Sheet {
  id: string;
  name: string;
  color?: string;
  data: Record<string, CellData>; // key e.g. "A1", "B4"
  mergedCells?: MergedRegion[];
  colWidths?: Record<number, number>; // colIndex -> width in px
  rowHeights?: Record<number, number>; // rowIndex -> height in px
}

export interface ConditionalRule {
  id: string;
  type: 'greaterThan' | 'lessThan' | 'equals' | 'contains' | 'colorScale';
  value?: string | number;
  minColor?: string;
  maxColor?: string;
  style?: Partial<CellStyle>;
  range: string; // e.g. "B2:B10"
}

export interface ChartConfig {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie' | 'area';
  range: string; // e.g. "A1:B6"
  sheetId: string;
}

export interface VersionSnapshot {
  id: string;
  title: string;
  timestamp: string;
  author: string;
  sheets: Sheet[];
}

export interface PeerCursor {
  id: string;
  name: string;
  color: string;
  cellKey: string;
  sheetId: string;
  tool?: string;
}
