/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VFile } from './fileSystem';

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  files: Record<string, VFile>;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'material3-expressive',
    name: 'Material 3 Expressive Web App',
    description: 'Modern interactive application showcasing Material 3 Expressive tokens, animations, and typography.',
    category: 'Web App',
    files: {
      'index.html': {
        path: 'index.html',
        name: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Material 3 Expressive Experience</title>
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,1,0..200" />
</head>
<body>
  <div class="m3-app-container">
    <header class="m3-top-bar">
      <div class="m3-brand">
        <span class="material-symbols-rounded">auto_awesome</span>
        <h1>Expressive Studio</h1>
      </div>
      <div class="m3-actions">
        <button id="themeToggle" class="m3-icon-btn" aria-label="Toggle Theme">
          <span class="material-symbols-rounded">dark_mode</span>
        </button>
      </div>
    </header>

    <main class="m3-content">
      <section class="m3-hero-card">
        <span class="m3-badge">Material 3 Expressive</span>
        <h2>Build, Edit, Preview & Export</h2>
        <p>Extract any .zip archive directly in the browser, tweak code in real time, and synchronize to GitHub with full branch management.</p>
        <div class="m3-button-row">
          <button id="primaryBtn" class="m3-filled-btn">
            <span class="material-symbols-rounded">rocket_launch</span>
            Explore Features
          </button>
          <button id="secondaryBtn" class="m3-tonal-btn">
            <span class="material-symbols-rounded">code</span>
            View Source
          </button>
        </div>
      </section>

      <section class="m3-grid">
        <div class="m3-card" id="card1">
          <div class="m3-card-icon">
            <span class="material-symbols-rounded">folder_zip</span>
          </div>
          <h3>Client-Side Zip Unpacking</h3>
          <p>Extracts archives into memory instantaneously with 100% privacy—no server upload required.</p>
          <div class="m3-card-stat">
            <span id="clickCounter" class="stat-num">0</span>
            <span class="stat-label">Interactions</span>
          </div>
          <button id="counterBtn" class="m3-outlined-btn">
            <span class="material-symbols-rounded">touch_app</span>
            Interact
          </button>
        </div>

        <div class="m3-card" id="card2">
          <div class="m3-card-icon">
            <span class="material-symbols-rounded">terminal</span>
          </div>
          <h3>Real-Time Terminal</h3>
          <p>Inspect preview console logs, run virtual terminal commands, and review system diagnostics.</p>
          <button id="logBtn" class="m3-outlined-btn">
            <span class="material-symbols-rounded">bug_report</span>
            Log Test Message
          </button>
        </div>

        <div class="m3-card" id="card3">
          <div class="m3-card-icon">
            <span class="material-symbols-rounded">sync</span>
          </div>
          <h3>GitHub Version Control</h3>
          <p>Switch branches, inspect git diffs, review pull requests, and commit your changes securely via OAuth.</p>
          <button id="statusBtn" class="m3-outlined-btn">
            <span class="material-symbols-rounded">check_circle</span>
            Check Git Status
          </button>
        </div>
      </section>
    </main>

    <footer class="m3-footer">
      <p>Crafted with Material 3 Expressive & Google Material Symbols Rounded (FILL 1)</p>
    </footer>
  </div>

  <script src="app.js"></script>
</body>
</html>`,
        isBinary: false,
        size: 3200,
        lastModified: Date.now(),
      },
      'style.css': {
        path: 'style.css',
        name: 'style.css',
        content: `/* Material 3 Expressive Design System */
:root {
  --md-sys-color-primary: #a8c7fa;
  --md-sys-color-on-primary: #003062;
  --md-sys-color-primary-container: #00468b;
  --md-sys-color-on-primary-container: #d6e3ff;
  --md-sys-color-surface: #121316;
  --md-sys-color-surface-container: #1e1f22;
  --md-sys-color-surface-container-high: #2b2d30;
  --md-sys-color-on-surface: #e2e2e6;
  --md-sys-color-on-surface-variant: #c4c6d0;
  --md-sys-color-outline: #43474e;
  --md-sys-shape-corner-medium: 16px;
  --md-sys-shape-corner-large: 24px;
  --md-sys-shape-corner-full: 9999px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  min-height: 100vh;
  line-height: 1.5;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Material Symbols Rounded: FILL 1 */
.material-symbols-rounded {
  font-family: 'Material Symbols Rounded', sans-serif;
  font-weight: normal;
  font-style: normal;
  font-size: 22px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

.m3-app-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.m3-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: var(--md-sys-color-surface-container);
  border-radius: var(--md-sys-shape-corner-large);
  border: 1px solid var(--md-sys-color-outline);
  margin-bottom: 2rem;
}

.m3-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--md-sys-color-primary);
}

.m3-brand h1 {
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--md-sys-color-on-surface);
}

.m3-icon-btn {
  background: transparent;
  border: none;
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--md-sys-shape-corner-full);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.m3-icon-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.m3-hero-card {
  background: linear-gradient(135deg, rgba(0, 70, 139, 0.35) 0%, rgba(30, 31, 34, 0.8) 100%);
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-corner-large);
  padding: 2.5rem;
  margin-bottom: 2rem;
}

.m3-badge {
  display: inline-block;
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  padding: 0.35rem 0.85rem;
  border-radius: var(--md-sys-shape-corner-full);
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.m3-hero-card h2 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.m3-hero-card p {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 1.05rem;
  max-width: 700px;
  margin-bottom: 1.5rem;
}

.m3-button-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.m3-filled-btn {
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: var(--md-sys-shape-corner-full);
  font-weight: 600;
  font-size: 0.95rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.2s;
}

.m3-filled-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(168, 199, 250, 0.3);
}

.m3-tonal-btn {
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface);
  border: 1px solid var(--md-sys-color-outline);
  padding: 0.75rem 1.5rem;
  border-radius: var(--md-sys-shape-corner-full);
  font-weight: 500;
  font-size: 0.95rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: background 0.2s;
}

.m3-tonal-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.m3-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.m3-card {
  background: var(--md-sys-color-surface-container);
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-corner-medium);
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, border-color 0.2s;
}

.m3-card:hover {
  transform: translateY(-3px);
  border-color: var(--md-sys-color-primary);
}

.m3-card-icon {
  width: 48px;
  height: 48px;
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-primary);
  border-radius: var(--md-sys-shape-corner-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.25rem;
}

.m3-card h3 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.m3-card p {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
  flex-grow: 1;
}

.m3-card-stat {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.stat-num {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--md-sys-color-primary);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--md-sys-color-on-surface-variant);
}

.m3-outlined-btn {
  background: transparent;
  border: 1px solid var(--md-sys-color-outline);
  color: var(--md-sys-color-on-surface);
  padding: 0.6rem 1.2rem;
  border-radius: var(--md-sys-shape-corner-full);
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.m3-outlined-btn:hover {
  border-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-primary);
}

.m3-footer {
  margin-top: auto;
  text-align: center;
  padding: 1.5rem 0;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 0.85rem;
  border-top: 1px solid var(--md-sys-color-outline);
}
`,
        isBinary: false,
        size: 4500,
        lastModified: Date.now(),
      },
      'app.js': {
        path: 'app.js',
        name: 'app.js',
        content: `/**
 * Material 3 Expressive Application Logic
 * Interactive handlers, console messaging, and theme management
 */

console.log("🚀 Expressive Studio initialized! Ready for development.");

let count = 0;
const clickCounter = document.getElementById("clickCounter");
const counterBtn = document.getElementById("counterBtn");
const logBtn = document.getElementById("logBtn");
const statusBtn = document.getElementById("statusBtn");
const themeToggle = document.getElementById("themeToggle");

// Interaction counter
if (counterBtn && clickCounter) {
  counterBtn.addEventListener("click", () => {
    count++;
    clickCounter.textContent = count;
    console.log(\`[User Event] Interaction count incremented to \${count}\`);
  });
}

// Log test button
if (logBtn) {
  logBtn.addEventListener("click", () => {
    console.info("[Info] Inspecting preview runtime state: OK");
    console.warn("[Warning] Simulated performance check: Render time is 4.2ms");
  });
}

// Git Status check
if (statusBtn) {
  statusBtn.addEventListener("click", () => {
    console.log("[Git VCS] Checking working branch status: clean on main");
  });
}

// Theme toggle
let isDark = true;
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    isDark = !isDark;
    if (isDark) {
      document.body.style.backgroundColor = "#121316";
      document.body.style.color = "#e2e2e6";
      console.log("[Theme] Switched to Material Dark theme");
    } else {
      document.body.style.backgroundColor = "#fdfcff";
      document.body.style.color = "#1a1c1e";
      console.log("[Theme] Switched to Material Light theme");
    }
  });
}
`,
        isBinary: false,
        size: 1500,
        lastModified: Date.now(),
      },
      'README.md': {
        path: 'README.md',
        name: 'README.md',
        content: `# Material 3 Expressive Project

This project was extracted directly in the browser using ZipStudio.

## Features Included
- **Material 3 Expressive Styling**: Built with modern tokens, elevation, and rounded design.
- **Google Material Symbols**: Uses the rounded filled version with variable fonts.
- **Interactive JavaScript**: Full live console messaging and event handling.
- **Instant Preview**: Changes in the editor reflect automatically in the preview window.
- **Version Control Ready**: Synchronize, commit, and branch directly to GitHub.
`,
        isBinary: false,
        size: 600,
        lastModified: Date.now(),
      },
    },
  },
  {
    id: 'arcade-game',
    name: 'HTML5 Retro Arcade Canvas Game',
    description: 'A smooth 60 FPS playable arcade game using HTML5 Canvas, keyboard controls, and particle effects.',
    category: 'Game',
    files: {
      'index.html': {
        path: 'index.html',
        name: 'index.html',
        content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Space Blaster - Retro Canvas Game</title>
  <style>
    body { margin: 0; background: #0a0b10; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
    #gameCanvas { background: #0f111a; border: 2px solid #6750a4; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
    .hud { margin-top: 10px; font-size: 18px; display: flex; gap: 20px; }
  </style>
</head>
<body>
  <div class="hud">
    <div>Score: <span id="scoreDisplay">0</span></div>
    <div>Lives: <span id="livesDisplay">3</span></div>
  </div>
  <canvas id="gameCanvas" width="480" height="400"></canvas>
  <p style="font-size: 13px; color: #888;">Use Left/Right arrow keys or A/D to move, Spacebar to shoot.</p>
  <script src="game.js"></script>
</body>
</html>`,
        isBinary: false,
        size: 900,
        lastModified: Date.now(),
      },
      'game.js': {
        path: 'game.js',
        name: 'game.js',
        content: `const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const livesDisplay = document.getElementById("livesDisplay");

let score = 0;
let lives = 3;
let player = { x: canvas.width / 2 - 15, y: canvas.height - 30, w: 30, h: 20, speed: 6 };
let bullets = [];
let enemies = [];
let keys = {};

window.addEventListener("keydown", (e) => { keys[e.key] = true; if (e.code === "Space") shoot(); });
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

function shoot() {
  bullets.push({ x: player.x + player.w / 2 - 2, y: player.y, w: 4, h: 10, speed: 8 });
  console.log("Pew! Bullet fired.");
}

function spawnEnemy() {
  enemies.push({ x: Math.random() * (canvas.width - 24), y: -20, w: 24, h: 20, speed: 2 });
}
setInterval(spawnEnemy, 1200);

function update() {
  if (keys["ArrowLeft"] || keys["a"]) player.x = Math.max(0, player.x - player.speed);
  if (keys["ArrowRight"] || keys["d"]) player.x = Math.min(canvas.width - player.w, player.x + player.speed);

  // Update bullets
  bullets.forEach((b, i) => {
    b.y -= b.speed;
    if (b.y < 0) bullets.splice(i, 1);
  });

  // Update enemies
  enemies.forEach((e, i) => {
    e.y += e.speed;
    if (e.y > canvas.height) {
      enemies.splice(i, 1);
      lives--;
      livesDisplay.textContent = lives;
      if (lives <= 0) {
        console.warn("Game Over! Final score: " + score);
        lives = 3;
        score = 0;
        scoreDisplay.textContent = score;
        livesDisplay.textContent = lives;
      }
    }

    // Check collision with bullets
    bullets.forEach((b, bi) => {
      if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
        enemies.splice(i, 1);
        bullets.splice(bi, 1);
        score += 100;
        scoreDisplay.textContent = score;
        console.log("Enemy hit! Score: " + score);
      }
    });
  });

  // Draw
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Player
  ctx.fillStyle = "#a8c7fa";
  ctx.beginPath();
  ctx.moveTo(player.x + player.w / 2, player.y);
  ctx.lineTo(player.x, player.y + player.h);
  ctx.lineTo(player.x + player.w, player.y + player.h);
  ctx.fill();

  // Bullets
  ctx.fillStyle = "#ffd54f";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));

  // Enemies
  ctx.fillStyle = "#ff8585";
  enemies.forEach(e => ctx.fillRect(e.x, e.y, e.w, e.h));

  requestAnimationFrame(update);
}

console.log("Game loop starting!");
requestAnimationFrame(update);
`,
        isBinary: false,
        size: 2200,
        lastModified: Date.now(),
      },
    },
  },
];
