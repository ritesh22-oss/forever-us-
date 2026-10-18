import React, { useState, useRef } from 'react';
import { User } from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { collection, doc, setDoc } from 'firebase/firestore';
import { storage, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AlbumItem } from '../types';
import {
  X,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Image as ImageIcon,
  Video,
  FileText,
  Calendar,
  Tag,
  FolderHeart,
  Camera,
  Sparkles,
  Heart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  albums: AlbumItem[];
  onUploadSuccess: () => void;
  initialCaptureDate?: string;
}

interface UploadFileState {
  id: string;
  file: File;
  previewUrl: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
  caption: string;
  captureDate: string;
  selectedAlbumIds: string[];
  tags: string[];
  task?: UploadTask;
  downloadUrl?: string;
  storagePath?: string;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  user,
  albums,
  onUploadSuccess,
  initialCaptureDate,
}) => {
  const [fileList, setFileList] = useState<UploadFileState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [globalCaption, setGlobalCaption] = useState('');
  const [globalAlbumId, setGlobalAlbumId] = useState<string>('');
  const [globalCaptureDate, setGlobalCaptureDate] = useState<string>(
    initialCaptureDate || new Date().toISOString().split('T')[0]
  );
  const [attachToLoveRope, setAttachToLoveRope] = useState<boolean>(true);
  const [isCompletedAll, setIsCompletedAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const determineMediaType = (file: File): 'image' | 'video' | 'audio' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: UploadFileState[] = Array.from(files).map((file) => {
      const mediaType = determineMediaType(file);
      const previewUrl = mediaType === 'image' || mediaType === 'video'
        ? URL.createObjectURL(file)
        : '';

      // Try reading lastModified date as capture date
      const fileDate = file.lastModified
        ? new Date(file.lastModified).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      return {
        id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        file,
        previewUrl,
        mediaType,
        progress: 0,
        status: 'pending',
        caption: '',
        captureDate: initialCaptureDate || globalCaptureDate || fileDate,
        selectedAlbumIds: globalAlbumId ? [globalAlbumId] : [],
        tags: [],
      };
    });

    setFileList((prev) => [...prev, ...newItems]);
    setIsCompletedAll(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesAdded(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFileList((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.task && target.status === 'uploading') {
        target.task.cancel();
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  // Upload single file to Firebase Cloud Storage and save metadata in Firestore
  const uploadSingleFile = async (item: UploadFileState): Promise<boolean> => {
    // Sanitize filename
    const cleanFileName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `couples/forever-us/memories/${item.id}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    // Update status to uploading
    setFileList((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading', progress: 5 } : f))
    );

    const uploadTask = uploadBytesResumable(storageRef, item.file, {
      contentType: item.file.type || 'application/octet-stream',
      customMetadata: {
        uploaderUid: user.uid,
        originalName: item.file.name,
      },
    });

    // Store task for cancellation / tracking
    setFileList((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, task: uploadTask } : f))
    );

    return new Promise((resolve) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progressPercent = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setFileList((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, progress: Math.max(5, progressPercent) } : f))
          );
        },
        (error) => {
          console.error("Storage upload failed for", item.file.name, error);
          setFileList((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? { ...f, status: 'error', errorMessage: error.message || 'Upload failed' }
                : f
            )
          );
          resolve(false);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

            // Save Memory Metadata to Cloud Firestore
            const memoryDocRef = doc(db, 'memories', item.id);
            const memoryData = {
              memoryId: item.id,
              storagePath,
              downloadUrl,
              filename: item.file.name,
              mediaType: item.mediaType,
              fileSize: item.file.size,
              uploadedAt: new Date().toISOString(),
              captureDate: item.captureDate || globalCaptureDate || new Date().toISOString().split('T')[0],
              timelineDate: item.captureDate || globalCaptureDate || new Date().toISOString().split('T')[0],
              onLoveRope: attachToLoveRope,
              caption: (item.caption || globalCaption).trim().substring(0, 500),
              description: '',
              albumIds: item.selectedAlbumIds.length > 0
                ? item.selectedAlbumIds
                : (globalAlbumId ? [globalAlbumId] : []),
              tags: item.tags || [],
              isFavorite: false,
              uploaderUid: user.uid,
              uploaderEmail: user.email || '',
              thumbnailUrl: downloadUrl,
              isDeleted: false,
            };

            await setDoc(memoryDocRef, memoryData);

            setFileList((prev) =>
              prev.map((f) =>
                f.id === item.id
                  ? {
                      ...f,
                      status: 'completed',
                      progress: 100,
                      downloadUrl,
                      storagePath,
                    }
                  : f
              )
            );
            resolve(true);
          } catch (firestoreErr) {
            console.error("Failed saving metadata in Firestore:", firestoreErr);
            setFileList((prev) =>
              prev.map((f) =>
                f.id === item.id
                  ? {
                      ...f,
                      status: 'error',
                      errorMessage: "Media stored in cloud, but failed to record metadata.",
                    }
                  : f
              )
            );
            resolve(false);
          }
        }
      );
    });
  };

  // Start uploading all pending or errored items
  const handleStartUpload = async () => {
    const queue = fileList.filter((f) => f.status === 'pending' || f.status === 'error');
    if (queue.length === 0) return;

    let allOk = true;
    for (const item of queue) {
      const success = await uploadSingleFile(item);
      if (!success) allOk = false;
    }

    if (allOk) {
      setIsCompletedAll(true);
      onUploadSuccess();
    }
  };

  const handleRetry = (item: UploadFileState) => {
    uploadSingleFile(item);
  };

  const hasUploading = fileList.some((f) => f.status === 'uploading');
  const allFinished = fileList.length > 0 && fileList.every((f) => f.status === 'completed');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-[#FFF8F4] rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#FFD6E7] relative max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#FFD6E7]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FFD6E7] flex items-center justify-center text-[#54334F]">
              <UploadCloud className="w-5 h-5 text-[#E07A9C]" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold text-[#54334F]">
                Add Precious Memories
              </h3>
              <p className="text-xs text-[#7A5374]">
                Saved permanently in our private cloud vault
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={hasUploading}
            className="w-8 h-8 rounded-full hover:bg-white/70 flex items-center justify-center text-[#7A5374] hover:text-[#54334F] transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5">
          {/* Success Banner if All Completed */}
          {allFinished && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-gradient-to-r from-[#FFD6E7]/80 to-[#E9DDFB]/80 border border-[#F5A9C8] flex items-center gap-3 text-sm text-[#54334F]"
            >
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold">All memories safely stored forever! 💗</p>
                <p className="text-xs text-[#7A5374] mt-0.5">
                  Your files are securely stored in Firebase Cloud Storage. Even if deleted from your phone gallery, they remain protected here.
                </p>
              </div>
            </motion.div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all ${
              isDragging
                ? 'border-[#E07A9C] bg-[#FFD6E7]/40 scale-[0.99]'
                : 'border-[#F5A9C8]/70 hover:border-[#E07A9C] bg-white/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf"
              className="hidden"
              onChange={(e) => handleFilesAdded(e.target.files)}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*,video/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFilesAdded(e.target.files)}
            />

            <div className="w-14 h-14 mx-auto rounded-full bg-[#FFD6E7]/60 flex items-center justify-center mb-3">
              <Heart className="w-7 h-7 text-[#E07A9C] fill-[#E07A9C]/20 animate-gentle-pulse" />
            </div>

            <h4 className="text-base font-semibold text-[#54334F]">
              Drag & Drop your photos or videos here
            </h4>
            <p className="text-xs text-[#7A5374] mt-1 max-w-sm mx-auto">
              Supports JPEG, PNG, WebP, HEIC, MP4, MOV, Audio notes. Upload multiple files simultaneously.
            </p>

            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-white text-[#54334F] text-xs font-semibold shadow-xs hover:shadow-md border border-[#F5A9C8] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#E07A9C]" />
                <span>Browse Files</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F5A9C8] to-[#FFD6E7] text-[#54334F] text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-[#54334F]" />
                <span>Take Photo / Video</span>
              </button>
            </div>
          </div>

          {/* Optional Shared Album / Caption Configuration */}
          {fileList.length > 0 && !allFinished && (
            <div className="bg-white/70 rounded-2xl p-4 border border-[#FFD6E7] space-y-3">
              <span className="text-xs font-semibold text-[#54334F] block">
                Assign Album & Note (Applies to all new files)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#7A5374] block mb-1">
                    Select Album / Folder
                  </label>
                  <select
                    value={globalAlbumId}
                    onChange={(e) => setGlobalAlbumId(e.target.value)}
                    className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none focus:ring-2 focus:ring-[#F5A9C8]"
                  >
                    <option value="">No specific album (All Memories)</option>
                    {albums.map((album) => (
                      <option key={album.albumId} value={album.albumId}>
                        {album.emoji || '📁'} {album.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#7A5374] block mb-1">
                    Default Memory Caption
                  </label>
                  <input
                    type="text"
                    value={globalCaption}
                    onChange={(e) => setGlobalCaption(e.target.value)}
                    placeholder="e.g. Our magical sunset walk in Kyoto 🌅"
                    className="w-full text-xs rounded-xl bg-white border border-[#FFD6E7] p-2.5 text-[#54334F] focus:outline-none focus:ring-2 focus:ring-[#F5A9C8]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Selected Files List with Live Progress */}
          {fileList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#7A5374]">
                <span>
                  {fileList.length} memory file{fileList.length === 1 ? '' : 's'} queued
                </span>
                <span>
                  {fileList.filter((f) => f.status === 'completed').length} uploaded
                </span>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {fileList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-2xl border border-[#FFD6E7] flex items-center gap-3 shadow-2xs"
                  >
                    {/* Media Thumbnail */}
                    <div className="w-12 h-12 rounded-xl bg-[#FFF0F5] overflow-hidden shrink-0 flex items-center justify-center border border-[#FFD6E7]">
                      {item.previewUrl ? (
                        item.mediaType === 'video' ? (
                          <div className="relative w-full h-full">
                            <video src={item.previewUrl} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Video className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <img
                            src={item.previewUrl}
                            alt="preview"
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <FileText className="w-5 h-5 text-[#E07A9C]" />
                      )}
                    </div>

                    {/* Metadata & Progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#54334F] truncate pr-2">
                          {item.file.name}
                        </p>
                        <span className="text-[10px] text-[#7A5374] shrink-0">
                          {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-[#FFF0F5] rounded-full overflow-hidden mt-1.5">
                        <div
                          className={`h-full transition-all duration-200 ${
                            item.status === 'error'
                              ? 'bg-rose-500'
                              : item.status === 'completed'
                              ? 'bg-emerald-500'
                              : 'bg-gradient-to-r from-[#F5A9C8] to-[#E07A9C]'
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#7A5374] mt-1">
                        <span>
                          {item.status === 'completed' && '✓ Safely Stored'}
                          {item.status === 'uploading' && `Uploading... ${item.progress}%`}
                          {item.status === 'pending' && 'Ready for cloud storage'}
                          {item.status === 'error' && (item.errorMessage || 'Failed')}
                        </span>
                        {item.status === 'error' && (
                          <button
                            onClick={() => handleRetry(item)}
                            className="text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" /> Retry
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Remove button if not uploading */}
                    {item.status !== 'uploading' && (
                      <button
                        onClick={() => removeFile(item.id)}
                        className="text-[#7A5374]/50 hover:text-rose-500 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#FFD6E7]/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#7A5374] hover:bg-white/60 transition-colors cursor-pointer"
          >
            {allFinished ? 'Done' : 'Cancel'}
          </button>

          <div className="flex items-center gap-2">
            {!allFinished && fileList.length > 0 && (
              <button
                type="button"
                onClick={handleStartUpload}
                disabled={hasUploading || fileList.every((f) => f.status === 'completed')}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F5A9C8] via-[#E07A9C] to-[#54334F] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{hasUploading ? 'Uploading to Cloud...' : 'Save Memories to Cloud'}</span>
              </button>
            )}

            {allFinished && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-md hover:bg-emerald-700 transition-all cursor-pointer"
              >
                Close & View Gallery
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
