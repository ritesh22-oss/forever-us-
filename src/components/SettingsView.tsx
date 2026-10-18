import React, { useState } from 'react';
import { CoupleSettings, MemoryItem, AlbumItem, LoveLetterItem, TimelineEventItem } from '../types';
import { User, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  Settings,
  Heart,
  HardDrive,
  KeyRound,
  Download,
  LogOut,
  Palette,
  Sparkles,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsViewProps {
  settings: CoupleSettings | null;
  memories: MemoryItem[];
  albums: AlbumItem[];
  letters: LoveLetterItem[];
  timeline: TimelineEventItem[];
  user: User;
  onRefreshSettings: () => void;
  onLogoutGate: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  memories,
  albums,
  letters,
  timeline,
  user,
  onRefreshSettings,
  onLogoutGate,
}) => {
  // Couple Profile Form
  const [partner1Name, setPartner1Name] = useState(settings?.partner1Name || 'Ritesh');
  const [partner2Name, setPartner2Name] = useState(settings?.partner2Name || 'My Love');
  const [anniversaryDate, setAnniversaryDate] = useState(settings?.anniversaryDate || '2026-07-10');
  const [relationshipStartDate, setRelationshipStartDate] = useState(
    settings?.relationshipStartDate || '2026-07-10'
  );
  const [theme, setTheme] = useState<'blush' | 'lavender' | 'cream' | 'midnight'>(
    settings?.theme || 'blush'
  );
  const [reducedMotion, setReducedMotion] = useState(settings?.reducedMotion || false);
  const [partnerEmail, setPartnerEmail] = useState(
    settings?.authorizedEmails?.find((e) => e !== user.email) || ''
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);

  // Password Update Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);

  // Storage calculation
  const totalBytesUsed = memories.reduce((acc, m) => acc + (m.fileSize || 0), 0);
  const totalMbUsed = totalBytesUsed / (1024 * 1024);
  const sparkQuotaMb = 1024; // 1 GB Spark Free Tier
  const usedPercent = Math.min(100, Math.max(1, Math.round((totalMbUsed / sparkQuotaMb) * 100)));

  // Save couple profile & preferences to Firestore
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSavedMsg(false);

    try {
      const authorizedList = [user.email || ''];
      if (partnerEmail.trim()) {
        authorizedList.push(partnerEmail.trim());
      }

      const updated: CoupleSettings = {
        coupleId: 'forever-us',
        partner1Name: partner1Name.trim(),
        partner2Name: partner2Name.trim(),
        anniversaryDate,
        relationshipStartDate,
        theme,
        reducedMotion,
        musicEnabled: false,
        authorizedEmails: authorizedList,
        updatedAt: new Date().toISOString(),
        updatedBy: user.email || '',
      };

      await setDoc(doc(db, 'settings', 'forever-us'), updated, { merge: true });
      setIsSavingProfile(false);
      setProfileSavedMsg(true);
      setTimeout(() => setProfileSavedMsg(false), 3000);
      onRefreshSettings();
    } catch (err) {
      console.error("Failed saving profile:", err);
      setIsSavingProfile(false);
    }
  };

  // Change Vault Gate Password via Server API
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (newPassword.length < 4) {
      setPwdError("New password must be at least 4 digits/characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }

    setIsUpdatingPwd(true);
    try {
      const res = await fetch('/api/auth/update-gate-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwdSuccess("Vault password successfully updated! 💕");
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwdError(data.error || "Failed to update password.");
      }
    } catch {
      setPwdError("Network error updating password.");
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  // Export Complete Backup JSON
  const handleExportBackup = () => {
    const backupData = {
      vaultName: 'Forever Us',
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
      settings,
      stats: {
        totalMemories: memories.length,
        totalAlbums: albums.length,
        totalLetters: letters.length,
        totalTimelineEvents: timeline.length,
        totalStorageBytes: totalBytesUsed,
      },
      memories,
      albums,
      letters,
      timeline,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `forever-us-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSignOutFull = async () => {
    await signOut(auth);
    onLogoutGate();
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#54334F] flex items-center gap-2">
          <span>Our Sanctuary Settings</span>
          <span className="text-xl">⚙️</span>
        </h2>
        <p className="text-xs sm:text-sm text-[#7A5374] mt-0.5">
          Configure our couple details, anniversary, cloud storage, and security.
        </p>
      </div>

      {/* SECTION 1: STORAGE USAGE DASHBOARD */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-[#FFD6E7] shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#FFD6E7]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFD6E7] flex items-center justify-center text-[#54334F]">
              <HardDrive className="w-5 h-5 text-[#E07A9C]" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#54334F]">
                Cloud Storage Dashboard
              </h3>
              <p className="text-xs text-[#7A5374]">
                Google Cloud Storage & Firestore Spark Tier
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold text-[#54334F] px-3 py-1 bg-white rounded-full border border-[#FFD6E7]">
            {totalMbUsed.toFixed(1)} MB / 1,024 MB Used ({usedPercent}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-white rounded-full overflow-hidden p-0.5 border border-[#FFD6E7] my-4">
          <div
            className="h-full bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#54334F] rounded-full transition-all duration-300"
            style={{ width: `${usedPercent}%` }}
          />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center my-4">
          <div className="bg-white/70 p-3 rounded-2xl border border-[#FFD6E7]">
            <span className="text-xl font-serif font-bold text-[#54334F] block">
              {memories.length}
            </span>
            <span className="text-[10px] text-[#7A5374] uppercase">Saved Media</span>
          </div>

          <div className="bg-white/70 p-3 rounded-2xl border border-[#FFD6E7]">
            <span className="text-xl font-serif font-bold text-[#54334F] block">
              {albums.length}
            </span>
            <span className="text-[10px] text-[#7A5374] uppercase">Albums & Folders</span>
          </div>

          <div className="bg-white/70 p-3 rounded-2xl border border-[#FFD6E7]">
            <span className="text-xl font-serif font-bold text-[#54334F] block">
              {letters.length}
            </span>
            <span className="text-[10px] text-[#7A5374] uppercase">Love Letters</span>
          </div>

          <div className="bg-white/70 p-3 rounded-2xl border border-[#FFD6E7]">
            <span className="text-xl font-serif font-bold text-[#54334F] block">
              {timeline.length}
            </span>
            <span className="text-[10px] text-[#7A5374] uppercase">Milestones</span>
          </div>
        </div>

        {/* Cloud Notice */}
        <p className="text-[11px] text-[#7A5374] leading-relaxed bg-[#FFF8F4] p-3 rounded-xl border border-[#FFD6E7]">
          💡 <strong>Firebase Storage Notice:</strong> Our app is connected to Firebase Cloud Storage Spark free tier (1 GB cloud storage, 50 GB/day download bandwidth). Media uploaded here remains permanently available independently of your phone gallery.
        </p>
      </div>

      {/* SECTION 2: COUPLE NAMES & ANNIVERSARY */}
      <form onSubmit={handleSaveProfile} className="glass-panel rounded-3xl p-6 sm:p-7 border border-[#FFD6E7] shadow-xs space-y-4">
        <h3 className="font-serif font-bold text-lg text-[#54334F] flex items-center gap-2">
          <Heart className="w-5 h-5 text-[#E07A9C]" />
          <span>Our Profile & Special Dates</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#54334F] block mb-1">
              Partner 1 Name
            </label>
            <input
              type="text"
              required
              value={partner1Name}
              onChange={(e) => setPartner1Name(e.target.value)}
              className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#54334F] block mb-1">
              Partner 2 Name
            </label>
            <input
              type="text"
              required
              value={partner2Name}
              onChange={(e) => setPartner2Name(e.target.value)}
              className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#54334F] block mb-1">
              Relationship Start Date
            </label>
            <input
              type="date"
              required
              value={relationshipStartDate}
              onChange={(e) => setRelationshipStartDate(e.target.value)}
              className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#54334F] block mb-1">
              Anniversary Date
            </label>
            <input
              type="date"
              required
              value={anniversaryDate}
              onChange={(e) => setAnniversaryDate(e.target.value)}
              className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-[#54334F] block mb-1">
              Partner Authorized Email (for Google Login access)
            </label>
            <input
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="e.g. sweetheart@gmail.com"
              className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none"
            />
          </div>
        </div>

        {profileSavedMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Profile settings successfully saved! 💕</span>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSavingProfile}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#54334F] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>

      {/* SECTION 3: VAULT GATE PASSWORD CHANGE */}
      <form onSubmit={handleUpdatePassword} className="glass-panel rounded-3xl p-6 sm:p-7 border border-[#FFD6E7] shadow-xs space-y-4">
        <h3 className="font-serif font-bold text-lg text-[#54334F] flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[#E07A9C]" />
          <span>Change Vault Gate Access Password</span>
        </h3>
        <p className="text-xs text-[#7A5374]">
          Update the initial 4-digit password used to open our vault gate (currently defaults to 1709).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-[#54334F] block mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••"
              className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#54334F] block mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••"
              className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#54334F] block mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••"
              className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none"
            />
          </div>
        </div>

        {pwdError && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            <span>{pwdError}</span>
          </div>
        )}

        {pwdSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{pwdSuccess}</span>
          </div>
        )}

        <div className="pt-1 flex justify-end">
          <button
            type="submit"
            disabled={isUpdatingPwd || !newPassword}
            className="px-5 py-2.5 rounded-xl bg-[#54334F] text-white text-xs font-semibold hover:bg-[#3d2439] transition-all cursor-pointer disabled:opacity-50"
          >
            {isUpdatingPwd ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>

      {/* SECTION 4: EXPORT & SECURITY CONTROLS */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-[#FFD6E7] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-serif font-bold text-base text-[#54334F] flex items-center gap-2">
            <Download className="w-4 h-4 text-[#E07A9C]" />
            <span>Export & Backup Vault Data</span>
          </h4>
          <p className="text-xs text-[#7A5374] mt-0.5">
            Download a complete offline JSON backup of all metadata, letters, and albums.
          </p>
        </div>

        <button
          onClick={handleExportBackup}
          className="px-5 py-2.5 rounded-xl bg-white border border-[#F5A9C8] text-[#54334F] text-xs font-semibold hover:bg-[#FFF8F4] transition-all cursor-pointer flex items-center gap-2 shadow-xs shrink-0"
        >
          <Download className="w-4 h-4 text-[#E07A9C]" />
          <span>Download Backup JSON</span>
        </button>
      </div>

      {/* Logout & Lock */}
      <div className="pt-4 flex items-center justify-between">
        <span className="text-xs text-[#7A5374]">
          Signed in as <strong>{user.email}</strong>
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={onLogoutGate}
            className="px-4 py-2 rounded-xl bg-white border border-[#FFD6E7] text-xs font-medium text-[#7A5374] hover:text-[#54334F] cursor-pointer"
          >
            Lock Vault Gate
          </button>
          <button
            onClick={handleSignOutFull}
            className="px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 hover:bg-rose-100 cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
