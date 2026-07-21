import React, { useState, useRef, useEffect } from 'react';
import { useSystemStore } from '../../systemStore';

interface LogLine {
  text: string;
  type: 'input' | 'output' | 'error' | 'success';
}

export default function Terminal() {
  const settings = useSystemStore((state) => state.settings);
  const setSettings = useSystemStore((state) => state.setSettings);

  const [history, setHistory] = useState<LogLine[]>([
    { text: 'Drive OSX Terminal v1.0.0 (Type "help" for list of commands)', type: 'success' },
    { text: 'Logged in as guest_administrator@driveosx_cloud', type: 'output' },
    { text: 'Try "neofetch" to display system diagnostic graphics!', type: 'output' },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = inputVal.trim();
    if (!cmd) return;

    // Add input to logs
    const newLogs = [...history, { text: `guest@driveosx:~$ ${cmd}`, type: 'input' as const }];

    // Parse command
    const parts = cmd.split(' ');
    const primary = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Save history
    const updatedCmdHistory = [...commandHistory, cmd];
    setCommandHistory(updatedCmdHistory);
    setHistoryPointer(updatedCmdHistory.length);

    let output: LogLine[] = [];

    switch (primary) {
      case 'help':
        output = [
          { text: 'Available Shell Commands:', type: 'success' },
          { text: '  help              - Display this assistance list', type: 'output' },
          { text: '  ls                - List virtual files and directories', type: 'output' },
          { text: '  cat [filename]    - Print virtual file contents', type: 'output' },
          { text: '  neofetch          - Print system info and ASCII graphic logo', type: 'output' },
          { text: '  weather           - Get current micro weather forecasts', type: 'output' },
          { text: '  theme [theme_id]  - Switch wallpaper (default, sunset, deep-space, matrix)', type: 'output' },
          { text: '  cowsay [message]  - Draw cowsay cow with custom text bubble', type: 'output' },
          { text: '  date              - Get modern UTC current timestamp', type: 'output' },
          { text: '  clear             - Flush terminal log history lines', type: 'output' },
        ];
        break;

      case 'ls':
        output = [
          { text: 'drwxr-xr-x   guest   staff   4096 Jul 10 14:05   Documents/', type: 'output' },
          { text: 'drwxr-xr-x   guest   staff   4096 Jul 10 14:05   Pictures/', type: 'output' },
          { text: '-rw-r--r--   guest   staff   1024 Jul 10 14:05   readme.txt', type: 'output' },
          { text: '-rw-r--r--   guest   staff    438 Jul 10 14:05   todo.txt', type: 'output' },
        ];
        break;

      case 'cat':
        const targetFile = args[0] ? args[0].toLowerCase() : '';
        if (targetFile === 'readme.txt') {
          output = [
            { text: '==== DRIVE OSX V1.0 READ ME ====', type: 'success' },
            { text: 'Thank you for installing Drive OSX. This is a fully browser-sandboxed operating system design project built on top of modern visual styling principles.', type: 'output' },
            { text: 'Use the Bottom Dock or the App Launcher to run applications.', type: 'output' },
          ];
        } else if (targetFile === 'todo.txt') {
          output = [
            { text: '==== REMAINING TASKS ====', type: 'success' },
            { text: '[X] Replicate gradient wave vector wallpaper exactly', type: 'output' },
            { text: '[X] Standardize draggable window mechanics', type: 'output' },
            { text: '[ ] Complete full-scale local files editing capabilities', type: 'output' },
            { text: '[ ] Deploy web app prototype to production', type: 'output' },
          ];
        } else if (!targetFile) {
          output = [{ text: 'Error: Missing filename parameter. Use "cat [filename]".', type: 'error' }];
        } else {
          output = [{ text: `Error: No such file: "${args[0]}". Try "cat readme.txt".`, type: 'error' }];
        }
        break;

      case 'neofetch':
        output = [
          { text: '        /\\_/\\          guest@driveosx-cloud', type: 'success' },
          { text: '       ( o.o )         -----------------', type: 'output' },
          { text: '        > ^ <          OS: Drive OSX Single Page v1.0.1', type: 'output' },
          { text: '       /  |  \\         Kernel: React 19.0 (TSX runtime)', type: 'output' },
          { text: '      (   |   )        Uptime: 2 hours, 14 mins', type: 'output' },
          { text: '       \\_ | _/         Resolution: Virtual Canvas Fullscreen', type: 'output' },
          { text: '         " "           Shell: WebTerminal-sh v2.0', type: 'output' },
          { text: '                       Wallpaper Style: ' + settings.wallpaper, type: 'output' },
          { text: '                       CPU: Virtual WebVM Quad-Core @ 2.4GHz', type: 'output' },
          { text: '                       RAM Used: 3412MB / 8192MB', type: 'output' },
        ];
        break;

      case 'weather':
        output = [
          { text: '   \\  /       Sunny skies, light refreshing breezes', type: 'success' },
          { text: ' _ /\"\"\\ _     Temperature: 24°C / 75°F', type: 'output' },
          { text: '   \\__/       Humidity: 48%', type: 'output' },
          { text: '   /  \\       Wind speed: 12 km/h Northwest', type: 'output' },
          { text: '              Outlook: Ideal for desktop coding sprints', type: 'output' },
        ];
        break;

      case 'theme':
        const requestedTheme = args[0] ? args[0].toLowerCase() : '';
        if (requestedTheme === 'default' || requestedTheme === 'wave-default') {
          setSettings(prev => ({ ...prev, wallpaper: 'wave-default' }));
          output = [{ text: 'Success: Changed background wallpaper to Wavy Waves.', type: 'success' }];
        } else if (requestedTheme === 'sunset') {
          setSettings(prev => ({ ...prev, wallpaper: 'sunset' }));
          output = [{ text: 'Success: Changed background wallpaper to Sunset Glow.', type: 'success' }];
        } else if (requestedTheme === 'deep-space' || requestedTheme === 'space') {
          setSettings(prev => ({ ...prev, wallpaper: 'deep-space' }));
          output = [{ text: 'Success: Changed background wallpaper to Deep Space.', type: 'success' }];
        } else if (requestedTheme === 'matrix') {
          setSettings(prev => ({ ...prev, wallpaper: 'matrix-green' }));
          output = [{ text: 'Success: Changed background wallpaper to Matrix Digital Rain.', type: 'success' }];
        } else {
          output = [
            { text: 'Error: Wallpaper preset not found.', type: 'error' },
            { text: 'Options: "theme default", "theme sunset", "theme deep-space", "theme matrix".', type: 'output' },
          ];
        }
        break;

      case 'cowsay':
        const msg = args.length > 0 ? args.join(' ') : 'Drive OSX is legendary!';
        const borderLength = msg.length + 2;
        const dashes = '-'.repeat(borderLength);
        output = [
          { text: `  ${dashes}`, type: 'output' },
          { text: `  < ${msg} >`, type: 'output' },
          { text: `  ${dashes}`, type: 'output' },
          { text: '         \\   ^__^', type: 'output' },
          { text: '          \\  (oo)\\_______', type: 'output' },
          { text: '             (__)\\       )\\/\\', type: 'output' },
          { text: '                 ||----w |', type: 'output' },
          { text: '                 ||     ||', type: 'output' },
        ];
        break;

      case 'date':
        output = [{ text: new Date().toString(), type: 'output' }];
        break;

      case 'clear':
        setHistory([]);
        setInputVal('');
        return;

      default:
        output = [{ text: `Error: Command not recognized: "${primary}". Type "help" to list instructions.`, type: 'error' }];
        break;
    }

    setHistory([...newLogs, ...output]);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0 && historyPointer > 0) {
        const nextPtr = historyPointer - 1;
        setHistoryPointer(nextPtr);
        setInputVal(commandHistory[nextPtr]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (commandHistory.length > 0 && historyPointer < commandHistory.length - 1) {
        const nextPtr = historyPointer + 1;
        setHistoryPointer(nextPtr);
        setInputVal(commandHistory[nextPtr]);
      } else if (historyPointer === commandHistory.length - 1) {
        setHistoryPointer(commandHistory.length);
        setInputVal('');
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-black text-emerald-400 font-mono p-4 text-xs select-text">
      {/* 1. Terminal Screen logs */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1.5 leading-relaxed">
        {history.map((line, idx) => {
          let color = 'text-slate-300';
          if (line.type === 'input') color = 'text-white font-semibold';
          if (line.type === 'error') color = 'text-rose-400';
          if (line.type === 'success') color = 'text-cyan-400 font-medium';
          return (
            <div key={idx} className={`${color} whitespace-pre-wrap`}>
              {line.text}
            </div>
          );
        })}
      </div>

      {/* 2. Interactive Input Line */}
      <form onSubmit={handleCommandSubmit} className="flex items-center gap-1.5 border-t border-zinc-900 pt-3 select-none">
        <span className="text-white font-bold select-none">guest@driveosx:~$</span>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-white border-none outline-none focus:ring-0 font-mono text-xs"
          placeholder='Type commands here (try "help")...'
          autoFocus
        />
      </form>
    </div>
  );
}
