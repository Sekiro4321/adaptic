/**
 * App.js - Main Application
 *
 * Integrates all modules (Timer, Gamification, EyeTracking, Storage)
 * and manages the application lifecycle.
 */

import { Timer } from './modules/Timer.js';
import { Gamification } from './modules/Gamification.js';
import { EyeTracking } from './modules/EyeTracking.js';
import { Storage } from './modules/Storage.js';
import { TimerDisplay } from './components/TimerDisplay.js';
import { ScoreDisplay } from './components/ScoreDisplay.js';
import { notification } from './components/Notification.js';

export class App {
  constructor() {
    // Initialize modules
    this.timer = new Timer({
      focusDuration: 25 * 60,
      breakDuration: 5 * 60,
      autoStartBreak: true,
      autoStartFocus: false
    });

    this.gamification = new Gamification({
      pointsPerFocusMinute: 10,
      pointsPerFocusSession: 100,
      penaltyPerDistraction: 50,
      streakBonus: 20,
      maxStreak: 5
    });

    this.eyeTracking = new EyeTracking({
      distractionDelay: 15000,
      gazeThreshold: 0.3,
      fps: 30,
      debugMode: false
    });

    this.storage = new Storage();

    // UI components
    this.timerDisplay = null;
    this.scoreDisplay = null;

    // State
    this.isInitialized = false;
    this.currentSessionId = null;
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.isInitialized) return;

    try {
      console.log('Initializing Adaptive Study App...');

      // Initialize storage
      await this.storage.init();

      // Setup module integrations
      this._setupTimerIntegration();
      this._setupGamificationIntegration();
      this._setupEyeTrackingIntegration();

      // Render UI
      this._render();

      this.isInitialized = true;
      console.log('App initialized successfully');

      // Show welcome notification
      notification.success('Welcome to Adaptive Study! Start your first session to begin.');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      notification.error('Failed to initialize app. Please refresh the page.');
    }
  }

  /**
   * Setup timer integration with other modules
   */
  _setupTimerIntegration() {
    // Track focus time for gamification
    this.timer.on('timer:tick', (data) => {
      if (data.mode === 'focus' && data.remainingTime % 60 === 0) {
        // Add points every minute of focus
        this.gamification.addFocusTime(1);
      }
    });

    // Complete focus session
    this.timer.on('timer:complete', (data) => {
      if (data.mode === 'focus') {
        this.gamification.completeFocusSession();
      }
    });
  }

  /**
   * Setup gamification integration with storage
   */
  _setupGamificationIntegration() {
    // Save session when it ends
    this.gamification.on('session:end', async (data) => {
      try {
        await this.storage.saveSession({
          startTime: this.gamification.sessionStartTime,
          endTime: Date.now(),
          score: data.score,
          focusMinutes: data.focusMinutes,
          distractionCount: data.distractionCount,
          streak: this.gamification.streak
        });
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    });
  }

  /**
   * Setup eye tracking integration with gamification
   */
  _setupEyeTrackingIntegration() {
    // Apply penalty when distraction is detected
    this.eyeTracking.on('distractionDetected', (data) => {
      this.gamification.applyDistractionPenalty();
      notification.distraction();
    });

    // Show notification when gaze is restored
    this.eyeTracking.on('gazeRestored', (data) => {
      notification.info('Good! You\'re back on track.');
    });
  }

  /**
   * Render the application UI
   */
  _render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="space-engine">
        <div class="nebula"></div>
        <div class="stars"></div>
      </div>

      <div class="ui-layer">
        <header class="top-nav">
          <div class="brand">
            <span class="glitch" data-text="ADAPTIC">ADAPTIC</span>
            <span class="version">v2.6.0</span>
          </div>
          
          <div class="system-status">
            <div id="eyeStatus" class="hud-widget">
              <div class="scanner-line"></div>
              <span class="status-label">GAZE TRACKER</span>
              <span class="status-value">OFFLINE</span>
            </div>
            <button id="eyeTrackingToggle" class="btn-plasma">ENGAGE SENSORS</button>
          </div>
        </header>

        <main class="dashboard">
          <div id="timerContainer" class="glass-module main-module"></div>
          <div id="scoreContainer" class="glass-module side-module"></div>
        </main>
      </div>
    `;

    // Re-initialize displays
    this.timerDisplay = new TimerDisplay(document.getElementById('timerContainer'), this.timer);
    this.scoreDisplay = new ScoreDisplay(document.getElementById('scoreContainer'), this.gamification);

    document.getElementById('eyeTrackingToggle').addEventListener('click', () => {
      this._toggleEyeTracking();
    });
  }

  /**
   * Toggle eye tracking
   */
  async _toggleEyeTracking() {
    const button = document.getElementById('eyeTrackingToggle');
    const status = this.eyeTracking.getStatus();

    if (status.isRunning) {
      this.eyeTracking.stop();
      button.textContent = 'Enable Eye Tracking';
      notification.info('Eye tracking disabled');
    } else {
      try {
        await this.eyeTracking.start();
        button.textContent = 'Disable Eye Tracking';
        notification.success('Eye tracking enabled');
      } catch (error) {
        console.error('Failed to start eye tracking:', error);
        notification.error('Failed to enable eye tracking. Please check camera permissions.');
      }
    }
  }

  /**
   * Start a new study session
   */
  async startSession() {
    try {
      this.gamification.startSession();
      this.timer.start();

      notification.success('Study session started! Stay focused.');
    } catch (error) {
      console.error('Failed to start session:', error);
      notification.error('Failed to start session');
    }
  }

  /**
   * End the current session
   */
  async endSession() {
    try {
      this.timer.pause();
      this.gamification.endSession();

      notification.info('Session ended. Great work!');
    } catch (error) {
      console.error('Failed to end session:', error);
      notification.error('Failed to end session');
    }
  }

  /**
   * Get application stats
   */
  async getStats() {
    try {
      const storageStats = await this.storage.getStats();
      const gamificationStats = this.gamification.getStats();

      return {
        ...storageStats,
        currentSession: gamificationStats
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Export session data
   */
  async exportData() {
    try {
      const data = await this.storage.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `adaptive-study-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      notification.success('Data exported successfully');
    } catch (error) {
      console.error('Failed to export data:', error);
      notification.error('Failed to export data');
    }
  }

  /**
   * Cleanup and destroy the application
   */
  async destroy() {
    console.log('Destroying app...');

    // Stop timer
    this.timer.destroy();

    // Destroy gamification
    this.gamification.destroy();

    // Stop eye tracking
    await this.eyeTracking.destroy();

    // Close storage
    await this.storage.close();

    // Destroy UI components
    if (this.timerDisplay) {
      this.timerDisplay.destroy();
    }
    if (this.scoreDisplay) {
      this.scoreDisplay.destroy();
    }

    // Destroy notifications
    notification.destroy();

    this.isInitialized = false;
    console.log('App destroyed');
  }
}

// Export singleton instance
export const app = new App();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}