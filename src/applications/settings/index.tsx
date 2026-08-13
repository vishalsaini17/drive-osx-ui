import React, { useState, useEffect } from 'react';
import {
  Search,
  Home,
  ChevronRight,
  ChevronLeft,
  User as UserIcon,
  Palette,
  Layout,
  AppWindow,
  Bell,
  Volume2,
  Wifi,
  Monitor,
  Shield,
  ShieldCheck,
  Key,
  RefreshCw,
  Check,
  Sparkles,
  Image as ImageIcon,
  Lock,
  Mail,
  Phone,
  Terminal,
  VolumeX,
  Sliders,
  Database,
  SlidersHorizontal,
  RotateCcw,
  Trash2,
  Play,
  Maximize2,
  ZoomIn,
  Type,
  Keyboard,
  Zap,
  Grid,
  Clock,
  Battery,
  Moon,
  Smartphone,
  HardDrive,
  Globe,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal as SlidersIcon
} from 'lucide-react';
import { useSystemStore } from '../../systemStore';
import { AppRegistry } from '../../core/AppRegistry';
import { ApiService } from '@/src/services/ApiService';

export default function Settings() {
  const settings = useSystemStore((state) => state.settings);
  const setSettings = useSystemStore((state) => state.setSettings);
  const updateAppPreference = useSystemStore((state) => state.updateAppPreference);
  const resetAppPreferences = useSystemStore((state) => state.resetAppPreferences);
  const currentUser = useSystemStore((state) => state.currentUser);
  const updateCurrentUser = useSystemStore((state) => state.updateCurrentUser);
  const usersList = useSystemStore((state) => state.usersList);

  const activeTheme = settings.theme || 'classic-light';

  // Categories aligned strictly with requirements
  const categories = [
    { id: 'Account', label: 'Account', icon: UserIcon, subPoints: ['Profile', 'Password', 'Security', 'Sessions', 'Two-factor authentication'] },
    { id: 'Appearance', label: 'Appearance', icon: Palette, subPoints: ['Theme', 'Accent color', 'Wallpapers', 'Fonts', 'Icon size'] },
    { id: 'Desktop', label: 'Desktop', icon: Layout, subPoints: ['Desktop icons', 'Dock settings', 'Taskbar settings'] },
    { id: 'Notifications', label: 'Notifications', icon: Bell, subPoints: ['Enable/disable notifications', 'Sound', 'Priority'] },
    { id: 'Storage', label: 'Storage', icon: HardDrive, subPoints: ['Used storage', 'Storage limit', 'Cleanup'] },
    { id: 'Applications', label: 'Applications', icon: AppWindow, subPoints: ['Installed apps', 'Default applications', 'App permissions'] },
    { id: 'Accessibility', label: 'Accessibility', icon: ZoomIn, subPoints: ['Zoom', 'Font scaling', 'Keyboard shortcuts'] },
  ];

  const [activeCategory, setActiveCategory] = useState<string>('Account');
  const [activeSubTab, setActiveSubTab] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolution, setResolution] = useState('');

  // Toast / feedback message
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // App Preference Detail view
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Profile & Password State
  const [id,] = useState(currentUser?.id);
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [email, setEmail] = useState(currentUser?.email || 'admin@driveosx.local');
  const [recoveryEmail, setRecoveryEmail] = useState(currentUser?.recoveryEmail || '');
  const [mobile, setMobile] = useState(currentUser?.mobile || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '👾');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 2FA state
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  // Sessions state
  const [sessions, setSessions] = useState([
    { id: 'sess-1', device: 'DriveOSX Desktop (Current)', ip: '127.0.0.1', location: 'San Francisco, CA', lastActive: 'Active Now', current: true },
    { id: 'sess-2', device: 'Safari Mobile (iOS)', ip: '192.168.1.42', location: 'New York, NY', lastActive: '2 hours ago', current: false },
    { id: 'sess-3', device: 'Firefox Remote Workstation', ip: '10.0.0.8', location: 'London, UK', lastActive: 'Yesterday', current: false },
  ]);

  // App Filter & Settings state
  const [appSearch, setAppSearch] = useState('');
  const [customWallpaper, setCustomWallpaper] = useState(settings.customWallpaperUrl || '');

  // Cleanup progress simulated
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanProgress, setCleanProgress] = useState(0);

  // Keyboard shortcut search
  const [shortcutFilter, setShortcutFilter] = useState('');

  // Fetch screen resolution
  useEffect(() => {
    const handleResize = () => {
      setResolution(`${window.innerWidth} x ${window.innerHeight}`);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync profile form when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setEmail(currentUser.email || 'admin@driveosx.local');
      setRecoveryEmail(currentUser.recoveryEmail || '');
      setMobile(currentUser.mobile || '');
      setAvatarUrl(currentUser.avatarUrl || '👾');
    }
  }, [currentUser]);

  // Reset subtab when category changes
  useEffect(() => {
    const cat = categories.find(c => c.id === activeCategory);
    if (cat && cat.subPoints.length > 0) {
      setActiveSubTab(cat.subPoints[0]);
    }
  }, [activeCategory]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const filteredCategories = categories.filter(cat =>
    cat.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.subPoints.some(sub => sub.toLowerCase().includes(searchQuery.toLowerCase()))
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
      categoryActive: 'bg-black/10 font-semibold text-[#211625] shadow-xs',
      input: 'bg-white/70 border-[#211625]/15 focus:ring-2 focus:ring-purple-500/40 text-[#211625] placeholder-[#211625]/40',
      btn: 'bg-white/60 border-black/10 hover:bg-white hover:border-purple-500/30 text-[#211625]',
      card: 'bg-white/50 border-white/60 p-4 rounded-xl shadow-xs',
      title: 'text-xl font-semibold tracking-tight text-[#211625]',
      sectionHeader: 'text-xs font-semibold uppercase tracking-wider text-[#211625]/60 mb-3',
      interactiveBtn: 'bg-black/5 border-black/5 hover:bg-black/10 text-[#211625]/80',
      interactiveBtnActive: 'bg-[#211625] text-white border-[#211625]',
    },
    'modern-dark': {
      text: 'text-[#f3eef8]',
      subText: 'text-[#f3eef8]/60',
      boldText: 'text-[#f3eef8]',
      border: 'border-white/10',
      sidebar: 'bg-black/25 border-r border-white/10',
      categoryItem: 'text-[#f3eef8]/80 hover:bg-white/5',
      categoryActive: 'bg-white/10 font-semibold text-[#f3eef8] shadow-xs',
      input: 'bg-black/40 border-white/15 focus:ring-2 focus:ring-purple-500/60 text-[#f3eef8] placeholder-[#f3eef8]/40',
      btn: 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/30 text-[#f3eef8]',
      card: 'bg-black/30 border-white/10 p-4 rounded-xl shadow-xs',
      title: 'text-xl font-semibold tracking-tight text-[#f3eef8]',
      sectionHeader: 'text-xs font-semibold uppercase tracking-wider text-[#f3eef8]/60 mb-3',
      interactiveBtn: 'bg-white/5 border-white/5 hover:bg-white/10 text-[#f3eef8]/85',
      interactiveBtnActive: 'bg-purple-600 text-white border-purple-600 shadow-md',
    },
    'retro-terminal': {
      text: 'text-[#22c55e]',
      subText: 'text-[#22c55e]/60',
      boldText: 'text-[#22c55e] font-bold',
      border: 'border-green-500/25',
      sidebar: 'bg-black/50 border-r border-green-500/25',
      categoryItem: 'text-[#22c55e]/80 hover:bg-green-500/10',
      categoryActive: 'bg-green-500/20 font-bold text-green-400',
      input: 'bg-black/70 border-green-500/35 focus:ring-1 focus:ring-green-400 text-[#22c55e] placeholder-green-500/40 font-mono',
      btn: 'bg-black/40 border-green-500/20 hover:bg-green-500/10 hover:border-green-400 text-[#22c55e]',
      card: 'bg-black/40 border-green-500/20 p-4 rounded-xl',
      title: 'text-xl font-bold tracking-tight text-[#22c55e]',
      sectionHeader: 'text-xs font-semibold uppercase tracking-wider text-[#22c55e]/60 mb-3',
      interactiveBtn: 'bg-black/40 border-green-500/20 hover:bg-green-500/10 text-[#22c55e]/80',
      interactiveBtnActive: 'bg-green-500 text-black border-green-500 font-bold',
    },
  };

  const ts = themeStyles[activeTheme] || themeStyles['classic-light'];

  const emojiAvatars = ['👾', '👨‍💻', '👩‍💻', '🚀', '🔮', '🦊', '🐱', '🐼', '🎨', '🦁'];

  const accentColors = [
    { name: 'Purple', hex: '#8b5cf6', bgClass: 'bg-purple-500' },
    { name: 'Emerald', hex: '#10b981', bgClass: 'bg-emerald-500' },
    { name: 'Blue', hex: '#3b82f6', bgClass: 'bg-blue-500' },
    { name: 'Amber', hex: '#f59e0b', bgClass: 'bg-amber-500' },
    { name: 'Rose', hex: '#f43f5e', bgClass: 'bg-rose-500' },
    { name: 'Cyan', hex: '#06b6d4', bgClass: 'bg-cyan-500' },
    { name: 'Indigo', hex: '#6366f1', bgClass: 'bg-indigo-500' },
  ];

  console.log("updated user id---->",currentUser?.id)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await ApiService.updateUser(currentUser?.id as string, {
        fullName,
        email,
        recoveryEmail,
        mobile,
        avatarUrl,
      });

      if (!response.success) throw new Error(response.message);

      updateCurrentUser(response.data);
      showToast('Profile updated successfully!');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update profile.');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      showToast('⚠️ Please enter a new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('❌ New passwords do not match.');
      return;
    }
    updateCurrentUser({
      passwordHash: newPassword,
    });
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPassword('');
    showToast('🔒 Password changed successfully!');
  };

  const handleRunCleanup = () => {
    setIsCleaning(true);
    setCleanProgress(10);
    const interval = setInterval(() => {
      setCleanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsCleaning(false);
          showToast('🧹 Disk Cleanup Complete! Reclaimed 525 MB of temporary storage.');
          return 100;
        }
        return prev + 22;
      });
    }, 250);
  };

  const appManifests = AppRegistry.getAppManifests();
  const filteredApps = appManifests.filter((app) =>
    app.title.toLowerCase().includes(appSearch.toLowerCase()) ||
    app.category.toLowerCase().includes(appSearch.toLowerCase())
  );

  const activeCategoryObj = categories.find(c => c.id === activeCategory);

  return (
    <div className={`h-full flex text-sm select-none bg-transparent ${ts.text}`}>

      {/* 1. SETTINGS CATEGORIES SIDEBAR */}
      <div className={`w-56 p-3 flex flex-col shrink-0 ${ts.sidebar}`}>

        {/* Sidebar Search section */}
        <div className="flex items-center gap-1.5 mb-3 px-1">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50" />
            <input
              type="text"
              placeholder="Search Settings"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full text-xs rounded-lg pl-8 pr-2.5 py-1.5 outline-none border focus:bg-white/10 ${ts.input}`}
            />
          </div>

          <button
            onClick={() => setActiveCategory('Account')}
            className={`p-1.5 rounded-lg hover:bg-black/5 opacity-85 cursor-pointer`}
            title="Account Settings"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* User Quick Card in Sidebar */}
        {currentUser && (
          <div
            onClick={() => setActiveCategory('Account')}
            className={`mb-3 p-2 rounded-xl border ${ts.border} bg-white/5 flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity`}
          >
            <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-base shrink-0">
              {currentUser.avatarUrl?.startsWith('http') ? (
                <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
              ) : (
                currentUser.avatarUrl || '👾'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate">{currentUser.fullName || currentUser.username}</div>
              <div className={`text-[10px] truncate ${ts.subText}`}>@{currentUser.username}</div>
            </div>
          </div>
        )}

        {/* Categories list */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {filteredCategories.map(cat => {
            const IconComp = cat.icon;
            const isActive = activeCategory === cat.id;

            return (
              <div key={cat.id} className="space-y-0.5">
                <button
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-between cursor-pointer ${isActive ? ts.categoryActive : ts.categoryItem
                    }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <IconComp className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="text-xs truncate">{cat.label}</span>
                  </div>
                  <ChevronRight className={`w-3 h-3 opacity-40 shrink-0 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                </button>

                {/* Sub-points preview list under active category */}
                {isActive && (
                  <div className="pl-6 pr-1 space-y-0.5 py-0.5">
                    {cat.subPoints.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => setActiveSubTab(sub)}
                        className={`w-full text-left px-2 py-1 rounded text-[11px] truncate cursor-pointer transition-colors ${activeSubTab === sub
                          ? 'font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10'
                          : 'opacity-70 hover:opacity-100'
                          }`}
                      >
                        • {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. SETTINGS MAIN VIEW AREA */}
      <div className="flex-1 p-6 overflow-y-auto bg-transparent custom-scrollbar">

        {/* Toast Alert Banner */}
        {toastMsg && (
          <div className="mb-4 p-3 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-medium flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-purple-400 shrink-0" />
              <span>{toastMsg}</span>
            </div>
            <button onClick={() => setToastMsg(null)} className="text-xs opacity-60 hover:opacity-100 cursor-pointer">✕</button>
          </div>
        )}

        {/* Header navigation bar with sub-tabs */}
        {activeCategoryObj && (
          <div className="mb-6 pb-3 border-b border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {React.createElement(activeCategoryObj.icon, { className: "w-5 h-5 text-purple-400" })}
                <h2 className={ts.title}>{activeCategoryObj.label}</h2>
              </div>
            </div>

            {/* Quick sub-points navigation pill bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {activeCategoryObj.subPoints.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setActiveSubTab(sub)}
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all shrink-0 ${activeSubTab === sub
                    ? 'bg-purple-600 text-white shadow-xs font-semibold'
                    : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
                    }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------------------------- */}
        {/* CATEGORY 1: ACCOUNT */}
        {/* ---------------------------------------------------------------------------------- */}
        {activeCategory === 'Account' && (
          <div className="space-y-6 max-w-2xl">

            {/* Account - Profile */}
            {(activeSubTab === 'Profile' || !activeSubTab) && (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className={`border ${ts.card} space-y-4`}>
                  <h3 className={ts.sectionHeader}>Profile & Avatar</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border-2 border-purple-500/40 flex items-center justify-center text-3xl shrink-0 shadow-sm overflow-hidden">
                      {avatarUrl?.startsWith('http') ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        avatarUrl || '👾'
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <label className={`text-xs block ${ts.subText}`}>Choose Emoji Avatar:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {emojiAvatars.map((e) => (
                          <button
                            type="button"
                            key={e}
                            onClick={() => setAvatarUrl(e)}
                            className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all border cursor-pointer ${avatarUrl === e ? 'bg-purple-500 text-white border-purple-500 scale-105' : 'bg-white/10 border-black/10 hover:bg-white/20'
                              }`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>

                      <div className="pt-1">
                        <input
                          type="text"
                          placeholder="Or enter custom avatar image URL (https://...)"
                          value={avatarUrl.startsWith('http') ? avatarUrl : ''}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          className={`w-full text-xs rounded-lg px-3 py-1.5 outline-none border ${ts.input}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`border ${ts.card} space-y-4`}>
                  <h3 className={ts.sectionHeader}>Personal Details</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={`text-xs block mb-1 font-medium ${ts.subText}`}>Full Name</label>
                      <div className="relative">
                        <UserIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="John Doe"
                          className={`w-full text-xs rounded-lg pl-9 pr-3 py-2 outline-none border ${ts.input}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`text-xs block mb-1 font-medium ${ts.subText}`}>Username</label>
                      <input
                        type="text"
                        value={currentUser?.username || 'admin'}
                        disabled
                        className={`w-full text-xs rounded-lg px-3 py-2 outline-none border opacity-60 bg-black/10 cursor-not-allowed`}
                      />
                    </div>

                    <div>
                      <label className={`text-xs block mb-1 font-medium ${ts.subText}`}>Email Address</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@driveosx.local"
                          className={`w-full text-xs rounded-lg pl-9 pr-3 py-2 outline-none border ${ts.input}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`text-xs block mb-1 font-medium ${ts.subText}`}>Recovery Email</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                        <input
                          type="email"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          placeholder="backup@email.com"
                          className={`w-full text-xs rounded-lg pl-9 pr-3 py-2 outline-none border ${ts.input}`}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className={`text-xs block mb-1 font-medium ${ts.subText}`}>Mobile Phone</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                        <input
                          type="tel"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className={`w-full text-xs rounded-lg pl-9 pr-3 py-2 outline-none border ${ts.input}`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Profile</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Account - Password */}
            {activeSubTab === 'Password' && (
              <form onSubmit={handleChangePassword} className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>Password & Authentication</h3>

                <div className="space-y-3">
                  <div>
                    <label className={`text-xs block mb-1 font-medium ${ts.subText}`}>Current Password</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full text-xs rounded-lg pl-9 pr-3 py-2 outline-none border ${ts.input}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`text-xs block mb-1 font-medium ${ts.subText}`}>New Password</label>
                      <div className="relative">
                        <Key className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className={`w-full text-xs rounded-lg pl-9 pr-3 py-2 outline-none border ${ts.input}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`text-xs block mb-1 font-medium ${ts.subText}`}>Confirm New Password</label>
                      <div className="relative">
                        <Key className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className={`w-full text-xs rounded-lg pl-9 pr-3 py-2 outline-none border ${ts.input}`}
                        />
                      </div>
                    </div>
                  </div>

                  {newPassword && (
                    <div className="p-2.5 rounded-lg bg-black/5 border border-white/10 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] opacity-70">Password Strength:</span>
                        <span className={`font-bold ${newPassword.length >= 8 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {newPassword.length >= 12 ? 'Strong (12+ chars)' : newPassword.length >= 8 ? 'Medium' : 'Weak (< 8 chars)'}
                        </span>
                      </div>
                      <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${newPassword.length >= 12 ? 'bg-emerald-500 w-full' : newPassword.length >= 8 ? 'bg-amber-500 w-2/3' : 'bg-rose-500 w-1/3'}`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Update Password</span>
                  </button>
                </div>
              </form>
            )}

            {/* Account - Security */}
            {activeSubTab === 'Security' && (
              <div className="space-y-4">
                <div className={`border ${ts.card} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <div>
                        <span className="text-xs font-bold block">Account Security Status</span>
                        <span className={`text-[11px] ${ts.subText}`}>Your account is protected by standard credential hashing.</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Protected
                    </span>
                  </div>
                </div>

                <div className={`border ${ts.card} space-y-3`}>
                  <h3 className={ts.sectionHeader}>Security Events & Logs</h3>
                  <div className="space-y-2 text-xs">
                    {[
                      { event: 'User Profile Updated', date: 'Just now', status: 'Success', icon: CheckCircle2 },
                      { event: 'Terminal Session Authenticated', date: 'Today at 02:15 AM', status: 'Authorized', icon: Shield },
                      { event: 'Virtual OS Boot Check', date: 'Today at 01:00 AM', status: 'Passed', icon: ShieldCheck },
                    ].map((log, i) => (
                      <div key={i} className={`p-2.5 rounded-lg border ${ts.border} bg-black/5 flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <log.icon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="font-medium">{log.event}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-70 text-[11px]">
                          <span>{log.date}</span>
                          <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">{log.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Account - Sessions */}
            {activeSubTab === 'Sessions' && (
              <div className={`border ${ts.card} space-y-4`}>
                <div className="flex items-center justify-between border-b pb-3 border-white/10">
                  <div>
                    <h3 className={ts.sectionHeader} style={{ marginBottom: 0 }}>Active Account Sessions</h3>
                    <p className={`text-xs ${ts.subText}`}>Devices and clients currently logged into this account.</p>
                  </div>
                  <button
                    onClick={() => {
                      setSessions(prev => prev.filter(s => s.current));
                      showToast('Revoked all secondary sessions.');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border text-rose-400 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer`}
                  >
                    Revoke Other Sessions
                  </button>
                </div>

                <div className="space-y-2.5">
                  {sessions.map((sess) => (
                    <div key={sess.id} className={`p-3 rounded-xl border ${ts.border} bg-black/5 flex items-center justify-between gap-3`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 shrink-0">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold truncate">{sess.device}</span>
                            {sess.current && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                Current
                              </span>
                            )}
                          </div>
                          <div className={`text-[11px] font-mono mt-0.5 ${ts.subText}`}>
                            IP: {sess.ip} • {sess.location} • {sess.lastActive}
                          </div>
                        </div>
                      </div>

                      {!sess.current && (
                        <button
                          onClick={() => {
                            setSessions(prev => prev.filter(s => s.id !== sess.id));
                            showToast(`Revoked session: ${sess.device}`);
                          }}
                          className={`px-2.5 py-1 rounded text-xs text-rose-400 hover:bg-rose-500/10 cursor-pointer`}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Account - Two-factor authentication */}
            {activeSubTab === 'Two-factor authentication' && (
              <div className={`border ${ts.card} space-y-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={ts.sectionHeader} style={{ marginBottom: 0 }}>Two-Factor Authentication (2FA)</h3>
                    <p className={`text-xs ${ts.subText}`}>Require a 6-digit verification code from an authenticator app when signing in.</p>
                  </div>
                  <button
                    onClick={() => {
                      const nextVal = !settings.twoFactorEnabled;
                      setSettings(prev => ({ ...prev, twoFactorEnabled: nextVal }));
                      showToast(`Two-factor authentication ${nextVal ? 'Enabled' : 'Disabled'}.`);
                    }}
                    className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${settings.twoFactorEnabled ? 'bg-purple-600' : 'bg-black/20 border border-white/10'
                      }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.twoFactorEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                  </button>
                </div>

                {settings.twoFactorEnabled && (
                  <div className="pt-2 border-t border-white/10 space-y-4 animate-fade-in">
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2">
                      <span className="text-xs font-bold block">Authenticator App Key:</span>
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-white p-1 rounded-lg border flex items-center justify-center font-mono text-[9px] text-black font-bold text-center">
                          [QR CODE]
                        </div>
                        <div className="space-y-1 text-xs">
                          <span className={`block ${ts.subText}`}>Scan with Authenticator or Authy:</span>
                          <span className="font-mono font-bold text-purple-400 tracking-wider bg-black/30 px-2 py-1 rounded inline-block">
                            JBSWY3DPEHPK3PXP
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 6-digit code"
                        className={`text-xs rounded-lg px-3 py-1.5 outline-none border font-mono w-40 ${ts.input}`}
                      />
                      <button
                        onClick={() => {
                          if (twoFactorCode.length === 6) {
                            showToast('✔ 2FA Verification code validated!');
                            setTwoFactorCode('');
                          } else {
                            showToast('⚠️ Please enter a 6-digit code.');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white cursor-pointer`}
                      >
                        Verify Code
                      </button>
                    </div>

                    <div>
                      <button
                        onClick={() => {
                          setRecoveryCodes(['4821-9920', '1092-8834', '7721-3094', '5510-4491']);
                          showToast('Generated fresh 2FA backup recovery codes.');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${ts.btn}`}
                      >
                        Generate Backup Recovery Codes
                      </button>
                      {recoveryCodes.length > 0 && (
                        <div className="mt-2 p-2.5 rounded-lg bg-black/20 font-mono text-xs text-emerald-400 grid grid-cols-2 gap-2">
                          {recoveryCodes.map((code, idx) => (
                            <span key={idx} className="bg-black/40 p-1 rounded text-center">{code}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------------------------- */}
        {/* CATEGORY 2: APPEARANCE */}
        {/* ---------------------------------------------------------------------------------- */}
        {activeCategory === 'Appearance' && (
          <div className="space-y-6 max-w-2xl">

            {/* Theme */}
            {(activeSubTab === 'Theme' || !activeSubTab) && (
              <div className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>System Theme Presets</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Light */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, wallpaper: 'wave-default', theme: 'classic-light' }))}
                      className={`w-full h-24 rounded-xl overflow-hidden border-2 relative transition-all shadow-sm cursor-pointer ${settings.theme === 'classic-light' ? 'border-purple-500 scale-[1.02] ring-2 ring-purple-500/20' : 'border-black/10'
                        }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900 via-[#bd2c8e] to-[#ec4899]" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white">Classic Light</span>
                        {settings.theme === 'classic-light' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                    </button>
                    <span className={`text-[11px] text-center font-medium ${ts.subText}`}>Light Theme</span>
                  </div>

                  {/* Dark */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, wallpaper: 'deep-space', theme: 'modern-dark' }))}
                      className={`w-full h-24 rounded-xl overflow-hidden border-2 relative transition-all shadow-sm cursor-pointer ${settings.theme === 'modern-dark' ? 'border-purple-500 scale-[1.02] ring-2 ring-purple-500/20' : 'border-black/10'
                        }`}
                    >
                      <div className="absolute inset-0 bg-[#0c0a15] bg-gradient-to-tr from-[#130d22] to-[#40305a]" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white">Modern Dark</span>
                        {settings.theme === 'modern-dark' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                    </button>
                    <span className={`text-[11px] text-center font-medium ${ts.subText}`}>Dark Theme</span>
                  </div>

                  {/* Terminal */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, wallpaper: 'matrix-green', theme: 'retro-terminal' }))}
                      className={`w-full h-24 rounded-xl overflow-hidden border-2 relative transition-all shadow-sm cursor-pointer ${settings.theme === 'retro-terminal' ? 'border-green-500 scale-[1.02] ring-2 ring-green-500/20' : 'border-black/10'
                        }`}
                    >
                      <div className="absolute inset-0 bg-black p-2 font-mono text-[8px] text-green-500 overflow-hidden">
                        &gt; SYSTEM_BOOT_OK
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 p-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-green-400">Retro Terminal</span>
                        {settings.theme === 'retro-terminal' && <Check className="w-3.5 h-3.5 text-green-400" />}
                      </div>
                    </button>
                    <span className={`text-[11px] text-center font-medium ${ts.subText}`}>Terminal Theme</span>
                  </div>
                </div>
              </div>
            )}

            {/* Accent color */}
            {activeSubTab === 'Accent color' && (
              <div className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>System Accent Color</h3>
                <p className={`text-xs ${ts.subText}`}>Choose an accent color for active buttons, focus indicators, and highlights.</p>
                <div className="flex flex-wrap gap-3">
                  {accentColors.map((color) => {
                    const isSelected = (settings.accentColor || '#8b5cf6') === color.hex;
                    return (
                      <button
                        key={color.name}
                        onClick={() => {
                          setSettings(prev => ({ ...prev, accentColor: color.hex }));
                          showToast(`Updated accent color to ${color.name}`);
                        }}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all cursor-pointer ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/30 font-bold bg-white/10' : 'border-black/10 hover:bg-white/5'
                          }`}
                      >
                        <div className={`w-5 h-5 rounded-full ${color.bgClass} shadow-xs border border-white/20 flex items-center justify-center`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-xs">{color.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Wallpapers */}
            {activeSubTab === 'Wallpapers' && (
              <div className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>Desktop Wallpaper Backgrounds</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'wave-default', name: 'Wave Gradient', previewBg: 'bg-gradient-to-tr from-indigo-900 via-[#bd2c8e] to-[#ec4899]' },
                    { id: 'sunset', name: 'Sunset Glow', previewBg: 'bg-gradient-to-br from-amber-500 via-rose-500 to-purple-800' },
                    { id: 'deep-space', name: 'Deep Space', previewBg: 'bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950' },
                    { id: 'matrix-green', name: 'Matrix Green', previewBg: 'bg-black border border-green-500/40' },
                  ].map((wp) => (
                    <button
                      key={wp.id}
                      onClick={() => setSettings(prev => ({ ...prev, wallpaper: wp.id as any }))}
                      className={`h-20 rounded-xl overflow-hidden border-2 relative transition-all shadow-xs cursor-pointer ${settings.wallpaper === wp.id ? 'border-purple-500 scale-[1.02]' : 'border-black/10 hover:border-black/30'
                        }`}
                    >
                      <div className={`absolute inset-0 ${wp.previewBg}`} />
                      <div className="absolute inset-x-0 bottom-0 bg-black/50 p-1 text-center">
                        <span className="text-[9px] font-semibold text-white">{wp.name}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <label className={`text-xs block mb-1 font-medium ${ts.subText}`}>Custom Wallpaper Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customWallpaper}
                      onChange={(e) => setCustomWallpaper(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className={`flex-1 text-xs rounded-lg px-3 py-1.5 outline-none border ${ts.input}`}
                    />
                    <button
                      onClick={() => {
                        if (customWallpaper) {
                          setSettings(prev => ({ ...prev, wallpaper: 'custom', customWallpaperUrl: customWallpaper }));
                          showToast('✔ Applied custom wallpaper URL!');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${ts.btn}`}
                    >
                      Apply URL
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Fonts */}
            {activeSubTab === 'Fonts' && (
              <div className={`border ${ts.card} space-y-3`}>
                <h3 className={ts.sectionHeader}>System Typography Font</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'Poppins', label: 'Poppins (Default)' },
                    { id: 'Montserrat', label: 'Montserrat' },
                    { id: 'Product Sans', label: 'Product Sans' },
                    { id: 'Inter', label: 'Inter' },
                    { id: 'Roboto', label: 'Roboto' }
                  ].map(font => (
                    <button
                      key={font.id}
                      onClick={() => {
                        setSettings(prev => ({ ...prev, fontFamily: font.id }));
                        showToast(`Updated font to ${font.label}`);
                      }}
                      style={{ fontFamily: font.id }}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${selectedFont === font.id ? ts.interactiveBtnActive : ts.interactiveBtn
                        }`}
                    >
                      <span className="font-semibold">{font.label}</span>
                      {selectedFont === font.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Icon size */}
            {activeSubTab === 'Icon size' && (
              <div className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>Desktop & Dock Icon Sizing</h3>
                <div className="flex gap-3">
                  {[
                    { id: 'sm', label: 'Small (36px)', desc: 'Compact desktop & dock spacing' },
                    { id: 'md', label: 'Medium (48px)', desc: 'Standard system icon size' },
                    { id: 'lg', label: 'Large (64px)', desc: 'Large high-visibility icons' },
                  ].map((sz) => (
                    <button
                      key={sz.id}
                      onClick={() => {
                        setSettings(prev => ({ ...prev, iconSize: sz.id as any }));
                        showToast(`Icon size set to ${sz.label}`);
                      }}
                      className={`flex-1 p-3 rounded-xl border text-left cursor-pointer transition-all ${(settings.iconSize || 'md') === sz.id ? ts.interactiveBtnActive : ts.interactiveBtn
                        }`}
                    >
                      <span className="text-xs font-bold block">{sz.label}</span>
                      <span className="text-[10px] opacity-70 block mt-0.5">{sz.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------------------------- */}
        {/* CATEGORY 3: DESKTOP */}
        {/* ---------------------------------------------------------------------------------- */}
        {activeCategory === 'Desktop' && (
          <div className="space-y-6 max-w-2xl">

            {/* Desktop icons */}
            {(activeSubTab === 'Desktop icons' || !activeSubTab) && (
              <div className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>Desktop Icons & Grid Alignment</h3>
                <div className="space-y-2 text-xs">
                  {[
                    { id: 'trash', label: 'Trash Bin Shortcut' },
                    { id: 'files', label: 'File Manager Shortcut' },
                    { id: 'settings', label: 'Settings Shortcut' },
                    { id: 'terminal', label: 'Terminal App Shortcut' },
                    { id: 'paint', label: 'Paint Studio Shortcut' },
                    { id: 'browser', label: 'Web Browser Shortcut' },
                  ].map((ic) => {
                    const iconsState = settings.desktopIcons || { trash: true, files: true, settings: true, terminal: true, paint: true, browser: true };
                    const isShown = iconsState[ic.id] !== false;

                    return (
                      <div key={ic.id} className={`p-2.5 rounded-lg border ${ts.border} bg-black/5 flex items-center justify-between`}>
                        <span className="font-semibold">{ic.label}</span>
                        <button
                          onClick={() => {
                            const updated = { ...iconsState, [ic.id]: !isShown };
                            setSettings(prev => ({ ...prev, desktopIcons: updated }));
                            showToast(`${ic.label} ${!isShown ? 'Visible' : 'Hidden'}`);
                          }}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${isShown ? 'bg-purple-600' : 'bg-black/20 border border-white/10'
                            }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isShown ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dock settings */}
            {activeSubTab === 'Dock settings' && (
              <div className={`border ${ts.card} space-y-5`}>
                <h3 className={ts.sectionHeader}>Dock Layout & Behavior</h3>

                <div>
                  <label className={`text-xs font-semibold block mb-2 ${ts.subText}`}>Dock Position</label>
                  <div className="flex gap-2">
                    {(['bottom', 'left', 'right'] as const).map(pos => (
                      <button
                        key={pos}
                        onClick={() => {
                          setSettings(prev => ({ ...prev, dockPosition: pos }));
                          showToast(`Dock position changed to ${pos}`);
                        }}
                        className={`flex-1 py-2 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${(settings.dockPosition || 'bottom') === pos ? ts.interactiveBtnActive : ts.interactiveBtn
                          }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-2 ${ts.subText}`}>Dock Size Presets</label>
                  <div className="flex gap-2">
                    {(['sm', 'md', 'lg'] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => setSettings(prev => ({ ...prev, dockSize: size }))}
                        className={`flex-1 py-2 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${settings.dockSize === size ? ts.interactiveBtnActive : ts.interactiveBtn
                          }`}
                      >
                        {size === 'sm' ? 'Small (44px)' : size === 'md' ? 'Medium (54px)' : 'Large (64px)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`pt-3 border-t ${ts.border} space-y-3`}>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold block">Auto-Hide Dock</span>
                      <span className={`text-[11px] ${ts.subText}`}>Automatically collapse dock when mouse leaves edge.</span>
                    </div>
                    <button
                      onClick={() => {
                        const nextVal = !settings.dockAutohide;
                        setSettings(prev => ({ ...prev, dockAutohide: nextVal }));
                        showToast(`Dock Auto-Hide ${nextVal ? 'Enabled' : 'Disabled'}`);
                      }}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${settings.dockAutohide ? 'bg-purple-600' : 'bg-black/20 border border-white/10'
                        }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.dockAutohide ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold block">Icon Magnification Effect</span>
                      <span className={`text-[11px] ${ts.subText}`}>Magnify dock icons on cursor hover.</span>
                    </div>
                    <button
                      onClick={() => {
                        const nextVal = settings.dockMagnification === false ? true : false;
                        setSettings(prev => ({ ...prev, dockMagnification: nextVal }));
                        showToast(`Dock Magnification ${nextVal ? 'Enabled' : 'Disabled'}`);
                      }}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${settings.dockMagnification !== false ? 'bg-purple-600' : 'bg-black/20 border border-white/10'
                        }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.dockMagnification !== false ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Taskbar settings */}
            {activeSubTab === 'Taskbar settings' && (
              <div className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>Top Bar & Menubar Settings</h3>

                <div>
                  <label className={`text-xs font-semibold block mb-2 ${ts.subText}`}>Clock Display Format</label>
                  <div className="flex gap-2">
                    {[
                      { id: '12h', label: '12-Hour (1:45 PM)' },
                      { id: '24h', label: '24-Hour (13:45)' },
                    ].map(clk => (
                      <button
                        key={clk.id}
                        onClick={() => {
                          setSettings(prev => ({ ...prev, clockFormat: clk.id as any }));
                          showToast(`Clock format updated to ${clk.label}`);
                        }}
                        className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${(settings.clockFormat || '12h') === clk.id ? ts.interactiveBtnActive : ts.interactiveBtn
                          }`}
                      >
                        {clk.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`pt-3 border-t ${ts.border} space-y-3 text-xs`}>
                  <div className="flex items-center justify-between">
                    <span>Show Battery Percentage in Taskbar</span>
                    <button
                      onClick={() => {
                        const nextVal = settings.showBattery === false ? true : false;
                        setSettings(prev => ({ ...prev, showBattery: nextVal }));
                        showToast(`Battery status display ${nextVal ? 'Enabled' : 'Disabled'}`);
                      }}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${settings.showBattery !== false ? 'bg-purple-600' : 'bg-black/20 border border-white/10'
                        }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.showBattery !== false ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Show Wi-Fi Network Icon in Taskbar</span>
                    <button
                      onClick={() => {
                        const nextVal = settings.showWifiInTaskbar === false ? true : false;
                        setSettings(prev => ({ ...prev, showWifiInTaskbar: nextVal }));
                        showToast(`Wi-Fi status display ${nextVal ? 'Enabled' : 'Disabled'}`);
                      }}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${settings.showWifiInTaskbar !== false ? 'bg-purple-600' : 'bg-black/20 border border-white/10'
                        }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.showWifiInTaskbar !== false ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------------------------- */}
        {/* CATEGORY 4: NOTIFICATIONS */}
        {/* ---------------------------------------------------------------------------------- */}
        {activeCategory === 'Notifications' && (
          <div className="space-y-6 max-w-2xl">

            {/* Enable/disable notifications */}
            {(activeSubTab === 'Enable/disable notifications' || !activeSubTab) && (
              <div className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>Master Notification Controls</h3>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold block">Allow System Notifications</span>
                    <span className={`text-[11px] ${ts.subText}`}>Receive alerts, banners, and toast notifications from apps.</span>
                  </div>
                  <button
                    onClick={() => {
                      const nextVal = settings.notificationsEnabled === false ? true : false;
                      setSettings(prev => ({ ...prev, notificationsEnabled: nextVal }));
                      showToast(`Notifications ${nextVal ? 'Enabled' : 'Disabled'}`);
                    }}
                    className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${settings.notificationsEnabled !== false ? 'bg-purple-600' : 'bg-black/20'
                      }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.notificationsEnabled !== false ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                  </button>
                </div>

                <div className={`pt-3 border-t ${ts.border} flex items-center justify-between`}>
                  <div>
                    <span className="text-xs font-semibold block">Do Not Disturb (DND)</span>
                    <span className={`text-[11px] ${ts.subText}`}>Silence all popups and alert banners while working.</span>
                  </div>
                  <button
                    onClick={() => {
                      const nextVal = !settings.dndEnabled;
                      setSettings(prev => ({ ...prev, dndEnabled: nextVal }));
                      showToast(`Do Not Disturb ${nextVal ? 'Enabled' : 'Disabled'}`);
                    }}
                    className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${settings.dndEnabled ? 'bg-purple-600' : 'bg-black/20'
                      }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.dndEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                  </button>
                </div>
              </div>
            )}

            {/* Sound */}
            {activeSubTab === 'Sound' && (
              <div className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>Alert & Notification Audio</h3>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold">Master Alert Volume</span>
                  <span className="font-mono text-purple-500 font-bold">{settings.volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.volume}
                  onChange={(e) => setSettings(prev => ({ ...prev, volume: Number(e.target.value) }))}
                  className="w-full accent-purple-600 cursor-pointer"
                />

                <div className="pt-2 border-t border-white/10 space-y-2">
                  <label className={`text-xs font-semibold block ${ts.subText}`}>Notification Chime Sound</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Chime', 'Radar', 'Submarine', 'Pulse'].map((snd) => (
                      <button
                        key={snd}
                        onClick={() => {
                          setSettings(prev => ({ ...prev, notificationSound: snd }));
                          showToast(`Selected notification sound: ${snd}`);
                        }}
                        className={`p-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${(settings.notificationSound || 'Chime') === snd ? ts.interactiveBtnActive : ts.interactiveBtn
                          }`}
                      >
                        🔔 {snd}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Priority */}
            {activeSubTab === 'Priority' && (
              <div className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>Notification Priority Levels</h3>
                <div className="space-y-2">
                  {[
                    { id: 'all', title: 'All Notifications', desc: 'Show all system alerts, emails, and calendar reminders' },
                    { id: 'priority', title: 'Priority Only', desc: 'Show only urgent messages, alarms, and security alerts' },
                    { id: 'urgent', title: 'Urgent / Security Only', desc: 'Block routine notifications; allow critical system errors only' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSettings(prev => ({ ...prev, notificationPriority: p.id as any }));
                        showToast(`Notification priority set to ${p.title}`);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${(settings.notificationPriority || 'all') === p.id ? ts.interactiveBtnActive : ts.interactiveBtn
                        }`}
                    >
                      <span className="text-xs font-bold block">{p.title}</span>
                      <span className="text-[11px] opacity-70 block mt-0.5">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------------------------- */}
        {/* CATEGORY 5: STORAGE */}
        {/* ---------------------------------------------------------------------------------- */}
        {activeCategory === 'Storage' && (
          <div className="space-y-6 max-w-2xl">

            {/* Used storage */}
            {(activeSubTab === 'Used storage' || !activeSubTab) && (
              <div className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>Virtual Disk Storage Usage</h3>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold">Used: 2.77 GB of {settings.storageLimitGB || 16} GB</span>
                    <span className="font-mono text-purple-400 font-bold">17.3% Allocated</span>
                  </div>

                  <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden flex">
                    <div className="bg-purple-500 h-full w-[8%]" title="System OS (1.2 GB)" />
                    <div className="bg-emerald-500 h-full w-[4%]" title="Documents (450 MB)" />
                    <div className="bg-blue-500 h-full w-[5%]" title="Applications (800 MB)" />
                    <div className="bg-amber-500 h-full w-[2%]" title="Temporary Cache (320 MB)" />
                  </div>

                  <div className="flex flex-wrap gap-4 text-[11px] pt-1 opacity-80">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-500" /> System OS: 1.2 GB</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Documents: 450 MB</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Apps: 800 MB</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Cache: 320 MB</div>
                  </div>
                </div>
              </div>
            )}

            {/* Storage limit */}
            {activeSubTab === 'Storage limit' && (
              <div className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>Virtual Storage Limit Allocation</h3>
                <p className={`text-xs ${ts.subText}`}>Select virtual disk drive capacity limit.</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[16, 32, 64, 128].map((gb) => (
                    <button
                      key={gb}
                      onClick={() => {
                        setSettings(prev => ({ ...prev, storageLimitGB: gb }));
                        showToast(`Storage limit updated to ${gb} GB`);
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${(settings.storageLimitGB || 16) === gb ? ts.interactiveBtnActive : ts.interactiveBtn
                        }`}
                    >
                      {gb} GB
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cleanup */}
            {activeSubTab === 'Cleanup' && (
              <div className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>Disk Cleanup & Space Recovery</h3>

                {isCleaning && (
                  <div className="p-3 bg-purple-500/20 border border-purple-500/40 rounded-xl space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span>Cleaning temporary cache files...</span>
                      <span>{cleanProgress}%</span>
                    </div>
                    <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full transition-all duration-200" style={{ width: `${cleanProgress}%` }} />
                    </div>
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  <div className={`p-3 rounded-xl border ${ts.border} bg-black/5 flex items-center justify-between`}>
                    <div>
                      <span className="font-semibold block">Temporary App Cache</span>
                      <span className={`text-[11px] ${ts.subText}`}>Reclaimable space: ~320 MB</span>
                    </div>
                    <button onClick={handleRunCleanup} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${ts.btn}`}>
                      Clean Cache
                    </button>
                  </div>

                  <div className={`p-3 rounded-xl border ${ts.border} bg-black/5 flex items-center justify-between`}>
                    <div>
                      <span className="font-semibold block">Trash Bin Items</span>
                      <span className={`text-[11px] ${ts.subText}`}>Reclaimable space: ~120 MB</span>
                    </div>
                    <button onClick={handleRunCleanup} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${ts.btn}`}>
                      Empty Trash
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleRunCleanup}
                    disabled={isCleaning}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Run Full System Storage Cleanup</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------------------------- */}
        {/* CATEGORY 6: APPLICATIONS */}
        {/* ---------------------------------------------------------------------------------- */}
        {activeCategory === 'Applications' && (
          <div className="space-y-6 max-w-2xl">

            {/* Installed apps */}
            {(activeSubTab === 'Installed apps' || !activeSubTab) && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50" />
                  <input
                    type="text"
                    placeholder="Search installed apps..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    className={`w-full text-xs rounded-xl pl-9 pr-3 py-2 outline-none border ${ts.input}`}
                  />
                </div>

                <div className="space-y-2.5">
                  {filteredApps.map((app) => (
                    <div key={app.id} className={`border ${ts.card} flex items-center justify-between gap-3`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 shrink-0 p-1 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center">
                          {AppRegistry.getAppIcon(app.id, 'w-full h-full')}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{app.title}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/10 opacity-70">{app.category}</span>
                          </div>
                          <div className={`text-[11px] mt-0.5 ${ts.subText}`}>App ID: {app.id}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const { openAppWindow } = useSystemStore.getState();
                          openAppWindow(app.id);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Launch</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Default applications */}
            {activeSubTab === 'Default applications' && (
              <div className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>Default System Applications</h3>

                <div className="space-y-3 text-xs">
                  {[
                    { key: 'browser', label: 'Web Browser', app: 'Browser App' },
                    { key: 'editor', label: 'Text Editor', app: 'Text Editor' },
                    { key: 'terminal', label: 'Terminal Shell', app: 'Terminal App' },
                    { key: 'calendar', label: 'Calendar & Events', app: 'Calendar App' },
                    { key: 'paint', label: 'Image Canvas', app: 'Paint Studio' },
                  ].map((def) => (
                    <div key={def.key} className={`p-3 rounded-xl border ${ts.border} bg-black/5 flex items-center justify-between`}>
                      <span className="font-semibold">{def.label}</span>
                      <select
                        value={settings.defaultApps?.[def.key] || def.key}
                        onChange={(e) => {
                          const updated = { ...(settings.defaultApps || {}), [def.key]: e.target.value };
                          setSettings(prev => ({ ...prev, defaultApps: updated }));
                          showToast(`Set default ${def.label} to ${e.target.value}`);
                        }}
                        className={`text-xs rounded-lg px-2.5 py-1 outline-none border cursor-pointer ${ts.input}`}
                      >
                        <option value={def.key}>{def.app} (Default)</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* App permissions */}
            {activeSubTab === 'App permissions' && (
              <div className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>Global Application Permissions</h3>
                <div className="space-y-2 text-xs">
                  {[
                    { perm: 'Filesystem Access', desc: 'Read and write local files in Document directories' },
                    { perm: 'Network Connection', desc: 'Allow HTTP/REST web fetches and socket connections' },
                    { perm: 'Terminal Execution', desc: 'Execute system terminal shell commands' },
                    { perm: 'Notifications', desc: 'Send toast alerts and sound feedback' },
                  ].map((p, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border ${ts.border} bg-black/5 flex items-center justify-between`}>
                      <div>
                        <span className="font-bold block">{p.perm}</span>
                        <span className={`text-[11px] ${ts.subText}`}>{p.desc}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        Granted
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------------------------- */}
        {/* CATEGORY 7: ACCESSIBILITY */}
        {/* ---------------------------------------------------------------------------------- */}
        {activeCategory === 'Accessibility' && (
          <div className="space-y-6 max-w-2xl">

            {/* Zoom */}
            {(activeSubTab === 'Zoom' || !activeSubTab) && (
              <div className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>Desktop Interface Zoom</h3>
                <p className={`text-xs ${ts.subText}`}>Adjust interface element magnification level.</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[80, 100, 125, 150].map((z) => (
                    <button
                      key={z}
                      onClick={() => {
                        setSettings(prev => ({ ...prev, zoomLevel: z }));
                        showToast(`Desktop Zoom set to ${z}%`);
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${(settings.zoomLevel || 100) === z ? ts.interactiveBtnActive : ts.interactiveBtn
                        }`}
                    >
                      {z}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Font scaling */}
            {activeSubTab === 'Font scaling' && (
              <div className={`border ${ts.card} space-y-4`}>
                <h3 className={ts.sectionHeader}>Typography Font Scaling</h3>
                <p className={`text-xs ${ts.subText}`}>Scale text font sizes across windows and menus.</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { val: 90, label: 'Small (90%)' },
                    { val: 100, label: 'Standard (100%)' },
                    { val: 110, label: 'Large (110%)' },
                    { val: 125, label: 'Extra Large (125%)' },
                  ].map((f) => (
                    <button
                      key={f.val}
                      onClick={() => {
                        setSettings(prev => ({ ...prev, fontScaling: f.val }));
                        showToast(`Font scaling set to ${f.label}`);
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${(settings.fontScaling || 100) === f.val ? ts.interactiveBtnActive : ts.interactiveBtn
                        }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Keyboard shortcuts */}
            {activeSubTab === 'Keyboard shortcuts' && (
              <div className={`border ${ts.card} space-y-4`}>
                <div className="flex items-center justify-between border-b pb-3 border-white/10">
                  <h3 className={ts.sectionHeader} style={{ marginBottom: 0 }}>System Keyboard Shortcuts</h3>
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50" />
                    <input
                      type="text"
                      placeholder="Filter shortcuts..."
                      value={shortcutFilter}
                      onChange={(e) => setShortcutFilter(e.target.value)}
                      className={`w-full text-xs rounded-lg pl-7 pr-2 py-1 outline-none border ${ts.input}`}
                    />
                  </div>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  {[
                    { keys: 'Ctrl + Space', action: 'Open Application Launcher' },
                    { keys: 'Ctrl + Alt + T', action: 'Open Terminal Shell Window' },
                    { keys: 'Ctrl + S', action: 'Save File in Active Editor' },
                    { keys: 'Alt + Tab', action: 'Cycle Active Window Focus' },
                    { keys: 'Super + D', action: 'Minimize All Windows (Show Desktop)' },
                    { keys: 'Ctrl + Shift + F', action: 'Open File Manager Search' },
                  ]
                    .filter(s => s.action.toLowerCase().includes(shortcutFilter.toLowerCase()) || s.keys.toLowerCase().includes(shortcutFilter.toLowerCase()))
                    .map((s, idx) => (
                      <div key={idx} className={`p-2.5 rounded-lg border ${ts.border} bg-black/5 flex items-center justify-between`}>
                        <span className={`text-[11px] font-sans ${ts.subText}`}>{s.action}</span>
                        <span className="font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">{s.keys}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
