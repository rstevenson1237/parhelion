/**
 * NEXUS PROTOCOL - Entity Component System
 * 
 * A flexible ECS for managing game entities (stars, planets, ships, characters, factions).
 * Entities are just IDs. Components are data. Systems process entities with specific components.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Component definitions - pure data containers
 */
export const Components = {
  // Spatial
  Position: (x = 0, y = 0, z = 0) => ({ x, y, z }),
  Velocity: (dx = 0, dy = 0, dz = 0) => ({ dx, dy, dz }),
  
  // Identity
  Identity: (name, type, description = '') => ({ name, type, description }),
  Ownership: (ownerId, factionId = null) => ({ ownerId, factionId }),
  
  // Celestial
  Star: (spectralClass, luminosity, mass) => ({ spectralClass, luminosity, mass }),
  Planet: (planetType, atmosphere, gravity, population = 0) => ({ 
    planetType, atmosphere, gravity, population 
  }),
  Orbit: (parentId, distance, period, angle = 0) => ({ 
    parentId, distance, period, angle 
  }),
  
  // Economic
  Resources: (stored = {}, capacity = 1000) => ({ stored, capacity }),
  Production: (produces = {}, consumes = {}) => ({ produces, consumes }),
  Market: (prices = {}, demand = {}, supply = {}) => ({ prices, demand, supply }),
  
  // Military
  Fleet: (ships = [], commander = null, orders = []) => ({ ships, commander, orders }),
  Ship: (shipClass, hull, armor, weapons = [], systems = []) => ({ 
    shipClass, hull, armor, weapons, systems 
  }),
  Combat: (attack, defense, range, speed) => ({ attack, defense, range, speed }),
  
  // Political
  Faction: (ideology, goals = [], traits = []) => ({ ideology, goals, traits }),
  Diplomacy: (relations = {}, treaties = [], reputation = 50) => ({ 
    relations, treaties, reputation 
  }),
  Influence: (political = 0, economic = 0, military = 0) => ({ 
    political, economic, military 
  }),
  
  // Character
  Character: (role, skills = {}, traits = [], background = '') => ({ 
    role, skills, traits, background 
  }),
  Stats: (health = 100, morale = 100, energy = 100) => ({ health, morale, energy }),
  Inventory: (items = [], credits = 0, capacity = 100) => ({ items, credits, capacity }),
  Social: (contacts = [], enemies = [], allies = []) => ({ contacts, enemies, allies }),
  
  // Communication
  Comms: (inbox = [], outbox = [], channels = []) => ({ inbox, outbox, channels }),
  Intel: (known = {}, rumors = [], lastUpdate = 0) => ({ known, rumors, lastUpdate }),
  
  // Meta
  Tags: (...tags) => ({ tags: new Set(tags) }),
  Visible: (to = 'all', range = Infinity) => ({ to, range }),
  Temporal: (created = Date.now(), updated = Date.now()) => ({ created, updated }),

  // Player specific
  PlayerLocation: (systemId, bodyId = null, stationId = null) => ({
    systemId,    // Current star system
    bodyId,      // Planet/moon if landed
    stationId    // Station if docked
  })
};

/**
 * Entity Manager - handles entity lifecycle and queries
 */
export class EntityManager {
  constructor() {
    this.entities = new Map();      // entityId -> Set of component names
    this.components = new Map();    // componentName -> Map(entityId -> data)
    this.archetypes = new Map();    // archetype hash -> Set of entityIds
    this.entityData = new Map();    // entityId -> { created, tags, etc }
  }

  /**
   * Create a new entity
   * @param {string} id - Optional custom ID
   * @returns {string} Entity ID
   */
  create(id = null) {
    const entityId = id || uuidv4();
    
    if (this.entities.has(entityId)) {
      throw new Error(`Entity "${entityId}" already exists`);
    }

    this.entities.set(entityId, new Set());
    this.entityData.set(entityId, {
      created: Date.now(),
      updated: Date.now()
    });

    return entityId;
  }

  /**
   * Destroy an entity and all its components
   */
  destroy(entityId) {
    if (!this.entities.has(entityId)) return false;

    const componentNames = this.entities.get(entityId);
    
    for (const name of componentNames) {
      const store = this.components.get(name);
      if (store) store.delete(entityId);
    }

    this.entities.delete(entityId);
    this.entityData.delete(entityId);
    this.updateArchetypes(entityId, null);

    return true;
  }

  /**
   * Add a component to an entity
   */
  addComponent(entityId, componentName, data) {
    if (!this.entities.has(entityId)) {
      throw new Error(`Entity "${entityId}" does not exist`);
    }

    if (!this.components.has(componentName)) {
      this.components.set(componentName, new Map());
    }

    this.components.get(componentName).set(entityId, data);
    this.entities.get(entityId).add(componentName);
    this.updateArchetypes(entityId, this.entities.get(entityId));

    const meta = this.entityData.get(entityId);
    if (meta) meta.updated = Date.now();

    return this;
  }

  /**
   * Remove a component from an entity
   */
  removeComponent(entityId, componentName) {
    if (!this.entities.has(entityId)) return false;

    const store = this.components.get(componentName);
    if (store) store.delete(entityId);

    this.entities.get(entityId).delete(componentName);
    this.updateArchetypes(entityId, this.entities.get(entityId));

    return true;
  }

  /**
   * Get a component from an entity
   */
  getComponent(entityId, componentName) {
    const store = this.components.get(componentName);
    return store ? store.get(entityId) : undefined;
  }

  /**
   * Check if entity has a component
   */
  hasComponent(entityId, componentName) {
    return this.entities.has(entityId) && 
           this.entities.get(entityId).has(componentName);
  }

  /**
   * Get all components for an entity
   */
  getComponents(entityId) {
    if (!this.entities.has(entityId)) return null;

    const result = {};
    const componentNames = this.entities.get(entityId);

    for (const name of componentNames) {
      result[name] = this.getComponent(entityId, name);
    }

    return result;
  }

  /**
   * Query entities with specific components
   * @param {...string} componentNames - Required components
   * @returns {Generator} Yields [entityId, components]
   */
  *query(...componentNames) {
    // Use archetype for fast lookup if available
    const archetype = this.getArchetypeHash(new Set(componentNames));
    const candidates = this.archetypes.get(archetype);

    if (candidates) {
      for (const entityId of candidates) {
        const components = {};
        let valid = true;

        for (const name of componentNames) {
          const data = this.getComponent(entityId, name);
          if (data === undefined) {
            valid = false;
            break;
          }
          components[name] = data;
        }

        if (valid) yield [entityId, components];
      }
    } else {
      // Fallback to full scan
      for (const [entityId, entityComponents] of this.entities) {
        let hasAll = true;
        const components = {};

        for (const name of componentNames) {
          if (!entityComponents.has(name)) {
            hasAll = false;
            break;
          }
          components[name] = this.getComponent(entityId, name);
        }

        if (hasAll) yield [entityId, components];
      }
    }
  }

  /**
   * Get all entities with a specific component
   */
  *withComponent(componentName) {
    const store = this.components.get(componentName);
    if (!store) return;

    for (const [entityId, data] of store) {
      yield [entityId, data];
    }
  }

  /**
   * Find first entity matching query
   */
  findFirst(...componentNames) {
    for (const result of this.query(...componentNames)) {
      return result;
    }
    return null;
  }

  /**
   * Count entities matching query
   */
  count(...componentNames) {
    let count = 0;
    for (const _ of this.query(...componentNames)) {
      count++;
    }
    return count;
  }

  /**
   * Update archetype index for entity
   */
  updateArchetypes(entityId, components) {
    // Remove from all current archetypes
    for (const [hash, entities] of this.archetypes) {
      entities.delete(entityId);
    }

    if (components && components.size > 0) {
      const hash = this.getArchetypeHash(components);
      if (!this.archetypes.has(hash)) {
        this.archetypes.set(hash, new Set());
      }
      this.archetypes.get(hash).add(entityId);
    }
  }

  /**
   * Generate archetype hash from component set
   */
  getArchetypeHash(components) {
    return Array.from(components).sort().join('|');
  }

  /**
   * Serialize all entities
   */
  serialize() {
    const data = {
      entities: [],
      meta: {}
    };

    for (const [entityId, componentNames] of this.entities) {
      const entity = {
        id: entityId,
        components: {}
      };

      for (const name of componentNames) {
        entity.components[name] = this.getComponent(entityId, name);
      }

      data.entities.push(entity);
      data.meta[entityId] = this.entityData.get(entityId);
    }

    return data;
  }

  /**
   * Deserialize entities from data
   */
  deserialize(data) {
    this.entities.clear();
    this.components.clear();
    this.archetypes.clear();
    this.entityData.clear();

    for (const entity of data.entities) {
      this.create(entity.id);
      
      for (const [name, componentData] of Object.entries(entity.components)) {
        this.addComponent(entity.id, name, componentData);
      }

      if (data.meta && data.meta[entity.id]) {
        this.entityData.set(entity.id, data.meta[entity.id]);
      }
    }

    return this;
  }

  /**
   * Get statistics about the ECS
   */
  stats() {
    return {
      entityCount: this.entities.size,
      componentTypes: this.components.size,
      archetypes: this.archetypes.size,
      componentCounts: Object.fromEntries(
        Array.from(this.components.entries()).map(([name, store]) => [name, store.size])
      )
    };
  }
}

export default EntityManager;
