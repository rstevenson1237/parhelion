/**
 * NEXUS PROTOCOL - Politics System
 *
 * Diplomatic relations, treaties, wars, and influence.
 */

import { TREATY_TYPES, RELATION_THRESHOLDS } from '../data/politics.js';

export class PoliticsSystem {
  constructor() {
    this.entities = null;
    this.engine = null;
    this.events = null;
    this.treaties = new Map();
    this.wars = new Map();
  }

  initialize(engine) {
    this.engine = engine;
    this.entities = engine.getSystem('entities')?.entities || engine.entities;
    this.events = engine.events;
  }

  update(tickData) {
    // Update relation drift and treaty durations
    this.updateRelations(tickData);
    this.updateTreaties(tickData);
  }

  /**
   * Update diplomatic relations over time
   */
  updateRelations(tickData) {
    for (const [id, components] of this.entities.query('Faction', 'Diplomacy')) {
      // Relations slowly drift toward neutral
      for (const otherId in components.Diplomacy.relations) {
        const current = components.Diplomacy.relations[otherId];
        if (current > 0) {
          components.Diplomacy.relations[otherId] = Math.max(0, current - 0.1);
        } else if (current < 0) {
          components.Diplomacy.relations[otherId] = Math.min(0, current + 0.1);
        }
      }
    }
  }

  /**
   * Update active treaties
   */
  updateTreaties(tickData) {
    for (const [treatyId, treaty] of this.treaties) {
      if (treaty.duration > 0) {
        treaty.duration--;
        if (treaty.duration === 0) {
          this.treaties.delete(treatyId);
          this.events?.emit('treaty:expired', { treatyId, treaty });
        }
      }
    }
  }

  /**
   * Modify relation between two factions
   */
  modifyRelation(factionIdA, factionIdB, delta, reason) {
    const diplomacyA = this.entities.getComponent(factionIdA, 'Diplomacy');
    const diplomacyB = this.entities.getComponent(factionIdB, 'Diplomacy');

    if (diplomacyA) {
      const current = diplomacyA.relations[factionIdB] || 0;
      diplomacyA.relations[factionIdB] = Math.max(-100, Math.min(100, current + delta));
    }

    if (diplomacyB) {
      const current = diplomacyB.relations[factionIdA] || 0;
      diplomacyB.relations[factionIdA] = Math.max(-100, Math.min(100, current + delta));
    }

    this.events?.emit('relation:changed', {
      factionA: factionIdA,
      factionB: factionIdB,
      delta,
      reason
    });
  }

  /**
   * Get relation between two factions
   */
  getRelation(factionIdA, factionIdB) {
    const diplomacy = this.entities.getComponent(factionIdA, 'Diplomacy');
    return diplomacy?.relations[factionIdB] || 0;
  }

  /**
   * Get system state for serialization
   */
  getState() {
    return {
      treaties: Array.from(this.treaties.entries()),
      wars: Array.from(this.wars.entries())
    };
  }

  /**
   * Load system state
   */
  loadState(state) {
    if (state.treaties) {
      this.treaties = new Map(state.treaties);
    }
    if (state.wars) {
      this.wars = new Map(state.wars);
    }
  }
}

export default PoliticsSystem;
