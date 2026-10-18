import React from 'react';
import {
  Heart,
  Sparkles,
  Home,
  Image as ImageIcon,
  Video,
  FolderHeart,
  Calendar,
  Mail,
  Settings,
  UploadCloud,
  Search,
  Star,
  Clock,
  HardDrive,
  Lock,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';

interface HamburgerMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tab: any, extra?: string) => void;
  onOpenCalendar: () => void;
  onOpenUpload: () => void;
  user: User | null;
  onLogout: () => void;
  counts: {
    memories: number;
    albums: number;
    letters: number;
    timeline: number;
    favorites: number;
  };
}

export const HamburgerMenuDrawer: React.FC<HamburgerMenuDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenCalendar,
  onOpenUpload,
  user,
  onLogout,
  counts,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-xs"
        />

        {/* Sliding Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="absolute inset-y-0 right-0 w-full sm:w-[360px] bg-[#FFF8F4] border-l border-[#FFD6E7] shadow-2xl flex flex-col z-10 overflow-hidden"
        >
          {/* Drawer Header */}
          <div className="p-6 border-b border-[#FFD6E7] bg-white/75 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F5A9C8] to-[#FFD6E7] flex items-center justify-center text-[#54334F] shadow-xs">
                <Heart className="w-5 h-5 fill-[#54334F]/20 text-[#54334F] animate-gentle-pulse" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-[#54334F]">
                  Our Little Universe 💗
                </h3>
                <p className="text-[11px] font-handwriting text-[#E07A9C]">
                  Every little moment, saved forever.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#FFF0F5] text-[#7A5374] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Menu Items (Unnumbered, clean list) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {/* Home */}
            <button
              onClick={() => {
                onSelectTab('home');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] font-semibold shadow-2xs'
                  : 'text-[#7A5374] hover:bg-white hover:text-[#54334F]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Home className="w-4 h-4 text-[#E07A9C]" />
                <span className="text-xs font-medium tracking-wide">Home</span>
              </div>
            </button>

            {/* All Memories */}
            <button
              onClick={() => {
                onSelectTab('gallery');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'gallery'
                  ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] font-semibold shadow-2xs'
                  : 'text-[#7A5374] hover:bg-white hover:text-[#54334F]'
              }`}
            >
              <div className="flex items-center gap-3">
                <ImageIcon className="w-4 h-4 text-[#E07A9C]" />
                <span className="text-xs font-medium tracking-wide">All Memories</span>
              </div>
              <span className="text-[10px] font-mono opacity-75">{counts.memories}</span>
            </button>

            {/* Photos */}
            <button
              onClick={() => {
                onSelectTab('gallery', 'photos');
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[#7A5374] hover:bg-white hover:text-[#54334F] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-base">📸</span>
                <span className="text-xs font-medium tracking-wide">Photos</span>
              </div>
            </button>

            {/* Videos */}
            <button
              onClick={() => {
                onSelectTab('gallery', 'videos');
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[#7A5374] hover:bg-white hover:text-[#54334F] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Video className="w-4 h-4 text-[#E07A9C]" />
                <span className="text-xs font-medium tracking-wide">Videos</span>
              </div>
            </button>

            {/* Albums & Folders */}
            <button
              onClick={() => {
                onSelectTab('albums');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'albums'
                  ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] font-semibold shadow-2xs'
                  : 'text-[#7A5374] hover:bg-white hover:text-[#54334F]'
              }`}
            >
              <div className="flex items-center gap-3">
                <FolderHeart className="w-4 h-4 text-[#E07A9C]" />
                <span className="text-xs font-medium tracking-wide">Albums & Folders</span>
              </div>
              <span className="text-[10px] font-mono opacity-75">{counts.albums}</span>
            </button>

            {/* 3D Love Rope */}
            <button
              onClick={() => {
                onSelectTab('rope');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'rope'
                  ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] font-semibold shadow-2xs'
                  : 'text-[#7A5374] hover:bg-white hover:text-[#54334F]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🪢</span>
                <span className="text-xs font-medium tracking-wide">3D Love Rope</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">3D</span>
            </button>

            {/* Memory Calendar */}
            <button
              onClick={() => {
                onOpenCalendar();
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[#7A5374] hover:bg-white hover:text-[#54334F] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[#E07A9C]" />
                <span className="text-xs font-medium tracking-wide">Memory Calendar</span>
              </div>
              <span className="text-[10px]">📅💗</span>
            </button>

            {/* Love Letters */}
            <button
              onClick={() => {
                onSelectTab('letters');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'letters'
                  ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] font-semibold shadow-2xs'
                  : 'text-[#7A5374] hover:bg-white hover:text-[#54334F]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#E07A9C]" />
                <span className="text-xs font-medium tracking-wide">Love Letters</span>
              </div>
              <span className="text-[10px] font-mono opacity-75">{counts.letters}</span>
            </button>

            {/* Our Timeline */}
            <button
              onClick={() => {
                onSelectTab('timeline');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'timeline'
                  ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] font-semibold shadow-2xs'
                  : 'text-[#7A5374] hover:bg-white hover:text-[#54334F]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#E07A9C]" />
                <span className="text-xs font-medium tracking-wide">Our Timeline</span>
              </div>
              <span className="text-[10px] font-mono opacity-75">{counts.timeline}</span>
            </button>

            {/* Favorites */}
            <button
              onClick={() => {
                onSelectTab('gallery', 'favorites');
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[#7A5374] hover:bg-white hover:text-[#54334F] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Star className="w-4 h-4 text-[#E07A9C] fill-[#E07A9C]" />
                <span className="text-xs font-medium tracking-wide">Favorites</span>
              </div>
              <span className="text-[10px] font-mono opacity-75">{counts.favorites}</span>
            </button>

            {/* Special Dates */}
            <button
              onClick={() => {
                onSelectTab('timeline');
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[#7A5374] hover:bg-white hover:text-[#54334F] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-base">💍</span>
                <span className="text-xs font-medium tracking-wide">Special Dates</span>
              </div>
            </button>

            {/* Search Memories */}
            <button
              onClick={() => {
                onOpenCalendar();
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[#7A5374] hover:bg-white hover:text-[#54334F] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-[#E07A9C]" />
                <span className="text-xs font-medium tracking-wide">Search Memories</span>
              </div>
            </button>

            {/* Upload a Memory */}
            <button
              onClick={() => {
                onOpenUpload();
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7]/50 text-[#54334F] font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <UploadCloud className="w-4 h-4 text-[#E07A9C]" />
                <span className="text-xs font-medium tracking-wide">Upload a Memory</span>
              </div>
            </button>

            {/* Storage & Backups */}
            <button
              onClick={() => {
                onSelectTab('settings');
                onClose();
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-[#7A5374] hover:bg-white hover:text-[#54334F] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <HardDrive className="w-4 h-4 text-[#E07A9C]" />
                <span className="text-xs font-medium tracking-wide">Storage & Backups</span>
              </div>
            </button>

            {/* Settings */}
            <button
              onClick={() => {
                onSelectTab('settings');
                onClose();
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] font-semibold shadow-2xs'
                  : 'text-[#7A5374] hover:bg-white hover:text-[#54334F]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-[#E07A9C]" />
                <span className="text-xs font-medium tracking-wide">Settings</span>
              </div>
            </button>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-[#FFD6E7] bg-white/75 backdrop-blur-md flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A5374] truncate max-w-[200px]">
              {user?.displayName || user?.email || 'Ritesh & Sweetheart'}
            </span>
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="text-rose-500 hover:text-rose-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Vault</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
