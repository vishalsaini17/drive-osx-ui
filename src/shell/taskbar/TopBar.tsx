import React, { useState, useEffect } from 'react';
import { Wifi, Volume2, Battery, ChevronDown, Check, WifiOff, VolumeX } from 'lucide-react';
import { SystemSettings } from '../../platform/types';
import { useShellTheme } from '../../platform/theme/useShellTheme';

interface TopBarProps {
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  currentDesktop: number;
  setCurrentDesktop: (index: number) => void;
}

export default function TopBar({ settings, setSettings, currentDesktop, setCurrentDesktop }: TopBarProps) {
  const [isDesktopDropdownOpen, setIsDesktopDropdownOpen] = useState(false);
  const [isWifiDropdownOpen, setIsWifiDropdownOpen] = useState(false);
  const [isVolumeDropdownOpen, setIsVolumeDropdownOpen] = useState(false);
  const [isBatteryDropdownOpen, setIsBatteryDropdownOpen] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(94);
  const [isCharging, setIsCharging] = useState(true);
  const shell = useShellTheme();

  // Simulate a fluctuating battery level
  useEffect(() => {
    const timer = setInterval(() => {
      setBatteryLevel((prev) => {
        if (prev >= 100) return 90;
        return prev + 1;
      });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      id="os-topbar"
      /* Follows the wallpaper's tone, not a fixed dark wash: the bar sits
         directly on the desktop and a black film over a light wallpaper was
         the most visible seam in the shell. */
      className={`absolute top-0 left-0 right-0 h-10 backdrop-blur-2xl backdrop-saturate-150 border-b flex items-center justify-between px-5 text-sm select-none z-[9999] ${
        shell.isDark
          ? 'bg-gradient-to-b from-black/25 to-black/10 border-white/[0.08] text-white/90'
          : 'bg-gradient-to-b from-white/45 to-white/25 border-[#141020]/[0.07] text-[#141020]'
      }`}
    >
      {/* Left: Desktop Workspace Switcher */}
      <div className="relative">
        <button
          id="btn-workspace-switcher"
          onClick={() => {
            setIsDesktopDropdownOpen(!isDesktopDropdownOpen);
            setIsWifiDropdownOpen(false);
            setIsVolumeDropdownOpen(false);
            setIsBatteryDropdownOpen(false);
          }}
          className={`flex items-center gap-1.5 ${shell.hover} px-3 py-1 rounded-md transition-colors font-medium cursor-pointer`}
        >
          <span>Desktop {currentDesktop}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDesktopDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDesktopDropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsDesktopDropdownOpen(false)} />
            <div className={`absolute left-0 mt-1.5 w-44 ${shell.panel} rounded-xl p-1.5 shadow-2xl z-20 animate-in fade-in slide-in-from-top-1`}>
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setCurrentDesktop(num);
                    setIsDesktopDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between text-left px-3 py-1.5 rounded-lg ${shell.hover} transition-colors text-xs`}
                >
                  <span>Desktop Workspace {num}</span>
                  {currentDesktop === num && <Check className="w-3.5 h-3.5" style={{ color: shell.accentColor }} />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right: Quick Action Tray Status Icons */}
      <div className="flex items-center gap-4">
        {/* Wi-Fi Control */}
        <div className="relative">
          <button
            id="btn-wifi-status"
            onClick={() => {
              setIsWifiDropdownOpen(!isWifiDropdownOpen);
              setIsDesktopDropdownOpen(false);
              setIsVolumeDropdownOpen(false);
              setIsBatteryDropdownOpen(false);
            }}
            className={`${shell.hover} p-1.5 rounded-md transition-colors cursor-pointer`}
            title="Wi-Fi Status"
          >
            {settings.wifiStatus === 'connected' ? (
              <Wifi className={`w-4 h-4 ${shell.text}`} />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-400" />
            )}
          </button>

          {isWifiDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsWifiDropdownOpen(false)} />
              <div className={`absolute right-0 mt-1.5 w-60 ${shell.panel} rounded-xl p-3 shadow-2xl z-20 animate-in fade-in slide-in-from-top-1`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs">Wi-Fi Connection</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${settings.wifiStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                    {settings.wifiStatus === 'connected' ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <p className={`text-[11px] mb-3 ${shell.textMuted}`}>
                  {settings.wifiStatus === 'connected' ? 'Connected to "WebOS_HighSpeed_5G"' : 'No internet connection detected'}
                </p>
                <button
                  onClick={() => {
                    setSettings(prev => ({
                      ...prev,
                      wifiStatus: prev.wifiStatus === 'connected' ? 'disconnected' : 'connected'
                    }));
                  }}
                  className={`w-full py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    settings.wifiStatus === 'connected'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {settings.wifiStatus === 'connected' ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Volume Control */}
        <div className="relative">
          <button
            id="btn-volume-control"
            onClick={() => {
              setIsVolumeDropdownOpen(!isVolumeDropdownOpen);
              setIsDesktopDropdownOpen(false);
              setIsWifiDropdownOpen(false);
              setIsBatteryDropdownOpen(false);
            }}
            className={`${shell.hover} p-1.5 rounded-md transition-colors cursor-pointer`}
            title="Audio Settings"
          >
            {settings.volume === 0 || !settings.soundsEnabled ? (
              <VolumeX className={`w-4 h-4 ${shell.textSubtle}`} />
            ) : (
              <Volume2 className={`w-4 h-4 ${shell.text}`} />
            )}
          </button>

          {isVolumeDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsVolumeDropdownOpen(false)} />
              <div className={`absolute right-0 mt-1.5 w-56 ${shell.panel} rounded-xl p-3.5 shadow-2xl z-20 animate-in fade-in slide-in-from-top-1`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs">Volume Control</span>
                  <span className={`text-xs ${shell.textMuted}`}>{settings.soundsEnabled ? `${settings.volume}%` : 'Muted'}</span>
                </div>
                <div className="flex items-center gap-3.5">
                  <button
                    onClick={() => {
                      setSettings(prev => ({ ...prev, soundsEnabled: !prev.soundsEnabled }));
                    }}
                    className={`p-1 ${shell.hover} rounded`}
                  >
                    {settings.soundsEnabled && settings.volume > 0 ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.soundsEnabled ? settings.volume : 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setSettings(prev => ({
                        ...prev,
                        volume: val,
                        soundsEnabled: val > 0 ? true : prev.soundsEnabled
                      }));
                    }}
                    className={`w-full h-1 rounded-lg appearance-none cursor-pointer accent-pink-500 ${shell.isDark ? "bg-white/20" : "bg-black/15"}`}
                  />
                </div>
                <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                  <label className={`text-[11px] flex items-center gap-1.5 cursor-pointer ${shell.textMuted}`}>
                    <input
                      type="checkbox"
                      checked={settings.soundsEnabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, soundsEnabled: e.target.checked }))}
                      className="rounded border-white/10 accent-pink-500"
                    />
                    System Sound Effects
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Battery Control */}
        <div className="relative">
          <button
            id="btn-battery-status"
            onClick={() => {
              setIsBatteryDropdownOpen(!isBatteryDropdownOpen);
              setIsDesktopDropdownOpen(false);
              setIsWifiDropdownOpen(false);
              setIsVolumeDropdownOpen(false);
            }}
            className={`${shell.hover} p-1.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer`}
            title="Power Settings"
          >
            <Battery className={`w-4 h-4 ${shell.text}`} />
            <span className="text-xs font-medium">{batteryLevel}%</span>
          </button>

          {isBatteryDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsBatteryDropdownOpen(false)} />
              <div className={`absolute right-0 mt-1.5 w-56 ${shell.panel} rounded-xl p-3 shadow-2xl z-20 animate-in fade-in slide-in-from-top-1 text-xs`}>
                <div className="font-semibold mb-1.5">Power Source</div>
                <div className={`flex justify-between items-center mb-2 ${shell.textMuted}`}>
                  <span>Battery Status:</span>
                  <span className="font-medium text-emerald-400">{isCharging ? 'Charging' : 'On Battery'}</span>
                </div>
                <div className={`w-full h-2.5 rounded-full overflow-hidden mb-3 ${shell.isDark ? "bg-white/10" : "bg-black/10"}`}>
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${batteryLevel}%` }}
                  />
                </div>
                <p className={`text-[10px] ${shell.textSubtle}`}>
                  {isCharging ? 'Fully charged in 18 minutes' : '8 hours 12 minutes remaining'}
                </p>
                <div className="mt-2.5 pt-2 border-t border-white/5 flex justify-between">
                  <button 
                    onClick={() => setIsCharging(!isCharging)}
                    style={{ color: shell.accentColor }}
                    className={`w-full text-center py-1 rounded text-[10px] ${shell.hover}`}
                  >
                    Simulate {isCharging ? 'Unplugging' : 'Plugging in'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
