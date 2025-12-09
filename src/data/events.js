/**
 * NEXUS PROTOCOL - Event Data
 *
 * Event definitions, triggers, effects, and cascades.
 */

export const EVENTS = {
  // Economic events
  resource_discovery: {
    name: 'Resource Discovery',
    triggers: ['exploration', 'random'],
    effects: [{ type: 'add_resource', target: 'system', value: 1.5 }],
    chains: ['economic_boom'],
    probability: 0.1
  },
  economic_boom: {
    name: 'Economic Boom',
    triggers: ['resource_discovery', 'trade_route_established'],
    effects: [{ type: 'modify_production', value: 1.2, duration: 50 }],
    chains: [],
    probability: 0.3
  },

  // Political events
  diplomatic_incident: {
    name: 'Diplomatic Incident',
    triggers: ['border_violation', 'random'],
    effects: [{ type: 'modify_relation', value: -15 }],
    chains: [],
    probability: 0.05
  }
};

export default { EVENTS };
