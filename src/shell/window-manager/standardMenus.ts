import {
  Copy, HelpCircle, Info, Keyboard, Maximize2, Minimize2, PanelTop,
  Plus, X, Layers,
} from 'lucide-react';
import { Menu, separator } from '../../platform/menus/types';
import { WindowState } from '../../platform/types';

interface StandardMenuOptions {
  app: WindowState;
  onNewWindow: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onBringToFront: () => void;
  onShortcuts: () => void;
  onAbout: () => void;
  onHelp: () => void;
  otherWindows: WindowState[];
  onFocusWindow: (id: string) => void;
}

/**
 * The Window and Help menus every application receives.
 *
 * Applications contribute their own File/Edit/View menus; these two are
 * appended by the shell so the same commands sit in the same place
 * everywhere, as they do on a desktop OS.
 */
export function buildStandardMenus(options: StandardMenuOptions): Menu[] {
  const {
    app, onNewWindow, onMinimize, onMaximize, onClose, onBringToFront,
    onShortcuts, onAbout, onHelp, otherWindows, onFocusWindow,
  } = options;

  const windowMenu: Menu = {
    id: 'window',
    label: 'Window',
    items: [
      { id: 'new-window', label: 'New Window', shortcut: 'Ctrl+N', icon: Plus, onSelect: onNewWindow },
      separator(),
      { id: 'minimize', label: 'Minimise', shortcut: 'Ctrl+M', icon: Minimize2, onSelect: onMinimize },
      {
        id: 'maximize',
        label: app.isMaximized ? 'Restore' : 'Maximise',
        icon: Maximize2,
        onSelect: onMaximize,
      },
      { id: 'front', label: 'Bring to Front', icon: PanelTop, onSelect: onBringToFront },
      separator(),
      ...(otherWindows.length > 0
        ? [
            { kind: 'submenu' as const, id: 'switch', label: 'Switch To', icon: Layers,
              items: otherWindows.map((other) => ({
                id: `switch-${other.id}`,
                label: other.title,
                selected: false,
                onSelect: () => onFocusWindow(other.id),
              })),
            },
            separator(),
          ]
        : []),
      { id: 'close', label: 'Close Window', shortcut: 'Ctrl+W', icon: X, danger: true, onSelect: onClose },
    ],
  };

  const helpMenu: Menu = {
    id: 'help',
    label: 'Help',
    items: [
      { id: 'shortcuts', label: 'Keyboard Shortcuts', shortcut: 'Ctrl+/', icon: Keyboard, onSelect: onShortcuts },
      { id: 'help', label: `${app.title} Help`, shortcut: 'F1', icon: HelpCircle, onSelect: onHelp },
      separator(),
      { id: 'about', label: `About ${app.title}`, icon: Info, onSelect: onAbout },
    ],
  };

  return [windowMenu, helpMenu];
}

/** Shared clipboard entries, so Edit menus look the same across apps. */
export function clipboardItems(handlers: {
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
}) {
  return [
    { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X', disabled: !handlers.onCut, onSelect: handlers.onCut ?? (() => {}) },
    { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', icon: Copy, disabled: !handlers.onCopy, onSelect: handlers.onCopy ?? (() => {}) },
    { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', disabled: !handlers.onPaste, onSelect: handlers.onPaste ?? (() => {}) },
  ];
}
