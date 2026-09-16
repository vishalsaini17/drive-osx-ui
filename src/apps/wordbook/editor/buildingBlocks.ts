import type { JSONContent } from '@tiptap/core';

export interface BuildingBlockTemplate {
  id: string;
  label: string;
  content: JSONContent[];
}

const heading = (level: number, text: string): JSONContent => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] });
const paragraph = (text = ''): JSONContent => (text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' });
const bullet = (items: string[]): JSONContent => ({ type: 'bulletList', content: items.map((t) => ({ type: 'listItem', content: [paragraph(t)] })) });
const ordered = (items: string[]): JSONContent => ({ type: 'orderedList', content: items.map((t) => ({ type: 'listItem', content: [paragraph(t)] })) });
const tasks = (items: string[]): JSONContent => ({
  type: 'taskList',
  content: items.map((t) => ({ type: 'taskItem', attrs: { checked: false }, content: [paragraph(t)] })),
});
const cell = (text: string, header = false): JSONContent => ({ type: header ? 'tableHeader' : 'tableCell', content: [paragraph(text)] });
const row = (cells: JSONContent[]): JSONContent => ({ type: 'tableRow', content: cells });
const table = (rows: JSONContent[]): JSONContent => ({ type: 'table', content: rows });

/**
 * Real, working content templates — not a page builder — matching what
 * Google Docs' "Building blocks" actually gives you underneath its own
 * marketing name: pre-structured content dropped in at the cursor, ready to
 * fill in, using node types the schema already supports.
 */
export const BUILDING_BLOCKS: BuildingBlockTemplate[] = [
  {
    id: 'meeting-notes',
    label: 'Meeting notes',
    content: [
      heading(1, 'Meeting Notes'),
      paragraph('Date: '),
      heading(2, 'Attendees'),
      bullet(['']),
      heading(2, 'Agenda'),
      ordered(['']),
      heading(2, 'Action Items'),
      tasks(['']),
    ],
  },
  {
    id: 'project-proposal',
    label: 'Project proposal',
    content: [
      heading(1, 'Project Proposal'),
      heading(2, 'Overview'),
      paragraph(),
      heading(2, 'Goals'),
      bullet(['']),
      heading(2, 'Timeline'),
      table([row([cell('Phase', true), cell('Target Date', true)]), row([cell(''), cell('')]), row([cell(''), cell('')])]),
      heading(2, 'Budget'),
      paragraph(),
    ],
  },
  {
    id: 'email-draft',
    label: 'Email draft',
    content: [paragraph('To: '), paragraph('Subject: '), { type: 'horizontalRule' }, paragraph('Hi ,'), paragraph(), paragraph(), paragraph('Best,')],
  },
  {
    id: 'review-tracker',
    label: 'Review tracker',
    content: [
      heading(1, 'Review Tracker'),
      table([
        row([cell('Item', true), cell('Status', true), cell('Owner', true), cell('Notes', true)]),
        row([cell(''), cell(''), cell(''), cell('')]),
        row([cell(''), cell(''), cell(''), cell('')]),
        row([cell(''), cell(''), cell(''), cell('')]),
      ]),
    ],
  },
];

/** Word's "Insert Signature Line" — a lightweight, real equivalent of Docs' own paywalled eSignature (marked Premium in the source screenshot, so there's no free feature to fully match there). */
export const SIGNATURE_LINE_CONTENT: JSONContent[] = [
  { type: 'paragraph', content: [{ type: 'text', text: 'X_______________________________' }] },
  { type: 'paragraph', content: [{ type: 'text', text: 'Name', marks: [{ type: 'italic' }] }] },
  { type: 'paragraph', content: [{ type: 'text', text: 'Date', marks: [{ type: 'italic' }] }] },
];
