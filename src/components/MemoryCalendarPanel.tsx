import React, { useState, useMemo, useEffect } from 'react';
import { MemoryItem, AlbumItem, LoveLetterItem, TimelineEventItem } from '../types';
import { User } from 'firebase/auth';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Heart,
  Video,
  Mail,
  Sparkles,
  Camera,
  FolderHeart,
  Clock,
  Download,
  Eye,
  Search,
  Filter,
  ArrowRight,
  Shuffle,
  CalendarRange,
  RotateCcw,
  Check,
  Plus,
  Play,
  Share2,
  BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface MemoryCalendarPanelProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  albums: AlbumItem[];
  letters: LoveLetterItem[];
  timeline: TimelineEventItem[];
  user?: User | null;
  onSelectMemory: (index: number) => void;
  onOpenLetter: (letter: LoveLetterItem) => void;
  onOpenUploadForDate?: (dateStr: string) => void;
  onOpenComposerForDate?: (dateStr: string) => void;
}

export const MemoryCalendarPanel: React.FC<MemoryCalendarPanelProps> = ({
  isOpen,
  onClose,
  memories,
  albums,
  letters,
  timeline,
  user,
  onSelectMemory,
  onOpenLetter,
  onOpenUploadForDate,
  onOpenComposerForDate,
}) => {
  // Date modes: 'uploaded' vs 'captured' (original photo/video timestamp)
  const [dateMode, setDateMode] = useState<'uploaded' | 'captured'>('uploaded');

  // View modes: 'month' | 'year' | 'day' | 'search'
  const [viewMode, setViewMode] = useState<'month' | 'year' | 'day' | 'search'>('month');

  // First day of week: Monday (1) vs Sunday (0) with localStorage persistence
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<0 | 1>(() => {
    const saved = localStorage.getItem('forever_us_first_day_of_week');
    return saved === '0' ? 0 : 1; // default Monday
  });

  const toggleFirstDayOfWeek = () => {
    const nextVal = firstDayOfWeek === 1 ? 0 : 1;
    setFirstDayOfWeek(nextVal);
    localStorage.setItem('forever_us_first_day_of_week', String(nextVal));
  };

  // Active viewing date (year, month 0-11, day 1-31)
  const today = new Date();
  const todayDateStr = today.toISOString().split('T')[0];
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayDateStr);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStartDate, setSearchStartDate] = useState<string>('');
  const [searchEndDate, setSearchEndDate] = useState<string>('');
  const [selectedMediaType, setSelectedMediaType] = useState<'all' | 'image' | 'video' | 'letter'>('all');
  const [isRangeSearchActive, setIsRangeSearchActive] = useState<boolean>(false);

  // Day view filter: 'all' | 'media' | 'letters' | 'events'
  const [dayFilter, setDayFilter] = useState<'all' | 'media' | 'letters' | 'events'>('all');

  // Quick In-Calendar Love Note Composer State
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [quickNoteTitle, setQuickNoteTitle] = useState('');
  const [quickNoteContent, setQuickNoteContent] = useState('');
  const [quickNoteEmoji, setQuickNoteEmoji] = useState('💌');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Helper to extract relevant date string (YYYY-MM-DD) from a memory
  const getMemoryDateStr = (m: MemoryItem): string => {
    if (dateMode === 'captured' && m.captureDate) {
      return m.captureDate.split('T')[0];
    }
    return (m.uploadedAt || '').split('T')[0];
  };

  // Group memories, letters, and timeline events by YYYY-MM-DD
  const dateMap = useMemo(() => {
    const map = new Map<
      string,
      {
        memories: MemoryItem[];
        letters: LoveLetterItem[];
        events: TimelineEventItem[];
        hasPhoto: boolean;
        hasVideo: boolean;
        hasLetter: boolean;
        hasEvent: boolean;
        count: number;
      }
    >();

    const getOrCreate = (d: string) => {
      let entry = map.get(d);
      if (!entry) {
        entry = {
          memories: [],
          letters: [],
          events: [],
          hasPhoto: false,
          hasVideo: false,
          hasLetter: false,
          hasEvent: false,
          count: 0,
        };
        map.set(d, entry);
      }
      return entry;
    };

    // 1. Process active memories
    memories.filter((m) => !m.isDeleted).forEach((m) => {
      const d = getMemoryDateStr(m);
      if (d) {
        const entry = getOrCreate(d);
        entry.memories.push(m);
        entry.count += 1;
        if (m.mediaType === 'image') entry.hasPhoto = true;
        if (m.mediaType === 'video') entry.hasVideo = true;
      }
    });

    // 2. Process love letters (using createdAt YYYY-MM-DD)
    letters.forEach((l) => {
      const d = (l.createdAt || '').split('T')[0];
      if (d) {
        const entry = getOrCreate(d);
        entry.letters.push(l);
        entry.count += 1;
        entry.hasLetter = true;
      }
    });

    // 3. Process timeline events (using date YYYY-MM-DD)
    timeline.forEach((t) => {
      const d = t.date;
      if (d) {
        const entry = getOrCreate(d);
        entry.events.push(t);
        entry.count += 1;
        entry.hasEvent = true;
      }
    });

    return map;
  }, [memories, letters, timeline, dateMode]);

  // "On This Day" Finder (Checks if today's MM-DD matches any past year)
  const onThisDayMemories = useMemo(() => {
    const currentMM = String(today.getMonth() + 1).padStart(2, '0');
    const currentDD = String(today.getDate()).padStart(2, '0');
    const suffix = `-${currentMM}-${currentDD}`;

    const pastMatches: { year: number; dateStr: string; memories: MemoryItem[]; letters: LoveLetterItem[]; events: TimelineEventItem[]; count: number }[] = [];

    dateMap.forEach((entry, dStr) => {
      if (dStr.endsWith(suffix) && !dStr.startsWith(String(today.getFullYear()))) {
        const yr = parseInt(dStr.split('-')[0], 10);
        pastMatches.push({
          year: yr,
          dateStr: dStr,
          memories: entry.memories,
          letters: entry.letters,
          events: entry.events,
          count: entry.count,
        });
      }
    });

    return pastMatches.sort((a, b) => b.year - a.year);
  }, [dateMap, today]);

  // Calendar Days generator for currentMonth / currentYear (handles leap years accurately)
  const calendarGridDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const numDays = lastDayOfMonth.getDate();

    // Day of week for 1st of month: 0=Sun, 1=Mon, ..., 6=Sat
    let startDayIndex = firstDayOfMonth.getDay();
    if (firstDayOfWeek === 1) {
      // Monday as start: Sun(0) becomes 6, Mon(1) becomes 0
      startDayIndex = startDayIndex === 0 ? 6 : startDayIndex - 1;
    }

    const days = [];

    // Adjacent previous month days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const mm = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dd = String(dayNum).padStart(2, '0');
      const dateStr = `${prevDate.getFullYear()}-${mm}-${dd}`;
      days.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= numDays; d++) {
      const mm = String(currentMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${currentYear}-${mm}-${dd}`;
      days.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
      });
    }

    // Adjacent next month padding days (fill grid to multiple of 7, up to 35 or 42 cells)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${nextDate.getFullYear()}-${mm}-${dd}`;
      days.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentYear, currentMonth, firstDayOfWeek]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDateStr(now.toISOString().split('T')[0]);
    setViewMode('month');
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const [y, m] = dateStr.split('-').map(Number);
    setCurrentYear(y);
    setCurrentMonth(m - 1);
    setDayFilter('all');
    setViewMode('day');
  };

  // Quick search shortcuts
  const handleShortcut = (shortcut: 'today' | 'yesterday' | 'week' | 'month' | 'year') => {
    const now = new Date();
    if (shortcut === 'today') {
      const d = now.toISOString().split('T')[0];
      setSelectedDateStr(d);
      setCurrentYear(now.getFullYear());
      setCurrentMonth(now.getMonth());
      setViewMode('day');
    } else if (shortcut === 'yesterday') {
      const yest = new Date(now.getTime() - 24 * 3600 * 1000);
      const d = yest.toISOString().split('T')[0];
      setSelectedDateStr(d);
      setCurrentYear(yest.getFullYear());
      setCurrentMonth(yest.getMonth());
      setViewMode('day');
    } else if (shortcut === 'week') {
      const start = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const end = now.toISOString().split('T')[0];
      setSearchStartDate(start);
      setSearchEndDate(end);
      setIsRangeSearchActive(true);
      setViewMode('search');
    } else if (shortcut === 'month') {
      const y = now.getFullYear();
      const m = now.getMonth();
      const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const endDay = new Date(y, m + 1, 0).getDate();
      const end = `${y}-${String(m + 1).padStart(2, '0')}-${endDay}`;
      setSearchStartDate(start);
      setSearchEndDate(end);
      setIsRangeSearchActive(true);
      setViewMode('search');
    } else if (shortcut === 'year') {
      const y = now.getFullYear();
      setSearchStartDate(`${y}-01-01`);
      setSearchEndDate(`${y}-12-31`);
      setIsRangeSearchActive(true);
      setViewMode('search');
    }
  };

  // "Take Me Back" - jumps to a random date with real memories
  const handleTakeMeBack = () => {
    const datesWithMemories = Array.from(dateMap.keys()).filter((d) => {
      const entry = dateMap.get(d);
      return entry && entry.count > 0;
    });

    if (datesWithMemories.length === 0) {
      handleJumpToToday();
      return;
    }
    const randomDate = datesWithMemories[Math.floor(Math.random() * datesWithMemories.length)];
    setSelectedDateStr(randomDate);
    const [y, m] = randomDate.split('-').map(Number);
    setCurrentYear(y);
    setCurrentMonth(m - 1);
    setDayFilter('all');
    setViewMode('day');
    confetti({ particleCount: 25, spread: 55, colors: ['#F5A9C8', '#FFD6E7', '#E07A9C', '#54334F'] });
  };

  // Filtered search results (range or keyword search)
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return memories
      .filter((m) => !m.isDeleted)
      .filter((m) => {
        const d = getMemoryDateStr(m);
        if (searchStartDate && d < searchStartDate) return false;
        if (searchEndDate && d > searchEndDate) return false;
        if (selectedMediaType === 'image' && m.mediaType !== 'image') return false;
        if (selectedMediaType === 'video' && m.mediaType !== 'video') return false;
        if (q) {
          const matchCaption = (m.caption || '').toLowerCase().includes(q);
          const matchName = (m.filename || '').toLowerCase().includes(q);
          const matchTags = (m.tags || []).some((t) => t.toLowerCase().includes(q));
          return matchCaption || matchName || matchTags;
        }
        return true;
      });
  }, [memories, dateMode, searchStartDate, searchEndDate, selectedMediaType, searchQuery]);

  // Selected Day's Content
  const selectedDayData = dateMap.get(selectedDateStr);
  const selectedDayMemories = selectedDayData?.memories || [];
  const selectedDayLetters = selectedDayData?.letters || [];
  const selectedDayEvents = selectedDayData?.events || [];

  // Group selected day's memories by time of day
  const timeGroupedMemories = useMemo(() => {
    const morning: MemoryItem[] = [];
    const afternoon: MemoryItem[] = [];
    const evening: MemoryItem[] = [];
    const night: MemoryItem[] = [];

    selectedDayMemories.forEach((m) => {
      const timestamp =
        dateMode === 'captured' && m.captureTime
          ? `2000-01-01T${m.captureTime}:00`
          : m.uploadedAt;
      const hour = new Date(timestamp).getHours();

      if (hour >= 5 && hour < 12) morning.push(m);
      else if (hour >= 12 && hour < 17) afternoon.push(m);
      else if (hour >= 17 && hour < 21) evening.push(m);
      else night.push(m);
    });

    return { morning, afternoon, evening, night };
  }, [selectedDayMemories, dateMode]);

  // Quick Note Submission
  const handleSaveQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteTitle.trim() || !quickNoteContent.trim() || !user) return;

    setIsSavingNote(true);
    try {
      const letterId = `letter_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const noteDate = `${selectedDateStr}T12:00:00Z`;

      const newLetter: LoveLetterItem = {
        id: letterId,
        letterId,
        title: quickNoteTitle.trim(),
        content: quickNoteContent.trim(),
        fontStyle: 'handwriting',
        authorUid: user.uid,
        authorName: user.displayName || 'Love',
        createdAt: noteDate,
        updatedAt: new Date().toISOString(),
        category: 'journal',
        emoji: quickNoteEmoji || '💌',
      };

      await setDoc(doc(db, 'letters', letterId), newLetter);
      confetti({ particleCount: 30, spread: 60, colors: ['#F5A9C8', '#FFD6E7', '#E07A9C'] });

      setQuickNoteTitle('');
      setQuickNoteContent('');
      setIsQuickNoteOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'letters');
    } finally {
      setIsSavingNote(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const weekdayNames = firstDayOfWeek === 1
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/45 backdrop-blur-xs flex justify-end">
      {/* Sliding Drawer Panel */}
      <motion.div
        initial={{ x: '100%', opacity: 0.8 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="w-full sm:max-w-xl md:max-w-2xl bg-[#FFF8F4] h-full shadow-2xl border-l border-[#FFD6E7] flex flex-col relative z-50 overflow-hidden text-[#54334F]"
      >
        {/* PANEL HEADER */}
        <div className="p-4 sm:p-5 border-b border-[#FFD6E7]/80 bg-white/75 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F5A9C8] to-[#FFD6E7] flex items-center justify-center text-[#54334F] shadow-xs relative group">
              <CalendarIcon className="w-5 h-5 text-[#54334F]" />
              <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg sm:text-xl text-[#54334F] flex items-center gap-1.5">
                <span>Our Memory Calendar</span>
                <span className="text-base">📅💗</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-[#7A5374]">
                Explore every chapter and date of our love story
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Weekday start toggle button */}
            <button
              onClick={toggleFirstDayOfWeek}
              title={`Switch week start day (Currently ${firstDayOfWeek === 1 ? 'Monday' : 'Sunday'})`}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#FFF0F5] text-[#54334F] text-[11px] font-semibold flex items-center gap-1 border border-[#FFD6E7] transition-all cursor-pointer shadow-2xs"
            >
              <span className="text-[#E07A9C]">Week:</span>
              <span>{firstDayOfWeek === 1 ? 'Mon' : 'Sun'}</span>
            </button>

            {/* Take Me Back Shuffle Button */}
            <button
              onClick={handleTakeMeBack}
              title="Surprise me with a past memory date"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#FFF0F5] hover:bg-[#FFD6E7] text-[#54334F] text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 border border-[#FFD6E7] transition-all cursor-pointer shadow-2xs"
            >
              <Shuffle className="w-3.5 h-3.5 text-[#E07A9C]" />
              <span className="hidden sm:inline">Take Me Back</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close calendar panel"
              className="p-2 rounded-full hover:bg-white text-[#7A5374] hover:text-[#54334F] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ON THIS DAY BANNER (if matches exist for today's month & day in past years) */}
        {onThisDayMemories.length > 0 && viewMode === 'month' && (
          <div className="bg-gradient-to-r from-[#FFF0F5] via-[#FFE4EC] to-[#FFF0F5] px-5 py-2.5 border-b border-[#F5A9C8]/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-base animate-bounce">💖</span>
              <div className="truncate">
                <span className="font-bold text-[#54334F]">On This Day in Our Story: </span>
                <span className="text-[#7A5374]">
                  {onThisDayMemories[0].count} memory from {onThisDayMemories[0].year}!
                </span>
              </div>
            </div>
            <button
              onClick={() => handleDayClick(onThisDayMemories[0].dateStr)}
              className="px-2.5 py-1 rounded-full bg-white text-[#E07A9C] hover:bg-[#E07A9C] hover:text-white text-[11px] font-bold border border-[#F5A9C8] transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              Revisit ✨
            </button>
          </div>
        )}

        {/* CONTROLS STRIP: Date Mode Toggle & View Switcher */}
        <div className="px-4 sm:px-5 py-2.5 bg-white/60 border-b border-[#FFD6E7]/60 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Two Date Modes Toggle */}
          <div className="flex items-center gap-1 p-0.5 bg-white rounded-xl border border-[#FFD6E7] shadow-2xs">
            <button
              onClick={() => setDateMode('uploaded')}
              title="View dates when memories were added to our vault"
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer text-xs ${
                dateMode === 'uploaded'
                  ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] shadow-xs font-semibold'
                  : 'text-[#7A5374] hover:text-[#54334F]'
              }`}
            >
              Uploaded 💗
            </button>
            <button
              onClick={() => setDateMode('captured')}
              title="View dates when photos & videos were originally captured"
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 text-xs ${
                dateMode === 'captured'
                  ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] shadow-xs font-semibold'
                  : 'text-[#7A5374] hover:text-[#54334F]'
              }`}
            >
              <Camera className="w-3 h-3 text-[#E07A9C]" />
              <span>Captured 📸</span>
            </button>
          </div>

          {/* View Modes Switcher: Month, Year, Day, Search */}
          <div className="flex items-center gap-1 p-0.5 bg-white rounded-xl border border-[#FFD6E7] shadow-2xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-[#54334F] text-white shadow-xs font-semibold'
                  : 'text-[#7A5374] hover:text-[#54334F]'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'year'
                  ? 'bg-[#54334F] text-white shadow-xs font-semibold'
                  : 'text-[#7A5374] hover:text-[#54334F]'
              }`}
            >
              Year
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-[#54334F] text-white shadow-xs font-semibold'
                  : 'text-[#7A5374] hover:text-[#54334F]'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('search')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'search'
                  ? 'bg-[#54334F] text-white shadow-xs font-semibold'
                  : 'text-[#7A5374] hover:text-[#54334F]'
              }`}
            >
              <Search className="w-3 h-3" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* QUICK SHORTCUTS & SEARCH CHIPS */}
        <div className="px-4 sm:px-5 py-2 bg-[#FFF0F5]/50 border-b border-[#FFD6E7]/50 flex items-center gap-2 overflow-x-auto text-[11px] text-[#7A5374] scrollbar-none">
          <span className="font-semibold text-[#54334F] shrink-0">Jump:</span>
          <button
            onClick={() => handleShortcut('today')}
            className="px-2.5 py-1 rounded-full bg-white border border-[#FFD6E7] hover:border-[#F5A9C8] transition-colors cursor-pointer shrink-0"
          >
            Today
          </button>
          <button
            onClick={() => handleShortcut('yesterday')}
            className="px-2.5 py-1 rounded-full bg-white border border-[#FFD6E7] hover:border-[#F5A9C8] transition-colors cursor-pointer shrink-0"
          >
            Yesterday
          </button>
          <button
            onClick={() => handleShortcut('week')}
            className="px-2.5 py-1 rounded-full bg-white border border-[#FFD6E7] hover:border-[#F5A9C8] transition-colors cursor-pointer shrink-0"
          >
            Past 7 Days
          </button>
          <button
            onClick={() => handleShortcut('month')}
            className="px-2.5 py-1 rounded-full bg-white border border-[#FFD6E7] hover:border-[#F5A9C8] transition-colors cursor-pointer shrink-0"
          >
            This Month
          </button>
          <button
            onClick={() => handleShortcut('year')}
            className="px-2.5 py-1 rounded-full bg-white border border-[#FFD6E7] hover:border-[#F5A9C8] transition-colors cursor-pointer shrink-0"
          >
            This Year
          </button>

          {(searchStartDate || searchEndDate || searchQuery) && (
            <button
              onClick={() => {
                setSearchStartDate('');
                setSearchEndDate('');
                setSearchQuery('');
                setIsRangeSearchActive(false);
                setViewMode('month');
              }}
              className="ml-auto text-rose-500 hover:underline flex items-center gap-1 shrink-0 font-medium cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* MAIN SCROLLABLE CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* SEARCH & DATE RANGE VIEW */}
          {viewMode === 'search' ? (
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-2xl border border-[#FFD6E7] shadow-xs space-y-3">
                <h4 className="font-serif font-bold text-base text-[#54334F] flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-[#E07A9C]" />
                  <span>Date Range & Memory Search</span>
                </h4>

                {/* Keyword search input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[#7A5374] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search caption, tags, filename..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FFF8F4] border border-[#FFD6E7] text-xs text-[#54334F] focus:outline-hidden focus:ring-1 focus:ring-[#E07A9C]"
                  />
                </div>

                {/* Date range inputs */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#7A5374] mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={searchStartDate}
                      onChange={(e) => setSearchStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[#FFF8F4] border border-[#FFD6E7] text-xs text-[#54334F]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#7A5374] mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={searchEndDate}
                      onChange={(e) => setSearchEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-[#FFF8F4] border border-[#FFD6E7] text-xs text-[#54334F]"
                    />
                  </div>
                </div>

                {/* Media type filter buttons */}
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="text-[10px] font-semibold text-[#7A5374]">Type:</span>
                  {(['all', 'image', 'video'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedMediaType(t)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        selectedMediaType === t
                          ? 'bg-[#E07A9C] text-white shadow-2xs'
                          : 'bg-[#FFF0F5] text-[#7A5374] hover:bg-[#FFD6E7]'
                      }`}
                    >
                      {t === 'all' ? 'All' : t === 'image' ? 'Photos 📸' : 'Videos 🎥'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Results list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-[#FFD6E7]">
                  <h5 className="font-serif font-bold text-sm text-[#54334F]">
                    Results ({searchResults.length})
                  </h5>
                  <span className="text-[11px] text-[#7A5374]">
                    Mode: {dateMode === 'uploaded' ? 'Uploaded Date' : 'Capture Date'}
                  </span>
                </div>

                {searchResults.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#7A5374] bg-white/70 rounded-2xl border border-[#FFD6E7]">
                    No memories found with current filters. Try expanding your date range! 💗
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {searchResults.map((m) => {
                      const fullIdx = memories.findIndex((item) => item.id === m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            if (fullIdx !== -1) onSelectMemory(fullIdx);
                          }}
                          className="polaroid-card rounded-xl cursor-pointer hover:shadow-md transition-all"
                        >
                          <div className="aspect-square rounded-lg overflow-hidden bg-[#FFF0F5] mb-1.5 relative">
                            {m.mediaType === 'video' ? (
                              <>
                                <video src={m.downloadUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  <Video className="w-5 h-5 text-white" />
                                </div>
                              </>
                            ) : (
                              <img src={m.downloadUrl} alt={m.caption || ''} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <p className="font-serif text-xs font-semibold truncate text-[#54334F]">
                            {m.caption || m.filename}
                          </p>
                          <span className="text-[10px] text-[#7A5374]">
                            {getMemoryDateStr(m)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : viewMode === 'month' ? (
            /* MONTH VIEW */
            <div className="space-y-4">
              {/* Month & Year Navigation Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-serif font-bold text-xl sm:text-2xl text-[#54334F]">
                    {monthNames[currentMonth]} {currentYear}
                  </h4>
                  <button
                    onClick={handleJumpToToday}
                    className="px-2.5 py-0.5 rounded-full bg-white border border-[#FFD6E7] text-[10px] font-semibold text-[#7A5374] hover:text-[#54334F] hover:bg-[#FFF0F5] cursor-pointer shadow-2xs transition-colors"
                  >
                    Today
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrevMonth}
                    title="Previous month"
                    className="p-1.5 rounded-xl bg-white border border-[#FFD6E7] hover:bg-[#FFF0F5] text-[#54334F] cursor-pointer shadow-2xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    title="Next month"
                    className="p-1.5 rounded-xl bg-white border border-[#FFD6E7] hover:bg-[#FFF0F5] text-[#54334F] cursor-pointer shadow-2xs"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 7-Weekday Columns */}
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#7A5374] py-1 border-b border-[#FFD6E7]/60">
                {weekdayNames.map((wd) => (
                  <div key={wd}>{wd}</div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {calendarGridDays.map((d, index) => {
                  const dayData = dateMap.get(d.dateStr);
                  const isSelected = selectedDateStr === d.dateStr;
                  const isToday = todayDateStr === d.dateStr;
                  const hasMemories = dayData && dayData.count > 0;

                  return (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleDayClick(d.dateStr)}
                      className={`min-h-[62px] sm:min-h-[72px] p-1 sm:p-1.5 rounded-2xl border transition-all flex flex-col justify-between items-center relative cursor-pointer text-left ${
                        isSelected
                          ? 'bg-gradient-to-tr from-[#FFF0F5] to-white border-2 border-[#E07A9C] shadow-md ring-2 ring-[#F5A9C8]/40'
                          : isToday
                          ? 'bg-white border-[#E07A9C] shadow-xs'
                          : d.isCurrentMonth
                          ? 'bg-white/80 hover:bg-white border-[#FFD6E7]'
                          : 'bg-white/30 border-transparent text-[#7A5374]/35'
                      }`}
                    >
                      {/* Day Number */}
                      <div className="w-full flex items-center justify-between text-xs font-semibold">
                        <span
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[11px] sm:text-xs ${
                            isToday
                              ? 'bg-[#54334F] text-white shadow-2xs font-bold'
                              : isSelected
                              ? 'text-[#E07A9C] font-bold'
                              : d.isCurrentMonth
                              ? 'text-[#54334F]'
                              : 'text-[#7A5374]/40'
                          }`}
                        >
                          {d.dayNum}
                        </span>

                        {hasMemories && (
                          <span className="text-[9px] sm:text-[10px] font-mono text-[#E07A9C] font-bold bg-[#FFF0F5] px-1 rounded-full border border-[#FFD6E7]">
                            {dayData.count}
                          </span>
                        )}
                      </div>

                      {/* Cute Memory Indicator Icons */}
                      <div className="w-full flex items-center justify-center gap-0.5 sm:gap-1 mt-1 flex-wrap">
                        {dayData?.hasPhoto && (
                          <span className="text-[10px]" title="Photo memory">
                            💗
                          </span>
                        )}
                        {dayData?.hasVideo && (
                          <span className="text-[10px]" title="Video memory">
                            🎥
                          </span>
                        )}
                        {dayData?.hasLetter && (
                          <span className="text-[10px]" title="Love letter">
                            💌
                          </span>
                        )}
                        {dayData?.hasEvent && (
                          <span className="text-[10px]" title="Relationship milestone">
                            🌷
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Indicator Legend */}
              <div className="p-3 bg-white/70 rounded-2xl border border-[#FFD6E7] flex flex-wrap items-center justify-around gap-2 text-[11px] text-[#7A5374] shadow-2xs">
                <div className="flex items-center gap-1">
                  <span>💗</span>
                  <span>Photos</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🎥</span>
                  <span>Videos</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>💌</span>
                  <span>Love Letters</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🌷</span>
                  <span>Milestones</span>
                </div>
              </div>
            </div>
          ) : viewMode === 'year' ? (
            /* YEAR VIEW (12 miniature months) */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-2xl text-[#54334F]">
                  Year {currentYear}
                </h4>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentYear((y) => y - 1)}
                    className="p-1.5 rounded-xl bg-white border border-[#FFD6E7] text-[#54334F] cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentYear((y) => y + 1)}
                    className="p-1.5 rounded-xl bg-white border border-[#FFD6E7] text-[#54334F] cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {monthNames.map((mName, mIdx) => {
                  // Count total memories in this month
                  const mmStr = String(mIdx + 1).padStart(2, '0');
                  const prefix = `${currentYear}-${mmStr}`;
                  let monthCount = 0;
                  dateMap.forEach((val, dKey) => {
                    if (dKey.startsWith(prefix)) monthCount += val.count;
                  });

                  return (
                    <motion.div
                      key={mName}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        setCurrentMonth(mIdx);
                        setViewMode('month');
                      }}
                      className="p-4 bg-white/80 rounded-2xl border border-[#FFD6E7] hover:border-[#F5A9C8] transition-all cursor-pointer shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <h5 className="font-serif font-bold text-base text-[#54334F]">
                          {mName}
                        </h5>
                        <span className="text-[11px] text-[#7A5374]">
                          {monthCount} {monthCount === 1 ? 'memory' : 'memories'}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-[#E07A9C]">
                        <span>Open Month</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* DAY VIEW (Detailed daily memories with filtering and quick add) */
            <div className="space-y-6">
              {/* Selected Day Banner */}
              <div className="pb-3 border-b border-[#FFD6E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs uppercase font-semibold tracking-wider text-[#E07A9C]">
                    Memories of
                  </span>
                  <h4 className="font-serif font-bold text-xl sm:text-2xl text-[#54334F]">
                    {new Date(selectedDateStr + 'T12:00:00').toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h4>
                  <p className="text-xs text-[#7A5374] mt-0.5">
                    Showing {dateMode === 'uploaded' ? 'files uploaded on this date 💗' : 'photos & videos captured on this date 📸'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('month')}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#FFD6E7] text-xs font-semibold text-[#54334F] hover:bg-[#FFF0F5] cursor-pointer shadow-2xs"
                  >
                    Back to Grid
                  </button>
                </div>
              </div>

              {/* Day Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
                <button
                  onClick={() => setDayFilter('all')}
                  className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                    dayFilter === 'all'
                      ? 'bg-[#54334F] text-white shadow-2xs'
                      : 'bg-white border border-[#FFD6E7] text-[#7A5374]'
                  }`}
                >
                  All ({selectedDayMemories.length + selectedDayLetters.length + selectedDayEvents.length})
                </button>
                <button
                  onClick={() => setDayFilter('media')}
                  className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                    dayFilter === 'media'
                      ? 'bg-[#54334F] text-white shadow-2xs'
                      : 'bg-white border border-[#FFD6E7] text-[#7A5374]'
                  }`}
                >
                  Photos & Videos ({selectedDayMemories.length})
                </button>
                <button
                  onClick={() => setDayFilter('letters')}
                  className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                    dayFilter === 'letters'
                      ? 'bg-[#54334F] text-white shadow-2xs'
                      : 'bg-white border border-[#FFD6E7] text-[#7A5374]'
                  }`}
                >
                  Letters & Notes ({selectedDayLetters.length})
                </button>
                <button
                  onClick={() => setDayFilter('events')}
                  className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
                    dayFilter === 'events'
                      ? 'bg-[#54334F] text-white shadow-2xs'
                      : 'bg-white border border-[#FFD6E7] text-[#7A5374]'
                  }`}
                >
                  Milestones ({selectedDayEvents.length})
                </button>
              </div>

              {/* Action Bar for This Date: Quick Upload, Write Letter, Slideshow */}
              <div className="p-3 bg-white/80 rounded-2xl border border-[#FFD6E7] flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  {onOpenUploadForDate && (
                    <button
                      onClick={() => onOpenUploadForDate(selectedDateStr)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] hover:shadow-xs text-[#54334F] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#54334F]" />
                      <span>Add Photos/Videos</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsQuickNoteOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF0F5] text-[#54334F] text-xs font-semibold flex items-center gap-1.5 border border-[#FFD6E7] transition-all cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#E07A9C]" />
                    <span>Write Love Note</span>
                  </button>
                </div>

                {selectedDayMemories.length > 0 && (
                  <button
                    onClick={() => {
                      const firstIdx = memories.findIndex((m) => m.id === selectedDayMemories[0].id);
                      if (firstIdx !== -1) onSelectMemory(firstIdx);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#54334F] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-[#FFD6E7]" />
                    <span>View Slideshow</span>
                  </button>
                )}
              </div>

              {/* QUICK IN-CALENDAR LOVE NOTE COMPOSER MODAL */}
              <AnimatePresence>
                {isQuickNoteOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-5 bg-gradient-to-b from-[#FFFDFB] to-[#FFF0F5] rounded-3xl border-2 border-[#FFD6E7] shadow-lg space-y-4"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#FFD6E7]">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{quickNoteEmoji}</span>
                        <div>
                          <h5 className="font-serif font-bold text-sm text-[#54334F]">
                            Write a Love Note for this Day
                          </h5>
                          <span className="text-[11px] text-[#7A5374]">
                            Pinned to {selectedDateStr}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsQuickNoteOpen(false)}
                        className="p-1 rounded-full hover:bg-white text-[#7A5374]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveQuickNote} className="space-y-3">
                      {/* Emoji Picker */}
                      <div className="flex items-center gap-2 text-base">
                        <span className="text-[11px] font-semibold text-[#7A5374]">Seal:</span>
                        {['💌', '💖', '🌹', '✨', '🧸', '🥂', '💍'].map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => setQuickNoteEmoji(em)}
                            className={`p-1 rounded-lg cursor-pointer transition-transform ${
                              quickNoteEmoji === em ? 'scale-125 bg-white shadow-2xs' : 'hover:scale-110'
                            }`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        value={quickNoteTitle}
                        onChange={(e) => setQuickNoteTitle(e.target.value)}
                        placeholder="Note title (e.g., Midnight thoughts of you...)"
                        required
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#FFD6E7] text-xs text-[#54334F] font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#E07A9C]"
                      />

                      <textarea
                        value={quickNoteContent}
                        onChange={(e) => setQuickNoteContent(e.target.value)}
                        rows={3}
                        placeholder="Write something sweet from the heart..."
                        required
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#FFD6E7] text-xs text-[#54334F] focus:outline-hidden focus:ring-1 focus:ring-[#E07A9C]"
                      />

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsQuickNoteOpen(false)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-[#FFD6E7] text-xs font-semibold text-[#7A5374]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingNote}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#F5A9C8] to-[#54334F] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isSavingNote ? 'Saving...' : 'Pin to Calendar 💗'}</span>
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty state for day if no memories */}
              {selectedDayMemories.length === 0 &&
              selectedDayLetters.length === 0 &&
              selectedDayEvents.length === 0 ? (
                <div className="p-8 text-center bg-white/70 rounded-3xl border border-[#FFD6E7] space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-[#FFD6E7]/60 flex items-center justify-center shadow-inner">
                    <Heart className="w-7 h-7 text-[#E07A9C] animate-pulse" />
                  </div>
                  <div>
                    <h5 className="font-serif font-bold text-lg text-[#54334F]">
                      Nothing saved on this day... yet.
                    </h5>
                    <p className="text-xs text-[#7A5374] max-w-sm mx-auto leading-relaxed mt-1">
                      "Every beautiful story has its quiet pages. Today is waiting for our next smile." 💗
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    {onOpenUploadForDate && (
                      <button
                        onClick={() => onOpenUploadForDate(selectedDateStr)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-[#F5A9C8] to-[#E07A9C] text-[#54334F] text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Add Photo / Video for This Day</span>
                      </button>
                    )}
                    <button
                      onClick={() => setIsQuickNoteOpen(true)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white border border-[#FFD6E7] hover:bg-[#FFF0F5] text-[#54334F] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-[#E07A9C]" />
                      <span>Write Love Letter for This Day</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Chronological Content Sections */
                <div className="space-y-6">
                  {/* Milestones on this day */}
                  {(dayFilter === 'all' || dayFilter === 'events') &&
                    selectedDayEvents.length > 0 && (
                      <div className="p-4 bg-gradient-to-r from-[#FFF0F5] to-white rounded-2xl border border-[#F5A9C8] space-y-2">
                        <span className="text-xs font-semibold text-[#E07A9C] flex items-center gap-1.5">
                          <span>🌷</span>
                          <span>Milestone & Special Event</span>
                        </span>
                        {selectedDayEvents.map((ev) => (
                          <div key={ev.eventId}>
                            <h5 className="font-serif font-bold text-base text-[#54334F]">
                              {ev.title}
                            </h5>
                            {ev.description && (
                              <p className="text-xs text-[#7A5374] mt-0.5">{ev.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Letters written on this day */}
                  {(dayFilter === 'all' || dayFilter === 'letters') &&
                    selectedDayLetters.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-semibold uppercase tracking-wider text-[#7A5374] flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[#E07A9C]" />
                          <span>Letters Written on This Day ({selectedDayLetters.length})</span>
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedDayLetters.map((l) => (
                            <div
                              key={l.letterId}
                              onClick={() => onOpenLetter(l)}
                              className="p-4 bg-white rounded-2xl border border-[#FFD6E7] hover:border-[#F5A9C8] transition-all cursor-pointer shadow-2xs"
                            >
                              <span className="text-xl block mb-1">{l.emoji || '💌'}</span>
                              <h6 className="font-serif font-bold text-sm text-[#54334F]">
                                {l.title}
                              </h6>
                              <p className="text-xs text-[#7A5374] line-clamp-2 mt-1">
                                {l.content}
                              </p>
                              <span className="text-[10px] text-[#E07A9C] font-semibold mt-2 inline-flex items-center gap-1">
                                <span>Read letter</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Photos and Videos */}
                  {(dayFilter === 'all' || dayFilter === 'media') &&
                    selectedDayMemories.length > 0 && (
                      <div className="space-y-4">
                        <h5 className="text-xs font-semibold uppercase tracking-wider text-[#7A5374] flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-[#E07A9C]" />
                          <span>Photos & Videos ({selectedDayMemories.length})</span>
                        </h5>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedDayMemories.map((m) => {
                            const fullIdx = memories.findIndex((item) => item.id === m.id);
                            return (
                              <motion.div
                                key={m.id}
                                whileHover={{ y: -3 }}
                                onClick={() => {
                                  if (fullIdx !== -1) onSelectMemory(fullIdx);
                                }}
                                className="polaroid-card rounded-2xl cursor-pointer flex flex-col justify-between"
                              >
                                <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-[#FFF0F5] mb-2">
                                  {m.mediaType === 'video' ? (
                                    <div className="relative w-full h-full">
                                      <video src={m.downloadUrl} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                        <Video className="w-6 h-6 text-white" />
                                      </div>
                                    </div>
                                  ) : (
                                    <img
                                      src={m.downloadUrl}
                                      alt={m.caption || ''}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>

                                <div>
                                  <h6 className="font-serif font-bold text-sm text-[#54334F] truncate">
                                    {m.caption || m.filename}
                                  </h6>
                                  <div className="flex items-center justify-between text-[11px] text-[#7A5374] mt-1">
                                    <span>
                                      {new Date(m.uploadedAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    <span className="text-[#E07A9C] font-medium flex items-center gap-1">
                                      <span>View</span>
                                      <Eye className="w-3 h-3" />
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
