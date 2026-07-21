import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User } from 'lucide-react';
import { ChatMessage } from '../../types';
import { useSystemStore, getAppIcon } from '../../systemStore';

export default function Messenger() {
  const [inputText, setInputText] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Zustand Store binding
  const messages = useSystemStore((state) => state.messages);
  const setMessages = useSystemStore((state) => state.setMessages);
  const settings = useSystemStore((state) => state.settings);
  const setSettings = useSystemStore((state) => state.setSettings);
  const openAppWindow = useSystemStore((state) => state.openAppWindow);
  const handleCloseWindow = useSystemStore((state) => state.handleCloseWindow);
  const windows = useSystemStore((state) => state.windows);

  const messengerApp = windows.find((w) => w.id === 'messenger');
  const activeTheme = settings.theme || 'classic-light';

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputText.trim();
    if (!query) return;

    // Create user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Trigger AI Assistant response logic with action parser
    setTimeout(() => {
      const responseText = parseQueryAndExecuteActions(query);
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    }, 750);
  };

  // Automated smart responses + Action executive router
  const parseQueryAndExecuteActions = (query: string): string => {
    const q = query.toLowerCase();

    // WALLPAPER ACTIONS
    if (q.includes('wallpaper') || q.includes('background')) {
      if (q.includes('sunset')) {
        setSettings(prev => ({ ...prev, wallpaper: 'sunset' }));
        return '🌅 I have set your desktop wallpaper to "Sunset Glow". Calming, isn\'t it?';
      }
      if (q.includes('space') || q.includes('star') || q.includes('nebula')) {
        setSettings(prev => ({ ...prev, wallpaper: 'deep-space' }));
        return '🌌 Done! Your desktop is now themed with "Deep Space Nebula". Perfect for late-night programming sessions.';
      }
      if (q.includes('matrix') || q.includes('green') || q.includes('rain')) {
        setSettings(prev => ({ ...prev, wallpaper: 'matrix-green' }));
        return '📟 Neo... I have successfully enabled the "Matrix Digital Rain" wallpaper. Follow the white rabbit.';
      }
      if (q.includes('default') || q.includes('waves') || q.includes('original') || q.includes('pink') || q.includes('violet')) {
        setSettings(prev => ({ ...prev, wallpaper: 'wave-default' }));
        return '🎨 Restored! I have reset your wallpaper to the standard high-contrast Layered Vector Waves.';
      }
    }

    // OPEN WINDOW ACTIONS
    if (q.includes('open') || q.includes('launch') || q.includes('start')) {
      if (q.includes('terminal') || q.includes('cmd') || q.includes('bash') || q.includes('shell')) {
        openAppWindow('terminal');
        return '📟 Opening the system Terminal emulator window right now!';
      }
      if (q.includes('settings') || q.includes('option') || q.includes('control')) {
        openAppWindow('settings');
        return '⚙️ Opening System Settings panel. You can adjust docks, audio, and check specifications there.';
      }
      if (q.includes('file') || q.includes('explorer') || q.includes('finder') || q.includes('manager')) {
        openAppWindow('fileManager');
        return '📁 Launching the File Explorer window. Double-click .txt files to edit them!';
      }
      if (q.includes('browser') || q.includes('web') || q.includes('internet') || q.includes('safari') || q.includes('giggle')) {
        openAppWindow('browser');
        return '🌐 Launching Web Browser. Preloaded with mock Giggle Search, Wikipedia, and retro games!';
      }
      if (q.includes('editor') || q.includes('note') || q.includes('write') || q.includes('text')) {
        openAppWindow('editor');
        return '📝 Launching the Text Editor. You can create, save, and edit markdown documents there.';
      }
      if (q.includes('paint') || q.includes('draw') || q.includes('brush') || q.includes('canvas')) {
        openAppWindow('paint');
        return '🎨 Launching Paint & Draw app! Grab your brushes and export your final canvas drawings as PNGs.';
      }
      if (q.includes('clock') || q.includes('timer') || q.includes('stopwatch')) {
        openAppWindow('clock');
        return '🕒 Launching the System Clock app. It includes World Clocks, Stopwatches, and countdown Timers.';
      }
      if (q.includes('trash') || q.includes('bin') || q.includes('garbage')) {
        openAppWindow('trash');
        return '🗑️ Opening Trash Bin app. You can empty deleted elements there.';
      }
    }

    // CLOSE WINDOW ACTIONS
    if (q.includes('close') || q.includes('exit') || q.includes('terminate')) {
      if (q.includes('terminal')) {
        handleCloseWindow('terminal');
        return '📟 Terminated terminal process and closed window.';
      }
      if (q.includes('browser')) {
        handleCloseWindow('browser');
        return '🌐 Closed Web Browser window.';
      }
    }

    // AUDIO ACTIONS
    if (q.includes('mute') || (q.includes('sound') && q.includes('off'))) {
      setSettings(prev => ({ ...prev, soundsEnabled: false }));
      return '🔇 Muted system sounds. Shhh...';
    }
    if (q.includes('unmute') || (q.includes('sound') && q.includes('on'))) {
      setSettings(prev => ({ ...prev, soundsEnabled: true }));
      return '🔊 Restored system sounds. Enjoy the audio clicks.';
    }
    if (q.includes('volume')) {
      const match = q.match(/\d+/);
      if (match) {
        const volNum = Math.min(100, Math.max(0, parseInt(match[0])));
        setSettings(prev => ({ ...prev, volume: volNum, soundsEnabled: true }));
        return `🔊 Setting master volume level to ${volNum}%.`;
      }
    }

    // SYSTEM SPECS QUERY
    if (q.includes('spec') || q.includes('hardware') || q.includes('cpu') || q.includes('ram') || q.includes('memory') || q.includes('stats')) {
      return '💻 Drive OSX is running on a Virtual Quad-Core processor with 8.00 GB of WebVM RAM. Virtual filesystem is stored inside your browser\'s LocalStorage engine!';
    }

    // CONVERSATIONAL CHATBOT FALLBACKS
    if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('greetings')) {
      return '👋 Greetings, Administrator! I am OS Caption, your AI-guided operating system assistant. I can launch apps, set wallpapers, toggle system volumes, or answer simple questions. Try typing "change wallpaper to sunset"!';
    }
    if (q.includes('who are you') || q.includes('your name') || q.includes('what is your name')) {
      return '🤖 I am OS Caption, your personal desktop automation helper. I bridge your textual queries directly to the operating system controls!';
    }
    if (q.includes('weather')) {
      return '☀️ The current simulated weather is sunny with clear blue skies, around 24°C / 75°F. Perfect day for building web applications!';
    }

    // GENERAL
    return '💡 I\'m not quite sure how to handle that. I can perform OS actions if you ask, like: \n- "change wallpaper to sunset"\n- "open terminal"\n- "mute volume"\n- "open paint"\n- "show system specs"\n\nHow else can I help you today?';
  };

  // Theme configuration styles
  const themeStyles = {
    'classic-light': {
      container: 'text-[#211625] bg-transparent',
      header: 'h-12 border-b border-[#211625]/10 px-4 flex items-center gap-3 bg-white/40',
      statusText: 'text-[#211625]/60 font-semibold',
      bubbleUser: 'bg-purple-600 rounded-br-none text-white',
      bubbleAssistant: 'bg-white/45 border border-[#211625]/10 rounded-bl-none text-[#211625]',
      inputBar: 'h-14 border-t border-[#211625]/10 p-2 px-3 flex gap-2 items-center bg-white/40',
      input: 'bg-white border border-[#211625]/15 focus:border-purple-500 rounded-xl px-4 py-2 text-xs text-[#211625] placeholder-[#211625]/40',
      btn: 'bg-purple-600 hover:bg-purple-500 text-white',
    },
    'modern-dark': {
      container: 'text-white bg-transparent',
      header: 'h-12 border-b border-white/5 px-4 flex items-center gap-3 bg-zinc-900',
      statusText: 'text-emerald-400 font-medium',
      bubbleUser: 'bg-pink-600 rounded-br-none text-white',
      bubbleAssistant: 'bg-white/5 border border-white/5 rounded-bl-none text-zinc-100',
      inputBar: 'h-14 border-t border-white/5 p-2 px-3 flex gap-2 items-center bg-zinc-900',
      input: 'bg-black/40 border border-white/10 focus:border-pink-500/50 rounded-xl px-4 py-2 text-xs text-white placeholder-white/30',
      btn: 'bg-pink-600 hover:bg-pink-500 text-white',
    },
    'retro-terminal': {
      container: 'text-[#22c55e] bg-transparent font-mono',
      header: 'h-12 border-b border-green-500/20 px-4 flex items-center gap-3 bg-black/40',
      statusText: 'text-green-400 font-bold animate-pulse',
      bubbleUser: 'bg-green-500/20 text-green-300 rounded-br-none border border-green-500/35',
      bubbleAssistant: 'bg-black border border-green-500/20 rounded-bl-none text-green-400',
      inputBar: 'h-14 border-t border-green-500/25 p-2 px-3 flex gap-2 items-center bg-black/40',
      input: 'bg-black border border-green-500/30 focus:border-green-400 rounded-xl px-4 py-2 text-xs text-green-400 placeholder-green-500/40 font-mono',
      btn: 'bg-green-500 hover:bg-green-400 text-black font-bold',
    },
  };

  const ts = themeStyles[activeTheme] || themeStyles['classic-light'];

  return (
    <div className={`h-full flex flex-col ${ts.container}`}>
      {/* 1. ASSISTANT HEADER */}
      <div className={ts.header}>
        <div className="w-7 h-7 flex items-center justify-center shrink-0">
          {getAppIcon('messenger', 'w-full h-full rounded-lg shadow-sm')}
        </div>
        <div>
          <h3 className="text-xs font-bold flex items-center gap-1.5">
            {messengerApp ? messengerApp.title : 'OS Caption'} <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </h3>
          <span className="text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            <span className={ts.statusText}>OS Integrated Automation</span>
          </span>
        </div>
      </div>

      {/* 2. CHAT FEED MESSAGES */}
      <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 select-text custom-scrollbar">
        {messages.map(msg => {
          const isMe = msg.sender === 'user';
          return (
            <div key={msg.id} className={`flex gap-3.5 items-end max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
              {/* Avatar indicator */}
              <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] ${isMe ? 'bg-indigo-600/20' : 'bg-slate-800/10'}`}>
                {isMe ? <User className="w-3.5 h-3.5" /> : '🤖'}
              </div>

              {/* Message Bubble text */}
              <div className="space-y-1">
                <div className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                  isMe ? ts.bubbleUser : ts.bubbleAssistant
                }`}>
                  {msg.text}
                </div>
                <div className="text-[9px] opacity-40 px-1">
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. INPUT FORM LINE */}
      <form onSubmit={handleSendMessage} className={ts.inputBar}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className={`flex-1 outline-none ${ts.input}`}
          placeholder='Ask assistance (e.g. "sunset wallpaper" or "open terminal")...'
        />
        <button
          type="submit"
          className={`p-2 rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center ${ts.btn}`}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
