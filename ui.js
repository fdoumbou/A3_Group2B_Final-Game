// ============================================================
//  ui.js  –  All HUD and screen UI for Sensory Journey
// ============================================================

class GameUI {
  constructor() {
    this.portraitImg  = null;
    this.noiseIcons   = null;
    this.uiSheet      = null;
    this._titleAlpha  = 0;
    this._titleSlide  = 40;
  }

  setImages(portrait, noiseIcons, uiSheet) {
    this.portraitImg = portrait;
    this.noiseIcons  = noiseIcons;
    this.uiSheet     = uiSheet;
  }

  // ── Sensory Load Bar ──────────────────────────────────────────────────
  drawSensoryBar(sensory, sensoryMax, w) {
    const BAR_W  = 240;
    const BAR_H  = 18;
    const BAR_X  = w / 2 - BAR_W / 2;
    const BAR_Y  = 14;
    const t      = sensory / sensoryMax;

    push();
    noStroke();

    // Label
    fill(220, 225, 255, 200);
    textSize(11);
    textAlign(LEFT, CENTER);
    textFont('monospace');
    text("SENSORY LOAD", BAR_X, BAR_Y + BAR_H / 2);

    const LBL_W = 108;

    // Background
    fill(10, 10, 30, 200);
    rect(BAR_X + LBL_W + 4, BAR_Y, BAR_W - LBL_W, BAR_H, 6);

    // Fill colour: green → yellow → red
    let barCol;
    if (t < 0.5)      barCol = lerpColor(color(80,200,80),   color(240,200,60),  t * 2);
    else if (t < 0.8) barCol = lerpColor(color(240,200,60),  color(240,100,30),  (t-0.5)*3.33);
    else              barCol = lerpColor(color(240,100,30),   color(220,30,30),   (t-0.8)*5);

    // Pulsate at high load
    if (t > 0.8) {
      const pulse = map(sin(frameCount * 0.2), -1, 1, 0.85, 1.0);
      barCol = lerpColor(barCol, color(255, 0, 0), (t - 0.8) * 3 * pulse);
    }

    const fillW = (BAR_W - LBL_W) * t;
    fill(barCol);
    rect(BAR_X + LBL_W + 4, BAR_Y, fillW, BAR_H, 6);

    // Shine on bar
    fill(255, 255, 255, 50);
    rect(BAR_X + LBL_W + 4, BAR_Y, fillW, BAR_H / 2, 6);

    // Border
    stroke(180, 200, 255, 160);
    strokeWeight(1.5);
    noFill();
    rect(BAR_X + LBL_W + 4, BAR_Y, BAR_W - LBL_W, BAR_H, 6);

    pop();
  }

  // ── Level name + hint ─────────────────────────────────────────────────
  drawLevelLabel(name, w) {
    push();
    noStroke();
    fill(10, 10, 30, 170);
    rect(10, 10, 170, 46, 6);
    fill(200, 220, 255);
    textFont('monospace');
    textSize(13);
    textAlign(LEFT, TOP);
    text(name, 18, 18);
    fill(160, 180, 220, 180);
    textSize(10);
    text("SHIFT = Focus  |  M = Mute", 18, 36);
    pop();
  }

  // ── Noise source indicators (world-space circles) ─────────────────────
  drawNoiseSources(noiseSources, tileMap, noiseIconImg) {
    push();
    for (const n of noiseSources) {
      const rPx = n.radius * TILE_PX;
      const nc  = tileMap.tileCentre(n.tx, n.ty);
      const sc  = tileMap.worldToScreen(nc.x, nc.y);

      // Pulsing aura
      const pulse = map(sin(frameCount * 0.07 + n.tx), -1, 1, 0.85, 1.0);
      const aR    = rPx * pulse;

      noFill();
      strokeWeight(1.5);
      for (let i = 0; i < 3; i++) {
        const a  = map(i, 0, 3, 60, 10);
        const sr = rPx * (0.7 + i * 0.15) * pulse;
        stroke(255, 140 - i * 30, 60, a);
        ellipse(sc.x, sc.y, sr * 2, sr * 2);
      }

      // Icon
      if (noiseIconImg && n.type >= 0 && n.type <= 4) {
        const ICON_W = 32, ICON_H = 32;
        imageMode(CENTER);
        image(noiseIconImg,
          sc.x, sc.y - rPx * 0.7,
          ICON_W, ICON_H,
          n.type * ICON_W, 0,
          ICON_W, ICON_H
        );
        imageMode(CORNER);
      }

      // Label
      fill(255, 200, 100, 160);
      noStroke();
      textSize(9);
      textAlign(CENTER, TOP);
      textFont('monospace');
      text(n.label, sc.x, sc.y - rPx * 0.7 + 18);
    }
    pop();
  }

  // ── Quiet zones ───────────────────────────────────────────────────────
  drawQuietZones(quietZones, tileMap) {
    push();
    for (const q of quietZones) {
      const sx = q.tx * TILE_PX - tileMap.camX;
      const sy = q.ty * TILE_PX - tileMap.camY;
      const sw = q.tw * TILE_PX;
      const sh = q.th * TILE_PX;
      const pulse = map(sin(frameCount * 0.04), -1, 1, 0.4, 0.7);
      noStroke();
      fill(80, 160, 240, pulse * 80);
      rect(sx, sy, sw, sh, 6);
      stroke(120, 200, 255, pulse * 160);
      strokeWeight(1.5);
      noFill();
      rect(sx, sy, sw, sh, 6);
      // Label
      fill(160, 220, 255, 200);
      noStroke();
      textSize(9);
      textAlign(CENTER, CENTER);
      textFont('monospace');
      text(q.label, sx + sw/2, sy + sh/2);
    }
    pop();
  }

  // ── Checkpoint indicators  (! exclamation markers) ───────────────────
  drawCheckpoints(checkpoints, activeIdx, tileMap) {
    push();
    for (let i = 0; i < checkpoints.length; i++) {
      if (i < activeIdx) continue; // already visited
      const cp     = checkpoints[i];
      const nc     = tileMap.tileCentre(cp.tx, cp.ty);
      const sc     = tileMap.worldToScreen(nc.x, nc.y);
      const isNext = i === activeIdx;
      const pulse  = map(sin(frameCount * 0.1), -1, 1, 0.7, 1.0);

      noStroke();
      if (isNext) {
        // Glowing orange exclamation bubble
        fill(255, 140, 20, 55 * pulse);
        ellipse(sc.x, sc.y - 18, TILE_PX * 2.2, TILE_PX * 2.2);

        // Bubble background
        fill(255, 200, 40, 230);
        stroke(200, 100, 0, 200);
        strokeWeight(2);
        rect(sc.x - 12, sc.y - 34, 24, 28, 6);
        // Bubble tail
        noStroke();
        fill(255, 200, 40, 230);
        triangle(sc.x - 5, sc.y - 8, sc.x + 5, sc.y - 8, sc.x, sc.y - 2);

        // Exclamation mark
        fill(60, 20, 0);
        noStroke();
        textSize(20);
        textAlign(CENTER, CENTER);
        textFont('monospace');
        text('!', sc.x, sc.y - 21);

        // Label below
        fill(255, 220, 100, 200);
        textSize(9);
        textAlign(CENTER, TOP);
        text(cp.label, sc.x, sc.y + 6);
      } else {
        // Faded exclamation for future checkpoints
        fill(200, 160, 60, 90);
        rect(sc.x - 9, sc.y - 30, 18, 22, 4);
        fill(80, 50, 0, 90);
        textSize(15);
        textAlign(CENTER, CENTER);
        text('!', sc.x, sc.y - 19);
      }
    }
    pop();
  }

  // ── Exit zone ─────────────────────────────────────────────────────────
  drawExit(exitDef, tileMap, unlocked) {
    if (!unlocked) return;
    const sx = exitDef.tx * TILE_PX - tileMap.camX;
    const sy = exitDef.ty * TILE_PX - tileMap.camY;
    const sw = (exitDef.tw || 1) * TILE_PX;
    const sh = (exitDef.th || 1) * TILE_PX;
    push();
    const pulse = map(sin(frameCount * 0.1), -1, 1, 0.5, 1.0);
    noStroke();
    fill(60, 220, 100, 80 * pulse);
    rect(sx, sy, sw, sh, 4);
    stroke(80, 255, 120, 200 * pulse);
    strokeWeight(2.5);
    noFill();
    rect(sx, sy, sw, sh, 4);
    // Arrow
    fill(80, 255, 120, 200 * pulse);
    noStroke();
    textSize(20);
    textAlign(CENTER, CENTER);
    text('▶', sx + sw/2, sy + sh/2);
    pop();
  }

  // ── Collectible Stars (world-space) ───────────────────────────────────
  drawStars(starInstances, tileMap) {
    push();
    for (let i = 0; i < starInstances.length; i++) {
      const s = starInstances[i];
      if (s.collected) continue;

      const sc = tileMap.worldToScreen(s.wx, s.wy);

      // Spinning / bobbing animation
      const bob   = sin(frameCount * 0.07 + i * 1.2) * 3;
      const spin  = (frameCount * 2 + i * 120) % 360; // degrees for squash
      const squash = map(cos(radians(spin)), -1, 1, 0.7, 1.0);

      const cx = sc.x;
      const cy = sc.y + bob;

      // Outer glow — gold, pulsing
      const glowA = map(sin(frameCount * 0.06 + i), -1, 1, 40, 90);
      noStroke();
      fill(255, 215, 0, glowA);
      ellipse(cx, cy, 36 * squash, 36);

      // Shadow on ground
      fill(0, 0, 0, 40);
      ellipse(cx, cy + 12, 18, 5);

      // Star shape drawn as a text glyph — big, bright gold
      fill(255, 215, 0);
      stroke(200, 140, 0);
      strokeWeight(1);
      textSize(22);
      textAlign(CENTER, CENTER);
      textFont('monospace');
      text('★', cx, cy);

      // Shine highlight on top-left
      fill(255, 255, 180, 200);
      noStroke();
      textSize(10);
      text('★', cx - 1, cy - 1);

      // Small "collect me" hint for in-noise stars
      if (s.inNoise) {
        fill(255, 100, 60, map(sin(frameCount * 0.05 + i), -1, 1, 100, 200));
        textSize(8);
        textAlign(CENTER, BOTTOM);
        text('risky', cx, cy - 14);
      }
    }
    pop();
  }

  // ── Star counter HUD (top-right during play) ──────────────────────────
  drawStarHUD(collected, total, w) {
    push();
    noStroke();
    fill(10, 10, 30, 185);
    rect(w - 100, 10, 90, 36, 6);
    stroke(200, 180, 60, 180);
    strokeWeight(1.5);
    noFill();
    rect(w - 100, 10, 90, 36, 6);
    noStroke();

    // Stars row
    const startX = w - 90;
    const starY  = 28;
    for (let i = 0; i < total; i++) {
      if (i < collected) {
        fill(255, 215, 0);
        stroke(180, 130, 0);
        strokeWeight(1);
      } else {
        fill(60, 60, 80);
        stroke(100, 100, 120);
        strokeWeight(1);
      }
      textSize(18);
      textAlign(LEFT, CENTER);
      text('★', startX + i * 24, starY);
    }

    noStroke();
    fill(200, 190, 120, 160);
    textSize(9);
    textAlign(RIGHT, TOP);
    textFont('monospace');
    text('STARS', w - 12, 13);
    pop();
  }

  // ── Focus path (SHIFT held) ───────────────────────────────────────────
  drawFocusPath(player, exitDef, checkpoints, activeCheckpointIdx, tileMap) {
    if (!player.focus) return;
    push();
    const alpha = map(sin(frameCount * 0.08), -1, 1, 120, 220);
    noFill();
    strokeWeight(2);
    stroke(255, 255, 100, alpha);
    // Draw dotted line to next target
    let target;
    if (activeCheckpointIdx < checkpoints.length) {
      const cp = checkpoints[activeCheckpointIdx];
      target = tileMap.tileCentre(cp.tx, cp.ty);
    } else {
      target = tileMap.tileCentre(exitDef.tx, exitDef.ty);
    }
    const ps = tileMap.worldToScreen(player.wx, player.wy);
    const ts = tileMap.worldToScreen(target.x, target.y);
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      if (i % 2 === 0) {
        const t0 = i / steps;
        const t1 = (i + 1) / steps;
        line(lerp(ps.x,ts.x,t0), lerp(ps.y,ts.y,t0), lerp(ps.x,ts.x,t1), lerp(ps.y,ts.y,t1));
      }
    }
    // Animate dots along path
    for (let i = 0; i < 4; i++) {
      const t = ((frameCount * 0.02 + i * 0.25) % 1);
      const dx = lerp(ps.x, ts.x, t);
      const dy = lerp(ps.y, ts.y, t);
      noStroke();
      fill(255, 255, 100, alpha * 0.6);
      ellipse(dx, dy, 6, 6);
    }
    pop();
  }

  // ── NPCs ──────────────────────────────────────────────────────────────
  drawNPCs(npcs, tileMap, npcSheet) {
    if (!npcSheet) return;
    push();
    for (const npc of npcs) {
      const sc = tileMap.worldToScreen(npc.wx, npc.wy);
      const NW = 32, NH = 48;
      const frame = Math.floor(frameCount / 24) % 2;
      imageMode(CENTER);
      image(npcSheet,
        sc.x, sc.y,
        NW, NH,
        (npc.type * 2 + frame) * NW, 0,
        NW, NH
      );
      imageMode(CORNER);
    }
    pop();
  }

  // ── Menu Screen ───────────────────────────────────────────────────────
  drawMenu(w, h, portraitImg) {
    push();
    // Background gradient
    const grad = drawingContext.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0a1e');
    grad.addColorStop(1, '#1a0a2e');
    drawingContext.fillStyle = grad;
    rect(0, 0, w, h);

    // Animated stars
    noStroke();
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137 + frameCount * 0.1) % w;
      const sy = (i * 97 + frameCount * 0.05) % h;
      const sa = map(sin(frameCount * 0.03 + i), -1, 1, 80, 200);
      fill(200, 220, 255, sa);
      ellipse(sx, sy, 1.5, 1.5);
    }

    // Title box
    const TBX = w/2 - 260, TBY = h * 0.08;
    fill(10, 10, 40, 210);
    rect(TBX, TBY, 520, 90, 10);
    stroke(100, 140, 220, 200);
    strokeWeight(2);
    noFill();
    rect(TBX, TBY, 520, 90, 10);
    noStroke();

    // Title text
    fill(220, 235, 255);
    textSize(46);
    textAlign(CENTER, TOP);
    textFont('monospace');
    text("SENSORY JOURNEY", w/2, TBY + 10);

    fill(160, 200, 255, 200);
    textSize(14);
    text("An experience of sensory overload", w/2, TBY + 64);

    // Portrait
    if (portraitImg) {
      const PS = 96;
      const PX = w/2 - PS/2, PY = h * 0.26;
      fill(20, 20, 50);
      rect(PX - 6, PY - 6, PS + 12, PS + 12, 6);
      stroke(120, 160, 220, 180);
      strokeWeight(2);
      noFill();
      rect(PX - 4, PY - 4, PS + 8, PS + 8, 5);
      noStroke();
      image(portraitImg, PX, PY, PS, PS);
    }

    // How to play
    const HBOX_Y = h * 0.52;
    fill(10, 10, 40, 200);
    rect(w/2 - 290, HBOX_Y, 580, 200, 8);
    stroke(80, 110, 180, 140);
    strokeWeight(1);
    noFill();
    rect(w/2 - 289, HBOX_Y, 580, 200, 8);
    noStroke();

    fill(200, 220, 255);
    textSize(14);
    textAlign(CENTER, TOP);
    textFont('monospace');
    text("HOW TO PLAY", w/2, HBOX_Y + 14);

    fill(160, 185, 220);
    textSize(12);
    const LH = 22, TX = HBOX_Y + 40;
    text("WASD / Arrow keys  —  Move", w/2, TX);
    text("Hold SHIFT  —  Focus mode (reveals guide path, slows movement)", w/2, TX + LH);
    text("! Exclamation markers  —  Story checkpoints you must visit", w/2, TX + LH*2);
    text("★ Gold stars  —  Optional collectibles for a higher score (0–3)", w/2, TX + LH*3);
    text("Blue zones  —  Quiet areas that lower your sensory load", w/2, TX + LH*4);
    fill(255, 180, 80, 200);
    textSize(11);
    text("⚠  If your sensory load maxes out, you restart the level", w/2, TX + LH*5 + 4);

    // Pulse enter prompt
    const alpha = map(sin(frameCount * 0.06), -1, 1, 140, 255);
    fill(255, 255, 255, alpha);
    textSize(18);
    text("▶  Press ENTER to Begin  ◀", w/2, h * 0.91);
    pop();
  }

  // ── Transition Screen ─────────────────────────────────────────────────
  drawTransition(level, w, h, timer, duration, prevStars = -1, prevTotal = 3) {
    const t = constrain(timer / duration, 0, 1);
    const fadeA = t < 0.3 ? map(t, 0, 0.3, 255, 0) : 0;

    push();
    background(10, 10, 30);

    // Level number badge
    fill(40, 60, 140, 200);
    rect(w/2 - 200, h * 0.10, 400, 60, 10);
    stroke(100, 140, 240, 200);
    strokeWeight(2);
    noFill();
    rect(w/2 - 199, h * 0.10, 400, 60, 10);
    noStroke();

    fill(160, 200, 255);
    textSize(13);
    textAlign(CENTER, CENTER);
    textFont('monospace');
    text(`LEVEL ${level.id + 1}`, w/2, h * 0.10 + 18);
    fill(230, 240, 255);
    textSize(28);
    text(level.name.toUpperCase(), w/2, h * 0.10 + 44);

    // Subtitle
    fill(180, 200, 240, 200);
    textSize(15);
    text(`"${level.subtitle}"`, w/2, h * 0.29);

    // Previous level result ribbon (only if not first level)
    if (prevStars >= 0) {
      fill(10, 10, 40, 190);
      rect(w/2 - 220, h * 0.35, 440, 42, 8);
      stroke(200, 180, 60, 160);
      strokeWeight(1);
      noFill();
      rect(w/2 - 219, h * 0.35, 440, 42, 8);
      noStroke();

      fill(200, 185, 120);
      textSize(11);
      textAlign(CENTER, CENTER);
      textFont('monospace');
      text(`Last level: `, w/2 - 60, h * 0.35 + 21);

      for (let i = 0; i < prevTotal; i++) {
        if (i < prevStars) {
          fill(255, 215, 0); stroke(160, 120, 0); strokeWeight(1);
        } else {
          fill(55, 55, 75); stroke(90, 90, 110); strokeWeight(1);
        }
        textSize(20);
        textAlign(LEFT, CENTER);
        text('★', w/2 - 10 + i * 26, h * 0.35 + 21);
      }
      noStroke();
    }

    // Hint box
    const hintY = prevStars >= 0 ? h * 0.44 : h * 0.39;
    fill(20, 20, 50, 200);
    rect(w/2 - 260, hintY, 520, 52, 8);
    fill(220, 230, 255);
    textSize(12);
    textAlign(CENTER, CENTER);
    text(level.levelHint, w/2, hintY + 26);

    // Controls reminder
    fill(140, 160, 200, 180);
    textSize(11);
    textAlign(CENTER, CENTER);
    text("WASD/Arrows — Move    SHIFT — Focus    ENTER — Confirm", w/2, h * 0.60);

    // Star / checkpoint reminder
    fill(255, 215, 0, 210);
    textSize(12);
    text("★ Collect stars for a higher score — some are near noise zones!", w/2, h * 0.67);

    fill(255, 180, 80, 180);
    textSize(11);
    text("Find the ! checkpoint(s) first, then reach the green exit.", w/2, h * 0.73);

    fill(100, 200, 255, 180);
    textSize(11);
    text("Blue quiet zones lower your sensory load. Use them.", w/2, h * 0.79);

    // Enter prompt
    const pa = map(sin(frameCount * 0.06), -1, 1, 140, 255);
    fill(255, 255, 255, pa);
    textSize(16);
    text("Press ENTER to play", w/2, h * 0.89);

    // Fade overlay
    if (fadeA > 0) {
      fill(10, 10, 30, fadeA);
      rect(0, 0, w, h);
    }
    pop();
  }

  // ── Win / End Screen ──────────────────────────────────────────────────
  // starsCollected:  stars earned this level
  // levelStarScores: array of per-level star counts for the full run
  // totalMax / totalEarned: used on the final screen
  drawWin(level, w, h, isLastLevel,
          starsCollected = 0, totalStars = 3,
          levelStarScores = [], totalMax = 9, totalEarned = 0) {
    push();
    background(10, 10, 30);

    // Animated star rain — density / brightness reflects stars earned
    noStroke();
    for (let i = 0; i < 28; i++) {
      const sy2 = ((frameCount * (0.8 + i % 3 * 0.4) + i * 38) % h);
      const sx2 = (i * 173) % w;
      const earned = i % 3 < starsCollected;
      fill(earned ? color(255, 215, 0, random(80, 180)) : color(80, 80, 100, random(30, 70)));
      textSize(10 + i % 8);
      textAlign(CENTER, CENTER);
      text(earned ? '★' : '☆', sx2, sy2);
    }

    if (isLastLevel) {
      // ── Final ending screen ───────────────────────────────────────────
      fill(20, 20, 50, 215);
      rect(w/2 - 300, h * 0.05, 600, h * 0.88, 12);
      stroke(120, 160, 240, 180);
      strokeWeight(2);
      noFill();
      rect(w/2 - 299, h * 0.05, 600, h * 0.88, 12);
      noStroke();

      fill(220, 235, 255);
      textSize(28);
      textAlign(CENTER, TOP);
      textFont('monospace');
      text("You made it home.", w/2, h * 0.09);

      fill(180, 200, 240);
      textSize(13);
      textLeading(24);
      text("What looked simple from the outside\nrequired constant effort.\nFiltering. Adapting. Pushing through.\nNot everyone can see that work. But it's real.",
           w/2, h * 0.20);

      // ── Per-level star breakdown ──────────────────────────────────────
      const BREAKDOWN_Y = h * 0.43;
      const LEVEL_NAMES = ['Level 1: Home', 'Level 2: The Street', 'Level 3: The Park'];
      fill(10, 10, 40, 200);
      rect(w/2 - 220, BREAKDOWN_Y - 10, 440, 100, 8);
      stroke(80, 100, 180, 140);
      strokeWeight(1);
      noFill();
      rect(w/2 - 219, BREAKDOWN_Y - 10, 440, 100, 8);
      noStroke();

      fill(200, 220, 255);
      textSize(11);
      textAlign(CENTER, TOP);
      textFont('monospace');
      text('SCORE BREAKDOWN', w/2, BREAKDOWN_Y - 2);

      for (let li = 0; li < 3; li++) {
        const rowY  = BREAKDOWN_Y + 18 + li * 24;
        const score = levelStarScores[li] !== undefined ? levelStarScores[li] : 0;
        fill(160, 185, 220);
        textSize(11);
        textAlign(LEFT, CENTER);
        text(LEVEL_NAMES[li], w/2 - 200, rowY);
        // Mini stars
        for (let si = 0; si < 3; si++) {
          if (si < score) {
            fill(255, 215, 0); stroke(160, 120, 0); strokeWeight(1);
          } else {
            fill(50, 50, 70); stroke(90, 90, 110); strokeWeight(1);
          }
          textSize(16);
          textAlign(LEFT, CENTER);
          text('★', w/2 + 80 + si * 22, rowY);
        }
        noStroke();
      }

      // ── Grand total star rating ───────────────────────────────────────
      this._drawStarRating(w/2, h * 0.67, totalEarned, totalMax, true, 'TOTAL');

      fill(255, 220, 80, 200);
      textSize(10);
      textAlign(CENTER, TOP);
      noStroke();
      text("1 in 36 people are autistic. Sensory processing differences are real.\nThank you for experiencing a glimpse of that journey.", w/2, h * 0.80);

      const pa = map(sin(frameCount * 0.05), -1, 1, 120, 255);
      fill(255, 255, 255, pa);
      textSize(14);
      text("Press R to play again", w/2, h * 0.89);

    } else {
      // ── Level complete screen ─────────────────────────────────────────
      fill(20, 20, 50, 210);
      rect(w/2 - 270, h * 0.09, 540, h * 0.80, 12);
      stroke(120, 160, 240, 160);
      strokeWeight(2);
      noFill();
      rect(w/2 - 269, h * 0.09, 540, h * 0.80, 12);
      noStroke();

      fill(230, 240, 255);
      textSize(32);
      textAlign(CENTER, TOP);
      textFont('monospace');
      text("Level Complete!", w/2, h * 0.13);

      // Level name badge
      fill(40, 60, 140, 200);
      rect(w/2 - 140, h * 0.22, 280, 28, 6);
      fill(180, 210, 255);
      textSize(13);
      textAlign(CENTER, CENTER);
      text(level.name.toUpperCase(), w/2, h * 0.22 + 14);

      // ── Star rating ───────────────────────────────────────────────────
      this._drawStarRating(w/2, h * 0.41, starsCollected, totalStars, false);

      // Flavour text keyed to star count
      const flavours = [
        "You got through it. That's what matters.",
        "One star! Every step forward counts.",
        "Two stars! You pushed through the noise.",
        "Three stars! You navigated everything perfectly.",
      ];
      fill(180, 210, 255, 220);
      textSize(13);
      textAlign(CENTER, TOP);
      noStroke();
      text(flavours[starsCollected], w/2, h * 0.57);

      // Show cumulative score so far
      const runTotal = levelStarScores.reduce((a, b) => a + b, 0);
      const levelsPlayed = levelStarScores.length;
      fill(160, 180, 220, 180);
      textSize(11);
      text(`Run total:  ${runTotal} / ${levelsPlayed * totalStars}  stars  across  ${levelsPlayed}  level${levelsPlayed !== 1 ? 's' : ''}`, w/2, h * 0.65);

      if (starsCollected < totalStars) {
        fill(255, 200, 70, 150);
        textSize(10);
        text("Tip: stars near orange noise zones are riskier — but worth more glory.", w/2, h * 0.72);
      }

      const pa = map(sin(frameCount * 0.07), -1, 1, 120, 255);
      fill(255, 255, 255, pa);
      textSize(15);
      text("Press ENTER to continue", w/2, h * 0.83);
    }
    pop();
  }

  // Helper: draws the star rating widget centred at (cx, cy)
  // label: optional text shown above the stars
  _drawStarRating(cx, cy, earned, total, large, label = '') {
    const SIZE   = large ? 44 : 38;
    const GAP    = large ? 10 : 8;
    const totalW = total * SIZE + (total - 1) * GAP;
    const startX = cx - totalW / 2;

    push();

    if (label) {
      fill(200, 200, 220, 200);
      noStroke();
      textSize(10);
      textAlign(CENTER, BOTTOM);
      textFont('monospace');
      text(label, cx, cy - SIZE / 2 - 4);
    }

    for (let i = 0; i < total; i++) {
      const sx     = startX + i * (SIZE + GAP) + SIZE / 2;
      const isOn   = i < earned;
      const delay  = i * 14;
      const reveal = constrain(frameCount - delay, 0, 20) / 20;

      // Glow
      if (isOn) {
        noStroke();
        fill(255, 215, 0, 55 * reveal);
        ellipse(sx, cy, SIZE * 1.9 * reveal, SIZE * 1.9 * reveal);
      }

      // Glyph
      if (isOn) {
        fill(255, 215, 0);
        stroke(170, 110, 0);
        strokeWeight(large ? 2 : 1.5);
      } else {
        fill(48, 48, 68);
        stroke(88, 88, 108);
        strokeWeight(1);
      }
      textSize(SIZE * reveal);
      textAlign(CENTER, CENTER);
      textFont('monospace');
      text('★', sx, cy);

      // Shine on earned
      if (isOn && reveal >= 1) {
        fill(255, 255, 200, 190);
        noStroke();
        textSize(SIZE * 0.42);
        text('★', sx - 3, cy - 4);
      }
    }

    // Count label
    noStroke();
    fill(190, 195, 215, 200);
    textSize(large ? 12 : 10);
    textAlign(CENTER, TOP);
    text(`${earned} / ${total}  stars`, cx, cy + SIZE / 2 + 6);
    pop();
  }

  // ── Overload overlay ──────────────────────────────────────────────────
  drawOverloadRestart(w, h, alpha) {
    if (alpha <= 0) return;
    push();
    fill(255, 60, 60, alpha);
    rect(0, 0, w, h);
    if (alpha > 100) {
      fill(255, 255, 255, alpha);
      textSize(24);
      textAlign(CENTER, CENTER);
      textFont('monospace');
      text("Sensory overload!", w/2, h/2 - 20);
      textSize(14);
      text("You've been sent back to the start.", w/2, h/2 + 16);
    }
    pop();
  }
}
