export type CalculatorMode = 'basic' | 'scientific' | 'programmer' | 'converter' | 'financial';

export interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
  mode: CalculatorMode;
}

export type AngleUnit = 'deg' | 'rad';

export type ProgrammerBase = 'HEX' | 'DEC' | 'OCT' | 'BIN';

export type WordSize = '64bit' | '32bit' | '16bit' | '8bit';
