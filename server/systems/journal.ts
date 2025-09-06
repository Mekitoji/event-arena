import { eventBus } from '../core/event-bus';
import { EventJournal } from '../journal/event-journal';
import { JournalStorage } from '../journal/journal-storage';
import { SourceEvents, SourceEventType, TMatchCreatedEvent, TMatchEndedEvent } from '../core/types/events.type';
import * as crypto from 'node:crypto';
import * as path from 'node:path';

/**
 * Journal system configuration
 */
interface JournalSystemConfig {
  /** Enable journal recording */
  enabled?: boolean;
  /** Directory for storing journals */
  storageDir?: string;
  /** Auto-save interval in ms (0 to disable) */
  autoSaveInterval?: number;
  /** Events to exclude from recording */
  excludeEvents?: SourceEventType[];
  /** Maximum journal size before rotation */
  maxJournalSize?: number;
  /** Keep last N journals */
  keepJournals?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * JournalSystem manages event recording and journal lifecycle
 */
class JournalSystem {
  private config: Required<JournalSystemConfig>;
  private currentJournal: EventJournal | null = null;
  private storage: JournalStorage;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private currentMatchId: string | null = null;
  private isRecording = false;
  private eventCounter = 0;
  private startTime = 0;

  constructor(config: JournalSystemConfig = {}) {
    // Resolve default journals directory with env overrides
    const artifactsDir = process.env.EVENT_ARENA_ARTIFACTS_DIR
      ? path.resolve(process.env.EVENT_ARENA_ARTIFACTS_DIR)
      : path.join(process.cwd(), 'artifacts');
    const envJournalsDir = process.env.JOURNALS_DIR
      ? path.resolve(process.env.JOURNALS_DIR)
      : path.join(artifactsDir, 'journals');

    this.config = {
      enabled: config.enabled ?? true,
      // Priority: explicit option > JOURNALS_DIR > EVENT_ARENA_ARTIFACTS_DIR/journals > cwd/journals (legacy)
      storageDir: config.storageDir ?? envJournalsDir ?? path.join(process.cwd(), 'journals'),
      autoSaveInterval: config.autoSaveInterval ?? 30000, // 30 seconds
      excludeEvents: config.excludeEvents ?? ['tick:pre', 'tick:post'], // Exclude tick events by default
      maxJournalSize: config.maxJournalSize ?? 100000, // 100k events
      keepJournals: config.keepJournals ?? 50,
      debug: config.debug ?? false
    };

    this.storage = new JournalStorage({
      baseDir: this.config.storageDir,
      compress: true,
      createIndex: true
    });

    if (this.config.enabled) {
      this.init();
    }
  }

  /**
   * Initialize the journal system
   */
  private async init(): Promise<void> {
    // Initialize storage
    await this.storage.init();

    // Clean up old journals
    await this.storage.cleanup({
      maxCount: this.config.keepJournals
    });

    // Start recording for the current session
    this.startNewJournal();

    // Set up auto-save
    if (this.config.autoSaveInterval > 0) {
      this.autoSaveTimer = setInterval(() => {
        this.autoSave();
      }, this.config.autoSaveInterval);
    }

    // Hook into all events
    this.subscribeToEvents();

    console.log('[JournalSystem] Initialized and recording events');
  }

  /**
   * Subscribe to all game events
   */
  private subscribeToEvents(): void {
    // Create a generic event handler
    const recordEvent = (event: SourceEvents) => {
      if (this.shouldRecordEvent(event)) {
        this.recordEvent(event);
      }
    };

    // List of all event types to subscribe to
    const eventTypes: SourceEventType[] = [
      // Player events
      'player:join', 'player:move', 'player:aimed', 'player:die', 'player:leave', 'player:kill',
      // Projectile events
      'projectile:spawned', 'projectile:moved', 'projectile:despawned', 'projectile:bounced',
      // Pickup events
      'pickup:spawned', 'pickup:collected',
      // Buff events
      'buff:applied', 'buff:expired',
      // Damage events
      'damage:applied',
      // Explosion events
      'explosion:spawned',
      // Knockback events
      'knockback:applied',
      // Dash events
      'dash:started', 'dash:ended',
      // Session events
      'session:started',
      // Map events
      'map:loaded',
      // Match events
      'match:created', 'match:started', 'match:ended',
      // Score events
      'score:update',
      // Feed and streak events
      'feed:entry', 'streak:changed',
      // Command events
      'cmd:move', 'cmd:cast', 'cmd:leave', 'cmd:aim', 'cmd:respawn',
      // HUD events (optional, might be verbose)
      'hud:scoreboard:update', 'hud:match:update', 'hud:feed:update',
      'hud:streaks:update', 'hud:announce:update',
      // Tick events (usually excluded)
      'tick:pre', 'tick:post'
    ];

    // Subscribe to each event type
    eventTypes.forEach(eventType => {
      if (!this.config.excludeEvents.includes(eventType)) {
        eventBus.on(eventType, recordEvent);
      }
    });

    // Special handling for match events
    eventBus.on('match:created', (event: TMatchCreatedEvent) => {
      this.handleMatchCreated(event);
    });

    eventBus.on('match:ended', (event: TMatchEndedEvent) => {
      this.handleMatchEnded(event);
    });
  }

  /**
   * Check if an event should be recorded
   */
  private shouldRecordEvent(event: SourceEvents): boolean {
    if (!this.isRecording) return false;
    if (this.config.excludeEvents.includes(event.type)) return false;
    return true;
  }

  /**
   * Record an event to the current journal
   */
  private recordEvent(event: SourceEvents): void {
    if (!this.currentJournal) return;

    try {
      this.currentJournal.record(event);
      this.eventCounter++;

      if (this.config.debug && this.eventCounter % 100 === 0) {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rate = this.eventCounter / elapsed;
        console.log(`[JournalSystem] Recorded ${this.eventCounter} events (${rate.toFixed(1)} events/sec)`);
      }

      // Check if we need to rotate the journal
      if (this.eventCounter >= this.config.maxJournalSize) {
        this.rotateJournal();
      }
    } catch (error) {
      console.error('[JournalSystem] Error recording event:', error);
    }
  }

  /**
   * Handle match created event
   */
  private handleMatchCreated(event: TMatchCreatedEvent): void {
    this.currentMatchId = event.id;

    // Start a new journal for this match
    this.startNewJournal(event.id);

    // Record the match creation event
    this.recordEvent(event as SourceEvents);
  }

  /**
   * Handle match ended event
   */
  private async handleMatchEnded(event: { type: 'match:ended'; id: string;[key: string]: unknown }): Promise<void> {
    // Record the match end event
    this.recordEvent(event as SourceEvents);

    // Save the current journal
    await this.saveCurrentJournal();

    // Start a new session journal
    this.currentMatchId = null;
    this.startNewJournal();
  }

  /**
   * Start a new journal
   */
  private startNewJournal(matchId?: string): void {
    // Save the previous journal if it exists
    if (this.currentJournal) {
      this.saveCurrentJournal();
    }

    // Generate a unique journal ID
    const journalId = this.generateJournalId(matchId);

    // Create new journal
    this.currentJournal = new EventJournal(journalId, {
      matchId: matchId || this.currentMatchId || undefined,
      maxBufferSize: 5000
    });

    this.isRecording = true;
    this.eventCounter = 0;
    this.startTime = Date.now();

    console.log(`[JournalSystem] Started new journal: ${journalId}`);
  }

  /**
   * Generate a unique journal ID
   */
  private generateJournalId(matchId?: string): string {
    const timestamp = new Date().toISOString().substring(0, 19).replace(/[:-]/g, '');
    const random = crypto.randomBytes(4).toString('hex');

    if (matchId) {
      return `match_${matchId}_${timestamp}`;
    } else {
      return `session_${timestamp}_${random}`;
    }
  }

  /**
   * Rotate to a new journal
   */
  private async rotateJournal(): Promise<void> {
    console.log('[JournalSystem] Rotating journal...');

    // Save current journal
    await this.saveCurrentJournal();

    // Start new journal
    this.startNewJournal(this.currentMatchId || undefined);
  }

  /**
   * Save the current journal to storage
   */
  private async saveCurrentJournal(): Promise<void> {
    if (!this.currentJournal) return;

    try {
      const metadata = this.currentJournal.getMetadata();
      console.log(`[JournalSystem] Saving journal ${metadata.id} (${metadata.eventCount} events)`);

      await this.storage.save(this.currentJournal);

      console.log(`[JournalSystem] Journal saved successfully`);
    } catch (error) {
      console.error('[JournalSystem] Error saving journal:', error);
    }
  }

  /**
   * Auto-save the current journal
   */
  private async autoSave(): Promise<void> {
    if (!this.currentJournal || this.eventCounter === 0) return;

    if (this.config.debug) {
      console.log('[JournalSystem] Auto-saving journal...');
    }

    await this.saveCurrentJournal();
  }

  /**
   * Stop recording and save
   */
  async stop(): Promise<void> {
    console.log('[JournalSystem] Stopping journal system...');

    this.isRecording = false;

    // Clear auto-save timer
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    // Save current journal
    await this.saveCurrentJournal();

    this.currentJournal = null;

    console.log('[JournalSystem] Journal system stopped');
  }

  /**
   * Get current journal (for testing/debugging)
   */
  getCurrentJournal(): EventJournal | null {
    return this.currentJournal;
  }

  /**
   * Get journal storage (for management)
   */
  getStorage(): JournalStorage {
    return this.storage;
  }

  /**
   * Get system statistics
   */
  async getStats(): Promise<{
    isRecording: boolean;
    currentJournalId?: string;
    currentEventCount: number;
    recordingDuration: number;
    eventsPerSecond: number;
    storageStats: {
      totalJournals: number;
      totalSize: number;
      oldestJournal?: Date;
      newestJournal?: Date;
      averageEventCount: number;
    };
  }> {
    const storageStats = await this.storage.getStats();
    const duration = this.isRecording ? (Date.now() - this.startTime) / 1000 : 0;
    const rate = duration > 0 ? this.eventCounter / duration : 0;

    return {
      isRecording: this.isRecording,
      currentJournalId: this.currentJournal?.getMetadata().id,
      currentEventCount: this.eventCounter,
      recordingDuration: duration,
      eventsPerSecond: rate,
      storageStats
    };
  }
}

// Create and export the singleton instance
export const journalSystem = new JournalSystem({
  enabled: process.env.DISABLE_JOURNAL !== 'true',
  debug: process.env.DEBUG_JOURNAL === 'true'
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('[JournalSystem] Received SIGINT, saving journal...');
  await journalSystem.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[JournalSystem] Received SIGTERM, saving journal...');
  await journalSystem.stop();
  process.exit(0);
});
