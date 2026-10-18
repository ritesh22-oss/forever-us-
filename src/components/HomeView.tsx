import React, { useState } from 'react';
import { MemoryItem, AlbumItem, LoveLetterItem, TimelineEventItem, CoupleSettings } from '../types';
import {
  Heart,
  Sparkles,
  Camera,
  Video,
  Mail,
  FolderHeart,
  Calendar,
  Gift,
  ArrowRight,
  Compass,
  UploadCloud,
  Shuffle,
  Quote,
  History,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getRandomQuote, RomanticQuote } from '../lib/romanticQuotes';
import { getRelationshipDuration } from '../lib/relationshipCounter';
import confetti from 'canvas-confetti';

interface HomeViewProps {
  memories: MemoryItem[];
  albums: AlbumItem[];
  letters: LoveLetterItem[];
  timeline: TimelineEventItem[];
  settings: CoupleSettings | null;
  onNavigateTab: (tab: 'gallery' | 'rope' | 'albums' | 'letters' | 'timeline' | 'settings') => void;
  onSelectMemory: (index: number) => void;
  onOpenUpload: () => void;
  onOpenComposer: () => void;
  onOpenCalendar?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  memories,
  albums,
  letters,
  timeline,
  settings,
  onNavigateTab,
  onSelectMemory,
  onOpenUpload,
  onOpenComposer,
  onOpenCalendar,
}) => {
  const [dailyQuote, setDailyQuote] = useState<RomanticQuote>(getRandomQuote());
  const [surpriseMemory, setSurpriseMemory] = useState<MemoryItem | null>(null);

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const p1 = settings?.partner1Name || 'Ritesh';
    const p2 = settings?.partner2Name || 'My Love';
    if (hour < 12) return `Good morning, ${p1} & ${p2} 💕`;
    if (hour < 18) return `Good afternoon, ${p1} & ${p2} 💕`;
    return `Good evening, ${p1} & ${p2} 💕`;
  };

  // Days & Months together from 10 July 2026 using shared robust utility
  const startDateStr = settings?.relationshipStartDate || settings?.anniversaryDate || '2026-07-10';
  const duration = getRelationshipDuration(startDateStr);
  
  const calculateDaysTogether = () => duration.daysTogether;
  const calculateMonthsAndDays = () => duration.monthsAndDaysString;

  // Featured memory: pick favorite or most recent
  const activeMemories = memories.filter((m) => !m.isDeleted);
  const featuredMemory = activeMemories.find((m) => m.isFavorite) || activeMemories[0];

  // Recently uploaded (last 6)
  const recentMemories = [...activeMemories]
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 6);

  // "On This Day" (matches MM-DD)
  const todayMMDD = new Date().toISOString().substring(5, 10);
  const onThisDayMemories = activeMemories.filter((m) => {
    const captureMMDD = m.captureDate?.substring(5, 10);
    const uploadMMDD = m.uploadedAt?.substring(5, 10);
    return captureMMDD === todayMMDD || uploadMMDD === todayMMDD;
  });

  // Pick a surprise random memory
  const handleOpenRandomMemory = () => {
    if (activeMemories.length === 0) return;
    const randomIndex = Math.floor(Math.random() * activeMemories.length);
    const pick = activeMemories[randomIndex];
    setSurpriseMemory(pick);
    confetti({
      particleCount: 25,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFD6E7', '#F5A9C8', '#E07A9C', '#E9DDFB'],
    });
  };

  return (
    <div className="space-y-10 pb-12">
      {/* HERO SECTION */}
      <div className="text-center max-w-2xl mx-auto pt-4 space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/70 border border-[#FFD6E7] text-xs font-semibold text-[#7A5374] shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#E07A9C]" />
          <span>{getGreeting()}</span>
        </span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-[#54334F] tracking-tight">
          Our Little Universe <span className="inline-block animate-gentle-pulse">💗</span>
        </h1>

        <p className="font-handwriting text-2xl sm:text-3xl text-[#E07A9C]">
          Every little moment, saved forever.
        </p>

        {/* Live Counters */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <div className="px-4 py-2 rounded-2xl bg-white/80 border border-[#FFD6E7] shadow-xs flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#E07A9C] fill-[#E07A9C]/20" />
            <span className="text-xs font-semibold text-[#54334F]">
              {calculateDaysTogether()} Days of Us 💗
            </span>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-white/80 border border-[#FFD6E7] shadow-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#7A5374]" />
            <span className="text-xs font-semibold text-[#54334F]">
              {calculateMonthsAndDays()}
            </span>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-white/80 border border-[#FFD6E7] shadow-xs flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#7A5374]" />
            <span className="text-xs font-semibold text-[#54334F]">
              {activeMemories.length} Precious Moments Saved
            </span>
          </div>
        </div>
      </div>

      {/* FEATURED MEMORY & RANDOM SURPRISE CTA */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center max-w-5xl mx-auto">
        {/* Featured Memory Polaroid Card */}
        <div className="md:col-span-7 flex justify-center">
          {featuredMemory ? (
            <motion.div
              whileHover={{ rotate: 0, scale: 1.02 }}
              onClick={() => {
                const idx = activeMemories.findIndex((m) => m.id === featuredMemory.id);
                if (idx !== -1) onSelectMemory(idx);
              }}
              style={{ transform: 'rotate(-1.8deg)' }}
              className="polaroid-card rounded-2xl cursor-pointer max-w-md w-full shadow-lg border border-white/60 group"
            >
              <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-[#FFF0F5] mb-3">
                {featuredMemory.mediaType === 'video' ? (
                  <video
                    src={featuredMemory.downloadUrl}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <img
                    src={featuredMemory.downloadUrl}
                    alt={featuredMemory.caption || 'Featured memory'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-xs text-[10px] font-semibold text-[#54334F] flex items-center gap-1 shadow-xs">
                  <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                  <span>Featured Moment</span>
                </div>
              </div>

              <div className="text-left px-1">
                <p className="font-serif font-bold text-base text-[#54334F] truncate group-hover:text-[#E07A9C] transition-colors">
                  {featuredMemory.caption || featuredMemory.filename}
                </p>
                <div className="flex items-center justify-between text-xs text-[#7A5374] mt-1">
                  <span>{featuredMemory.captureDate || new Date(featuredMemory.uploadedAt).toLocaleDateString()}</span>
                  <span className="font-medium text-[#E07A9C] flex items-center gap-1">
                    <span>Revisit memory</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="glass-panel rounded-3xl p-8 text-center border border-[#FFD6E7] max-w-md w-full">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#FFD6E7] flex items-center justify-center animate-gentle-pulse">
                <Camera className="w-7 h-7 text-[#E07A9C]" />
              </div>
              <h3 className="font-serif font-bold text-xl text-[#54334F]">
                Our Story Starts Here
              </h3>
              <p className="text-xs text-[#7A5374] mt-1 mb-5 leading-relaxed">
                Upload our favorite photos, videos, and dates into the cloud storage vault.
              </p>
              <button
                onClick={onOpenUpload}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F5A9C8] to-[#54334F] text-white text-xs font-semibold shadow-xs"
              >
                Upload First Memory
              </button>
            </div>
          )}
        </div>

        {/* Side Actions & "Open a Little Memory" Surprise */}
        <div className="md:col-span-5 space-y-4">
          {/* Random Surprise Card */}
          <div className="glass-panel rounded-3xl p-6 border border-[#FFD6E7] shadow-xs text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-tr from-[#F5A9C8] to-[#FFD6E7] flex items-center justify-center text-[#54334F] shadow-xs">
              <Shuffle className="w-6 h-6 text-[#54334F]" />
            </div>
            <h3 className="font-serif font-bold text-xl text-[#54334F]">
              Open a Little Memory
            </h3>
            <p className="text-xs text-[#7A5374] leading-relaxed">
              Let fate pick a cherished moment from our vault to smile at right now.
            </p>
            <button
              onClick={handleOpenRandomMemory}
              disabled={activeMemories.length === 0}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#54334F] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Surprise Me With a Memory 💗</span>
            </button>
          </div>

          {/* Daily Romantic Quote Card */}
          <div className="glass-panel-subtle rounded-3xl p-5 border border-white/80 relative text-left">
            <Quote className="w-6 h-6 text-[#F5A9C8] opacity-50 absolute top-4 right-4" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A5374]">
              Daily Note to You
            </span>
            <p className="text-sm font-serif italic text-[#54334F] mt-1 leading-relaxed">
              "{dailyQuote.quote}"
            </p>
            <span className="text-[11px] text-[#E07A9C] font-handwriting text-lg block mt-1">
              — {dailyQuote.author}
            </span>
          </div>
        </div>
      </div>

      {/* QUICK ACCESS ROMANTIC SANCTUARIES */}
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-xl text-[#54334F] flex items-center gap-2">
            <span>Explore Our Sanctuary</span>
            <span className="text-sm">✨</span>
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <button
            onClick={() => onNavigateTab('gallery')}
            className="glass-panel p-4 rounded-2xl border border-[#FFD6E7] hover:border-[#F5A9C8] transition-all text-left shadow-2xs group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FFF0F5] flex items-center justify-center text-[#E07A9C] mb-2.5 group-hover:scale-110 transition-transform">
              <Camera className="w-5 h-5" />
            </div>
            <h4 className="font-serif font-bold text-sm text-[#54334F] group-hover:text-[#E07A9C] transition-colors truncate">
              Photos & Media
            </h4>
            <span className="text-[11px] text-[#7A5374]">
              {activeMemories.length} saved
            </span>
          </button>

          <button
            onClick={() => onNavigateTab('rope')}
            className="glass-panel p-4 rounded-2xl border border-[#FFD6E7] hover:border-[#F5A9C8] transition-all text-left shadow-2xs group cursor-pointer relative overflow-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FFF0F5] to-[#FFD6E7] flex items-center justify-center text-xl mb-2.5 group-hover:scale-110 transition-transform shadow-2xs">
              🪢
            </div>
            <h4 className="font-serif font-bold text-sm text-[#54334F] group-hover:text-[#E07A9C] transition-colors truncate">
              3D Love Rope
            </h4>
            <span className="text-[11px] text-[#E07A9C] font-semibold">
              From 10 July 2026
            </span>
          </button>

          <button
            onClick={() => onOpenCalendar?.()}
            className="glass-panel p-4 rounded-2xl border border-[#FFD6E7] hover:border-[#F5A9C8] transition-all text-left shadow-2xs group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FFF0F5] flex items-center justify-center text-[#E07A9C] mb-2.5 group-hover:scale-110 transition-transform relative">
              <Calendar className="w-5 h-5" />
              <Heart className="w-2 h-2 text-rose-500 fill-rose-500 absolute top-1 right-1 animate-pulse" />
            </div>
            <h4 className="font-serif font-bold text-sm text-[#54334F] group-hover:text-[#E07A9C] transition-colors truncate">
              Memory Calendar
            </h4>
            <span className="text-[11px] text-[#7A5374]">
              Date Discovery 📅
            </span>
          </button>

          <button
            onClick={() => onNavigateTab('albums')}
            className="glass-panel p-4 rounded-2xl border border-[#FFD6E7] hover:border-[#F5A9C8] transition-all text-left shadow-2xs group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FFF0F5] flex items-center justify-center text-[#E07A9C] mb-2.5 group-hover:scale-110 transition-transform">
              <FolderHeart className="w-5 h-5" />
            </div>
            <h4 className="font-serif font-bold text-sm text-[#54334F] group-hover:text-[#E07A9C] transition-colors truncate">
              Custom Albums
            </h4>
            <span className="text-[11px] text-[#7A5374]">
              {albums.length} chapters
            </span>
          </button>

          <button
            onClick={() => onNavigateTab('letters')}
            className="glass-panel p-4 rounded-2xl border border-[#FFD6E7] hover:border-[#F5A9C8] transition-all text-left shadow-2xs group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FFF0F5] flex items-center justify-center text-[#E07A9C] mb-2.5 group-hover:scale-110 transition-transform">
              <Mail className="w-5 h-5" />
            </div>
            <h4 className="font-serif font-bold text-sm text-[#54334F] group-hover:text-[#E07A9C] transition-colors truncate">
              Love Letters
            </h4>
            <span className="text-[11px] text-[#7A5374]">
              {letters.length} written
            </span>
          </button>

          <button
            onClick={() => onNavigateTab('timeline')}
            className="glass-panel p-4 rounded-2xl border border-[#FFD6E7] hover:border-[#F5A9C8] transition-all text-left shadow-2xs group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FFF0F5] flex items-center justify-center text-[#E07A9C] mb-2.5 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="font-serif font-bold text-sm text-[#54334F] group-hover:text-[#E07A9C] transition-colors truncate">
              Our Timeline
            </h4>
            <span className="text-[11px] text-[#7A5374]">
              {timeline.length} dates
            </span>
          </button>
        </div>
      </div>

      {/* RECENTLY UPLOADED GRID */}
      {recentMemories.length > 0 && (
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-xl text-[#54334F]">
                Recently Added Moments
              </h3>
              <p className="text-xs text-[#7A5374]">
                Freshly saved into our cloud sanctuary
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('gallery')}
              className="text-xs font-semibold text-[#E07A9C] hover:text-[#54334F] flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {recentMemories.map((m, idx) => (
              <div
                key={m.id}
                onClick={() => {
                  const fullIdx = activeMemories.findIndex((item) => item.id === m.id);
                  if (fullIdx !== -1) onSelectMemory(fullIdx);
                }}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-[#FFF0F5] cursor-pointer shadow-xs border border-white/60"
              >
                {m.mediaType === 'video' ? (
                  <video src={m.downloadUrl} className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={m.downloadUrl}
                    alt={m.caption || ''}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <span className="text-[10px] text-white font-medium truncate">
                    {m.caption || m.filename}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RANDOM MEMORY SURPRISE MODAL */}
      <AnimatePresence>
        {surpriseMemory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg bg-[#FFF8F4] rounded-3xl p-6 sm:p-7 shadow-2xl border-2 border-[#F5A9C8] text-center"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#FFD6E7]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#E07A9C]" />
                  <span className="font-serif font-bold text-lg text-[#54334F]">
                    A Little Memory For You 💗
                  </span>
                </div>
                <button
                  onClick={() => setSurpriseMemory(null)}
                  className="p-1 rounded-full hover:bg-white text-[#7A5374]"
                >
                  ✕
                </button>
              </div>

              <div className="my-4 aspect-4/3 rounded-2xl overflow-hidden bg-[#FFF0F5] shadow-inner">
                {surpriseMemory.mediaType === 'video' ? (
                  <video src={surpriseMemory.downloadUrl} controls autoPlay className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={surpriseMemory.downloadUrl}
                    alt={surpriseMemory.caption || ''}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <h4 className="font-serif font-bold text-lg text-[#54334F]">
                {surpriseMemory.caption || surpriseMemory.filename}
              </h4>
              <p className="text-xs text-[#7A5374] mt-1 mb-4">
                Captured {surpriseMemory.captureDate || new Date(surpriseMemory.uploadedAt).toLocaleDateString()}
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleOpenRandomMemory}
                  className="px-4 py-2 rounded-xl bg-white border border-[#FFD6E7] text-xs font-semibold text-[#54334F] hover:bg-[#FFF0F5] cursor-pointer"
                >
                  Pick Another Memory
                </button>
                <button
                  onClick={() => {
                    const idx = activeMemories.findIndex((m) => m.id === surpriseMemory.id);
                    setSurpriseMemory(null);
                    if (idx !== -1) onSelectMemory(idx);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F5A9C8] to-[#54334F] text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Open Full View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="pt-8 pb-4 text-center border-t border-[#FFD6E7]/60">
        <p className="text-xs text-[#7A5374]/80 font-serif italic">
          "Made of you, me, and all our little moments."
        </p>
        <span className="text-[10px] text-[#7A5374]/50 mt-1 block">
          Forever Us Sanctuary · Private Couple Vault
        </span>
      </footer>
    </div>
  );
};
