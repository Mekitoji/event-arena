# Event Journal System

The Event Journal System provides comprehensive event recording capabilities for the game server, enabling features like debugging, analytics, and event tracking.

## Overview

The journal system automatically records all game events to compressed files, organizing them by match or session. It provides powerful querying and filtering capabilities while maintaining minimal performance overhead.

## Architecture

### Core Components

1. **EventJournal** (`event-journal.ts`)
   - Core journal class that records events in memory
   - Provides filtering and querying capabilities
   - Tracks metadata like players, event counts, and durations
   - Supports JSON serialization/deserialization

2. **JournalStorage** (`journal-storage.ts`)
   - Handles persistent storage of journals to disk
   - Supports compression (gzip) to reduce storage requirements
   - Maintains an index for fast lookups
   - Provides cleanup and management utilities

3. **JournalSystem** (`systems/journal.ts`)
   - Integrates with the event bus to automatically record all events
   - Manages journal lifecycle (creation, rotation, saving)
   - Handles match-based journal segmentation
   - Configurable via environment variables

## Features

### Automatic Recording

- Records all game events automatically (configurable exclusions)
- Separates journals by match for easy organization
- Auto-saves periodically (default: every 30 seconds)
- Rotates journals when they reach size limits

### Storage & Compression

- Compressed storage using gzip (typically 80-90% reduction)
- Organized directory structure (matches/ and sessions/)
- Indexed for fast lookups
- Automatic cleanup of old journals

### Querying & Filtering

- Filter by event type
- Filter by player ID
- Filter by time range
- Get event statistics and metadata

## Configuration

### Environment Variables

```bash
# Disable journal recording (default: enabled)
DISABLE_JOURNAL=true

# Enable debug logging
DEBUG_JOURNAL=true

# Storage directory (absolute or relative)
# Highest priority
JOURNALS_DIR=./artifacts/journals

# Alternative: set a shared artifacts root; JOURNALS_DIR defaults to "${EVENT_ARENA_ARTIFACTS_DIR}/journals"
EVENT_ARENA_ARTIFACTS_DIR=./artifacts
```

Priority order for storage directory:

1. Explicit option passed to JournalSystem or HTTP server
2. JOURNALS_DIR
3. EVENT_ARENA_ARTIFACTS_DIR/journals
4. <repo>/artifacts/journals (default)

Legacy (pre-change) default was <repo>/journals. You can point to that by setting JOURNALS_DIR=./journals if needed.

```bash
# Disable journal recording (default: enabled)
DISABLE_JOURNAL=true

# Enable debug logging
DEBUG_JOURNAL=true
```

### System Configuration

```typescript
interface JournalSystemConfig {
  enabled?: boolean; // Enable/disable recording (default: true)
  storageDir?: string; // Storage directory (default: ./journals)
  autoSaveInterval?: number; // Auto-save interval in ms (default: 30000)
  excludeEvents?: string[]; // Events to exclude (default: ['tick:pre', 'tick:post'])
  maxJournalSize?: number; // Max events before rotation (default: 100000)
  keepJournals?: number; // Number of journals to keep (default: 50)
  debug?: boolean; // Enable debug logging (default: false)
}
```

## Usage

### Testing the Journal System

```bash
# Run the comprehensive test suite
npx tsx server/journal/test-journal.ts
```

### Starting the Server with Journals

```bash
# Normal mode (journals enabled by default)
npm run start:server:dev

# With debug logging
DEBUG_JOURNAL=true npm run start:server:dev

# Disabled journals
DISABLE_JOURNAL=true npm run start:server:dev
```

### Programmatic Usage

```typescript
import { EventJournal } from "./journal/event-journal";
import { JournalStorage } from "./journal/journal-storage";

// Create and use a journal
const journal = new EventJournal("my-journal-001", {
  matchId: "match-001",
  maxBufferSize: 5000,
});

// Record events
journal.record({
  type: "player:move",
  playerId: "player1",
  pos: { x: 100, y: 200 },
});

// Query events
const playerEvents = journal.getEntriesByPlayer("player1");
const killEvents = journal.getEntriesByType("player:kill");

// Save to disk
const storage = new JournalStorage({
  baseDir: "./journals",
  compress: true,
});
await storage.init();
await storage.save(journal);

// Load journal for analysis
const loaded = await storage.load("my-journal-001");
const stats = loaded.getStats();
console.log(`Total events: ${stats.totalEvents}`);
```

## Storage Structure

```
journals/
├── index.json              # Index of all journals
├── matches/               # Match-specific journals
│   └── match_<id>_<timestamp>.json.gz
└── sessions/              # General session journals
    └── session_<timestamp>_<random>.json.gz
```

## Event Types Recorded

The system records all game events by default, including:

- Player events (join, move, aim, die, leave, kill)
- Combat events (damage, projectiles, explosions, knockback)
- Pickup and buff events
- Match lifecycle events (created, started, ended)
- Command events (player inputs)
- HUD updates (scoreboard, feed, streaks)

Events excluded by default:

- `tick:pre` and `tick:post` (high volume, low value)

## Performance Considerations

- **Memory**: Buffers up to 5000 events before flushing (configurable)
- **CPU**: Minimal overhead, events are recorded asynchronously
- **Storage**: Compression reduces file size by 80-90%
- **Network**: No network overhead (local storage only)

## Future Enhancements

Planned features for the journal system:

1. **Analytics Dashboard**
   - Heat maps of player movement
   - Kill/death statistics
   - Weapon usage analytics
   - Performance metrics

2. **Advanced Features**
   - Delta compression between events
   - Binary format for smaller file sizes
   - Cloud storage integration
   - Real-time streaming to external services

3. **Debugging Tools**
   - Enhanced event analysis
   - Diff comparison between journals
   - Validation and integrity checks

## Troubleshooting

### Common Issues

1. **Storage filling up**
   - Adjust `keepJournals` to limit retention
   - Reduce `maxJournalSize` for smaller files
   - Enable more aggressive cleanup

2. **High memory usage**
   - Reduce `maxBufferSize` to flush more frequently
   - Exclude high-frequency events like HUD updates

3. **Missing events**
   - Check `excludeEvents` configuration
   - Ensure the event type is registered in the system
   - Verify journal system is initialized

### Debug Commands

```bash
# Check journal directory size
du -sh journals/

# List recent journals
ls -lt journals/sessions/ | head -10

# Inspect journal index
cat journals/index.json | jq '.'

# Count events in a journal (compressed)
zcat journals/sessions/*.json.gz | jq '.entries | length'
```

## License

Part of the Event Arena game server.
