/**
 * LocalStorage Manager for Typing Challenge Game
 * Persists high scores, personal bests, and player preferences.
 */
class StorageManager {
  constructor() {
    this.STORAGE_KEY = 'typing_challenge_game_data_v1';
    this.data = this.load();
  }

  getDefaults() {
    return {
      highScores: {
        bubbles: { easy: 0, medium: 0, hard: 0 },
        keymagnet: { easy: 0, medium: 0, hard: 0 }
      },
      stats: {
        totalGamesPlayed: 0,
        totalKeysTyped: 0,
        totalCorrect: 0,
        bestStreak: 0
      },
      settings: {
        sound: true,
        showVirtualKeyboard: true
      }
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return this.getDefaults();
      const parsed = JSON.parse(raw);
      return { ...this.getDefaults(), ...parsed };
    } catch (e) {
      console.warn('Failed to load local storage:', e);
      return this.getDefaults();
    }
  }

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save to local storage:', e);
    }
  }

  getHighScore(mode, difficulty) {
    return this.data.highScores?.[mode]?.[difficulty] || 0;
  }

  updateHighScore(mode, difficulty, score) {
    if (!this.data.highScores[mode]) {
      this.data.highScores[mode] = {};
    }
    const currentBest = this.data.highScores[mode][difficulty] || 0;
    if (score > currentBest) {
      this.data.highScores[mode][difficulty] = score;
      this.save();
      return true; // New record!
    }
    return false;
  }

  recordSessionStats(keysTyped, correctCount, streak) {
    this.data.stats.totalGamesPlayed += 1;
    this.data.stats.totalKeysTyped += keysTyped;
    this.data.stats.totalCorrect += correctCount;
    if (streak > this.data.stats.bestStreak) {
      this.data.stats.bestStreak = streak;
    }
    this.save();
  }

  getSettings() {
    return this.data.settings;
  }

  updateSetting(key, value) {
    this.data.settings[key] = value;
    this.save();
  }
}

const storage = new StorageManager();
