/**
 * NEXUS PROTOCOL - Politics Data
 *
 * Treaty types, war reasons, and diplomatic thresholds.
 */

export const TREATY_TYPES = {
  non_aggression: {
    name: 'Non-Aggression Pact',
    duration: 100,
    relationBonus: 10,
    description: 'Agreement not to attack each other'
  },
  trade_agreement: {
    name: 'Trade Agreement',
    duration: 50,
    tradeBonus: 0.2,
    relationBonus: 5,
    description: 'Enhanced trade between factions'
  },
  alliance: {
    name: 'Alliance',
    duration: 200,
    militarySupport: true,
    relationBonus: 20,
    description: 'Military and political alliance'
  },
  ceasefire: {
    name: 'Ceasefire',
    duration: 20,
    relationBonus: 0,
    description: 'Temporary end to hostilities'
  }
};

export const WAR_REASONS = [
  'territorial_dispute',
  'treaty_violation',
  'economic_rivalry',
  'ideological_conflict',
  'liberation',
  'conquest'
];

export const RELATION_THRESHOLDS = {
  war: -50,
  hostile: -25,
  unfriendly: -10,
  neutral: 10,
  friendly: 25,
  allied: 50
};

export default {
  TREATY_TYPES,
  WAR_REASONS,
  RELATION_THRESHOLDS
};
