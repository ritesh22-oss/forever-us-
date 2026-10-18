import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Lock, KeyRound, Eye, EyeOff, AlertCircle, Sparkles, Clock, Delete } from 'lucide-react';
import { GateStatusResponse } from '../types';

interface PasswordGateProps {
  onSuccess: (token: string) => void;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({ onSuccess }) => {
  const [pin, setPin] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<GateStatusResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [remainingCooldown, setRemainingCooldown] = useState<number>(0);

  // Check initial gate status from server
  const checkGateStatus = async () => {
    try {
      const res = await fetch('/api/auth/gate-status');
      if (res.ok) {
        const data: GateStatusResponse = await res.json();
        setStatus(data);
        if (data.locked) {
          setIsLockedOut(true);
          setRemainingCooldown(data.retryAfterSeconds || 300);
        } else if (data.unlocked) {
          onSuccess('cached-session');
        }
      }
    } catch (err) {
      console.warn("Could not reach gate status endpoint:", err);
    }
  };

  useEffect(() => {
    checkGateStatus();
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (remainingCooldown <= 0) {
      if (isLockedOut) {
        setIsLockedOut(false);
        checkGateStatus();
      }
      return;
    }
    const timer = setInterval(() => {
      setRemainingCooldown((prev) => {
        if (prev <= 1) {
          setIsLockedOut(false);
          checkGateStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remainingCooldown, isLockedOut]);

  // Submit Password to server
  const handleSubmitPin = async (enteredPin: string) => {
    if (isLockedOut || isLoading) return;
    if (enteredPin.length < 4) {
      setErrorMsg("Please enter the 4-digit code.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/verify-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: enteredPin }),
      });

      const data = await res.json();

      if (res.status === 429 || data.locked) {
        setIsLockedOut(true);
        setRemainingCooldown(data.retryAfterSeconds || 300);
        setErrorMsg(null);
      } else if (res.ok && data.success) {
        setSuccessMsg(data.message || "Welcome home, my love! Opening our universe... 💖");
        setTimeout(() => {
          onSuccess(data.token);
        }, 1200);
      } else {
        setPin('');
        setErrorMsg(data.error || "Incorrect password. Please try again.");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (num: string) => {
    if (isLockedOut || pin.length >= 4) return;
    const nextPin = pin + num;
    setPin(nextPin);
    setErrorMsg(null);
    if (nextPin.length === 4) {
      handleSubmitPin(nextPin);
    }
  };

  const handleDelete = () => {
    if (isLockedOut) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    if (isLockedOut) return;
    setPin('');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-tr from-[#FFF0F5] via-[#FFF8F4] to-[#E9DDFB]">
      {/* Floating background ambient elements */}
      <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-[#FFD6E7]/35 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-[#E9DDFB]/40 blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md glass-panel rounded-3xl p-8 relative shadow-2xl border border-white/60 text-center"
      >
        {/* Decorative Top Heart Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-tr from-[#F5A9C8] to-[#FFD6E7] flex items-center justify-center shadow-md mb-4 animate-gentle-pulse">
          <Heart className="w-8 h-8 text-[#54334F] fill-[#54334F]/20" />
        </div>

        <h2 className="text-3xl font-serif font-bold text-[#54334F] tracking-tight">
          Forever Us
        </h2>
        <p className="text-sm font-handwriting text-2xl text-[#E07A9C] mt-0.5 mb-6">
          Our Private Sanctuary
        </p>

        {/* Success Message Banner */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-3 rounded-2xl bg-[#E9DDFB]/80 text-[#54334F] text-sm font-medium border border-[#F5A9C8] flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#E07A9C] animate-spin" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4 Password Dots Display */}
        <div className="flex items-center justify-center gap-4 my-6">
          {[0, 1, 2, 3].map((index) => {
            const hasChar = pin.length > index;
            return (
              <motion.div
                key={index}
                animate={{
                  scale: hasChar ? 1.15 : 1,
                  backgroundColor: hasChar ? '#E07A9C' : '#FFFFFF',
                  borderColor: hasChar ? '#54334F' : '#F5A9C8',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="w-12 h-14 rounded-2xl border-2 flex items-center justify-center shadow-xs transition-colors"
              >
                {hasChar ? (
                  showPassword ? (
                    <span className="text-lg font-bold text-white">{pin[index]}</span>
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
                  )
                ) : (
                  <div className="w-2 h-2 rounded-full bg-[#F5A9C8]/40" />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Show/Hide Password Toggle */}
        <div className="flex items-center justify-center mb-6">
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="flex items-center gap-1.5 text-xs text-[#7A5374] hover:text-[#54334F] transition-colors py-1 px-3 rounded-full hover:bg-white/50 cursor-pointer"
          >
            {showPassword ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide Password</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Show Password</span>
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex items-center justify-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Soft Keypad (0-9) */}
        <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLockedOut || isLoading}
              onClick={() => handleKeyPress(digit.toString())}
              className="h-12 rounded-2xl bg-white/70 hover:bg-white text-lg font-medium text-[#54334F] shadow-xs active:scale-95 transition-all border border-[#FFD6E7]/60 flex items-center justify-center cursor-pointer disabled:opacity-40"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={isLockedOut || isLoading}
            onClick={handleClear}
            className="h-12 rounded-2xl bg-white/40 hover:bg-white/70 text-xs font-medium text-[#7A5374] active:scale-95 transition-all border border-transparent flex items-center justify-center cursor-pointer disabled:opacity-40"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={isLockedOut || isLoading}
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-2xl bg-white/70 hover:bg-white text-lg font-medium text-[#54334F] shadow-xs active:scale-95 transition-all border border-[#FFD6E7]/60 flex items-center justify-center cursor-pointer disabled:opacity-40"
          >
            0
          </button>
          <button
            type="button"
            disabled={isLockedOut || isLoading}
            onClick={handleDelete}
            className="h-12 rounded-2xl bg-white/40 hover:bg-white/70 text-[#7A5374] active:scale-95 transition-all border border-transparent flex items-center justify-center cursor-pointer disabled:opacity-40"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Cute Animated Heart-Shaped Unlock Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          disabled={pin.length < 4 || isLockedOut || isLoading}
          onClick={() => handleSubmitPin(pin)}
          className={`w-full py-3.5 px-6 rounded-2xl font-semibold shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            pin.length === 4 && !isLockedOut
              ? 'bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#54334F] text-white hover:shadow-lg'
              : 'bg-white/60 text-[#7A5374]/50 border border-[#FFD6E7] cursor-not-allowed'
          }`}
        >
          <Heart className={`w-5 h-5 ${pin.length === 4 ? 'fill-white animate-gentle-pulse' : ''}`} />
          <span>{isLoading ? 'Unlocking...' : 'Unlock Our Vault'}</span>
        </motion.button>

        <p className="text-[11px] text-[#7A5374]/60 mt-4">
          Secured with server-enforced authentication & rate protection.
        </p>
      </motion.div>

      {/* Custom Lockout Modal */}
      <AnimatePresence>
        {isLockedOut && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-[#FFF8F4] rounded-3xl p-8 border-2 border-[#F5A9C8] shadow-2xl text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFD6E7] flex items-center justify-center">
                <Heart className="w-8 h-8 text-[#E07A9C] fill-[#E07A9C]/30 animate-pulse" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-[#54334F] mb-3">
                Pause in Our Universe
              </h3>
              <p className="text-sm text-[#54334F]/85 leading-relaxed mb-6 font-medium">
                "Our little universe is taking a tiny pause. 💗 Too many incorrect attempts. Please try again later."
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E9DDFB]/60 text-xs font-semibold text-[#54334F] border border-[#F5A9C8]">
                <Clock className="w-4 h-4 text-[#E07A9C]" />
                <span>
                  Please wait {Math.floor(remainingCooldown / 60)}m {remainingCooldown % 60}s
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
