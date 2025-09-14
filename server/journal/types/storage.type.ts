/**
 * Storage configuration for journals
 */
export interface StorageConfig {
  /** Base directory for storing journals */
  baseDir: string;
  /** Whether to compress journal files */
  compress?: boolean;
  /** Maximum file size in bytes before splitting (default: 50MB) */
  maxFileSize?: number;
  /** Whether to create an index file for quick lookups */
  createIndex?: boolean;
}

/**
 * Journal index entry for quick lookups
 */
export interface JournalIndexEntry {
  id: string;
  matchId?: string;
  createdAt: string;
  duration: number;
  eventCount: number;
  playerIds: string[];
  filePath: string;
  compressed: boolean;
  fileSize: number;
}
