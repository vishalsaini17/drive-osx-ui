import React, { useState, useEffect } from 'react';
import { Search, Home, MoreVertical, ChevronRight } from 'lucide-react';
import { useSystemStore } from '../../systemStore';

export default function Settings() {
  const settings = useSystemStore((state) => state.settings);
  const setSettings = useSystemStore((state) => state.setSettings);
  const activeTheme = settings.theme || 'classic-light';

  const [activeCategory, setActiveCategory] = useState<string>('Appearance');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolution, setResolution] = useState('');

  // Fetch screen resolution
  useEffect(() => {
    const handleResize = () => {
      setResolution(`${window.innerWidth} x ${window.innerHeight}`);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const categories = [
    { id: 'Appearance', label: 'Appearance' },
    { id: 'Workspace Behavior', label: 'Workspace Behavior' },
    { id: 'Window Management', label: 'Window Management' },
    { id: 'Shortcuts', label: 'Shortcuts' },
    { id: 'Startup and Shutdown', label: 'Startup and Shutdown' },
    { id: 'Search', label: 'Search' },
    { id: 'Notifications', label: 'Notifications' },
    { id: 'Users', label: 'Users' },
    { id: 'Languages', label: 'Languages' },
    { id: 'Accessability', label: 'Accessibility' },
    { id: 'Applications', label: 'Applications' },
    { id: 'Online Accounts', label: 'Online Accounts' },
  ];

  const filteredCategories = categories.filter(cat =>
    cat.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedFont = settings.fontFamily || 'Poppins';

  // Dynamic Theme Styling
  const themeStyles = {
    'classic-light': {
      text: 'text-[#211625]',
      subText: 'text-[#211625]/60',
      boldText: 'text-[#211625]',
      border: 'border-black/5',
      sidebar: 'bg-black/5 border-r border-black/5',
      categoryItem: 'text-[#211625]/75 hover:bg-black/5',
      categoryActive: 'bg-black/10 font-medium text-[#211625]',
      input: 'bg-white/65 border-[#211625]/15 focus:ring-purple-500/40 text-[#211625] placeholder-[#211625]/40',
      btn: 'bg-white/45 border-white/60 hover:bg-white/75 hover:border-purple-500/30 text-[#211625]',
      card: 'bg-white/40 border-white/50 p-4 rounded-xl',
      title: 'text-xl font-medium tracking-tight text-[#211625]',
      sectionHeader: 'text-xs font-semibold uppercase tracking-wider text-[#211625]/60 mb-3',
      interactiveBtn: 'bg-black/5 border-black/5 hover:bg-black/10 text-[#211625]/80',
      interactiveBtnActive: 'bg-[#211625] text-white border-[#211625]',
    },
    'modern-dark': {
      text: 'text-[#f3eef8]',
      subText: 'text-[#f3eef8]/60',
      boldText: 'text-[#f3eef8]',
      border: 'border-white/10',
      sidebar: 'bg-black/20 border-r border-white/10',
      categoryItem: 'text-[#f3eef8]/80 hover:bg-white/5',
      categoryActive: 'bg-white/10 font-medium text-[#f3eef8]',
      input: 'bg-black/30 border-white/15 focus:ring-purple-500/60 text-[#f3eef8] placeholder-[#f3eef8]/40',
      btn: 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/30 text-[#f3eef8]',
      card: 'bg-black/25 border-white/10 p-4 rounded-xl',
      title: 'text-xl font-medium tracking-tight text-[#f3eef8]',
      sectionHeader: 'text-xs font-semibold uppercase tracking-wider text-[#f3eef8]/60 mb-3',
      interactiveBtn: 'bg-white/5 border-white/5 hover:bg-white/10 text-[#f3eef8]/85',
      interactiveBtnActive: 'bg-purple-600 text-white border-purple-600 shadow-md',
    },
    'retro-terminal': {
      text: 'text-[#22c55e]',
      subText: 'text-[#22c55e]/60',
      boldText: 'text-[#22c55e] font-bold',
      border: 'border-green-500/25',
      sidebar: 'bg-black/40 border-r border-green-500/25',
      categoryItem: 'text-[#22c55e]/80 hover:bg-green-500/10',
      categoryActive: 'bg-green-500/20 font-bold text-green-400',
      input: 'bg-black/60 border-green-500/35 focus:ring-green-400 text-[#22c55e] placeholder-green-500/40 font-mono',
      btn: 'bg-black/40 border-green-500/20 hover:bg-green-500/10 hover:border-green-400 text-[#22c55e]',
      card: 'bg-black/30 border-green-500/20 p-4 rounded-xl',
      title: 'text-xl font-bold tracking-tight text-[#22c55e]',
      sectionHeader: 'text-xs font-semibold uppercase tracking-wider text-[#22c55e]/60 mb-3',
      interactiveBtn: 'bg-black/40 border-green-500/20 hover:bg-green-500/10 text-[#22c55e]/80',
      interactiveBtnActive: 'bg-green-500 text-black border-green-500 font-bold',
    },
  };

  const ts = themeStyles[activeTheme] || themeStyles['classic-light'];

  return (
    <div className={`h-full flex text-sm select-none bg-transparent ${ts.text}`}>
      {/* 1. SETTINGS CATEGORIES SIDEBAR */}
      <div className={`w-56 p-3 flex flex-col shrink-0 ${ts.sidebar}`}>
        
        {/* Sidebar Search section */}
        <div className="flex items-center gap-1.5 mb-4 px-1">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full text-xs rounded-lg pl-8 pr-2.5 py-1.5 outline-none border focus:bg-white/10 ${ts.input}`}
            />
          </div>
          
          <button 
            onClick={() => setActiveCategory('Appearance')} 
            className={`p-1.5 rounded-lg hover:bg-black/5 opacity-85 cursor-pointer`}
            title="System Home"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
          
          <button className={`p-1.5 rounded-lg hover:bg-black/5 opacity-85 cursor-pointer`}>
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Categories list */}
        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
          {filteredCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`w-full text-left px-3 py-1.5 rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                activeCategory === cat.id ? ts.categoryActive : ts.categoryItem
              }`}
            >
              <span className="text-xs">{cat.label}</span>
              <ChevronRight className="w-3 h-3 opacity-40" />
            </button>
          ))}
        </div>
      </div>

      {/* 2. SETTINGS MAIN VIEW AREA */}
      <div className="flex-1 p-6 overflow-y-auto bg-transparent">
        {/* Category: Appearance */}
        {activeCategory === 'Appearance' && (
          <div className="space-y-6">
            <div>
              <h2 className={ts.title}>Appearance</h2>
            </div>

            {/* Theme Section */}
            <div>
              <h3 className={ts.sectionHeader}>Theme:</h3>
              <div className="flex gap-4">
                
                {/* Light Theme Card */}
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, wallpaper: 'wave-default', theme: 'classic-light' }))}
                    className={`w-32 h-20 rounded-xl overflow-hidden border-2 relative transition-all shadow-sm cursor-pointer ${
                      settings.theme === 'classic-light' 
                        ? 'border-purple-500 scale-[1.02]' 
                        : 'border-black/5 hover:border-black/20'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900 via-[#bd2c8e] to-[#ec4899]" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/20 to-transparent p-1.5">
                      <span className="text-[9px] font-bold text-white tracking-wide">Light</span>
                    </div>
                  </button>
                  <span className={`text-[11px] text-center font-medium ${ts.subText}`}>
                    Light {settings.theme === 'classic-light' && '(Selected)'}
                  </span>
                </div>

                {/* Dark Theme Card */}
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, wallpaper: 'deep-space', theme: 'modern-dark' }))}
                    className={`w-32 h-20 rounded-xl overflow-hidden border-2 relative transition-all shadow-sm cursor-pointer ${
                      settings.theme === 'modern-dark' 
                        ? 'border-purple-500 scale-[1.02]' 
                        : 'border-black/5 hover:border-black/20'
                    }`}
                  >
                    <div className="absolute inset-0 bg-[#0c0a15] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#130d22] via-[#241b36] to-[#40305a] opacity-80" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/20 to-transparent p-1.5">
                      <span className="text-[9px] font-bold text-white tracking-wide">Dark</span>
                    </div>
                  </button>
                  <span className={`text-[11px] text-center font-medium ${ts.subText}`}>
                    Dark {settings.theme === 'modern-dark' && '(Selected)'}
                  </span>
                </div>

                {/* Retro Terminal Theme Card */}
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, wallpaper: 'matrix-green', theme: 'retro-terminal' }))}
                    className={`w-32 h-20 rounded-xl overflow-hidden border-2 relative transition-all shadow-sm cursor-pointer ${
                      settings.theme === 'retro-terminal' 
                        ? 'border-green-500 scale-[1.02]' 
                        : 'border-black/5 hover:border-black/20'
                    }`}
                  >
                    <div className="absolute inset-0 bg-black flex flex-wrap gap-1 p-1 overflow-hidden font-mono text-[6px] text-green-500/45 leading-none">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <span key={idx} className="block">101010111100101001010110</span>
                      ))}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent p-1.5">
                      <span className="text-[9px] font-bold text-white tracking-wide">Terminal</span>
                    </div>
                  </button>
                  <span className={`text-[11px] text-center font-medium ${ts.subText}`}>
                    Terminal {settings.theme === 'retro-terminal' && '(Selected)'}
                  </span>
                </div>

              </div>
            </div>

            {/* Font Section */}
            <div className="pt-2">
              <h3 className={ts.sectionHeader}>Font:</h3>
              <div className="flex flex-col gap-1.5">
                {[
                  { id: 'Poppins', label: 'Poppins' },
                  { id: 'Montserrat', label: 'Montserrat' },
                  { id: 'Product Sans', label: 'Product Sans' },
                  { id: 'Inter', label: 'Inter' },
                  { id: 'Roboto', label: 'Roboto' }
                ].map(font => (
                  <button
                    key={font.id}
                    onClick={() => setSettings(prev => ({ ...prev, fontFamily: font.id }))}
                    style={{ fontFamily: font.id }}
                    className={`flex items-center gap-1.5 text-left text-xs cursor-pointer w-fit py-0.5 hover:opacity-80`}
                  >
                    <span className="font-semibold">
                      {font.label} {selectedFont === font.id && '(Selected)'}
                    </span>
                  </button>
                ))}

                <div className="mt-2 space-y-1">
                  <button className={`text-xs opacity-60 hover:opacity-95 transition-colors block text-left`}>
                    More fonts
                  </button>
                  <button className={`text-xs opacity-60 hover:opacity-95 transition-colors block text-left`}>
                    More Appearance Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category: Workspace Behavior */}
        {activeCategory === 'Workspace Behavior' && (
          <div className="space-y-6">
            <div>
              <h2 className={ts.title}>Workspace Behavior</h2>
              <p className={`text-xs mt-1 ${ts.subText}`}>Adjust size density and icon magnification controls.</p>
            </div>

            <div className={`border ${ts.card} space-y-4`}>
              <div>
                <label className={`text-xs font-semibold block mb-2 ${ts.subText}`}>Dock Size Presets</label>
                <div className="flex gap-2">
                  {(['sm', 'md', 'lg'] as const).map(size => (
                    <button
                      key={size}
                      onClick={() => setSettings(prev => ({ ...prev, dockSize: size }))}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        settings.dockSize === size ? ts.interactiveBtnActive : ts.interactiveBtn
                      }`}
                    >
                      {size === 'sm' ? 'Compact' : size === 'md' ? 'Default' : 'Large'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <span className={`text-[11px] leading-relaxed block ${ts.subText}`}>
                  * Dynamic Magnification: Hovering dock items triggers dynamic 18% coordinate scaling.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Category: Window Management */}
        {activeCategory === 'Window Management' && (
          <div className="space-y-6">
            <div>
              <h2 className={ts.title}>Window Management</h2>
              <p className={`text-xs mt-1 ${ts.subText}`}>Configure workspace positioning and focus layers.</p>
            </div>

            <div className={`border ${ts.card} space-y-3 text-xs`}>
              <div className={`flex justify-between items-center py-1 border-b ${ts.border}`}>
                <span>Active Window Layer Cache</span>
                <span className={`font-mono px-2 py-0.5 rounded text-[10px] ${ts.interactiveBtn}`}>Auto-indexing</span>
              </div>
              <div className={`flex justify-between items-center py-1 border-b ${ts.border}`}>
                <span>Prevent Boundary Clamping</span>
                <span className="font-semibold text-emerald-500">Enabled</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Double Click to Maximize</span>
                <span className={ts.subText}>Supported on Header</span>
              </div>
            </div>
          </div>
        )}

        {/* Category: Shortcuts */}
        {activeCategory === 'Shortcuts' && (
          <div className="space-y-6">
            <div>
              <h2 className={ts.title}>Shortcuts</h2>
              <p className={`text-xs mt-1 ${ts.subText}`}>Available shell terminal execution bindings.</p>
            </div>

            <div className={`border ${ts.card} space-y-3 font-mono text-xs`}>
              <div className={`flex justify-between py-1 border-b ${ts.border}`}>
                <span className={ts.subText}>Launch terminal:</span>
                <span className="font-bold">`open terminal`</span>
              </div>
              <div className={`flex justify-between py-1 border-b ${ts.border}`}>
                <span className={ts.subText}>Change background:</span>
                <span className="font-bold">`wallpaper sunset`</span>
              </div>
              <div className={`flex justify-between py-1 border-b ${ts.border}`}>
                <span className={ts.subText}>Launch paint studio:</span>
                <span className="font-bold">`open paint`</span>
              </div>
              <div className="flex justify-between py-1">
                <span className={ts.subText}>Mute/unmute:</span>
                <span className="font-bold">`mute volume`</span>
              </div>
            </div>
          </div>
        )}

        {/* Category: Startup and Shutdown */}
        {activeCategory === 'Startup and Shutdown' && (
          <div className="space-y-6">
            <div>
              <h2 className={ts.title}>System Information</h2>
              <p className={`text-xs mt-1 ${ts.subText}`}>Detailed hardware resources and virtual OS allocations.</p>
            </div>

            <div className={`border ${ts.card} space-y-3 text-xs`}>
              <div className={`flex justify-between py-1.5 border-b ${ts.border}`}>
                <span className={ts.subText}>OS Edition:</span>
                <span className="font-semibold">Drive OSX v1.1 (Premium)</span>
              </div>
              <div className={`flex justify-between py-1.5 border-b ${ts.border}`}>
                <span className={ts.subText}>RAM:</span>
                <span className="font-semibold">8.00 GB Allocated Block</span>
              </div>
              <div className={`flex justify-between py-1.5 border-b ${ts.border}`}>
                <span className={ts.subText}>Resolution:</span>
                <span className="font-semibold">{resolution} Pixels</span>
              </div>
              
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (confirm('Reboot virtual Operating System? All unsaved File Manager edits will be flushed.')) {
                      window.location.reload();
                    }
                  }}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer text-center"
                >
                  Reboot Virtual OS
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fallback for rest of categories */}
        {!['Appearance', 'Workspace Behavior', 'Window Management', 'Shortcuts', 'Startup and Shutdown'].includes(activeCategory) && (
          <div className="space-y-4">
            <div>
              <h2 className={ts.title}>{activeCategory}</h2>
              <p className={`text-xs mt-1 ${ts.subText}`}>Configurable preferences under {activeCategory}.</p>
            </div>
            
            <div className={`border ${ts.card} flex flex-col items-center justify-center text-center py-6`}>
              <span className="text-3xl mb-2">⚙️</span>
              <h3 className={`text-xs font-bold ${ts.boldText}`}>{activeCategory} Settings</h3>
              <p className={`text-[11px] max-w-xs mt-1 ${ts.subText}`}>
                Virtual adapters and controllers are automatically tuned. No extra manual calibration is required for the Guest account.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
