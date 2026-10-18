export interface CoupleSettings {
  coupleId: string;
  partner1Name: string;
  partner2Name: string;
  partner1Photo?: string;
  partner2Photo?: string;
  anniversaryDate: string; // YYYY-MM-DD
  relationshipStartDate: string; // YYYY-MM-DD
  theme: 'blush' | 'lavender' | 'cream' | 'midnight';
  quoteSelection?: string;
  reducedMotion: boolean;
  musicEnabled: boolean;
  authorizedEmails: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface MemoryItem {
  id: string; // Firestore document ID
  memoryId: string;
  storagePath: string;
  downloadUrl: string;
  filename: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  fileSize: number;
  uploadedAt: string; // ISO string
  captureDate?: string;
  caption?: string;
  description?: string;
  albumIds?: string[];
  tags?: string[];
  isFavorite: boolean;
  uploaderUid: string;
  uploaderEmail?: string;
  thumbnailUrl?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  locationName?: string;
  onLoveRope?: boolean;
  timelineDate?: string;
  frameStyle?: 'polaroid' | 'charm' | 'heart' | 'ribbon';
  captureTime?: string;
}

export interface LoveRopeMilestoneNode {
  nodeId: string;
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. 10 JULY 2026
  label: string;
  isStartingPoint?: boolean;
  memories: MemoryItem[];
  letters?: LoveLetterItem[];
  timelineEvents?: TimelineEventItem[];
  isMilestone?: boolean;
  icon?: string;
  frameStyle?: string;
}

export interface AlbumItem {
  id: string;
  albumId: string;
  name: string;
  description?: string;
  emoji?: string;
  coverUrl?: string;
  color?: string;
  createdAt: string;
  updatedAt?: string;
  creatorUid: string;
  isDeleted?: boolean;
}

export interface LoveLetterItem {
  id: string;
  letterId: string;
  title: string;
  content: string;
  fontStyle?: 'handwriting' | 'serif' | 'sans';
  tags?: string[];
  emoji?: string;
  photos?: string[];
  isFavorite?: boolean;
  unlockDate?: string; // ISO string or YYYY-MM-DD
  isLockedUntilDate?: boolean;
  category: 'letter' | 'journal' | 'miss_me' | 'future' | 'poem';
  createdAt: string;
  updatedAt?: string;
  authorUid: string;
  authorName?: string;
}

export interface TimelineEventItem {
  id: string;
  eventId: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  description?: string;
  icon?: string;
  category?: string;
  mediaIds?: string[];
  isMilestone?: boolean;
  createdAt: string;
  creatorUid: string;
}

export interface BucketListItem {
  id: string;
  itemId: string;
  title: string;
  notes?: string;
  category?: string;
  completed: boolean;
  completedDate?: string;
  createdAt: string;
  creatorUid: string;
}

export interface ReasonLoveItem {
  id: string;
  reasonId: string;
  text: string;
  authorName?: string;
  createdAt: string;
  heartColor?: string;
  creatorUid: string;
}

export interface GateStatusResponse {
  unlocked: boolean;
  locked: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
  lockoutMessage?: string;
}
