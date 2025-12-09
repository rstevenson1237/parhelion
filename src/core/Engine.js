/**
 * NEXUS PROTOCOL - Core Engine
 * 
 * The beating heart of the simulation. Manages game time, tick processing,
 * and coordination between all game systems.
 */

import { EventBus } from './EventBus.js';

export class Engine {
  constructor(config = {}) {
    this.config = {
      tickRate: config.tickRate || 1000,      // ms between ticks
      maxTicksPerFrame: config.maxTicksPerFrame || 10,
      paused: config.paused ?? true,
      seed: config.seed || Date.now(),
      ...config
    };

    this.state = {
      tick: 0,
      gameTime: 0,           // In-game time (hours)
      realTimeStart: null,
      running: false,
      lastTick: null
    };

    // Enhanced time tracking
    this.time = {
      tick: 0,
      hours: 0,
      days: 0,
      years: 0
    };

    this.systems = new Map();
    this.systemOrder = [];
    this.events = new EventBus();
    this.tickInterval = null;

    // Bind methods
    this.processTick = this.processTick.bind(this);
  }

  /**
   * Register a game system
   * @param {string} name - System identifier
   * @param {object} system - System instance with update() method
   * @param {number} priority - Lower = earlier execution
   */
  registerSystem(name, system, priority = 100) {
    if (this.systems.has(name)) {
      throw new Error(`System "${name}" already registered`);
    }

    system.engine = this;
    system.events = this.events;
    
    this.systems.set(name, { system, priority, name });
    this.systemOrder = Array.from(this.systems.values())
      .sort((a, b) => a.priority - b.priority)
      .map(s => s.name);

    if (system.initialize) {
      system.initialize(this);
    }

    this.events.emit('system:registered', { name, priority });
    return this;
  }

  /**
   * Get a registered system by name
   */
  getSystem(name) {
    const entry = this.systems.get(name);
    return entry ? entry.system : null;
  }

  /**
   * Start the game loop
   */
  start() {
    if (this.state.running) return;

    this.state.running = true;
    this.state.realTimeStart = Date.now();
    this.state.lastTick = Date.now();

    this.events.emit('engine:start', { tick: this.state.tick });

    if (!this.config.paused) {
      this.tickInterval = setInterval(this.processTick, this.config.tickRate);
    }

    return this;
  }

  /**
   * Stop the game loop
   */
  stop() {
    this.state.running = false;
    
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.events.emit('engine:stop', { tick: this.state.tick });
    return this;
  }

  /**
   * Pause time progression (systems still respond to commands)
   */
  pause() {
    this.config.paused = true;
    
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.events.emit('engine:pause', { tick: this.state.tick });
    return this;
  }

  /**
   * Resume time progression
   */
  resume() {
    if (!this.state.running) {
      return this.start();
    }

    this.config.paused = false;
    this.state.lastTick = Date.now();
    this.tickInterval = setInterval(this.processTick, this.config.tickRate);
    
    this.events.emit('engine:resume', { tick: this.state.tick });
    return this;
  }

  /**
   * Advance by a single tick (for turn-based or debugging)
   */
  step() {
    this.processTick();
    return this;
  }

  /**
   * Advance by multiple ticks
   */
  advance(ticks = 1) {
    for (let i = 0; i < ticks; i++) {
      this.processTick();
    }
    return this;
  }

  /**
   * Process a single game tick
   */
  processTick() {
    const tickStart = Date.now();
    this.state.tick++;
    this.state.gameTime += this.config.hoursPerTick || 1;

    // Update time tracking
    this.time.tick = this.state.tick;
    this.time.hours = this.state.gameTime;
    this.time.days = Math.floor(this.time.hours / 24);
    this.time.years = Math.floor(this.time.days / 365);

    const tickData = {
      tick: this.state.tick,
      gameTime: this.state.gameTime,
      delta: tickStart - (this.state.lastTick || tickStart)
    };

    this.events.emit('tick:start', tickData);

    // Process each system in priority order
    for (const systemName of this.systemOrder) {
      const { system } = this.systems.get(systemName);
      
      if (system.update && system.enabled !== false) {
        try {
          system.update(tickData);
        } catch (error) {
          this.events.emit('system:error', { 
            system: systemName, 
            error,
            tick: this.state.tick 
          });
          console.error(`Error in system "${systemName}":`, error);
        }
      }
    }

    this.events.emit('tick:end', {
      ...tickData,
      duration: Date.now() - tickStart
    });

    this.state.lastTick = tickStart;
  }

  /**
   * Format game time for display
   */
  formatGameTime() {
    const hours = this.state.gameTime;
    const days = Math.floor(hours / 24);
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    const remainingHours = hours % 24;

    if (years > 0) {
      return `Year ${years + 3000}, Day ${remainingDays + 1}, ${String(remainingHours).padStart(2, '0')}:00`;
    }
    return `Day ${days + 1}, ${String(remainingHours).padStart(2, '0')}:00`;
  }

  /**
   * Get current state for serialization
   */
  getState() {
    const systemStates = {};
    
    for (const [name, { system }] of this.systems) {
      if (system.getState) {
        systemStates[name] = system.getState();
      }
    }

    return {
      engine: {
        tick: this.state.tick,
        gameTime: this.state.gameTime,
        seed: this.config.seed,
        paused: this.config.paused
      },
      systems: systemStates
    };
  }

  /**
   * Restore state from serialized data
   */
  loadState(state) {
    if (state.engine) {
      this.state.tick = state.engine.tick || 0;
      this.state.gameTime = state.engine.gameTime || 0;
      this.config.seed = state.engine.seed;
      this.config.paused = state.engine.paused ?? true;
    }

    if (state.systems) {
      for (const [name, systemState] of Object.entries(state.systems)) {
        const entry = this.systems.get(name);
        if (entry && entry.system.loadState) {
          entry.system.loadState(systemState);
        }
      }
    }

    this.events.emit('state:loaded', { tick: this.state.tick });
    return this;
  }
}

export default Engine;
