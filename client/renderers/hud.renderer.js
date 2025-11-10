import { BaseRenderer } from './base.renderer.js';

/**
 * HUDRenderer - Renders all HUD elements
 */
export class HUDRenderer extends BaseRenderer {
  render() {
    this.renderMatchOverlay();
    this.renderAnnouncements();
    this.renderPlayerInfo();
    this.renderKillFeed();
    this.renderStreakBadge();
    this.renderPlayersList();
  }

  renderMatchOverlay() {
    const nowTs = Date.now();
    const match = this.gameState.match;
    let showOverlay = false;
    const overlayLines = [];

    if (match.phase === 'countdown' && match.startsAt) {
      const remainMs = Math.max(0, match.startsAt - nowTs);
      const secs = Math.ceil(remainMs / 1000);
      overlayLines.push(match.mode ? `Mode: ${match.mode}` : 'Match');
      overlayLines.push(`Starting in ${secs}s`);
      showOverlay = true;
    } else if (match.phase === 'active') {
      overlayLines.push(
        match.mode ? `Mode: ${match.mode}` : 'Match in progress',
      );
      if (match.endsAt) {
        const remainMs = Math.max(0, match.endsAt - nowTs);
        const secs = Math.ceil(remainMs / 1000);
        overlayLines.push(`Time left: ${secs}s`);
      }
      showOverlay = true;
    } else if (match.phase === 'ended') {
      overlayLines.push('Match ended');
      if (match.mode) overlayLines.push(`Mode: ${match.mode}`);
      showOverlay = true;
    }

    if (showOverlay) {
      const boxW = 260;
      const boxH = 64;
      const x = (this.ctx.canvas.width - boxW) / 2;
      const y = 24;
      this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
      this.ctx.fillRect(x, y, boxW, boxH);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '16px sans-serif';
      this.ctx.textBaseline = 'top';
      let yy = y + 10;
      for (const line of overlayLines) {
        this.ctx.fillText(line, x + 12, yy);
        yy += 20;
      }
    }
  }

  renderAnnouncements() {
    const announcements = this.gameState.announcements;
    if (!Array.isArray(announcements) || !announcements.length) return;

    const nowEpoch = Date.now();
    const visible = announcements.filter((a) => nowEpoch - a.timestamp < 3000);

    if (visible.length) {
      const ann = visible[visible.length - 1]; // Latest
      const text = `${ann.name || ann.playerId} ${ann.message} (${ann.streak})`;
      this.ctx.font = '18px sans-serif';
      this.ctx.textBaseline = 'top';
      const paddingX = 16;
      const paddingY = 8;
      const width = this.ctx.measureText(text).width + paddingX * 2;
      const height = 32;
      const x = (this.ctx.canvas.width - width) / 2;
      const y = 96;
      const alpha = Math.max(0.2, 1 - (nowEpoch - ann.timestamp) / 3000);
      const isMe = ann.playerId === this.gameState.me;

      this.ctx.fillStyle = isMe
        ? `rgba(0,120,0,${0.75 * alpha})`
        : `rgba(0,0,0,${0.6 * alpha})`;
      this.ctx.fillRect(x, y, width, height);

      this.ctx.strokeStyle = isMe
        ? `rgba(0,220,0,${alpha})`
        : `rgba(255,255,255,${alpha})`;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, width, height);

      this.ctx.fillStyle = isMe
        ? `rgba(230,255,230,${alpha})`
        : `rgba(255,255,255,${alpha})`;
      this.ctx.fillText(text, x + paddingX, y + paddingY);
    }
  }

  renderPlayerInfo() {
    const me = this.gameState.getMyPlayer();
    if (!me) return;

    const maxHp = 100;
    const w = 160;
    const h = 14;
    const x = 16;
    const y = 16;
    const ratio = Math.max(0, Math.min(1, (me.hp ?? 0) / maxHp));

    // HP bar
    this.ctx.fillStyle = '#ddd';
    this.ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    this.ctx.fillStyle = '#900';
    this.ctx.fillRect(x, y, w, h);
    this.ctx.fillStyle = '#0c0';
    this.ctx.fillRect(x, y, w * ratio, h);
    this.ctx.fillStyle = '#000';
    this.ctx.font = '12px sans-serif';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(
      `${me.name || 'Me'}: ${me.hp ?? 0}/${maxHp}`,
      x,
      y + h + 4,
    );

    // Buffs
    const myBuffs = this.gameState.buffs.get(me.id) || {};
    let bx = x;
    const by = y + h + 24;
    const nowp = performance.now();

    const drawBuff = (kind, color, label) => {
      const info = myBuffs[kind];
      if (!info || !info.duration) return;

      const total = info.duration;
      const remainMs = Math.max(0, info.until - nowp);
      const ratio = Math.max(0, Math.min(1, remainMs / total));

      // Icon
      this.ctx.fillStyle = color;
      this.ctx.fillRect(bx, by, 18, 18);

      // Label
      this.ctx.fillStyle = '#000';
      this.ctx.font = '10px sans-serif';
      this.ctx.fillText(label, bx + 5, by + 4);

      // Timer
      this.ctx.fillStyle = '#222';
      this.ctx.fillRect(bx, by + 20, 18, 3);
      this.ctx.fillStyle = '#0a0';
      this.ctx.fillRect(bx, by + 20, 18 * ratio, 3);

      bx += 28;
    };

    drawBuff('haste', '#9cf', 'h');
    drawBuff('shield', '#ffb', 'S');
  }

  renderKillFeed() {
    const feedX = this.ctx.canvas.width - 300;
    let feedY = 16;
    this.ctx.font = '11px sans-serif';
    this.ctx.textBaseline = 'top';

    const feedNow = Date.now();

    for (const entry of this.gameState.killFeed) {
      const age = feedNow - entry.timestamp;
      const alpha = Math.max(0, Math.min(1, 1 - age / 10000));

      // Background
      this.ctx.fillStyle = `rgba(0,0,0,${0.6 * alpha})`;
      this.ctx.fillRect(feedX, feedY, 280, 16);

      // Get player names
      const killerPlayer = this.gameState.players.get(entry.killer);
      const victimPlayer = this.gameState.players.get(entry.victim);
      const killerName = killerPlayer?.name || entry.killer;
      const victimName = victimPlayer?.name || entry.victim;

      // Weapon icon
      let weaponText = '•';
      if (entry.weapon === 'bullet') weaponText = '●';
      else if (entry.weapon === 'pellet') weaponText = '◦◦◦';
      else if (entry.weapon === 'rocket') weaponText = '🚀';
      else if (entry.weapon === 'explosion') weaponText = '💥';

      // Killer name
      this.ctx.fillStyle =
        entry.killer === this.gameState.me
          ? `rgba(0,255,0,${alpha})`
          : `rgba(255,255,255,${alpha})`;
      const killerText = `${killerName}`;
      this.ctx.fillText(killerText, feedX + 4, feedY + 2);
      const killerWidth = this.ctx.measureText(killerText).width;

      // Weapon
      this.ctx.fillStyle = `rgba(255,200,100,${alpha})`;
      this.ctx.fillText(weaponText, feedX + 8 + killerWidth, feedY + 2);
      const weaponWidth = this.ctx.measureText(weaponText).width;

      // Victim name
      this.ctx.fillStyle =
        entry.victim === this.gameState.me
          ? `rgba(255,100,100,${alpha})`
          : `rgba(255,255,255,${alpha})`;
      this.ctx.fillText(
        victimName,
        feedX + 12 + killerWidth + weaponWidth,
        feedY + 2,
      );

      feedY += 18;
    }
  }

  renderStreakBadge() {
    const me = this.gameState.getMyPlayer();
    if (!me) return;

    const myStreak = this.gameState.streaks.get(this.gameState.me) || 0;
    if (myStreak <= 1) return;

    const streakX = 200;
    const streakY = 16;

    // Badge background
    this.ctx.fillStyle = myStreak >= 5 ? '#ff6600' : '#ffaa00';
    this.ctx.fillRect(streakX, streakY, 60, 20);

    // Border
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(streakX, streakY, 60, 20);

    // Text
    this.ctx.fillStyle = '#000';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${myStreak} STREAK`, streakX + 30, streakY + 10);

    // Reset alignment
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
  }

  renderPlayersList() {
    this.ctx.font = '12px sans-serif';
    this.ctx.textBaseline = 'top';
    this.ctx.fillStyle = '#000';
    const listX = 16;
    let listY = 80;

    // Respawn prompt if dead
    const myPlayer = this.gameState.getMyPlayer();
    if (this.gameState.me && (!myPlayer || myPlayer.isDead)) {
      const nowEpoch = Date.now();
      const until = this.gameState.deadUntil || nowEpoch + 5000;
      const remainMs = Math.max(0, until - nowEpoch);
      const secs = Math.ceil(remainMs / 1000);

      const barW = 280;
      const barH = 6;
      const progress = Math.max(0, Math.min(1, 1 - remainMs / 5000));

      this.ctx.fillStyle = '#200';
      this.ctx.fillRect(listX - 4, listY - 2, barW + 8, 32);
      this.ctx.fillStyle = '#fcc';
      this.ctx.fillText(`You are dead. Respawn in ${secs}s`, listX, listY);
      listY += 16;
      this.ctx.fillStyle = '#400';
      this.ctx.fillRect(listX, listY, barW, barH);
      this.ctx.fillStyle = '#c66';
      this.ctx.fillRect(listX, listY, barW * progress, barH);
      listY += 10;

      if (remainMs <= 0) {
        this.ctx.fillStyle = '#cfc';
        this.ctx.fillText('Press SPACE to respawn', listX, listY);
        listY += 16;
      }
    }

    // Players list
    const playersArr = Array.from(this.gameState.players.values()).sort(
      (a, b) => (a.name || a.id).localeCompare(b.name || b.id),
    );

    for (const player of playersArr) {
      const isMe = this.gameState.me === player.id;
      const score = this.gameState.scores.get(player.id) || {
        kills: 0,
        deaths: 0,
        assists: 0,
      };

      // Background
      if (player.isDead) {
        this.ctx.fillStyle = isMe ? '#300' : '#111';
        this.ctx.fillRect(listX - 4, listY - 2, 220, 18);
        this.ctx.fillStyle = isMe ? '#f99' : '#888';
      } else {
        this.ctx.fillStyle = isMe ? '#003' : '#222';
        this.ctx.fillRect(listX - 4, listY - 2, 220, 18);
        this.ctx.fillStyle = isMe ? '#9cf' : '#fff';
      }

      // Text
      const scoreText = `${score.kills}/${score.deaths}/${score.assists}`;
      const deadIndicator = player.isDead ? ' [DEAD]' : '';
      this.ctx.fillText(
        `${player.name || player.id}: ${player.hp ?? 0} | ${scoreText}${deadIndicator}`,
        listX,
        listY,
      );
      listY += 20;
    }
  }
}
