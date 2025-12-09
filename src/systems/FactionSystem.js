/**
 * NEXUS PROTOCOL - Faction System
 *
 * Manages faction generation, territories, relations, and AI behavior.
 */

import { Components } from '../core/ECS.js';
import {
  IDEOLOGIES,
  FACTION_TRAITS,
  FACTION_GOALS,
  FACTION_NAME_PREFIXES,
  FACTION_NAME_CORES,
  FACTION_NAME_SUFFIXES,
  FACTION_COLORS
} from '../data/factions.js';

export class FactionSystem {
  constructor() {
    this.entities = null;
    this.engine = null;
    this.events = null;
    this.rng = null;
    this.factions = new Map(); // factionId -> faction data
    this.territories = new Map(); // starId -> factionId
    this.usedColors = new Set();
    this.factionCounter = 0; // Counter for unique faction IDs
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
    // Faction AI and decision-making will happen here
    // For now, this is a placeholder for future Phase 1B/1C implementation
  }

  /**
   * Generate factions for the galaxy
   * @param {number} count - Number of major factions to create
   * @param {object} options - Generation options
   */
  generate(count, options = {}) {
    const { galaxySize, stars } = options;
    const numFactions = Math.max(4, Math.min(count || 6, 12));

    this.events?.emit('factions:generating', { count: numFactions });

    const factions = [];
    for (let i = 0; i < numFactions; i++) {
      const faction = this.createFaction(i, options);
      factions.push(faction);
    }

    // Initialize diplomatic relations between factions
    this.initializeRelations(factions);

    // Assign territories to factions
    if (stars && stars.length > 0) {
      this.assignTerritories(factions, stars, options);
    }

    this.events?.emit('factions:generated', { count: factions.length });

    return factions;
  }

  /**
   * Create a single faction
   */
  createFaction(index, options = {}) {
    const entityId = this.entities.create(`faction_${this.factionCounter++}`);

    // Select ideology
    const ideologies = Object.keys(IDEOLOGIES);
    const ideologyKey = ideologies[Math.floor(this.rng() * ideologies.length)];
    const ideology = IDEOLOGIES[ideologyKey];

    // Generate name
    const name = this.generateFactionName(ideologyKey);

    // Select 1-3 traits based on ideology
    const traits = this.selectTraits(ideology, 1 + Math.floor(this.rng() * 3));

    // Select 2-4 goals based on ideology
    const goals = this.selectGoals(ideologyKey, 2 + Math.floor(this.rng() * 3));

    // Select unique color
    const color = this.selectColor();

    // Add Identity component
    this.entities.addComponent(entityId, 'Identity',
      Components.Identity(
        name,
        'faction',
        `A ${ideology.name.toLowerCase()} faction focused on ${goals[0]?.name || 'survival'}`
      )
    );

    // Add Faction component
    this.entities.addComponent(entityId, 'Faction',
      Components.Faction(ideologyKey, goals.map(g => g.id), traits.map(t => t.name.toLowerCase()))
    );

    // Add Diplomacy component (relations start neutral)
    this.entities.addComponent(entityId, 'Diplomacy',
      Components.Diplomacy({}, [], 50)
    );

    // Add Influence component
    const baseInfluence = 10 + Math.floor(this.rng() * 20);
    this.entities.addComponent(entityId, 'Influence',
      Components.Influence(baseInfluence, baseInfluence, baseInfluence)
    );

    // Store faction data
    const factionData = {
      id: entityId,
      name,
      ideology: ideologyKey,
      ideologyData: ideology,
      traits,
      goals,
      color,
      territory: [],
      created: Date.now()
    };

    this.factions.set(entityId, factionData);

    this.events?.emit('faction:created', { id: entityId, name, ideology: ideologyKey });

    return factionData;
  }

  /**
   * Generate a procedural faction name
   */
  generateFactionName(ideology) {
    const prefix = FACTION_NAME_PREFIXES[Math.floor(this.rng() * FACTION_NAME_PREFIXES.length)];
    const core = FACTION_NAME_CORES[Math.floor(this.rng() * FACTION_NAME_CORES.length)];
    const suffix = FACTION_NAME_SUFFIXES[Math.floor(this.rng() * FACTION_NAME_SUFFIXES.length)];

    // Sometimes use ideology-specific patterns
    if (this.rng() < 0.3) {
      switch (ideology) {
        case 'militarist':
          return `${prefix} Military ${core}`;
        case 'mercantile':
          return `${prefix} Trade ${core}`;
        case 'technocratic':
          return `${prefix} Scientific ${core}`;
        case 'isolationist':
          return `${prefix} ${core} Enclave`;
        case 'federalist':
          return `${prefix} ${core} Alliance`;
        case 'expansionist':
          return `${prefix} ${core} Imperium`;
      }
    }

    return suffix ? `${prefix} ${core} ${suffix}` : `${prefix} ${core}`;
  }

  /**
   * Select traits for a faction based on ideology
   */
  selectTraits(ideology, count) {
    const availableTraits = Object.values(FACTION_TRAITS);
    const selected = [];

    // Prefer traits mentioned in ideology
    const ideologyTraits = ideology.traits || [];
    for (const traitName of ideologyTraits) {
      const trait = availableTraits.find(t => t.name.toLowerCase() === traitName);
      if (trait && selected.length < count) {
        selected.push(trait);
      }
    }

    // Fill remaining with random traits
    while (selected.length < count) {
      const trait = availableTraits[Math.floor(this.rng() * availableTraits.length)];
      if (!selected.includes(trait)) {
        selected.push(trait);
      }
    }

    return selected;
  }

  /**
   * Select goals for a faction based on ideology
   */
  selectGoals(ideologyKey, count) {
    const goals = [...FACTION_GOALS];

    // Sort by priority for this ideology
    goals.sort((a, b) => {
      const aPriority = a.priority[ideologyKey] || 1.0;
      const bPriority = b.priority[ideologyKey] || 1.0;
      return bPriority - aPriority;
    });

    // Take top goals with some randomness
    const selected = [];
    for (let i = 0; i < Math.min(count, goals.length); i++) {
      // Weighted selection - higher priority goals more likely
      const roll = this.rng();
      const priority = goals[i].priority[ideologyKey] || 1.0;
      if (roll < priority / 1.5 || selected.length < 2) {
        selected.push(goals[i]);
      }
    }

    return selected;
  }

  /**
   * Select a unique color for the faction
   */
  selectColor() {
    const availableColors = FACTION_COLORS.filter(c => !this.usedColors.has(c));

    if (availableColors.length === 0) {
      // All colors used, pick random
      return FACTION_COLORS[Math.floor(this.rng() * FACTION_COLORS.length)];
    }

    const color = availableColors[Math.floor(this.rng() * availableColors.length)];
    this.usedColors.add(color);
    return color;
  }

  /**
   * Assign territories to factions using Voronoi-like expansion
   */
  assignTerritories(factions, stars, options = {}) {
    if (!factions || factions.length === 0) return;
    if (!stars || stars.length === 0) return;

    const starList = Array.isArray(stars) ? stars : Array.from(stars);
    if (starList.length === 0) return;

    // Step 1: Assign one star to each faction first (round-robin)
    for (let i = 0; i < Math.min(factions.length, starList.length); i++) {
      const faction = factions[i];
      const star = starList[i];

      // Extract star ID from tuple format [entityId, components]
      const starId = typeof star === 'string' ? star : (star[0] || star.id);

      if (!starId) continue; // Skip invalid stars

      this.claimSystem(faction.id, starId);
      faction.territory.push(starId);
    }

    // Step 2: Voronoi expansion - assign remaining systems to nearest faction
    for (const star of starList) {
      const starId = typeof star === 'string' ? star : (star[0] || star.id);

      // Skip if already claimed
      if (this.territories.has(starId)) continue;

      // Find nearest faction seed
      let nearestFaction = null;
      let minDistance = Infinity;

      for (const faction of factions) {
        if (faction.territory.length === 0) continue;

        const seedStarId = faction.territory[0];
        const distance = this.getStarDistance(starId, seedStarId, starList);

        if (distance < minDistance) {
          minDistance = distance;
          nearestFaction = faction;
        }
      }

      if (nearestFaction) {
        this.claimSystem(nearestFaction.id, starId);
        nearestFaction.territory.push(starId);
      }
    }

    this.events?.emit('territories:assigned', {
      factions: factions.length,
      systems: this.territories.size
    });
  }

  /**
   * Select seed stars for factions (maximally distant)
   */
  selectSeedStars(factions, stars) {
    if (stars.length === 0) return [];

    const seeds = [];

    // First seed: random star near center or random
    const firstStar = stars[Math.floor(this.rng() * stars.length)];
    seeds.push(firstStar);

    // Subsequent seeds: maximize minimum distance to existing seeds
    while (seeds.length < factions.length && seeds.length < stars.length) {
      let bestStar = null;
      let bestMinDist = -1;

      for (const star of stars) {
        if (seeds.includes(star)) continue;

        // Calculate minimum distance to any existing seed
        let minDist = Infinity;
        for (const seed of seeds) {
          const dist = this.getStarDistance(
            star.id || star[0],
            seed.id || seed[0],
            stars
          );
          minDist = Math.min(minDist, dist);
        }

        if (minDist > bestMinDist) {
          bestMinDist = minDist;
          bestStar = star;
        }
      }

      if (bestStar) {
        seeds.push(bestStar);
      } else {
        break;
      }
    }

    return seeds;
  }

  /**
   * Get distance between two stars
   */
  getStarDistance(starId1, starId2, starList) {
    // Get star positions from entity system
    const star1 = this.entities.getComponent(starId1, 'Position');
    const star2 = this.entities.getComponent(starId2, 'Position');

    if (!star1 || !star2) return Infinity;

    return Math.sqrt(
      (star1.x - star2.x) ** 2 +
      (star1.y - star2.y) ** 2 +
      (star1.z - star2.z) ** 2
    );
  }

  /**
   * Claim a star system for a faction
   */
  claimSystem(factionId, systemId) {
    // Add Ownership component to the star system
    this.entities.addComponent(systemId, 'Ownership',
      Components.Ownership(systemId, factionId)
    );

    this.territories.set(systemId, factionId);

    // Also assign ownership to planets and stations in the system
    for (const [id, components] of this.entities.query('Orbit')) {
      if (components.Orbit.parentId === systemId) {
        this.entities.addComponent(id, 'Ownership',
          Components.Ownership(id, factionId)
        );
      }
    }

    this.events?.emit('system:claimed', { factionId, systemId });
  }

  /**
   * Initialize diplomatic relations between all factions
   */
  initializeRelations(factions) {
    for (let i = 0; i < factions.length; i++) {
      for (let j = i + 1; j < factions.length; j++) {
        const factionA = factions[i];
        const factionB = factions[j];

        // Calculate initial relations based on ideology compatibility
        const relation = this.calculateInitialRelation(
          factionA.ideologyData,
          factionB.ideologyData
        );

        // Set symmetric relations
        this.setRelation(factionA.id, factionB.id, relation);
        this.setRelation(factionB.id, factionA.id, relation);
      }
    }
  }

  /**
   * Calculate initial relation between two ideologies
   */
  calculateInitialRelation(ideologyA, ideologyB) {
    // Base neutral relation
    let relation = 0;

    // Similar aggression levels improve relations
    const aggressionDiff = Math.abs(ideologyA.aggression - ideologyB.aggression);
    relation += (1 - aggressionDiff) * 20;

    // Similar trade focus improves relations
    const tradeDiff = Math.abs(ideologyA.trade - ideologyB.trade);
    relation += (1 - tradeDiff) * 10;

    // Similar diplomacy levels improve relations
    const diplomacyDiff = Math.abs(ideologyA.diplomacy - ideologyB.diplomacy);
    relation += (1 - diplomacyDiff) * 15;

    // Add some randomness
    relation += (this.rng() - 0.5) * 20;

    // Clamp to -50 to +50 for initial relations
    return Math.max(-50, Math.min(50, relation));
  }

  /**
   * Set diplomatic relation between two factions
   */
  setRelation(factionIdA, factionIdB, value) {
    const diplomacy = this.entities.getComponent(factionIdA, 'Diplomacy');
    if (!diplomacy) return;

    diplomacy.relations[factionIdB] = Math.max(-100, Math.min(100, value));
  }

  /**
   * Get diplomatic relation between two factions
   */
  getRelation(factionIdA, factionIdB) {
    const diplomacy = this.entities.getComponent(factionIdA, 'Diplomacy');
    if (!diplomacy) return 0;

    return diplomacy.relations[factionIdB] || 0;
  }

  // ═══════════════════════════════════════════════════════════
  // QUERY METHODS
  // ═══════════════════════════════════════════════════════════

  /**
   * Get faction by ID
   */
  getFaction(factionId) {
    return this.factions.get(factionId);
  }

  /**
   * Get all factions
   */
  getFactions() {
    return Array.from(this.factions.values());
  }

  /**
   * Get faction by name
   */
  getFactionByName(name) {
    const lower = name.toLowerCase();
    for (const faction of this.factions.values()) {
      if (faction.name.toLowerCase().includes(lower)) {
        return faction;
      }
    }
    return null;
  }

  /**
   * Get faction that owns a system
   */
  getFactionBySystem(systemId) {
    const factionId = this.territories.get(systemId);
    return factionId ? this.getFaction(factionId) : null;
  }

  /**
   * Get all factions in a system (currently only one owner, but future-proof)
   */
  getFactionsInSystem(systemId) {
    const factionId = this.territories.get(systemId);
    return factionId ? [this.getFaction(factionId)] : [];
  }

  /**
   * List factions with optional detail
   */
  listFactions(detailed = false) {
    const factions = this.getFactions();

    if (!detailed) {
      return {
        render: `
═══════════════════════════════════════════════════════
                    KNOWN FACTIONS
═══════════════════════════════════════════════════════

${factions.map((f, i) => {
  const influence = this.entities.getComponent(f.id, 'Influence');
  const totalInfluence = influence ?
    influence.political + influence.economic + influence.military : 0;

  return `${i + 1}. ${f.name}
   Ideology: ${f.ideologyData.name}
   Systems: ${f.territory.length}
   Influence: ${totalInfluence.toFixed(0)}`;
}).join('\n\n')}

═══════════════════════════════════════════════════════
Total Factions: ${factions.length}
`.trim()
      };
    }

    // Detailed view
    return {
      render: factions.map(f => {
        const diplomacy = this.entities.getComponent(f.id, 'Diplomacy');
        const influence = this.entities.getComponent(f.id, 'Influence');

        return `
─────────────────────────────────────────────────────
${f.name}
─────────────────────────────────────────────────────
Ideology: ${f.ideologyData.name}
${f.ideologyData.description}

Traits: ${f.traits.map(t => t.name).join(', ')}
Goals: ${f.goals.map(g => g.name).join(', ')}

Territory: ${f.territory.length} systems
Influence:
  Political: ${influence?.political || 0}
  Economic: ${influence?.economic || 0}
  Military: ${influence?.military || 0}

Reputation: ${diplomacy?.reputation || 50}
`.trim();
      }).join('\n\n')
    };
  }

  /**
   * Get detailed information about a specific faction
   */
  getFactionDetails(name) {
    const faction = this.getFactionByName(name);

    if (!faction) {
      return { message: `Faction not found: "${name}"`, type: 'error' };
    }

    const diplomacy = this.entities.getComponent(faction.id, 'Diplomacy');
    const influence = this.entities.getComponent(faction.id, 'Influence');

    // Get relations with other factions
    const relations = [];
    for (const [otherId, value] of Object.entries(diplomacy?.relations || {})) {
      const other = this.getFaction(otherId);
      if (other) {
        let status = 'Neutral';
        if (value > 50) status = 'Allied';
        else if (value > 25) status = 'Friendly';
        else if (value > -10) status = 'Neutral';
        else if (value > -25) status = 'Unfriendly';
        else if (value > -50) status = 'Hostile';
        else status = 'At War';

        relations.push(`  ${other.name}: ${status} (${value > 0 ? '+' : ''}${value})`);
      }
    }

    return {
      render: `
═══════════════════════════════════════════════════════
${faction.name}
═══════════════════════════════════════════════════════

IDEOLOGY: ${faction.ideologyData.name}
${faction.ideologyData.description}

TRAITS
${faction.traits.map(t => `  • ${t.name}: ${t.description}`).join('\n')}

GOALS
${faction.goals.map(g => `  • ${g.name}: ${g.description}`).join('\n')}

TERRITORY
  Controlled Systems: ${faction.territory.length}

INFLUENCE
  Political: ${influence?.political || 0}
  Economic: ${influence?.economic || 0}
  Military: ${influence?.military || 0}
  Total: ${(influence?.political || 0) + (influence?.economic || 0) + (influence?.military || 0)}

DIPLOMATIC RELATIONS
${relations.length > 0 ? relations.join('\n') : '  No established relations'}

REPUTATION: ${diplomacy?.reputation || 50}/100

═══════════════════════════════════════════════════════
`.trim()
    };
  }

  // ═══════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  /**
   * Get system state for serialization
   */
  getState() {
    return {
      factions: Array.from(this.factions.entries()),
      territories: Array.from(this.territories.entries()),
      usedColors: Array.from(this.usedColors)
    };
  }

  /**
   * Load system state
   */
  loadState(state) {
    if (state.factions) {
      this.factions = new Map(state.factions);
    }
    if (state.territories) {
      this.territories = new Map(state.territories);
    }
    if (state.usedColors) {
      this.usedColors = new Set(state.usedColors);
    }
  }
}

export default FactionSystem;
