import React, { useState, useMemo } from 'react';
import { MemoryItem, AlbumItem } from '../types';
import {
  Search,
  Filter,
  ArrowUpDown,
  Heart,
  Video,
  Image as ImageIcon,
  Calendar,
  Sparkles,
  UploadCloud,
  FolderHeart,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface MemoryGalleryProps {
  memories: MemoryItem[];
  albums: AlbumItem[];
  onSelectMemory: (index: number) => void;
  onToggleFavorite: (memory: MemoryItem) => void;
  onOpenUpload: () => void;
  selectedAlbumId?: string | null;
}

export const MemoryGallery: React.FC<MemoryGalleryProps> = ({
  memories,
  albums,
  onSelectMemory,
  onToggleFavorite,
  onOpenUpload,
  selectedAlbumId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'favorites'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'captureDate' | 'name'>('newest');

  // Filter and sort memories
  const filteredMemories = useMemo(() => {
    return memories
      .filter((m) => !m.isDeleted)
      .filter((m) => {
        // Album filter
        if (selectedAlbumId && (!m.albumIds || !m.albumIds.includes(selectedAlbumId))) {
          return false;
        }
        // Media type / Favorite filter
        if (filterType === 'image' && m.mediaType !== 'image') return false;
        if (filterType === 'video' && m.mediaType !== 'video') return false;
        if (filterType === 'favorites' && !m.isFavorite) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCaption = m.caption?.toLowerCase().includes(q);
          const matchFilename = m.filename?.toLowerCase().includes(q);
          const matchTags = m.tags?.some((t) => t.toLowerCase().includes(q));
          return matchCaption || matchFilename || matchTags;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        }
        if (sortBy === 'captureDate') {
          return (b.captureDate || '').localeCompare(a.captureDate || '');
        }
        if (sortBy === 'name') {
          return (a.caption || a.filename).localeCompare(b.caption || b.filename);
        }
        return 0;
      });
  }, [memories, selectedAlbumId, filterType, searchQuery, sortBy]);

  const handleHeartClick = (e: React.MouseEvent, memory: MemoryItem) => {
    e.stopPropagation();
    onToggleFavorite(memory);
    if (!memory.isFavorite) {
      confetti({
        particleCount: 20,
        spread: 45,
        origin: {
          x: e.clientX / window.innerWidth,
          y: e.clientY / window.innerHeight,
        },
        colors: ['#F5A9C8', '#E07A9C', '#FFD6E7'],
      });
    }
  };

  const getAlbumName = (albumIds?: string[]) => {
    if (!albumIds || albumIds.length === 0) return null;
    const firstId = albumIds[0];
    const album = albums.find((a) => a.albumId === firstId);
    return album?.name || null;
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar: Search, Filters, Sort */}
      <div className="glass-panel rounded-2xl p-4 shadow-sm border border-[#FFD6E7]/80 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A5374]/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search our memories..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/80 border border-[#FFD6E7] text-xs text-[#54334F] placeholder-[#7A5374]/50 focus:outline-none focus:ring-2 focus:ring-[#F5A9C8]"
          />
        </div>

        {/* Filter Tabs & Sort Dropdown */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Segmented Filter Control */}
          <div className="flex items-center gap-1 p-1 bg-white/70 rounded-xl border border-[#FFD6E7]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] shadow-xs'
                  : 'text-[#7A5374] hover:text-[#54334F]'
              }`}
            >
              All ({memories.filter((m) => !m.isDeleted).length})
            </button>
            <button
              onClick={() => setFilterType('image')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'image'
                  ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] shadow-xs'
                  : 'text-[#7A5374] hover:text-[#54334F]'
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              <span>Photos</span>
            </button>
            <button
              onClick={() => setFilterType('video')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'video'
                  ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] shadow-xs'
                  : 'text-[#7A5374] hover:text-[#54334F]'
              }`}
            >
              <Video className="w-3 h-3" />
              <span>Videos</span>
            </button>
            <button
              onClick={() => setFilterType('favorites')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                filterType === 'favorites'
                  ? 'bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] shadow-xs'
                  : 'text-[#7A5374] hover:text-[#54334F]'
              }`}
            >
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
              <span>Favorites</span>
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-[#7A5374]">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#E07A9C]" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="rounded-xl bg-white/80 border border-[#FFD6E7] px-2.5 py-1.5 text-xs text-[#54334F] focus:outline-none focus:ring-2 focus:ring-[#F5A9C8]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="captureDate">Capture Date</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredMemories.length === 0 && (
        <div className="glass-panel rounded-3xl p-12 text-center border border-[#FFD6E7] my-8 max-w-lg mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FFD6E7]/60 flex items-center justify-center animate-gentle-pulse">
            <Heart className="w-8 h-8 text-[#E07A9C] fill-[#E07A9C]/20" />
          </div>
          <h3 className="text-xl font-serif font-bold text-[#54334F]">
            {searchQuery ? 'No memories match your search' : 'Our gallery awaits your moments'}
          </h3>
          <p className="text-xs text-[#7A5374] mt-2 mb-6 max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? 'Try searching with a different caption, tag, or reset filters.'
              : 'Every photograph is a little piece of forever. Upload your first photos or videos to begin.'}
          </p>
          <button
            onClick={onOpenUpload}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#54334F] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Add Photos & Videos</span>
          </button>
        </div>
      )}

      {/* Masonry / Polaroid Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredMemories.map((memory, index) => {
          // Subtle rotation for polaroid effect (-1.5deg to +1.5deg based on index)
          const tilt = ((index % 5) - 2) * 0.9;
          const albumName = getAlbumName(memory.albumIds);

          return (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
              whileHover={{ y: -6, rotate: 0 }}
              onClick={() => onSelectMemory(index)}
              style={{ transform: `rotate(${tilt}deg)` }}
              className="polaroid-card rounded-2xl cursor-pointer group relative flex flex-col justify-between overflow-hidden"
            >
              {/* Media Container */}
              <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-[#FFF0F5] mb-3">
                {memory.mediaType === 'video' ? (
                  <div className="relative w-full h-full">
                    <video
                      src={memory.downloadUrl}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-xs flex items-center justify-center text-[#54334F] shadow-md group-hover:scale-110 transition-transform">
                        <Video className="w-5 h-5 text-[#E07A9C]" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={memory.downloadUrl}
                    alt={memory.caption || memory.filename}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}

                {/* Heart Favorite Overlay Button */}
                <button
                  type="button"
                  onClick={(e) => handleHeartClick(e, memory)}
                  className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-xs transition-all cursor-pointer shadow-xs ${
                    memory.isFavorite
                      ? 'bg-rose-500 text-white'
                      : 'bg-white/70 hover:bg-white text-[#7A5374] hover:text-rose-500'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${memory.isFavorite ? 'fill-white' : ''}`} />
                </button>

                {/* Optional Album Tag */}
                {albumName && (
                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-md bg-black/55 backdrop-blur-xs text-[10px] text-white font-medium flex items-center gap-1">
                    <FolderHeart className="w-3 h-3 text-[#F5A9C8]" />
                    <span className="truncate max-w-[120px]">{albumName}</span>
                  </div>
                )}
              </div>

              {/* Polaroid Handwritten/Serif Caption & Metadata */}
              <div className="px-1 text-left">
                <p className="font-serif font-medium text-sm text-[#54334F] line-clamp-1 group-hover:text-[#E07A9C] transition-colors">
                  {memory.caption || memory.filename}
                </p>

                <div className="flex items-center justify-between text-[11px] text-[#7A5374]/70 mt-1">
                  <span>
                    {memory.captureDate || new Date(memory.uploadedAt).toLocaleDateString()}
                  </span>
                  <span className="text-[10px] opacity-80">
                    {(memory.fileSize / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
