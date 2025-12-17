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
import { FactionSystem } from './systems/FactionSystem.js';
import { EconomySystem } from './systems/EconomySystem.js';
import { PoliticsSystem } from './systems/PoliticsSystem.js';
import { EventSystem } from './systems/EventSystem.js';
import { CharacterSystem } from './systems/CharacterSystem.js';
import { OrderSystem } from './systems/OrderSystem.js';
import { MessageSystem } from './systems/MessageSystem.js';
import { IntelSystem } from './systems/IntelSystem.js';
import { FleetSystem } from './systems/FleetSystem.js';
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

    // Initialize event system (priority 5 - processes first)
    const eventSystem = new EventSystem();
    eventSystem.entities = this.entities;
    eventSystem.setRNG(this.rng.next.bind(this.rng));
    this.engine.registerSystem('events', eventSystem, 5);

    // Initialize universe system (priority 10)
    const universe = new UniverseSystem();
    universe.entities = this.entities;
    universe.setRNG(this.rng.next.bind(this.rng));
    this.engine.registerSystem('universe', universe, 10);

    // Initialize economy system (priority 20)
    const economySystem = new EconomySystem();
    economySystem.entities = this.entities;
    economySystem.setRNG(this.rng.next.bind(this.rng));
    this.engine.registerSystem('economy', economySystem, 20);

    // Initialize politics system (priority 30)
    const politicsSystem = new PoliticsSystem();
    politicsSystem.entities = this.entities;
    this.engine.registerSystem('politics', politicsSystem, 30);

    // Initialize faction system (priority 40)
    const factionSystem = new FactionSystem();
    factionSystem.entities = this.entities;
    factionSystem.setRNG(this.rng.next.bind(this.rng));
    this.engine.registerSystem('factions', factionSystem, 40);

    // Initialize character system (priority 50)
    const characterSystem = new CharacterSystem();
    characterSystem.entities = this.entities;
    characterSystem.setRNG(this.rng.next.bind(this.rng));
    this.engine.registerSystem('characters', characterSystem, 50);

    // Initialize fleet system (priority 45)
    const fleetSystem = new FleetSystem();
    fleetSystem.entities = this.entities;
    fleetSystem.setRNG(this.rng.next.bind(this.rng));
    this.engine.registerSystem('fleets', fleetSystem, 45);

    // Initialize order system (priority 55)
    const orderSystem = new OrderSystem();
    orderSystem.entities = this.entities;
    orderSystem.setRNG(this.rng.next.bind(this.rng));
    this.engine.registerSystem('orders', orderSystem, 55);

    // Initialize message system (priority 60)
    const messageSystem = new MessageSystem();
    messageSystem.entities = this.entities;
    messageSystem.setRNG(this.rng.next.bind(this.rng));
    this.engine.registerSystem('messages', messageSystem, 60);

    // Initialize intel system (priority 65)
    const intelSystem = new IntelSystem();
    intelSystem.entities = this.entities;
    intelSystem.setRNG(this.rng.next.bind(this.rng));
    this.engine.registerSystem('intel', intelSystem, 65);

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
      Components.Stats(100, 100, 100, 100)
    );
    this.entities.addComponent(this.playerEntityId, 'Inventory',
      Components.Inventory([], this.player.inventory.credits, 100)
    );
    this.entities.addComponent(this.playerEntityId, 'Background',
      Components.Background('coreworlder', 'merchant', '')
    );
    this.entities.addComponent(this.playerEntityId, 'Skills',
      Components.Skills({})
    );
    this.entities.addComponent(this.playerEntityId, 'Attributes',
      Components.Attributes({})
    );
    this.entities.addComponent(this.playerEntityId, 'Equipment',
      Components.Equipment({})
    );
    this.entities.addComponent(this.playerEntityId, 'Contacts',
      Components.Contacts([])
    );
    this.entities.addComponent(this.playerEntityId, 'Reputation',
      Components.Reputation({})
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

    // Generate factions
    const factionSystem = this.engine.getSystem('factions');
    const stars = Array.from(universe.getStars());
    factionSystem.generate(6, {
      galaxySize: this.options.galaxySize,
      stars: stars
    });

    // Initialize economy
    const economySystem = this.engine.getSystem('economy');
    economySystem.initializeMarkets();

    // Create starting fleets for each faction
    const fleetSystem = this.engine.getSystem('fleets');
    for (const faction of factionSystem.getFactions()) {
      const controlledSystems = faction.territory;
      if (controlledSystems.length > 0) {
        // Create 1-3 fleets per faction
        const fleetCount = 1 + Math.floor(this.rng.next() * 3);
        for (let i = 0; i < fleetCount; i++) {
          const locationId = controlledSystems[Math.floor(this.rng.next() * controlledSystems.length)];
          fleetSystem.createFleet({
            factionId: faction.id,
            locationId,
            shipCount: 3 + Math.floor(this.rng.next() * 10),
            competence: 0.5 + this.rng.next() * 0.4
          });
        }
      }
    }

    // Spawn player at first star system
    const firstStar = stars[0];
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
      factions: factionSystem.getFactions().length,
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
   * Issue an order to a unit
   */
  async issueOrder(unitName, commandStr, context) {
    const orderSystem = this.engine.getSystem('orders');

    // Parse the command string for order type and target
    const parsed = this.parseOrderCommand(commandStr);
    if (!parsed.success) {
      return { message: parsed.error, type: 'error' };
    }

    // Find the unit by name
    const unitId = this.findUnitByName(unitName);
    if (!unitId) {
      return { message: `Unknown unit: "${unitName}"`, type: 'error' };
    }

    // Find target if specified
    let targetId = null;
    if (parsed.targetName) {
      targetId = this.findTargetByName(parsed.targetName);
    }

    // Issue the order
    const result = orderSystem.issueOrder(
      this.playerEntityId,
      unitId,
      parsed.orderType,
      targetId,
      {
        targetName: parsed.targetName,
        parameters: parsed.parameters,
        priority: parsed.priority
      }
    );

    if (result.success) {
      return {
        action: 'order',
        ...result,
        type: 'success'
      };
    } else {
      return { message: result.error, type: 'error' };
    }
  }

  /**
   * Parse an order command string
   */
  parseOrderCommand(commandStr) {
    // Format: "orderType targetName [parameters]"
    // Examples: "move Sol", "patrol Alpha to Beta", "attack Enemy Fleet"

    const words = commandStr.trim().toLowerCase().split(/\s+/);
    if (words.length === 0) {
      return { success: false, error: 'Empty command' };
    }

    const orderType = words[0];
    const targetName = words.slice(1).join(' ');

    return {
      success: true,
      orderType,
      targetName: targetName || null,
      parameters: {},
      priority: 'NORMAL'
    };
  }

  /**
   * Find unit by name
   */
  findUnitByName(name) {
    const searchName = name.toLowerCase();

    // Search commandable units
    for (const [entityId, components] of this.entities.query('Commandable', 'Identity')) {
      if (components.Identity.name.toLowerCase().includes(searchName)) {
        return entityId;
      }
    }

    // Search fleets
    for (const [entityId, components] of this.entities.query('Fleet', 'Identity')) {
      if (components.Identity.name.toLowerCase().includes(searchName)) {
        return entityId;
      }
    }

    return null;
  }

  /**
   * Find target by name (star, planet, station, etc.)
   */
  findTargetByName(name) {
    const searchName = name.toLowerCase();
    const universe = this.engine.getSystem('universe');

    // Search stars
    for (const [id, components] of universe.getStars()) {
      if (components.Identity.name.toLowerCase().includes(searchName)) {
        return id;
      }
    }

    // Search planets
    for (const [id, components] of this.entities.query('Planet', 'Identity')) {
      if (components.Identity.name.toLowerCase().includes(searchName)) {
        return id;
      }
    }

    // Search stations
    for (const [id, components] of this.entities.query('Station', 'Identity')) {
      if (components.Identity.name.toLowerCase().includes(searchName)) {
        return id;
      }
    }

    return null;
  }

  /**
   * Get pending orders
   */
  async getOrders(unitName, status, context) {
    const orderSystem = this.engine.getSystem('orders');

    const filters = {
      issuerId: this.playerEntityId
    };

    if (unitName) {
      const unitId = this.findUnitByName(unitName);
      if (unitId) {
        filters.recipientId = unitId;
      }
    }

    if (status) {
      filters.status = status;
    }

    const orders = orderSystem.getOrders(filters);

    if (orders.length === 0) {
      return { message: 'No orders pending.', type: 'info' };
    }

    let output = '═══════════════════════════════════════════════════════\n';
    output += '                    PENDING ORDERS\n';
    output += '═══════════════════════════════════════════════════════\n\n';

    for (const order of orders) {
      output += `[${order.id}] ${order.typeName}\n`;
      output += `  Unit: ${order.recipientName}\n`;
      output += `  Target: ${order.targetName || 'N/A'}\n`;
      output += `  Status: ${order.status.toUpperCase()}\n`;
      output += `  Issued: Tick ${order.issuedAt}\n`;
      output += '\n';
    }

    return { render: output };
  }

  /**
   * Communication system
   */
  async comms(action, target, message, context) {
    const messageSystem = this.engine.getSystem('messages');

    switch (action?.toLowerCase()) {
      case 'read': {
        if (target) {
          // Read specific message or from specific sender
          const messages = messageSystem.getMessages(this.playerEntityId, {
            from: this.findContactByName(target)
          });

          if (messages.messages.length === 0) {
            return { message: `No messages from ${target}.`, type: 'info' };
          }

          // Read and display first message
          const msg = messages.messages[0];
          messageSystem.readMessage(this.playerEntityId, msg.id);

          return {
            render: this.formatMessage(msg),
            type: 'info'
          };
        } else {
          // List all messages
          const messages = messageSystem.getMessages(this.playerEntityId, { limit: 10 });

          if (messages.messages.length === 0) {
            return { message: 'No messages.', type: 'info' };
          }

          let output = '═══════════════════════════════════════════════════════\n';
          output += `                 MESSAGES (${messages.unreadCount} unread)\n`;
          output += '═══════════════════════════════════════════════════════\n\n';

          for (const msg of messages.messages) {
            const unread = msg.read ? '  ' : '* ';
            output += `${unread}[${msg.id}] From: ${msg.senderName}\n`;
            output += `   Subject: ${msg.subject || '(no subject)'}\n`;
            output += `   Received: Tick ${msg.receivedAt || msg.sentAt}\n\n`;
          }

          return { render: output };
        }
      }

      case 'send': {
        if (!target) {
          return { message: 'Specify recipient: comms send <recipient> "message"', type: 'error' };
        }
        if (!message) {
          return { message: 'Specify message content in quotes', type: 'error' };
        }

        const recipientId = this.findContactByName(target);
        if (!recipientId) {
          return { message: `Unknown recipient: "${target}"`, type: 'error' };
        }

        const result = messageSystem.sendMessage(this.playerEntityId, recipientId, message, {
          subject: 'Personal Message'
        });

        return {
          message: result.message,
          type: result.success ? 'success' : 'error'
        };
      }

      case 'broadcast': {
        if (!message) {
          return { message: 'Specify message: comms broadcast "message"', type: 'error' };
        }

        const result = messageSystem.broadcast(this.playerEntityId, message);

        return {
          message: result.message,
          type: result.success ? 'success' : 'error'
        };
      }

      case 'list':
      default:
        return this.comms('read', null, null, context);
    }
  }

  /**
   * Format a message for display
   */
  formatMessage(msg) {
    let output = '═══════════════════════════════════════════════════════\n';
    output += `FROM: ${msg.senderName}\n`;
    output += `TO: ${msg.recipientName || 'You'}\n`;
    output += `SUBJECT: ${msg.subject || '(no subject)'}\n`;
    output += `DATE: Tick ${msg.receivedAt || msg.sentAt}\n`;
    output += '───────────────────────────────────────────────────────\n\n';
    output += msg.content + '\n';
    output += '\n═══════════════════════════════════════════════════════\n';
    return output;
  }

  /**
   * Find contact by name
   */
  findContactByName(name) {
    const searchName = name.toLowerCase();

    // Search NPCs
    for (const [entityId, components] of this.entities.query('Character', 'Identity')) {
      if (components.Identity.name.toLowerCase().includes(searchName)) {
        return entityId;
      }
    }

    // Search faction leaders
    const factionSystem = this.engine.getSystem('factions');
    for (const faction of factionSystem.getFactions()) {
      if (faction.name.toLowerCase().includes(searchName)) {
        return faction.id;
      }
    }

    return null;
  }

  /**
   * Request intelligence report on a target
   */
  async intel(target, detailed, context) {
    const intelSystem = this.engine.getSystem('intel');

    // Find target
    const targetId = this.findTargetByName(target);
    if (!targetId) {
      // Check for faction
      const factionSystem = this.engine.getSystem('factions');
      for (const faction of factionSystem.getFactions()) {
        if (faction.name.toLowerCase().includes(target.toLowerCase())) {
          return this.displayFactionIntel(faction.id, detailed);
        }
      }

      return { message: `Unknown target: "${target}"`, type: 'error' };
    }

    // Generate or retrieve intel report
    const existingIntel = intelSystem.getLatestIntel(this.playerEntityId, targetId);

    let report;
    if (existingIntel && (this.engine.state.tick - existingIntel.gatheredAt) < 50) {
      // Use existing recent intel
      report = existingIntel;
    } else {
      // Generate new report
      const result = intelSystem.generateReport(targetId, this.playerEntityId);
      if (!result.success) {
        return { message: result.error, type: 'error' };
      }
      report = result.report;
    }

    return {
      render: this.formatIntelReport(report, detailed),
      type: 'info'
    };
  }

  /**
   * Format an intel report for display
   */
  formatIntelReport(report, detailed) {
    let output = '═══════════════════════════════════════════════════════\n';
    output += '                 INTELLIGENCE REPORT\n';
    output += '═══════════════════════════════════════════════════════\n\n';

    output += `Target: ${report.targetName}\n`;
    output += `Type: ${report.targetType.toUpperCase()}\n`;
    output += `Classification: ${report.classification.toUpperCase()}\n`;
    output += `Accuracy: ${Math.round(report.accuracy * 100)}%\n`;
    output += `Gathered: Tick ${report.gatheredAt}\n`;
    output += '\n───────────────────────────────────────────────────────\n\n';

    const data = report.data;

    for (const [key, value] of Object.entries(data)) {
      if (!detailed && ['composition', 'marketPrices'].includes(key)) continue;

      if (typeof value === 'object' && value !== null) {
        output += `${this.formatKey(key)}:\n`;
        for (const [subKey, subValue] of Object.entries(value)) {
          output += `  ${this.formatKey(subKey)}: ${this.formatValue(subValue)}\n`;
        }
      } else {
        output += `${this.formatKey(key)}: ${this.formatValue(value)}\n`;
      }
    }

    output += '\n═══════════════════════════════════════════════════════\n';
    return output;
  }

  /**
   * Format key for display
   */
  formatKey(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Format value for display
   */
  formatValue(value) {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return String(value);
  }

  /**
   * Display intel on a faction
   */
  async displayFactionIntel(factionId, detailed) {
    const intelSystem = this.engine.getSystem('intel');

    const result = intelSystem.generateReport(factionId, this.playerEntityId);
    if (!result.success) {
      return { message: result.error, type: 'error' };
    }

    return {
      render: this.formatIntelReport(result.report, detailed),
      type: 'info'
    };
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

  /**
   * Character System Methods
   */

  /**
   * Create a new character
   */
  async createCharacter(options, context) {
    const characters = this.engine.getSystem('characters');

    const result = characters.createCharacter({
      name: options.name || this.player.name,
      origin: options.origin,
      profession: options.profession,
      faction: this.player.faction
    });

    // Update player reference
    this.playerEntityId = result.id;
    this.player = {
      ...this.player,
      name: result.name,
      role: result.profession.name,
      stats: {
        health: 100,
        morale: 100,
        energy: 100
      },
      inventory: {
        items: [],
        credits: result.credits,
        capacity: 100
      }
    };

    let output = '═══════════════════════════════════════════════════════\n';
    output += '              CHARACTER CREATED\n';
    output += '═══════════════════════════════════════════════════════\n\n';
    output += `Name: ${result.name}\n`;
    output += `Origin: ${result.origin.name}\n`;
    output += `Profession: ${result.profession.name}\n`;
    output += `Starting Credits: ${result.credits.toLocaleString()}\n\n`;
    output += 'Attributes:\n';
    for (const [attr, value] of Object.entries(result.attributes)) {
      output += `  ${attr}: ${value}\n`;
    }
    output += '\nTop Skills:\n';
    const topSkills = Object.entries(result.skills)
      .filter(([_, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    for (const [skill, value] of topSkills) {
      output += `  ${skill}: ${value}\n`;
    }

    return { render: output, type: 'success' };
  }

  /**
   * Get character skills
   */
  async getCharacterSkills(category, context) {
    const skills = this.entities.getComponent(this.playerEntityId, 'Skills');
    const characters = this.engine.getSystem('characters');

    if (!skills) {
      return { message: 'No skills data available.', type: 'error' };
    }

    let output = '═══════════════════════════════════════════════════════\n';
    output += '                   CHARACTER SKILLS\n';
    output += '═══════════════════════════════════════════════════════\n\n';

    const categories = {
      combat: ['combat', 'tactics'],
      technical: ['engineering', 'piloting', 'hacking'],
      social: ['diplomacy', 'leadership', 'deception'],
      knowledge: ['science', 'medicine', 'trade']
    };

    for (const [cat, skillList] of Object.entries(categories)) {
      if (category && category !== cat) continue;

      output += `${cat.toUpperCase()}\n`;
      for (const skillName of skillList) {
        const baseValue = skills[skillName] || 0;
        const effectiveValue = characters.getEffectiveSkill(this.playerEntityId, skillName);
        const bonus = effectiveValue - baseValue;
        const bonusStr = bonus > 0 ? ` (+${bonus})` : '';
        output += `  ${skillName}: ${baseValue}${bonusStr}\n`;
      }
      output += '\n';
    }

    return { render: output };
  }

  /**
   * Get inventory
   */
  async getInventory(context) {
    const inventory = this.entities.getComponent(this.playerEntityId, 'Inventory');
    const equipment = this.entities.getComponent(this.playerEntityId, 'Equipment');

    if (!inventory) {
      return { message: 'No inventory data available.', type: 'error' };
    }

    let output = '═══════════════════════════════════════════════════════\n';
    output += '                     INVENTORY\n';
    output += '═══════════════════════════════════════════════════════\n\n';

    output += `Credits: ${inventory.credits.toLocaleString()} cr\n`;
    output += `Capacity: ${inventory.items.length}/${inventory.capacity}\n\n`;

    output += 'EQUIPPED:\n';
    for (const slot of ['weapon', 'armor', 'tool', 'implant']) {
      const itemId = equipment?.[slot];
      if (itemId) {
        const item = inventory.items.find(i => i.id === itemId);
        output += `  ${slot}: ${item?.name || 'Unknown'}\n`;
      } else {
        output += `  ${slot}: [empty]\n`;
      }
    }

    output += '\nITEMS:\n';
    if (inventory.items.length === 0) {
      output += '  No items in inventory.\n';
    } else {
      for (const item of inventory.items) {
        const equipped = Object.values(equipment || {}).includes(item.id);
        const eqStr = equipped ? ' [E]' : '';
        output += `  ${item.name}${eqStr} - ${item.value} cr\n`;
      }
    }

    return { render: output };
  }

  /**
   * Equip item
   */
  async equipItem(itemName, context) {
    const inventory = this.entities.getComponent(this.playerEntityId, 'Inventory');
    const characters = this.engine.getSystem('characters');

    const item = inventory?.items.find(i =>
      i.name.toLowerCase().includes(itemName.toLowerCase())
    );

    if (!item) {
      return { message: `Item not found: ${itemName}`, type: 'error' };
    }

    const result = characters.equipItem(this.playerEntityId, item.id);

    if (!result.success) {
      return { message: result.reason, type: 'error' };
    }

    return {
      message: `Equipped ${item.name} to ${result.slot} slot.`,
      type: 'success'
    };
  }

  /**
   * Unequip item
   */
  async unequipItem(slot, context) {
    const characters = this.engine.getSystem('characters');
    const inventory = this.entities.getComponent(this.playerEntityId, 'Inventory');

    const result = characters.unequipItem(this.playerEntityId, slot.toLowerCase());

    if (!result.success) {
      return { message: result.reason, type: 'error' };
    }

    const item = inventory?.items.find(i => i.id === result.item);

    return {
      message: `Unequipped ${item?.name || 'item'} from ${slot} slot.`,
      type: 'success'
    };
  }

  /**
   * Get contacts
   */
  async getContacts(filter, context) {
    const contacts = this.entities.getComponent(this.playerEntityId, 'Contacts');

    if (!contacts) {
      return { message: 'No contacts data available.', type: 'error' };
    }

    let output = '═══════════════════════════════════════════════════════\n';
    output += '                      CONTACTS\n';
    output += '═══════════════════════════════════════════════════════\n\n';

    if (contacts.contacts.length === 0) {
      output += 'No contacts yet. Meet NPCs to add them.\n';
    } else {
      const filtered = filter
        ? contacts.contacts.filter(c => c.type === filter)
        : contacts.contacts;

      for (const contact of filtered) {
        const relationStr = contact.relation > 0 ? `+${contact.relation}` : contact.relation;
        output += `${contact.name}\n`;
        output += `  Type: ${contact.type} | Relation: ${relationStr}\n`;
        if (contact.faction) {
          output += `  Faction: ${contact.faction}\n`;
        }
        output += '\n';
      }
    }

    return { render: output };
  }

  /**
   * Get reputation
   */
  async getReputation(factionFilter, context) {
    const reputation = this.entities.getComponent(this.playerEntityId, 'Reputation');
    const factions = this.engine.getSystem('factions');
    const characters = this.engine.getSystem('characters');

    if (!reputation) {
      return { message: 'No reputation data available.', type: 'error' };
    }

    let output = '═══════════════════════════════════════════════════════\n';
    output += '                 FACTION REPUTATION\n';
    output += '═══════════════════════════════════════════════════════\n\n';

    const allFactions = factions.getFactions();

    for (const faction of allFactions) {
      if (factionFilter && !faction.name.toLowerCase().includes(factionFilter.toLowerCase())) {
        continue;
      }

      const value = reputation.standings[faction.id] || 0;
      const standing = characters.getReputationStanding(value);

      output += `${faction.name}\n`;
      output += `  Standing: ${standing.level} (${value})\n`;
      output += '\n';
    }

    return { render: output };
  }
}

export default Game;
