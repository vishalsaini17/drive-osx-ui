import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Key, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Eye, 
  EyeOff,
  Terminal
} from 'lucide-react';
import { useSystemStore } from '../state/systemStore';
import { ApiService } from '../../platform/api/ApiService';
import Wallpaper from '../desktop/Wallpaper';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function ResetPasswordScreen() {
  const settings = useSystemStore((state) => state.settings);
  const playClickSound = useSystemStore((state) => state.playClickSound);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Extract token from query params if available
  useEffect(() => {
    const t = searchParams.get('token');
    if (t) {
      setToken(t);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!token.trim()) {
      setErrorMsg('A valid cryptographic token is required.');
      return;
    }

    if (!password.trim() || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    playClickSound();

    try {
      const response = await ApiService.resetPassword(token, password);
      setIsLoading(false);
      if (response.success) {
        setSuccessMsg(response.message || 'Password reset successfully! You can now log in.');
        setTimeout(() => {
          navigate('/login');
        }, 2200);
      } else {
        setErrorMsg(response.message || 'Invalid or expired token.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'An error occurred during password reset.');
    }
  };

  return (
    <div id="reset-password-viewport" className="relative w-screen h-screen overflow-hidden select-none z-[99999]">
      <Wallpaper settings={settings} />
      
      {/* Heavy Frosty Backdrop Overlay */}
      <div className="absolute inset-0 bg-[#06060c]/55 backdrop-blur-md transition-all duration-700 z-[1]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 180 }}
        className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-10"
      >
        <div className="relative w-full max-w-[450px] bg-white/[0.04] border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl rounded-[28px] p-6 sm:p-8 overflow-hidden my-auto">
          
          {/* Decorative glows */}
          <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-pink-500/10 blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-violet-600/10 blur-[60px] pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-violet-600 flex items-center justify-center shadow-lg border border-white/20">
                <Key size={22} className="text-white" />
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
              Reset Password
            </h2>
            <p className="text-xs text-white/50 mt-1 font-medium">
              Create a new secure access credential using your reset token.
            </p>
          </div>

          {/* Notifications */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 bg-red-500/15 border border-red-500/25 px-4 py-2.5 rounded-xl text-red-300 text-xs font-semibold mb-4"
              >
                <AlertCircle size={15} className="shrink-0 text-red-400" />
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
                <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5 ml-1">Reset Token</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-white/30">
                  <Terminal size={15} />
                </span>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your reset token here"
                  disabled={isLoading}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.07] transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5 ml-1">New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-white/30">
                  <Lock size={15} />
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={isLoading}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-xs font-medium text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 focus:bg-white/[0.07] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setShowPass(!showPass);
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Confirm New Password</span>
              )}
            </button>
          </form>

          {/* Back link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                playClickSound();
                navigate('/login');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-400 hover:text-pink-300 transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Authentication</span>
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
