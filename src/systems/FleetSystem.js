/**
 * PARHELION - Fleet System
 *
 * Manages fleet creation, movement, and command structure.
 */

import { Components } from '../core/ECS.js';

export const SHIP_TYPES = {
  FRIGATE: { name: 'Frigate', combat: 10, speed: 8, cargo: 50 },
  DESTROYER: { name: 'Destroyer', combat: 25, speed: 6, cargo: 100 },
  CRUISER: { name: 'Cruiser', combat: 50, speed: 4, cargo: 200 },
  BATTLESHIP: { name: 'Battleship', combat: 100, speed: 2, cargo: 500 },
  CARRIER: { name: 'Carrier', combat: 75, speed: 3, cargo: 1000 },
  TRANSPORT: { name: 'Transport', combat: 5, speed: 5, cargo: 2000 },
  SCOUT: { name: 'Scout', combat: 5, speed: 10, cargo: 20 }
};

export const FLEET_PREFIXES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Theta', 'Iota'];
export const FLEET_SUFFIXES = ['Squadron', 'Fleet', 'Task Force', 'Wing', 'Group', 'Division'];

export class FleetSystem {
  constructor() {
    this.entities = null;
    this.engine = null;
    this.events = null;
    this.rng = null;
    this.fleetCounter = 0;
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
    // Process fleet movements and states
    this.processFleetMovements(tickData);
  }

  /**
   * Create a new fleet
   */
  createFleet(options = {}) {
    const fleetId = this.entities.create();

    // Generate name
    const name = options.name || this.generateFleetName();

    // Create identity
    this.entities.addComponent(fleetId, 'Identity', Components.Identity(
      name,
      'fleet',
      options.description || `${name} - Combat Fleet`
    ));

    // Fleet component
    this.entities.addComponent(fleetId, 'Fleet', {
      shipCount: options.shipCount || 5,
      composition: options.composition || { FRIGATE: 3, DESTROYER: 2 },
      combatPower: this.calculateCombatPower(options.composition || { FRIGATE: 3, DESTROYER: 2 }),
      speed: this.calculateSpeed(options.composition || { FRIGATE: 3, DESTROYER: 2 }),
      status: 'ready',
      homeBase: options.homeBase || null
    });

    // Position at location
    if (options.locationId) {
      const pos = this.entities.getComponent(options.locationId, 'Position');
      if (pos) {
        this.entities.addComponent(fleetId, 'Position', Components.Position(
          pos.x,
          pos.y,
          pos.z || 0
        ));
      }
      this.entities.addComponent(fleetId, 'PlayerLocation',
        Components.PlayerLocation(options.locationId, null, null)
      );
    }

    // Make commandable
    this.entities.addComponent(fleetId, 'Commandable', Components.Commandable({
      commanderId: options.commanderId || null,
      competence: options.competence || (0.6 + (this.rng ? this.rng() * 0.3 : 0.15)),
      loyalty: options.loyalty || (0.7 + (this.rng ? this.rng() * 0.3 : 0.15)),
      initiative: options.initiative || 0.5,
      commsRange: 100
    }));

    // Faction membership
    if (options.factionId) {
      this.entities.addComponent(fleetId, 'FactionMember', {
        factionId: options.factionId,
        role: 'military',
        joinedAt: this.engine.state.tick
      });
    }

    // Order queue
    this.entities.addComponent(fleetId, 'OrderQueue', Components.OrderQueue({
      maxQueueSize: 10
    }));

    this.fleetCounter++;

    this.events?.emit('fleet:created', {
      fleetId,
      name,
      factionId: options.factionId
    });

    return {
      id: fleetId,
      name,
      success: true
    };
  }

  /**
   * Generate a fleet name
   */
  generateFleetName() {
    const prefix = FLEET_PREFIXES[Math.floor((this.rng ? this.rng() : Math.random()) * FLEET_PREFIXES.length)];
    const suffix = FLEET_SUFFIXES[Math.floor((this.rng ? this.rng() : Math.random()) * FLEET_SUFFIXES.length)];
    return `${prefix} ${suffix}`;
  }

  /**
   * Calculate fleet combat power
   */
  calculateCombatPower(composition) {
    let total = 0;
    for (const [type, count] of Object.entries(composition)) {
      const shipType = SHIP_TYPES[type];
      if (shipType) {
        total += shipType.combat * count;
      }
    }
    return total;
  }

  /**
   * Calculate fleet speed (limited by slowest ship)
   */
  calculateSpeed(composition) {
    let minSpeed = Infinity;
    for (const [type, count] of Object.entries(composition)) {
      if (count > 0) {
        const shipType = SHIP_TYPES[type];
        if (shipType && shipType.speed < minSpeed) {
          minSpeed = shipType.speed;
        }
      }
    }
    return minSpeed === Infinity ? 5 : minSpeed;
  }

  /**
   * Process fleet movements
   */
  processFleetMovements(tickData) {
    // Fleets moving toward destinations
    for (const [fleetId, components] of this.entities.query('Fleet', 'Position', 'MoveTo')) {
      const moveTo = components.MoveTo;
      const position = components.Position;
      const fleet = components.Fleet;

      // Calculate movement
      const dx = moveTo.targetX - position.x;
      const dy = moveTo.targetY - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const moveDistance = fleet.speed * 2; // LY per tick

      if (distance <= moveDistance) {
        // Arrived
        position.x = moveTo.targetX;
        position.y = moveTo.targetY;

        // Update location component
        const playerLoc = this.entities.getComponent(fleetId, 'PlayerLocation');
        if (playerLoc) {
          playerLoc.systemId = moveTo.targetId;
        }

        this.entities.removeComponent(fleetId, 'MoveTo');

        this.events?.emit('fleet:arrived', {
          fleetId,
          destinationId: moveTo.targetId
        });
      } else {
        // Move toward target
        const ratio = moveDistance / distance;
        position.x += dx * ratio;
        position.y += dy * ratio;
      }
    }
  }

  /**
   * Get all fleets
   */
  getFleets(filters = {}) {
    const results = [];

    // Query for Fleet component and check for Identity manually
    // (workaround for multi-component query issue)
    for (const [fleetId] of this.entities.withComponent('Fleet')) {
      const fleet = this.entities.getComponent(fleetId, 'Fleet');
      const identity = this.entities.getComponent(fleetId, 'Identity');

      if (!fleet || !identity) continue;

      if (filters.factionId) {
        const member = this.entities.getComponent(fleetId, 'FactionMember');
        if (!member || member.factionId !== filters.factionId) continue;
      }

      if (filters.status && fleet.status !== filters.status) continue;

      const location = this.entities.getComponent(fleetId, 'PlayerLocation');
      const commandable = this.entities.getComponent(fleetId, 'Commandable');

      results.push({
        id: fleetId,
        name: identity.name,
        shipCount: fleet.shipCount,
        combatPower: fleet.combatPower,
        status: fleet.status,
        locationId: location?.systemId,
        commanderId: commandable?.commanderId
      });
    }

    return results;
  }

  /**
   * Get fleet by ID
   */
  getFleet(fleetId) {
    const fleet = this.entities.getComponent(fleetId, 'Fleet');
    const identity = this.entities.getComponent(fleetId, 'Identity');

    if (!fleet || !identity) return null;

    return {
      id: fleetId,
      name: identity.name,
      ...fleet
    };
  }

  /**
   * Get state
   */
  getState() {
    return { fleetCounter: this.fleetCounter };
  }

  /**
   * Load state
   */
  loadState(state) {
    if (state.fleetCounter) {
      this.fleetCounter = state.fleetCounter;
    }
  }
}

export default FleetSystem;
