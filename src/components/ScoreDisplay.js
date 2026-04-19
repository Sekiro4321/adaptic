/**
 * ScoreDisplay.js - Score UI Component
 *
 * Displays the current score, streak, and session stats.
 */

export class ScoreDisplay {
  constructor(container, gamification) {
    this.container = container;
    this.gamification = gamification;
    this.element = null;

    this._render();
    this._bindEvents();
  }

  /**
   * Render the score display
   */
  _render() {
    this.element = document.createElement('div');
    this.element.className = 'score-display';
    this.element.innerHTML = `
      <div class="score-header">
        <h2>Your Progress</h2>
      </div>
      <div class="score-main">
        <div class="score-value" id="scoreValue">0</div>
        <div class="score-label">Points</div>
      </div>
      <div class="score-stats">
        <div class="stat-item">
          <span class="stat-label">Streak</span>
          <span class="stat-value" id="streakValue">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Sessions</span>
          <span class="stat-value" id="sessionsValue">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Focus Time</span>
          <span class="stat-value" id="focusTimeValue">0m</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Distractions</span>
          <span class="stat-value" id="distractionsValue">0</span>
        </div>
      </div>
      <div class="score-recent">
        <h3>Recent Activity</h3>
        <div class="activity-log" id="activityLog">
          <p class="no-activity">No activity yet</p>
        </div>
      </div>
    `;

    this.container.appendChild(this.element);
  }

  /**
   * Bind events to gamification
   */
  _bindEvents() {
    // Gamification events
    this.gamification.on('score:updated', (data) => this._onScoreUpdated(data));
    this.gamification.on('session:start', (data) => this._onSessionStart(data));
    this.gamification.on('session:end', (data) => this._onSessionEnd(data));
    this.gamification.on('session:complete', (data) => this._onSessionComplete(data));
    this.gamification.on('distraction:detected', (data) => this._onDistractionDetected(data));
  }

  /**
   * Handle score update
   */
  _onScoreUpdated(data) {
    this._updateScore(data.score);
    this._addActivity(data);
  }

  /**
   * Handle session start
   */
  _onSessionStart(data) {
    this._addActivity({
      type: 'sessionStart',
      timestamp: data.timestamp,
      message: 'Session started'
    });
  }

  /**
   * Handle session end
   */
  _onSessionEnd(data) {
    this._updateStats(data);
    this._addActivity({
      type: 'sessionEnd',
      timestamp: Date.now(),
      message: `Session ended: ${data.focusMinutes}m focus, ${data.distractionCount} distractions`
    });
  }

  /**
   * Handle session complete
   */
  _onSessionComplete(data) {
    this._updateSessions(data.sessionCount);
    this._updateStreak(data.streak);
    this._addActivity({
      type: 'sessionComplete',
      timestamp: Date.now(),
      message: `Focus session complete! Streak: ${data.streak}`
    });
  }

  /**
   * Handle distraction detected
   */
  _onDistractionDetected(data) {
    this._updateDistractions(data.count);
    this._addActivity({
      type: 'distraction',
      timestamp: Date.now(),
      message: `Distraction detected! -${data.penalty} points`
    });
  }

  /**
   * Update score display
   */
  _updateScore(score) {
    const scoreElement = document.getElementById('scoreValue');
    this._animateValue(scoreElement, parseInt(scoreElement.textContent), score, 500);
  }

  /**
   * Update streak display
   */
  _updateStreak(streak) {
    const streakElement = document.getElementById('streakValue');
    streakElement.textContent = streak;
    streakElement.className = `stat-value ${streak > 0 ? 'streak-active' : ''}`;
  }

  /**
   * Update sessions display
   */
  _updateSessions(count) {
    const sessionsElement = document.getElementById('sessionsValue');
    sessionsElement.textContent = count;
  }

  /**
   * Update focus time display
   */
  _updateFocusTime(minutes) {
    const focusTimeElement = document.getElementById('focusTimeValue');
    focusTimeElement.textContent = `${minutes}m`;
  }

  /**
   * Update distractions display
   */
  _updateDistractions(count) {
    const distractionsElement = document.getElementById('distractionsValue');
    distractionsElement.textContent = count;
  }

  /**
   * Update all stats
   */
  _updateStats(stats) {
    this._updateFocusTime(stats.focusMinutes);
    this._updateDistractions(stats.distractionCount);
  }

  /**
   * Add activity to log
   */
  _addActivity(data) {
    const activityLog = document.getElementById('activityLog');
    const noActivity = activityLog.querySelector('.no-activity');

    if (noActivity) {
      noActivity.remove();
    }

    const activityItem = document.createElement('div');
    activityItem.className = `activity-item activity-${data.type || 'default'}`;

    let icon = '';
    switch (data.type) {
      case 'sessionStart':
        icon = '▶️';
        break;
      case 'sessionEnd':
        icon = '⏹️';
        break;
      case 'sessionComplete':
        icon = '✅';
        break;
      case 'distraction':
        icon = '⚠️';
        break;
      default:
        icon = '📝';
    }

    const time = new Date(data.timestamp || Date.now()).toLocaleTimeString();
    activityItem.innerHTML = `
      <span class="activity-icon">${icon}</span>
      <span class="activity-message">${data.message}</span>
      <span class="activity-time">${time}</span>
    `;

    activityLog.insertBefore(activityItem, activityLog.firstChild);

    // Keep only last 10 activities
    while (activityLog.children.length > 10) {
      activityLog.removeChild(activityLog.lastChild);
    }
  }

  /**
   * Animate value change
   */
  _animateValue(element, start, end, duration) {
    const startTime = performance.now();
    const diff = end - start;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.round(start + diff * progress);

      element.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}