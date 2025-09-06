/**
 * Event Journal System
 * 
 * Provides comprehensive event recording and replay capabilities for the game server.
 * This module exports all the core components needed to work with event journals.
 */

export {
  EventJournal,
  JournalEntry,
  JournalMetadata,
  JournalOptions
} from './event-journal';

export {
  JournalStorage,
  StorageConfig
} from './journal-storage';

// Re-export the journal system singleton for convenience
export { journalSystem } from '../systems/journal';
