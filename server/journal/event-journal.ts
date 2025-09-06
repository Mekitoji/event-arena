import { SourceEvents, SourceEventType } from '../core/types/events.type';

/**
 * Represents a single journal entry with timing and event data
 */
export interface JournalEntry {
  /** Unique sequential ID for this entry */
  id: number;
  /** Timestamp when the event was recorded (ms since epoch) */
  timestamp: number;
  /** Game time when the event occurred (ms since match start) */
  gameTime: number;
  /** The event type for quick filtering */
  eventType: SourceEventType;
  /** The complete event data */
  event: SourceEvents;
  /** Optional metadata for indexing */
  metadata?: {
    playerId?: string;
    matchId?: string;
    [key: string]: unknown;
  };
}

/**
 * Journal metadata for a complete session
 */
export interface JournalMetadata {
  /** Unique ID for this journal */
  id: string;
  /** When the journal was created */
  createdAt: Date;
  /** Match ID if applicable */
  matchId?: string;
  /** Duration of the recorded session in ms */
  duration: number;
  /** Number of events recorded */
  eventCount: number;
  /** List of unique player IDs in this journal */
  playerIds: string[];
  /** Map of event type to count */
  eventTypeCounts: Record<SourceEventType, number>;
  /** Version for compatibility */
  version: string;
}

/**
 * Options for creating a new journal
 */
export interface JournalOptions {
  /** Maximum events before auto-flush to storage */
  maxBufferSize?: number;
  /** Enable compression for storage */
  enableCompression?: boolean;
  /** Match ID to associate with this journal */
  matchId?: string;
}

/**
 * EventJournal handles recording and managing game events for replay
 */
export class EventJournal {
  private entries: JournalEntry[] = [];
  private currentId = 0;
  private startTime: number;
  private metadata: JournalMetadata;
  private playerSet = new Set<string>();
  private eventCounts: Map<SourceEventType, number> = new Map();
  private readonly options: Required<JournalOptions>;

  constructor(journalId: string, options: JournalOptions = {}) {
    this.startTime = Date.now();
    this.options = {
      maxBufferSize: options.maxBufferSize ?? 10000,
      enableCompression: options.enableCompression ?? true,
      matchId: options.matchId as string | undefined
    } as Required<JournalOptions>;

    this.metadata = {
      id: journalId,
      createdAt: new Date(this.startTime),
      matchId: this.options.matchId,
      duration: 0,
      eventCount: 0,
      playerIds: [],
      eventTypeCounts: {} as Record<SourceEventType, number>,
      version: '1.0.0'
    };
  }

  /**
   * Record a new event to the journal
   */
  record(event: SourceEvents): JournalEntry {
    const timestamp = Date.now();
    const gameTime = timestamp - this.startTime;

    const entry: JournalEntry = {
      id: this.currentId++,
      timestamp,
      gameTime,
      eventType: event.type,
      event,
      metadata: this.extractMetadata(event)
    };

    this.entries.push(entry);
    this.updateStats(event, entry);

    // Check if we need to flush
    if (this.entries.length >= this.options.maxBufferSize) {
      this.flushToStorage();
    }

    return entry;
  }

  /**
   * Extract metadata from event for indexing
   */
  private extractMetadata(event: SourceEvents): JournalEntry['metadata'] {
    const metadata: JournalEntry['metadata'] = {};

    // Extract player IDs based on event type
    switch (event.type) {
      case 'player:join':
      case 'player:move':
      case 'player:aimed':
      case 'player:die':
      case 'player:leave':
      case 'buff:applied':
      case 'buff:expired':
      case 'dash:started':
      case 'dash:ended':
      case 'cmd:move':
      case 'cmd:cast':
      case 'cmd:leave':
      case 'cmd:aim':
      case 'cmd:respawn':
        metadata.playerId = event.playerId;
        break;
      case 'player:kill':
        metadata.playerId = event.killerId;
        metadata.victimId = event.victimId;
        metadata.assistIds = event.assistIds;
        break;
      case 'damage:applied':
      case 'knockback:applied':
        metadata.playerId = event.targetId;
        metadata.source = event.source;
        break;
      case 'projectile:spawned':
        metadata.playerId = event.ownerId;
        break;
      case 'pickup:collected':
        metadata.playerId = event.by;
        break;
      case 'score:update':
        metadata.playerId = event.playerId;
        break;
    }

    // Add match ID if available
    if (this.options.matchId) {
      metadata.matchId = this.options.matchId;
    }

    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }

  /**
   * Update internal statistics
   */
  private updateStats(event: SourceEvents, entry: JournalEntry): void {
    // Update event counts
    const count = this.eventCounts.get(event.type) || 0;
    this.eventCounts.set(event.type, count + 1);

    // Track unique players
    if (entry.metadata?.playerId) {
      this.playerSet.add(entry.metadata.playerId);
    }
    if (entry.metadata?.victimId) {
      this.playerSet.add(entry.metadata.victimId as string);
    }
    if (entry.metadata?.assistIds) {
      (entry.metadata.assistIds as string[]).forEach(id => this.playerSet.add(id));
    }

    // Update metadata
    this.metadata.eventCount = this.entries.length;
    this.metadata.duration = Date.now() - this.startTime;
    this.metadata.playerIds = Array.from(this.playerSet);
    this.metadata.eventTypeCounts = Object.fromEntries(this.eventCounts) as Record<SourceEventType, number>;
  }

  /**
   * Get all entries in the journal
   */
  getEntries(): readonly JournalEntry[] {
    return this.entries;
  }

  /**
   * Get entries filtered by event type
   */
  getEntriesByType(eventType: SourceEventType): JournalEntry[] {
    return this.entries.filter(entry => entry.eventType === eventType);
  }

  /**
   * Get entries for a specific player
   */
  getEntriesByPlayer(playerId: string): JournalEntry[] {
    return this.entries.filter(entry =>
      entry.metadata?.playerId === playerId ||
      entry.metadata?.victimId === playerId ||
      (entry.metadata?.assistIds as string[])?.includes(playerId)
    );
  }

  /**
   * Get entries within a time range (game time)
   */
  getEntriesByTimeRange(startTime: number, endTime: number): JournalEntry[] {
    return this.entries.filter(entry =>
      entry.gameTime >= startTime && entry.gameTime <= endTime
    );
  }

  /**
   * Get the current metadata
   */
  getMetadata(): Readonly<JournalMetadata> {
    return { ...this.metadata };
  }

  /**
   * Clear all entries (useful for testing)
   */
  clear(): void {
    this.entries = [];
    this.currentId = 0;
    this.playerSet.clear();
    this.eventCounts.clear();
    this.startTime = Date.now();
    this.metadata.eventCount = 0;
    this.metadata.duration = 0;
    this.metadata.playerIds = [];
    this.metadata.eventTypeCounts = {} as Record<SourceEventType, number>;
  }

  /**
   * Flush entries to storage (to be implemented with storage backend)
   */
  private flushToStorage(): void {
    // This will be implemented when we add the storage backend
    console.log(`[Journal] Would flush ${this.entries.length} entries to storage`);
  }

  /**
   * Export journal as JSON
   */
  toJSON(): { metadata: JournalMetadata; entries: JournalEntry[] } {
    return {
      metadata: this.getMetadata(),
      entries: [...this.entries]
    };
  }

  /**
   * Create a journal from JSON data
   */
  static fromJSON(data: { metadata: JournalMetadata; entries: JournalEntry[] }): EventJournal {
    const journal = new EventJournal(data.metadata.id, {
      matchId: data.metadata.matchId
    });

    // Restore the internal state
    journal.entries = [...data.entries];
    journal.currentId = data.entries.length > 0
      ? Math.max(...data.entries.map(e => e.id)) + 1
      : 0;
    journal.metadata = { ...data.metadata };
    journal.startTime = data.metadata.createdAt.getTime();

    // Rebuild player set and event counts
    data.entries.forEach(entry => {
      if (entry.metadata?.playerId) {
        journal.playerSet.add(entry.metadata.playerId);
      }
      const count = journal.eventCounts.get(entry.eventType) || 0;
      journal.eventCounts.set(entry.eventType, count + 1);
    });

    return journal;
  }
}
