// ============================================================
//  sketch.js  –  Sensory Journey  |  Main Game Loop
//  A game about navigating the world with sensory overload.
//  Visual style: Pokémon Ruby (GBA top-down pixel art)
// ============================================================

// ─── Assets ─────────────────────────────────────────────────────────────────
let imgTileset, imgPlayer, imgNPCs, imgPortrait, imgNoiseIcons, imgQuietZone;

// ─── Core objects ───────────────────────────────────────────────────────────
let tileMap, player, dialogue, overloadFX, ui;

// ─── Game state ─────────────────────────────────────────────────────────────
const STATE = { MENU:'menu', TRANS:'transition', PLAY:'play', DIALOG:'dialog', WIN:'win' };
let state       = STATE.MENU;
let levelIndex  = 0;
let levelData   = null;   // current LEVELS[] entry
let activeCheckpointIdx = 0;
let exitUnlocked        = false;

// ─── NPCs (runtime) ─────────────────────────────────────────────────────────
let npcInstances = [];

// ─── Stars (runtime) ─────────────────────────────────────────────────────────
let starInstances   = [];   // { wx, wy, inNoise, collected }
let starsCollected  = 0;    // stars collected this level
const TOTAL_STARS   = 3;    // fixed per level

// Per-level star scores, accumulated across the whole run
// e.g. levelStarScores[0] = stars earned in level 1
let levelStarScores = [];

// Star collect particles for pop animation
let starParticles = []; // { x, y, vx, vy, life, maxLife, col }

// ─── Overload restart flash ──────────────────────────────────────────────────
let overloadFlashAlpha = 0;

// ─── Transition timer ────────────────────────────────────────────────────────
let transitionTimer = 0;
const TRANSITION_DURATION = 180; // frames before auto-skip allowed

// ─── Game canvas size ────────────────────────────────────────────────────────
const CANVAS_W = 640;
const CANVAS_H = 480;

// ─── p5 preload ──────────────────────────────────────────────────────────────
function preload() {
  imgTileset    = loadImage('assets/images/tileset.png');
  imgPlayer     = loadImage('assets/images/player.png');
  imgNPCs       = loadImage('assets/images/npcs.png');
  imgPortrait   = loadImage('assets/images/portrait.png');
  imgNoiseIcons = loadImage('assets/images/noise_icons.png');
  imgQuietZone  = loadImage('assets/images/quiet_zone.png');
}

// ─── p5 setup ────────────────────────────────────────────────────────────────
function setup() {
  const cnv = createCanvas(CANVAS_W, CANVAS_H);
  cnv.parent('game-container');
  pixelDensity(1);
  imageMode(CORNER);
  textFont('monospace');

  // Init systems
  tileMap   = new TileMap();
  tileMap.load(imgTileset);

  player    = new Player();
  player.setSprite(imgPlayer);

  dialogue  = new DialogueSystem();
  overloadFX = new OverloadEffect();
  ui        = new GameUI();
  ui.setImages(imgPortrait, imgNoiseIcons, null);
}

// ─── p5 draw ─────────────────────────────────────────────────────────────────
function draw() {
  background(20, 20, 40);

  if      (state === STATE.MENU)  { drawMenu();       return; }
  if      (state === STATE.TRANS) { drawTransition(); return; }
  if      (state === STATE.WIN)   { drawWin();        return; }

  // ── PLAY / DIALOG ─────────────────────────────────────────────────────────
  const playing = (state === STATE.PLAY);

  // Camera shake offset
  const shakeX = overloadFX.getShakeX();
  const shakeY = overloadFX.getShakeY();

  push();
  translate(shakeX, shakeY);

  // World
  tileMap.draw(CANVAS_W, CANVAS_H);
  ui.drawQuietZones(levelData.quietZones, tileMap);
  ui.drawNoiseSources(levelData.noiseSources, tileMap, imgNoiseIcons);
  ui.drawStars(starInstances, tileMap);
  ui.drawCheckpoints(levelData.checkpoints, activeCheckpointIdx, tileMap);
  ui.drawExit(levelData.exit, tileMap, exitUnlocked);
  ui.drawFocusPath(player, levelData.exit, levelData.checkpoints, activeCheckpointIdx, tileMap);
  ui.drawNPCs(npcInstances, tileMap, imgNPCs);
  player.draw(tileMap);

  pop();

  // Overload visual effects (no shake on these)
  overloadFX.drawVignette(CANVAS_W, CANVAS_H);
  overloadFX.drawDistortion(player.sensory / player.sensoryMax);
  overloadFX.drawDistortion(player.sensory / player.sensoryMax);

  // Star collect particles (screen-space, above vignette)
  updateAndDrawParticles();

  // HUD
  ui.drawLevelLabel(levelData.name, CANVAS_W);
  ui.drawSensoryBar(player.sensory, player.sensoryMax, CANVAS_W);
  ui.drawStarHUD(starsCollected, TOTAL_STARS, CANVAS_W);

  // Dialogue
  dialogue.update();
  dialogue.draw(CANVAS_W, CANVAS_H);

  // Overload restart flash
  if (overloadFlashAlpha > 0) {
    ui.drawOverloadRestart(CANVAS_W, CANVAS_H, overloadFlashAlpha);
    overloadFlashAlpha -= 4;
  }

  if (!playing) return; // dialog paused – skip game logic

  // ── Game Logic ────────────────────────────────────────────────────────────
  // Update NPC movement (simple patrol)
  updateNPCs();

  // Player update
  player.update(tileMap);
  tileMap.updateCamera(player.wx, player.wy, CANVAS_W, CANVAS_H);

  // Sensory update
  const prevS = player.sensory;
  player.updateSensory(
    levelData.sensoryGain,
    levelData.noiseSources,
    levelData.quietZones,
    tileMap
  );
  overloadFX.update(player.sensory, player.sensoryMax);

  // Check overload
  if (player.overloaded) {
    overloadFlashAlpha = 255;
    player.reset(levelData.playerStart.tx, levelData.playerStart.ty);
    activeCheckpointIdx = 0;
    exitUnlocked        = false;
    // Reset stars for this level
    starsCollected = 0;
    for (const s of starInstances) s.collected = false;
    return;
  }

  // ── Check star collection ─────────────────────────────────────────────
  for (const s of starInstances) {
    if (s.collected) continue;
    if (dist(player.wx, player.wy, s.wx, s.wy) < TILE_PX * 0.9) {
      s.collected = true;
      starsCollected++;
      // Spawn collect particles at screen position
      const sc = tileMap.worldToScreen(s.wx, s.wy);
      spawnStarParticles(sc.x, sc.y);
    }
  }

  // Check checkpoint
  if (activeCheckpointIdx < levelData.checkpoints.length) {
    const cp = levelData.checkpoints[activeCheckpointIdx];
    const nc = tileMap.tileCentre(cp.tx, cp.ty);
    if (dist(player.wx, player.wy, nc.x, nc.y) < TILE_PX * 1.0) {
      state = STATE.DIALOG;
      dialogue.start(cp.dialog, () => {
        activeCheckpointIdx++;
        if (activeCheckpointIdx >= levelData.checkpoints.length) {
          exitUnlocked = true;
        }
        state = STATE.PLAY;
      }, imgPortrait);
    }
  }

  // Check exit
  if (exitUnlocked) {
    const ex  = levelData.exit;
    const exc = tileMap.tileCentre(ex.tx, ex.ty);
    if (dist(player.wx, player.wy, exc.x, exc.y) < TILE_PX * 1.2) {
      // Bank this level's star score before showing dialogue
      levelStarScores[levelIndex] = starsCollected;
      state = STATE.DIALOG;
      dialogue.start(levelData.exitDialog, () => {
        state = STATE.WIN;
      }, imgPortrait);
    }
  }
}

// ─── Screens ─────────────────────────────────────────────────────────────────
function drawMenu() {
  ui.drawMenu(CANVAS_W, CANVAS_H, imgPortrait);
}

function drawTransition() {
  transitionTimer++;
  // Show the previous level's score on this transition screen (if any)
  const prevScore = levelIndex > 0 && levelStarScores[levelIndex - 1] !== undefined
    ? levelStarScores[levelIndex - 1] : -1;
  ui.drawTransition(levelData, CANVAS_W, CANVAS_H, transitionTimer, TRANSITION_DURATION,
                    prevScore, TOTAL_STARS);
}

function drawWin() {
  const isLast = levelIndex >= LEVELS.length - 1;
  const totalAcrossRun = levelStarScores.reduce((a, b) => a + b, 0);
  const maxAcrossRun   = LEVELS.length * TOTAL_STARS;
  ui.drawWin(levelData, CANVAS_W, CANVAS_H, isLast, starsCollected, TOTAL_STARS,
             levelStarScores, maxAcrossRun, totalAcrossRun);
}

// ─── Level Loading ───────────────────────────────────────────────────────────
function loadLevel(idx) {
  levelIndex  = idx;
  levelData   = LEVELS[idx];
  activeCheckpointIdx = 0;
  exitUnlocked = levelData.checkpoints.length === 0; // unlock exit if no checkpoints

  tileMap.setMap(levelData.map);
  player.reset(levelData.playerStart.tx, levelData.playerStart.ty);
  tileMap.updateCamera(player.wx, player.wy, CANVAS_W, CANVAS_H);

  // Init star instances from level definition
  starsCollected = 0;
  starInstances  = (levelData.stars || []).map(s => ({
    wx:        s.tx * TILE_PX + TILE_PX / 2,
    wy:        s.ty * TILE_PX + TILE_PX / 2,
    inNoise:   s.inNoise || false,
    collected: false,
  }));

  // Init NPC runtime instances
  npcInstances = [];
  for (const npcDef of levelData.npcs) {
    npcInstances.push({
      wx: npcDef.tx * TILE_PX + TILE_PX/2,
      wy: npcDef.ty * TILE_PX + TILE_PX/2,
      type: npcDef.type,
      facing: npcDef.facing || 'down',
      patrol: npcDef.patrol || null,
      patrolIdx: 0,
      timer: 0,
    });
  }

  // Moving noise sources – set initial wx/wy
  for (const n of levelData.noiseSources) {
    if (n.moving && n.patrolPath) {
      n._patrolIdx = 0;
      n._tx = n.tx;
      n._ty = n.ty;
    }
  }

  state = STATE.TRANS;
  transitionTimer = 0;
}

function updateNPCs() {
  for (const npc of npcInstances) {
    if (!npc.patrol || npc.patrol.length < 2) continue;
    npc.timer++;
    if (npc.timer < 90) continue; // wait at each point
    npc.timer = 0;
    npc.patrolIdx = (npc.patrolIdx + 1) % npc.patrol.length;
    const pt = npc.patrol[npc.patrolIdx];
    npc.wx = pt.tx * TILE_PX + TILE_PX/2;
    npc.wy = pt.ty * TILE_PX + TILE_PX/2;
  }
}

// ─── Input ────────────────────────────────────────────────────────────────────
function keyPressed() {
  // Advance dialogue
  if (state === STATE.DIALOG) {
    if (keyCode === ENTER || key === 'z' || key === 'Z' || key === ' ') {
      dialogue.pressAdvance();
    }
    return;
  }

  if (keyCode === ENTER) {
    if (state === STATE.MENU) {
      levelStarScores = [];   // fresh run — clear any previous scores
      loadLevel(0);
      return;
    }
    if (state === STATE.TRANS) {
      startPlayWithIntro();
      return;
    }
    if (state === STATE.WIN) {
      const isLast = levelIndex >= LEVELS.length - 1;
      if (!isLast) {
        loadLevel(levelIndex + 1);
      }
      return;
    }
  }

  if (key === 'r' || key === 'R') {
    if (state === STATE.WIN && levelIndex >= LEVELS.length - 1) {
      // Restart from beginning — clear cumulative scores
      levelStarScores = [];
      loadLevel(0);
    } else if (state === STATE.PLAY || state === STATE.DIALOG) {
      // Quick restart current level — don't wipe scores of previous levels
      loadLevel(levelIndex);
    }
  }
}

function startPlayWithIntro() {
  state = STATE.DIALOG;
  dialogue.start(levelData.intro, () => {
    state = STATE.PLAY;
  }, imgPortrait);
  // If no intro, just play
  if (!levelData.intro || levelData.intro.length === 0) {
    state = STATE.PLAY;
  }
}

// ─── Star Particle System ────────────────────────────────────────────────────
function spawnStarParticles(sx, sy) {
  const COLS = [
    [255, 215,   0],   // gold
    [255, 255, 140],   // pale yellow
    [255, 180,  40],   // amber
    [255, 255, 255],   // white flash
  ];
  for (let i = 0; i < 18; i++) {
    const angle  = random(TWO_PI);
    const speed  = random(1.5, 5.0);
    const col    = random(COLS);
    starParticles.push({
      x: sx, y: sy,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed - random(1, 3), // slight upward bias
      life: 1.0,
      decay: random(0.03, 0.06),
      size: random(3, 8),
      col,
      isStar: i < 6,   // some particles are mini ★ glyphs
    });
  }
}

function updateAndDrawParticles() {
  if (starParticles.length === 0) return;
  push();
  noStroke();
  for (let i = starParticles.length - 1; i >= 0; i--) {
    const p = starParticles[i];
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.18;   // gravity
    p.vx *= 0.96;   // drag
    p.life -= p.decay;
    if (p.life <= 0) { starParticles.splice(i, 1); continue; }

    const alpha = p.life * 255;
    fill(p.col[0], p.col[1], p.col[2], alpha);
    if (p.isStar) {
      textSize(p.size * 2);
      textAlign(CENTER, CENTER);
      text('★', p.x, p.y);
    } else {
      ellipse(p.x, p.y, p.size * p.life, p.size * p.life);
    }
  }
  pop();
}

// ─── Auto-advance transition ──────────────────────────────────────────────────
// (pressing Enter in transition goes to intro dialog → play)
// Auto-skip after TRANSITION_DURATION frames is disabled; player must press Enter.
