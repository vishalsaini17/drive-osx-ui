import React, { useState } from 'react';
import {
  X, Monitor, Sun, Moon, Maximize2, LayoutGrid, MousePointer2, Bell,
  Palette, Terminal as TerminalIcon, Volume2, Sparkles, MessageSquare,
} from 'lucide-react';
import { useSystemStore } from '../state/systemStore';
import { SystemSettings } from '../../platform/types';
import { AppRegistry } from '../../platform/registry/AppRegistry';
import { useAppTheme } from '../../platform/theme/useAppTheme';
import {
  APP_THEME_CHOICES, type AppThemeChoice,
} from '../../platform/theme/appTheme';

interface PreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** The window this dialog was opened from, so Appearance → Theme controls its app. */
  appId: string;
  appTitle: string;
}

type Section = 'appearance' | 'windows' | 'applications' | 'system';

const THEME_ICONS: Record<AppThemeChoice, React.ComponentType<any>> = {
  theme: Palette,
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/**
 * One application's theme preference.
 *
 * A component rather than a loop body because each row subscribes to its own
 * application's stored choice through `useAppTheme`.
 */
function AppThemeRow({ appId, title }: { appId: string; title: string }) {
  const { choice, setChoice, describe } = useAppTheme(appId);

  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <div className="text-xs font-bold text-slate-800">{title}</div>
        <div className="text-[11px] text-slate-500 leading-snug">{describe(title)}</div>
      </div>
      <div className="shrink-0 flex items-center gap-1">
        {APP_THEME_CHOICES.map((option) => {
          const Icon = THEME_ICONS[option.value];
          return (
            <button
              key={option.value}
              onClick={() => setChoice(option.value)}
              title={option.description}
              aria-pressed={choice === option.value}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                choice === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Icon size={12} />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Maps the three user-facing theme modes onto the concrete themes. */
export function resolveTheme(mode: SystemSettings['themeMode'], explicit: SystemSettings['theme']) {
  if (mode === 'light') return 'classic-light';
  if (mode === 'dark') return 'modern-dark';
  if (mode === 'system') {
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'modern-dark' : 'classic-light';
  }
  return explicit;
}

export default function PreferencesDialog({ isOpen, onClose, appId, appTitle }: PreferencesDialogProps) {
  const settings = useSystemStore((state) => state.settings);
  const setSettings = useSystemStore((state) => state.setSettings);
  const [section, setSection] = useState<Section>('appearance');
  const appTheme = useAppTheme(appId);

  if (!isOpen) return null;

  const update = (patch: Partial<SystemSettings>) => setSettings((prev) => ({ ...prev, ...patch }));

  const themeMode = settings.themeMode ?? 'light';
  const windowMode = settings.defaultWindowMode ?? 'custom';
  const placement = settings.defaultWindowPlacement ?? 'app-default';

  const sections: { id: Section; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'windows', label: 'Windows', icon: LayoutGrid },
    { id: 'applications', label: 'Applications', icon: MessageSquare },
    { id: 'system', label: 'System', icon: Sparkles },
  ];

  // Every installed application gets a theme preference, listed alphabetically
  // so the list does not reshuffle as the registry grows.
  const appManifests = [...AppRegistry.getAppManifests()].sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  const row = (label: string, description: string, control: React.ReactNode) => (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <div className="text-xs font-bold text-slate-800">{label}</div>
        <div className="text-[11px] text-slate-500 leading-snug">{description}</div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );

  const toggle = (value: boolean, onChange: (next: boolean) => void) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-5.5 rounded-full relative transition-colors cursor-pointer ${
        value ? 'bg-blue-600' : 'bg-slate-300'
      }`}
      role="switch"
      aria-checked={value}
    >
      <span
        className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${
          value ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden font-sans">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Preferences</h2>
              <p className="text-[11px] text-slate-500">Settings shared by every application</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex">
          <div className="w-40 shrink-0 border-r border-slate-200 bg-slate-50/60 p-2 flex flex-col gap-0.5">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`px-2.5 py-2 rounded-lg text-left text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                  section === id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-0 overflow-y-auto p-4 custom-scrollbar">
            {section === 'appearance' && (
              <>
                {row(
                  'Theme',
                  appTheme.describe(appTitle),
                  <div className="flex items-center gap-1">
                    {appTheme.options.map((option) => {
                      const Icon = THEME_ICONS[option.value];
                      return (
                        <button
                          key={option.value}
                          onClick={() => appTheme.setChoice(option.value)}
                          title={option.description}
                          aria-pressed={appTheme.choice === option.value}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                            appTheme.choice === option.value
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <Icon size={12} />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {row(
                  'Terminal theme',
                  'Use the retro green terminal look instead.',
                  toggle(settings.theme === 'retro-terminal', (next) =>
                    update(
                      next
                        ? { theme: 'retro-terminal' }
                        : { theme: resolveTheme(themeMode, 'classic-light') }
                    )
                  )
                )}

                {row(
                  'Accent colour',
                  'Highlight colour used across the environment.',
                  <input
                    type="color"
                    value={settings.accentColor || '#8b5cf6'}
                    onChange={(e) => update({ accentColor: e.target.value })}
                    className="w-9 h-7 rounded border border-slate-300 cursor-pointer"
                  />
                )}

                {row(
                  'Interface font',
                  'Font family used by the shell.',
                  <select
                    value={settings.fontFamily || 'Poppins'}
                    onChange={(e) => update({ fontFamily: e.target.value })}
                    className="px-2 py-1 border border-slate-300 rounded-lg text-[11px] cursor-pointer"
                  >
                    {['Poppins', 'Inter', 'Roboto', 'Georgia', 'JetBrains Mono'].map((font) => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                )}

                {row(
                  'Reduce motion',
                  'Turn off window and menu animations.',
                  toggle(settings.reduceMotion ?? false, (next) => update({ reduceMotion: next }))
                )}
              </>
            )}

            {section === 'windows' && (
              <>
                {row(
                  'Open windows',
                  'Whether applications start maximised or at a set size.',
                  <div className="flex items-center gap-1">
                    {([
                      { id: 'maximized', label: 'Maximised', icon: Maximize2 },
                      { id: 'custom', label: 'Custom size', icon: LayoutGrid },
                    ] as const).map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => update({ defaultWindowMode: id })}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                          windowMode === id ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Icon size={12} />
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {windowMode === 'custom' &&
                  row(
                    'Default window size',
                    'Leave blank to use each application’s own size.',
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        placeholder="Auto"
                        value={settings.defaultWindowWidth ?? ''}
                        onChange={(e) =>
                          update({ defaultWindowWidth: e.target.value ? Number(e.target.value) : undefined })
                        }
                        className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-[11px]"
                      />
                      <span className="text-slate-400 text-[11px]">×</span>
                      <input
                        type="number"
                        placeholder="Auto"
                        value={settings.defaultWindowHeight ?? ''}
                        onChange={(e) =>
                          update({ defaultWindowHeight: e.target.value ? Number(e.target.value) : undefined })
                        }
                        className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-[11px]"
                      />
                    </div>
                  )}

                {windowMode === 'custom' &&
                  row(
                    'Window position',
                    'Where a newly opened window is placed.',
                    <select
                      value={placement}
                      onChange={(e) =>
                        update({ defaultWindowPlacement: e.target.value as SystemSettings['defaultWindowPlacement'] })
                      }
                      className="px-2 py-1 border border-slate-300 rounded-lg text-[11px] cursor-pointer"
                    >
                      <option value="app-default">Application default</option>
                      <option value="center">Centre of screen</option>
                      <option value="cascade">Cascade</option>
                      <option value="custom">Fixed position</option>
                    </select>
                  )}

                {windowMode === 'custom' &&
                  placement === 'custom' &&
                  row(
                    'Fixed position',
                    'Coordinates used for every new window.',
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={settings.defaultWindowX ?? 120}
                        onChange={(e) => update({ defaultWindowX: Number(e.target.value) })}
                        className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-[11px]"
                      />
                      <span className="text-slate-400 text-[11px]">,</span>
                      <input
                        type="number"
                        value={settings.defaultWindowY ?? 80}
                        onChange={(e) => update({ defaultWindowY: Number(e.target.value) })}
                        className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-[11px]"
                      />
                    </div>
                  )}

                {row(
                  'Remember window layout',
                  'Reopen each application where it was last left.',
                  toggle(settings.rememberWindowGeometry ?? false, (next) =>
                    update({ rememberWindowGeometry: next })
                  )
                )}

                {row(
                  'Show menu button',
                  'Display the application menu icon in window title bars.',
                  toggle(settings.showWindowMenuBar ?? true, (next) => update({ showWindowMenuBar: next }))
                )}

                {row(
                  'Focus follows mouse',
                  'Activate a window when the pointer moves over it.',
                  toggle(settings.focusFollowsMouse ?? false, (next) => update({ focusFollowsMouse: next }))
                )}

                {row(
                  'Confirm before closing',
                  'Ask when a window still has unsaved work.',
                  toggle(settings.confirmOnClose ?? true, (next) => update({ confirmOnClose: next }))
                )}
              </>
            )}

            {section === 'applications' && (
              <>
                <div className="pb-2 mb-1 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-800">Application themes</div>
                  <div className="text-[11px] text-slate-500 leading-snug">
                    <strong>Theme</strong> follows the global theme in Appearance;{' '}
                    <strong>System</strong> follows your operating system;{' '}
                    <strong>Light</strong> and <strong>Dark</strong> stay put. The same choice is
                    on each application&rsquo;s own Preferences &rarr; Appearance.
                  </div>
                </div>

                {appManifests.map((manifest) => (
                  <AppThemeRow key={manifest.id} appId={manifest.id} title={manifest.title} />
                ))}
              </>
            )}

            {section === 'system' && (
              <>
                {row(
                  'Interface sounds',
                  'Play a click when interacting with the shell.',
                  toggle(settings.soundsEnabled, (next) => update({ soundsEnabled: next }))
                )}

                {row(
                  'Volume',
                  'System output level.',
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={settings.volume}
                    onChange={(e) => update({ volume: Number(e.target.value) })}
                    className="w-32 accent-blue-600 cursor-pointer"
                  />
                )}

                {row(
                  'Notifications',
                  'Show toasts from applications.',
                  toggle(settings.notificationsEnabled ?? true, (next) =>
                    update({ notificationsEnabled: next })
                  )
                )}

                {row(
                  'Do not disturb',
                  'Silence notifications entirely.',
                  toggle(settings.dndEnabled ?? false, (next) => update({ dndEnabled: next }))
                )}

                {row(
                  'Clock format',
                  'How the time is shown in the top bar.',
                  <select
                    value={settings.clockFormat || '12h'}
                    onChange={(e) => update({ clockFormat: e.target.value as '12h' | '24h' })}
                    className="px-2 py-1 border border-slate-300 rounded-lg text-[11px] cursor-pointer"
                  >
                    <option value="12h">12 hour</option>
                    <option value="24h">24 hour</option>
                  </select>
                )}

                {row(
                  'Dock size',
                  'Size of the application dock.',
                  <select
                    value={settings.dockSize}
                    onChange={(e) => update({ dockSize: e.target.value as 'sm' | 'md' | 'lg' })}
                    className="px-2 py-1 border border-slate-300 rounded-lg text-[11px] cursor-pointer"
                  >
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                  </select>
                )}
              </>
            )}
          </div>
        </div>

        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-slate-500">Changes apply immediately</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
