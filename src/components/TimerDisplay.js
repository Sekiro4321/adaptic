/**
 * TimerDisplay.js - Timer UI Component
 *
 * Displays the Pomodoro timer with start/pause/reset controls.
 */

export class TimerDisplay {
  constructor(container, timer) {
    this.container = container;
    this.timer = timer;
    this.element = null;

    this._render();
    this._bindEvents();
  }

  /**
   * Render the timer display
   */
  _render() {
    this.element = document.createElement('div');
    this.element.className = 'timer-display';
    this.element.innerHTML = `
      <div class="timer-header">
        <h2>Study Timer</h2>
        <span class="timer-mode" id="timerMode">Focus Mode</span>
      </div>
      <div class="timer-time" id="timerTime">25:00</div>
      <div class="timer-controls">
        <button id="startBtn" class="btn btn-primary">Start</button>
        <button id="pauseBtn" class="btn btn-secondary">Pause</button>
        <button id="resetBtn" class="btn btn-tertiary">Reset</button>
      </div>
      <div class="timer-progress">
        <div class="progress-bar" id="progressBar"></div>
      </div>
    `;

    this.container.appendChild(this.element);
  }

  /**
   * Bind events to timer
   */
  _bindEvents() {
    // Timer events
    this.timer.on('timer:start', (data) => this._onTimerStart(data));
    this.timer.on('timer:pause', (data) => this._onTimerPause(data));
    this.timer.on('timer:reset', (data) => this._onTimerReset(data));
    this.timer.on('timer:tick', (data) => this._onTimerTick(data));
    this.timer.on('timer:complete', (data) => this._onTimerComplete(data));
    this.timer.on('timer:modeChange', (data) => this._onModeChange(data));

    // Button events
    document.getElementById('startBtn').addEventListener('click', () => {
      this.timer.start();
    });

    document.getElementById('pauseBtn').addEventListener('click', () => {
      this.timer.pause();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      this.timer.reset();
    });
  }

  /**
   * Handle timer start
   */
  _onTimerStart(data) {
    this._updateButtons(true);
    this._showNotification('Timer started', 'info');
  }

  /**
   * Handle timer pause
   */
  _onTimerPause(data) {
    this._updateButtons(false);
    this._showNotification('Timer paused', 'info');
  }

  /**
   * Handle timer reset
   */
  _onTimerReset(data) {
    this._updateButtons(false);
    this._updateTime(data.remainingTime);
    this._updateProgress(0);
  }

  /**
   * Handle timer tick
   */
  _onTimerTick(data) {
    this._updateTime(data.remainingTime);
    this._updateProgress(data.progress);
  }

  /**
   * Handle timer complete
   */
  _onTimerComplete(data) {
    const message = data.mode === 'focus'
      ? 'Focus session complete! Time for a break.'
      : 'Break over! Ready to focus again?';
    this._showNotification(message, 'success');
  }

  /**
   * Handle mode change
   */
  _onModeChange(data) {
    const modeElement = document.getElementById('timerMode');
    modeElement.textContent = data.mode === 'focus' ? 'Focus Mode' : 'Break Mode';
    modeElement.className = `timer-mode ${data.mode}`;
  }

  /**
   * Update time display
   */
  _updateTime(seconds) {
    const timeElement = document.getElementById('timerTime');
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Update progress bar
   */
  _updateProgress(progress) {
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${progress}%`;
  }

  /**
   * Update button states
   */
  _updateButtons(isRunning) {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');

    startBtn.disabled = isRunning;
    pauseBtn.disabled = !isRunning;
  }

  /**
   * Show notification
   */
  _showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
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