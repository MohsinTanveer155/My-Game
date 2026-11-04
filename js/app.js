/**
 * Main Application Orchestrator / Game Controller
 * Manages view routing, user inputs, HUD states, modal lifecycles,
 * and coordinates Bubbles and KeyMagnet game instances.
 */
class AppController {
  constructor() {
    this.currentView = 'home'; // 'home' | 'gameplay'
    this.activeMode = null; // 'bubbles' | 'keymagnet'
    this.isPaused = false;
    this.lastGameStats = null;

    this.initDOM();
    this.initInstances();
    this.bindEvents();
    this.updateHomeStats();
  }

  initDOM() {
    // Views
    this.viewHome = document.getElementById('view-home');
    this.viewGameplay = document.getElementById('view-gameplay');

    // Modals
    this.modalResults = document.getElementById('modal-results');
    this.modalResultsCard = document.getElementById('modal-results-card');
    this.modalInstructions = document.getElementById('modal-instructions');

    // Navigation & Global buttons
    this.btnNavHome = document.getElementById('btn-nav-home');
    this.btnBrandHome = document.getElementById('btn-brand-home');
    this.btnToggleAudio = document.getElementById('btn-toggle-audio');
    this.audioIcon = document.getElementById('audio-icon');
    this.audioStatusLabel = document.getElementById('audio-status-label');
    this.btnOpenInstructions = document.getElementById('btn-open-instructions');
    this.btnCloseInstructions = document.getElementById('btn-close-instructions');
    this.btnCloseInstructionsFooter = document.getElementById('btn-close-instructions-footer');

    // Home launch controls
    this.btnStartBubbles = document.getElementById('btn-start-bubbles-mode');
    this.bubblesDiffSelect = document.getElementById('bubbles-diff-select');
    this.bubblesTimeSelect = document.getElementById('bubbles-time-select');
    this.btnStartKeyMagnet = document.getElementById('btn-start-keymagnet-mode');
    this.keyMagnetDiffSelect = document.getElementById('keymagnet-diff-select');
    this.keyMagnetKeySetSelect = document.getElementById('keymagnet-keyset-select');
    this.keyMagnetTimeSelect = document.getElementById('keymagnet-time-select');

    // HUD Elements
    this.hudModeIcon = document.getElementById('hud-mode-icon');
    this.hudModeName = document.getElementById('hud-mode-name');
    this.hudDifficultyLabel = document.getElementById('hud-difficulty-label');
    this.hudDetailLabel = document.getElementById('hud-detail-label');
    this.hudMissesCount = document.getElementById('hud-misses-count');
    this.hudScore = document.getElementById('hud-score');
    this.hudStreak = document.getElementById('hud-streak');
    this.hudTimeRemaining = document.getElementById('hud-time-remaining');
    this.hudTimerIcon = document.getElementById('hud-timer-icon');

    // In-Game Controls
    this.btnCtrlPause = document.getElementById('btn-ctrl-pause');
    this.hudPauseIcon = document.getElementById('hud-pause-icon');
    this.hudPauseLabel = document.getElementById('hud-pause-label');
    this.btnCtrlRestart = document.getElementById('btn-ctrl-restart');
    this.btnCtrlReset = document.getElementById('btn-ctrl-reset');

    // Mode-specific arenas
    this.arenaBubbles = document.getElementById('arena-bubbles');
    this.arenaKeyMagnet = document.getElementById('arena-keymagnet');
    this.bubbleSpawnArea = document.getElementById('bubble-spawn-area');
    this.keyMagnetTargetDisplay = document.getElementById('keymagnet-target-display');
    this.keyMagnetTimerBar = document.getElementById('keymagnet-timer-bar');
    this.keyMagnetSeqCounter = document.getElementById('keymagnet-seq-counter');
    this.keyMagnetAvgReaction = document.getElementById('keymagnet-avg-reaction');

    // Virtual Keyboard & Particle Canvas
    this.virtualKeyboardContainer = document.getElementById('virtual-keyboard-container');
    this.keyboardPanelWrapper = document.getElementById('keyboard-panel-wrapper');
    this.btnToggleKeyboard = document.getElementById('btn-toggle-keyboard');
    this.btnToggleKeyboardLabel = document.getElementById('btn-toggle-keyboard-label');
    this.particleCanvas = document.getElementById('game-particle-canvas');

    // Results Modal Elements
    this.resultsModeBadge = document.getElementById('results-mode-badge');
    this.resultsHeadline = document.getElementById('results-headline');
    this.resultsDiff = document.getElementById('results-diff');
    this.resultsGradeText = document.getElementById('results-grade-text');
    this.resultsGradeBadge = document.getElementById('results-grade-badge');
    this.resScore = document.getElementById('res-score');
    this.resAccuracy = document.getElementById('res-accuracy');
    this.resStreak = document.getElementById('res-streak');
    this.resCorrect = document.getElementById('res-correct');
    this.resMisses = document.getElementById('res-misses');
    this.resMissesLabel = document.getElementById('res-misses-label');
    this.resExtraVal = document.getElementById('res-extra-val');
    this.resExtraLabel = document.getElementById('res-extra-label');
    this.resNewRecordAlert = document.getElementById('res-new-record-alert');
    this.btnResultsRetry = document.getElementById('btn-results-retry');
    this.btnResultsHome = document.getElementById('btn-results-home');

    // Home Best Scores Display
    this.homeBestBubbles = document.getElementById('home-best-bubbles');
    this.homeBestKeyMagnet = document.getElementById('home-best-keymagnet');
    this.homeBestStreak = document.getElementById('home-best-streak');
  }

  initInstances() {
    // 1. Particle System
    this.particleSystem = new ParticleSystem(this.particleCanvas);

    // 2. Virtual Keyboard
    this.virtualKeyboard = new VirtualKeyboard(
      this.virtualKeyboardContainer,
      (clickedKey) => this.handleKeyInput(clickedKey)
    );

    // 3. Bubbles Mode Engine
    this.bubblesGame = new BubblesGame({
      container: this.bubbleSpawnArea,
      particleSystem: this.particleSystem,
      soundManager: audio,
      onScoreUpdate: (score, streak) => {
        this.hudScore.textContent = score;
        this.hudStreak.textContent = streak;
      },
      onMissUpdate: (misses) => {
        this.hudMissesCount.textContent = misses;
      },
      onTimeUpdate: (remaining, total) => {
        this.updateHudTimer(remaining, total);
      },
      onGameOver: (stats) => {
        this.handleGameOver(stats);
      }
    });

    // 4. KeyMagnet Mode Engine
    this.keyMagnetGame = new KeyMagnetGame({
      targetDisplayElement: this.keyMagnetTargetDisplay,
      timerBarElement: this.keyMagnetTimerBar,
      virtualKeyboard: this.virtualKeyboard,
      particleSystem: this.particleSystem,
      soundManager: audio,
      onProgressUpdate: (progress) => {
        this.keyMagnetSeqCounter.textContent = `TARGET: #${progress.current}`;
        this.keyMagnetAvgReaction.textContent = `${progress.avgResponseTime} ms`;
        this.hudMissesCount.textContent = `${progress.incorrect}`;
      },
      onScoreUpdate: (score, streak) => {
        this.hudScore.textContent = score;
        this.hudStreak.textContent = streak;
      },
      onTimeUpdate: (remaining, total) => {
        this.updateHudTimer(remaining, total);
      },
      onGameComplete: (stats) => {
        this.handleGameOver(stats);
      }
    });
  }

  updateHudTimer(remainingSeconds, totalDuration) {
    if (!this.hudTimeRemaining) return;
    const mins = Math.floor(remainingSeconds / 60);
    const secs = Math.floor(remainingSeconds % 60);
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    this.hudTimeRemaining.textContent = formatted;

    const timerClasses = ['font-mono', 'font-black', 'text-lg', 'sm:text-xl', 'tracking-tight'];
    this.hudTimeRemaining.classList.remove(...this.hudTimeRemaining.classList);
    this.hudTimeRemaining.classList.add(...timerClasses);

    if (remainingSeconds <= 10) {
      this.hudTimeRemaining.classList.add('text-rose-400', 'animate-pulse');
      if (this.hudTimerIcon) {
        this.hudTimerIcon.classList.remove('text-cyan-400', 'animate-spin');
        this.hudTimerIcon.classList.add('text-rose-400', 'animate-spin');
      }
    } else {
      this.hudTimeRemaining.classList.add('text-cyan-300');
      if (this.hudTimerIcon) {
        this.hudTimerIcon.classList.remove('text-rose-400', 'animate-spin');
        this.hudTimerIcon.classList.add('text-cyan-400');
      }
    }
  }

  bindEvents() {
    // Navigation
    this.btnBrandHome.addEventListener('click', () => this.exitToHome());
    this.btnNavHome.addEventListener('click', () => this.exitToHome());

    // Sound
    this.btnToggleAudio.addEventListener('click', () => this.toggleAudio());

    // Instructions Modal
    this.btnOpenInstructions.addEventListener('click', () => this.openInstructions());
    this.btnCloseInstructions.addEventListener('click', () => this.closeInstructions());
    this.btnCloseInstructionsFooter.addEventListener('click', () => this.closeInstructions());

    // Launch Modes with Time Limit
    this.btnStartBubbles.addEventListener('click', () => {
      const diff = this.bubblesDiffSelect.value;
      const timeLimit = parseInt(this.bubblesTimeSelect.value, 10) || 300;
      this.launchMode('bubbles', diff, timeLimit);
    });

    this.btnStartKeyMagnet.addEventListener('click', () => {
      const diff = this.keyMagnetDiffSelect.value;
      const timeLimit = parseInt(this.keyMagnetTimeSelect.value, 10) || 300;
      const keySet = this.keyMagnetKeySetSelect.value;
      this.launchMode('keymagnet', diff, timeLimit, keySet);
    });

    // In-game action controls
    this.btnCtrlPause.addEventListener('click', () => this.togglePause());
    this.btnCtrlRestart.addEventListener('click', () => this.restartCurrentMode());
    this.btnCtrlReset.addEventListener('click', () => this.exitToHome());

    // Results Modal actions
    this.btnResultsRetry.addEventListener('click', () => {
      this.closeResultsModal();
      this.restartCurrentMode();
    });
    this.btnResultsHome.addEventListener('click', () => {
      this.closeResultsModal();
      this.exitToHome();
    });

    // Toggle On-Screen Virtual Keyboard
    if (this.btnToggleKeyboard) {
      this.btnToggleKeyboard.addEventListener('click', () => this.toggleVirtualKeyboard());
    }

    // Global Keydown Listener
    window.addEventListener('keydown', (e) => this.handleGlobalKeyDown(e));
  }

  toggleVirtualKeyboard(forceShow = null) {
    if (!this.keyboardPanelWrapper) return;
    const isHidden = this.keyboardPanelWrapper.classList.contains('hidden');
    const shouldShow = forceShow !== null ? forceShow : isHidden;

    if (shouldShow) {
      this.keyboardPanelWrapper.classList.remove('hidden');
      if (this.btnToggleKeyboardLabel) this.btnToggleKeyboardLabel.textContent = 'Hide On-Screen Keys';
    } else {
      this.keyboardPanelWrapper.classList.add('hidden');
      if (this.btnToggleKeyboardLabel) this.btnToggleKeyboardLabel.textContent = 'Show On-Screen Keys';
    }

    if (window.lucide) window.lucide.createIcons();
    if (this.particleSystem) {
      setTimeout(() => this.particleSystem.resize(), 50);
    }
  }

  toggleAudio() {
    const isMuted = audio.toggleMute();
    if (isMuted) {
      this.audioIcon.setAttribute('data-lucide', 'volume-x');
      this.audioIcon.classList.remove('text-cyan-400');
      this.audioIcon.classList.add('text-rose-400');
      this.audioStatusLabel.textContent = 'SOUND: OFF';
    } else {
      this.audioIcon.setAttribute('data-lucide', 'volume-2');
      this.audioIcon.classList.remove('text-rose-400');
      this.audioIcon.classList.add('text-cyan-400');
      this.audioStatusLabel.textContent = 'SOUND: ON';
      audio.playHit();
    }
    if (window.lucide) window.lucide.createIcons();
  }

  openInstructions() {
    if (this.currentView === 'gameplay' && !this.isPaused) {
      this.togglePause();
    }
    this.modalInstructions.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.modalInstructions.classList.remove('opacity-0');
    });
  }

  closeInstructions() {
    this.modalInstructions.classList.add('opacity-0');
    setTimeout(() => {
      this.modalInstructions.classList.add('hidden');
    }, 200);
  }

  launchMode(modeKey, difficulty, timeLimit = 300, keySet = null) {
    audio.ensureContext();
    this.activeMode = modeKey;
    this.isPaused = false;
    this.activeTimeLimit = timeLimit;
    this.activeDifficulty = difficulty;

    // Reset pause button state
    this.hudPauseLabel.textContent = 'PAUSE';
    this.hudPauseIcon.setAttribute('data-lucide', 'pause');

    // Switch view
    this.viewHome.classList.add('hidden');
    this.viewGameplay.classList.remove('hidden');
    this.btnNavHome.classList.remove('hidden');
    this.currentView = 'gameplay';

    // Configure HUD
    this.hudDifficultyLabel.textContent = difficulty;

    if (modeKey === 'bubbles') {
      this.hudModeName.textContent = 'BUBBLES';
      this.hudModeIcon.className = 'w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
      this.hudDetailLabel.innerHTML = 'MISSES: <strong id="hud-misses-count" class="text-rose-400">0</strong>';
      this.hudMissesCount = document.getElementById('hud-misses-count');

      this.arenaBubbles.classList.remove('hidden');
      this.arenaKeyMagnet.classList.add('hidden');

      this.virtualKeyboard.resetHighlights();

      // Configure & Start Bubbles with Time Limit
      this.bubblesGame.setTimeLimit(timeLimit);
      this.bubblesGame.setDifficulty(difficulty);
      this.bubblesGame.start();
    } else if (modeKey === 'keymagnet') {
      this.hudModeName.textContent = 'KEYMAGNET';
      this.hudModeIcon.className = 'w-9 h-9 rounded-xl flex items-center justify-center bg-violet-500/20 text-violet-400 border border-violet-500/30';
      this.hudDetailLabel.innerHTML = 'ERRORS: <strong id="hud-misses-count" class="text-rose-400">0</strong>';
      this.hudMissesCount = document.getElementById('hud-misses-count');

      this.arenaBubbles.classList.add('hidden');
      this.arenaKeyMagnet.classList.remove('hidden');

      // Configure & Start KeyMagnet with Time Limit
      this.keyMagnetGame.setTimeLimit(timeLimit);
      this.keyMagnetGame.setDifficulty(difficulty);
      if (keySet) {
        this.keyMagnetGame.setKeySet(keySet);
      }
      this.keyMagnetGame.start();
    }

    // Ensure on-screen keyboard is hidden so the entire screen is clear for laptop/PC typing
    this.toggleVirtualKeyboard(false);

    // Refresh lucide icons
    if (window.lucide) window.lucide.createIcons();
    this.particleSystem.resize();
  }

  togglePause() {
    if (this.currentView !== 'gameplay') return;

    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.hudPauseLabel.textContent = 'RESUME';
      this.hudPauseIcon.setAttribute('data-lucide', 'play');
      if (this.activeMode === 'bubbles') {
        this.bubblesGame.pause();
      } else if (this.activeMode === 'keymagnet') {
        this.keyMagnetGame.pause();
      }
    } else {
      this.hudPauseLabel.textContent = 'PAUSE';
      this.hudPauseIcon.setAttribute('data-lucide', 'pause');
      if (this.activeMode === 'bubbles') {
        this.bubblesGame.resume();
      } else if (this.activeMode === 'keymagnet') {
        this.keyMagnetGame.resume();
      }
    }
    if (window.lucide) window.lucide.createIcons();
  }

  restartCurrentMode() {
    if (!this.activeMode) return;
    this.isPaused = false;
    this.hudPauseLabel.textContent = 'PAUSE';
    this.hudPauseIcon.setAttribute('data-lucide', 'pause');

    if (this.activeMode === 'bubbles') {
      this.bubblesGame.setTimeLimit(this.activeTimeLimit || 300);
      this.bubblesGame.start();
    } else if (this.activeMode === 'keymagnet') {
      this.keyMagnetGame.setTimeLimit(this.activeTimeLimit || 300);
      this.keyMagnetGame.start();
    }
    if (window.lucide) window.lucide.createIcons();
  }

  exitToHome() {
    // Stop all active engines
    if (this.bubblesGame) this.bubblesGame.stop();
    if (this.keyMagnetGame) this.keyMagnetGame.stop();
    if (this.particleSystem) this.particleSystem.clear();

    this.activeMode = null;
    this.isPaused = false;

    // View switch
    this.viewGameplay.classList.add('hidden');
    this.viewHome.classList.remove('hidden');
    this.btnNavHome.classList.add('hidden');
    this.currentView = 'home';

    this.updateHomeStats();
  }

  handleGlobalKeyDown(e) {
    // Toggle sound shortcut
    if (e.key === 'm' || e.key === 'M') {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
        this.toggleAudio();
        return;
      }
    }

    // Modal dismiss with Escape
    if (e.key === 'Escape') {
      if (!this.modalInstructions.classList.contains('hidden')) {
        this.closeInstructions();
        return;
      }
      if (!this.modalResults.classList.contains('hidden')) {
        this.closeResultsModal();
        this.exitToHome();
        return;
      }
    }

    // Spacebar toggles pause in game
    if (e.code === 'Space' && this.currentView === 'gameplay' && this.modalResults.classList.contains('hidden')) {
      e.preventDefault();
      this.togglePause();
      return;
    }

    // Forward gameplay key
    if (this.currentView === 'gameplay' && !this.isPaused && this.modalResults.classList.contains('hidden')) {
      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Enter'].includes(e.key)) return;

      this.handleKeyInput(e.key.toUpperCase());
    }
  }

  handleKeyInput(char) {
    if (this.currentView !== 'gameplay' || this.isPaused) return;

    if (this.activeMode === 'bubbles') {
      this.bubblesGame.handleInput(char);
    } else if (this.activeMode === 'keymagnet') {
      this.keyMagnetGame.handleInput(char);
    }
  }

  handleGameOver(stats) {
    this.lastGameStats = stats;

    // Calculate Grade (S, A, B, C, D)
    let grade = 'C';
    if (stats.accuracy >= 92 && stats.score > 200) {
      grade = 'S';
    } else if (stats.accuracy >= 80) {
      grade = 'A';
    } else if (stats.accuracy >= 65) {
      grade = 'B';
    } else if (stats.accuracy >= 50) {
      grade = 'C';
    } else {
      grade = 'D';
    }

    // Check & Save Record
    const isNewHigh = storage.updateHighScore(stats.mode, stats.difficulty, stats.score);
    storage.recordSessionStats(
      stats.correct + (stats.wrongKeys || stats.incorrect || 0),
      stats.correct,
      stats.maxStreak
    );

    // Populate Results Modal
    this.resultsModeBadge.textContent = stats.mode === 'bubbles' ? 'BUBBLES • TIME UP' : 'KEYMAGNET • TIME UP';
    this.resultsHeadline.textContent = "Time's Up! Session Complete!";
    const mins = Math.max(1, Math.round((stats.duration || 60) / 60));
    this.resultsDiff.textContent = `${stats.difficulty} • ${mins} Min Session`;
    this.resultsGradeText.textContent = grade;

    // Grade badge theme
    if (grade === 'S') {
      this.resultsGradeBadge.className = 'w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex flex-col items-center justify-center shadow-lg shadow-amber-500/40 border border-white/30 animate-pulse';
    } else if (grade === 'A') {
      this.resultsGradeBadge.className = 'w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex flex-col items-center justify-center shadow-lg shadow-emerald-500/40 border border-white/30';
    } else {
      this.resultsGradeBadge.className = 'w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/30 border border-white/20';
    }

    this.resScore.textContent = stats.score;
    this.resAccuracy.textContent = `${stats.accuracy}%`;
    this.resStreak.textContent = stats.maxStreak;
    this.resCorrect.textContent = stats.correct;

    if (stats.mode === 'bubbles') {
      this.resMissesLabel.textContent = 'MISSES / WRONG';
      this.resMisses.textContent = `${stats.misses} / ${stats.wrongKeys}`;
      this.resExtraLabel.textContent = 'TIME PLAYED';
      this.resExtraVal.textContent = `${Math.floor(stats.duration / 60)}m ${stats.duration % 60}s`;
    } else {
      this.resMissesLabel.textContent = 'ERRORS';
      this.resMisses.textContent = `${stats.incorrect + stats.timeouts}`;
      this.resExtraLabel.textContent = 'AVG REACTION';
      this.resExtraVal.textContent = `${stats.avgResponseTime}ms`;
    }

    // High score alert
    if (isNewHigh) {
      this.resNewRecordAlert.classList.remove('hidden');
    } else {
      this.resNewRecordAlert.classList.add('hidden');
    }

    // Show Modal
    this.modalResults.classList.remove('hidden');
    requestAnimationFrame(() => {
      this.modalResults.classList.remove('opacity-0');
      this.modalResultsCard.classList.remove('scale-95');
      this.modalResultsCard.classList.add('scale-100');
    });

    if (window.lucide) window.lucide.createIcons();
  }

  closeResultsModal() {
    this.modalResults.classList.add('opacity-0');
    this.modalResultsCard.classList.remove('scale-100');
    this.modalResultsCard.classList.add('scale-95');
    setTimeout(() => {
      this.modalResults.classList.add('hidden');
    }, 200);
  }

  updateHomeStats() {
    const bubblesEasy = storage.getHighScore('bubbles', 'easy');
    const bubblesMed = storage.getHighScore('bubbles', 'medium');
    const bubblesHard = storage.getHighScore('bubbles', 'hard');
    this.homeBestBubbles.textContent = `${bubblesEasy} / ${bubblesMed} / ${bubblesHard}`;

    const magnetEasy = storage.getHighScore('keymagnet', 'easy');
    const magnetMed = storage.getHighScore('keymagnet', 'medium');
    const magnetHard = storage.getHighScore('keymagnet', 'hard');
    this.homeBestKeyMagnet.textContent = `${magnetEasy} / ${magnetMed} / ${magnetHard}`;

    this.homeBestStreak.textContent = storage.data.stats.bestStreak || 0;
  }
}

// Instantiate application once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
