/*
  app.js
  ------
  Handles UI injection, assignment, rendering, and data submission.
*/

const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzmElShQEjYlW6zC53SqCrbvzyfGUVqRc-U40jcwDUOA92RCzoH_cMDH_Iz7Vd-iu7-Yg/exec";
const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSc2-jL51ym2ULbT3LTmIY8GJyIP6DEtHGvJ8CyG5SSPCsSsKg/viewform?usp=header";

// ---- Screens ----
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ---- UI condition assignment ----
async function assignUIType(username) {
  try {
    const res = await fetch(WEBAPP_URL, { method: "GET" });
    if (!res.ok) throw new Error(`Assignment request failed: ${res.status}`);
    const data = await res.json();
    if (data.uiType === "minimal" || data.uiType === "complex") {
      return data.uiType;
    }
    throw new Error(`Unexpected assignment response: ${JSON.stringify(data)}`);
  } catch (err) {
    console.error("assignUIType: falling back to random assignment:", err);
    return Math.random() < 0.5 ? "minimal" : "complex";
  }
}

// ---- Data submission ----
function buildPayload(username, uiType, state) {
  return {
    playerID: username,
    score: state.score,
    timePlayed: state.timePlayed,
    uiType: uiType,
    errorCount: state.errorCount,
  };
}

function sendSessionData(payload) {
  return fetch(WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
}

// ---- UI Templates ----

const BOARD_HTML = `
  <div class="game-viewport" id="game-viewport">
    <div class="road-container">
      <div class="road-surface" id="road-surface">
        <div class="lane-divider left"></div>
        <div class="lane-divider right"></div>
        <div class="player" id="player"></div>
      </div>
    </div>
    
    <div id="game-over-overlay">
      <h2>Game Over</h2>
      <p>Saving results...</p>
    </div>
  </div>
`;

function renderMinimalUI(username) {
  document.getElementById("game-screen").innerHTML = `
    <div class="hud-minimal">
      <span>Player: <strong>${username}</strong></span>
      <span>Score: <strong id="score-value">0</strong></span>
      <button class="minimal-pause-btn" id="pause-btn">||</button>
    </div>
    ${BOARD_HTML}
  `;
  document.getElementById("pause-btn").addEventListener("click", togglePause);
}

function renderComplexUI() {
  document.getElementById("game-screen").innerHTML = `
    <div class="top-bar-complex">
      <div class="complex-profile">
        <div class="profile-icon"></div>
        <span class="complex-level">LVL 42</span>
      </div>
      <div style="font-weight:900; color:#ffcc00; font-size:1.2rem;">🪙 <span id="coin-value">0</span></div>
    </div>
    
    <div class="ad-banner">UNLOCK PREMIUM HEROES NOW!</div>
    
    <div class="complex-hud">
      <div class="hud-panel">
        <span>Score</span>
        <strong id="score-value">0</strong>
      </div>
      <div class="hud-panel">
        <span>Distance</span>
        <strong id="distance-value">0m</strong>
      </div>
      <div class="hud-panel">
        <span>Multiplier</span>
        <strong id="multiplier-value">x2.5</strong>
      </div>
    </div>
    
    <div class="complex-sidebar">
      <button class="sidebar-btn">🏆</button>
      <button class="sidebar-btn" id="settings-btn">⚙️</button>
      <button class="sidebar-btn" id="pause-btn">⏸️</button>
      <button class="sidebar-btn" style="background:#00ffcc; border-color:#009977;">🎁</button>
    </div>
    
    <div class="complex-mission">
      <h4>Daily Mission</h4>
      <p>Dodge 50 Obstacles (In Progress)</p>
    </div>
    
    ${BOARD_HTML}

    <div id="settings-modal" class="complex-modal">
      <div class="complex-modal-content">
        <h3>Settings</h3>
        <label><input type="checkbox" checked /> Music</label><br><br>
        <label><input type="checkbox" checked /> SFX</label><br><br>
        <button id="close-settings-btn">Close</button>
      </div>
    </div>
  `;
  
  document.getElementById("pause-btn").addEventListener("click", togglePause);
  document.getElementById("settings-btn").addEventListener("click", () => {
    document.getElementById("settings-modal").classList.add("open");
  });
  document.getElementById("close-settings-btn").addEventListener("click", () => {
    document.getElementById("settings-modal").classList.remove("open");
  });

  // Randomly increment coins to add cognitive load
  setInterval(() => {
    const state = Game.getState();
    if (state && !state.paused && !state.ended) {
      const coinEl = document.getElementById("coin-value");
      if (coinEl) {
        coinEl.textContent = parseInt(coinEl.textContent) + Math.floor(Math.random() * 5);
      }
    }
  }, 2000);
}

// ---- Game Rendering / DOM Updates ----

let obstacleNodes = {}; // map of id to DOM element

function updateDOM(state) {
  // Update HUD
  const scoreEl = document.getElementById("score-value");
  if (scoreEl) scoreEl.textContent = state.score;
  
  const distEl = document.getElementById("distance-value");
  if (distEl) distEl.textContent = Math.floor(state.distance) + "m";

  // Update Player position
  const playerEl = document.getElementById("player");
  if (playerEl) {
    // Lanes: 0 (left: 16.6%), 1 (center: 50%), 2 (right: 83.3%)
    const lanePositions = [16.66, 50, 83.33];
    playerEl.style.left = lanePositions[state.lane] + "%";
  }

  // Update Obstacles
  const surface = document.getElementById("road-surface");
  if (surface) {
    // Add new
    state.obstacles.forEach(obs => {
      if (!obstacleNodes[obs.id]) {
        const el = document.createElement("div");
        el.className = "obstacle";
        const lanePositions = [16.66, 50, 83.33];
        el.style.left = lanePositions[obs.lane] + "%";
        surface.appendChild(el);
        obstacleNodes[obs.id] = el;
      }
      
      // Update position
      const el = obstacleNodes[obs.id];
      // obs.y is 0 to 100 relative to screen
      el.style.top = obs.y + "%";
    });

    // Remove old
    const currentIds = new Set(state.obstacles.map(o => o.id));
    for (const id in obstacleNodes) {
      if (!currentIds.has(id)) {
        obstacleNodes[id].remove();
        delete obstacleNodes[id];
      }
    }
  }

  if (state.ended) {
    const overlay = document.getElementById("game-over-overlay");
    if (overlay) overlay.classList.add("active");
  }
}

// ---- Input Handling ----

function handleKeyDown(e) {
  if (e.key === "ArrowLeft" || e.key === "a") Game.moveLeft();
  if (e.key === "ArrowRight" || e.key === "d") Game.moveRight();
}

let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}

function handleTouchEnd(e) {
  const touchEndX = e.changedTouches[0].screenX;
  const touchEndY = e.changedTouches[0].screenY;
  
  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;
  
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
    if (dx > 0) Game.moveRight();
    else Game.moveLeft();
  }
}

function attachInputListeners() {
  window.addEventListener("keydown", handleKeyDown);
  const viewport = document.getElementById("game-screen");
  viewport.addEventListener("touchstart", handleTouchStart, { passive: true });
  viewport.addEventListener("touchend", handleTouchEnd, { passive: true });
}

function removeInputListeners() {
  window.removeEventListener("keydown", handleKeyDown);
  // Touch listeners are attached to the element so they will be destroyed when innerHTML changes, 
  // but good practice to remove window listeners.
}

function togglePause() {
  const state = Game.getState();
  if (!state || state.ended) return;
  if (state.paused) {
    Game.start(); // resumes
  } else {
    Game.pause();
  }
}

// ---- Game Lifecycle ----

function onGameEnd(state, username, uiType) {
  removeInputListeners();
  
  // Wait a moment so player sees game over screen
  setTimeout(() => {
    showScreen("end-screen");
    document.getElementById("end-title").textContent = `Session complete, ${username}!`;
    
    const payload = buildPayload(username, uiType, state);
    sendSessionData(payload)
      .catch((err) => console.error("Failed to log session data:", err))
      .finally(() => {
        window.location.href = FORM_URL;
      });
  }, 1500);
}

function startGame(username, uiType) {
  showScreen("game-screen");
  document.body.className = uiType === "complex" ? "ui-complex" : "ui-minimal";

  if (uiType === "complex") {
    renderComplexUI();
  } else {
    renderMinimalUI(username);
  }
  
  obstacleNodes = {}; // reset
  attachInputListeners();

  Game.init({
    onUpdate: updateDOM,
    onGameEnd: (state) => onGameEnd(state, username, uiType),
  });
  
  Game.start();
}

// ---- Startup ----

async function handleStart() {
  const input = document.getElementById("username-input");
  const errorEl = document.getElementById("username-error");
  const startBtn = document.getElementById("start-btn");
  const username = input.value.trim();

  if (!username) {
    errorEl.textContent = "Please enter a username.";
    return;
  }

  errorEl.textContent = "";
  startBtn.disabled = true;
  startBtn.textContent = "Loading…";

  const uiType = await assignUIType(username);
  startGame(username, uiType);
}

document.getElementById("start-btn").addEventListener("click", handleStart);
document.getElementById("username-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleStart();
});
