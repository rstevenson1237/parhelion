/**
 * NEXUS PROTOCOL - Universe System
 * 
 * Procedural generation and management of the galaxy.
 * Stars, planets, stations, jump routes, and spatial relationships.
 */

import { Components } from '../core/ECS.js';

// Stellar classification data
const STELLAR_CLASSES = {
  O: { color: 'blue', temp: '30000K+', rarity: 0.00003, habitable: 0.1 },
  B: { color: 'blue-white', temp: '10000-30000K', rarity: 0.0013, habitable: 0.2 },
  A: { color: 'white', temp: '7500-10000K', rarity: 0.006, habitable: 0.4 },
  F: { color: 'yellow-white', temp: '6000-7500K', rarity: 0.03, habitable: 0.7 },
  G: { color: 'yellow', temp: '5200-6000K', rarity: 0.076, habitable: 0.9 },
  K: { color: 'orange', temp: '3700-5200K', rarity: 0.121, habitable: 0.6 },
  M: { color: 'red', temp: '2400-3700K', rarity: 0.765, habitable: 0.3 }
};

const PLANET_TYPES = {
  barren: { icon: '○', resources: ['minerals', 'metals'], habitable: false },
  rocky: { icon: '◐', resources: ['minerals', 'metals', 'rare_earth'], habitable: false },
  desert: { icon: '◑', resources: ['minerals', 'rare_earth'], habitable: true },
  ocean: { icon: '◕', resources: ['water', 'organics'], habitable: true },
  temperate: { icon: '●', resources: ['organics', 'water', 'minerals'], habitable: true },
  ice: { icon: '◔', resources: ['water', 'gases'], habitable: false },
  gas_giant: { icon: '◉', resources: ['gases', 'fuel'], habitable: false },
  volcanic: { icon: '◈', resources: ['metals', 'energy'], habitable: false }
};

const STATION_TYPES = {
  orbital: { icon: '□', purpose: 'general', capacity: 10000 },
  military: { icon: '■', purpose: 'military', capacity: 5000 },
  trade: { icon: '◇', purpose: 'commerce', capacity: 50000 },
  research: { icon: '△', purpose: 'science', capacity: 2000 },
  mining: { icon: '▣', purpose: 'extraction', capacity: 1000 },
  shipyard: { icon: '▢', purpose: 'construction', capacity: 5000 }
};

export class UniverseSystem {
  constructor() {
    this.entities = null;
    this.engine = null;
    this.events = null;
    this.rng = null;
    this.config = {
      galaxySize: 100,          // Light years across
      starDensity: 0.15,        // Stars per cubic LY
      minStars: 20,
      maxStars: 200,
      connectionDistance: 15,   // Max jump route distance
      minConnections: 1,
      maxConnections: 5
    };
  }

  initialize(engine) {
    this.engine = engine;
    this.entities = engine.getSystem('entities')?.entities || engine.entities;
    this.events = engine.events;
  }

  setRNG(rng) {
    this.rng = rng;
  }

  /**
   * Generate a new galaxy
   */
  generate(seed, options = {}) {
    const config = { ...this.config, ...options };
    
    this.events?.emit('universe:generating', { seed, config });

    // Generate star systems
    const stars = this.generateStars(config);
    
    // Generate jump routes
    const routes = this.generateRoutes(stars, config);
    
    // Generate planets and stations for each system
    for (const star of stars) {
      this.generateSystemContents(star);
    }

    this.events?.emit('universe:generated', { 
      stars: stars.length, 
      routes: routes.length 
    });

    return { stars, routes };
  }

  /**
   * Generate star systems
   */
  generateStars(config) {
    const stars = [];
    const numStars = Math.floor(
      config.minStars + this.rng() * (config.maxStars - config.minStars)
    );

    // Use Poisson disk sampling for natural distribution
    const points = this.poissonDiskSample(
      config.galaxySize, 
      config.galaxySize, 
      config.galaxySize / Math.sqrt(numStars) * 1.5,
      numStars
    );

    for (let i = 0; i < points.length; i++) {
      const star = this.createStar(points[i], i);
      stars.push(star);
    }

    return stars;
  }

  /**
   * Create a single star system
   */
  createStar(position, index) {
    const entityId = this.entities.create(`star_${index}`);
    
    // Determine stellar class based on rarity
    const stellarClass = this.selectStellarClass();
    const classData = STELLAR_CLASSES[stellarClass];
    
    // Generate name
    const name = this.generateStarName(index);

    // Add components
    this.entities.addComponent(entityId, 'Identity', 
      Components.Identity(name, 'star', `A ${classData.color} ${stellarClass}-class star`)
    );

    this.entities.addComponent(entityId, 'Position',
      Components.Position(position.x, position.y, position.z)
    );

    this.entities.addComponent(entityId, 'Star',
      Components.Star(
        stellarClass,
        0.5 + this.rng() * 1.5,  // luminosity
        0.3 + this.rng() * 2.0   // mass
      )
    );

    this.entities.addComponent(entityId, 'Tags',
      Components.Tags('celestial', 'navigable', 'system')
    );

    // Intel starts as basic
    this.entities.addComponent(entityId, 'Intel',
      Components.Intel({ discovered: false }, [], 0)
    );

    return {
      id: entityId,
      name,
      position,
      stellarClass,
      connections: []
    };
  }

  /**
   * Select stellar class based on realistic distribution
   */
  selectStellarClass() {
    const roll = this.rng();
    let cumulative = 0;

    for (const [cls, data] of Object.entries(STELLAR_CLASSES)) {
      cumulative += data.rarity;
      if (roll < cumulative) return cls;
    }

    return 'M'; // Default to most common
  }

  /**
   * Generate a star name
   */
  generateStarName(index) {
    const prefixes = [
      'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
      'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi'
    ];
    const roots = [
      'Centauri', 'Eridani', 'Cygni', 'Draconis', 'Leonis', 'Aquilae',
      'Persei', 'Tauri', 'Orionis', 'Cassiopeiae', 'Andromedae', 'Pegasi',
      'Lyrae', 'Carinae', 'Velorum', 'Pavonis', 'Gruis', 'Phoenicis'
    ];
    const suffixes = ['Prime', 'Major', 'Minor', 'Secundus', 'Tertius', ''];

    // Sometimes use catalog designation
    if (this.rng() < 0.3) {
      const catalog = ['HD', 'GJ', 'HIP', 'LHS', 'Ross', 'Wolf', 'Lalande'];
      return `${catalog[Math.floor(this.rng() * catalog.length)]} ${1000 + Math.floor(this.rng() * 9000)}`;
    }

    const prefix = prefixes[Math.floor(this.rng() * prefixes.length)];
    const root = roots[Math.floor(this.rng() * roots.length)];
    const suffix = suffixes[Math.floor(this.rng() * suffixes.length)];

    return suffix ? `${prefix} ${root} ${suffix}` : `${prefix} ${root}`;
  }

  /**
   * Generate jump routes between stars
   */
  generateRoutes(stars, config) {
    const routes = [];
    const connections = new Map();

    // Initialize connection tracking
    for (const star of stars) {
      connections.set(star.id, new Set());
    }

    // Calculate distances and sort by proximity
    const pairs = [];
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const dist = this.distance(stars[i].position, stars[j].position);
        if (dist <= config.connectionDistance) {
          pairs.push({ a: stars[i], b: stars[j], distance: dist });
        }
      }
    }
    pairs.sort((a, b) => a.distance - b.distance);

    // Create minimum spanning tree first (ensures connectivity)
    const visited = new Set();
    visited.add(stars[0].id);

    while (visited.size < stars.length) {
      let foundConnection = false;
      
      for (const pair of pairs) {
        const aVisited = visited.has(pair.a.id);
        const bVisited = visited.has(pair.b.id);

        if (aVisited !== bVisited) {
          this.createRoute(pair.a, pair.b, pair.distance, routes, connections);
          visited.add(pair.a.id);
          visited.add(pair.b.id);
          foundConnection = true;
          break;
        }
      }
      
      // Handle disconnected graphs - find nearest unvisited and create long-range route
      if (!foundConnection) {
        let bestPair = null;
        let bestDist = Infinity;
        
        for (const star of stars) {
          if (visited.has(star.id)) continue;
          
          for (const visitedId of visited) {
            const visitedStar = stars.find(s => s.id === visitedId);
            const dist = this.distance(star.position, visitedStar.position);
            if (dist < bestDist) {
              bestDist = dist;
              bestPair = { a: visitedStar, b: star, distance: dist };
            }
          }
        }
        
        if (bestPair) {
          this.createRoute(bestPair.a, bestPair.b, bestPair.distance, routes, connections);
          visited.add(bestPair.b.id);
        } else {
          break; // No more stars to connect
        }
      }
    }

    // Add additional routes for redundancy
    for (const pair of pairs) {
      const aConns = connections.get(pair.a.id).size;
      const bConns = connections.get(pair.b.id).size;

      if (aConns < config.maxConnections && 
          bConns < config.maxConnections &&
          !connections.get(pair.a.id).has(pair.b.id)) {
        
        // Probabilistic based on distance
        if (this.rng() < 0.5 * (1 - pair.distance / config.connectionDistance)) {
          this.createRoute(pair.a, pair.b, pair.distance, routes, connections);
        }
      }
    }

    return routes;
  }

  /**
   * Create a jump route between two stars
   */
  createRoute(starA, starB, distance, routes, connections) {
    const routeId = this.entities.create(`route_${starA.id}_${starB.id}`);

    this.entities.addComponent(routeId, 'Identity',
      Components.Identity(
        `${starA.name} - ${starB.name}`,
        'jump_route',
        `Jump route spanning ${distance.toFixed(1)} light years`
      )
    );

    // Store route data (we'll use a custom component)
    this.entities.addComponent(routeId, 'Route', {
      from: starA.id,
      to: starB.id,
      distance,
      travelTime: Math.ceil(distance * 2), // Hours
      hazard: this.rng() * 0.3,
      discovered: false
    });

    this.entities.addComponent(routeId, 'Tags',
      Components.Tags('route', 'navigable')
    );

    // Track connections
    connections.get(starA.id).add(starB.id);
    connections.get(starB.id).add(starA.id);
    starA.connections.push(starB.id);
    starB.connections.push(starA.id);

    routes.push({
      id: routeId,
      from: starA.id,
      to: starB.id,
      distance
    });

    return routeId;
  }

  /**
   * Generate planets and stations for a star system
   */
  generateSystemContents(star) {
    const starData = this.entities.getComponent(star.id, 'Star');
    const classData = STELLAR_CLASSES[starData.spectralClass];
    
    // Number of planets based on star type
    const numPlanets = Math.floor(1 + this.rng() * 8 * classData.habitable);
    const planets = [];

    for (let i = 0; i < numPlanets; i++) {
      const planet = this.createPlanet(star, i, classData);
      planets.push(planet);
    }

    // Maybe add a station
    if (this.rng() < 0.4 || planets.some(p => p.habitable)) {
      this.createStation(star, planets);
    }

    return planets;
  }

  /**
   * Create a planet
   */
  createPlanet(star, index, starClassData) {
    const entityId = this.entities.create(`${star.id}_planet_${index}`);
    
    // Determine planet type based on distance and star
    const orbitDistance = 0.3 + index * (0.3 + this.rng() * 0.5);
    const planetType = this.selectPlanetType(orbitDistance, starClassData);
    const typeData = PLANET_TYPES[planetType];

    const name = `${star.name} ${this.romanNumeral(index + 1)}`;

    this.entities.addComponent(entityId, 'Identity',
      Components.Identity(name, 'planet', `A ${planetType} world`)
    );

    this.entities.addComponent(entityId, 'Orbit',
      Components.Orbit(star.id, orbitDistance, orbitDistance * 365, this.rng() * 360)
    );

    const gravity = planetType === 'gas_giant' ? 2.5 : 0.3 + this.rng() * 1.4;
    const atmosphere = typeData.habitable ? 'breathable' : 
                       planetType === 'gas_giant' ? 'crushing' : 'none';
    const population = typeData.habitable && this.rng() < 0.3 ? 
                       Math.floor(this.rng() * 10000000) : 0;

    this.entities.addComponent(entityId, 'Planet',
      Components.Planet(planetType, atmosphere, gravity, population)
    );

    // Resources
    const stored = {};
    for (const resource of typeData.resources) {
      stored[resource] = Math.floor(this.rng() * 10000);
    }
    this.entities.addComponent(entityId, 'Resources',
      Components.Resources(stored, 100000)
    );

    this.entities.addComponent(entityId, 'Tags',
      Components.Tags('celestial', 'planet', planetType)
    );

    return {
      id: entityId,
      name,
      type: planetType,
      habitable: typeData.habitable,
      population
    };
  }

  /**
   * Select planet type based on orbital distance
   */
  selectPlanetType(distance, starClassData) {
    // Inner zone: rocky, volcanic, barren
    if (distance < 0.5) {
      const types = ['barren', 'rocky', 'volcanic'];
      return types[Math.floor(this.rng() * types.length)];
    }
    
    // Habitable zone
    if (distance < 1.5 && this.rng() < starClassData.habitable) {
      const types = ['temperate', 'ocean', 'desert'];
      return types[Math.floor(this.rng() * types.length)];
    }
    
    // Outer zone
    if (distance < 3) {
      const types = ['ice', 'rocky', 'barren'];
      return types[Math.floor(this.rng() * types.length)];
    }
    
    // Far outer: gas giants
    return this.rng() < 0.6 ? 'gas_giant' : 'ice';
  }

  /**
   * Create a space station
   */
  createStation(star, planets) {
    const entityId = this.entities.create(`${star.id}_station`);
    
    // Type based on system characteristics
    const hasHabitable = planets.some(p => p.habitable);
    const typeRoll = this.rng();
    
    let stationType;
    if (hasHabitable) {
      stationType = typeRoll < 0.4 ? 'trade' : typeRoll < 0.7 ? 'orbital' : 'shipyard';
    } else {
      stationType = typeRoll < 0.4 ? 'mining' : typeRoll < 0.7 ? 'research' : 'military';
    }

    const typeData = STATION_TYPES[stationType];
    const name = `${star.name} ${stationType === 'military' ? 'Fortress' : 'Station'}`;

    this.entities.addComponent(entityId, 'Identity',
      Components.Identity(name, 'station', `A ${stationType} installation`)
    );

    this.entities.addComponent(entityId, 'Orbit',
      Components.Orbit(star.id, 0.1, 30, this.rng() * 360)
    );

    this.entities.addComponent(entityId, 'Resources',
      Components.Resources({}, typeData.capacity)
    );

    // Station has a market
    if (stationType === 'trade' || stationType === 'orbital') {
      this.entities.addComponent(entityId, 'Market',
        Components.Market({}, {}, {})
      );
    }

    this.entities.addComponent(entityId, 'Tags',
      Components.Tags('station', stationType, 'dockable')
    );

    return { id: entityId, name, type: stationType };
  }

  /**
   * Poisson disk sampling for natural point distribution
   */
  poissonDiskSample(width, height, radius, maxPoints) {
    const cellSize = radius / Math.sqrt(3);
    const gridWidth = Math.ceil(width / cellSize);
    const gridHeight = Math.ceil(height / cellSize);
    const grid = new Array(gridWidth * gridHeight).fill(null);
    const points = [];
    const active = [];

    // Helper to get grid index
    const gridIndex = (x, y) => {
      const gx = Math.floor(x / cellSize);
      const gy = Math.floor(y / cellSize);
      return gy * gridWidth + gx;
    };

    // Start with random point
    const startX = width / 2 + (this.rng() - 0.5) * width * 0.5;
    const startY = height / 2 + (this.rng() - 0.5) * height * 0.5;
    const startZ = (this.rng() - 0.5) * height * 0.3;
    
    const startPoint = { x: startX, y: startY, z: startZ };
    points.push(startPoint);
    active.push(startPoint);
    grid[gridIndex(startX, startY)] = startPoint;

    while (active.length > 0 && points.length < maxPoints) {
      const randIndex = Math.floor(this.rng() * active.length);
      const point = active[randIndex];
      let found = false;

      for (let i = 0; i < 30; i++) {
        const angle = this.rng() * Math.PI * 2;
        const dist = radius + this.rng() * radius;
        const newX = point.x + Math.cos(angle) * dist;
        const newY = point.y + Math.sin(angle) * dist;
        const newZ = point.z + (this.rng() - 0.5) * radius;

        if (newX < 0 || newX >= width || newY < 0 || newY >= height) continue;

        let valid = true;
        const gx = Math.floor(newX / cellSize);
        const gy = Math.floor(newY / cellSize);

        // Check neighboring cells
        for (let dx = -2; dx <= 2 && valid; dx++) {
          for (let dy = -2; dy <= 2 && valid; dy++) {
            const nx = gx + dx;
            const ny = gy + dy;
            if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;
            
            const neighbor = grid[ny * gridWidth + nx];
            if (neighbor) {
              const d = Math.sqrt(
                (newX - neighbor.x) ** 2 + 
                (newY - neighbor.y) ** 2 +
                (newZ - neighbor.z) ** 2
              );
              if (d < radius) valid = false;
            }
          }
        }

        if (valid) {
          const newPoint = { x: newX, y: newY, z: newZ };
          points.push(newPoint);
          active.push(newPoint);
          grid[gy * gridWidth + gx] = newPoint;
          found = true;
          break;
        }
      }

      if (!found) {
        active.splice(randIndex, 1);
      }
    }

    return points;
  }

  /**
   * Calculate 3D distance
   */
  distance(a, b) {
    return Math.sqrt(
      (a.x - b.x) ** 2 + 
      (a.y - b.y) ** 2 + 
      (a.z - b.z) ** 2
    );
  }

  /**
   * Convert number to roman numeral
   */
  romanNumeral(num) {
    const numerals = [
      ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'],
      ['', 'X', 'XX', 'XXX', 'XL', 'L', 'LX', 'LXX', 'LXXX', 'XC']
    ];
    
    if (num <= 0 || num >= 100) return num.toString();
    
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    
    return numerals[1][tens] + numerals[0][ones];
  }

  /**
   * Get star by ID
   */
  getStar(starId) {
    return this.entities.getComponents(starId);
  }

  /**
   * Get all stars
   */
  *getStars() {
    yield* this.entities.query('Identity', 'Position', 'Star');
  }

  /**
   * Get all routes
   */
  *getRoutes() {
    yield* this.entities.query('Identity', 'Route');
  }

  /**
   * Get planets in a system
   */
  *getPlanetsInSystem(starId) {
    for (const [id, components] of this.entities.query('Identity', 'Orbit', 'Planet')) {
      if (components.Orbit.parentId === starId) {
        yield [id, components];
      }
    }
  }

  /**
   * Get connected systems
   */
  getConnectedSystems(starId) {
    const connected = [];
    
    for (const [id, components] of this.getRoutes()) {
      if (components.Route.from === starId) {
        connected.push({ 
          id: components.Route.to, 
          distance: components.Route.distance,
          routeId: id
        });
      } else if (components.Route.to === starId) {
        connected.push({ 
          id: components.Route.from, 
          distance: components.Route.distance,
          routeId: id
        });
      }
    }

    return connected;
  }

  /**
   * Export universe data for serialization
   */
  getState() {
    return this.entities.serialize();
  }

  /**
   * Load universe state
   */
  loadState(state) {
    this.entities.deserialize(state);
  }
}

export default UniverseSystem;
