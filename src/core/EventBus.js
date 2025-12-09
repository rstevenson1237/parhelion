/**
 * NEXUS PROTOCOL - Event Bus
 * 
 * Pub/sub system for decoupled communication between game systems.
 * Supports wildcards, one-time listeners, and event history.
 */

export class EventBus {
  constructor(options = {}) {
    this.listeners = new Map();
    this.history = [];
    this.historyLimit = options.historyLimit || 1000;
    this.debug = options.debug || false;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name (supports wildcards: 'faction:*')
   * @param {function} callback - Handler function
   * @param {object} options - { once: boolean, priority: number }
   * @returns {function} Unsubscribe function
   */
  on(event, callback, options = {}) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listener = {
      callback,
      once: options.once || false,
      priority: options.priority || 0,
      id: Symbol()
    };

    const listeners = this.listeners.get(event);
    listeners.push(listener);
    listeners.sort((a, b) => b.priority - a.priority);

    // Return unsubscribe function
    return () => this.off(event, listener.id);
  }

  /**
   * Subscribe to an event once
   */
  once(event, callback, options = {}) {
    return this.on(event, callback, { ...options, once: true });
  }

  /**
   * Unsubscribe from an event
   */
  off(event, listenerId) {
    if (!this.listeners.has(event)) return;

    const listeners = this.listeners.get(event);
    const index = listeners.findIndex(l => l.id === listenerId);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {any} data - Event payload
   */
  emit(event, data = {}) {
    const eventData = {
      type: event,
      data,
      timestamp: Date.now()
    };

    // Store in history
    this.history.push(eventData);
    if (this.history.length > this.historyLimit) {
      this.history.shift();
    }

    if (this.debug) {
      console.log(`[EVENT] ${event}`, data);
    }

    // Get matching listeners (exact + wildcard)
    const matchingListeners = this.getMatchingListeners(event);

    // Execute callbacks
    const toRemove = [];
    
    for (const { event: listenerEvent, listener } of matchingListeners) {
      try {
        listener.callback(eventData);
        
        if (listener.once) {
          toRemove.push({ event: listenerEvent, id: listener.id });
        }
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    }

    // Clean up one-time listeners
    for (const { event: e, id } of toRemove) {
      this.off(e, id);
    }

    return this;
  }

  /**
   * Get all listeners matching an event (including wildcards)
   */
  getMatchingListeners(event) {
    const matching = [];
    const parts = event.split(':');

    for (const [listenerEvent, listeners] of this.listeners) {
      if (this.eventMatches(listenerEvent, event, parts)) {
        for (const listener of listeners) {
          matching.push({ event: listenerEvent, listener });
        }
      }
    }

    // Sort by priority across all matching listeners
    matching.sort((a, b) => b.listener.priority - a.listener.priority);
    return matching;
  }

  /**
   * Check if a listener pattern matches an event
   */
  eventMatches(pattern, event, parts) {
    if (pattern === event) return true;
    if (pattern === '*') return true;

    const patternParts = pattern.split(':');
    
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '*') {
        // Wildcard matches rest
        if (i === patternParts.length - 1) return true;
        continue;
      }
      if (patternParts[i] !== parts[i]) return false;
    }

    return patternParts.length === parts.length;
  }

  /**
   * Get recent events, optionally filtered
   */
  getHistory(filter = null, limit = 100) {
    let events = this.history;

    if (filter) {
      events = events.filter(e => this.eventMatches(filter, e.type, e.type.split(':')));
    }

    return events.slice(-limit);
  }

  /**
   * Clear all listeners
   */
  clear() {
    this.listeners.clear();
    return this;
  }

  /**
   * Get stats about registered listeners
   */
  stats() {
    const stats = {
      totalListeners: 0,
      eventTypes: this.listeners.size,
      historySize: this.history.length,
      events: {}
    };

    for (const [event, listeners] of this.listeners) {
      stats.totalListeners += listeners.length;
      stats.events[event] = listeners.length;
    }

    return stats;
  }
}

export default EventBus;
