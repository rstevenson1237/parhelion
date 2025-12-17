/**
 * PARHELION - Order Data Definitions
 *
 * Order types, statuses, and templates for the command system.
 */

export const ORDER_TYPES = {
  // Movement Orders
  MOVE: {
    name: 'Move',
    category: 'movement',
    description: 'Order unit to relocate to destination',
    validTargets: ['star', 'planet', 'station', 'coordinates'],
    baseDuration: 5,  // Base ticks to execute
    canCancel: true
  },
  PATROL: {
    name: 'Patrol',
    category: 'movement',
    description: 'Order unit to patrol between waypoints',
    validTargets: ['star', 'route'],
    baseDuration: 10,
    canCancel: true,
    repeating: true
  },
  RETURN: {
    name: 'Return',
    category: 'movement',
    description: 'Order unit to return to home base',
    validTargets: [],
    baseDuration: 3,
    canCancel: true
  },

  // Combat Orders
  ATTACK: {
    name: 'Attack',
    category: 'combat',
    description: 'Engage hostile target',
    validTargets: ['fleet', 'station', 'faction'],
    baseDuration: 1,
    canCancel: false
  },
  DEFEND: {
    name: 'Defend',
    category: 'combat',
    description: 'Defend location against hostiles',
    validTargets: ['star', 'planet', 'station'],
    baseDuration: 0,
    canCancel: true,
    persistent: true
  },
  BLOCKADE: {
    name: 'Blockade',
    category: 'combat',
    description: 'Establish blockade of target system',
    validTargets: ['star'],
    baseDuration: 2,
    canCancel: true,
    persistent: true
  },

  // Economic Orders
  TRADE: {
    name: 'Trade',
    category: 'economic',
    description: 'Conduct trade at destination',
    validTargets: ['station', 'planet'],
    baseDuration: 3,
    canCancel: true
  },
  TRANSPORT: {
    name: 'Transport',
    category: 'economic',
    description: 'Transport cargo to destination',
    validTargets: ['star', 'station', 'planet'],
    baseDuration: 4,
    canCancel: true
  },
  HARVEST: {
    name: 'Harvest',
    category: 'economic',
    description: 'Extract resources from location',
    validTargets: ['planet', 'asteroid'],
    baseDuration: 10,
    canCancel: true,
    repeating: true
  },

  // Intelligence Orders
  SCOUT: {
    name: 'Scout',
    category: 'intelligence',
    description: 'Reconnaissance of target system',
    validTargets: ['star'],
    baseDuration: 2,
    canCancel: true
  },
  INFILTRATE: {
    name: 'Infiltrate',
    category: 'intelligence',
    description: 'Covert intelligence gathering',
    validTargets: ['station', 'faction'],
    baseDuration: 5,
    canCancel: false
  },
  MONITOR: {
    name: 'Monitor',
    category: 'intelligence',
    description: 'Long-term surveillance of target',
    validTargets: ['star', 'route'],
    baseDuration: 0,
    canCancel: true,
    persistent: true
  },

  // Administrative Orders
  DOCK: {
    name: 'Dock',
    category: 'administrative',
    description: 'Dock at station for resupply',
    validTargets: ['station'],
    baseDuration: 1,
    canCancel: true
  },
  REPAIR: {
    name: 'Repair',
    category: 'administrative',
    description: 'Conduct repairs',
    validTargets: ['station', 'self'],
    baseDuration: 5,
    canCancel: false
  },
  STANDBY: {
    name: 'Stand By',
    category: 'administrative',
    description: 'Hold position and await orders',
    validTargets: [],
    baseDuration: 0,
    canCancel: true,
    persistent: true
  }
};

export const ORDER_STATUS = {
  PENDING: 'pending',       // Awaiting transmission
  TRANSMITTED: 'transmitted', // Sent, awaiting receipt
  RECEIVED: 'received',     // Received by unit
  EXECUTING: 'executing',   // Currently being executed
  COMPLETED: 'completed',   // Successfully completed
  FAILED: 'failed',         // Failed to complete
  CANCELLED: 'cancelled',   // Cancelled by issuer
  REFUSED: 'refused'        // Refused by recipient
};

export const ORDER_PRIORITIES = {
  CRITICAL: { name: 'Critical', value: 1, transmitBonus: -2 },
  HIGH: { name: 'High', value: 2, transmitBonus: -1 },
  NORMAL: { name: 'Normal', value: 3, transmitBonus: 0 },
  LOW: { name: 'Low', value: 4, transmitBonus: 1 }
};

/**
 * Order result templates
 */
export const ORDER_RESULTS = {
  SUCCESS: 'success',
  PARTIAL: 'partial',
  FAILURE: 'failure',
  INTERCEPTED: 'intercepted',
  MISINTERPRETED: 'misinterpreted'
};

/**
 * Natural language aliases for order types
 */
export const ORDER_ALIASES = {
  // Movement
  'go': 'MOVE',
  'goto': 'MOVE',
  'travel': 'MOVE',
  'head': 'MOVE',
  'patrol': 'PATROL',
  'sweep': 'PATROL',
  'return': 'RETURN',
  'rtb': 'RETURN',
  'home': 'RETURN',

  // Combat
  'attack': 'ATTACK',
  'engage': 'ATTACK',
  'strike': 'ATTACK',
  'destroy': 'ATTACK',
  'defend': 'DEFEND',
  'protect': 'DEFEND',
  'guard': 'DEFEND',
  'blockade': 'BLOCKADE',
  'siege': 'BLOCKADE',

  // Economic
  'trade': 'TRADE',
  'buy': 'TRADE',
  'sell': 'TRADE',
  'transport': 'TRANSPORT',
  'deliver': 'TRANSPORT',
  'haul': 'TRANSPORT',
  'harvest': 'HARVEST',
  'mine': 'HARVEST',
  'extract': 'HARVEST',

  // Intelligence
  'scout': 'SCOUT',
  'recon': 'SCOUT',
  'survey': 'SCOUT',
  'infiltrate': 'INFILTRATE',
  'spy': 'INFILTRATE',
  'monitor': 'MONITOR',
  'watch': 'MONITOR',
  'observe': 'MONITOR',

  // Administrative
  'dock': 'DOCK',
  'land': 'DOCK',
  'repair': 'REPAIR',
  'fix': 'REPAIR',
  'standby': 'STANDBY',
  'hold': 'STANDBY',
  'wait': 'STANDBY'
};

export default {
  ORDER_TYPES,
  ORDER_STATUS,
  ORDER_PRIORITIES,
  ORDER_RESULTS,
  ORDER_ALIASES
};
