export type ConverterCategory = 'length' | 'weight' | 'temperature' | 'currency' | 'storage'|'encryption';

export interface UnitDefinition {
  id: string;
  name: string;
  symbol: string;
  /** Multiplier relative to the category's base unit. */
  ratioToBase: number;
}
