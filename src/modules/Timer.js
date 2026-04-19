/**
 * Timer.js - Pomodoro Timer Module
 *
 * Implements a Pomodoro timer with configurable focus/break durations.
 * Uses an event system for communication with other modules.
 *
 * Events emitted:
 * - 'timer:start' - When timer starts
 * - 'timer:pause' - When timer pauses
 * - 'timer:reset' - When timer resets
 * - 'timer:tick' - Every second with remaining time
 * - 'timer:complete' - When timer completes (focus or break)
 * - 'timer:modeChange' - When switching between focus/break mode
 */

export class Timer {
  constructor(options = {}) {
    // Configuration
    this.focusDuration = options.focusDuration || 25 * 60; // 25 minutes in seconds
    this.breakDuration = options.breakDuration || 5 * 60; // 5 minutes in seconds
    this.autoStartBreak = options.autoStartBreak ?? true;
    this.autoStartFocus = options.autoStartFocus ?? true;

    // State
    this.mode = 'focus'; // 'focus' or 'break'
    this.remainingTime = this.focusDuration;
    this.isRunning = false;
    this.intervalId = null;
    this.sessionCount = 0;

    // Event listeners
    this.listeners = new Map();
  }

  /**
   * Start the timer
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => this._tick(), 1000);
    this._emit('timer:start', { mode: this.mode, remainingTime: this.remainingTime });
  }

  /**
   * Pause the timer
   */
  pause() {
    if (!this.isRunning) return;

    this.isRunning = false;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this._emit('timer:pause', { mode: this.mode, remainingTime: this.remainingTime });
  }

  /**
   * Reset the timer
   */
  reset() {
    this.pause();
    this.remainingTime = this.mode === 'focus' ? this.focusDuration : this.breakDuration;
    this._emit('timer:reset', { mode: this.mode, remainingTime: this.remainingTime });
  }

  /**
   * Switch between focus and break mode
   */
  switchMode() {
    this.pause();
    this.mode = this.mode === 'focus' ? 'break' : 'focus';
    this.remainingTime = this.mode === 'focus' ? this.focusDuration : this.breakDuration;
    this._emit('timer:modeChange', { mode: this.mode, remainingTime: this.remainingTime });

    // Auto-start if configured
    if (this.mode === 'break' && this.autoStartBreak) {
      this.start();
    } else if (this.mode === 'focus' && this.autoStartFocus) {
      this.start();
    }
  }

  /**
   * Get current timer state
   */
  getState() {
    return {
      mode: this.mode,
      remainingTime: this.remainingTime,
      isRunning: this.isRunning,
      focusDuration: this.focusDuration,
      breakDuration: this.breakDuration,
      sessionCount: this.sessionCount
    };
  }

  /**
   * Set focus duration (in seconds)
   */
  setFocusDuration(seconds) {
    this.focusDuration = seconds;
    if (!this.isRunning && this.mode === 'focus') {
      this.remainingTime = seconds;
    }
  }

  /**
   * Set break duration (in seconds)
   */
  setBreakDuration(seconds) {
    this.breakDuration = seconds;
    if (!this.isRunning && this.mode === 'break') {
      this.remainingTime = seconds;
    }
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
   * Internal tick handler
   */
  _tick() {
    this.remainingTime--;

    this._emit('timer:tick', {
      mode: this.mode,
      remainingTime: this.remainingTime,
      progress: this._calculateProgress()
    });

    // Check if timer completed
    if (this.remainingTime <= 0) {
      this._complete();
    }
  }

  /**
   * Handle timer completion
   */
  _complete() {
    this.pause();

    if (this.mode === 'focus') {
      this.sessionCount++;
    }

    this._emit('timer:complete', {
      mode: this.mode,
      sessionCount: this.sessionCount
    });

    // Switch modes
    this.switchMode();
  }

  /**
   * Calculate progress percentage
   */
  _calculateProgress() {
    const total = this.mode === 'focus' ? this.focusDuration : this.breakDuration;
    const elapsed = total - this.remainingTime;
    return (elapsed / total) * 100;
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
    this.pause();
    this.listeners.clear();
  }
}

// Export factory function for convenience
export function createTimer(options) {
  return new Timer(options);
}