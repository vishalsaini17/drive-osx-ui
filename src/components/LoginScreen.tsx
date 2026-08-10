import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Unlock,
  User,
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  HelpCircle,
  Key,
  Mail,
  Phone,
  ShieldAlert
} from 'lucide-react';
import { useSystemStore } from '../systemStore';
import Wallpaper from './Wallpaper';
import { useNavigate, useLocation } from 'react-router-dom';

const AVATAR_PRESETS = [
  { emoji: '👾', bg: 'from-fuchsia-500 to-indigo-500', name: 'Cyber Bot' },
  { emoji: '🚀', bg: 'from-cyan-500 to-blue-500', name: 'Explorer' },
  { emoji: '🦊', bg: 'from-orange-500 to-amber-500', name: 'Crafty Fox' },
  { emoji: '🎨', bg: 'from-pink-500 to-rose-500', name: 'Artisan' },
  { emoji: '🔮', bg: 'from-purple-500 to-indigo-600', name: 'Mystic' },
  { emoji: '🦁', bg: 'from-yellow-500 to-orange-500', name: 'Lionheart' },
  { emoji: '🐼', bg: 'from-slate-400 to-zinc-600', name: 'Panda' },
  { emoji: '🎵', bg: 'from-violet-500 to-pink-500', name: 'Melody' },
  { emoji: '🏎️', bg: 'from-red-500 to-orange-500', name: 'Speedster' },
];

export default function LoginScreen() {
  const settings = useSystemStore((state) => state.settings);
  const login = useSystemStore((state) => state.login);
  const signup = useSystemStore((state) => state.signup);
  const playClickSound = useSystemStore((state) => state.playClickSound);
  const navigate = useNavigate();
  const location = useLocation();

  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [generatedEmail, setGeneratedEmail] = useState<string>('');

  // Sync isSignUp with route path
  useEffect(() => {
    if (location.pathname === '/register') {
      setIsSignUp(true);
    } else {
      setIsSignUp(false);
    }
  }, [location.pathname]);

  // Login fields
  const [loginUser, setLoginUser] = useState<string>('');
  const [loginPass, setLoginPass] = useState<string>('');
  const [showLoginPass, setShowLoginPass] = useState<boolean>(false);

  // Signup fields
  const [signupUser, setSignupUser] = useState<string>('');
  const [signupFirstName, setSignupFirstName] = useState<string>('');
  const [signupLastName, setSignupLastName] = useState<string>('');
  const [signupPass, setSignupPass] = useState<string>('');
  const [signupRecoveryEmail, setSignupRecoveryEmail] = useState<string>('');
  const [signupMobile, setSignupMobile] = useState<string>('');
  const [signupAvatar, setSignupAvatar] = useState<number>(0);
  const [showSignupPass, setShowSignupPass] = useState<boolean>(false);

  // UI States
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isSignUp && signupUser.trim()) {
      setGeneratedEmail(`${signupUser.trim().toLowerCase()}@diveosx.com`);
    } else {
      setGeneratedEmail('');
    }
  }, [isSignUp, signupUser]);

  // Sync clock time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to Enter key to unlock or submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked && e.key === 'Enter') {
        setIsLocked(false);
        playClickSound();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, playClickSound]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!loginUser.trim() || !loginPass.trim()) {
      setErrorMsg('Please fill in both fields.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(loginUser, loginPass);
      setIsLoading(false);
      if (!result.success) {
        setErrorMsg(result.message || 'Invalid username or password.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Authentication error.');
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!signupUser.trim() || !signupFirstName.trim() || !signupLastName.trim() || !signupPass.trim()) {
      setErrorMsg('Username, first name, last name, and password are required.');
      return;
    }

    if (!signupRecoveryEmail.trim() && !signupMobile.trim()) {
      setErrorMsg('Provide a recovery email or recovery phone.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signup({
        username: signupUser,
        firstName: signupFirstName,
        lastName: signupLastName,
        passwordHash: signupPass,
        recoveryEmail: signupRecoveryEmail,
        mobile: signupMobile,
      });
      setIsLoading(false);

      if (result.success) {
        setSuccessMsg(result.message || 'Account created successfully! You can now log in.');
        // Auto fill login username
        setLoginUser(signupUser);
        setLoginPass('');
        // Clear signup fields
        setSignupUser('');
        setSignupFirstName('');
        setSignupLastName('');
        setSignupPass('');
        setSignupRecoveryEmail('');
        setSignupMobile('');
        // Switch view to login
        setTimeout(() => {
          setIsSignUp(false);
          setSuccessMsg('');
        }, 1800);
      } else {
        setErrorMsg(result.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Registration failed.');
    }
  };

  // Clock Formatting
  const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateStr = currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div id="login-signup-viewport" className="relative w-screen h-screen overflow-hidden select-none z-[99999]">
      {/* Dynamic Wallpaper background */}
      <Wallpaper settings={settings} />

      {/* Heavy Frosty Backdrop Overlay */}
      <div className="absolute inset-0 bg-[#06060c]/55 backdrop-blur-md transition-all duration-700 z-[1]" />

      <AnimatePresence mode="wait">
        {isLocked ? (
          /* ================= LOCK SCREEN VIEW ================= */
          <motion.div
            key="lock-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: '-100vh' }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            onClick={() => {
              setIsLocked(false);
              playClickSound();
            }}
            className="absolute inset-0 flex flex-col justify-between items-center py-20 px-8 cursor-pointer z-10"
          >
            {/* Top Security Indicator */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-sm"
            >
              <Lock size={14} className="text-pink-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-widest text-white/80 uppercase">Session Locked</span>
            </motion.div>

            {/* Middle Time & Date Display */}
            <div className="text-center select-none flex flex-col items-center">
              <motion.h1
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
                className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter bg-gradient-to-b from-white via-white/90 to-white/30 bg-clip-text text-transparent font-sans filter drop-shadow-lg"
              >
                {timeStr}
              </motion.h1>
              <motion.p
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-base sm:text-lg md:text-xl font-medium tracking-wide text-white/70 mt-4 drop-shadow-md"
              >
                {dateStr}
              </motion.p>
            </div>

            {/* Bottom Unlock Cue */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: 0.5,
                repeat: Infinity,
                repeatType: 'reverse',
                duration: 1.5
              }}
              className="flex flex-col items-center gap-2"
            >
              <span className="text-sm font-bold tracking-widest uppercase text-white/40">Click or Press Enter to Unlock</span>
              <div className="w-1.5 h-6 rounded-full bg-white/20 relative overflow-hidden mt-1">
                <div className="absolute top-0 left-0 w-full h-1/2 bg-pink-500 rounded-full animate-[bounce_1.5s_infinite]" />
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* ================= LOGIN & SIGNUP VIEW ================= */
          <motion.div
            key="auth-panel"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 180 }}
            className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-10 overflow-y-auto"
          >
            {/* Elegant glass card wrapper */}
            <div className="relative w-full max-w-[500px] bg-white/[0.04] border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl rounded-[28px] p-6 sm:p-8 overflow-hidden my-auto">

              {/* Soft decorative background glows inside the card */}
              <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-pink-500/10 blur-[60px] pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-violet-600/10 blur-[60px] pointer-events-none" />

              {/* Card Header */}
              <div className="text-center mb-5 sm:mb-6 select-none">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-violet-600 flex items-center justify-center shadow-lg border border-white/20">
                    {isSignUp ? <UserPlus size={22} className="text-white" /> : <Lock size={22} className="text-white" />}
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
                  {isSignUp ? 'Create New Account' : 'Welcome to Drive OSX'}
                </h2>
                <p className="text-xs text-white/50 mt-1 font-medium">
                  {isSignUp
                    ? 'Register a personal user account to log in'
                    : 'Enter password or sign in with a guest account'}
                </p>
              </div>

              {/* Error and Success Notifications */}
              <AnimatePresence mode="wait">
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 bg-red-500/15 border border-red-500/25 px-4 py-2.5 rounded-xl text-red-300 text-xs font-semibold mb-4"
                  >
                    <ShieldAlert size={15} className="shrink-0 text-red-400" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}
                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/25 px-4 py-2.5 rounded-xl text-emerald-300 text-xs font-semibold mb-4"
                  >
                    <AlertCircle size={15} className="shrink-0 text-emerald-400" />
                    <span>{successMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form Content */}
              <AnimatePresence mode="wait">
                {!isSignUp ? (
                  /* --- LOGIN FORM --- */
                  <motion.form
                    key="login-form"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleLoginSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5 ml-1">Username</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-white/30">
                          <User size={15} />
                        </span>
                        <input
                          type="text"
                          value={loginUser}
                          onChange={(e) => setLoginUser(e.target.value)}
                          placeholder="Username (e.g. john)"
                          disabled={isLoading}
                          className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.07] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5 ml-1">Password</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-white/30">
                          <Key size={15} />
                        </span>
                        <input
                          type={showLoginPass ? 'text' : 'password'}
                          value={loginPass}
                          onChange={(e) => setLoginPass(e.target.value)}
                          placeholder="••••••••"
                          disabled={isLoading}
                          className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-xs font-medium text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.07] transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setShowLoginPass(!showLoginPass);
                          }}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white transition-colors"
                        >
                          {showLoginPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-1 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          navigate('/forgot-password');
                        }}
                        className="text-pink-400 hover:text-pink-300 hover:underline cursor-pointer focus:outline-none"
                      >
                        Forgot Password?
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          navigate('/reset-password');
                        }}
                        className="text-white/40 hover:text-white/60 hover:underline cursor-pointer focus:outline-none"
                      >
                        Reset with Token
                      </button>
                    </div>

                    {/* Login Action Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      onClick={() => playClickSound()}
                      className="w-full relative flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Authenticate Session</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </motion.form>
                ) : (
                  /* --- SIGNUP FORM (FULL SWAGGER PAYLOAD COMPLIANT) --- */
                  <motion.form
                    key="signup-form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSignupSubmit}
                    className="space-y-3.5"
                  >
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1 ml-1">Username *</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/30">
                          <User size={13} />
                        </span>
                        <input
                          type="text"
                          value={signupUser}
                          onChange={(e) => setSignupUser(e.target.value)}
                          placeholder="john"
                          disabled={isLoading}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-8.5 pr-2.5 text-xs font-medium text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.05] transition-all"
                          required
                        />
                      </div>
                      {generatedEmail && (
                        <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-semibold flex items-center gap-1.5">
                          <Mail size={12} />
                          <span>Your email: {generatedEmail}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1 ml-1">First Name *</label>
                        <input
                          type="text"
                          value={signupFirstName}
                          onChange={(e) => setSignupFirstName(e.target.value)}
                          placeholder="John"
                          disabled={isLoading}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 px-3 text-xs font-medium text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.05] transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1 ml-1">Last Name *</label>
                        <input
                          type="text"
                          value={signupLastName}
                          onChange={(e) => setSignupLastName(e.target.value)}
                          placeholder="Doe"
                          disabled={isLoading}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 px-3 text-xs font-medium text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.05] transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1 ml-1">Password *</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/30">
                          <Key size={13} />
                        </span>
                        <input
                          type={showSignupPass ? 'text' : 'password'}
                          value={signupPass}
                          onChange={(e) => setSignupPass(e.target.value)}
                          placeholder="••••••••"
                          disabled={isLoading}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-8.5 pr-8.5 text-xs font-medium text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.05] transition-all"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setShowSignupPass(!showSignupPass);
                          }}
                          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-white/40 hover:text-white transition-colors"
                        >
                          {showSignupPass ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1 ml-1">Recovery Email</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/30">
                            <Mail size={13} />
                          </span>
                          <input
                            type="email"
                            value={signupRecoveryEmail}
                            onChange={(e) => setSignupRecoveryEmail(e.target.value)}
                            placeholder="john@gmail.com"
                            disabled={isLoading}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-8.5 pr-2.5 text-xs font-medium text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.05] transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1 ml-1">Mobile</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/30">
                            <Phone size={13} />
                          </span>
                          <input
                            type="text"
                            value={signupMobile}
                            onChange={(e) => setSignupMobile(e.target.value)}
                            placeholder="919876543210"
                            disabled={isLoading}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-8.5 pr-2.5 text-xs font-medium text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.05] transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Avatar Picker */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5 ml-1">Choose UI Avatar</label>
                      <div className="grid grid-cols-9 gap-1.5 bg-white/[0.02] border border-white/5 p-1.5 rounded-xl">
                        {AVATAR_PRESETS.map((preset, idx) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              playClickSound();
                              setSignupAvatar(idx);
                            }}
                            className={`relative aspect-square rounded-lg flex items-center justify-center text-sm bg-gradient-to-br ${preset.bg} cursor-pointer transition-all ${signupAvatar === idx
                                ? 'ring-2 ring-pink-400 scale-105 shadow-md shadow-pink-500/20'
                                : 'opacity-60 hover:opacity-100 hover:scale-[1.03]'
                              }`}
                            title={preset.name}
                          >
                            <span>{preset.emoji}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Signup Action Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      onClick={() => playClickSound()}
                      className="w-full relative flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Create Free Account</span>
                          <UserPlus size={14} />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Bottom Multi-options (Toggle mode) */}
              <div className="flex flex-col gap-2 mt-4">
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setErrorMsg('');
                      setSuccessMsg('');
                      if (isSignUp) {
                        navigate('/login');
                      } else {
                        navigate('/register');
                      }
                    }}
                    disabled={isLoading}
                    className="text-xs font-semibold text-pink-400 hover:text-pink-300 hover:underline cursor-pointer"
                  >
                    {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
