import React, { useState, useEffect } from 'react';
import { MemoryItem, AlbumItem } from '../types';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Heart,
  Info,
  Play,
  Pause,
  Trash2,
  Calendar,
  Clock,
  HardDrive,
  FolderHeart,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface MemoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  currentIndex: number;
  onNavigate: (newIndex: number) => void;
  onToggleFavorite: (memory: MemoryItem) => void;
  onDeleteMemory: (memory: MemoryItem) => void;
  albums: AlbumItem[];
}

export const MemoryViewerModal: React.FC<MemoryViewerModalProps> = ({
  isOpen,
  onClose,
  memories,
  currentIndex,
  onNavigate,
  onToggleFavorite,
  onDeleteMemory,
  albums,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showMetadata, setShowMetadata] = useState<boolean>(false);
  const [isSlideshow, setIsSlideshow] = useState<boolean>(false);
  const [slideshowProgress, setSlideshowProgress] = useState<number>(0);

  const current = memories[currentIndex];

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && currentIndex < memories.length - 1) {
        onNavigate(currentIndex + 1);
        setZoomLevel(1);
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate(currentIndex - 1);
        setZoomLevel(1);
      }
      if (e.key === ' ') {
        setIsSlideshow((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, memories.length, onClose, onNavigate]);

  // Slideshow timer
  useEffect(() => {
    if (!isSlideshow || !isOpen) {
      setSlideshowProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setSlideshowProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < memories.length - 1) {
            onNavigate(currentIndex + 1);
          } else {
            onNavigate(0); // Loop to start
          }
          return 0;
        }
        return prev + 5;
      });
    }, 200); // 4 seconds total

    return () => clearInterval(interval);
  }, [isSlideshow, isOpen, currentIndex, memories.length, onNavigate]);

  if (!isOpen || !current) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.35, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.35, 0.7));
  const handleResetZoom = () => setZoomLevel(1);

  // Trigger heart burst
  const handleFavoriteClick = () => {
    onToggleFavorite(current);
    if (!current.isFavorite) {
      confetti({
        particleCount: 28,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#F5A9C8', '#E07A9C', '#FFD6E7', '#E9DDFB'],
      });
    }
  };

  // Trigger download of original cloud media
  const handleDownload = async () => {
    try {
      const response = await fetch(current.downloadUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = current.filename || `forever-us-memory.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback direct link
      window.open(current.downloadUrl, '_blank');
    }
  };

  const getAlbumNames = () => {
    if (!current.albumIds || current.albumIds.length === 0) return 'All Memories';
    return current.albumIds
      .map((id) => albums.find((a) => a.albumId === id)?.name)
      .filter(Boolean)
      .join(', ') || 'All Memories';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md select-none">
      {/* Top Controls Bar */}
      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-4 sm:px-6 z-30 text-white">
        {/* Memory Index Counter & Title */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono tracking-wider opacity-80">
            {currentIndex + 1} / {memories.length}
          </span>
          <span className="hidden sm:inline-block text-xs font-serif text-white/90 truncate max-w-xs">
            {current.caption || current.filename}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Slideshow Mode Button */}
          <button
            onClick={() => setIsSlideshow(!isSlideshow)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isSlideshow ? 'bg-[#E07A9C] text-white' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Toggle Slideshow"
          >
            {isSlideshow ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Slideshow</span>
          </button>

          {/* Photo Zoom Controls */}
          {current.mediaType === 'image' && (
            <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-full px-2 py-1">
              <button
                onClick={handleZoomOut}
                className="p-1 hover:text-[#F5A9C8] transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-1 text-[11px] font-mono hover:text-[#F5A9C8] cursor-pointer"
                title="Reset Zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                className="p-1 hover:text-[#F5A9C8] transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Favorite Button */}
          <button
            onClick={handleFavoriteClick}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              current.isFavorite
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white hover:text-rose-400'
            }`}
            title="Favorite Memory"
          >
            <Heart className={`w-4 h-4 ${current.isFavorite ? 'fill-white' : ''}`} />
          </button>

          {/* Download Original Cloud File */}
          <button
            onClick={handleDownload}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Download Original File to Device"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Toggle Metadata Sidebar */}
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              showMetadata ? 'bg-white text-[#54334F]' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="Memory Details"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Delete Button */}
          <button
            onClick={() => {
              if (window.confirm("Move this memory to recently deleted? You can restore it later.")) {
                onDeleteMemory(current);
              }
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-rose-500 text-white transition-colors cursor-pointer"
            title="Delete Memory"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Close Lightbox */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors cursor-pointer ml-1"
            title="Close Viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Slideshow Progress Bar */}
      {isSlideshow && (
        <div className="absolute top-16 inset-x-0 h-1 bg-white/20 z-40">
          <div
            className="h-full bg-gradient-to-r from-[#F5A9C8] to-[#E07A9C] transition-all duration-200"
            style={{ width: `${slideshowProgress}%` }}
          />
        </div>
      )}

      {/* Navigation: Previous Button */}
      {currentIndex > 0 && (
        <button
          onClick={() => {
            onNavigate(currentIndex - 1);
            setZoomLevel(1);
          }}
          className="absolute left-4 z-30 p-3 rounded-full bg-black/40 hover:bg-white/30 text-white transition-all backdrop-blur-sm cursor-pointer shadow-lg hover:scale-105"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Navigation: Next Button */}
      {currentIndex < memories.length - 1 && (
        <button
          onClick={() => {
            onNavigate(currentIndex + 1);
            setZoomLevel(1);
          }}
          className="absolute right-4 z-30 p-3 rounded-full bg-black/40 hover:bg-white/30 text-white transition-all backdrop-blur-sm cursor-pointer shadow-lg hover:scale-105"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Main Media Display Viewport */}
      <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-12 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="max-w-full max-h-full flex items-center justify-center"
          >
            {current.mediaType === 'image' && (
              <img
                src={current.downloadUrl}
                alt={current.caption || current.filename}
                style={{
                  transform: `scale(${zoomLevel})`,
                  transition: 'transform 0.2s ease-out',
                }}
                className="max-h-[82vh] max-w-[92vw] sm:max-w-[78vw] object-contain rounded-xl shadow-2xl"
              />
            )}

            {current.mediaType === 'video' && (
              <video
                src={current.downloadUrl}
                controls
                autoPlay
                className="max-h-[82vh] max-w-[92vw] sm:max-w-[78vw] object-contain rounded-xl shadow-2xl"
              />
            )}

            {current.mediaType === 'audio' && (
              <div className="glass-panel-plum rounded-3xl p-8 max-w-md text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFD6E7]/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-[#F5A9C8]" />
                </div>
                <h4 className="text-xl font-serif font-bold text-[#FFF8F4] mb-2">
                  Voice Note Memory
                </h4>
                <p className="text-xs text-[#FFF8F4]/70 mb-4">{current.caption || current.filename}</p>
                <audio src={current.downloadUrl} controls className="w-full" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Metadata Slide-in Drawer */}
      <AnimatePresence>
        {showMetadata && (
          <motion.div
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute right-0 inset-y-0 w-80 sm:w-96 bg-[#FFF8F4] shadow-2xl border-l border-[#FFD6E7] p-6 z-40 overflow-y-auto text-[#54334F]"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#FFD6E7]">
              <h4 className="font-serif font-bold text-lg text-[#54334F] flex items-center gap-2">
                <FolderHeart className="w-5 h-5 text-[#E07A9C]" />
                <span>Memory Details</span>
              </h4>
              <button
                onClick={() => setShowMetadata(false)}
                className="p-1 rounded-full hover:bg-white/70 text-[#7A5374] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-5 text-xs">
              {/* Caption */}
              <div>
                <span className="text-[#7A5374] font-medium block mb-1">Caption / Note</span>
                <p className="text-sm font-serif italic text-[#54334F] bg-white p-3 rounded-xl border border-[#FFD6E7]">
                  {current.caption || 'No caption recorded.'}
                </p>
              </div>

              {/* Album Membership */}
              <div>
                <span className="text-[#7A5374] font-medium block mb-1">Album / Folder</span>
                <span className="inline-block px-3 py-1 rounded-lg bg-[#E9DDFB]/60 text-[#54334F] font-semibold">
                  {getAlbumNames()}
                </span>
              </div>

              {/* Upload Timestamp */}
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#E07A9C] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#7A5374] block">Uploaded To Cloud Vault</span>
                  <span className="font-medium text-[#54334F]">
                    {new Date(current.uploadedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Capture Date */}
              {current.captureDate && (
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-[#E07A9C] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#7A5374] block">Original Moment Captured</span>
                    <span className="font-medium text-[#54334F]">{current.captureDate}</span>
                  </div>
                </div>
              )}

              {/* File Info */}
              <div className="flex items-start gap-2.5">
                <HardDrive className="w-4 h-4 text-[#E07A9C] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#7A5374] block">File Size & Format</span>
                  <span className="font-medium text-[#54334F]">
                    {(current.fileSize / (1024 * 1024)).toFixed(2)} MB · {current.mediaType.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Storage Reference Path */}
              <div className="p-3 bg-white/70 rounded-xl border border-[#FFD6E7] font-mono text-[10px] break-all text-[#7A5374]">
                <span className="font-semibold block mb-0.5 text-[#54334F]">Cloud Storage Path:</span>
                {current.storagePath}
              </div>

              {/* Permanent Cloud Guarantee Notice */}
              <div className="p-3 rounded-xl bg-[#FFF0F5] border border-[#F5A9C8] text-[11px] text-[#54334F] leading-relaxed">
                💖 <strong>Protected Forever:</strong> This memory is permanently archived in Google Cloud Storage. Deleting it from your phone's camera roll will not affect this vault.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
