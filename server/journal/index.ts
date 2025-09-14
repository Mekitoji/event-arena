/**
 * Event Journal System
 *
 * Provides comprehensive event recording and replay capabilities for the game server.
 * This module exports all the core components needed to work with event journals.
 */

export { EventJournal } from './event-journal';

export { JournalStorage } from './journal-storage';

export {
  JournalEntry,
  JournalMetadata,
  JournalOptions,
  StorageConfig,
} from './types';

// Re-export the journal system singleton for convenience
export { journalSystem } from '../systems/journal';
