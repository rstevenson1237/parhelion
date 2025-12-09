/**
 * NEXUS PROTOCOL - Main Game Class
 * 
 * The orchestrator. Ties together engine, systems, commands, and interfaces.
 */

import { Engine } from './core/Engine.js';
import { EntityManager, Components } from './core/ECS.js';
import { EventBus } from './core/EventBus.js';
import { CommandParser, registerStandardCommands } from './core/CommandParser.js';
import { UniverseSystem } from './systems/UniverseSystem.js';
import { Random } from './utils/Random.js';
import fs from 'fs';
import path from 'path';

export class Game {
  constructor(options = {}) {
    this.options = {
      seed: options.seed || Date.now(),
      galaxySize: options.galaxySize || 100,
      minStars: options.minStars || 20,
      maxStars: options.maxStars || 50,
      ...options
    };

    // Core systems
    this.engine = null;
    this.entities = null;
    this.events = null;
    this.commands = null;
    this.rng = null;

    // Game state
    this.player = null;
    this.playerEntityId = null;
    this.initialized = false;
    this.savePath = options.savePath || './saves';
  }

  /**
   * Initialize all game systems
   */
  async initialize() {
    if (this.initialized) return this;

    // Create core systems
    this.rng = new Random(this.options.seed);
    this.events = new EventBus({ debug: this.options.debug });
    this.entities = new EntityManager();
    this.engine = new Engine({
      seed: this.options.seed,
      tickRate: 1000,
      hoursPerTick: 1,
      paused: true
    });

    // Register entity manager as a system
    this.engine.registerSystem('entities', {
      entities: this.entities,
      initialize: () => {},
      update: () => {}
    }, 0);

    // Initialize universe system
    const universe = new UniverseSystem();
    universe.entities = this.entities;
    universe.setRNG(this.rng.next.bind(this.rng));
    this.engine.registerSystem('universe', universe, 10);

    // Initialize command parser
    this.commands = new CommandParser();
    registerStandardCommands(this.commands, this);

    // Set up event listeners
    this.setupEventListeners();

    // Create default player
    this.player = {
      id: 'player_1',
      name: 'Commander',
      faction: 'Independent',
      role: 'Freelancer',
      stats: {
        health: 100,
        morale: 100,
        energy: 100
      },
      inventory: {
        items: [],
        credits: 10000,
        capacity: 100
      }
    };

    // Create player as ECS entity
    this.playerEntityId = this.entities.create('player_1');
    this.entities.addComponent(this.playerEntityId, 'Identity',
      Components.Identity(this.player.name, 'player', 'The player character')
    );
    this.entities.addComponent(this.playerEntityId, 'Character',
      Components.Character(this.player.role, {}, [], '')
    );
    this.entities.addComponent(this.playerEntityId, 'Stats',
      Components.Stats(100, 100, 100)
    );
    this.entities.addComponent(this.playerEntityId, 'Inventory',
      Components.Inventory([], this.player.inventory.credits, 100)
    );
    // Position will be set when player spawns at a location

    this.initialized = true;
    this.events.emit('game:initialized', { seed: this.options.seed });

    return this;
  }

  /**
   * Set up internal event listeners
   */
  setupEventListeners() {
    this.events.on('universe:generated', (e) => {
      console.log(`Universe generated: ${e.data.stars} stars, ${e.data.routes} routes`);
    });

    this.events.on('tick:end', (e) => {
      // Process game logic each tick
      // This is where AI factions would make decisions, economies would update, etc.
    });
  }

  /**
   * Start a new game
   */
  async newGame(options = {}) {
    await this.initialize();

    // Generate the universe
    const universe = this.engine.getSystem('universe');
    universe.generate(this.options.seed, {
      galaxySize: this.options.galaxySize,
      minStars: this.options.minStars,
      maxStars: this.options.maxStars,
      ...options
    });

    // Spawn player at first star system
    const firstStar = Array.from(universe.getStars())[0];
    if (firstStar) {
      const [starId, components] = firstStar;
      this.entities.addComponent(this.playerEntityId, 'PlayerLocation',
        Components.PlayerLocation(starId, null, null)
      );
      this.player.location = components.Identity.name;
      this.player.locationId = starId;
    }

    // Start the engine (paused)
    this.engine.start();

    this.events.emit('game:started', {
      stars: this.entities.count('Star'),
      seed: this.options.seed
    });

    return this;
  }

  /**
   * Execute a command
   */
  async executeCommand(input, context = {}) {
    return this.commands.execute(input, { 
      ...context, 
      game: this,
      player: this.player 
    });
  }

  // ═══════════════════════════════════════════════════════════
  // COMMAND HANDLERS
  // ═══════════════════════════════════════════════════════════

  /**
   * View command - get information about a target
   */
  async view(target, detailed, context) {
    const lower = target.toLowerCase();
    const universe = this.engine.getSystem('universe');

    // Search for matching star
    for (const [id, components] of universe.getStars()) {
      if (components.Identity.name.toLowerCase().includes(lower)) {
        const connections = universe.getConnectedSystems(id);
        const planets = Array.from(universe.getPlanetsInSystem(id));

        return {
          view: true,
          id,
          name: components.Identity.name,
          type: `${components.Star.spectralClass}-class Star`,
          description: components.Identity.description,
          attributes: {
            'Spectral Class': components.Star.spectralClass,
            'Luminosity': components.Star.luminosity.toFixed(2),
            'Mass': components.Star.mass.toFixed(2) + ' Solar masses',
            'Position': `(${components.Position.x.toFixed(1)}, ${components.Position.y.toFixed(1)}, ${components.Position.z.toFixed(1)})`
          },
          children: planets.map(([pid, p]) => ({
            id: pid,
            name: p.Identity.name,
            type: p.Planet.planetType,
            icon: '●'
          })),
          connections: connections.map(c => {
            const star = universe.getStar(c.id);
            return {
              id: c.id,
              name: star?.Identity.name || 'Unknown',
              distance: c.distance
            };
          })
        };
      }
    }

    return { message: `No target found matching "${target}"`, type: 'error' };
  }

  /**
   * Get viewable targets for autocomplete
   */
  getViewTargets(partial, context) {
    const targets = [];
    const universe = this.engine.getSystem('universe');
    const lower = partial.toLowerCase();

    for (const [id, components] of universe.getStars()) {
      if (components.Identity.name.toLowerCase().includes(lower)) {
        targets.push({
          name: components.Identity.name,
          type: 'star'
        });
      }
    }

    return targets.slice(0, 10);
  }

  /**
   * Navigate to a destination
   */
  async goto(destination, context) {
    const universe = this.engine.getSystem('universe');
    const lower = destination.toLowerCase();

    // Find matching star
    for (const [id, components] of universe.getStars()) {
      if (components.Identity.name.toLowerCase().includes(lower)) {
        // Check if route exists from current location
        const currentLocation = this.entities.getComponent(this.playerEntityId, 'PlayerLocation');

        if (currentLocation && currentLocation.systemId !== id) {
          const connections = universe.getConnectedSystems(currentLocation.systemId);
          const route = connections.find(c => c.id === id);

          if (!route) {
            return {
              message: `No direct route from current system to ${components.Identity.name}. Check available connections.`,
              type: 'warning'
            };
          }
        }

        // Update player location
        this.entities.addComponent(this.playerEntityId, 'PlayerLocation',
          Components.PlayerLocation(id, null, null)
        );
        this.player.location = components.Identity.name;
        this.player.locationId = id;

        return {
          action: 'goto',
          systemId: id,
          systemName: components.Identity.name,
          message: `Arrived at ${components.Identity.name}.`,
          type: 'success'
        };
      }
    }

    return { message: `Unknown destination: "${destination}"`, type: 'error' };
  }

  /**
   * Get the galaxy map
   */
  async getMap(local, filter, context) {
    const universe = this.engine.getSystem('universe');
    
    const stars = Array.from(universe.getStars()).map(([id, c]) => ({
      id,
      name: c.Identity.name,
      position: c.Position,
      stellarClass: c.Star.spectralClass
    }));

    const routes = Array.from(universe.getRoutes()).map(([id, c]) => ({
      id,
      from: c.Route.from,
      to: c.Route.to,
      distance: c.Route.distance
    }));

    return {
      map: true,
      stars,
      routes,
      local,
      filter
    };
  }

  /**
   * Switch interface view
   */
  async switchInterface(view, context) {
    const viewMap = {
      strategic: 'strategic', s: 'strategic',
      tactical: 'tactical', t: 'tactical',
      personal: 'personal', p: 'personal'
    };

    const targetView = viewMap[view.toLowerCase()];
    
    return {
      action: 'switch',
      view: targetView,
      message: `Switching to ${targetView.toUpperCase()} view`,
      type: 'info'
    };
  }

  /**
   * Issue an order
   */
  async issueOrder(unit, command, context) {
    // Placeholder for order system
    return {
      message: `Order queued for ${unit}: "${command}"`,
      type: 'success'
    };
  }

  /**
   * Get pending orders
   */
  async getOrders(unit, status, context) {
    // Placeholder
    return {
      message: 'No orders pending.',
      type: 'info'
    };
  }

  /**
   * Communication system
   */
  async comms(action, target, message, context) {
    switch (action?.toLowerCase()) {
      case 'read':
        return { message: 'No new messages.', type: 'info' };
      case 'send':
        return { message: `Message sent to ${target}.`, type: 'success' };
      case 'list':
        return { message: 'No contacts available.', type: 'info' };
      default:
        return { message: 'Usage: comms <read|send|list> [target] [message]', type: 'info' };
    }
  }

  /**
   * Intelligence report
   */
  async intel(target, detailed, context) {
    return this.view(target, detailed, context);
  }

  /**
   * Get current status
   */
  async getStatus(full, context) {
    const stats = this.entities.stats();
    const time = this.engine.formatGameTime();

    // Get player location details
    const location = this.entities.getComponent(this.playerEntityId, 'PlayerLocation');
    let locationStr = 'Unknown';
    let systemInfo = '';

    if (location) {
      const universe = this.engine.getSystem('universe');
      const star = universe.getStar(location.systemId);
      if (star) {
        locationStr = star.Identity.name;
        systemInfo = `System: ${star.Star.spectralClass}-class star`;

        // Count planets in system
        const planets = Array.from(universe.getPlanetsInSystem(location.systemId));
        systemInfo += `\nPlanets: ${planets.length}`;

        // Get connections
        const connections = universe.getConnectedSystems(location.systemId);
        systemInfo += `\nJump Routes: ${connections.length}`;
      }
    }

    return {
      render: `
═══════════════════════════════════════════════════════
                    STATUS REPORT
═══════════════════════════════════════════════════════

Time: ${time}
Tick: ${this.engine.state.tick}
Engine: ${this.engine.config.paused ? 'PAUSED' : 'RUNNING'}

LOCATION
  Current: ${locationStr}
  ${systemInfo}

COMMANDER
  Name: ${this.player.name}
  Faction: ${this.player.faction}
  Role: ${this.player.role}
  Credits: ₢${this.player.inventory.credits.toLocaleString()}

GALAXY
  Total Systems: ${stats.componentCounts.Star || 0}
  Total Planets: ${stats.componentCounts.Planet || 0}
  Jump Routes: ${stats.componentCounts.Route || 0}

═══════════════════════════════════════════════════════
`.trim()
    };
  }

  /**
   * Time control
   */
  async timeControl(action, amount, context) {
    switch (action?.toLowerCase()) {
      case 'pause':
        this.engine.pause();
        return { message: 'Time paused.', type: 'system' };
      
      case 'resume':
        this.engine.resume();
        return { message: 'Time resumed.', type: 'system' };
      
      case 'step':
        this.engine.step();
        return { message: `Advanced to tick ${this.engine.state.tick}.`, type: 'system' };
      
      case 'advance':
        const ticks = parseInt(amount) || 1;
        this.engine.advance(ticks);
        return { message: `Advanced ${ticks} ticks to ${this.engine.state.tick}.`, type: 'system' };
      
      default:
        return { 
          render: `
Time: ${this.engine.formatGameTime()}
Status: ${this.engine.config.paused ? 'PAUSED' : 'RUNNING'}
Tick: ${this.engine.state.tick}

Commands: time pause | time resume | time step | time advance <n>
`.trim()
        };
    }
  }

  /**
   * Save game
   */
  async save(filename, context) {
    const state = {
      version: '0.1.0',
      timestamp: Date.now(),
      seed: this.options.seed,
      engine: this.engine.getState(),
      entities: this.entities.serialize(),
      player: this.player,
      playerEntityId: this.playerEntityId
    };

    // Ensure save directory exists
    if (!fs.existsSync(this.savePath)) {
      fs.mkdirSync(this.savePath, { recursive: true });
    }

    const filepath = path.join(this.savePath, `${filename}.json`);
    fs.writeFileSync(filepath, JSON.stringify(state, null, 2));

    return { message: `Game saved to ${filename}.json`, type: 'success' };
  }

  /**
   * Load game
   */
  async load(filename, context) {
    const filepath = path.join(this.savePath, `${filename}.json`);
    
    if (!fs.existsSync(filepath)) {
      return { message: `Save file not found: ${filename}.json`, type: 'error' };
    }

    try {
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      // Restore state
      this.options.seed = data.seed;
      this.engine.loadState(data.engine);

      // Restore entities
      if (data.entities) {
        this.entities.deserialize(data.entities);
      }

      this.player = data.player;
      this.playerEntityId = data.playerEntityId || 'player_1';

      return { message: `Game loaded from ${filename}.json`, type: 'success' };
    } catch (error) {
      return { message: `Failed to load: ${error.message}`, type: 'error' };
    }
  }

  /**
   * Quit game
   */
  async quit(nosave, context) {
    if (!nosave) {
      await this.save('autosave', context);
    }
    return { action: 'quit' };
  }
}

export default Game;
