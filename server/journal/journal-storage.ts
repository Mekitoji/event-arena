import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { promisify } from 'node:util';
import { EventJournal, JournalMetadata } from './event-journal';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

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
interface JournalIndexEntry {
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

/**
 * JournalStorage handles persisting and loading event journals
 */
export class JournalStorage {
  private readonly config: Required<StorageConfig>;
  private indexCache: Map<string, JournalIndexEntry> = new Map();

  constructor(config: StorageConfig) {
    this.config = {
      baseDir: config.baseDir,
      compress: config.compress ?? true,
      maxFileSize: config.maxFileSize ?? 50 * 1024 * 1024, // 50MB
      createIndex: config.createIndex ?? true
    };
  }

  /**
   * Initialize storage (create directories if needed)
   */
  async init(): Promise<void> {
    await fs.mkdir(this.config.baseDir, { recursive: true });

    // Create subdirectories for organization
    await fs.mkdir(path.join(this.config.baseDir, 'matches'), { recursive: true });
    await fs.mkdir(path.join(this.config.baseDir, 'sessions'), { recursive: true });

    // Load the index if it exists
    if (this.config.createIndex) {
      await this.loadIndex();
    }
  }

  /**
   * Save a journal to disk
   */
  async save(journal: EventJournal): Promise<string> {
    const metadata = journal.getMetadata();
    const subdir = metadata.matchId ? 'matches' : 'sessions';
    const filename = this.generateFilename(metadata);
    const filePath = path.join(this.config.baseDir, subdir, filename);

    // Convert journal to JSON
    const data = journal.toJSON();
    const jsonStr = JSON.stringify(data, null, 2);

    // Compress if enabled
    let finalData: Buffer | string = jsonStr;
    if (this.config.compress) {
      finalData = await gzip(jsonStr);
    }

    // Write to file
    await fs.writeFile(filePath, finalData);

    // Update index
    if (this.config.createIndex) {
      await this.updateIndex(metadata, filePath, finalData);
    }

    console.log(`[JournalStorage] Saved journal ${metadata.id} to ${filePath}`);
    return filePath;
  }

  /**
   * Load a journal from disk by ID
   */
  async load(journalId: string): Promise<EventJournal | null> {
    // Check index first
    const indexEntry = this.indexCache.get(journalId);
    if (indexEntry) {
      return this.loadFromPath(indexEntry.filePath, indexEntry.compressed);
    }

    // Fall back to searching the filesystem
    const matchPath = await this.findJournalFile(journalId, 'matches');
    if (matchPath) {
      return this.loadFromPath(matchPath, this.config.compress);
    }

    const sessionPath = await this.findJournalFile(journalId, 'sessions');
    if (sessionPath) {
      return this.loadFromPath(sessionPath, this.config.compress);
    }

    return null;
  }

  /**
   * Load a journal from a specific file path
   */
  private async loadFromPath(filePath: string, compressed: boolean): Promise<EventJournal> {
    const data = await fs.readFile(filePath);

    let jsonStr: string;
    if (compressed) {
      const uncompressed = await gunzip(data);
      jsonStr = uncompressed.toString('utf-8');
    } else {
      jsonStr = data.toString('utf-8');
    }

    const parsed = JSON.parse(jsonStr);

    // Convert date strings back to Date objects
    parsed.metadata.createdAt = new Date(parsed.metadata.createdAt);

    return EventJournal.fromJSON(parsed);
  }

  /**
   * Stream save for large journals (saves incrementally)
   */
  async streamSave(journal: EventJournal, batchSize: number = 1000): Promise<string> {
    const metadata = journal.getMetadata();
    const subdir = metadata.matchId ? 'matches' : 'sessions';
    const filename = this.generateFilename(metadata);
    const filePath = path.join(this.config.baseDir, subdir, filename);

    const entries = journal.getEntries();
    const chunks: Buffer[] = [];

    // Write metadata header
    const header = JSON.stringify({
      metadata,
      entriesStart: true
    }) + '\n';
    chunks.push(Buffer.from(header));

    // Write entries in batches
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, Math.min(i + batchSize, entries.length));
      const batchJson = JSON.stringify(batch) + '\n';
      chunks.push(Buffer.from(batchJson));
    }

    // Combine and potentially compress
    let finalData: Buffer = Buffer.concat(chunks);
    if (this.config.compress) {
      finalData = await gzip(finalData) as Buffer;
    }

    await fs.writeFile(filePath, finalData);

    if (this.config.createIndex) {
      await this.updateIndex(metadata, filePath, finalData);
    }

    return filePath;
  }

  /**
   * List all available journals
   */
  async list(filter?: { matchId?: string; playerIds?: string[] }): Promise<JournalIndexEntry[]> {
    if (this.config.createIndex) {
      let entries = Array.from(this.indexCache.values());

      if (filter) {
        if (filter.matchId) {
          entries = entries.filter(e => e.matchId === filter.matchId);
        }
        if (filter.playerIds && filter.playerIds.length > 0) {
          entries = entries.filter(e =>
            filter.playerIds!.some(pid => e.playerIds.includes(pid))
          );
        }
      }

      return entries;
    }

    // Fall back to filesystem scan (live listing)
    const allFiles: JournalIndexEntry[] = [];
    
    for (const subdir of ['matches', 'sessions']) {
      const dirPath = path.join(this.config.baseDir, subdir);
      try {
        const files = await fs.readdir(dirPath);
        for (const file of files) {
          if (file.endsWith('.json') || file.endsWith('.json.gz')) {
            const filePath = path.join(dirPath, file);
            const stat = await fs.stat(filePath);
            const compressed = file.endsWith('.gz');
            
            // Extract full journal ID from filename (everything before the timestamp suffix)
            // Format: {id}_{ISO-timestamp}.json[.gz]
            // The ID itself may contain underscores (e.g., match_123_timestamp or session_timestamp_hash)
            const nameWithoutExt = file.replace(/\.(json|json\.gz)$/, '');
            // The timestamp is the last part after the final underscore that looks like a date
            const parts = nameWithoutExt.split('_');
            // Remove the ISO timestamp part (last segment that starts with a date pattern)
            const timestampIndex = parts.findIndex(p => /^\d{4}-\d{2}-\d{2}/.test(p));
            const id = timestampIndex > 0 ? parts.slice(0, timestampIndex).join('_') : nameWithoutExt;
            
            // Default entry
            let entry: JournalIndexEntry = {
              id,
              filePath,
              compressed,
              fileSize: stat.size,
              createdAt: stat.birthtime.toISOString(),
              duration: 0,
              eventCount: 0,
              playerIds: []
            };

            // Try to read metadata from file for accurate info
            try {
              const data = await fs.readFile(filePath);
              const jsonStr = compressed ? (await gunzip(data)).toString('utf-8') : data.toString('utf-8');
              const parsed = JSON.parse(jsonStr);
              if (parsed && parsed.metadata) {
                const md = parsed.metadata as JournalMetadata & { createdAt: string };
                entry = {
                  id: md.id, // Use the actual ID from metadata
                  filePath,
                  compressed,
                  fileSize: stat.size,
                  matchId: md.matchId,
                  createdAt: new Date(md.createdAt).toISOString(),
                  duration: md.duration ?? 0,
                  eventCount: md.eventCount ?? 0,
                  playerIds: Array.isArray(md.playerIds) ? md.playerIds : [],
                };
              }
            } catch {
              // If parsing fails, keep default entry (still useful)
            }

            allFiles.push(entry);
          }
        }
      } catch {
        // Directory might not exist
      }
    }

    return allFiles;
  }

  /**
   * Delete a journal
   */
  async delete(journalId: string): Promise<boolean> {
    const indexEntry = this.indexCache.get(journalId);
    if (indexEntry) {
      await fs.unlink(indexEntry.filePath);
      this.indexCache.delete(journalId);
      await this.saveIndex();
      return true;
    }

    // Fall back to searching
    const matchPath = await this.findJournalFile(journalId, 'matches');
    if (matchPath) {
      await fs.unlink(matchPath);
      return true;
    }

    const sessionPath = await this.findJournalFile(journalId, 'sessions');
    if (sessionPath) {
      await fs.unlink(sessionPath);
      return true;
    }

    return false;
  }

  /**
   * Clean up old journals based on age or count
   */
  async cleanup(options: { maxAge?: number; maxCount?: number }): Promise<number> {
    const entries = await this.list();
    entries.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    let deleted = 0;
    const now = Date.now();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const age = now - new Date(entry.createdAt).getTime();

      let shouldDelete = false;

      if (options.maxAge && age > options.maxAge) {
        shouldDelete = true;
      }

      if (options.maxCount && i >= options.maxCount) {
        shouldDelete = true;
      }

      if (shouldDelete) {
        await this.delete(entry.id);
        deleted++;
      }
    }

    console.log(`[JournalStorage] Cleaned up ${deleted} old journals`);
    return deleted;
  }

  /**
   * Generate a filename for a journal
   */
  private generateFilename(metadata: JournalMetadata): string {
    const timestamp = metadata.createdAt.toISOString().replace(/[:.]/g, '-');
    const base = `${metadata.id}_${timestamp}`;
    return this.config.compress ? `${base}.json.gz` : `${base}.json`;
  }

  /**
   * Find a journal file by ID
   */
  private async findJournalFile(journalId: string, subdir: string): Promise<string | null> {
    const dirPath = path.join(this.config.baseDir, subdir);
    try {
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        if (file.startsWith(journalId)) {
          return path.join(dirPath, file);
        }
      }
    } catch {
      // Directory might not exist
    }
    return null;
  }

  /**
   * Load the index file
   */
  private async loadIndex(): Promise<void> {
    const indexPath = path.join(this.config.baseDir, 'index.json');
    try {
      const data = await fs.readFile(indexPath, 'utf-8');
      const entries = JSON.parse(data) as JournalIndexEntry[];
      this.indexCache.clear();
      entries.forEach(entry => this.indexCache.set(entry.id, entry));
    } catch {
      // Index doesn't exist yet
    }
  }

  /**
   * Save the index file
   */
  private async saveIndex(): Promise<void> {
    const indexPath = path.join(this.config.baseDir, 'index.json');
    const entries = Array.from(this.indexCache.values());
    await fs.writeFile(indexPath, JSON.stringify(entries, null, 2));
  }

  /**
   * Update the index with a new entry
   */
  private async updateIndex(
    metadata: JournalMetadata,
    filePath: string,
    data: Buffer | string
  ): Promise<void> {
    const entry: JournalIndexEntry = {
      id: metadata.id,
      matchId: metadata.matchId,
      createdAt: metadata.createdAt.toISOString(),
      duration: metadata.duration,
      eventCount: metadata.eventCount,
      playerIds: metadata.playerIds,
      filePath,
      compressed: this.config.compress,
      fileSize: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data)
    };

    this.indexCache.set(metadata.id, entry);
    await this.saveIndex();
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalJournals: number;
    totalSize: number;
    oldestJournal?: Date;
    newestJournal?: Date;
    averageEventCount: number;
  }> {
    const entries = await this.list();

    if (entries.length === 0) {
      return {
        totalJournals: 0,
        totalSize: 0,
        averageEventCount: 0
      };
    }

    const totalSize = entries.reduce((sum, e) => sum + e.fileSize, 0);
    const dates = entries.map(e => new Date(e.createdAt)).sort((a, b) => a.getTime() - b.getTime());
    const avgEvents = entries.reduce((sum, e) => sum + e.eventCount, 0) / entries.length;

    return {
      totalJournals: entries.length,
      totalSize,
      oldestJournal: dates[0],
      newestJournal: dates[dates.length - 1],
      averageEventCount: Math.round(avgEvents)
    };
  }
}
