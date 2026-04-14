// ============================================================
//  sounds.js  –  Synthesized sound effects via Web Audio API
//  No audio files required — everything is generated in code.
// ============================================================

const SFX = (() => {
  let ctx = null;
  let masterGain = null;
  let muted = false;

  // Lazily create AudioContext on first user interaction (browser policy)
  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.35;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // ── Low-level helpers ────────────────────────────────────────────────
  function osc(type, freq, start, dur, gainPeak, gainEnd, detune = 0) {
    const c  = getCtx();
    const o  = c.createOscillator();
    const g  = c.createGain();
    o.type    = type;
    o.frequency.setValueAtTime(freq, start);
    if (detune) o.detune.setValueAtTime(detune, start);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gainPeak, start + 0.01);
    g.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.0001), start + dur);
    o.connect(g);
    g.connect(masterGain);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  function noise(dur, gainPeak, filterFreq = 800) {
    const c      = getCtx();
    const now    = c.currentTime;
    const bufLen = Math.ceil(c.sampleRate * dur);
    const buf    = c.createBuffer(1, bufLen, c.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    const src    = c.createBufferSource();
    src.buffer   = buf;

    const filt   = c.createBiquadFilter();
    filt.type    = 'bandpass';
    filt.frequency.value = filterFreq;
    filt.Q.value = 1.5;

    const g      = c.createGain();
    g.gain.setValueAtTime(gainPeak, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(filt);
    filt.connect(g);
    g.connect(masterGain);
    src.start(now);
    src.stop(now + dur);
  }

  // ── Public sound functions ───────────────────────────────────────────

  // ★ Star collected — bright ascending chime trio
  function starCollect() {
    if (muted) return;
    const c   = getCtx();
    const now = c.currentTime;
    const notes = [880, 1108, 1320]; // A5 C#6 E6 — major chord arpeggio
    notes.forEach((f, i) => {
      osc('sine',   f,       now + i * 0.07, 0.4, 0.6, 0.001);
      osc('sine',   f * 2,   now + i * 0.07, 0.2, 0.15, 0.001); // octave shimmer
    });
    // Little click transient on each note
    notes.forEach((_, i) => noise(0.03, 0.08, 3000 + i * 200));
  }

  // ! Checkpoint reached — warm two-tone notification
  function checkpoint() {
    if (muted) return;
    const c   = getCtx();
    const now = c.currentTime;
    osc('sine',     440, now,       0.25, 0.5, 0.001);
    osc('sine',     660, now + 0.1, 0.35, 0.6, 0.001);
    osc('triangle', 330, now,       0.3,  0.2, 0.001);
  }

  // ▶ Level start / transition — short upward fanfare
  function levelStart() {
    if (muted) return;
    const c   = getCtx();
    const now = c.currentTime;
    // Rising arpeggio: C D E G
    [[262,0], [294,0.09], [330,0.18], [392,0.27], [523,0.38]].forEach(([f, t]) => {
      osc('square',   f,     now + t, 0.18, 0.18, 0.001);
      osc('sine',     f,     now + t, 0.35, 0.35, 0.001);
      osc('sine',     f * 2, now + t, 0.1,  0.08, 0.001);
    });
    // Reverb-like tail on last note
    osc('sine', 523, now + 0.38, 0.8, 0.3, 0.001);
  }

  // 🏠 Level complete — 4-note victory jingle (Mario-ish)
  function levelComplete() {
    if (muted) return;
    const c   = getCtx();
    const now = c.currentTime;
    [[392,0],[494,0.12],[523,0.24],[659,0.38],[784,0.55]].forEach(([f, t]) => {
      osc('square', f,     now + t, 0.4, 0.22, 0.001);
      osc('sine',   f,     now + t, 0.4, 0.28, 0.001);
    });
    // Final long note
    osc('sine',   784, now + 0.55, 1.0, 0.35, 0.001);
    osc('square', 784, now + 0.55, 0.8, 0.15, 0.001);
  }

  // 🔴 Sensory overload — harsh descending buzzburst
  function overload() {
    if (muted) return;
    const c   = getCtx();
    const now = c.currentTime;
    // Descending dissonant tones
    [[400,0],[320,0.06],[240,0.12],[160,0.20]].forEach(([f, t]) => {
      osc('sawtooth', f, now + t, 0.25, 0.4, 0.001);
      osc('sawtooth', f * 1.03, now + t, 0.25, 0.3, 0.001); // slight detune = harsh
    });
    noise(0.4, 0.3, 200); // low rumble
  }

  // 💙 Enter quiet zone — soft calming pad swoosh
  function enterQuietZone() {
    if (muted) return;
    const c   = getCtx();
    const now = c.currentTime;
    // Gentle descending sine — like a sigh
    const o = c.createOscillator();
    const g = c.createGain();
    o.type  = 'sine';
    o.frequency.setValueAtTime(480, now);
    o.frequency.linearRampToValueAtTime(280, now + 0.6);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.22, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    o.connect(g); g.connect(masterGain);
    o.start(now); o.stop(now + 0.7);
    // Second harmonic
    osc('sine', 240, now, 0.5, 0.10, 0.001);
  }

  // 🚪 Exit / door — clean two-tone confirmation
  function exitReached() {
    if (muted) return;
    const c   = getCtx();
    const now = c.currentTime;
    osc('sine',     523, now,       0.3, 0.4, 0.001);
    osc('sine',     659, now + 0.15, 0.4, 0.45, 0.001);
    osc('triangle', 523, now,       0.2, 0.15, 0.001);
  }

  // 🔇 Toggle mute (bind to M key)
  function toggleMute() {
    muted = !muted;
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.35;
    return muted;
  }

  function isMuted() { return muted; }

  // Warm up context on first keydown (required by browsers)
  window.addEventListener('keydown', () => getCtx(), { once: true });
  window.addEventListener('mousedown', () => getCtx(), { once: true });

  return { starCollect, checkpoint, levelStart, levelComplete, overload, enterQuietZone, exitReached, toggleMute, isMuted };
})();
