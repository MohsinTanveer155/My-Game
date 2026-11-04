/**
 * Mode A: Bubbles (Letter Recognition) Game Engine
 * Features:
 * - Simultaneous upward-floating bubbles (at least 5 at all times)
 * - Dynamic speed and density scaling as score rises
 * - Immediate visual and auditory feedback on hits/misses/penalties
 * - Boundary collision detection (bubble reaches top = miss)
 * - Penalty system for incorrect keypresses
 * - Clean requestAnimationFrame lifecycle with single-loop guarantee
 */
class BubblesGame {
  constructor({ container, particleSystem, soundManager, onScoreUpdate, onMissUpdate, onTimeUpdate, onGameOver }) {
    this.container = container;
    this.particleSystem = particleSystem;
    this.soundManager = soundManager;
    this.onScoreUpdate = onScoreUpdate;
    this.onMissUpdate = onMissUpdate;
    this.onTimeUpdate = onTimeUpdate;
    this.onGameOver = onGameOver;

    this.bubbles = [];
    this.isRunning = false;
    this.isPaused = false;
    this.animId = null;
    this.lastTime = 0;

    // Time Limit in seconds (1 min = 60, 3 mins = 180, 5 mins = 300, 10 mins = 600)
    this.timeLimitSeconds = 300;
    this.accumulatedElapsed = 0;
    this.pauseStartTime = 0;

    // Difficulty presets
    this.difficultyConfigs = {
      easy: {
        minBubbles: 5,
        maxBubbles: 6,
        baseSpeed: 70, // pixels per second
        speedIncrement: 2.5, // speed increase per 100 pts
        charSet: 'ABCDEFGHJKLMNPQRSTUVWXYZ', // Clean distinct uppercase letters
        hitScore: 10,
        penaltyScore: 5
      },
      medium: {
        minBubbles: 6,
        maxBubbles: 7,
        baseSpeed: 105,
        speedIncrement: 4.5,
        charSet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        hitScore: 15,
        penaltyScore: 8
      },
      hard: {
        minBubbles: 7,
        maxBubbles: 8,
        baseSpeed: 150,
        speedIncrement: 6.0,
        charSet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        hitScore: 25,
        penaltyScore: 12
      }
    };

    this.currentDifficulty = 'easy';
    this.config = this.difficultyConfigs.easy;

    // Game session metrics
    this.score = 0;
    this.misses = 0;
    this.correctHits = 0;
    this.wrongKeys = 0;
    this.totalKeysPressed = 0;
    this.currentStreak = 0;
    this.maxStreak = 0;
    this.startTime = 0;
    this.elapsedSeconds = 0;
  }

  setTimeLimit(seconds) {
    this.timeLimitSeconds = Number(seconds) || 300;
  }

  setDifficulty(difficultyKey) {
    if (this.difficultyConfigs[difficultyKey]) {
      this.currentDifficulty = difficultyKey;
      this.config = this.difficultyConfigs[difficultyKey];
    }
  }

  start() {
    this.reset();
    this.isRunning = true;
    this.isPaused = false;
    this.accumulatedElapsed = 0;
    this.startTime = performance.now();
    this.lastTime = performance.now();

    // Spawn initial batch of bubbles (at least 5)
    for (let i = 0; i < this.config.minBubbles; i++) {
      this.spawnBubble(true);
    }

    this.onScoreUpdate(this.score, this.currentStreak);
    this.onMissUpdate(this.misses);
    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.timeLimitSeconds, this.timeLimitSeconds);
    }

    if (!this._boundLoop) {
      this._boundLoop = (timestamp) => this.loop(timestamp);
    }
    this.animId = requestAnimationFrame(this._boundLoop);
  }

  reset() {
    this.stop();
    this.score = 0;
    this.misses = 0;
    this.correctHits = 0;
    this.wrongKeys = 0;
    this.totalKeysPressed = 0;
    this.currentStreak = 0;
    this.maxStreak = 0;
    this.elapsedSeconds = 0;
    this.accumulatedElapsed = 0;

    // Clear all bubble elements from DOM
    this.bubbles.forEach(b => {
      if (b.element && b.element.parentElement) {
        b.element.parentElement.removeChild(b.element);
      }
    });
    this.bubbles = [];

    if (this.particleSystem) {
      this.particleSystem.clear();
    }
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.accumulatedElapsed += (performance.now() - this.startTime) / 1000;
  }

  resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.startTime = performance.now();
    this.lastTime = performance.now();
    if (!this._boundLoop) {
      this._boundLoop = (timestamp) => this.loop(timestamp);
    }
    this.animId = requestAnimationFrame(this._boundLoop);
  }

  spawnBubble(isInitialBatch = false) {
    if (!this.container) return;

    const containerRect = this.container.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    // Pick random letter from character set (avoid duplicates if possible)
    const activeChars = new Set(this.bubbles.map(b => b.char));
    let availableChars = this.config.charSet.split('').filter(c => !activeChars.has(c));
    if (availableChars.length === 0) {
      availableChars = this.config.charSet.split('');
    }
    const char = availableChars[Math.floor(Math.random() * availableChars.length)];

    // Bubble size
    const size = Math.floor(58 + Math.random() * 16); // 58px to 74px
    const minX = 20;
    const maxX = Math.max(minX + 20, width - size - 20);
    const x = minX + Math.random() * (maxX - minX);

    // Y position: spread across arena if initial batch so bubbles are visible right away
    const safeHeight = Math.max(height, 350);
    let y = isInitialBatch
      ? (80 + Math.random() * (safeHeight - 170))
      : (safeHeight + 10 + Math.random() * 30);

    // Dynamic speed based on score progression
    const speedFactor = 1 + (this.score / 100) * (this.config.speedIncrement / 100);
    const speed = (this.config.baseSpeed * (0.88 + Math.random() * 0.24)) * speedFactor;

    // Aesthetic color variations
    const bubblePalettes = [
      { bg: 'from-cyan-500/30 to-blue-600/50', border: 'border-cyan-400', glow: 'shadow-cyan-500/50', text: 'text-cyan-100' },
      { bg: 'from-violet-500/30 to-purple-600/50', border: 'border-violet-400', glow: 'shadow-violet-500/50', text: 'text-violet-100' },
      { bg: 'from-emerald-500/30 to-teal-600/50', border: 'border-emerald-400', glow: 'shadow-emerald-500/50', text: 'text-emerald-100' },
      { bg: 'from-amber-500/30 to-orange-600/50', border: 'border-amber-400', glow: 'shadow-amber-500/50', text: 'text-amber-100' },
      { bg: 'from-pink-500/30 to-rose-600/50', border: 'border-pink-400', glow: 'shadow-pink-500/50', text: 'text-pink-100' }
    ];
    const palette = bubblePalettes[Math.floor(Math.random() * bubblePalettes.length)];

    // Create DOM element
    const el = document.createElement('div');
    el.className = `game-bubble absolute rounded-full flex items-center justify-center font-extrabold select-none cursor-pointer ` +
      `bg-gradient-to-tr ${palette.bg} border-2 ${palette.border} ${palette.glow} ${palette.text} shadow-lg backdrop-blur-md`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.fontSize = `${Math.floor(size * 0.44)}px`;
    el.textContent = char;

    // Add reflection glare shine
    const glare = document.createElement('div');
    glare.className = 'absolute top-1.5 left-2 w-3 h-2 rounded-full bg-white/50 transform -rotate-45 pointer-events-none';
    el.appendChild(glare);

    // Clicking / tapping on bubble also pops it for mobile accessibility!
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.handleInput(char);
    });

    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    this.container.appendChild(el);

    this.bubbles.push({
      char,
      x,
      y,
      size,
      speed,
      swayFreq: 1.5 + Math.random() * 2,
      swayAmp: 12 + Math.random() * 16,
      swayOffset: Math.random() * Math.PI * 2,
      element: el,
      palette
    });
  }

  handleInput(pressedChar) {
    if (!this.isRunning || this.isPaused) return;

    const char = pressedChar.toUpperCase();
    this.totalKeysPressed += 1;

    // Find matching bubble with lowest Y (i.e. highest on screen or closest to escaping)
    let matchIndex = -1;
    let lowestY = Infinity;

    for (let i = 0; i < this.bubbles.length; i++) {
      if (this.bubbles[i].char === char) {
        if (this.bubbles[i].y < lowestY) {
          lowestY = this.bubbles[i].y;
          matchIndex = i;
        }
      }
    }

    if (matchIndex !== -1) {
      // Correct keypress!
      const bubble = this.bubbles[matchIndex];
      this.correctHits += 1;
      this.currentStreak += 1;
      if (this.currentStreak > this.maxStreak) {
        this.maxStreak = this.currentStreak;
      }

      // Calculate score with streak bonus
      const streakMultiplier = 1 + Math.min(Math.floor(this.currentStreak / 5) * 0.25, 1.5);
      const points = Math.round(this.config.hitScore * streakMultiplier);
      this.score += points;

      // Pop visual & audio feedback
      this.soundManager.playPop();
      if (this.currentStreak % 5 === 0) {
        this.soundManager.playStreak(Math.min(Math.floor(this.currentStreak / 5), 4));
      }

      this.showFloatingFeedback(bubble.x + bubble.size / 2, bubble.y, `+${points}`, 'success');
      if (this.particleSystem) {
        this.particleSystem.createBurst(bubble.x + bubble.size / 2, bubble.y + bubble.size / 2, '#38bdf8', 18);
      }

      // Pop animation and DOM removal
      this.popBubbleElement(bubble.element);
      this.bubbles.splice(matchIndex, 1);

      this.onScoreUpdate(this.score, this.currentStreak);

      // Ensure minimum bubble count is preserved immediately
      if (this.bubbles.length < this.config.minBubbles) {
        this.spawnBubble(false);
      }
    } else {
      // Incorrect keypress penalty
      this.wrongKeys += 1;
      this.currentStreak = 0;
      this.score = Math.max(0, this.score - this.config.penaltyScore);

      this.soundManager.playMiss();
      this.showScreenShake();
      this.showFloatingFeedback(
        window.innerWidth / 2,
        window.innerHeight / 2 - 50,
        `-${this.config.penaltyScore}`,
        'penalty'
      );

      this.onScoreUpdate(this.score, this.currentStreak);
    }
  }

  popBubbleElement(el) {
    if (!el) return;
    el.classList.add('bubble-pop');
    setTimeout(() => {
      if (el.parentElement) {
        el.parentElement.removeChild(el);
      }
    }, 200);
  }

  showFloatingFeedback(x, y, text, type) {
    const floatEl = document.createElement('div');
    floatEl.className = `floating-feedback font-mono font-bold text-lg pointer-events-none absolute z-20 ${
      type === 'success' ? 'text-emerald-400 text-shadow-glow' : 'text-rose-400'
    }`;
    floatEl.style.left = `${x}px`;
    floatEl.style.top = `${y}px`;
    floatEl.textContent = text;
    this.container.appendChild(floatEl);

    setTimeout(() => {
      if (floatEl.parentElement) {
        floatEl.parentElement.removeChild(floatEl);
      }
    }, 700);
  }

  showScreenShake() {
    this.container.classList.add('hit-shake-effect');
    setTimeout(() => {
      this.container.classList.remove('hit-shake-effect');
    }, 300);
  }

  showTopBorderFlash() {
    const dangerZone = document.getElementById('bubble-danger-line');
    if (dangerZone) {
      dangerZone.classList.add('danger-flash');
      setTimeout(() => {
        dangerZone.classList.remove('danger-flash');
      }, 400);
    }
  }

  loop(timestamp) {
    if (!this.isRunning || this.isPaused) return;

    const delta = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    this.elapsedSeconds = this.accumulatedElapsed + (timestamp - this.startTime) / 1000;

    // Time limit countdown management
    const remainingSeconds = Math.max(0, this.timeLimitSeconds - this.elapsedSeconds);
    if (this.onTimeUpdate) {
      this.onTimeUpdate(remainingSeconds, this.timeLimitSeconds);
    }

    if (remainingSeconds <= 0) {
      this.triggerGameOver('timeup');
      return;
    }

    const containerRect = this.container.getBoundingClientRect();
    const topBoundary = 40; // Upper limit threshold (danger zone)

    // Move bubbles upward
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];

      // Vertical movement
      b.y -= b.speed * delta;

      // Horizontal subtle sine sway
      const sway = Math.sin(this.elapsedSeconds * b.swayFreq + b.swayOffset) * b.swayAmp;
      const currentX = b.x + sway;

      // Update DOM transform for optimal 60fps GPU acceleration
      b.element.style.transform = `translate3d(${currentX}px, ${b.y}px, 0)`;

      // Boundary check: bubble reached top
      if (b.y <= topBoundary) {
        // Bubble missed! Counts as a miss, but game continues until time runs out!
        this.misses += 1;
        this.currentStreak = 0;
        this.soundManager.playMiss();
        this.showTopBorderFlash();

        if (this.particleSystem) {
          this.particleSystem.createShockwave(currentX + b.size / 2, topBoundary + 20, '#ef4444');
        }

        this.popBubbleElement(b.element);
        this.bubbles.splice(i, 1);

        this.onMissUpdate(this.misses);
        this.onScoreUpdate(this.score, this.currentStreak);
      }
    }

    // Keep minimum simultaneous bubbles filled
    const targetBubbleCount = Math.min(
      this.config.maxBubbles,
      this.config.minBubbles + Math.floor(this.score / 250)
    );

    if (this.bubbles.length < targetBubbleCount) {
      this.spawnBubble(false);
    }

    if (!this._boundLoop) {
      this._boundLoop = (timestamp) => this.loop(timestamp);
    }
    this.animId = requestAnimationFrame(this._boundLoop);
  }

  triggerGameOver(reason = 'timeup') {
    this.stop();
    this.soundManager.playGameWin(); // Triumphant session finish sound!

    const accuracy = this.totalKeysPressed > 0
      ? Math.round((this.correctHits / this.totalKeysPressed) * 100)
      : 0;

    const stats = {
      score: this.score,
      correct: this.correctHits,
      wrongKeys: this.wrongKeys,
      misses: this.misses,
      maxStreak: this.maxStreak,
      accuracy: accuracy,
      duration: Math.round(this.elapsedSeconds),
      timeLimit: Math.round(this.timeLimitSeconds / 60),
      reason: reason,
      difficulty: this.currentDifficulty,
      mode: 'bubbles'
    };

    if (this.onGameOver) {
      this.onGameOver(stats);
    }
  }
}
