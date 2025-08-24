import type { SourceEvents, THudScoreboardUpdate, THudMatchUpdate, THudFeedUpdate, THudStreaksUpdate, THudAnnouncementsUpdate } from '../core/types/events.type';

export type WidgetKey = 'scoreboard' | 'match' | 'feed' | 'streaks' | 'announcements';

export type WidgetSnapshotMap = {
  scoreboard: THudScoreboardUpdate;
  match: THudMatchUpdate;
  feed: THudFeedUpdate;
  streaks: THudStreaksUpdate;
  announcements: THudAnnouncementsUpdate;
};

// Shared widget contract
export interface HudWidget<K extends WidgetKey = WidgetKey> {
  readonly key: K;
  snapshot(): WidgetSnapshotMap[K];
  onEvent(e: SourceEvents): boolean;
}

