/**
 * NEXUS PROTOCOL - Event System
 *
 * Manages game events, cascades, and event history.
 */

import { EVENTS } from '../data/events.js';

export class EventSystem {
  constructor() {
    this.entities = null;
    this.engine = null;
    this.events = null;
    this.rng = null;
    this.eventQueue = [];
    this.eventHistory = [];
  }

  initialize(engine) {
    this.engine = engine;
    this.entities = engine.getSystem('entities')?.entities || engine.entities;
    this.events = engine.events;
  }

  setRNG(rng) {
    this.rng = rng;
  }

  update(tickData) {
    // Process queued events
    this.processQueue(tickData);

    // Random event checks
    this.checkRandomEvents(tickData);
  }

  /**
   * Process queued events
   */
  processQueue(tickData) {
    const toProcess = this.eventQueue.filter(e => e.triggerTick <= tickData.tick);
    this.eventQueue = this.eventQueue.filter(e => e.triggerTick > tickData.tick);

    for (const event of toProcess) {
      this.fireEvent(event.type, event.data);
    }
  }

  /**
   * Check for random events
   */
  checkRandomEvents(tickData) {
    // Only check every 10 ticks
    if (tickData.tick % 10 !== 0) return;

    for (const [eventType, eventData] of Object.entries(EVENTS)) {
      if (eventData.triggers.includes('random')) {
        if (this.rng() < eventData.probability) {
          this.fireEvent(eventType, {});
        }
      }
    }
  }

  /**
   * Fire an event
   */
  fireEvent(eventType, data) {
    const eventDef = EVENTS[eventType];
    if (!eventDef) return;

    const event = {
      type: eventType,
      name: eventDef.name,
      data,
      tick: this.engine?.state.tick || 0
    };

    this.eventHistory.push(event);
    this.events?.emit('event:fired', event);

    // Process effects
    this.processEffects(eventDef.effects, data);

    // Check for cascades
    for (const chainType of eventDef.chains || []) {
      const chainDef = EVENTS[chainType];
      if (chainDef && this.rng() < (chainDef.probability || 0.5)) {
        this.queueEvent(chainType, data, 1);
      }
    }
  }

  /**
   * Process event effects
   */
  processEffects(effects, data) {
    for (const effect of effects) {
      // Effects would be processed here based on type
      // For now, just emit them
      this.events?.emit('event:effect', { effect, data });
    }
  }

  /**
   * Queue an event for future processing
   */
  queueEvent(eventType, data, delayTicks) {
    this.eventQueue.push({
      type: eventType,
      data,
      triggerTick: (this.engine?.state.tick || 0) + delayTicks
    });
  }

  /**
   * Get recent events
   */
  getEventHistory(limit = 10) {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get system state for serialization
   */
  getState() {
    return {
      eventQueue: this.eventQueue,
      eventHistory: this.eventHistory
    };
  }

  /**
   * Load system state
   */
  loadState(state) {
    if (state.eventQueue) {
      this.eventQueue = state.eventQueue;
    }
    if (state.eventHistory) {
      this.eventHistory = state.eventHistory;
    }
  }
}

export default EventSystem;
