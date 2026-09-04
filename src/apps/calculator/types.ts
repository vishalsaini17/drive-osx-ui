export type CalculatorMode = 'basic' | 'scientific' | 'programmer' | 'converter';

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

export type ConverterCategory = 'length' | 'weight' | 'temperature' | 'currency' | 'storage';

export interface UnitDefinition {
  id: string;
  name: string;
  symbol: string;
  ratioToBase: number; // For linear conversion relative to base unit
}
