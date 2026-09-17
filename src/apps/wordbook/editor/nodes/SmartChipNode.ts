import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    smartChip: {
      insertSmartChip: (attrs: {
        chipType: 'date' | 'person' | 'file' | 'event' | 'citation';
        label: string;
        fileId?: string;
        personId?: string;
        personEmail?: string;
        eventId?: string;
        citationIndex?: number;
        citationText?: string;
      }) => ReturnType;
    };
  }
}

const CHIP_ICON: Record<string, string> = {
  date: '📅',
  person: '👤',
  file: '📄',
  event: '🗓️',
};

/**
 * A real, data-backed inline reference — a file, a directory user, a
 * calendar event, or a date — not decorative styled text. What each one
 * actually opens on click lives in index.tsx's `handleClick`: it needs live
 * access to the platform's file/app-opening actions, which a schema-level
 * node definition has no business reaching into.
 */
export const SmartChipNode = Node.create({
  name: 'smartChip',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      chipType: {
        default: 'date',
        parseHTML: (el) => el.getAttribute('data-chip-type'),
        renderHTML: (attrs) => ({ 'data-chip-type': attrs.chipType }),
      },
      label: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-chip-label'),
        renderHTML: (attrs) => ({ 'data-chip-label': attrs.label }),
      },
      fileId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-file-id'),
        renderHTML: (attrs) => (attrs.fileId ? { 'data-file-id': attrs.fileId } : {}),
      },
      personId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-person-id'),
        renderHTML: (attrs) => (attrs.personId ? { 'data-person-id': attrs.personId } : {}),
      },
      personEmail: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-person-email'),
        renderHTML: (attrs) => (attrs.personEmail ? { 'data-person-email': attrs.personEmail } : {}),
      },
      eventId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-event-id'),
        renderHTML: (attrs) => (attrs.eventId ? { 'data-event-id': attrs.eventId } : {}),
      },
      citationIndex: {
        default: null,
        parseHTML: (el) => {
          const v = el.getAttribute('data-citation-index');
          return v ? parseInt(v, 10) : null;
        },
        renderHTML: (attrs) => (attrs.citationIndex != null ? { 'data-citation-index': String(attrs.citationIndex) } : {}),
      },
      citationText: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-citation-text'),
        renderHTML: (attrs) => (attrs.citationText ? { 'data-citation-text': attrs.citationText } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-chip]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const chipType = node.attrs.chipType as string;
    const label = node.attrs.label as string;

    if (chipType === 'citation') {
      const citationText = node.attrs.citationText as string;
      return [
        'span',
        mergeAttributes(HTMLAttributes, {
          'data-chip': '',
          class: 'wb-chip wb-chip-citation',
          contenteditable: 'false',
          title: citationText || 'Citation',
        }),
        label,
      ];
    }

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-chip': '',
        class: `wb-chip wb-chip-${chipType}`,
        contenteditable: 'false',
        title: chipType === 'date' ? label : `Click to open — ${label}`,
      }),
      `${CHIP_ICON[chipType] ?? ''} ${label}`,
    ];
  },

  addCommands() {
    return {
      insertSmartChip:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

export default SmartChipNode;
