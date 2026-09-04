import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, Search, ExternalLink, Globe, Sliders, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { useSystemStore } from '../../shell/state/systemStore';
import { useAppMenu } from '../../platform/menus/AppMenuContext';
import { separator } from '../../platform/menus/types';

interface TabState {
  url: string;
  history: string[];
  historyIndex: number;
}

export default function WebBrowser({ windowId = 'browser' }: { windowId?: string }) {
  const notifyApiError = useSystemStore((state) => state.notifyApiError);
  const browserPrefs = useSystemStore((state) => state.settings.appPreferences?.browser);
  const homepage = browserPrefs?.homepage || 'https://duckduckgo.com';
  const searchEngine = browserPrefs?.searchEngine || 'DuckDuckGo';

  const initialUrl = homepage.replace(/^https?:\/\//, '');

  const [browserState, setBrowserState] = useState<TabState>({
    url: initialUrl,
    history: [initialUrl],
    historyIndex: 0,
  });

  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Tic-Tac-Toe Game state for retro arcade
  const [board, setBoard] = useState<string[]>(Array(9).fill(''));
  const [isXNext, setIsXNext] = useState(true);
  const [gameResult, setGameResult] = useState('');

  const isLocalSite = (u: string) => {
    return u.startsWith('giggle.com') || u.startsWith('wikiweb.org') || u.startsWith('techcrunchy.net') || u.startsWith('arcade.com');
  };

  const navigateTo = (url: string) => {
    const cleanedUrl = url.toLowerCase().trim();
    const newHistory = browserState.history.slice(0, browserState.historyIndex + 1);
    newHistory.push(cleanedUrl);

    if (!isLocalSite(cleanedUrl)) {
      notifyApiError(
        'Browser App',
        `API/Network request to '${cleanedUrl}' is unreachable in offline mode. Displaying offline view.`
      );
    }

    setBrowserState({
      url: cleanedUrl,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
    setInputUrl(cleanedUrl);
    setSearchPerformed(false);
  };

  const handleGoBack = () => {
    if (browserState.historyIndex > 0) {
      const newIndex = browserState.historyIndex - 1;
      const targetUrl = browserState.history[newIndex];
      setBrowserState({
        ...browserState,
        historyIndex: newIndex,
        url: targetUrl,
      });
      setInputUrl(targetUrl);
    }
  };

  const handleGoForward = () => {
    if (browserState.historyIndex < browserState.history.length - 1) {
      const newIndex = browserState.historyIndex + 1;
      const targetUrl = browserState.history[newIndex];
      setBrowserState({
        ...browserState,
        historyIndex: newIndex,
        url: targetUrl,
      });
      setInputUrl(targetUrl);
    }
  };

  const handleRefresh = () => {
    // Reset any sub-states
    if (browserState.url === 'arcade.com') {
      setBoard(Array(9).fill(''));
      setIsXNext(true);
      setGameResult('');
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let target = inputUrl;
    if (!target.includes('.') && target !== '') {
      target = `giggle.com/search?q=${encodeURIComponent(target)}`;
    }
    navigateTo(target);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchPerformed(true);
    }
  };

  // Mini-Game Tic-Tac-Toe calculations
  const handleCellClick = (index: number) => {
    if (board[index] || gameResult) return;
    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);

    // Calculate winner
    const winningCombos = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];

    for (let combo of winningCombos) {
      const [a, b, c] = combo;
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        setGameResult(`Winner: ${newBoard[a]}!`);
        return;
      }
    }

    if (newBoard.every(cell => cell !== '')) {
      setGameResult("It's a draw!");
    }
  };


  useAppMenu(windowId, [
    {
      id: 'file',
      label: 'File',
      items: [
        { id: 'home', label: 'Home Page', onSelect: () => navigateTo('https://www.google.com') },
        separator(),
        { id: 'copy-url', label: 'Copy Address', onSelect: () => navigator.clipboard?.writeText(browserState.url) },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { id: 'reload', label: 'Reload', shortcut: 'Ctrl+R', onSelect: handleRefresh },
      ],
    },
    {
      id: 'history',
      label: 'History',
      items: [
        { id: 'back', label: 'Back', shortcut: 'Alt+←', disabled: browserState.historyIndex <= 0, onSelect: handleGoBack },
        { id: 'forward', label: 'Forward', shortcut: 'Alt+→', disabled: browserState.historyIndex >= browserState.history.length - 1, onSelect: handleGoForward },
        separator(),
        ...(browserState.history.length > 1
          ? [{
              kind: 'submenu' as const, id: 'recent', label: 'Recent Pages',
              items: browserState.history.slice(-10).reverse().map((entry, index) => ({
                id: `hist-${index}`,
                label: entry.replace(/^https?:\/\//, '').slice(0, 40),
                onSelect: () => navigateTo(entry),
              })),
            }]
          : []),
      ],
    },
  ]);
  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans select-text">
      {/* 1. BROWSER HEADER & URL CONTROLS */}
      <div className="h-11 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-3 select-none">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleGoBack}
            disabled={browserState.historyIndex === 0}
            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleGoForward}
            disabled={browserState.historyIndex === browserState.history.length - 1}
            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigateTo('giggle.com')}
            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Address Bar */}
        <form onSubmit={handleUrlSubmit} className="flex-1 max-w-xl relative">
          <div className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-500 flex items-center">
            <Globe className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1 pl-8 pr-4 text-xs font-medium focus:outline-none focus:border-zinc-700 text-zinc-200"
          />
        </form>

        {/* Bookmarks bar link helpers */}
        <div className="flex items-center gap-2.5 text-[11px] font-semibold text-zinc-400">
          <button onClick={() => navigateTo('giggle.com')} className="hover:text-pink-400">Giggle</button>
          <span className="text-zinc-800">|</span>
          <button onClick={() => navigateTo('wikiweb.org')} className="hover:text-pink-400">WikiWeb</button>
          <span className="text-zinc-800">|</span>
          <button onClick={() => navigateTo('techcrunchy.net')} className="hover:text-pink-400">TechCrunchy</button>
          <span className="text-zinc-800">|</span>
          <button onClick={() => navigateTo('arcade.com')} className="hover:text-pink-400">Arcade</button>
        </div>
      </div>

      {/* 2. BROWSER RENDER STAGE (SIMULATED PAGES) */}
      <div className="flex-1 bg-zinc-950 overflow-auto">
        
        {/* PAGE 1: GIGGLE.COM SEARCH ENGINE */}
        {browserState.url.startsWith('giggle.com') && (
          <div className="min-h-full bg-zinc-950 flex flex-col items-center justify-center p-8 text-center">
            {!searchPerformed && !browserState.url.includes('?q=') ? (
              <div className="max-w-md w-full flex flex-col items-center">
                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-pink-400 to-amber-400 bg-clip-text text-transparent mb-6 font-sans">
                  Giggle
                </h1>
                <form onSubmit={handleSearchSubmit} className="w-full relative shadow-2xl">
                  <input
                    type="text"
                    placeholder="Search the Simulated Web or enter url..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500/60"
                  />
                  <Search className="absolute left-4 top-4 text-zinc-500 w-5 h-5" />
                </form>
                <div className="flex gap-3 mt-6 text-xs text-zinc-400">
                  <button onClick={() => { setSearchQuery('operating system'); setSearchPerformed(true); }} className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-lg">Giggle Search</button>
                  <button onClick={() => navigateTo('arcade.com')} className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-lg">I'm Feeling Lucky</button>
                </div>
              </div>
            ) : (
              // Search Results Page
              <div className="w-full max-w-2xl text-left select-text p-4">
                <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-4">
                  <h1 onClick={() => setSearchPerformed(false)} className="text-xl font-bold bg-gradient-to-r from-blue-400 to-pink-400 bg-clip-text text-transparent cursor-pointer">Giggle</h1>
                  <span className="text-zinc-600 text-xs">Search results for "{searchQuery || 'React OS'}"</span>
                </div>

                <div className="space-y-6">
                  {/* Result 1 */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">https://wikiweb.org/operating-systems</span>
                    <h3 onClick={() => navigateTo('wikiweb.org')} className="text-base font-semibold text-blue-400 hover:underline cursor-pointer">
                      Operating System - Wikipedia
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      An operating system (OS) is system software that manages computer hardware, software resources, and provides common services for computer programs.
                    </p>
                  </div>

                  {/* Result 2 */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">https://techcrunchy.net/driveosx-is-awesome</span>
                    <h3 onClick={() => navigateTo('techcrunchy.net')} className="text-base font-semibold text-blue-400 hover:underline cursor-pointer">
                      Drive OSX: The Future of Desktop Environments
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      TechCrunchy reports on the highly anticipated release of the brand-new React 19 driven Drive OSX interface. Critics call it a "masterpiece of fluid typography and wavy colors."
                    </p>
                  </div>

                  {/* Result 3 */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">https://arcade.com/retro-games</span>
                    <h3 onClick={() => navigateTo('arcade.com')} className="text-base font-semibold text-blue-400 hover:underline cursor-pointer">
                      Retro Arcade Game Room
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Play arcade games right in your browser. Complete with zero downloads, lightning speeds, and interactive scoreboard records.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAGE 2: WIKIWEB.ORG */}
        {browserState.url.startsWith('wikiweb.org') && (
          <div className="min-h-full bg-zinc-950 text-zinc-200 select-text font-serif">
            {/* Wiki header */}
            <div className="bg-zinc-900 px-6 py-4 border-b border-zinc-800 flex justify-between items-center font-sans select-none">
              <span className="font-extrabold text-sm tracking-widest text-white">WIKI<span className="text-pink-400">WEB</span></span>
              <span className="text-xs text-zinc-400 italic">The Free Encyclopaedia</span>
            </div>

            {/* Wiki Content */}
            <div className="max-w-xl mx-auto p-6 md:p-10 space-y-6">
              <h1 className="text-3xl font-bold tracking-tight text-white font-sans border-b border-zinc-800 pb-2">
                Operating System (OS)
              </h1>
              <p className="text-sm leading-relaxed italic text-zinc-400">
                From WikiWeb, the free encyclopaedia.
              </p>
              <p className="text-sm leading-relaxed">
                An <strong>operating system (OS)</strong> is system software that manages computer hardware, software resources, and provides common services for computer programs.
              </p>
              <p className="text-sm leading-relaxed">
                Time-sharing operating systems schedule tasks for efficient use of the system and may also include accounting software for cost allocation of processor time, mass storage, printing, and other resources.
              </p>
              <p className="text-sm leading-relaxed">
                For hardware functions such as input and output and memory allocation, the operating system acts as an intermediary between programs and the computer hardware.
              </p>
              
              <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl font-sans mt-4">
                <h4 className="text-xs uppercase tracking-wider font-bold text-zinc-400 mb-2">See Also:</h4>
                <ul className="text-xs space-y-2 text-blue-400 font-semibold">
                  <li><button onClick={() => navigateTo('techcrunchy.net')} className="hover:underline text-left">💡 TechCrunchy Blog: Drive OSX releases</button></li>
                  <li><button onClick={() => navigateTo('arcade.com')} className="hover:underline text-left">🎮 Play Retro Games</button></li>
                  <li><button onClick={() => navigateTo('giggle.com')} className="hover:underline text-left">🔍 Search other topics on Giggle</button></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 3: TECHCRUNCHY.NET */}
        {browserState.url.startsWith('techcrunchy.net') && (
          <div className="min-h-full bg-zinc-950 text-zinc-100 select-text font-sans">
            <div className="border-b border-zinc-800 bg-zinc-900/40 px-6 py-5 select-none flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tighter text-white uppercase flex items-center gap-2">
                Tech<span className="text-pink-500">Crunchy</span> <span className="text-[10px] bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded">NEW</span>
              </h2>
              <span className="text-xs text-zinc-500">July 2026</span>
            </div>

            <div className="max-w-xl mx-auto py-8 px-4 space-y-8">
              {/* Main Article */}
              <div className="space-y-4">
                <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded">DEVELOPMENT</span>
                <h1 className="text-2xl font-extrabold tracking-tight text-white leading-tight">
                  Drive OSX Launches on Cloud Containers, Shocks Tech Industry With Extremely Fluid Waves Wallpaper
                </h1>
                <div className="flex gap-2 text-xs text-zinc-500">
                  <span>By TechCrunchy Editors</span>
                  <span>•</span>
                  <span>3 min read</span>
                </div>
                <div className="w-full bg-gradient-to-tr from-pink-500 to-indigo-600 h-44 rounded-xl flex items-center justify-center font-bold text-sm text-white/95">
                  [ PHOTO: Layered Wave SVG Render ]
                </div>
                <p className="text-xs leading-relaxed text-zinc-400">
                  Silicon Valley was caught by surprise today as developers launched <strong>Drive OSX</strong>—a premium workspace environment running entirely inside a sandboxed web application.
                </p>
                <p className="text-xs leading-relaxed text-zinc-400">
                  Unlike traditional clunky windowed emulations, Drive OSX sports a high-performance vector waves wallpaper rendering fluid curves that match macOS elegance. It also includes functional terminals, drawing pads, settings managers, and chat messengers.
                </p>
                <blockquote className="border-l-2 border-pink-500 pl-4 py-1 text-xs italic text-zinc-300 font-serif">
                  "The scrollable waves wallpaper has set a new high-bar for single-page portfolio designs." - Prominent Frontend Designer
                </blockquote>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 4: ARCADE.COM */}
        {browserState.url.startsWith('arcade.com') && (
          <div className="min-h-full bg-zinc-950 p-6 flex flex-col items-center justify-center font-sans">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl text-center select-none">
              <h1 className="text-2xl font-black tracking-tight text-amber-400 uppercase flex items-center justify-center gap-2 mb-2">
                🎮 Retro Arcade
              </h1>
              <p className="text-xs text-zinc-400 mb-6">Play Tic-Tac-Toe directly inside your virtual browser!</p>

              {/* Game grid */}
              <div className="grid grid-cols-3 gap-2 w-48 h-48 mx-auto mb-6">
                {board.map((cell, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCellClick(idx)}
                    className="bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-lg font-bold flex items-center justify-center text-white cursor-pointer active:bg-zinc-900"
                  >
                    <span className={cell === 'X' ? 'text-pink-400' : 'text-blue-400'}>{cell}</span>
                  </button>
                ))}
              </div>

              {/* Game Info */}
              {gameResult ? (
                <div className="space-y-3">
                  <div className="text-sm font-bold text-emerald-400 animate-bounce">{gameResult}</div>
                  <button
                    onClick={() => {
                      setBoard(Array(9).fill(''));
                      setIsXNext(true);
                      setGameResult('');
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Play Again
                  </button>
                </div>
              ) : (
                <div className="text-xs text-zinc-500">
                  Player turn: <span className="font-bold text-white">{isXNext ? 'X (Pink)' : 'O (Blue)'}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAGE 5: OFFLINE EXTERNAL SITE FALLBACK */}
        {!isLocalSite(browserState.url) && (
          <div className="min-h-full bg-zinc-950 p-8 flex flex-col items-center justify-center text-center font-sans">
            <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-400 mb-4">
                <WifiOff className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No Internet / API Unreachable</h2>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                Could not connect to <span className="font-mono text-pink-400 font-semibold">{browserState.url}</span>. The server API is not responding or system is running in offline mode.
              </p>

              <div className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 text-left mb-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-red-400 mb-1">
                  <AlertCircle size={14} />
                  <span>API Error Logged to System Notifications</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  A system notification error has been dispatched to your notification drawer.
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => navigateTo('giggle.com')}
                  className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Go to Giggle Search
                </button>
                <button
                  onClick={() => navigateTo(browserState.url)}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={13} />
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
