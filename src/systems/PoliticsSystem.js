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
   * Propose a treaty between two factions
   * @returns {Object} Result with success status, treatyId, and treaty data
   */
  proposeTreaty(fromFactionId, toFactionId, treatyType, terms = {}) {
    const treatyDef = TREATY_TYPES[treatyType];
    if (!treatyDef) {
      return { success: false, reason: 'Invalid treaty type' };
    }

    // Check if relation allows this treaty type
    const relation = this.getRelation(fromFactionId, toFactionId);

    // Alliances require friendly relations
    if (treatyType === 'alliance' && relation < 25) {
      return { success: false, reason: 'Relations too poor for alliance' };
    }

    // Can't propose treaties to enemies
    if (relation < RELATION_THRESHOLDS.hostile) {
      return { success: false, reason: 'Cannot propose treaty to hostile faction' };
    }

    const treatyId = `treaty_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const treaty = {
      id: treatyId,
      type: treatyType,
      proposer: fromFactionId,
      recipient: toFactionId,
      terms,
      status: 'pending',
      proposedAt: this.engine?.state.tick || 0,
      duration: treatyDef.duration,
      ...treatyDef
    };

    this.treaties.set(treatyId, treaty);

    this.events?.emit('treaty:proposed', { treatyId, treaty });

    return { success: true, treatyId, treaty };
  }

  /**
   * Accept a pending treaty
   */
  acceptTreaty(treatyId) {
    const treaty = this.treaties.get(treatyId);
    if (!treaty) {
      return { success: false, reason: 'Treaty not found' };
    }

    if (treaty.status !== 'pending') {
      return { success: false, reason: 'Treaty is not pending' };
    }

    treaty.status = 'active';
    treaty.acceptedAt = this.engine?.state.tick || 0;

    // Apply relation bonus
    if (treaty.relationBonus) {
      this.modifyRelation(treaty.proposer, treaty.recipient, treaty.relationBonus, 'treaty_signed');
    }

    // Add treaty to faction diplomacy components
    const proposerDiplomacy = this.entities.getComponent(treaty.proposer, 'Diplomacy');
    const recipientDiplomacy = this.entities.getComponent(treaty.recipient, 'Diplomacy');

    if (proposerDiplomacy) {
      proposerDiplomacy.treaties.push(treatyId);
    }
    if (recipientDiplomacy) {
      recipientDiplomacy.treaties.push(treatyId);
    }

    this.events?.emit('treaty:accepted', { treatyId, treaty });

    return { success: true, treaty };
  }

  /**
   * Reject a pending treaty
   */
  rejectTreaty(treatyId) {
    const treaty = this.treaties.get(treatyId);
    if (!treaty) {
      return { success: false, reason: 'Treaty not found' };
    }

    treaty.status = 'rejected';

    // Small relation penalty for rejection
    this.modifyRelation(treaty.proposer, treaty.recipient, -5, 'treaty_rejected');

    this.events?.emit('treaty:rejected', { treatyId, treaty });

    return { success: true };
  }

  /**
   * Break an active treaty
   */
  breakTreaty(treatyId, breakerId) {
    const treaty = this.treaties.get(treatyId);
    if (!treaty || treaty.status !== 'active') {
      return { success: false, reason: 'No active treaty found' };
    }

    treaty.status = 'broken';
    treaty.brokenBy = breakerId;
    treaty.brokenAt = this.engine?.state.tick || 0;

    // Severe relation penalty for breaking treaties
    const penalty = treaty.type === 'alliance' ? -50 : -25;
    this.modifyRelation(treaty.proposer, treaty.recipient, penalty, 'treaty_broken');

    // Remove from faction diplomacy
    const proposerDiplomacy = this.entities.getComponent(treaty.proposer, 'Diplomacy');
    const recipientDiplomacy = this.entities.getComponent(treaty.recipient, 'Diplomacy');

    if (proposerDiplomacy) {
      proposerDiplomacy.treaties = proposerDiplomacy.treaties.filter(t => t !== treatyId);
    }
    if (recipientDiplomacy) {
      recipientDiplomacy.treaties = recipientDiplomacy.treaties.filter(t => t !== treatyId);
    }

    this.events?.emit('treaty:broken', { treatyId, treaty, breakerId });

    return { success: true };
  }

  /**
   * Get all treaties for a faction
   */
  getTreaties(factionId) {
    const treaties = [];
    for (const [id, treaty] of this.treaties) {
      if (treaty.proposer === factionId || treaty.recipient === factionId) {
        treaties.push({ id, ...treaty });
      }
    }
    return treaties;
  }

  /**
   * Declare war between factions
   */
  declareWar(aggressorId, targetId, reason = 'conquest') {
    const relation = this.getRelation(aggressorId, targetId);

    // Check for existing war
    for (const [id, war] of this.wars) {
      if ((war.attacker === aggressorId && war.defender === targetId) ||
          (war.attacker === targetId && war.defender === aggressorId)) {
        return { success: false, reason: 'Already at war' };
      }
    }

    // Check for alliance that would prevent war
    for (const [id, treaty] of this.treaties) {
      if (treaty.type === 'alliance' && treaty.status === 'active') {
        if ((treaty.proposer === aggressorId && treaty.recipient === targetId) ||
            (treaty.proposer === targetId && treaty.recipient === aggressorId)) {
          return { success: false, reason: 'Cannot declare war on ally (break alliance first)' };
        }
      }
    }

    const warId = `war_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const war = {
      id: warId,
      attacker: aggressorId,
      defender: targetId,
      reason,
      startedAt: this.engine?.state.tick || 0,
      status: 'active',
      battles: [],
      casualties: { attacker: 0, defender: 0 }
    };

    this.wars.set(warId, war);

    // Set relations to minimum
    this.modifyRelation(aggressorId, targetId, -200, 'war_declared');

    // Break any existing treaties
    for (const [treatyId, treaty] of this.treaties) {
      if (treaty.status === 'active') {
        if ((treaty.proposer === aggressorId && treaty.recipient === targetId) ||
            (treaty.proposer === targetId && treaty.recipient === aggressorId)) {
          this.breakTreaty(treatyId, aggressorId);
        }
      }
    }

    this.events?.emit('war:declared', { warId, war });

    return { success: true, warId, war };
  }

  /**
   * Propose peace to end a war
   */
  proposePeace(warId, proposerId, terms = {}) {
    const war = this.wars.get(warId);
    if (!war || war.status !== 'active') {
      return { success: false, reason: 'No active war found' };
    }

    war.peaceProposal = {
      proposer: proposerId,
      terms,
      proposedAt: this.engine?.state.tick || 0
    };

    this.events?.emit('peace:proposed', { warId, proposer: proposerId, terms });

    return { success: true };
  }

  /**
   * Accept peace proposal
   */
  acceptPeace(warId) {
    const war = this.wars.get(warId);
    if (!war || !war.peaceProposal) {
      return { success: false, reason: 'No peace proposal found' };
    }

    war.status = 'ended';
    war.endedAt = this.engine?.state.tick || 0;
    war.resolution = 'peace';

    // Create ceasefire treaty
    const ceasefireResult = this.proposeTreaty(war.attacker, war.defender, 'ceasefire', {});

    // Auto-accept ceasefire
    if (ceasefireResult.success) {
      this.acceptTreaty(ceasefireResult.treatyId);
    }

    this.events?.emit('war:ended', { warId, war, resolution: 'peace' });

    return { success: true };
  }

  /**
   * Get all active wars
   */
  getWars() {
    return Array.from(this.wars.values()).filter(w => w.status === 'active');
  }

  /**
   * Get war status for a faction
   */
  getWarStatus(factionId) {
    const wars = [];
    for (const [id, war] of this.wars) {
      if (war.status === 'active' &&
          (war.attacker === factionId || war.defender === factionId)) {
        wars.push({
          id,
          role: war.attacker === factionId ? 'attacker' : 'defender',
          enemy: war.attacker === factionId ? war.defender : war.attacker,
          ...war
        });
      }
    }
    return wars;
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
