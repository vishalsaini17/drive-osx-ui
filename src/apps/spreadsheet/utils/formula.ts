import { CellData } from '../types';

/**
 * Formula engine.
 *
 * Formulas are tokenised and parsed into an expression tree, then evaluated.
 * The previous implementation string-matched a single leading function name
 * and handed anything else to `eval`, so `=SUM(A1:A3)*2`, `=IF(A1>0, SUM(B1:B3), 0)`
 * and every nested call failed. Parsing properly also removes `eval` from a
 * path that evaluates user input.
 */

// ---------------------------------------------------------------------------
// A1 reference helpers
// ---------------------------------------------------------------------------

export function colIndexToLetter(colIndex: number): string {
  let letter = '';
  let col = colIndex + 1;
  while (col > 0) {
    const rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - rem) / 26);
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
  const match = key.trim().match(/^\$?([A-Za-z]+)\$?(\d+)$/);
  if (!match) return null;
  const row = parseInt(match[2], 10);
  if (row < 1) return null;
  return { col: letterToColIndex(match[1]), row: row - 1 };
}

export function coordsToCellKey(col: number, row: number): string {
  return `${colIndexToLetter(col)}${row + 1}`;
}

/** Normalises "B5:A1" to {minCol:0,minRow:0,maxCol:1,maxRow:4}. */
export function parseRange(
  rangeStr: string
): { minCol: number; minRow: number; maxCol: number; maxRow: number } | null {
  const parts = rangeStr.split(':').map((s) => s.trim());
  const start = cellKeyToCoords(parts[0]);
  if (!start) return null;
  const end = parts.length > 1 ? cellKeyToCoords(parts[1]) : start;
  if (!end) return null;
  return {
    minCol: Math.min(start.col, end.col),
    maxCol: Math.max(start.col, end.col),
    minRow: Math.min(start.row, end.row),
    maxRow: Math.max(start.row, end.row),
  };
}

/**
 * Keys in a range, in reading order (left to right, then down). The old
 * implementation walked column-major, which put ranges out of order for
 * anything that cared about layout, such as paste and sort.
 */
export function getRangeCellKeys(rangeStr: string): string[] {
  const range = parseRange(rangeStr);
  if (!range) return [];
  const keys: string[] = [];
  for (let r = range.minRow; r <= range.maxRow; r++) {
    for (let c = range.minCol; c <= range.maxCol; c++) {
      keys.push(coordsToCellKey(c, r));
    }
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

export type CellValue = number | string | boolean | FormulaError;

export class FormulaError {
  constructor(public code: string) {}
  toString() {
    return this.code;
  }
}

const ERR_DIV0 = () => new FormulaError('#DIV/0!');
const ERR_VALUE = () => new FormulaError('#VALUE!');
const ERR_NAME = () => new FormulaError('#NAME?');
const ERR_REF = () => new FormulaError('#REF!');
const ERR_NA = () => new FormulaError('#N/A');
const ERR_CIRCULAR = () => new FormulaError('#CIRCULAR!');

export function isError(value: unknown): value is FormulaError {
  return value instanceof FormulaError;
}

function toNumber(value: CellValue): number | FormulaError {
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (isError(value)) return value;
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  // Tolerate values the user typed with formatting, e.g. "$1,200" or "45%".
  const cleaned = trimmed.replace(/[$,\s]/g, '');
  if (/^-?\d*\.?\d+%$/.test(cleaned)) return parseFloat(cleaned) / 100;
  const num = Number(cleaned);
  return Number.isNaN(num) ? ERR_VALUE() : num;
}

function toText(value: CellValue): string {
  if (isError(value)) return value.code;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return formatNumberForDisplay(value);
  return value;
}

function toBoolean(value: CellValue): boolean | FormulaError {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (isError(value)) return value;
  const upper = value.trim().toUpperCase();
  if (upper === 'TRUE') return true;
  if (upper === 'FALSE' || upper === '') return false;
  const num = Number(value);
  return Number.isNaN(num) ? ERR_VALUE() : num !== 0;
}

/** Trims float noise (0.1 + 0.2) without truncating genuine precision. */
function clean(num: number): number {
  if (!Number.isFinite(num)) return num;
  return Math.abs(num) < 1e-10 ? 0 : Number(num.toPrecision(12));
}

function formatNumberForDisplay(num: number): string {
  if (!Number.isFinite(num)) return num > 0 ? '#DIV/0!' : '#NUM!';
  return String(clean(num));
}

// ---------------------------------------------------------------------------
// Tokeniser
// ---------------------------------------------------------------------------

type TokenType = 'number' | 'string' | 'ref' | 'range' | 'name' | 'op' | 'lparen' | 'rparen' | 'comma';
interface Token {
  type: TokenType;
  value: string;
}

const REF_PATTERN = /^\$?[A-Za-z]{1,3}\$?\d{1,7}/;

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Quoted string, with "" as an escaped quote.
    if (char === '"') {
      let str = '';
      i++;
      while (i < input.length) {
        if (input[i] === '"') {
          if (input[i + 1] === '"') {
            str += '"';
            i += 2;
            continue;
          }
          break;
        }
        str += input[i];
        i++;
      }
      i++;
      tokens.push({ type: 'string', value: str });
      continue;
    }

    if (/\d/.test(char) || (char === '.' && /\d/.test(input[i + 1] || ''))) {
      let num = '';
      while (i < input.length && /[\d.]/.test(input[i])) {
        num += input[i];
        i++;
      }
      // Scientific notation, e.g. 1.5E-3.
      if (/[eE]/.test(input[i] || '') && /[\d+-]/.test(input[i + 1] || '')) {
        num += input[i];
        i++;
        if (/[+-]/.test(input[i])) {
          num += input[i];
          i++;
        }
        while (i < input.length && /\d/.test(input[i])) {
          num += input[i];
          i++;
        }
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    if (/[A-Za-z_$]/.test(char)) {
      const rest = input.slice(i);
      const refMatch = rest.match(REF_PATTERN);

      if (refMatch) {
        const first = refMatch[0];
        const after = rest.slice(first.length);
        const rangeMatch = after.match(/^:(\$?[A-Za-z]{1,3}\$?\d{1,7})/);
        if (rangeMatch) {
          tokens.push({ type: 'range', value: `${first}:${rangeMatch[1]}`.replace(/\$/g, '') });
          i += first.length + rangeMatch[0].length;
          continue;
        }
        // A name immediately followed by "(" is a function, not a reference.
        if (!/^\s*\(/.test(after)) {
          tokens.push({ type: 'ref', value: first.replace(/\$/g, '').toUpperCase() });
          i += first.length;
          continue;
        }
      }

      let name = '';
      while (i < input.length && /[A-Za-z0-9_.]/.test(input[i])) {
        name += input[i];
        i++;
      }
      tokens.push({ type: 'name', value: name.toUpperCase() });
      continue;
    }

    if (char === '(') {
      tokens.push({ type: 'lparen', value: char });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'rparen', value: char });
      i++;
      continue;
    }
    if (char === ',' || char === ';') {
      tokens.push({ type: 'comma', value: ',' });
      i++;
      continue;
    }

    // Two-character comparison operators first.
    const two = input.slice(i, i + 2);
    if (two === '<=' || two === '>=' || two === '<>') {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }
    if ('+-*/^%&=<>'.includes(char)) {
      tokens.push({ type: 'op', value: char });
      i++;
      continue;
    }

    throw new FormulaError('#NAME?');
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Parser (precedence climbing)
// ---------------------------------------------------------------------------

type Node =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'ref'; key: string }
  | { kind: 'range'; range: string }
  | { kind: 'call'; name: string; args: Node[] }
  | { kind: 'binary'; op: string; left: Node; right: Node }
  | { kind: 'unary'; op: string; operand: Node }
  | { kind: 'percent'; operand: Node };

const BINARY_PRECEDENCE: Record<string, number> = {
  '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1,
  '&': 2,
  '+': 3, '-': 3,
  '*': 4, '/': 4,
  '^': 5,
};

function parse(tokens: Token[]): Node {
  let pos = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpression(minPrecedence = 0): Node {
    let left = parseUnary();

    while (pos < tokens.length) {
      const token = peek();
      if (token.type !== 'op') break;
      const precedence = BINARY_PRECEDENCE[token.value];
      if (precedence === undefined || precedence < minPrecedence) break;
      next();
      // "^" is right-associative; everything else is left-associative.
      const right = parseExpression(token.value === '^' ? precedence : precedence + 1);
      left = { kind: 'binary', op: token.value, left, right };
    }

    return left;
  }

  function parseUnary(): Node {
    const token = peek();
    if (token && token.type === 'op' && (token.value === '-' || token.value === '+')) {
      next();
      return { kind: 'unary', op: token.value, operand: parseUnary() };
    }
    return parsePostfix();
  }

  function parsePostfix(): Node {
    let node = parsePrimary();
    while (pos < tokens.length && peek().type === 'op' && peek().value === '%') {
      next();
      node = { kind: 'percent', operand: node };
    }
    return node;
  }

  function parsePrimary(): Node {
    const token = next();
    if (!token) throw ERR_VALUE();

    switch (token.type) {
      case 'number':
        return { kind: 'number', value: parseFloat(token.value) };
      case 'string':
        return { kind: 'string', value: token.value };
      case 'ref':
        return { kind: 'ref', key: token.value };
      case 'range':
        return { kind: 'range', range: token.value.toUpperCase() };
      case 'lparen': {
        const inner = parseExpression(0);
        if (!peek() || peek().type !== 'rparen') throw ERR_VALUE();
        next();
        return inner;
      }
      case 'name': {
        const name = token.value;
        if (peek() && peek().type === 'lparen') {
          next();
          const args: Node[] = [];
          if (peek() && peek().type !== 'rparen') {
            args.push(parseExpression(0));
            while (peek() && peek().type === 'comma') {
              next();
              args.push(parseExpression(0));
            }
          }
          if (!peek() || peek().type !== 'rparen') throw ERR_VALUE();
          next();
          return { kind: 'call', name, args };
        }
        if (name === 'TRUE') return { kind: 'number', value: 1 };
        if (name === 'FALSE') return { kind: 'number', value: 0 };
        throw ERR_NAME();
      }
      default:
        throw ERR_VALUE();
    }
  }

  const result = parseExpression(0);
  if (pos < tokens.length) throw ERR_VALUE();
  return result;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

interface EvalContext {
  data: Record<string, CellData>;
  /** Cells currently being evaluated, for cycle detection. */
  stack: Set<string>;
  cache: Map<string, CellValue>;
}

/**
 * Resolves one cell. Cycle detection tracks the *active* evaluation path and
 * removes the cell on the way out, so `=A1+A1` is fine while `=A1` in A1 is
 * still reported. The old code never removed entries, so any repeated
 * reference in a single formula reported a false circular error.
 */
function resolveCell(key: string, ctx: EvalContext): CellValue {
  if (ctx.stack.has(key)) return ERR_CIRCULAR();
  if (ctx.cache.has(key)) return ctx.cache.get(key)!;

  const cell = ctx.data[key];
  const raw = cell?.value;
  if (raw === undefined || raw === null || raw === '') return '';

  const trimmed = String(raw).trim();
  if (!trimmed.startsWith('=')) {
    const value = parseLiteral(trimmed);
    ctx.cache.set(key, value);
    return value;
  }

  ctx.stack.add(key);
  let value: CellValue;
  try {
    value = evaluateAst(trimmed.slice(1), ctx);
  } catch (err) {
    value = err instanceof FormulaError ? err : new FormulaError('#ERROR!');
  } finally {
    ctx.stack.delete(key);
  }

  ctx.cache.set(key, value);
  return value;
}

/** A typed literal from raw cell text: number, boolean, or text. */
function parseLiteral(raw: string): CellValue {
  if (raw === '') return '';
  const upper = raw.toUpperCase();
  if (upper === 'TRUE') return true;
  if (upper === 'FALSE') return false;
  // Only treat as a number when the whole string is one, so "1 Main St" stays text.
  if (/^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(raw)) return parseFloat(raw);
  if (/^-?\$?[\d,]+\.?\d*$/.test(raw) && /\d/.test(raw)) {
    const num = Number(raw.replace(/[$,]/g, ''));
    if (!Number.isNaN(num)) return num;
  }
  return raw;
}

function flattenArgs(nodes: Node[], ctx: EvalContext): CellValue[] {
  const values: CellValue[] = [];
  for (const node of nodes) {
    if (node.kind === 'range') {
      for (const key of getRangeCellKeys(node.range)) {
        values.push(resolveCell(key, ctx));
      }
    } else {
      values.push(evaluateNode(node, ctx));
    }
  }
  return values;
}

/** Numbers only, the way SUM and AVERAGE treat a range (text is skipped). */
function numericArgs(nodes: Node[], ctx: EvalContext): number[] | FormulaError {
  const numbers: number[] = [];
  for (const node of nodes) {
    if (node.kind === 'range') {
      for (const key of getRangeCellKeys(node.range)) {
        const value = resolveCell(key, ctx);
        if (isError(value)) return value;
        if (typeof value === 'number') numbers.push(value);
        else if (typeof value === 'boolean') continue;
        else if (value.trim() !== '') {
          const num = Number(value);
          if (!Number.isNaN(num)) numbers.push(num);
        }
      }
    } else {
      const value = evaluateNode(node, ctx);
      if (isError(value)) return value;
      const num = toNumber(value);
      if (isError(num)) return num;
      numbers.push(num);
    }
  }
  return numbers;
}

function compare(left: CellValue, right: CellValue): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  const leftNum = typeof left === 'string' ? Number(left) : NaN;
  const rightNum = typeof right === 'string' ? Number(right) : NaN;
  if (!Number.isNaN(leftNum) && typeof right === 'number') return leftNum - right;
  if (!Number.isNaN(rightNum) && typeof left === 'number') return left - rightNum;
  const leftText = toText(left).toLowerCase();
  const rightText = toText(right).toLowerCase();
  return leftText < rightText ? -1 : leftText > rightText ? 1 : 0;
}

/** Criteria as used by COUNTIF/SUMIF: ">10", "<>x", "apple", "*ple". */
function matchesCriteria(value: CellValue, criteria: CellValue): boolean {
  const criteriaText = toText(criteria).trim();
  const opMatch = criteriaText.match(/^(<=|>=|<>|=|<|>)(.*)$/);

  if (opMatch) {
    const [, op, rest] = opMatch;
    const target = parseLiteral(rest.trim());
    const cmp = compare(value, target);
    switch (op) {
      case '=': return cmp === 0;
      case '<>': return cmp !== 0;
      case '<': return cmp < 0;
      case '>': return cmp > 0;
      case '<=': return cmp <= 0;
      case '>=': return cmp >= 0;
    }
  }

  if (criteriaText.includes('*') || criteriaText.includes('?')) {
    const pattern = new RegExp(
      `^${criteriaText.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`,
      'i'
    );
    return pattern.test(toText(value));
  }

  return compare(value, parseLiteral(criteriaText)) === 0;
}

function evaluateNode(node: Node, ctx: EvalContext): CellValue {
  switch (node.kind) {
    case 'number':
      return node.value;
    case 'string':
      return node.value;
    case 'ref':
      return resolveCell(node.key, ctx);
    case 'range': {
      // A bare range outside a function collapses to its first cell.
      const keys = getRangeCellKeys(node.range);
      return keys.length ? resolveCell(keys[0], ctx) : ERR_REF();
    }
    case 'unary': {
      const value = evaluateNode(node.operand, ctx);
      if (isError(value)) return value;
      const num = toNumber(value);
      if (isError(num)) return num;
      return node.op === '-' ? -num : num;
    }
    case 'percent': {
      const value = evaluateNode(node.operand, ctx);
      if (isError(value)) return value;
      const num = toNumber(value);
      if (isError(num)) return num;
      return num / 100;
    }
    case 'binary':
      return evaluateBinary(node, ctx);
    case 'call':
      return callFunction(node.name, node.args, ctx);
  }
}

function evaluateBinary(node: Extract<Node, { kind: 'binary' }>, ctx: EvalContext): CellValue {
  const left = evaluateNode(node.left, ctx);
  if (isError(left)) return left;
  const right = evaluateNode(node.right, ctx);
  if (isError(right)) return right;

  switch (node.op) {
    case '&':
      return toText(left) + toText(right);
    case '=': return compare(left, right) === 0;
    case '<>': return compare(left, right) !== 0;
    case '<': return compare(left, right) < 0;
    case '>': return compare(left, right) > 0;
    case '<=': return compare(left, right) <= 0;
    case '>=': return compare(left, right) >= 0;
  }

  const leftNum = toNumber(left);
  if (isError(leftNum)) return leftNum;
  const rightNum = toNumber(right);
  if (isError(rightNum)) return rightNum;

  switch (node.op) {
    case '+': return clean(leftNum + rightNum);
    case '-': return clean(leftNum - rightNum);
    case '*': return clean(leftNum * rightNum);
    case '/': return rightNum === 0 ? ERR_DIV0() : clean(leftNum / rightNum);
    case '^': return clean(Math.pow(leftNum, rightNum));
    default: return ERR_VALUE();
  }
}

// ---------------------------------------------------------------------------
// Function library
// ---------------------------------------------------------------------------

function serialNumberToDate(serial: number): Date {
  // Excel's epoch, keeping its 1900 leap-year quirk out of scope.
  return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
}

function dateToSerialNumber(date: Date): number {
  return Math.round((date.getTime() - Date.UTC(1899, 11, 30)) / 86400000);
}

function callFunction(name: string, args: Node[], ctx: EvalContext): CellValue {
  const evalArg = (index: number): CellValue =>
    args[index] === undefined ? '' : evaluateNode(args[index], ctx);
  const numArg = (index: number): number | FormulaError => {
    const value = evalArg(index);
    return isError(value) ? value : toNumber(value);
  };

  switch (name) {
    // --- Aggregation -------------------------------------------------------
    case 'SUM': {
      const nums = numericArgs(args, ctx);
      return isError(nums) ? nums : clean(nums.reduce((a, b) => a + b, 0));
    }
    case 'PRODUCT': {
      const nums = numericArgs(args, ctx);
      if (isError(nums)) return nums;
      return nums.length ? clean(nums.reduce((a, b) => a * b, 1)) : 0;
    }
    case 'AVERAGE': {
      const nums = numericArgs(args, ctx);
      if (isError(nums)) return nums;
      return nums.length ? clean(nums.reduce((a, b) => a + b, 0) / nums.length) : ERR_DIV0();
    }
    case 'MEDIAN': {
      const nums = numericArgs(args, ctx);
      if (isError(nums)) return nums;
      if (!nums.length) return ERR_NA();
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : clean((sorted[mid - 1] + sorted[mid]) / 2);
    }
    case 'STDEV': {
      const nums = numericArgs(args, ctx);
      if (isError(nums)) return nums;
      if (nums.length < 2) return ERR_DIV0();
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const variance = nums.reduce((acc, n) => acc + (n - mean) ** 2, 0) / (nums.length - 1);
      return clean(Math.sqrt(variance));
    }
    case 'COUNT': {
      const nums = numericArgs(args, ctx);
      return isError(nums) ? nums : nums.length;
    }
    case 'COUNTA':
      return flattenArgs(args, ctx).filter((v) => !(typeof v === 'string' && v === '')).length;
    case 'COUNTBLANK':
      return flattenArgs(args, ctx).filter((v) => typeof v === 'string' && v === '').length;
    case 'MIN': {
      const nums = numericArgs(args, ctx);
      if (isError(nums)) return nums;
      return nums.length ? Math.min(...nums) : 0;
    }
    case 'MAX': {
      const nums = numericArgs(args, ctx);
      if (isError(nums)) return nums;
      return nums.length ? Math.max(...nums) : 0;
    }
    case 'COUNTIF': {
      if (args.length < 2 || args[0].kind !== 'range') return ERR_VALUE();
      const criteria = evalArg(1);
      const keys = getRangeCellKeys(args[0].range);
      return keys.filter((key) => matchesCriteria(resolveCell(key, ctx), criteria)).length;
    }
    case 'SUMIF': {
      if (args.length < 2 || args[0].kind !== 'range') return ERR_VALUE();
      const criteria = evalArg(1);
      const testKeys = getRangeCellKeys(args[0].range);
      const sumKeys =
        args[2] && args[2].kind === 'range' ? getRangeCellKeys(args[2].range) : testKeys;
      let total = 0;
      testKeys.forEach((key, index) => {
        if (!matchesCriteria(resolveCell(key, ctx), criteria)) return;
        const target = sumKeys[index];
        if (!target) return;
        const value = resolveCell(target, ctx);
        if (typeof value === 'number') total += value;
      });
      return clean(total);
    }
    case 'AVERAGEIF': {
      if (args.length < 2 || args[0].kind !== 'range') return ERR_VALUE();
      const criteria = evalArg(1);
      const testKeys = getRangeCellKeys(args[0].range);
      const avgKeys = args[2] && args[2].kind === 'range' ? getRangeCellKeys(args[2].range) : testKeys;
      const matched: number[] = [];
      testKeys.forEach((key, index) => {
        if (!matchesCriteria(resolveCell(key, ctx), criteria)) return;
        const value = resolveCell(avgKeys[index] ?? key, ctx);
        if (typeof value === 'number') matched.push(value);
      });
      return matched.length ? clean(matched.reduce((a, b) => a + b, 0) / matched.length) : ERR_DIV0();
    }

    // --- Logic -------------------------------------------------------------
    case 'IF': {
      const condition = evalArg(0);
      if (isError(condition)) return condition;
      const bool = toBoolean(condition);
      if (isError(bool)) return bool;
      if (bool) return args[1] ? evaluateNode(args[1], ctx) : true;
      return args[2] ? evaluateNode(args[2], ctx) : false;
    }
    case 'IFERROR': {
      const value = evalArg(0);
      return isError(value) ? (args[1] ? evaluateNode(args[1], ctx) : '') : value;
    }
    case 'IFS': {
      for (let i = 0; i + 1 < args.length; i += 2) {
        const condition = evaluateNode(args[i], ctx);
        if (isError(condition)) return condition;
        const bool = toBoolean(condition);
        if (isError(bool)) return bool;
        if (bool) return evaluateNode(args[i + 1], ctx);
      }
      return ERR_NA();
    }
    case 'AND': {
      const values = flattenArgs(args, ctx);
      for (const value of values) {
        if (isError(value)) return value;
        const bool = toBoolean(value);
        if (isError(bool)) return bool;
        if (!bool) return false;
      }
      return true;
    }
    case 'OR': {
      const values = flattenArgs(args, ctx);
      let result = false;
      for (const value of values) {
        if (isError(value)) return value;
        const bool = toBoolean(value);
        if (isError(bool)) return bool;
        if (bool) result = true;
      }
      return result;
    }
    case 'NOT': {
      const bool = toBoolean(evalArg(0));
      return isError(bool) ? bool : !bool;
    }
    case 'ISBLANK': {
      const value = evalArg(0);
      return typeof value === 'string' && value === '';
    }
    case 'ISNUMBER':
      return typeof evalArg(0) === 'number';
    case 'ISTEXT': {
      const value = evalArg(0);
      return typeof value === 'string' && value !== '';
    }
    case 'ISERROR':
      return isError(evalArg(0));

    // --- Math --------------------------------------------------------------
    case 'ROUND':
    case 'ROUNDUP':
    case 'ROUNDDOWN': {
      const num = numArg(0);
      if (isError(num)) return num;
      const digitsValue = args[1] ? numArg(1) : 0;
      if (isError(digitsValue)) return digitsValue;
      const factor = Math.pow(10, digitsValue);
      const scaled = num * factor;
      const rounded =
        name === 'ROUND'
          ? Math.round(Math.abs(scaled)) * Math.sign(scaled)
          : name === 'ROUNDUP'
          ? Math.ceil(Math.abs(scaled)) * Math.sign(scaled)
          : Math.floor(Math.abs(scaled)) * Math.sign(scaled);
      return clean(rounded / factor);
    }
    case 'ABS': {
      const num = numArg(0);
      return isError(num) ? num : Math.abs(num);
    }
    case 'SQRT': {
      const num = numArg(0);
      if (isError(num)) return num;
      return num < 0 ? new FormulaError('#NUM!') : clean(Math.sqrt(num));
    }
    case 'POWER': {
      const base = numArg(0);
      if (isError(base)) return base;
      const exponent = numArg(1);
      return isError(exponent) ? exponent : clean(Math.pow(base, exponent));
    }
    case 'MOD': {
      const num = numArg(0);
      if (isError(num)) return num;
      const divisor = numArg(1);
      if (isError(divisor)) return divisor;
      return divisor === 0 ? ERR_DIV0() : clean(num - divisor * Math.floor(num / divisor));
    }
    case 'INT': {
      const num = numArg(0);
      return isError(num) ? num : Math.floor(num);
    }
    case 'CEILING': {
      const num = numArg(0);
      return isError(num) ? num : Math.ceil(num);
    }
    case 'FLOOR': {
      const num = numArg(0);
      return isError(num) ? num : Math.floor(num);
    }
    case 'RANDBETWEEN': {
      const low = numArg(0);
      if (isError(low)) return low;
      const high = numArg(1);
      if (isError(high)) return high;
      return Math.floor(Math.random() * (high - low + 1)) + low;
    }

    // --- Text --------------------------------------------------------------
    case 'CONCAT':
    case 'CONCATENATE':
      return flattenArgs(args, ctx).map(toText).join('');
    case 'LEN':
      return toText(evalArg(0)).length;
    case 'UPPER':
      return toText(evalArg(0)).toUpperCase();
    case 'LOWER':
      return toText(evalArg(0)).toLowerCase();
    case 'PROPER':
      return toText(evalArg(0)).replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
    case 'TRIM':
      return toText(evalArg(0)).trim().replace(/\s+/g, ' ');
    case 'LEFT': {
      const count = args[1] ? numArg(1) : 1;
      return isError(count) ? count : toText(evalArg(0)).slice(0, count);
    }
    case 'RIGHT': {
      const count = args[1] ? numArg(1) : 1;
      if (isError(count)) return count;
      const text = toText(evalArg(0));
      return count <= 0 ? '' : text.slice(Math.max(0, text.length - count));
    }
    case 'MID': {
      const start = numArg(1);
      if (isError(start)) return start;
      const count = numArg(2);
      if (isError(count)) return count;
      return toText(evalArg(0)).substr(Math.max(0, start - 1), count);
    }
    case 'TEXT': {
      const value = evalArg(0);
      return toText(value);
    }
    case 'VALUE': {
      const num = toNumber(evalArg(0));
      return isError(num) ? num : num;
    }

    // --- Dates -------------------------------------------------------------
    case 'TODAY':
      return dateToSerialNumber(new Date());
    case 'NOW':
      return clean((Date.now() - Date.UTC(1899, 11, 30)) / 86400000);
    case 'YEAR': {
      const serial = numArg(0);
      return isError(serial) ? serial : serialNumberToDate(serial).getUTCFullYear();
    }
    case 'MONTH': {
      const serial = numArg(0);
      return isError(serial) ? serial : serialNumberToDate(serial).getUTCMonth() + 1;
    }
    case 'DAY': {
      const serial = numArg(0);
      return isError(serial) ? serial : serialNumberToDate(serial).getUTCDate();
    }

    // --- Lookup ------------------------------------------------------------
    case 'VLOOKUP':
    case 'HLOOKUP': {
      if (args.length < 3 || args[1].kind !== 'range') return ERR_REF();
      const lookup = evalArg(0);
      if (isError(lookup)) return lookup;
      const index = numArg(2);
      if (isError(index)) return index;
      const range = parseRange(args[1].range);
      if (!range) return ERR_REF();

      // The 4th argument requests approximate matching; default is exact,
      // matching modern spreadsheet behaviour rather than the old substring
      // match, which returned the wrong row for values like "10" vs "100".
      const approximate = args[3] ? toBoolean(evalArg(3)) === true : false;

      if (name === 'VLOOKUP') {
        let fallback: string | null = null;
        for (let r = range.minRow; r <= range.maxRow; r++) {
          const value = resolveCell(coordsToCellKey(range.minCol, r), ctx);
          const cmp = compare(value, lookup);
          if (cmp === 0) return resolveCell(coordsToCellKey(range.minCol + index - 1, r), ctx);
          if (approximate && cmp < 0) fallback = coordsToCellKey(range.minCol + index - 1, r);
        }
        return fallback ? resolveCell(fallback, ctx) : ERR_NA();
      }

      for (let c = range.minCol; c <= range.maxCol; c++) {
        const value = resolveCell(coordsToCellKey(c, range.minRow), ctx);
        if (compare(value, lookup) === 0) {
          return resolveCell(coordsToCellKey(c, range.minRow + index - 1), ctx);
        }
      }
      return ERR_NA();
    }
    case 'INDEX': {
      if (args[0].kind !== 'range') return ERR_REF();
      const range = parseRange(args[0].range);
      if (!range) return ERR_REF();
      const rowArg = numArg(1);
      if (isError(rowArg)) return rowArg;
      const colArg = args[2] ? numArg(2) : 1;
      if (isError(colArg)) return colArg;
      const row = range.minRow + rowArg - 1;
      const col = range.minCol + colArg - 1;
      if (row > range.maxRow || col > range.maxCol || row < range.minRow || col < range.minCol) {
        return ERR_REF();
      }
      return resolveCell(coordsToCellKey(col, row), ctx);
    }
    case 'MATCH': {
      if (args.length < 2 || args[1].kind !== 'range') return ERR_REF();
      const lookup = evalArg(0);
      const keys = getRangeCellKeys(args[1].range);
      for (let i = 0; i < keys.length; i++) {
        if (compare(resolveCell(keys[i], ctx), lookup) === 0) return i + 1;
      }
      return ERR_NA();
    }

    default:
      return ERR_NAME();
  }
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

const astCache = new Map<string, Node | FormulaError>();

function parseCached(expression: string): Node | FormulaError {
  const cached = astCache.get(expression);
  if (cached) return cached;
  let result: Node | FormulaError;
  try {
    result = parse(tokenize(expression));
  } catch (err) {
    result = err instanceof FormulaError ? err : ERR_VALUE();
  }
  // Bounded so a session of edits cannot grow it without limit.
  if (astCache.size > 2000) astCache.clear();
  astCache.set(expression, result);
  return result;
}

function evaluateAst(expression: string, ctx: EvalContext): CellValue {
  const ast = parseCached(expression);
  if (ast instanceof FormulaError) return ast;
  return evaluateNode(ast, ctx);
}

/**
 * Evaluates one cell's raw text against a sheet. `cellKey` lets the engine
 * detect a formula that refers to its own cell.
 */
export function evaluateCell(
  raw: string,
  data: Record<string, CellData>,
  cellKey?: string,
  cache?: Map<string, CellValue>
): CellValue {
  if (raw === undefined || raw === null) return '';
  const trimmed = String(raw).trim();
  if (!trimmed.startsWith('=')) return parseLiteral(trimmed);

  const ctx: EvalContext = {
    data,
    stack: new Set(cellKey ? [cellKey] : []),
    cache: cache ?? new Map(),
  };

  try {
    return evaluateAst(trimmed.slice(1), ctx);
  } catch (err) {
    return err instanceof FormulaError ? err : new FormulaError('#ERROR!');
  }
}

/** Back-compatible string form, used by exports and older call sites. */
export function evaluateFormula(
  formula: string,
  data: Record<string, CellData>
): string {
  return toText(evaluateCell(formula, data));
}

export { toText as cellValueToText, toNumber as cellValueToNumber };

// ---------------------------------------------------------------------------
// Number formatting
// ---------------------------------------------------------------------------

export type NumberFormat =
  | 'general' | 'number' | 'currency' | 'accounting' | 'percent'
  | 'scientific' | 'date' | 'time' | 'text';

export interface FormatOptions {
  decimals?: number;
  currencySymbol?: string;
  thousands?: boolean;
}

/**
 * Renders a value for display. The old version returned *today's date* for any
 * value under the date format that was not already ISO, silently replacing
 * real data, and applied a `num <= 1 ? 100 : 1` guess for percentages.
 */
export function formatCellValue(
  value: CellValue,
  format?: NumberFormat,
  options: FormatOptions = {}
): string {
  if (isError(value)) return value.code;
  if (format === 'text') return toText(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'string') {
    if (value === '') return '';
    // Text under a numeric format stays text rather than being coerced.
    const num = Number(value.replace(/[$,\s]/g, ''));
    if (Number.isNaN(num) || !format || format === 'general') return value;
    return formatNumber(num, format, options);
  }
  if (!format || format === 'general') return formatNumberForDisplay(value);
  return formatNumber(value, format, options);
}

function formatNumber(num: number, format: NumberFormat, options: FormatOptions): string {
  const decimals = options.decimals;
  const useGrouping = options.thousands !== false;

  switch (format) {
    case 'number':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals ?? 2,
        maximumFractionDigits: decimals ?? 2,
        useGrouping,
      }).format(num);
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: options.currencySymbol || 'USD',
        minimumFractionDigits: decimals ?? 2,
        maximumFractionDigits: decimals ?? 2,
      }).format(num);
    case 'accounting': {
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: options.currencySymbol || 'USD',
        minimumFractionDigits: decimals ?? 2,
        maximumFractionDigits: decimals ?? 2,
      }).format(Math.abs(num));
      return num < 0 ? `(${formatted})` : formatted;
    }
    case 'percent':
      // The stored value is the fraction, so 0.25 shows as 25% — no guessing.
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: decimals ?? 1,
        maximumFractionDigits: decimals ?? 1,
      }).format(num);
    case 'scientific':
      return num.toExponential(decimals ?? 2).toUpperCase();
    case 'date': {
      const date = serialNumberToDate(num);
      if (Number.isNaN(date.getTime())) return String(num);
      return date.toISOString().split('T')[0];
    }
    case 'time': {
      const date = serialNumberToDate(num);
      if (Number.isNaN(date.getTime())) return String(num);
      return date.toISOString().split('T')[1].slice(0, 8);
    }
    default:
      return formatNumberForDisplay(num);
  }
}

/** True when a value should sit right-aligned by default, as numbers do. */
export function isNumericValue(value: CellValue): boolean {
  return typeof value === 'number' || typeof value === 'boolean';
}
