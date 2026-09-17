import type { JSONContent } from '@tiptap/core';

export interface EquationSegment {
  text: string;
  script?: 'sup' | 'sub';
}

/**
 * A light LaTeX-like convention — `^{...}`/`^x` for superscript, `_{...}`/`_x`
 * for subscript — parsed into segments that map directly onto the schema's
 * existing Superscript/Subscript marks. Not a real equation-typesetting
 * engine (no KaTeX/MathJax dependency, no fraction/radical layout, no
 * MathML) — but a genuinely working, editable equation using capabilities
 * the document already has, rather than a math renderer this app can't yet
 * export (PDF/DOCX export would need to rasterize or re-implement whatever
 * that renderer draws).
 */
export function parseEquationMarkup(input: string): EquationSegment[] {
  const segments: EquationSegment[] = [];
  let i = 0;
  let plain = '';
  const flushPlain = () => {
    if (plain) segments.push({ text: plain });
    plain = '';
  };

  while (i < input.length) {
    const ch = input[i];
    if (ch === '^' || ch === '_') {
      const script = ch === '^' ? 'sup' : 'sub';
      if (input[i + 1] === '{') {
        const end = input.indexOf('}', i + 2);
        if (end === -1) {
          plain += ch;
          i += 1;
          continue;
        }
        flushPlain();
        segments.push({ text: input.slice(i + 2, end), script });
        i = end + 1;
        continue;
      }
      if (i + 1 < input.length) {
        flushPlain();
        segments.push({ text: input[i + 1], script });
        i += 2;
        continue;
      }
      plain += ch;
      i += 1;
      continue;
    }
    plain += ch;
    i += 1;
  }
  flushPlain();
  return segments;
}

export function equationSegmentsToJSON(segments: EquationSegment[]): JSONContent[] {
  return segments
    .filter((s) => s.text.length > 0)
    .map((s) => ({
      type: 'text',
      text: s.text,
      marks: s.script ? [{ type: s.script === 'sup' ? 'superscript' : 'subscript' }] : undefined,
    }));
}
