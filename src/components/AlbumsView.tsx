import React, { useState } from 'react';
import { AlbumItem, MemoryItem } from '../types';
import { User } from 'firebase/auth';
import {
  FolderHeart,
  Plus,
  MoreVertical,
  Image as ImageIcon,
  Edit2,
  Trash2,
  Smile,
  Calendar,
  Sparkles,
  ArrowRight,
  X,
  Heart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AlbumsViewProps {
  albums: AlbumItem[];
  memories: MemoryItem[];
  user: User;
  onSelectAlbum: (albumId: string) => void;
  onRefreshData: () => void;
}

export const AlbumsView: React.FC<AlbumsViewProps> = ({
  albums,
  memories,
  user,
  onSelectAlbum,
  onRefreshData,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<AlbumItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💗');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emojisList = ['💗', '💌', '🌷', '🎂', '🎥', '✨', '☕', '🌅', '✈️', '💍', '🧸', '🍷'];

  const handleOpenCreate = () => {
    setEditingAlbum(null);
    setName('');
    setEmoji('💗');
    setDescription('');
    setCoverUrl('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (album: AlbumItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAlbum(album);
    setName(album.name);
    setEmoji(album.emoji || '💗');
    setDescription(album.description || '');
    setCoverUrl(album.coverUrl || '');
    setIsCreateModalOpen(true);
  };

  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const albumId = editingAlbum?.albumId || `album_${Date.now()}`;
      const albumRef = doc(db, 'albums', albumId);

      const albumData = {
        albumId,
        name: name.trim().substring(0, 128),
        emoji: emoji || '💗',
        description: description.trim().substring(0, 1000),
        coverUrl: coverUrl.trim().substring(0, 2048),
        color: '#F5A9C8',
        createdAt: editingAlbum?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        creatorUid: user.uid,
        isDeleted: false,
      };

      await setDoc(albumRef, albumData, { merge: true });
      setIsCreateModalOpen(false);
      onRefreshData();
    } catch (err) {
      console.error("Failed saving album:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAlbum = async (album: AlbumItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Delete album "${album.name}"? Note: your uploaded photos and videos in the cloud will NOT be deleted.`
    );
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'albums', album.albumId));
      onRefreshData();
    } catch (err) {
      console.error("Failed deleting album:", err);
    }
  };

  const getAlbumMemoryCount = (albumId: string) => {
    return memories.filter(
      (m) => !m.isDeleted && m.albumIds && m.albumIds.includes(albumId)
    ).length;
  };

  const getAlbumCover = (album: AlbumItem) => {
    if (album.coverUrl) return album.coverUrl;
    // Fallback to first memory in album
    const firstMemory = memories.find(
      (m) => !m.isDeleted && m.albumIds && m.albumIds.includes(album.albumId)
    );
    return firstMemory?.downloadUrl || null;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Create Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#54334F] flex items-center gap-2">
            <span>Our Chapters & Albums</span>
            <span className="text-xl">📚</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#7A5374] mt-0.5">
            Organized corners for every trip, date, milestone, and sweet memory.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#54334F] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Album</span>
        </button>
      </div>

      {/* Albums Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {albums.map((album) => {
          const cover = getAlbumCover(album);
          const count = getAlbumMemoryCount(album.albumId);

          return (
            <motion.div
              key={album.albumId}
              whileHover={{ y: -5 }}
              onClick={() => onSelectAlbum(album.albumId)}
              className="glass-panel rounded-3xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border border-[#FFD6E7] flex flex-col justify-between group overflow-hidden"
            >
              <div>
                {/* Album Cover Photo */}
                <div className="relative w-full aspect-16/10 rounded-2xl overflow-hidden bg-gradient-to-br from-[#FFF0F5] to-[#E9DDFB] mb-3.5 flex items-center justify-center border border-white/60">
                  {cover ? (
                    <img
                      src={cover}
                      alt={album.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <span className="text-4xl block mb-1">{album.emoji || '📁'}</span>
                      <span className="text-[11px] text-[#7A5374]/60">Empty album</span>
                    </div>
                  )}

                  {/* Top Emoji Badge */}
                  <div className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full bg-white/80 backdrop-blur-xs flex items-center justify-center text-base shadow-xs">
                    {album.emoji || '💗'}
                  </div>

                  {/* Actions Menu */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleOpenEdit(album, e)}
                      className="p-1.5 rounded-full bg-white/80 hover:bg-white text-[#54334F] shadow-xs cursor-pointer"
                      title="Edit Album"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteAlbum(album, e)}
                      className="p-1.5 rounded-full bg-white/80 hover:bg-rose-50 text-rose-500 shadow-xs cursor-pointer"
                      title="Delete Album"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="font-serif font-bold text-lg text-[#54334F] group-hover:text-[#E07A9C] transition-colors truncate">
                  {album.name}
                </h3>
                {album.description && (
                  <p className="text-xs text-[#7A5374] line-clamp-2 mt-1 leading-relaxed">
                    {album.description}
                  </p>
                )}
              </div>

              {/* Footer: Count & Open Link */}
              <div className="mt-4 pt-3 border-t border-[#FFD6E7]/50 flex items-center justify-between text-xs text-[#7A5374]">
                <span>
                  {count} {count === 1 ? 'memory' : 'memories'}
                </span>
                <span className="text-[#E07A9C] font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Create / Edit Album Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#FFF8F4] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#FFD6E7]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#FFD6E7]">
                <h3 className="font-serif font-bold text-xl text-[#54334F] flex items-center gap-2">
                  <FolderHeart className="w-5 h-5 text-[#E07A9C]" />
                  <span>{editingAlbum ? 'Edit Album' : 'Create New Album'}</span>
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-full hover:bg-white text-[#7A5374]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAlbum} className="space-y-4 mt-4">
                {/* Emoji Selector */}
                <div>
                  <label className="text-xs font-semibold text-[#54334F] block mb-1.5">
                    Choose an Emoji
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {emojisList.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setEmoji(em)}
                        className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                          emoji === em
                            ? 'bg-white border-2 border-[#E07A9C] shadow-xs scale-110'
                            : 'bg-white/60 hover:bg-white border border-[#FFD6E7]'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Album Name */}
                <div>
                  <label className="text-xs font-semibold text-[#54334F] block mb-1">
                    Album Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Our First Conversations, Paris 2026..."
                    className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none focus:ring-2 focus:ring-[#F5A9C8]"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-[#54334F] block mb-1">
                    Description / Story
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What makes this collection so special to us..."
                    className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none focus:ring-2 focus:ring-[#F5A9C8]"
                  />
                </div>

                {/* Cover Memory Selection (Optional) */}
                {memories.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-[#54334F] block mb-1">
                      Pick Cover Photo (Optional)
                    </label>
                    <div className="flex gap-2 overflow-x-auto py-1 max-h-24">
                      {memories.slice(0, 8).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setCoverUrl(m.downloadUrl)}
                          className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                            coverUrl === m.downloadUrl
                              ? 'border-[#E07A9C] scale-105'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={m.downloadUrl}
                            alt="thumb"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#7A5374] hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !name.trim()}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#54334F] text-white text-xs font-semibold shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingAlbum ? 'Update Album' : 'Create Album'}
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
