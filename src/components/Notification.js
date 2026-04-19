/**
 * Notification.js - Notification Component
 *
 * Displays notifications for various events (distraction, session complete, etc.).
 */

export class Notification {
  constructor() {
    this.container = null;
    this.notifications = [];
    this.maxNotifications = 5;

    this._init();
  }

  /**
   * Initialize notification container
   */
  _init() {
    this.container = document.createElement('div');
    this.container.className = 'notification-container';
    document.body.appendChild(this.container);
  }

  /**
   * Show a notification
   */
  show(message, options = {}) {
    const {
      type = 'info',
      duration = 3000,
      persistent = false,
      actions = []
    } = options;

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
      </div>
    `;

    // Add actions if provided
    if (actions.length > 0) {
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'notification-actions';

      actions.forEach(action => {
        const button = document.createElement('button');
        button.className = 'notification-action';
        button.textContent = action.label;
        button.addEventListener('click', () => {
          action.handler();
          if (!action.persistent) {
            this._remove(notification);
          }
        });
        actionsContainer.appendChild(button);
      });

      notification.querySelector('.notification-content').appendChild(actionsContainer);
    }

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'notification-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => {
      this._remove(notification);
    });
    notification.querySelector('.notification-content').appendChild(closeButton);

    // Add to container
    this.container.appendChild(notification);

    // Track notification
    const notificationData = {
      element: notification,
      timestamp: Date.now(),
      persistent
    };
    this.notifications.push(notificationData);

    // Auto-remove if not persistent
    if (!persistent) {
      setTimeout(() => {
        this._remove(notification);
      }, duration);
    }

    // Limit number of notifications
    this._limitNotifications();

    return notification;
  }

  /**
   * Remove a notification
   */
  _remove(notification) {
    const index = this.notifications.findIndex(n => n.element === notification);
    if (index > -1) {
      this.notifications.splice(index, 1);
    }

    notification.classList.add('notification-removing');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  /**
   * Limit number of notifications
   */
  _limitNotifications() {
    while (this.notifications.length > this.maxNotifications) {
      const oldest = this.notifications.shift();
      this._remove(oldest.element);
    }
  }

  /**
   * Show success notification
   */
  success(message, options = {}) {
    return this.show(message, { ...options, type: 'success' });
  }

  /**
   * Show error notification
   */
  error(message, options = {}) {
    return this.show(message, { ...options, type: 'error', duration: 5000 });
  }

  /**
   * Show warning notification
   */
  warning(message, options = {}) {
    return this.show(message, { ...options, type: 'warning' });
  }

  /**
   * Show info notification
   */
  info(message, options = {}) {
    return this.show(message, { ...options, type: 'info' });
  }

  /**
   * Show distraction notification
   */
  distraction(options = {}) {
    const message = '👀 Eyes off screen! Stay focused to avoid penalties.';
    return this.show(message, {
      ...options,
      type: 'warning',
      duration: 5000,
      actions: [
        {
          label: 'I\'m focused!',
          handler: () => {
            // User confirms they're focused
            console.log('User confirmed focus');
          }
        }
      ]
    });
  }

  /**
   * Show session complete notification
   */
  sessionComplete(options = {}) {
    const message = '🎉 Great job! Focus session complete.';
    return this.show(message, {
      ...options,
      type: 'success',
      duration: 5000,
      actions: [
        {
          label: 'Start Break',
          handler: () => {
            // Start break
            console.log('Starting break');
          }
        },
        {
          label: 'Continue Focus',
          handler: () => {
            // Continue focus
            console.log('Continuing focus');
          }
        }
      ]
    });
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    [...this.notifications].forEach(n => this._remove(n.element));
  }

  /**
   * Destroy the notification system
   */
  destroy() {
    this.clearAll();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

// Export singleton instance
export const notification = new Notification();