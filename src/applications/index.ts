import React from 'react';
import AppLauncher from './launcher';
import WebBrowser from './browser';
import Terminal from './terminal';
import FileManager from './file-explorer';
import Settings from './settings';
import Messenger from './messages';
import ClockApp from './clock';
import TextEditor from './text-editor';
import PaintApp from './paint-studio';
import CalendarApp from './calendar';
import MeetingApp from './osx-meet';
import TrashApp from './trash-bin';
import MailApp from './mail-studio';
import CalculatorApp from './calculator';
import SpreadsheetApp from './spreadsheet';
import PresentationApp from './presentation';
import PDFViewerApp from './pdf-viewer';

export {
  AppLauncher,
  WebBrowser,
  Terminal,
  FileManager,
  Settings,
  Messenger,
  ClockApp,
  TextEditor,
  PaintApp,
  CalendarApp,
  MeetingApp,
  TrashApp,
  MailApp,
  CalculatorApp,
  SpreadsheetApp,
  PresentationApp,
  PDFViewerApp,
};

export const APPLICATION_MAP: Record<string, React.ComponentType<any>> = {
  launcher: AppLauncher,
  browser: WebBrowser,
  terminal: Terminal,
  fileManager: FileManager,
  settings: Settings,
  messenger: Messenger,
  clock: ClockApp,
  editor: TextEditor,
  paint: PaintApp,
  calendar: CalendarApp,
  meeting: MeetingApp,
  trash: TrashApp,
  mail: MailApp,
  calculator: CalculatorApp,
  spreadsheet: SpreadsheetApp,
  presentation: PresentationApp,
  'pdf-viewer': PDFViewerApp,
};

export interface ApplicationRendererProps {
  appId: string;
}

export const ApplicationRenderer: React.FC<ApplicationRendererProps> = ({ appId }) => {
  const Component = APPLICATION_MAP[appId];
  if (!Component) return null;
  return React.createElement(Component);
};

export default ApplicationRenderer;
