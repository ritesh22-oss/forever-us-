import React, { useState, useEffect } from 'react';
import { TimelineEventItem, MemoryItem, CoupleSettings } from '../types';
import { User } from 'firebase/auth';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Calendar,
  Clock,
  Sparkles,
  Heart,
  Plus,
  Trash2,
  Gift,
  Compass,
  HeartHandshake,
  Coffee,
  Plane,
  Camera,
  X,
  History,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface TimelineViewProps {
  timeline: TimelineEventItem[];
  memories: MemoryItem[];
  settings: CoupleSettings | null;
  user: User;
  onRefreshData: () => void;
  onSelectMemoryById: (memoryId: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  timeline,
  memories,
  settings,
  user,
  onRefreshData,
  onSelectMemoryById,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('💗');
  const [isMilestone, setIsMilestone] = useState(true);

  // Anniversary Countdown state
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Relationship Start Date / Days counter
  const startDateStr = settings?.relationshipStartDate || settings?.anniversaryDate || '2026-07-10';
  const anniversaryDateStr = settings?.anniversaryDate || '2026-07-10';

  const calculateDaysTogether = () => {
    try {
      const start = new Date(startDateStr).getTime();
      const now = new Date().getTime();
      const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
      return Math.max(1, diffDays);
    } catch {
      return 1;
    }
  };

  // Calculate Next Anniversary Countdown
  useEffect(() => {
    const updateCountdown = () => {
      try {
        const now = new Date();
        const [year, month, day] = anniversaryDateStr.split('-').map(Number);
        let nextAnniversary = new Date(now.getFullYear(), month - 1, day);

        if (nextAnniversary.getTime() <= now.getTime()) {
          nextAnniversary = new Date(now.getFullYear() + 1, month - 1, day);
        }

        const diff = nextAnniversary.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        setCountdown({ days, hours, minutes, seconds });
      } catch {
        // Safe fallback
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [anniversaryDateStr]);

  // "On This Day" throwback memories (matches today's MM-DD in previous years)
  const todayMMDD = new Date().toISOString().substring(5, 10);
  const onThisDayMemories = memories.filter((m) => {
    if (m.isDeleted) return false;
    const captureMMDD = m.captureDate?.substring(5, 10);
    const uploadMMDD = m.uploadedAt?.substring(5, 10);
    return captureMMDD === todayMMDD || uploadMMDD === todayMMDD;
  });

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    try {
      const eventId = `event_${Date.now()}`;
      await setDoc(doc(db, 'timeline', eventId), {
        eventId,
        title: title.trim().substring(0, 256),
        date,
        time: time || '',
        description: description.trim().substring(0, 2000),
        icon: icon || '💗',
        category: 'milestone',
        mediaIds: [],
        isMilestone,
        createdAt: new Date().toISOString(),
        creatorUid: user.uid,
      });

      setIsAddModalOpen(false);
      setTitle('');
      setDescription('');
      onRefreshData();
      confetti({ particleCount: 20, spread: 50 });
    } catch (err) {
      console.error("Failed adding timeline event:", err);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("Remove this milestone from timeline?")) return;
    try {
      await deleteDoc(doc(db, 'timeline', eventId));
      onRefreshData();
    } catch (err) {
      console.error("Failed deleting timeline event:", err);
    }
  };

  // Sort timeline chronologically
  const sortedTimeline = [...timeline].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-8">
      {/* Top Banner: Relationship Days Counter & Anniversary Countdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Days Together */}
        <div className="glass-panel rounded-3xl p-6 border border-[#FFD6E7] flex items-center gap-5 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#F5A9C8] to-[#FFD6E7] flex items-center justify-center text-[#54334F] shadow-sm animate-gentle-pulse shrink-0">
            <Heart className="w-8 h-8 fill-[#54334F]/20 text-[#54334F]" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#7A5374]">
              Our Journey So Far
            </span>
            <h3 className="text-3xl font-serif font-bold text-[#54334F] mt-0.5">
              Day {calculateDaysTogether()} Together
            </h3>
            <p className="text-xs text-[#7A5374] mt-1">
              Started {startDateStr} · Every day more in love than before.
            </p>
          </div>
        </div>

        {/* Next Anniversary Countdown */}
        <div className="glass-panel-lavender rounded-3xl p-6 border border-[#F5A9C8]/40 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#54334F] flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-[#E07A9C]" />
              <span>Next Anniversary Countdown</span>
            </span>
            <span className="text-xs text-[#7A5374]">{anniversaryDateStr}</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center mt-3">
            <div className="bg-white/80 rounded-xl p-2 border border-[#FFD6E7]">
              <span className="text-2xl font-serif font-bold text-[#54334F] block">
                {countdown.days}
              </span>
              <span className="text-[10px] text-[#7A5374] uppercase">Days</span>
            </div>
            <div className="bg-white/80 rounded-xl p-2 border border-[#FFD6E7]">
              <span className="text-2xl font-serif font-bold text-[#54334F] block">
                {countdown.hours}
              </span>
              <span className="text-[10px] text-[#7A5374] uppercase">Hours</span>
            </div>
            <div className="bg-white/80 rounded-xl p-2 border border-[#FFD6E7]">
              <span className="text-2xl font-serif font-bold text-[#54334F] block">
                {countdown.minutes}
              </span>
              <span className="text-[10px] text-[#7A5374] uppercase">Mins</span>
            </div>
            <div className="bg-white/80 rounded-xl p-2 border border-[#FFD6E7]">
              <span className="text-2xl font-serif font-bold text-[#54334F] block">
                {countdown.seconds}
              </span>
              <span className="text-[10px] text-[#7A5374] uppercase">Secs</span>
            </div>
          </div>
        </div>
      </div>

      {/* "On This Day" Section if memories exist from this day */}
      {onThisDayMemories.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 border border-[#F5A9C8] shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-5 h-5 text-[#E07A9C]" />
            <h4 className="font-serif font-bold text-lg text-[#54334F]">
              On This Day in Our Story 💗
            </h4>
          </div>
          <p className="text-xs text-[#7A5374] mb-4">
            Memories recorded on this exact calendar day in previous years:
          </p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {onThisDayMemories.map((m) => (
              <div
                key={m.id}
                onClick={() => onSelectMemoryById(m.id)}
                className="w-40 shrink-0 polaroid-card rounded-2xl cursor-pointer"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-[#FFF0F5] mb-2">
                  <img
                    src={m.downloadUrl}
                    alt={m.caption || ''}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs font-serif font-semibold text-[#54334F] truncate">
                  {m.caption || m.filename}
                </p>
                <span className="text-[10px] text-[#7A5374]">
                  {m.captureDate || new Date(m.uploadedAt).getFullYear()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Header & Add Milestone */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h3 className="text-2xl font-serif font-bold text-[#54334F]">
            Our Milestone Timeline
          </h3>
          <p className="text-xs text-[#7A5374]">
            First dates, special trips, anniversaries, and unforgettable chapters.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#54334F] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Milestone</span>
        </button>
      </div>

      {/* Vertical Timeline Path */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-[#FFD6E7] space-y-8 ml-3 sm:ml-6">
        {sortedTimeline.length === 0 ? (
          <div className="text-xs text-[#7A5374] py-6">
            No milestones added yet. Add your first date, proposal, or favorite moment above! 🌷
          </div>
        ) : (
          sortedTimeline.map((item, idx) => (
            <motion.div
              key={item.eventId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative group"
            >
              {/* Timeline Node Badge */}
              <div className="absolute -left-[35px] sm:-left-[43px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-[#F5A9C8] flex items-center justify-center text-sm shadow-xs group-hover:scale-110 transition-transform">
                {item.icon || '💗'}
              </div>

              {/* Event Card */}
              <div className="glass-panel rounded-2xl p-5 border border-[#FFD6E7] shadow-2xs hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#E07A9C] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{item.date}</span>
                    </span>
                    {item.time && (
                      <span className="text-[11px] text-[#7A5374]">· {item.time}</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteEvent(item.eventId)}
                    className="text-[#7A5374]/40 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h4 className="font-serif font-bold text-lg text-[#54334F]">
                  {item.title}
                </h4>

                {item.description && (
                  <p className="text-xs text-[#7A5374] mt-1.5 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Milestone Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#FFF8F4] rounded-3xl p-6 shadow-2xl border border-[#FFD6E7]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#FFD6E7]">
                <h3 className="font-serif font-bold text-lg text-[#54334F] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E07A9C]" />
                  <span>Add Relationship Milestone</span>
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-full hover:bg-white text-[#7A5374]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-3.5 mt-4">
                <div>
                  <label className="text-xs font-semibold text-[#54334F] block mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Our First Date at the Botanical Garden 🌷"
                    className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#54334F] block mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2 text-[#54334F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#54334F] block mb-1">
                      Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2 text-[#54334F] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#54334F] block mb-1">
                    Story / Details
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What made this moment so special..."
                    className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none"
                  />
                </div>

                {/* Milestone Icon */}
                <div>
                  <label className="text-xs font-semibold text-[#54334F] block mb-1">
                    Milestone Icon
                  </label>
                  <div className="flex gap-2">
                    {['💗', '🌷', '💍', '✈️', '🎂', '☕', '🌅', '🧸'].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setIcon(em)}
                        className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all ${
                          icon === em ? 'bg-white border-2 border-[#E07A9C]' : 'bg-white/50 border border-[#FFD6E7]'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#7A5374] hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F5A9C8] to-[#54334F] text-white text-xs font-semibold shadow-xs"
                  >
                    Save Milestone
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
