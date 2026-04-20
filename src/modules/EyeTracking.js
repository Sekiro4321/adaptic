/**
 * EyeTracking.js - MediaPipe Eye Tracking Module
 *
 * Detects distraction using eye gaze tracking with configurable delay.
 * Uses MediaPipe Face Landmarker for real-time eye detection.
 */

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export class EyeTracking {
  constructor(options = {}) {
    // Configuration
    this.distractionDelay = options.distractionDelay || 15000; // 15 seconds default
    this.gazeThreshold = options.gazeThreshold || 0.3; // Threshold for gaze deviation
    this.fps = options.fps || 30; // Target FPS
    this.debugMode = options.debugMode || false;

    // State
    this.isInitialized = false;
    this.isRunning = false;
    this.faceLandmarker = null;
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;
    this.animationId = null;

    // Distraction detection
    this.lastGazeTime = Date.now();
    this.distractionStartTime = null;
    this.isDistracted = false;

    // Event listeners
    this.listeners = new Map();
  }

  /**
   * Initialize the eye tracking system
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // Create video element for webcam
      this.videoElement = document.createElement('video');
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;

      // Get webcam stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      this.videoElement.srcObject = stream;

      // Wait for video to be ready
      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = resolve;
      });

      // Initialize MediaPipe Face Landmarker
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegateOptions: {
            delegate: 'GPU'
          }
        },
        runningMode: 'VIDEO',
        numFaces: 1
      });

      this.isInitialized = true;
      this._emit('initialized', {});

      console.log('Eye tracking initialized successfully');
    } catch (error) {
      console.error('Failed to initialize eye tracking:', error);
      this._emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Start eye tracking
   */
  async start() {
    if (!this.isInitialized) {
      await this.init();
    }

    if (this.isRunning) return;

    try {
      await this.videoElement.play();
      this.isRunning = true;
      this.lastGazeTime = Date.now();
      this.distractionStartTime = null;
      this.isDistracted = false;

      this._emit('started', {});

      // Start detection loop
      this._detectLoop();
    } catch (error) {
      console.error('Failed to start eye tracking:', error);
      this._emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop eye tracking
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.videoElement) {
      this.videoElement.pause();
    }

    this._emit('stopped', {});
  }

  /**
   * Main detection loop
   */
  _detectLoop() {
    if (!this.isRunning) return;

    const startTime = performance.now();

    // Detect face landmarks
    const results = this.faceLandmarker.detectForVideo(
      this.videoElement,
      performance.now()
    );

    // Process results
    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
      this._processFaceLandmarks(results.faceLandmarks[0]);
    } else {
      // No face detected - consider as distraction
      this._handleNoFace();
    }

    // Calculate delay to maintain target FPS
    const elapsed = performance.now() - startTime;
    const delay = Math.max(0, (1000 / this.fps) - elapsed);

    this.animationId = setTimeout(() => {
      this.animationId = requestAnimationFrame(() => this._detectLoop());
    }, delay);
  }

  /**
   * Process face landmarks for gaze detection
   */
  _processFaceLandmarks(landmarks) {
    // Eye landmarks (MediaPipe Face Mesh)
    // Left eye: 33, 160, 158, 133, 153, 144
    // Right eye: 362, 385, 387, 263, 373, 380
    const leftEye = {
      inner: landmarks[133],
      outer: landmarks[33],
      top: landmarks[159],
      bottom: landmarks[145]
    };

    const rightEye = {
      inner: landmarks[362],
      outer: landmarks[263],
      top: landmarks[386],
      bottom: landmarks[374]
    };

    // Calculate gaze direction
    const gazeDirection = this._calculateGazeDirection(leftEye, rightEye);

    // Check if user is looking at screen
    const isLookingAtScreen = this._isLookingAtScreen(gazeDirection);

    if (isLookingAtScreen) {
      this._handleGaze();
    } else {
      this._handleDistraction();
    }

    // Emit gaze data for debugging
    if (this.debugMode) {
      this._emit('gazeData', {
        gazeDirection,
        isLookingAtScreen,
        leftEye,
        rightEye
      });
    }
  }

  /**
   * Calculate gaze direction from eye landmarks
   */
  _calculateGazeDirection(leftEye, rightEye) {
    // Calculate horizontal gaze (average of both eyes)
    const leftHorizontal =
      (leftEye.inner.x - leftEye.outer.x) /
      (leftEye.inner.x - leftEye.outer.x);
    const rightHorizontal =
      (rightEye.inner.x - rightEye.outer.x) /
      (rightEye.inner.x - rightEye.outer.x);

    // Calculate vertical gaze
    const leftVertical =
      (leftEye.top.y - leftEye.bottom.y) /
      (leftEye.top.y - leftEye.bottom.y);
    const rightVertical =
      (rightEye.top.y - rightEye.bottom.y) /
      (rightEye.top.y - rightEye.bottom.y);

    return {
      horizontal: (leftHorizontal + rightHorizontal) / 2,
      vertical: (leftVertical + rightVertical) / 2
    };
  }

  /**
   * Determine if user is looking at screen
   */
  _isLookingAtScreen(gazeDirection) {
    // Check if gaze is within threshold
    const horizontalOk =
      Math.abs(gazeDirection.horizontal) < this.gazeThreshold;
    const verticalOk =
      Math.abs(gazeDirection.vertical) < this.gazeThreshold;

    return horizontalOk && verticalOk;
  }

  /**
   * Handle when user is gazing at screen
   */
  _handleGaze() {
    this.lastGazeTime = Date.now();

    if (this.isDistracted) {
      // User returned from distraction
      const distractionDuration = Date.now() - this.distractionStartTime;
      this.isDistracted = false;
      this.distractionStartTime = null;

      this._emit('gazeRestored', {
        duration: distractionDuration
      });
    }
  }

  /**
   * Handle when user is distracted
   */
  _handleDistraction() {
    const now = Date.now();
    const timeSinceLastGaze = now - this.lastGazeTime;

    if (!this.isDistracted && timeSinceLastGaze > this.distractionDelay) {
      // Distraction detected after delay
      this.isDistracted = true;
      this.distractionStartTime = this.lastGazeTime;

      this._emit('distractionDetected', {
        delay: this.distractionDelay,
        timestamp: now
      });
    }
  }

  /**
   * Handle when no face is detected
   */
  _handleNoFace() {
    // Treat no face as potential distraction
    const now = Date.now();
    const timeSinceLastGaze = now - this.lastGazeTime;

    if (!this.isDistracted && timeSinceLastGaze > this.distractionDelay) {
      this.isDistracted = true;
      this.distractionStartTime = this.lastGazeTime;

      this._emit('distractionDetected', {
        delay: this.distractionDelay,
        timestamp: now,
        reason: 'noFace'
      });
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      isDistracted: this.isDistracted,
      distractionStartTime: this.distractionStartTime,
      timeSinceLastGaze: Date.now() - this.lastGazeTime
    };
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
  async destroy() {
    this.stop();

    if (this.videoElement && this.videoElement.srcObject) {
      const tracks = this.videoElement.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }

    if (this.faceLandmarker) {
      this.faceLandmarker.close();
    }

    this.listeners.clear();
    this.isInitialized = false;

    console.log('Eye tracking destroyed');
  }
}

// Export factory function for convenience
export function createEyeTracking(options) {
  return new EyeTracking(options);
}