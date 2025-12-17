/**
 * PARHELION - Intelligence System
 *
 * Manages reconnaissance, intelligence gathering, and information decay.
 * Players only know what they can see or what others tell them.
 */

import { Components } from '../core/ECS.js';

export const INTEL_CLASSIFICATION = {
  UNCLASSIFIED: 'unclassified',
  CONFIDENTIAL: 'confidential',
  SECRET: 'secret',
  TOP_SECRET: 'top_secret'
};

export class IntelSystem {
  constructor() {
    this.entities = null;
    this.engine = null;
    this.events = null;
    this.rng = null;
    this.reportCounter = 0;
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
    this.degradeIntelAccuracy(tickData);
  }

  /**
   * Generate an intel report on a target
   */
  generateReport(targetId, requesterId, accuracyModifier = 1.0) {
    const targetType = this.determineTargetType(targetId);

    if (!targetType) {
      return { success: false, error: 'Invalid target for intelligence gathering' };
    }

    // Base accuracy depends on target type and distance
    const baseAccuracy = this.calculateBaseAccuracy(requesterId, targetId, targetType);
    const finalAccuracy = Math.min(1.0, baseAccuracy * accuracyModifier);

    // Gather intel data based on target type
    const intelData = this.gatherIntelData(targetId, targetType, finalAccuracy);

    // Create intel report entity
    const reportId = this.entities.create();
    const report = Components.IntelReport({
      id: `intel_${++this.reportCounter}`,
      targetId,
      targetType,
      targetName: this.getTargetName(targetId, targetType),
      gatheredAt: this.engine.state.tick,
      accuracy: finalAccuracy,
      data: intelData,
      source: 'reconnaissance',
      classification: this.determineClassification(targetType, intelData)
    });

    this.entities.addComponent(reportId, 'IntelReport', report);

    // Store in requester's intel database
    this.addToIntelDatabase(requesterId, report.id);

    this.events?.emit('intel:gathered', {
      reportId: report.id,
      targetId,
      targetType,
      accuracy: finalAccuracy
    });

    return {
      success: true,
      reportId: report.id,
      report,
      message: `Intelligence report generated on ${report.targetName}`
    };
  }

  /**
   * Determine target type from components
   */
  determineTargetType(targetId) {
    if (this.entities.hasComponent(targetId, 'Star')) return 'star';
    if (this.entities.hasComponent(targetId, 'Planet')) return 'planet';
    if (this.entities.hasComponent(targetId, 'Station')) return 'station';
    if (this.entities.hasComponent(targetId, 'Fleet')) return 'fleet';
    if (this.entities.hasComponent(targetId, 'Faction')) return 'faction';
    if (this.entities.hasComponent(targetId, 'FactionMember')) return 'faction';
    return null;
  }

  /**
   * Calculate base accuracy based on distance and conditions
   */
  calculateBaseAccuracy(requesterId, targetId, targetType) {
    let accuracy = 0.8; // Base accuracy

    // Distance penalty
    const distance = this.calculateDistance(requesterId, targetId);
    if (distance > 0) {
      accuracy -= (distance / 100) * 0.3; // Lose 30% accuracy per 100 LY
    }

    // Target type modifiers
    const typeModifiers = {
      star: 0.1,      // Stars are easy to observe
      planet: 0.05,
      station: 0.0,
      fleet: -0.1,    // Fleets are harder to track
      faction: -0.15  // Faction internals are difficult
    };
    accuracy += typeModifiers[targetType] || 0;

    return Math.max(0.2, Math.min(1.0, accuracy));
  }

  /**
   * Gather intel data based on target type
   */
  gatherIntelData(targetId, targetType, accuracy) {
    switch (targetType) {
      case 'star':
        return this.gatherStarIntel(targetId, accuracy);
      case 'planet':
        return this.gatherPlanetIntel(targetId, accuracy);
      case 'station':
        return this.gatherStationIntel(targetId, accuracy);
      case 'fleet':
        return this.gatherFleetIntel(targetId, accuracy);
      case 'faction':
        return this.gatherFactionIntel(targetId, accuracy);
      default:
        return {};
    }
  }

  /**
   * Gather intel on a star system
   */
  gatherStarIntel(starId, accuracy) {
    const intel = {};

    const star = this.entities.getComponent(starId, 'Star');
    const identity = this.entities.getComponent(starId, 'Identity');
    const position = this.entities.getComponent(starId, 'Position');

    if (star) {
      intel.spectralClass = star.spectralClass;
      intel.luminosity = star.luminosity;
      if (accuracy > 0.5) {
        intel.mass = this.fuzzyValue(star.mass, accuracy);
        intel.age = this.fuzzyValue(star.age, accuracy);
      }
    }

    if (identity) {
      intel.name = identity.name;
    }

    if (position && accuracy > 0.3) {
      intel.position = {
        x: this.fuzzyValue(position.x, accuracy),
        y: this.fuzzyValue(position.y, accuracy)
      };
    }

    // Count planets if accuracy is high enough
    if (accuracy > 0.6) {
      let planetCount = 0;
      for (const [id, components] of this.entities.query('Planet', 'Orbit')) {
        if (components.Orbit.parentId === starId) {
          planetCount++;
        }
      }
      intel.planetCount = planetCount;
    }

    // Look for stations
    if (accuracy > 0.7) {
      const stations = [];
      for (const [id, components] of this.entities.query('Station', 'Orbit', 'Identity')) {
        if (components.Orbit.parentId === starId) {
          stations.push(components.Identity.name);
        }
      }
      intel.stations = stations;
    }

    // Controlling faction
    if (accuracy > 0.4) {
      const territory = this.entities.getComponent(starId, 'Territory');
      if (territory?.controllerId) {
        const faction = this.engine.getSystem('factions')?.getFaction(territory.controllerId);
        intel.controlledBy = faction?.name || 'Unknown';
      }
    }

    return intel;
  }

  /**
   * Gather intel on a planet
   */
  gatherPlanetIntel(planetId, accuracy) {
    const intel = {};

    const planet = this.entities.getComponent(planetId, 'Planet');
    const identity = this.entities.getComponent(planetId, 'Identity');
    const resources = this.entities.getComponent(planetId, 'Resources');
    const population = this.entities.getComponent(planetId, 'Population');

    if (planet) {
      intel.type = planet.planetType || planet.type;
      if (accuracy > 0.4) {
        intel.size = planet.size;
        intel.atmosphere = planet.atmosphere;
      }
      if (accuracy > 0.6) {
        intel.habitability = this.fuzzyValue(planet.habitability || 0, accuracy);
      }
    }

    if (identity) {
      intel.name = identity.name;
    }

    if (resources && accuracy > 0.5) {
      intel.resources = {};
      for (const [resource, amount] of Object.entries(resources.stored || {})) {
        if (amount > 0) {
          intel.resources[resource] = this.fuzzyValue(amount, accuracy);
        }
      }
    }

    if (population && accuracy > 0.6) {
      intel.population = this.fuzzyValue(population.count || population, accuracy);
    }

    return intel;
  }

  /**
   * Gather intel on a station
   */
  gatherStationIntel(stationId, accuracy) {
    const intel = {};

    const station = this.entities.getComponent(stationId, 'Station');
    const identity = this.entities.getComponent(stationId, 'Identity');
    const market = this.entities.getComponent(stationId, 'Market');

    if (station) {
      intel.type = station.type;
      if (accuracy > 0.5) {
        intel.size = station.size;
        intel.services = station.services;
      }
    }

    if (identity) {
      intel.name = identity.name;
    }

    if (market && accuracy > 0.6) {
      intel.hasMarket = true;
      if (accuracy > 0.8) {
        intel.marketPrices = { ...market.prices };
      }
    }

    return intel;
  }

  /**
   * Gather intel on a fleet
   */
  gatherFleetIntel(fleetId, accuracy) {
    const intel = {};

    const fleet = this.entities.getComponent(fleetId, 'Fleet');
    const identity = this.entities.getComponent(fleetId, 'Identity');

    if (fleet) {
      if (accuracy > 0.3) {
        intel.estimatedSize = this.fuzzyCategory(fleet.shipCount, [5, 20, 50, 100],
          ['small', 'medium', 'large', 'massive', 'armada']);
      }
      if (accuracy > 0.6) {
        intel.shipCount = this.fuzzyValue(fleet.shipCount, accuracy);
      }
      if (accuracy > 0.8) {
        intel.composition = fleet.composition;
      }
    }

    if (identity) {
      intel.name = identity.name;
    }

    // Owning faction
    const factionMember = this.entities.getComponent(fleetId, 'FactionMember');
    if (factionMember && accuracy > 0.4) {
      const faction = this.engine.getSystem('factions')?.getFaction(factionMember.factionId);
      intel.faction = faction?.name || 'Unknown';
    }

    return intel;
  }

  /**
   * Gather intel on a faction
   */
  gatherFactionIntel(factionId, accuracy) {
    const intel = {};

    const factionSystem = this.engine.getSystem('factions');
    const faction = factionSystem?.getFaction(factionId);

    if (!faction) return intel;

    intel.name = faction.name;

    if (accuracy > 0.3) {
      intel.ideology = faction.ideology;
    }

    if (accuracy > 0.5) {
      intel.traits = faction.traits;
      intel.territoryCount = factionSystem.getControlledSystems(factionId)?.length;
    }

    if (accuracy > 0.7) {
      intel.goals = faction.goals;
      intel.economicPower = this.fuzzyCategory(faction.economicPower || 1000,
        [1000, 5000, 20000, 50000],
        ['struggling', 'stable', 'prosperous', 'wealthy', 'dominant']);
    }

    if (accuracy > 0.8) {
      intel.militaryStrength = faction.militaryStrength || 0;
    }

    return intel;
  }

  /**
   * Add fuzzy error to a numeric value based on accuracy
   */
  fuzzyValue(value, accuracy) {
    if (typeof value !== 'number') return value;

    const errorRange = (1 - accuracy) * 0.5; // Up to 50% error at lowest accuracy
    const error = (this.rng ? this.rng() : Math.random()) * 2 - 1; // -1 to 1
    const fuzzyAmount = value * errorRange * error;

    return Math.round(value + fuzzyAmount);
  }

  /**
   * Categorize a value with fuzziness
   */
  fuzzyCategory(value, thresholds, labels) {
    const fuzzedValue = this.fuzzyValue(value, 0.7);

    for (let i = 0; i < thresholds.length; i++) {
      if (fuzzedValue < thresholds[i]) {
        return labels[i];
      }
    }
    return labels[labels.length - 1];
  }

  /**
   * Calculate distance between entities
   */
  calculateDistance(entity1Id, entity2Id) {
    const pos1 = this.getEntityPosition(entity1Id);
    const pos2 = this.getEntityPosition(entity2Id);

    if (!pos1 || !pos2) return 0;

    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get entity position
   */
  getEntityPosition(entityId) {
    const playerLoc = this.entities.getComponent(entityId, 'PlayerLocation');
    if (playerLoc?.systemId) {
      return this.entities.getComponent(playerLoc.systemId, 'Position');
    }
    return this.entities.getComponent(entityId, 'Position');
  }

  /**
   * Get target name
   */
  getTargetName(targetId, targetType) {
    const identity = this.entities.getComponent(targetId, 'Identity');
    if (identity) return identity.name;

    // For factions
    const factionSystem = this.engine.getSystem('factions');
    if (targetType === 'faction') {
      return factionSystem?.getFaction(targetId)?.name || 'Unknown Faction';
    }

    return `Unknown ${targetType}`;
  }

  /**
   * Determine classification level
   */
  determineClassification(targetType, data) {
    if (data.militaryStrength || data.composition) {
      return INTEL_CLASSIFICATION.SECRET;
    }
    if (data.goals || data.economicPower) {
      return INTEL_CLASSIFICATION.CONFIDENTIAL;
    }
    return INTEL_CLASSIFICATION.UNCLASSIFIED;
  }

  /**
   * Add report to requester's intel database
   */
  addToIntelDatabase(requesterId, reportId) {
    let intelDb = this.entities.getComponent(requesterId, 'IntelDatabase');

    if (!intelDb) {
      intelDb = { reports: [], maxReports: 100 };
      this.entities.addComponent(requesterId, 'IntelDatabase', intelDb);
    }

    intelDb.reports.unshift(reportId);

    if (intelDb.reports.length > intelDb.maxReports) {
      intelDb.reports = intelDb.reports.slice(0, intelDb.maxReports);
    }
  }

  /**
   * Get intel reports for an entity
   */
  getIntelReports(requesterId, options = {}) {
    const intelDb = this.entities.getComponent(requesterId, 'IntelDatabase');
    if (!intelDb) {
      return { reports: [] };
    }

    const reports = [];
    for (const reportId of intelDb.reports) {
      const report = this.getReportById(reportId);
      if (report) {
        if (options.targetType && report.targetType !== options.targetType) continue;
        if (options.targetId && report.targetId !== options.targetId) continue;
        reports.push(report);
      }
    }

    return { reports };
  }

  /**
   * Get latest intel on a specific target
   */
  getLatestIntel(requesterId, targetId) {
    const reports = this.getIntelReports(requesterId, { targetId });
    return reports.reports[0] || null;
  }

  /**
   * Get report by ID
   */
  getReportById(reportId) {
    for (const [entityId, components] of this.entities.query('IntelReport')) {
      if (components.IntelReport.id === reportId) {
        return components.IntelReport;
      }
    }
    return null;
  }

  /**
   * Degrade intel accuracy over time
   */
  degradeIntelAccuracy(tickData) {
    const degradeRate = 0.001; // Lose 0.1% accuracy per tick
    const minAccuracy = 0.2;

    for (const [entityId, components] of this.entities.query('IntelReport')) {
      const report = components.IntelReport;
      const age = tickData.tick - report.gatheredAt;

      // Accuracy degrades with age
      const newAccuracy = report.accuracy - (age * degradeRate);
      report.accuracy = Math.max(minAccuracy, newAccuracy);
    }
  }

  /**
   * Get system state
   */
  getState() {
    return {
      reportCounter: this.reportCounter
    };
  }

  /**
   * Load system state
   */
  loadState(state) {
    if (state.reportCounter) {
      this.reportCounter = state.reportCounter;
    }
  }
}

export default IntelSystem;
