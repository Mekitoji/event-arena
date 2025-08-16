import { eventBus } from "../core/event-bus";
import { World } from "../core/world";
import { broadcast } from "../net/broadcaster";

interface Match {
  id: string;
  mode: string;
  phase: 'idle' | 'countdown' | 'active' | 'ended';
  startsAt?: number;
  endsAt?: number;
  players: Set<string>;
}

class MatchSystem {
  private matches = new Map<string, Match>();
  private currentMatch: Match | null = null;

  constructor() {
    // Auto-create a match on system startup for demo purposes
    setTimeout(() => this.createDemoMatch(), 2000);
  }

  private createDemoMatch() {
    const matchId = `match-${Date.now()}`;
    const match: Match = {
      id: matchId,
      mode: 'deathmatch',
      phase: 'idle',
      players: new Set(),
    };

    this.matches.set(matchId, match);
    this.currentMatch = match;

    console.log(`Created demo match: ${matchId}`);

    // Start countdown after 3 seconds
    setTimeout(() => {
      if (this.currentMatch?.id === matchId) {
        this.startCountdown(matchId, 10000); // 10 second countdown
      }
    }, 3000);
  }

  startCountdown(matchId: string, countdownMs: number) {
    const match = this.matches.get(matchId);
    if (!match || match.phase !== 'idle') return;

    match.phase = 'countdown';
    match.startsAt = Date.now() + countdownMs;

    // Broadcast match created with countdown
    const event = {
      type: 'match:created',
      id: matchId,
      mode: match.mode,
      countdownMs,
    };

    broadcast(event);
    console.log(`Match ${matchId} countdown started: ${countdownMs}ms`);

    // Schedule match start
    setTimeout(() => {
      this.startMatch(matchId, 300000); // 5 minute match
    }, countdownMs);
  }

  startMatch(matchId: string, durationMs?: number) {
    const match = this.matches.get(matchId);
    if (!match) return;

    match.phase = 'active';
    if (durationMs) {
      match.endsAt = Date.now() + durationMs;
    }

    // Reset all player scores at match start
    this.resetAllPlayerScores();

    const event = {
      type: 'match:started',
      id: matchId,
      ...(durationMs && { durationMs }),
    };

    broadcast(event);
    console.log(`Match ${matchId} started${durationMs ? ` for ${durationMs}ms` : ''}`);

    // Schedule match end if duration is specified
    if (durationMs) {
      setTimeout(() => {
        this.endMatch(matchId);
      }, durationMs);
    }
  }

  endMatch(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match || match.phase !== 'active') return;

    match.phase = 'ended';
    match.endsAt = Date.now();

    const event = {
      type: 'match:ended',
      id: matchId,
      at: match.endsAt,
    };

    broadcast(event);
    console.log(`Match ${matchId} ended`);

    // Clean up match after 10 seconds
    setTimeout(() => {
      this.matches.delete(matchId);
      if (this.currentMatch?.id === matchId) {
        this.currentMatch = null;
        // Create a new demo match for continuous testing
        setTimeout(() => this.createDemoMatch(), 5000);
      }
    }, 10000);
  }

  getCurrentMatch(): Match | null {
    return this.currentMatch;
  }

  addPlayerToMatch(playerId: string, matchId?: string) {
    const match = matchId ? this.matches.get(matchId) : this.currentMatch;
    if (match) {
      match.players.add(playerId);
      return match;
    }
    return null;
  }

  private resetAllPlayerScores() {

    for (const player of World.players.values()) {
      // Reset player stats using the stats class
      player.stats.reset();

      // Broadcast score reset to all clients
      broadcast({
        type: 'score:update',
        playerId: player.id,
        kills: 0,
        deaths: 0,
        assists: 0
      });
    }

    console.log('Reset all player scores for match start');
  }
}

// Create singleton instance
export const matchSystem = new MatchSystem();

// Listen to player join events to add them to the current match
eventBus.on('player:join', (event: { type: 'player:join', playerId: string, name: string }) => {
  const match = matchSystem.addPlayerToMatch(event.playerId);
  if (match) {
    console.log(`Player ${event.playerId} added to match ${match.id}`);
  }
});
