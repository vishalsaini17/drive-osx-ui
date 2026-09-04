import React, { useState } from 'react';
import { Search, Wand2, Bug, GitBranch, FileCode2, Package, Settings as SettingsIcon, CircleCheck, ChevronLeft } from 'lucide-react';
import { MONACO_THEME_IDS, EditorThemeName } from '../editor/themes';

export interface SettingsEditorProps {
  fontSize: number;
  fontFamily: string;
  tabSizeLabel: string;
  wordWrap: boolean;
  minimapEnabled: boolean;
  lineNumbersEnabled: boolean;
  renderWhitespace: boolean;
  breadcrumbsEnabled: boolean;
  autoSaveEnabled: boolean;
  themeName: EditorThemeName;
  formatOnSave: boolean;
  prettierEnabled: boolean;
  prettierSemi: boolean;
  prettierSingleQuote: boolean;
  prettierTrailingComma: 'none' | 'es5' | 'all';
  prettierPrintWidth: number;
  eslintEnabled: boolean;
  onChange: (patch: Record<string, unknown>) => void;
}

type CategoryId = 'commonly-used' | 'text-editor' | 'workbench' | 'extensions' | 'ext-prettier' | 'ext-eslint';

const CATEGORY_LABELS: Record<CategoryId, string> = {
  'commonly-used': 'Commonly Used',
  'text-editor': 'Text Editor',
  workbench: 'Workbench',
  extensions: 'Extensions',
  'ext-prettier': 'Prettier',
  'ext-eslint': 'ESLint',
};

const NAV_ITEMS: { id: CategoryId; indent?: boolean }[] = [
  { id: 'commonly-used' },
  { id: 'text-editor' },
  { id: 'workbench' },
  { id: 'extensions' },
  { id: 'ext-prettier', indent: true },
  { id: 'ext-eslint', indent: true },
];

type Control =
  | { kind: 'toggle' }
  | { kind: 'select'; options: { value: string; label: string }[] }
  | { kind: 'number'; min: number; max: number }
  | { kind: 'text' };

interface SettingDescriptor {
  id: string;
  categories: CategoryId[];
  label: string;
  description: string;
  control: Control;
  value: string | number | boolean;
}

function buildDescriptors(p: SettingsEditorProps): SettingDescriptor[] {
  return [
    {
      id: 'fontSize',
      categories: ['commonly-used', 'text-editor'],
      label: 'Editor: Font Size',
      description: 'Controls the font size in pixels.',
      control: { kind: 'number', min: 8, max: 32 },
      value: p.fontSize,
    },
    {
      id: 'fontFamily',
      categories: ['commonly-used', 'text-editor'],
      label: 'Editor: Font Family',
      description: 'Controls the font family used in the editor.',
      control: { kind: 'text' },
      value: p.fontFamily,
    },
    {
      id: 'tabSize',
      categories: ['commonly-used', 'text-editor'],
      label: 'Editor: Tab Size',
      description: 'The number of spaces a tab is equal to — or Tabs, to indent with an actual tab character.',
      control: { kind: 'select', options: [{ value: '2 spaces', label: '2 spaces' }, { value: '4 spaces', label: '4 spaces' }, { value: 'Tabs', label: 'Tabs' }] },
      value: p.tabSizeLabel,
    },
    {
      id: 'wordWrap',
      categories: ['text-editor'],
      label: 'Editor: Word Wrap',
      description: 'Wrap lines that would otherwise extend past the visible width of the editor.',
      control: { kind: 'toggle' },
      value: p.wordWrap,
    },
    {
      id: 'minimapEnabled',
      categories: ['text-editor'],
      label: 'Editor: Minimap',
      description: 'Show a condensed overview of the file on the right edge of the editor.',
      control: { kind: 'toggle' },
      value: p.minimapEnabled,
    },
    {
      id: 'lineNumbersEnabled',
      categories: ['text-editor'],
      label: 'Editor: Line Numbers',
      description: 'Show line numbers in the gutter.',
      control: { kind: 'toggle' },
      value: p.lineNumbersEnabled,
    },
    {
      id: 'renderWhitespace',
      categories: ['text-editor'],
      label: 'Editor: Render Whitespace',
      description: 'Show spaces and tab characters as visible marks, everywhere in the file rather than only inside a selection.',
      control: { kind: 'toggle' },
      value: p.renderWhitespace,
    },
    {
      id: 'formatOnSave',
      categories: ['commonly-used', 'text-editor'],
      label: 'Editor: Format On Save',
      description: 'Format a file on save, using Prettier for the languages it supports and the built-in formatter otherwise.',
      control: { kind: 'toggle' },
      value: p.formatOnSave,
    },
    {
      id: 'autoSave',
      categories: ['commonly-used', 'text-editor'],
      label: 'Files: Auto Save',
      description: 'Automatically save a file a few seconds after you stop typing, for files already saved to Drive at least once.',
      control: { kind: 'toggle' },
      value: p.autoSaveEnabled,
    },
    {
      id: 'breadcrumbsEnabled',
      categories: ['workbench'],
      label: 'Breadcrumbs: Enabled',
      description: 'Show the folder path bar above the editor.',
      control: { kind: 'toggle' },
      value: p.breadcrumbsEnabled,
    },
    {
      id: 'editorTheme',
      categories: ['commonly-used', 'workbench'],
      label: 'Workbench: Color Theme',
      description: 'Specifies the color theme used in the editor.',
      control: { kind: 'select', options: (Object.keys(MONACO_THEME_IDS) as EditorThemeName[]).map((name) => ({ value: name, label: name })) },
      value: p.themeName,
    },
    {
      id: 'prettierEnabled',
      categories: ['ext-prettier'],
      label: 'Prettier: Enable',
      description: 'Use Prettier to format JavaScript, TypeScript, JSON, CSS, LESS, SCSS, HTML, Markdown, YAML, and GraphQL. When off, Format Document falls back to the built-in formatter.',
      control: { kind: 'toggle' },
      value: p.prettierEnabled,
    },
    {
      id: 'prettierSemi',
      categories: ['ext-prettier'],
      label: 'Prettier: Semicolons',
      description: 'Print semicolons at the ends of statements.',
      control: { kind: 'toggle' },
      value: p.prettierSemi,
    },
    {
      id: 'prettierSingleQuote',
      categories: ['ext-prettier'],
      label: 'Prettier: Single Quote',
      description: 'Use single quotes instead of double quotes.',
      control: { kind: 'toggle' },
      value: p.prettierSingleQuote,
    },
    {
      id: 'prettierTrailingComma',
      categories: ['ext-prettier'],
      label: 'Prettier: Trailing Comma',
      description: 'Print trailing commas wherever possible.',
      control: {
        kind: 'select',
        options: [
          { value: 'none', label: 'None' },
          { value: 'es5', label: 'ES5 (objects, arrays, ...)' },
          { value: 'all', label: 'All (including function parameters)' },
        ],
      },
      value: p.prettierTrailingComma,
    },
    {
      id: 'prettierPrintWidth',
      categories: ['ext-prettier'],
      label: 'Prettier: Print Width',
      description: 'The line length Prettier tries to wrap at.',
      control: { kind: 'number', min: 40, max: 200 },
      value: p.prettierPrintWidth,
    },
    {
      id: 'eslintEnabled',
      categories: ['ext-eslint'],
      label: 'ESLint: Enable',
      description: 'Lint JavaScript and JSX files as you type, using a curated set of core ESLint rules. TypeScript files aren’t linted — ESLint’s default parser can’t read TypeScript syntax.',
      control: { kind: 'toggle' },
      value: p.eslintEnabled,
    },
  ];
}

interface ExtensionInfo {
  id: string;
  name: string;
  publisher: string;
  description: string;
  icon: typeof Wand2;
  installed: boolean;
  unavailableReason?: string;
  settingsCategory?: CategoryId;
}

const EXTENSIONS: ExtensionInfo[] = [
  {
    id: 'prettier',
    name: 'Prettier — Code Formatter',
    publisher: 'Prettier',
    description:
      'Formats JavaScript, TypeScript, JSON, CSS, LESS, SCSS, HTML, Markdown, YAML, and GraphQL, using the real Prettier engine running entirely in your browser — no server round-trip.',
    icon: Wand2,
    installed: true,
    settingsCategory: 'ext-prettier',
  },
  {
    id: 'eslint',
    name: 'ESLint',
    publisher: 'ESLint',
    description:
      'Lints JavaScript and JSX using ESLint’s real core rules, running entirely in your browser. Problems show up as squiggly underlines in the editor and in the status bar’s problem counts.',
    icon: Bug,
    installed: true,
    settingsCategory: 'ext-eslint',
  },
  {
    id: 'gitlens',
    name: 'GitLens — Git Supercharged',
    publisher: 'GitKraken',
    description: 'Adds inline blame, history, and diff views on top of a real Git repository.',
    icon: GitBranch,
    installed: false,
    unavailableReason: 'Needs real Git integration — this platform doesn’t have one yet, which is also why there’s no Source Control icon in the Activity Bar.',
  },
  {
    id: 'python',
    name: 'Python',
    publisher: 'Microsoft',
    description: 'IntelliSense, debugging, and running Python files.',
    icon: FileCode2,
    installed: false,
    unavailableReason: 'Needs a Python language server (for IntelliSense) and an execution/debug backend — neither exists on this platform yet.',
  },
  {
    id: 'docker',
    name: 'Docker',
    publisher: 'Docker',
    description: 'Build, manage, and run containers and images from the editor.',
    icon: Package,
    installed: false,
    unavailableReason: 'Needs a real container runtime this platform can talk to — it doesn’t have one yet.',
  },
];

function ExtensionCard({ ext, onOpenExtension }: { ext: ExtensionInfo; onOpenExtension: (cat: CategoryId) => void }) {
  const Icon = ext.icon;
  return (
    <div className="flex items-start gap-3 p-3 rounded border border-[var(--wb-border-subtle)] bg-[var(--wb-fg)]/[0.02]">
      <div className="w-9 h-9 rounded bg-[var(--wb-control-bg)] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[var(--wb-fg)]/70" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-[var(--wb-fg)]/90">{ext.name}</span>
          {ext.installed ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--wb-accent-soft)]/30 text-[var(--wb-accent)] flex items-center gap-1 shrink-0">
              <CircleCheck className="w-3 h-3" /> Installed
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--wb-fg)]/10 text-[var(--wb-fg)]/50 shrink-0">Recommended</span>
          )}
        </div>
        <div className="text-[11px] text-[var(--wb-fg)]/40 mt-0.5">{ext.publisher}</div>
        <p className="text-[12px] text-[var(--wb-fg)]/55 mt-1.5 leading-relaxed">{ext.description}</p>
        {!ext.installed && ext.unavailableReason && <p className="text-[11px] text-amber-500/70 mt-1.5 leading-relaxed">{ext.unavailableReason}</p>}
      </div>
      {ext.installed && ext.settingsCategory && (
        <button
          onClick={() => onOpenExtension(ext.settingsCategory!)}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] rounded bg-[var(--wb-control-bg)] hover:bg-[var(--wb-control-bg-hover)] text-[var(--wb-fg)]/80 cursor-pointer"
        >
          <SettingsIcon className="w-3 h-3" /> Settings
        </button>
      )}
    </div>
  );
}

function SettingRow({ d, onChange }: { d: SettingDescriptor; onChange: (patch: Record<string, unknown>) => void }) {
  // Assigned to a plain local `const` rather than accessed as `d.control` at
  // each use — TS control-flow narrowing on `.kind` below doesn't otherwise
  // survive into the nested `onChange` closures further down.
  const control = d.control;
  return (
    <div className="mb-7 max-w-2xl">
      <div className="text-[13px] font-semibold text-[var(--wb-fg)]/90 mb-1.5">{d.label}</div>
      {control.kind === 'toggle' ? (
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={Boolean(d.value)}
            onChange={(e) => onChange({ [d.id]: e.target.checked })}
            className="mt-0.5 w-3.5 h-3.5 shrink-0 cursor-pointer accent-[var(--wb-accent-soft)]"
          />
          <span className="text-[12px] text-[var(--wb-fg)]/60 leading-relaxed">{d.description}</span>
        </label>
      ) : (
        <>
          <p className="text-[12px] text-[var(--wb-fg)]/50 mb-2 leading-relaxed">{d.description}</p>
          {control.kind === 'select' && (
            <select
              value={String(d.value)}
              onChange={(e) => onChange({ [d.id]: e.target.value })}
              className="bg-[var(--wb-control-bg)] border border-[var(--wb-border-strong)] rounded px-2 py-1.5 text-[12px] text-[var(--wb-fg)] outline-none min-w-[220px] cursor-pointer"
            >
              {control.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          {control.kind === 'number' && (
            <input
              type="number"
              min={control.min}
              max={control.max}
              value={Number(d.value)}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isNaN(n)) onChange({ [d.id]: Math.min(control.max, Math.max(control.min, n)) });
              }}
              className="bg-[var(--wb-control-bg)] border border-[var(--wb-border-strong)] rounded px-2 py-1.5 text-[12px] text-[var(--wb-fg)] outline-none w-24"
            />
          )}
          {control.kind === 'text' && (
            <input
              type="text"
              value={String(d.value)}
              onChange={(e) => onChange({ [d.id]: e.target.value })}
              className="bg-[var(--wb-control-bg)] border border-[var(--wb-border-strong)] rounded px-2 py-1.5 text-[12px] text-[var(--wb-fg)] outline-none w-full max-w-md font-mono"
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * A VS Code-style Settings page: searchable, categorized, and every control
 * on it reads/writes this app's real persisted preferences (the same ones
 * the View/File menus already read from) — nothing here is a mockup. The
 * Extensions category is the one place that isn't a settings list: it shows
 * what's genuinely installed (Prettier, ESLint — both run for real, in the
 * browser) versus what's recommended but can't function yet because the
 * backend it needs doesn't exist on this platform, explained honestly
 * rather than offered behind a dead Install button.
 */
export default function SettingsEditor(props: SettingsEditorProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId>('commonly-used');
  const descriptors = buildDescriptors(props);

  const trimmedQuery = query.trim().toLowerCase();
  const searchMatches = trimmedQuery
    ? descriptors.filter((d) => d.label.toLowerCase().includes(trimmedQuery) || d.description.toLowerCase().includes(trimmedQuery))
    : [];

  return (
    <div className="h-full flex flex-col bg-[var(--wb-surface)] text-[var(--wb-fg)] overflow-hidden">
      <div className="px-6 pt-4 pb-3 border-b border-[var(--wb-border-strong)] shrink-0">
        <div className="flex items-center gap-2 bg-[var(--wb-control-bg)] rounded px-3 py-1.5 max-w-2xl">
          <Search className="w-4 h-4 text-[var(--wb-fg)]/40 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search settings"
            className="flex-1 bg-transparent text-[13px] text-[var(--wb-fg)] outline-none placeholder:text-[var(--wb-fg)]/30 min-w-0"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 flex">
        <div className="w-56 shrink-0 border-r border-[var(--wb-border-strong)] overflow-y-auto py-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setQuery('');
                setCategory(item.id);
              }}
              className={`w-full text-left text-[13px] px-4 py-1.5 cursor-pointer ${item.indent ? 'pl-8' : ''} ${
                category === item.id && !trimmedQuery ? 'bg-[var(--wb-selected)] text-[var(--wb-fg)]' : 'text-[var(--wb-fg)]/65 hover:bg-[var(--wb-fg)]/5'
              }`}
            >
              {CATEGORY_LABELS[item.id]}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
          {trimmedQuery ? (
            searchMatches.length > 0 ? (
              <>
                <h1 className="text-[20px] font-semibold mb-5">{searchMatches.length} Setting{searchMatches.length === 1 ? '' : 's'} Found</h1>
                {searchMatches.map((d) => (
                  <div key={d.id}>
                    <div className="text-[10px] font-bold tracking-wide text-[var(--wb-fg)]/30 uppercase mb-1">{CATEGORY_LABELS[d.categories[0]]}</div>
                    <SettingRow d={d} onChange={props.onChange} />
                  </div>
                ))}
              </>
            ) : (
              <p className="text-[13px] text-[var(--wb-fg)]/40">No settings found matching &quot;{query}&quot;.</p>
            )
          ) : category === 'extensions' ? (
            <div className="max-w-2xl">
              <h1 className="text-[20px] font-semibold mb-1">Extensions</h1>
              <p className="text-[12px] text-[var(--wb-fg)]/40 mb-6 leading-relaxed">
                Formatting and linting below run for real, entirely in your browser. There&apos;s no plugin marketplace or extension runtime yet.
              </p>
              <div className="text-[11px] font-bold tracking-wide text-[var(--wb-fg)]/40 uppercase mb-2">Installed</div>
              <div className="flex flex-col gap-2 mb-7">
                {EXTENSIONS.filter((e) => e.installed).map((e) => (
                  <ExtensionCard key={e.id} ext={e} onOpenExtension={setCategory} />
                ))}
              </div>
              <div className="text-[11px] font-bold tracking-wide text-[var(--wb-fg)]/40 uppercase mb-2">Recommended</div>
              <div className="flex flex-col gap-2">
                {EXTENSIONS.filter((e) => !e.installed).map((e) => (
                  <ExtensionCard key={e.id} ext={e} onOpenExtension={setCategory} />
                ))}
              </div>
            </div>
          ) : (
            <>
              {(category === 'ext-prettier' || category === 'ext-eslint') && (
                <button
                  onClick={() => setCategory('extensions')}
                  className="flex items-center gap-1 text-[12px] text-[var(--wb-fg)]/50 hover:text-[var(--wb-fg)]/80 mb-3 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Extensions
                </button>
              )}
              <h1 className="text-[20px] font-semibold mb-5">{CATEGORY_LABELS[category]}</h1>
              {descriptors
                .filter((d) => d.categories.includes(category))
                .map((d) => (
                  <SettingRow key={d.id} d={d} onChange={props.onChange} />
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
