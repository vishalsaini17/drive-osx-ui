import React from 'react';
import { X, Settings as SettingsIcon, RotateCcw, Sun, Moon, Monitor, Palette } from 'lucide-react';
import { useSystemStore } from '../state/systemStore';
import { AppRegistry, SettingsField } from '../../platform/registry/AppRegistry';
import { ToggleSwitch } from '../../design-system/components/ToggleSwitch';
import { useAppTheme } from '../../platform/theme/useAppTheme';
import type { AppThemeChoice } from '../../platform/theme/appTheme';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Whose `settingsSchema` (and `appPreferences` slice) this dialog reads and writes — never any other app's. */
  appId: string;
  appTitle: string;
}

const THEME_ICONS: Record<AppThemeChoice, React.ComponentType<any>> = {
  theme: Palette,
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/**
 * One application's own settings — driven entirely by that app's
 * `AppManifest.settingsSchema`, reading and writing only its own
 * `settings.appPreferences[appId]` slice via `updateAppPreference` (the
 * Theme row uses the same slice through `useAppTheme`, so it lives here
 * rather than in a separate, shared dialog). Nothing shown here can affect
 * any other app or the platform's own global settings (those live in the
 * System Settings app instead).
 */
export default function AppSettingsModal({ isOpen, onClose, appId, appTitle }: AppSettingsModalProps) {
  const appPrefs = useSystemStore((state) => state.settings.appPreferences?.[appId]);
  const updateAppPreference = useSystemStore((state) => state.updateAppPreference);
  const resetAppPreferences = useSystemStore((state) => state.resetAppPreferences);
  const appTheme = useAppTheme(appId);

  if (!isOpen) return null;

  const manifest = AppRegistry.getAppManifest(appId);
  const schema: SettingsField[] = manifest?.settingsSchema ?? [];
  const valueFor = (field: SettingsField) => appPrefs?.[field.id] ?? field.defaultValue;

  // Governs the size this app's window opens at next — not a live resize of
  // a window already on screen, same as the equivalent platform-wide control
  // in System Settings. `undefined` means "use this app's own built-in
  // default", shown as the placeholder rather than baked into the value.
  const windowWidth = typeof appPrefs?.windowWidth === 'number' ? appPrefs.windowWidth : undefined;
  const windowHeight = typeof appPrefs?.windowHeight === 'number' ? appPrefs.windowHeight : undefined;

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden font-sans">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0">
              <SettingsIcon size={16} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-900 truncate">{appTitle} Settings</h2>
              <p className="text-[11px] text-slate-500">Only affects {appTitle} — not shared with other applications</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 cursor-pointer shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
          <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800">Theme</div>
              <div className="text-[11px] text-slate-500 leading-snug mt-0.5">{appTheme.describe(appTitle)}</div>
            </div>
            <div className="shrink-0 flex items-center gap-1 flex-wrap justify-end">
              {appTheme.options.map((option) => {
                const Icon = THEME_ICONS[option.value];
                return (
                  <button
                    key={option.value}
                    onClick={() => appTheme.setChoice(option.value)}
                    title={option.description}
                    aria-pressed={appTheme.choice === option.value}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
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
          </div>

          {manifest && (
            <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-800">Default Window Size</div>
                <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                  The size {appTitle} opens at. Leave blank to use its built-in default ({manifest.defaultWindow.w} × {manifest.defaultWindow.h}px).
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <input
                  type="number"
                  min={manifest.defaultWindow.minW}
                  placeholder={String(manifest.defaultWindow.w)}
                  value={windowWidth ?? ''}
                  onChange={(e) =>
                    updateAppPreference(appId, 'windowWidth', e.target.value ? Math.max(manifest.defaultWindow.minW, Number(e.target.value)) : undefined)
                  }
                  className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-[11px] text-slate-800"
                />
                <span className="text-slate-400 text-[11px]">×</span>
                <input
                  type="number"
                  min={manifest.defaultWindow.minH}
                  placeholder={String(manifest.defaultWindow.h)}
                  value={windowHeight ?? ''}
                  onChange={(e) =>
                    updateAppPreference(appId, 'windowHeight', e.target.value ? Math.max(manifest.defaultWindow.minH, Number(e.target.value)) : undefined)
                  }
                  className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-[11px] text-slate-800"
                />
              </div>
            </div>
          )}

          {schema.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">{appTitle} has no other configurable settings yet.</p>
          ) : (
            schema.map((field) => (
              <div key={field.id} className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800">{field.label}</div>
                </div>
                <div className="shrink-0">
                  {field.type === 'toggle' && (
                    <ToggleSwitch
                      checked={Boolean(valueFor(field))}
                      onChange={(next) => updateAppPreference(appId, field.id, next)}
                    />
                  )}
                  {field.type === 'select' && (
                    <select
                      value={String(valueFor(field))}
                      onChange={(e) => updateAppPreference(appId, field.id, e.target.value)}
                      className="px-2 py-1 border border-slate-300 rounded-lg text-[11px] cursor-pointer text-slate-800"
                    >
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={String(valueFor(field))}
                      onChange={(e) => updateAppPreference(appId, field.id, e.target.value)}
                      className="px-2 py-1 border border-slate-300 rounded-lg text-[11px] text-slate-800 w-40"
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={() => resetAppPreferences(appId)}
            className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-red-600 cursor-pointer"
          >
            <RotateCcw size={12} /> Reset to defaults
          </button>
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
