import React, { useState, useEffect } from 'react';
import { LoveLetterItem, BucketListItem, ReasonLoveItem } from '../types';
import { User } from 'firebase/auth';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Mail,
  Heart,
  Plus,
  Lock,
  Unlock,
  Calendar,
  Clock,
  Sparkles,
  Download,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  Search,
  BookOpen,
  X,
  Type,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface LoveLettersViewProps {
  letters: LoveLetterItem[];
  bucketList: BucketListItem[];
  reasons: ReasonLoveItem[];
  user: User;
  onRefreshData: () => void;
}

export const LoveLettersView: React.FC<LoveLettersViewProps> = ({
  letters,
  bucketList,
  reasons,
  user,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'letters' | 'future' | 'miss_me' | 'bucket' | 'reasons'>('letters');
  const [searchQuery, setSearchQuery] = useState('');

  // Letter editor states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState<LoveLetterItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fontStyle, setFontStyle] = useState<'handwriting' | 'serif' | 'sans'>('handwriting');
  const [category, setCategory] = useState<'letter' | 'journal' | 'miss_me' | 'future' | 'poem'>('letter');
  const [unlockDate, setUnlockDate] = useState('');
  const [isLockedUntilDate, setIsLockedUntilDate] = useState(false);
  const [emoji, setEmoji] = useState('💌');
  const [isSaving, setIsSaving] = useState(false);
  const [autosaveText, setAutosaveText] = useState('Saved just now 💖');

  // Reading modal
  const [readingLetter, setReadingLetter] = useState<LoveLetterItem | null>(null);

  // Bucket list new item
  const [newBucketTitle, setNewBucketTitle] = useState('');
  const [newBucketCategory, setNewBucketCategory] = useState('Travel');

  // Reasons new item
  const [newReasonText, setNewReasonText] = useState('');
  const [isJarSpinning, setIsJarSpinning] = useState(false);
  const [selectedJarReason, setSelectedJarReason] = useState<ReasonLoveItem | null>(null);

  const handleOpenComposer = (cat: 'letter' | 'journal' | 'miss_me' | 'future' | 'poem' = 'letter') => {
    setEditingLetter(null);
    setTitle('');
    setContent('');
    setFontStyle('handwriting');
    setCategory(cat);
    setUnlockDate(cat === 'future' ? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0] : '');
    setIsLockedUntilDate(cat === 'future');
    setEmoji(cat === 'miss_me' ? '🌷' : cat === 'future' ? '⏳' : '💌');
    setIsEditorOpen(true);
  };

  const handleSaveLetter = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSaving(true);
    setAutosaveText('Saving to vault...');

    try {
      const letterId = editingLetter?.letterId || `let_${Date.now()}`;
      const letterRef = doc(db, 'letters', letterId);

      const letterData = {
        letterId,
        title: title.trim().substring(0, 256),
        content: content.trim().substring(0, 20000),
        fontStyle,
        tags: [],
        emoji,
        photos: [],
        isFavorite: editingLetter?.isFavorite || false,
        unlockDate: isLockedUntilDate ? unlockDate : '',
        isLockedUntilDate,
        category,
        createdAt: editingLetter?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorUid: user.uid,
        authorName: user.displayName || user.email || 'Your Love',
      };

      await setDoc(letterRef, letterData, { merge: true });
      setAutosaveText('Saved securely in vault 💖');
      setIsEditorOpen(false);
      onRefreshData();
    } catch (err) {
      console.error("Failed saving letter:", err);
      setAutosaveText('Error saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLetter = async (letter: LoveLetterItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${letter.title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'letters', letter.letterId));
      if (readingLetter?.letterId === letter.letterId) {
        setReadingLetter(null);
      }
      onRefreshData();
    } catch (err) {
      console.error("Failed deleting letter:", err);
    }
  };

  // Bucket list actions
  const handleAddBucketItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketTitle.trim()) return;

    try {
      const itemId = `bucket_${Date.now()}`;
      await setDoc(doc(db, 'bucketList', itemId), {
        itemId,
        title: newBucketTitle.trim().substring(0, 256),
        category: newBucketCategory,
        notes: '',
        completed: false,
        createdAt: new Date().toISOString(),
        creatorUid: user.uid,
      });
      setNewBucketTitle('');
      onRefreshData();
      confetti({ particleCount: 15, spread: 40 });
    } catch (err) {
      console.error("Failed adding bucket item:", err);
    }
  };

  const handleToggleBucketItem = async (item: BucketListItem) => {
    try {
      const itemRef = doc(db, 'bucketList', item.itemId);
      const isNowCompleted = !item.completed;
      await updateDoc(itemRef, {
        completed: isNowCompleted,
        completedDate: isNowCompleted ? new Date().toISOString() : null,
      });
      if (isNowCompleted) {
        confetti({ particleCount: 30, spread: 60, colors: ['#FFD6E7', '#F5A9C8', '#E07A9C'] });
      }
      onRefreshData();
    } catch (err) {
      console.error("Failed updating bucket item:", err);
    }
  };

  // Reasons I Love You actions
  const handleAddReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReasonText.trim()) return;

    try {
      const reasonId = `reason_${Date.now()}`;
      await setDoc(doc(db, 'reasonsLove', reasonId), {
        reasonId,
        text: newReasonText.trim().substring(0, 1000),
        authorName: user.displayName || 'Me',
        createdAt: new Date().toISOString(),
        heartColor: '#E07A9C',
        creatorUid: user.uid,
      });
      setNewReasonText('');
      onRefreshData();
      confetti({ particleCount: 20, spread: 50 });
    } catch (err) {
      console.error("Failed adding reason:", err);
    }
  };

  // Pick random reason from virtual memory jar
  const handlePickRandomReason = () => {
    if (reasons.length === 0) return;
    setIsJarSpinning(true);
    setTimeout(() => {
      const pick = reasons[Math.floor(Math.random() * reasons.length)];
      setSelectedJarReason(pick);
      setIsJarSpinning(false);
      confetti({ particleCount: 25, spread: 60, origin: { y: 0.6 } });
    }, 700);
  };

  // Download letter as romantic text file
  const handleDownloadLetter = (letter: LoveLetterItem) => {
    const textContent = `FOREVER US — LOVE LETTER\n\nTitle: ${letter.title}\nDate: ${new Date(letter.createdAt).toLocaleDateString()}\nFrom: ${letter.authorName}\n\n---\n\n${letter.content}\n\n---\nMade of you, me, and all our little moments. 💗`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${letter.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Check future locked state
  const isLetterUnlocked = (letter: LoveLetterItem): boolean => {
    if (!letter.isLockedUntilDate || !letter.unlockDate) return true;
    const now = new Date().toISOString().split('T')[0];
    return now >= letter.unlockDate;
  };

  // Filter letters based on active tab
  const displayedLetters = letters.filter((l) => {
    if (activeTab === 'future') return l.isLockedUntilDate;
    if (activeTab === 'miss_me') return l.category === 'miss_me';
    return !l.isLockedUntilDate && l.category !== 'miss_me';
  });

  return (
    <div className="space-y-6">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#54334F] flex items-center gap-2">
            <span>Love Letters & Words of Forever</span>
            <span className="text-xl">💌</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#7A5374] mt-0.5">
            Every whispered word, secret letter, future promise, and shared dream.
          </p>
        </div>

        <button
          onClick={() => handleOpenComposer(activeTab === 'future' ? 'future' : activeTab === 'miss_me' ? 'miss_me' : 'letter')}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#54334F] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Write Love Letter</span>
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1 bg-white/70 rounded-2xl border border-[#FFD6E7] max-w-fit">
        <button
          onClick={() => setActiveTab('letters')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'letters'
              ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] shadow-xs'
              : 'text-[#7A5374] hover:text-[#54334F]'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Letters & Notes</span>
        </button>

        <button
          onClick={() => setActiveTab('future')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'future'
              ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] shadow-xs'
              : 'text-[#7A5374] hover:text-[#54334F]'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Future Unlock Letters</span>
        </button>

        <button
          onClick={() => setActiveTab('miss_me')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'miss_me'
              ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] shadow-xs'
              : 'text-[#7A5374] hover:text-[#54334F]'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>Read When You Miss Me</span>
        </button>

        <button
          onClick={() => setActiveTab('reasons')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'reasons'
              ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] shadow-xs'
              : 'text-[#7A5374] hover:text-[#54334F]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#E07A9C]" />
          <span>Memory Jar (Reasons)</span>
        </button>

        <button
          onClick={() => setActiveTab('bucket')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'bucket'
              ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] shadow-xs'
              : 'text-[#7A5374] hover:text-[#54334F]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Things To Do Together</span>
        </button>
      </div>

      {/* SUB-SECTION 1: LETTERS / FUTURE / MISS ME */}
      {(activeTab === 'letters' || activeTab === 'future' || activeTab === 'miss_me') && (
        <div className="space-y-4">
          {displayedLetters.length === 0 ? (
            <div className="glass-panel rounded-3xl p-10 text-center border border-[#FFD6E7] max-w-md mx-auto my-6">
              <span className="text-4xl block mb-2">💌</span>
              <h4 className="font-serif font-bold text-lg text-[#54334F]">
                {activeTab === 'future'
                  ? 'No future unlock letters yet'
                  : activeTab === 'miss_me'
                  ? 'Write a letter for when she misses you'
                  : 'Our letters await your heartfelt words'}
              </h4>
              <p className="text-xs text-[#7A5374] mt-1 mb-5 leading-relaxed">
                {activeTab === 'future'
                  ? 'Set a future anniversary, birthday, or surprise date. The letter remains locked until then!'
                  : 'Leave tender thoughts and words of comfort to open anytime.'}
              </p>
              <button
                onClick={() => handleOpenComposer(activeTab as any)}
                className="px-4 py-2 rounded-xl bg-[#FFD6E7] text-[#54334F] text-xs font-semibold hover:bg-[#F5A9C8] transition-colors cursor-pointer"
              >
                Write First Letter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedLetters.map((letter) => {
                const unlocked = isLetterUnlocked(letter);

                return (
                  <motion.div
                    key={letter.letterId}
                    whileHover={{ y: -4 }}
                    onClick={() => {
                      if (unlocked) {
                        setReadingLetter(letter);
                      } else {
                        alert(`This letter is sealed until ${letter.unlockDate}! No peeking early 🤫💖`);
                      }
                    }}
                    className={`rounded-3xl p-6 transition-all cursor-pointer relative flex flex-col justify-between border ${
                      unlocked
                        ? 'bg-gradient-to-b from-[#FFFDFB] to-[#FFF8F4] border-[#FFD6E7] shadow-sm hover:shadow-md'
                        : 'bg-white/40 border-dashed border-[#F5A9C8] opacity-80'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl">{letter.emoji || '💌'}</span>
                        {!unlocked ? (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-[10px] font-semibold text-rose-700">
                            <Lock className="w-3 h-3" />
                            <span>Sealed until {letter.unlockDate}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-[#7A5374] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#E07A9C]" />
                            <span>{new Date(letter.createdAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-serif font-bold text-lg text-[#54334F] mb-2 line-clamp-1">
                        {letter.title}
                      </h4>

                      {/* Content Preview */}
                      {unlocked ? (
                        <p
                          className={`text-xs text-[#7A5374] line-clamp-4 leading-relaxed ${
                            letter.fontStyle === 'handwriting'
                              ? 'font-handwriting text-base text-[#54334F]/85'
                              : letter.fontStyle === 'serif'
                              ? 'font-serif text-sm italic'
                              : ''
                          }`}
                        >
                          {letter.content}
                        </p>
                      ) : (
                        <div className="p-4 rounded-2xl bg-[#FFF0F5]/80 text-center border border-[#FFD6E7]">
                          <p className="font-handwriting text-lg text-[#E07A9C]">
                            A love letter sealed with a ribbon...
                          </p>
                          <span className="text-[11px] text-[#7A5374] mt-1 block">
                            Opens automatically on {letter.unlockDate}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-3 border-t border-[#FFD6E7]/50 flex items-center justify-between text-xs text-[#7A5374]">
                      <span className="font-serif italic text-[11px]">
                        From {letter.authorName}
                      </span>
                      {unlocked && (
                        <button
                          onClick={(e) => handleDeleteLetter(letter, e)}
                          className="p-1 rounded-md text-[#7A5374]/50 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-SECTION 2: MEMORY JAR (REASONS I LOVE YOU) */}
      {activeTab === 'reasons' && (
        <div className="space-y-6">
          {/* Virtual Jar Interactive Banner */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-[#FFD6E7] text-center max-w-xl mx-auto shadow-sm">
            <motion.div
              animate={isJarSpinning ? { rotate: [0, -10, 10, -5, 5, 0], scale: 1.1 } : {}}
              transition={{ duration: 0.6 }}
              className="w-20 h-20 mx-auto rounded-full bg-[#FFD6E7] flex items-center justify-center mb-3 shadow-md"
            >
              <span className="text-4xl">🫙</span>
            </motion.div>

            <h3 className="text-2xl font-serif font-bold text-[#54334F]">
              Our "Reasons I Love You" Jar
            </h3>
            <p className="text-xs text-[#7A5374] mt-1 mb-5">
              Contains {reasons.length} sweet reason{reasons.length === 1 ? '' : 's'} folded in heart-shaped paper.
            </p>

            <button
              onClick={handlePickRandomReason}
              disabled={reasons.length === 0 || isJarSpinning}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#54334F] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>{isJarSpinning ? 'Unfolding a heart...' : 'Pick a Heart From the Jar'}</span>
            </button>
          </div>

          {/* Selected Reason Card */}
          <AnimatePresence>
            {selectedJarReason && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="max-w-md mx-auto p-6 rounded-3xl bg-gradient-to-tr from-[#FFF0F5] to-white border-2 border-[#F5A9C8] shadow-lg text-center"
              >
                <div className="w-10 h-10 mx-auto rounded-full bg-[#FFD6E7] flex items-center justify-center text-[#E07A9C] mb-3">
                  <Sparkles className="w-5 h-5 text-[#E07A9C]" />
                </div>
                <h5 className="font-serif font-bold text-base text-[#54334F] mb-1">
                  Why I Love You:
                </h5>
                <p className="font-handwriting text-2xl text-[#E07A9C] leading-relaxed my-3 px-2">
                  "{selectedJarReason.text}"
                </p>
                <span className="text-[11px] text-[#7A5374]">
                  — {selectedJarReason.authorName || 'Forever and Always'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add a Reason Form */}
          <form
            onSubmit={handleAddReason}
            className="max-w-xl mx-auto flex items-center gap-2 bg-white rounded-2xl p-2 border border-[#FFD6E7] shadow-xs"
          >
            <input
              type="text"
              required
              value={newReasonText}
              onChange={(e) => setNewReasonText(e.target.value)}
              placeholder="Add another reason why you adore her..."
              className="flex-1 px-3 py-2 text-xs text-[#54334F] focus:outline-none placeholder-[#7A5374]/50"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#E07A9C] text-white text-xs font-semibold hover:bg-[#54334F] transition-colors cursor-pointer"
            >
              Add to Jar
            </button>
          </form>

          {/* Reasons List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {reasons.map((r, i) => (
              <div
                key={r.reasonId}
                className="p-4 rounded-2xl bg-white border border-[#FFD6E7] flex items-start gap-3 shadow-2xs"
              >
                <Heart className="w-4 h-4 text-[#F5A9C8] fill-[#F5A9C8] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-serif italic text-[#54334F] leading-snug">
                    "{r.text}"
                  </p>
                  <span className="text-[10px] text-[#7A5374]/60 mt-1 block">
                    {r.authorName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-SECTION 3: SHARED BUCKET LIST */}
      {activeTab === 'bucket' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Add Bucket Form */}
          <form
            onSubmit={handleAddBucketItem}
            className="glass-panel rounded-2xl p-4 border border-[#FFD6E7] flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              required
              value={newBucketTitle}
              onChange={(e) => setNewBucketTitle(e.target.value)}
              placeholder="A dream we want to achieve together... (e.g. See Northern Lights in Norway)"
              className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#FFD6E7] text-xs text-[#54334F] focus:outline-none focus:ring-2 focus:ring-[#F5A9C8]"
            />
            <select
              value={newBucketCategory}
              onChange={(e) => setNewBucketCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-[#FFD6E7] text-xs text-[#54334F] focus:outline-none"
            >
              <option value="Travel">✈️ Travel</option>
              <option value="Date Night">🍷 Date Night</option>
              <option value="Future Milestone">💍 Future Milestone</option>
              <option value="Cozy Adventure">☕ Cozy Adventure</option>
            </select>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#54334F] text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Add Dream
            </button>
          </form>

          {/* Bucket List Items */}
          <div className="space-y-3">
            {bucketList.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#7A5374]">
                No dreams added yet. Write your first adventure above! ✨
              </div>
            ) : (
              bucketList.map((item) => (
                <div
                  key={item.itemId}
                  onClick={() => handleToggleBucketItem(item)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    item.completed
                      ? 'bg-[#E9DDFB]/40 border-[#F5A9C8]/40 opacity-75'
                      : 'bg-white border-[#FFD6E7] hover:border-[#F5A9C8] shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="p-1 text-[#E07A9C] hover:scale-110 transition-transform"
                    >
                      {item.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100" />
                      ) : (
                        <Circle className="w-5 h-5 text-[#F5A9C8]" />
                      )}
                    </button>

                    <div>
                      <span
                        className={`text-sm font-medium ${
                          item.completed
                            ? 'line-through text-[#7A5374]'
                            : 'text-[#54334F]'
                        }`}
                      >
                        {item.title}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-[#7A5374]/70 mt-0.5">
                        <span>{item.category || 'Adventure'}</span>
                        {item.completed && item.completedDate && (
                          <>
                            <span>·</span>
                            <span>Accomplished on {new Date(item.completedDate).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs text-[#E07A9C]">
                    {item.completed ? 'Completed 💖' : 'Dreaming ✨'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* COMPOSER MODAL */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#FFF8F4] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#FFD6E7] max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#FFD6E7]">
                <h3 className="font-serif font-bold text-xl text-[#54334F] flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#E07A9C]" />
                  <span>Write a Letter of Love</span>
                </h3>
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="p-1 rounded-full hover:bg-white text-[#7A5374]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveLetter} className="flex-1 overflow-y-auto py-4 space-y-4">
                {/* Title & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#54334F] block mb-1">
                      Letter Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. For My Sun and Stars..."
                      className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none focus:ring-2 focus:ring-[#F5A9C8]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#54334F] block mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e: any) => {
                        setCategory(e.target.value);
                        if (e.target.value === 'future') {
                          setIsLockedUntilDate(true);
                        }
                      }}
                      className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none"
                    >
                      <option value="letter">💌 Love Letter</option>
                      <option value="journal">📖 Daily Romantic Diary</option>
                      <option value="miss_me">🌷 Read When You Miss Me</option>
                      <option value="future">⏳ Future Unlock Letter</option>
                      <option value="poem">✨ Poem & Verse</option>
                    </select>
                  </div>
                </div>

                {/* Typography Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#54334F]">Font Style:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFontStyle('handwriting')}
                      className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                        fontStyle === 'handwriting'
                          ? 'bg-[#E07A9C] text-white'
                          : 'bg-white border border-[#FFD6E7] text-[#7A5374]'
                      }`}
                    >
                      Handwritten ✍️
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontStyle('serif')}
                      className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                        fontStyle === 'serif'
                          ? 'bg-[#E07A9C] text-white'
                          : 'bg-white border border-[#FFD6E7] text-[#7A5374]'
                      }`}
                    >
                      Romantic Serif 📜
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontStyle('sans')}
                      className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                        fontStyle === 'sans'
                          ? 'bg-[#E07A9C] text-white'
                          : 'bg-white border border-[#FFD6E7] text-[#7A5374]'
                      }`}
                    >
                      Clean Sans 💫
                    </button>
                  </div>
                </div>

                {/* Future Unlock Date Option */}
                {category === 'future' && (
                  <div className="p-3 bg-white rounded-2xl border border-[#F5A9C8] flex items-center gap-3">
                    <Lock className="w-5 h-5 text-[#E07A9C]" />
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-[#54334F] block">
                        Sealed Until Future Date
                      </span>
                      <input
                        type="date"
                        value={unlockDate}
                        onChange={(e) => setUnlockDate(e.target.value)}
                        className="text-xs p-1.5 rounded-lg border border-[#FFD6E7] mt-1 text-[#54334F]"
                      />
                    </div>
                  </div>
                )}

                {/* Letter Body */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#54334F]">
                      Your Words *
                    </label>
                    <span className="text-[11px] text-[#E07A9C]">{autosaveText}</span>
                  </div>

                  <textarea
                    rows={8}
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write from the heart... your memories, why you adore her, future dreams..."
                    className={`w-full rounded-2xl bg-white border border-[#FFD6E7] p-4 text-[#54334F] focus:outline-none focus:ring-2 focus:ring-[#F5A9C8] leading-relaxed shadow-inner ${
                      fontStyle === 'handwriting'
                        ? 'font-handwriting text-2xl'
                        : fontStyle === 'serif'
                        ? 'font-serif text-base'
                        : 'text-sm'
                    }`}
                  />
                </div>

                {/* Footer Controls */}
                <div className="pt-2 flex items-center justify-between border-t border-[#FFD6E7]/60">
                  <span className="text-[11px] text-[#7A5374]/70">
                    Draft automatically secured
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen(false)}
                      className="px-4 py-2 text-xs font-medium text-[#7A5374] hover:bg-white rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving || !title.trim() || !content.trim()}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#54334F] text-white text-xs font-semibold shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                    >
                      {isSaving ? 'Sealing...' : 'Seal in Our Vault 💖'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* READING MODAL */}
      <AnimatePresence>
        {readingLetter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#FFFDFB] rounded-3xl p-6 sm:p-10 shadow-2xl border-2 border-[#FFD6E7] relative max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#FFD6E7]/60">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{readingLetter.emoji || '💌'}</span>
                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#54334F]">
                      {readingLetter.title}
                    </h3>
                    <span className="text-[11px] text-[#7A5374]">
                      Written by {readingLetter.authorName} on {new Date(readingLetter.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadLetter(readingLetter)}
                    className="p-2 rounded-full hover:bg-[#FFF0F5] text-[#54334F] transition-colors cursor-pointer"
                    title="Export / Download Letter"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setReadingLetter(null)}
                    className="p-2 rounded-full hover:bg-[#FFF0F5] text-[#7A5374] cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Letter Paper Body */}
              <div className="flex-1 overflow-y-auto py-6 px-2 sm:px-4">
                <div
                  className={`text-[#54334F] whitespace-pre-line leading-relaxed ${
                    readingLetter.fontStyle === 'handwriting'
                      ? 'font-handwriting text-2xl sm:text-3xl'
                      : readingLetter.fontStyle === 'serif'
                      ? 'font-serif text-lg italic'
                      : 'text-sm'
                  }`}
                >
                  {readingLetter.content}
                </div>
              </div>

              {/* Romantic footer quote */}
              <div className="pt-4 border-t border-[#FFD6E7]/60 text-center">
                <p className="font-handwriting text-xl text-[#E07A9C]">
                  Forever & always yours 💗
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
