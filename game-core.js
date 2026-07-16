/*
  game-core.js
  ------------
  Pure game logic for the endless runner. It tracks the player's lane,
  obstacle positions, score, and collisions. Does NOT touch the DOM.
*/

const Game = (function () {
  const LANES = 3; // 0: Left, 1: Center, 2: Right
  let state = null;
  let hooks = { onUpdate: () => {}, onGameEnd: () => {} };
  let animationFrameId = null;
  let lastTime = 0;

  // Game Settings
  const BASE_SPEED = 50; // units per second
  const OBSTACLE_SPAWN_RATE = 1500; // ms between spawns
  let lastSpawnTime = 0;

  function init(customHooks) {
    hooks = Object.assign({ onUpdate: () => {}, onGameEnd: () => {} }, customHooks || {});
    state = {
      lane: 1,
      obstacles: [], // { id, lane, y }
      score: 0,
      distance: 0,
      speed: BASE_SPEED,
      startTime: Date.now(),
      timePlayed: 0,
      ended: false,
      paused: false,
      errorCount: 0 // Optional: can track wrong moves if we want, but endless runner usually doesn't have "errors"
    };
    hooks.onUpdate(state);
    return state;
  }

  function start() {
    if (!state || state.ended) return;
    state.paused = false;
    lastTime = performance.now();
    lastSpawnTime = performance.now();
    loop(performance.now());
  }

  function pause() {
    if (state) state.paused = true;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  }

  function moveLeft() {
    if (!state || state.ended || state.paused) return;
    if (state.lane > 0) {
      state.lane--;
      hooks.onUpdate(state);
    }
  }

  function moveRight() {
    if (!state || state.ended || state.paused) return;
    if (state.lane < LANES - 1) {
      state.lane++;
      hooks.onUpdate(state);
    }
  }

  function spawnObstacle(time) {
    const minSpawn = Math.max(500, OBSTACLE_SPAWN_RATE - (state.speed - BASE_SPEED) * 10);
    if (time - lastSpawnTime > minSpawn) {
      state.obstacles.push({
        id: Math.random().toString(36).substr(2, 9),
        lane: Math.floor(Math.random() * LANES),
        y: -20 // Spawn above the screen
      });
      lastSpawnTime = time;
    }
  }

  function updateObstacles(dt) {
    // Move obstacles down
    const yDelta = state.speed * (dt / 1000);
    state.obstacles.forEach(obs => {
      obs.y += yDelta;
    });

    // Remove off-screen obstacles and add to score
    const oldLength = state.obstacles.length;
    state.obstacles = state.obstacles.filter(obs => obs.y < 120);
    
    // Add score for passed obstacles (crudely calculated by distance/time instead)
  }

  function checkCollisions() {
    // Player is roughly at y = 80 to 95 in our relative coordinate system (0 to 100)
    for (let obs of state.obstacles) {
      if (obs.lane === state.lane) {
        if (obs.y > 75 && obs.y < 95) {
          // Collision!
          endGame();
          return;
        }
      }
    }
  }

  function loop(time) {
    if (state.ended || state.paused) return;

    const dt = time - lastTime;
    lastTime = time;

    // Update game logic
    spawnObstacle(time);
    updateObstacles(dt);
    checkCollisions();

    if (!state.ended) {
      state.distance += state.speed * (dt / 1000) * 0.1;
      state.score = Math.floor(state.distance * 10);
      
      // Slowly increase speed over time
      state.speed += (dt / 1000) * 0.5;

      hooks.onUpdate(state);
      animationFrameId = requestAnimationFrame(loop);
    }
  }

  function endGame() {
    if (!state || state.ended) return;
    state.ended = true;
    state.timePlayed = Math.round((Date.now() - state.startTime) / 100) / 10;
    pause();
    hooks.onUpdate(state);
    hooks.onGameEnd(state);
  }

  return {
    init,
    start,
    pause,
    moveLeft,
    moveRight,
    getState: () => state,
  };
})();
