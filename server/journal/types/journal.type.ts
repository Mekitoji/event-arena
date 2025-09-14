import { SourceEvents, SourceEventType } from '../../core/types/events.type';

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
