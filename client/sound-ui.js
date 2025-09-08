// Sound UI module: binds mute/volume controls and keyboard shortcuts, with persistence
// Usage: setupSoundUI(sound)

export function setupSoundUI(sound) {
  const ui = {
    container: document.getElementById('sound-ui'),
    btnMute: document.getElementById('btn-mute'),
    iconMute: document.getElementById('icon-mute'),
    volRange: document.getElementById('range-volume'),
    volLabel: document.getElementById('label-volume'),
  };

  function persistSoundSettings() {
    localStorage.setItem('ea:sound:volume', String(Math.round(sound.volume * 100)));
    localStorage.setItem('ea:sound:muted', sound.muted ? '1' : '0');
  }

  function updateSoundUIFromSound() {
    if (!ui.container) return;
    const volPct = Math.round(sound.volume * 100);
    if (ui.btnMute) ui.btnMute.setAttribute('aria-pressed', sound.muted ? 'true' : 'false');
    if (ui.iconMute) ui.iconMute.textContent = sound.muted ? '🔇' : '🔊';
    if (ui.volRange) ui.volRange.value = String(volPct);
    if (ui.volLabel) ui.volLabel.textContent = `${volPct}%`;
    if (ui.volRange) ui.volRange.disabled = !!sound.muted;
  }

  // Load persisted settings before first unlock
  const sv = Number(localStorage.getItem('ea:sound:volume'));
  if (Number.isFinite(sv)) sound.setVolume(Math.max(0, Math.min(100, sv)) / 100);
  const sm = localStorage.getItem('ea:sound:muted');
  if (sm === '1') sound.setMuted(true);

  if (ui.container) {
    // prevent game input when interacting with UI and unlock audio
    ui.container.addEventListener('pointerdown', (e) => { sound.unlock(); e.stopPropagation(); }, { passive: true });
    ui.container.addEventListener('mousedown', (e) => { sound.unlock(); e.stopPropagation(); });
  }
  if (ui.btnMute) {
    ui.btnMute.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.unlock();
      sound.toggleMute();
      updateSoundUIFromSound();
      persistSoundSettings();
    });
  }
  if (ui.volRange) {
    ui.volRange.addEventListener('input', (e) => {
      e.stopPropagation();
      sound.unlock();
      const v = Number(ui.volRange.value);
      if (Number.isFinite(v)) {
        sound.setVolume(Math.max(0, Math.min(100, v)) / 100);
        if (sound.muted && v > 0) {
          sound.setMuted(false);
        }
        updateSoundUIFromSound();
        persistSoundSettings();
      }
    });
  }
  updateSoundUIFromSound();

  // Keyboard shortcuts: m = mute/unmute, -/+ = volume down/up
  addEventListener('keydown', (e) => {
    const key = (e.key || '').toLowerCase();
    if (key === 'm') {
      sound.toggleMute();
      updateSoundUIFromSound();
      persistSoundSettings();
    } else if (key === '-') {
      sound.setVolume(sound.volume - 0.1);
      updateSoundUIFromSound();
      persistSoundSettings();
    } else if (key === '+') {
      sound.setVolume(sound.volume + 0.1);
      if (sound.muted && sound.volume > 0) sound.setMuted(false);
      updateSoundUIFromSound();
      persistSoundSettings();
    }
  });

  return { update: updateSoundUIFromSound };
}

