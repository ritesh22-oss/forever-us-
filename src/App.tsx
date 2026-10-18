import React, { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, testConnection } from './lib/firebase';
import {
  CoupleSettings,
  MemoryItem,
  AlbumItem,
  LoveLetterItem,
  TimelineEventItem,
  BucketListItem,
  ReasonLoveItem,
} from './types';
import { RomanticLoadingScreen } from './components/RomanticLoadingScreen';
import { PasswordGate } from './components/PasswordGate';
import { CoupleAuthGate } from './components/CoupleAuthGate';
import { HomeView } from './components/HomeView';
import { MemoryGallery } from './components/MemoryGallery';
import { AlbumsView } from './components/AlbumsView';
import { LoveLettersView } from './components/LoveLettersView';
import { TimelineView } from './components/TimelineView';
import { SettingsView } from './components/SettingsView';
import { UploadModal } from './components/UploadModal';
import { MemoryViewerModal } from './components/MemoryViewerModal';
import { MemoryCalendarPanel } from './components/MemoryCalendarPanel';
import { LoveRopeTimeline } from './components/LoveRopeTimeline';
import { HamburgerMenuDrawer } from './components/HamburgerMenuDrawer';
import { romanticAudio } from './lib/romanticAudio';
import {
  Heart,
  Home,
  Image as ImageIcon,
  Video,
  FolderHeart,
  Mail,
  Calendar,
  Settings,
  Plus,
  Volume2,
  VolumeX,
  UploadCloud,
  Edit3,
  Sparkles,
  Menu,
  X,
  Lock,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type NavTab = 'home' | 'gallery' | 'rope' | 'albums' | 'letters' | 'timeline' | 'settings';

export default function App() {
  // Opening sequence states
  const [showLoadingScreen, setShowLoadingScreen] = useState<boolean>(false);
  const [isGateUnlocked, setIsGateUnlocked] = useState<boolean>(false);
  const [isGateChecking, setIsGateChecking] = useState<boolean>(true);
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(true);

  // Auth & Data states
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  // Firestore collections data
  const [settings, setSettings] = useState<CoupleSettings | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [letters, setLetters] = useState<LoveLetterItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineEventItem[]>([]);
  const [bucketList, setBucketList] = useState<BucketListItem[]>([]);
  const [reasons, setReasons] = useState<ReasonLoveItem[]>([]);

  // Modals & UI states
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [readingLetter, setReadingLetter] = useState<LoveLetterItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadModalDate, setUploadModalDate] = useState<string | undefined>(undefined);
  const [selectedMemoryIndex, setSelectedMemoryIndex] = useState<number | null>(null);
  const [isFloatingMenuOpen, setIsFloatingMenuOpen] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);

  // Test connection on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Check gate status from server
  useEffect(() => {
    let isMounted = true;
    const checkServerGate = async () => {
      try {
        const res = await fetch('/api/auth/gate-status');
        if (res.ok) {
          const data = await res.json();
          if (data.unlocked && isMounted) {
            setIsGateUnlocked(true);
          }
        }
      } catch (err) {
        console.warn("Gate check fallback:", err);
      } finally {
        if (isMounted) {
          setIsGateChecking(false);
        }
      }
    };
    checkServerGate();
    return () => {
      isMounted = false;
    };
  }, []);

  // Firebase Auth listener with browserLocalPersistence
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setIsAuthInitializing(false);
      },
      (error) => {
        console.warn("Auth state observer error:", error);
        setIsAuthInitializing(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Firestore Data Listeners (active when authenticated)
  useEffect(() => {
    if (!user) return;

    // 1. Settings listener & bootstrap initial settings if missing
    const settingsRef = doc(db, 'settings', 'forever-us');
    const unsubSettings = onSnapshot(
      settingsRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as CoupleSettings;
          data.relationshipStartDate = '2026-07-10';
          data.anniversaryDate = '2026-07-10';
          setSettings(data);
        } else {
          // Initialize default couple configuration
          const defaultSettings: CoupleSettings = {
            coupleId: 'forever-us',
            partner1Name: 'Ritesh',
            partner2Name: 'Sweetheart',
            anniversaryDate: '2026-07-10',
            relationshipStartDate: '2026-07-10',
            theme: 'blush',
            reducedMotion: false,
            musicEnabled: false,
            authorizedEmails: [user.email || 'riteshganguly0911@gmail.com'],
            updatedAt: new Date().toISOString(),
          };
          try {
            await setDoc(settingsRef, defaultSettings);
            setSettings(defaultSettings);
          } catch (e) {
            console.warn("Could not bootstrap settings:", e);
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'settings/forever-us')
    );

    // 2. Memories listener
    const memoriesRef = collection(db, 'memories');
    const unsubMemories = onSnapshot(
      memoriesRef,
      (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as MemoryItem[];
        setMemories(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'memories')
    );

    // 3. Albums listener & bootstrap sample folders if empty
    const albumsRef = collection(db, 'albums');
    const unsubAlbums = onSnapshot(
      albumsRef,
      async (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as AlbumItem[];
        setAlbums(items);

        // Bootstrap initial albums if none exist
        if (items.length === 0) {
          const starterAlbums = [
            { id: 'alb_beginning', name: 'The Beginning 💌', emoji: '💌', description: 'How our beautiful love story started' },
            { id: 'alb_dates', name: 'First Date & Milestones 🌷', emoji: '🌷', description: 'The places and moments that brought us together' },
            { id: 'alb_favorites', name: 'Our Favorite Pictures 📸', emoji: '📸', description: 'Smiles we never want to forget' },
            { id: 'alb_forever', name: 'Forever and Always 💖', emoji: '💍', description: 'Our promises and dreams for tomorrow' },
          ];
          for (const sa of starterAlbums) {
            try {
              await setDoc(doc(db, 'albums', sa.id), {
                albumId: sa.id,
                name: sa.name,
                emoji: sa.emoji,
                description: sa.description,
                createdAt: new Date().toISOString(),
                creatorUid: user.uid,
                isDeleted: false,
              });
            } catch {
              // Ignore bootstrap race
            }
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'albums')
    );

    // 4. Love Letters listener
    const lettersRef = collection(db, 'letters');
    const unsubLetters = onSnapshot(
      lettersRef,
      async (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as LoveLetterItem[];
        setLetters(items);

        // Bootstrap welcome letter if none exist
        if (items.length === 0) {
          try {
            await setDoc(doc(db, 'letters', 'welcome_letter'), {
              letterId: 'welcome_letter',
              title: 'Welcome to Our Sanctuary 💖',
              content: `To my sweetest love,\n\nI built this private space just for the two of us. In a world full of passing things, everything here is forever.\n\nEvery photograph, every laugh, every midnight conversation, and every little moment you ever give me is safe here in our cloud vault.\n\nI love you more than words could ever hold.\n\nAlways yours,\nForever Us`,
              fontStyle: 'handwriting',
              emoji: '💌',
              tags: ['welcome'],
              photos: [],
              isFavorite: true,
              category: 'letter',
              createdAt: new Date().toISOString(),
              authorUid: user.uid,
              authorName: user.displayName || 'Me',
            });
          } catch {
            // Ignore
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'letters')
    );

    // 5. Timeline listener
    const timelineRef = collection(db, 'timeline');
    const unsubTimeline = onSnapshot(
      timelineRef,
      (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as TimelineEventItem[];
        setTimeline(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'timeline')
    );

    // 6. Bucket List listener
    const bucketRef = collection(db, 'bucketList');
    const unsubBucket = onSnapshot(
      bucketRef,
      (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as BucketListItem[];
        setBucketList(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bucketList')
    );

    // 7. Reasons I Love You listener
    const reasonsRef = collection(db, 'reasonsLove');
    const unsubReasons = onSnapshot(
      reasonsRef,
      async (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ReasonLoveItem[];
        setReasons(items);

        // Bootstrap starter reasons if empty
        if (items.length === 0) {
          const starterReasons = [
            "The way your eyes crinkle with true joy when you laugh.",
            "How safe and peaceful the whole world feels when your hand is in mine.",
            "Your kindness toward everyone and everything you touch.",
            "Because you are my home.",
          ];
          for (let i = 0; i < starterReasons.length; i++) {
            try {
              await setDoc(doc(db, 'reasonsLove', `reason_init_${i}`), {
                reasonId: `reason_init_${i}`,
                text: starterReasons[i],
                authorName: user.displayName || 'Forever Us',
                createdAt: new Date().toISOString(),
                heartColor: '#E07A9C',
                creatorUid: user.uid,
              });
            } catch {
              // Ignore
            }
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reasonsLove')
    );

    return () => {
      unsubSettings();
      unsubMemories();
      unsubAlbums();
      unsubLetters();
      unsubTimeline();
      unsubBucket();
      unsubReasons();
    };
  }, [user]);

  // Audio ambient toggle
  const toggleMusic = () => {
    const isPlaying = romanticAudio.toggle();
    setIsMusicPlaying(isPlaying);
  };

  // Toggle Favorite handler
  const handleToggleFavorite = async (memory: MemoryItem) => {
    try {
      const memoryRef = doc(db, 'memories', memory.memoryId);
      await updateDoc(memoryRef, {
        isFavorite: !memory.isFavorite,
      });
    } catch (err) {
      console.error("Failed toggling favorite:", err);
    }
  };

  // Soft delete memory
  const handleDeleteMemory = async (memory: MemoryItem) => {
    try {
      const memoryRef = doc(db, 'memories', memory.memoryId);
      await updateDoc(memoryRef, {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
      });
      setSelectedMemoryIndex(null);
    } catch (err) {
      console.error("Failed deleting memory:", err);
    }
  };

  // Logout from Gate & Google Auth
  const handleLogoutGate = async () => {
    try {
      await fetch('/api/auth/gate-logout', { method: 'POST' });
    } catch {}
    try {
      await signOut(auth);
    } catch {}
    setIsGateUnlocked(false);
    setUser(null);
  };

  // STAGE 0: Restoring Session (both gate status & Firebase persistent auth)
  // Shows a minimal animated glowing heart loader, preventing any flicker of the sign-in screen
  if (isGateChecking || isAuthInitializing) {
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

  // STAGE 1: Cinematic 3D Loading Screen (if explicitly enabled)
  if (showLoadingScreen) {
    return <RomanticLoadingScreen onComplete={() => setShowLoadingScreen(false)} />;
  }

  // STAGE 2: Password Gate (Initial access code 1509)
  if (!isGateUnlocked) {
    return (
      <PasswordGate
        onSuccess={() => {
          setIsGateUnlocked(true);
        }}
      />
    );
  }

  // STAGE 3: Couple Authentication Gate (Requires authorized Google account with persistent session)
  return (
    <CoupleAuthGate
      user={user}
      isAuthRestoring={isAuthInitializing}
      settings={settings}
      onLogoutGate={handleLogoutGate}
      onRefreshSettings={() => {}}
    >
      <div className="min-h-screen flex flex-col bg-[#FFF8F4] text-[#54334F] relative selection:bg-[#F5A9C8] selection:text-[#54334F]">
        {/* UNIFIED TOP NAVIGATION BAR */}
        <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#FFD6E7] px-4 sm:px-8 py-3 flex items-center justify-between shadow-2xs">
          {/* Left: Logo & Brand */}
          <div 
            onClick={() => { setActiveTab('home'); setSelectedAlbumId(null); }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F5A9C8] to-[#FFD6E7] flex items-center justify-center text-[#54334F] shadow-xs group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5 fill-[#54334F]/20 text-[#54334F] animate-gentle-pulse" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-serif font-bold text-[#54334F] tracking-tight">
                Forever Us
              </h1>
              <p className="text-[10px] font-handwriting text-[#E07A9C] -mt-1">
                Our Little Universe 💗
              </p>
            </div>
          </div>

          {/* Center: Essential Page Title / Greeting */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[#7A5374] bg-[#FFF0F5]/80 px-3.5 py-1.5 rounded-full border border-[#FFD6E7]">
            <Sparkles className="w-3.5 h-3.5 text-[#E07A9C]" />
            <span>
              {activeTab === 'home' && 'Our Sanctuary'}
              {activeTab === 'gallery' && 'All Memories'}
              {activeTab === 'rope' && '3D Love Rope 🪢'}
              {activeTab === 'albums' && 'Chapters & Albums'}
              {activeTab === 'letters' && 'Love Letters & Notes'}
              {activeTab === 'timeline' && 'Our Relationship Timeline'}
              {activeTab === 'settings' && 'Sanctuary Settings'}
            </span>
          </div>

          {/* Right: Actions & Hamburger Menu */}
          <div className="flex items-center gap-2.5">
            {/* Ambient Chimes Toggle */}
            <button
              onClick={toggleMusic}
              className={`p-2 rounded-full border border-[#FFD6E7] transition-all cursor-pointer ${
                isMusicPlaying
                  ? 'bg-[#E9DDFB] text-[#54334F]'
                  : 'bg-white/70 hover:bg-white text-[#7A5374]'
              }`}
              title={isMusicPlaying ? 'Mute Ambient Chimes' : 'Play Ambient Chimes'}
            >
              {isMusicPlaying ? <Volume2 className="w-4 h-4 text-[#E07A9C] animate-pulse" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Calendar Quick Button */}
            <button
              onClick={() => setIsCalendarOpen(true)}
              className="hidden xs:flex p-2 rounded-full bg-white/70 hover:bg-white border border-[#FFD6E7] text-[#54334F] relative cursor-pointer"
              title="Memory Calendar"
            >
              <Calendar className="w-4 h-4 text-[#E07A9C]" />
              <Heart className="w-2 h-2 text-rose-500 fill-rose-500 absolute top-0.5 right-0.5 animate-pulse" />
            </button>

            {/* Hamburger Menu Button (Replaces top-right upload icon) */}
            <button
              onClick={() => setIsHamburgerOpen(true)}
              className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#F5A9C8] to-[#FFD6E7] hover:opacity-90 text-[#54334F] shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center justify-center"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* HAMBURGER MENU SLIDING DRAWER */}
        <HamburgerMenuDrawer
          isOpen={isHamburgerOpen}
          onClose={() => setIsHamburgerOpen(false)}
          activeTab={activeTab}
          onSelectTab={(tab, extra) => {
            setActiveTab(tab);
            setSelectedAlbumId(null);
          }}
          onOpenCalendar={() => setIsCalendarOpen(true)}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          user={user}
          onLogout={handleLogoutGate}
          counts={{
            memories: memories.filter(m => !m.isDeleted).length,
            albums: albums.length,
            letters: letters.length,
            timeline: timeline.length,
            favorites: memories.filter(m => !m.isDeleted && m.isFavorite).length,
          }}
        />

        {/* MAIN VIEWPORT CONTENT */}
        <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full overflow-x-hidden">
          {/* Top Bar for Desktop with Floating Memory Calendar Icon & Search */}
          <div className="hidden md:flex items-center justify-between mb-6 pb-3 border-b border-[#FFD6E7]/50">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-lg text-[#54334F]">
                Forever Us
              </span>
              <span className="text-xs text-[#E07A9C] font-handwriting">
                • Ritesh & Sweetheart
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Quick Search Button */}
              <button
                onClick={() => setIsCalendarOpen(true)}
                className="px-3 py-1.5 rounded-full bg-white/70 hover:bg-white text-xs text-[#7A5374] hover:text-[#54334F] border border-[#FFD6E7] flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                title="Search memories by date"
              >
                <Search className="w-3.5 h-3.5 text-[#E07A9C]" />
                <span>Search by date...</span>
              </button>

              {/* Floating Memory Calendar Icon Button */}
              <button
                onClick={() => setIsCalendarOpen(true)}
                title="Our Memory Calendar 💗"
                className="px-4 py-1.5 rounded-full bg-gradient-to-r from-white via-[#FFF0F5] to-white hover:bg-white text-xs font-semibold text-[#54334F] border border-[#FFD6E7] shadow-2xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer group"
              >
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#E07A9C] group-hover:scale-110 transition-transform" />
                  <Heart className="w-2 h-2 text-rose-500 fill-rose-500 absolute -top-1 -right-1 animate-ping" />
                  <Heart className="w-2 h-2 text-rose-500 fill-rose-500 absolute -top-1 -right-1" />
                </div>
                <span>Our Memory Calendar 💗</span>
              </button>

              {/* Profile / Settings Button */}
              <button
                onClick={() => setActiveTab('settings')}
                className="p-2 rounded-full bg-white/80 hover:bg-white border border-[#FFD6E7] text-[#7A5374] hover:text-[#54334F] transition-colors cursor-pointer shadow-2xs"
                title="Sanctuary Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {activeTab === 'home' && (
            <HomeView
              memories={memories}
              albums={albums}
              letters={letters}
              timeline={timeline}
              settings={settings}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                setSelectedAlbumId(null);
              }}
              onSelectMemory={(idx) => setSelectedMemoryIndex(idx)}
              onOpenUpload={() => setIsUploadModalOpen(true)}
              onOpenComposer={() => setActiveTab('letters')}
              onOpenCalendar={() => setIsCalendarOpen(true)}
            />
          )}

          {activeTab === 'gallery' && (
            <MemoryGallery
              memories={memories}
              albums={albums}
              selectedAlbumId={selectedAlbumId}
              onSelectMemory={(idx) => setSelectedMemoryIndex(idx)}
              onToggleFavorite={handleToggleFavorite}
              onOpenUpload={() => setIsUploadModalOpen(true)}
            />
          )}

          {activeTab === 'rope' && (
            <LoveRopeTimeline
              memories={memories}
              albums={albums}
              letters={letters}
              timelineEvents={timeline}
              user={user!}
              onSelectMemory={(idx) => setSelectedMemoryIndex(idx)}
              onOpenLetter={(l) => setReadingLetter(l)}
              onOpenUpload={() => setIsUploadModalOpen(true)}
            />
          )}

          {activeTab === 'albums' && (
            <AlbumsView
              albums={albums}
              memories={memories}
              user={user!}
              onSelectAlbum={(albumId) => {
                setSelectedAlbumId(albumId);
                setActiveTab('gallery');
              }}
              onRefreshData={() => {}}
            />
          )}

          {activeTab === 'letters' && (
            <LoveLettersView
              letters={letters}
              bucketList={bucketList}
              reasons={reasons}
              user={user!}
              onRefreshData={() => {}}
            />
          )}

          {activeTab === 'timeline' && (
            <TimelineView
              timeline={timeline}
              memories={memories}
              settings={settings}
              user={user!}
              onRefreshData={() => {}}
              onSelectMemoryById={(id) => {
                const idx = memories.findIndex((m) => m.id === id);
                if (idx !== -1) setSelectedMemoryIndex(idx);
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              memories={memories}
              albums={albums}
              letters={letters}
              timeline={timeline}
              user={user!}
              onRefreshSettings={() => {}}
              onLogoutGate={handleLogoutGate}
            />
          )}
        </main>

        {/* SINGLE FLOATING CIRCULAR PLUS BUTTON (Bottom Center) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setIsFloatingMenuOpen(!isFloatingMenuOpen)}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#54334F] text-white flex items-center justify-center shadow-xl hover:shadow-2xl active:scale-95 transition-all cursor-pointer ring-4 ring-white/80"
            title="Add New Memory or Milestone"
          >
            <Plus className={`w-7 h-7 transition-transform duration-300 ${isFloatingMenuOpen ? 'rotate-45' : ''}`} />
          </button>
        </div>

        {/* FLOATING ACTION MENU (Mobile & Desktop) */}
        <AnimatePresence>
          {isFloatingMenuOpen && (
            <div
              onClick={() => setIsFloatingMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xs bg-[#FFF8F4] rounded-3xl p-5 shadow-2xl border border-[#FFD6E7] space-y-2 mb-16 sm:mb-0"
              >
                <div className="text-center pb-2 border-b border-[#FFD6E7]">
                  <span className="font-serif font-bold text-sm text-[#54334F]">
                    Add a New Memory 💗
                  </span>
                </div>

                <button
                  onClick={() => {
                    setIsFloatingMenuOpen(false);
                    setIsUploadModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#FFF0F5] border border-[#FFD6E7] text-xs font-semibold text-[#54334F] flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-[#E07A9C]" />
                  <span>Upload Photos & Videos</span>
                </button>

                <button
                  onClick={() => {
                    setIsFloatingMenuOpen(false);
                    setActiveTab('rope');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#FFF0F5] border border-[#FFD6E7] text-xs font-semibold text-[#54334F] flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <span className="text-sm">🪢</span>
                  <span>Explore 3D Love Rope</span>
                </button>

                <button
                  onClick={() => {
                    setIsFloatingMenuOpen(false);
                    setActiveTab('letters');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#FFF0F5] border border-[#FFD6E7] text-xs font-semibold text-[#54334F] flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-[#E07A9C]" />
                  <span>Write Love Letter</span>
                </button>

                <button
                  onClick={() => {
                    setIsFloatingMenuOpen(false);
                    setActiveTab('albums');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#FFF0F5] border border-[#FFD6E7] text-xs font-semibold text-[#54334F] flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <FolderHeart className="w-4 h-4 text-[#E07A9C]" />
                  <span>Create Custom Album</span>
                </button>

                <button
                  onClick={() => {
                    setIsFloatingMenuOpen(false);
                    setActiveTab('timeline');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#FFF0F5] border border-[#FFD6E7] text-xs font-semibold text-[#54334F] flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-[#E07A9C]" />
                  <span>Add Relationship Milestone</span>
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* INTERACTIVE MEMORY CALENDAR PANEL */}
        <MemoryCalendarPanel
          isOpen={isCalendarOpen}
          onClose={() => setIsCalendarOpen(false)}
          memories={memories}
          albums={albums}
          letters={letters}
          timeline={timeline}
          user={user}
          onSelectMemory={(idx) => {
            setSelectedMemoryIndex(idx);
          }}
          onOpenLetter={(letter) => {
            setReadingLetter(letter);
          }}
          onOpenUploadForDate={(dateStr) => {
            setUploadModalDate(dateStr);
            setIsUploadModalOpen(true);
          }}
          onOpenComposerForDate={(dateStr) => {
            setActiveTab('letters');
            setIsCalendarOpen(false);
          }}
        />

        {/* FULLSCREEN LIGHTBOX VIEWER */}
        {selectedMemoryIndex !== null && (
          <MemoryViewerModal
            isOpen={selectedMemoryIndex !== null}
            onClose={() => setSelectedMemoryIndex(null)}
            memories={memories.filter((m) => !m.isDeleted)}
            currentIndex={selectedMemoryIndex}
            onNavigate={(newIdx) => setSelectedMemoryIndex(newIdx)}
            onToggleFavorite={handleToggleFavorite}
            onDeleteMemory={handleDeleteMemory}
            albums={albums}
          />
        )}

        {/* REAL CLOUD MEDIA UPLOAD MODAL */}
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => {
            setIsUploadModalOpen(false);
            setUploadModalDate(undefined);
          }}
          user={user!}
          albums={albums}
          initialCaptureDate={uploadModalDate}
          onUploadSuccess={() => {}}
        />

        {/* LETTER READING MODAL (when opened from Calendar) */}
        <AnimatePresence>
          {readingLetter && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
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
                  <button
                    onClick={() => setReadingLetter(null)}
                    className="p-2 rounded-full hover:bg-[#FFF0F5] text-[#7A5374] cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
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
    </CoupleAuthGate>
  );
}
