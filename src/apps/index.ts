import React, { lazy } from 'react';

/**
 * Application catalogue.
 *
 * Every application is loaded lazily so the shell boots without paying for
 * apps the user has not opened (CLAUDE.md §42). Each entry becomes its own
 * chunk; `ApplicationRenderer` supplies the loading state while it arrives.
 */
export const AppLauncher = lazy(() => import('./launcher'));
export const WebBrowser = lazy(() => import('./browser'));
export const Terminal = lazy(() => import('./terminal'));
export const FileManager = lazy(() => import('./file-explorer'));
export const Settings = lazy(() => import('./settings'));
export const Messenger = lazy(() => import('./messages'));
export const ClockApp = lazy(() => import('./clock'));
export const CodeEditor = lazy(() => import('./code-editor'));
export const PaintApp = lazy(() => import('./paint-studio'));
export const CalendarApp = lazy(() => import('./calendar'));
export const MeetingApp = lazy(() => import('./osx-meet'));
export const TrashApp = lazy(() => import('./trash-bin'));
export const MailApp = lazy(() => import('./mail-studio'));
export const CalculatorApp = lazy(() => import('./calculator'));
export const SpreadsheetApp = lazy(() => import('./spreadsheet'));
export const PresentationApp = lazy(() => import('./presentation'));
export const PDFViewerApp = lazy(() => import('./pdf-viewer'));
export const ContactsApp = lazy(() => import('./contacts'));
export const WordBookApp = lazy(() => import('./wordbook'));

/** Component type used across the registry, covering lazily loaded apps. */
export type ApplicationComponent = React.ComponentType<any> | React.LazyExoticComponent<React.ComponentType<any>>;

export const APPLICATION_MAP: Record<string, ApplicationComponent> = {
  launcher: AppLauncher,
  browser: WebBrowser,
  terminal: Terminal,
  fileManager: FileManager,
  settings: Settings,
  messenger: Messenger,
  clock: ClockApp,
  editor: CodeEditor,
  paint: PaintApp,
  calendar: CalendarApp,
  meeting: MeetingApp,
  trash: TrashApp,
  mail: MailApp,
  calculator: CalculatorApp,
  spreadsheet: SpreadsheetApp,
  presentation: PresentationApp,
  'pdf-viewer': PDFViewerApp,
  contacts: ContactsApp,
  wordbook: WordBookApp,
};

export interface ApplicationRendererProps {
  appId: string;
}

function LoadingApplication(): React.ReactElement {
  return React.createElement(
    'div',
    {
      className: 'flex h-full w-full items-center justify-center text-sm text-white/60',
      role: 'status',
      'aria-live': 'polite',
    },
    'Opening…',
  );
}

function UnknownApplication({ appId }: { appId: string }): React.ReactElement {
  return React.createElement(
    'div',
    { className: 'flex h-full w-full flex-col items-center justify-center gap-1 p-6 text-center text-white/70' },
    React.createElement('p', { className: 'text-sm font-medium' }, 'This application is not installed'),
    React.createElement('p', { className: 'text-xs text-white/50' }, `No application is registered for "${appId}".`),
  );
}

export const ApplicationRenderer: React.FC<ApplicationRendererProps> = ({ appId }) => {
  const Component = APPLICATION_MAP[appId];

  if (!Component) {
    return React.createElement(UnknownApplication, { appId });
  }

  return React.createElement(
    React.Suspense,
    { fallback: React.createElement(LoadingApplication) },
    React.createElement(Component as React.ComponentType<any>),
  );
};

export default ApplicationRenderer;
