/**
 * Storage.js - IndexedDB Abstraction Layer
 *
 * Handles session data persistence with IndexedDB.
 * Provides a simple API for storing and retrieving study sessions.
 */

import { openDB } from 'idb';

const DB_NAME = 'AdaptiveStudyDB';
const DB_VERSION = 1;
const STORE_SESSIONS = 'sessions';
const STORE_STATS = 'stats';

export class Storage {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the database
   */
  async init() {
    if (this.isInitialized) return;

    try {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Sessions store
          if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
            const sessionStore = db.createObjectStore(STORE_SESSIONS, {
              keyPath: 'id',
              autoIncrement: true
            });
            sessionStore.createIndex('startTime', 'startTime');
            sessionStore.createIndex('date', 'date');
          }

          // Stats store
          if (!db.objectStoreNames.contains(STORE_STATS)) {
            db.createObjectStore(STORE_STATS, {
              keyPath: 'id',
              autoIncrement: true
            });
          }
        }
      });

      this.isInitialized = true;
      console.log('Storage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      throw error;
    }
  }

  /**
   * Save a session
   */
  async saveSession(sessionData) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const session = {
        ...sessionData,
        date: new Date(sessionData.startTime).toISOString().split('T')[0],
        createdAt: Date.now()
      };

      const id = await this.db.add(STORE_SESSIONS, session);
      console.log('Session saved:', id);
      return id;
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    }
  }

  /**
   * Get a session by ID
   */
  async getSession(id) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      return await this.db.get(STORE_SESSIONS, id);
    } catch (error) {
      console.error('Failed to get session:', error);
      throw error;
    }
  }

  /**
   * Get all sessions
   */
  async getAllSessions() {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      return await this.db.getAll(STORE_SESSIONS);
    } catch (error) {
      console.error('Failed to get sessions:', error);
      throw error;
    }
  }

  /**
   * Get sessions by date range
   */
  async getSessionsByDateRange(startDate, endDate) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const allSessions = await this.db.getAll(STORE_SESSIONS);
      return allSessions.filter(session => {
        const sessionDate = new Date(session.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return sessionDate >= start && sessionDate <= end;
      });
    } catch (error) {
      console.error('Failed to get sessions by date range:', error);
      throw error;
    }
  }

  /**
   * Get sessions for a specific date
   */
  async getSessionsByDate(date) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const allSessions = await this.db.getAllFromIndex(
        STORE_SESSIONS,
        'date',
        date
      );
      return allSessions;
    } catch (error) {
      console.error('Failed to get sessions by date:', error);
      throw error;
    }
  }

  /**
   * Get recent sessions (last N sessions)
   */
  async getRecentSessions(limit = 10) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const allSessions = await this.db.getAll(STORE_SESSIONS);
      return allSessions
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent sessions:', error);
      throw error;
    }
  }

  /**
   * Update a session
   */
  async updateSession(id, updates) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const existing = await this.db.get(STORE_SESSIONS, id);
      if (!existing) {
        throw new Error('Session not found');
      }

      const updated = { ...existing, ...updates, updatedAt: Date.now() };
      await this.db.put(STORE_SESSIONS, updated);
      return updated;
    } catch (error) {
      console.error('Failed to update session:', error);
      throw error;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(id) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      await this.db.delete(STORE_SESSIONS, id);
      console.log('Session deleted:', id);
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }

  /**
   * Get aggregated stats
   */
  async getStats() {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const sessions = await this.getAllSessions();

      if (sessions.length === 0) {
        return {
          totalSessions: 0,
          totalFocusMinutes: 0,
          totalScore: 0,
          totalDistractions: 0,
          averageScorePerSession: 0,
          averageFocusMinutes: 0,
          bestStreak: 0,
          lastSessionDate: null
        };
      }

      const totalFocusMinutes = sessions.reduce(
        (sum, s) => sum + (s.focusMinutes || 0),
        0
      );
      const totalScore = sessions.reduce(
        (sum, s) => sum + (s.score || 0),
        0
      );
      const totalDistractions = sessions.reduce(
        (sum, s) => sum + (s.distractionCount || 0),
        0
      );
      const bestStreak = Math.max(
        ...sessions.map(s => s.streak || 0)
      );

      return {
        totalSessions: sessions.length,
        totalFocusMinutes,
        totalScore,
        totalDistractions,
        averageScorePerSession: Math.round(totalScore / sessions.length),
        averageFocusMinutes: Math.round(totalFocusMinutes / sessions.length),
        bestStreak,
        lastSessionDate: sessions[sessions.length - 1]?.date || null
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * Clear all data
   */
  async clearAll() {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      await this.db.clear(STORE_SESSIONS);
      await this.db.clear(STORE_STATS);
      console.log('All data cleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }

  /**
   * Export data as JSON
   */
  async exportData() {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const sessions = await this.getAllSessions();
      const stats = await this.getStats();

      return {
        exportDate: new Date().toISOString(),
        sessions,
        stats
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  /**
   * Import data from JSON
   */
  async importData(data) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      // Clear existing data
      await this.clearAll();

      // Import sessions
      for (const session of data.sessions || []) {
        await this.db.add(STORE_SESSIONS, session);
      }

      console.log('Data imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }
}

// Export factory function for convenience
export function createStorage() {
  return new Storage();
}