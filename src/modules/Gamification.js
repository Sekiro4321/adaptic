/**
 * Gamification.js - Score and Penalty System
 *
 * Rewards focus and penalizes distraction.
 * Integrates with Timer and EyeTracking modules.
 */

export class Gamification {
  constructor(options = {}) {
    // Configuration
    this.pointsPerFocusMinute = options.pointsPerFocusMinute || 10;
    this.pointsPerFocusSession = options.pointsPerFocusSession || 100;
    this.penaltyPerDistraction = options.penaltyPerDistraction || 50;
    this.streakBonus = options.streakBonus || 20;
    this.maxStreak = options.maxStreak || 5;

    // State
    this.score = 0;
    this.streak = 0;
    this.distractionCount = 0;
    this.focusMinutes = 0;
    this.completedSessions = 0;
    this.sessionStartTime = null;

    // Event listeners
    this.listeners = new Map();
  }

  /**
   * Add points for focus time
   */
  addFocusTime(minutes) {
    const points = minutes * this.pointsPerFocusMinute;
    this.score += points;
    this.focusMinutes += minutes;

    this._emit('score:updated', {
      score: this.score,
      change: points,
      reason: 'focusTime',
      minutes
    });
  }

  /**
   * Add points for completing a focus session
   */
  completeFocusSession() {
    const points = this.pointsPerFocusSession;
    this.score += points;
    this.completedSessions++;
    this.streak++;

    // Streak bonus
    let bonus = 0;
    if (this.streak > 1 && this.streak <= this.maxStreak) {
      bonus = this.streak * this.streakBonus;
      this.score += bonus;
    }

    this._emit('score:updated', {
      score: this.score,
      change: points + bonus,
      reason: 'sessionComplete',
      streak: this.streak,
      bonus
    });

    this._emit('session:complete', {
      sessionCount: this.completedSessions,
      streak: this.streak
    });
  }

  /**
   * Apply penalty for distraction
   */
  applyDistractionPenalty() {
    const penalty = this.penaltyPerDistraction;
    this.score = Math.max(0, this.score - penalty);
    this.distractionCount++;
    this.streak = 0; // Reset streak on distraction

    this._emit('score:updated', {
      score: this.score,
      change: -penalty,
      reason: 'distraction',
      distractionCount: this.distractionCount
    });

    this._emit('distraction:detected', {
      count: this.distractionCount,
      penalty
    });
  }

  /**
   * Start a new session
   */
  startSession() {
    this.sessionStartTime = Date.now();
    this._emit('session:start', { timestamp: this.sessionStartTime });
  }

  /**
   * End current session
   */
  endSession() {
    const sessionDuration = this.sessionStartTime
      ? Date.now() - this.sessionStartTime
      : 0;

    this._emit('session:end', {
      duration: sessionDuration,
      score: this.score,
      focusMinutes: this.focusMinutes,
      distractionCount: this.distractionCount
    });

    this.sessionStartTime = null;
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      score: this.score,
      streak: this.streak,
      distractionCount: this.distractionCount,
      focusMinutes: this.focusMinutes,
      completedSessions: this.completedSessions,
      sessionStartTime: this.sessionStartTime
    };
  }

  /**
   * Get detailed session summary
   */
  getSessionSummary() {
    const stats = this.getStats();
    const sessionDuration = this.sessionStartTime
      ? Date.now() - this.sessionStartTime
      : 0;

    return {
      ...stats,
      sessionDuration,
      sessionDurationMinutes: Math.floor(sessionDuration / 60000),
      averageScorePerMinute: this.focusMinutes > 0
        ? (this.score / this.focusMinutes).toFixed(2)
        : 0,
      distractionRate: this.focusMinutes > 0
        ? ((this.distractionCount / this.focusMinutes) * 60).toFixed(2)
        : 0 // distractions per hour
    };
  }

  /**
   * Reset score and stats
   */
  reset() {
    this.score = 0;
    this.streak = 0;
    this.distractionCount = 0;
    this.focusMinutes = 0;
    this.completedSessions = 0;
    this.sessionStartTime = null;

    this._emit('score:reset', {});
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  _emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => callback(data));
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.listeners.clear();
  }
}

// Export factory function for convenience
export function createGamification(options) {
  return new Gamification(options);
}