/**
 * Mode B: KeyMagnet (Keyboard Precision) Game Engine
 * Features:
 * - Generates target keys dynamically from curated practice arrays (Home Row, Full Alpha, etc.)
 * - Circular precision timer countdown per target
 * - Visual target magnet display with virtual keyboard sync
 * - Tracks exact millisecond response times, accuracy, streak, and errors
 * - Distinct win/completion criteria (Sequence complete) and failure timeouts
 * - Clean state lifecycle and interval/RAF management
 */
class KeyMagnetGame {
  constructor({
    targetDisplayElement,
    timerBarElement,
    virtualKeyboard,
    particleSystem,
    soundManager,
    onProgressUpdate,
    onScoreUpdate,
    onTimeUpdate,
    onGameComplete
  }) {
    this.targetDisplay = targetDisplayElement;
    this.timerBar = timerBarElement;
    this.virtualKeyboard = virtualKeyboard;
    this.particleSystem = particleSystem;
    this.soundManager = soundManager;
    this.onProgressUpdate = onProgressUpdate;
    this.onScoreUpdate = onScoreUpdate;
    this.onTimeUpdate = onTimeUpdate;
    this.onGameComplete = onGameComplete;

    this.keySets = {
      'home-row': ['A', 'S', 'D', 'F', 'J', 'K', 'L', ';'],
      'top-row': ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      'bottom-row': ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
      'full-alpha': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
      'numbers-symbols': ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', ';', ',', '.']
    };

    this.difficultyConfigs = {
      easy: {
        timeLimitMs: 4000,
        defaultKeySet: 'home-row',
        baseScore: 20,
        penaltyScore: 5
      },
      medium: {
        timeLimitMs: 2400,
        defaultKeySet: 'full-alpha',
        baseScore: 35,
        penaltyScore: 10
      },
      hard: {
        timeLimitMs: 1400,
        defaultKeySet: 'numbers-symbols',
        baseScore: 50,
        penaltyScore: 15
      }
    };

    this.currentDifficulty = 'easy';
    this.currentKeySetKey = 'home-row';
    this.config = this.difficultyConfigs.easy;

    // Session time management (seconds)
    this.timeLimitSeconds = 300; // 5 mins default
    this.elapsedSeconds = 0;
    this.accumulatedElapsed = 0;
    this.sessionStartTime = 0;
    this.sessionRafId = null;

    // Game session state
    this.isRunning = false;
    this.isPaused = false;
    this.currentTarget = null;
    this.nextTarget = null;
    this.targetStartTime = 0;
    this.timerRafId = null;

    this.sequenceIndex = 0;
    this.score = 0;
    this.correctCount = 0;
    this.incorrectCount = 0;
    this.timeoutCount = 0;
    this.responseTimes = [];
    this.currentStreak = 0;
    this.maxStreak = 0;
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

  setKeySet(keySetKey) {
    if (this.keySets[keySetKey]) {
      this.currentKeySetKey = keySetKey;
      if (this.virtualKeyboard) {
        this.virtualKeyboard.highlightActiveSet(this.keySets[keySetKey]);
      }
    }
  }

  start() {
    this.reset();
    this.isRunning = true;
    this.isPaused = false;
    this.accumulatedElapsed = 0;
    this.sessionStartTime = performance.now();

    // Apply active key set highlighting
    const activeChars = this.keySets[this.currentKeySetKey];
    if (this.virtualKeyboard) {
      this.virtualKeyboard.highlightActiveSet(activeChars);
    }

    this.sequenceIndex = 0;
    this.score = 0;
    this.correctCount = 0;
    this.incorrectCount = 0;
    this.timeoutCount = 0;
    this.responseTimes = [];
    this.currentStreak = 0;
    this.maxStreak = 0;

    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.timeLimitSeconds, this.timeLimitSeconds);
    }

    this.sessionTimerLoop = (timestamp) => {
      if (!this.isRunning || this.isPaused) return;

      this.elapsedSeconds = this.accumulatedElapsed + (timestamp - this.sessionStartTime) / 1000;
      const remainingSeconds = Math.max(0, this.timeLimitSeconds - this.elapsedSeconds);

      if (this.onTimeUpdate) {
        this.onTimeUpdate(remainingSeconds, this.timeLimitSeconds);
      }

      if (remainingSeconds <= 0) {
        this.completeGame('timeup');
        return;
      }

      this.sessionRafId = requestAnimationFrame(this.sessionTimerLoop);
    };

    this.sessionRafId = requestAnimationFrame(this.sessionTimerLoop);

    this.nextTarget = this.getRandomTarget();
    this.spawnNextTarget();

    this.updateStatsUI();
  }

  getRandomTarget() {
    const list = this.keySets[this.currentKeySetKey] || this.keySets['home-row'];
    let chosen = list[Math.floor(Math.random() * list.length)];
    // Avoid immediate duplicate if array has more than 1 item
    if (list.length > 1 && chosen === this.currentTarget) {
      const filtered = list.filter(k => k !== this.currentTarget);
      chosen = filtered[Math.floor(Math.random() * filtered.length)];
    }
    return chosen;
  }

  spawnNextTarget() {
    if (!this.isRunning) return;

    this.sequenceIndex += 1;
    this.currentTarget = this.nextTarget || this.getRandomTarget();
    this.nextTarget = this.getRandomTarget();

    // Visual magnet display
    if (this.targetDisplay) {
      this.targetDisplay.textContent = this.currentTarget;
      this.targetDisplay.classList.remove('pulse-target');
      void this.targetDisplay.offsetWidth; // Force CSS reflow
      this.targetDisplay.classList.add('pulse-target');
    }

    // Update preview of upcoming key
    const previewEl = document.getElementById('keymagnet-next-preview');
    if (previewEl) {
      previewEl.textContent = this.nextTarget;
    }

    // Synchronize virtual keyboard target highlight
    if (this.virtualKeyboard) {
      this.virtualKeyboard.setTarget(this.currentTarget);
    }

    this.soundManager.playMagnetLock();
    this.targetStartTime = performance.now();

    // Start timer countdown bar
    this.startCountdown();
    this.updateStatsUI();
  }

  startCountdown() {
    if (this.timerRafId) {
      cancelAnimationFrame(this.timerRafId);
      this.timerRafId = null;
    }

    const timeLimit = this.config.timeLimitMs;
    const startTime = performance.now();

    const tick = (now) => {
      if (!this.isRunning || this.isPaused) return;

      const elapsed = now - startTime;
      const progress = Math.max(0, 1 - (elapsed / timeLimit));

      if (this.timerBar) {
        this.timerBar.style.width = `${progress * 100}%`;
        if (progress < 0.25) {
          this.timerBar.className = 'h-2 rounded-full transition-all duration-75 bg-rose-500 shadow-rose-500/50 shadow-md';
        } else if (progress < 0.5) {
          this.timerBar.className = 'h-2 rounded-full transition-all duration-75 bg-amber-400 shadow-amber-400/50 shadow-md';
        } else {
          this.timerBar.className = 'h-2 rounded-full transition-all duration-75 bg-cyan-400 shadow-cyan-400/50 shadow-md';
        }
      }

      if (elapsed >= timeLimit) {
        // Target expired / timeout miss!
        this.handleTimeout();
      } else {
        this.timerRafId = requestAnimationFrame(tick);
      }
    };

    this.timerRafId = requestAnimationFrame(tick);
  }

  handleTimeout() {
    this.timeoutCount += 1;
    this.currentStreak = 0;
    this.score = Math.max(0, this.score - this.config.penaltyScore);

    this.soundManager.playMiss();

    if (this.virtualKeyboard && this.currentTarget) {
      this.virtualKeyboard.flashKey(this.currentTarget, false);
    }

    this.showTargetFeedback('TIMEOUT!', 'penalty');
    this.spawnNextTarget();
  }

  handleInput(pressedChar) {
    if (!this.isRunning || this.isPaused || !this.currentTarget) return;

    const input = pressedChar.toUpperCase();
    const expected = this.currentTarget.toUpperCase();
    const reactionTime = Math.round(performance.now() - this.targetStartTime);

    if (input === expected) {
      // Correct precision hit!
      this.correctCount += 1;
      this.currentStreak += 1;
      if (this.currentStreak > this.maxStreak) {
        this.maxStreak = this.currentStreak;
      }
      this.responseTimes.push(reactionTime);

      // Speed bonus: faster response = more bonus points
      const speedRatio = Math.max(0, 1 - (reactionTime / this.config.timeLimitMs));
      const speedBonus = Math.round(speedRatio * 20);
      const points = this.config.baseScore + speedBonus;
      this.score += points;

      this.soundManager.playHit(1 + (this.currentStreak % 6) * 0.1);
      if (this.virtualKeyboard) {
        this.virtualKeyboard.flashKey(expected, true);
      }

      // Sparkles
      if (this.particleSystem && this.targetDisplay) {
        const rect = this.targetDisplay.getBoundingClientRect();
        const parentRect = this.particleSystem.canvas.parentElement.getBoundingClientRect();
        const x = rect.left - parentRect.left + rect.width / 2;
        const y = rect.top - parentRect.top + rect.height / 2;
        this.particleSystem.createBurst(x, y, '#10b981', 14);
      }

      this.showTargetFeedback(`+${points} (${reactionTime}ms)`, 'success');
      this.spawnNextTarget();
    } else {
      // Incorrect keypress
      this.incorrectCount += 1;
      this.currentStreak = 0;
      this.score = Math.max(0, this.score - this.config.penaltyScore);

      this.soundManager.playMiss();
      if (this.virtualKeyboard) {
        this.virtualKeyboard.flashKey(input, false);
      }

      this.showTargetFeedback(`-${this.config.penaltyScore}`, 'penalty');
      this.updateStatsUI();
    }
  }

  showTargetFeedback(text, type) {
    const feedbackEl = document.getElementById('keymagnet-live-feedback');
    if (!feedbackEl) return;

    feedbackEl.textContent = text;
    feedbackEl.className = `font-mono font-bold text-sm tracking-wide transition-all duration-150 ${
      type === 'success' ? 'text-emerald-400 scale-110' : 'text-rose-400 shake-feedback'
    }`;

    setTimeout(() => {
      feedbackEl.className = 'font-mono font-bold text-sm tracking-wide text-transparent transition-all duration-150';
    }, 600);
  }

  updateStatsUI() {
    if (this.onProgressUpdate) {
      const avgMs = this.getAverageResponseTime();
      this.onProgressUpdate({
        current: this.sequenceIndex,
        total: this.sequenceLength,
        correct: this.correctCount,
        incorrect: this.incorrectCount + this.timeoutCount,
        streak: this.currentStreak,
        avgResponseTime: avgMs
      });
    }

    if (this.onScoreUpdate) {
      this.onScoreUpdate(this.score, this.currentStreak);
    }
  }

  getAverageResponseTime() {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.responseTimes.length);
  }

  pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.accumulatedElapsed += (performance.now() - this.sessionStartTime) / 1000;
    if (this.sessionRafId) {
      cancelAnimationFrame(this.sessionRafId);
      this.sessionRafId = null;
    }
  }

  resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.sessionStartTime = performance.now();
    if (this.sessionTimerLoop) {
      this.sessionRafId = requestAnimationFrame(this.sessionTimerLoop);
    }
    this.startCountdown();
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.timerRafId) {
      cancelAnimationFrame(this.timerRafId);
      this.timerRafId = null;
    }
    if (this.sessionRafId) {
      cancelAnimationFrame(this.sessionRafId);
      this.sessionRafId = null;
    }
    if (this.virtualKeyboard) {
      this.virtualKeyboard.setTarget(null);
    }
  }

  reset() {
    this.stop();
    this.score = 0;
    this.sequenceIndex = 0;
    this.correctCount = 0;
    this.incorrectCount = 0;
    this.timeoutCount = 0;
    this.responseTimes = [];
    this.currentStreak = 0;
    this.maxStreak = 0;
    this.currentTarget = null;
    this.nextTarget = null;
    this.elapsedSeconds = 0;
    this.accumulatedElapsed = 0;

    if (this.targetDisplay) {
      this.targetDisplay.textContent = '-';
    }
    if (this.timerBar) {
      this.timerBar.style.width = '100%';
    }
    if (this.virtualKeyboard) {
      this.virtualKeyboard.resetHighlights();
    }
    if (this.particleSystem) {
      this.particleSystem.clear();
    }
  }

  completeGame(reason = 'timeup') {
    this.stop();
    this.soundManager.playGameWin();

    const totalAttempts = this.correctCount + this.incorrectCount + this.timeoutCount;
    const accuracy = totalAttempts > 0
      ? Math.round((this.correctCount / totalAttempts) * 100)
      : 0;

    const avgMs = this.getAverageResponseTime();

    const stats = {
      score: this.score,
      correct: this.correctCount,
      incorrect: this.incorrectCount,
      timeouts: this.timeoutCount,
      maxStreak: this.maxStreak,
      avgResponseTime: avgMs,
      accuracy: accuracy,
      sequenceLength: this.sequenceIndex,
      duration: Math.round(this.elapsedSeconds),
      timeLimit: Math.round(this.timeLimitSeconds / 60),
      reason: reason,
      difficulty: this.currentDifficulty,
      keySet: this.currentKeySetKey,
      mode: 'keymagnet'
    };

    if (this.onGameComplete) {
      this.onGameComplete(stats);
    }
  }
}
