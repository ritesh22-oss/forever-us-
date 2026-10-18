import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { auth, signInWithGooglePersistent } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { Heart, Sparkles, AlertCircle, Lock, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { CoupleSettings } from '../types';

interface CoupleAuthGateProps {
  children: React.ReactNode;
  user: User | null;
  isAuthRestoring?: boolean;
  onLogoutGate: () => void;
  settings: CoupleSettings | null;
  onRefreshSettings: () => void;
}

export const CoupleAuthGate: React.FC<CoupleAuthGateProps> = ({
  children,
  user,
  isAuthRestoring = false,
  onLogoutGate,
  settings,
  onRefreshSettings,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGooglePersistent();
      onRefreshSettings();
    } catch (err: any) {
      console.error("Sign in failed:", err);
      // Ignore user-cancelled popup
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError(err.message || "Failed to sign in. Please try again.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOutUser = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  // 1. MINIMAL ANIMATED HEART LOADER (During Authentication Session Restoration)
  if (isAuthRestoring) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-tr from-[#FFF0F5] via-[#FFF8F4] to-[#E9DDFB]">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full bg-[#F5A9C8]/40 blur-xl animate-pulse" />
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#F5A9C8] to-[#FFD6E7] flex items-center justify-center shadow-md relative z-10"
          >
            <Heart className="w-8 h-8 text-[#54334F] fill-[#54334F]/20" />
          </motion.div>
        </div>
        <p className="font-serif text-sm font-semibold text-[#54334F] mt-5 tracking-wide animate-pulse">
          Restoring our little universe... 💗
        </p>
      </div>
    );
  }

  // 2. ROMANTIC GOOGLE SIGN-IN PAGE (When sign-in is actually required)
  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-tr from-[#FFF0F5] via-[#FFF8F4] to-[#E9DDFB] relative overflow-hidden select-none">
        {/* Soft floating background hearts & subtle sparkles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ y: [0, -25, 0], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-12 left-10 text-rose-300 text-3xl"
          >
            💗
          </motion.div>
          <motion.div
            animate={{ y: [0, -35, 0], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute top-1/4 right-16 text-rose-300 text-4xl"
          >
            🌸
          </motion.div>
          <motion.div
            animate={{ y: [0, -20, 0], opacity: [0.25, 0.55, 0.25] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute bottom-20 left-1/4 text-rose-300 text-2xl"
          >
            ✨
          </motion.div>
          <motion.div
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.45, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
            className="absolute bottom-28 right-12 text-rose-300 text-3xl"
          >
            💖
          </motion.div>
        </div>

        {/* Romantic Sign-in Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md glass-panel rounded-3xl p-8 sm:p-10 text-center shadow-2xl border border-white/80 relative z-10"
        >
          {/* Glowing heart illustration */}
          <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#F5A9C8] to-[#FFD6E7] blur-lg opacity-70 animate-pulse" />
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-[#FFF0F5] to-white border border-[#FFD6E7] flex items-center justify-center shadow-md relative z-10">
              <Heart className="w-9 h-9 text-[#E07A9C] fill-[#E07A9C]/25 animate-gentle-pulse" />
            </div>
          </div>

          {/* Titles & Copy */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0F5] border border-[#FFD6E7] text-[11px] font-semibold text-[#E07A9C] shadow-2xs mb-2">
            <Sparkles className="w-3 h-3" />
            <span>Private Couple Vault</span>
          </span>

          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#54334F] tracking-tight">
            Welcome Back to Our Little Universe 💗
          </h2>

          <p className="text-xs sm:text-sm text-[#7A5374] mt-2 mb-7 leading-relaxed">
            Your memories are waiting for you. Sign in with your authorized Google account to revisit our private moments, letters, and albums.
          </p>

          {/* Error notice if sign-in fails */}
          {authError && (
            <div className="mb-5 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Clean Google sign-in button with official Google Icon */}
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-[#FFF9FB] text-[#3c4043] font-semibold text-sm shadow-md hover:shadow-lg border border-[#dadce0] transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isSigningIn ? 'Connecting securely...' : 'Sign in with Google'}</span>
          </button>

          {/* Small Privacy Message */}
          <div className="mt-5 p-3 rounded-2xl bg-[#FFF0F5]/60 border border-[#FFD6E7]/80 text-[11px] text-[#7A5374] leading-relaxed flex items-start gap-2 text-left">
            <ShieldCheck className="w-4 h-4 text-[#E07A9C] shrink-0 mt-0.5" />
            <span>
              This is a private memory vault. Only approved Google accounts for this couple space are granted access to view or upload photos, letters, and albums.
            </span>
          </div>

          {/* Gate status & Lock link */}
          <div className="mt-6 pt-4 border-t border-[#FFD6E7]/60 flex items-center justify-between text-xs text-[#7A5374]">
            <span className="flex items-center gap-1">
              <span>Password Gate Passed</span>
              <span className="text-[#E07A9C]">💗</span>
            </span>
            <button
              onClick={onLogoutGate}
              className="text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              <span>Lock Vault</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 3. FRIENDLY ACCESS-DENIED PAGE (When user is signed in to Google, but not in authorized list)
  const authorizedEmails = settings?.authorizedEmails || [
    'riteshganguly0911@gmail.com',
  ];

  const userEmail = (user.email || '').toLowerCase().trim();
  const isAuthorized =
    authorizedEmails.length === 0 ||
    authorizedEmails.some((email) => email.toLowerCase().trim() === userEmail);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-tr from-[#FFF0F5] via-[#FFF8F4] to-[#E9DDFB]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass-panel rounded-3xl p-8 sm:p-10 text-center shadow-xl border border-rose-200"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center shadow-inner">
            <Heart className="w-8 h-8 text-rose-500" />
          </div>

          <h2 className="text-2xl font-serif font-bold text-[#54334F]">
            This Little Universe is Private 💗
          </h2>
          <p className="text-xs sm:text-sm text-[#7A5374] mt-2 mb-6 leading-relaxed">
            Signed in as <strong className="text-[#54334F]">{user.email}</strong>, but this Google account is not in the list of authorized couple partners for this memory vault.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleSignOutUser}
              className="w-full py-3 px-5 rounded-xl bg-white border border-[#F5A9C8] text-[#54334F] font-semibold text-xs sm:text-sm hover:bg-[#FFF8F4] transition-colors cursor-pointer shadow-2xs"
            >
              Sign into a different Google account
            </button>

            <button
              onClick={onLogoutGate}
              className="w-full py-2.5 px-4 text-xs text-[#7A5374] hover:text-[#54334F] cursor-pointer"
            >
              Lock Vault Gate
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 4. AUTHENTICATED & AUTHORIZED
  return <>{children}</>;
};
