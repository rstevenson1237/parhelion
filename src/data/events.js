/**
 * NEXUS PROTOCOL - Event Data
 *
 * Event definitions, triggers, effects, and cascades.
 */

export const EVENTS = {
  // ═══════════════════════════════════════════════════════════
  // ECONOMIC EVENTS
  // ═══════════════════════════════════════════════════════════

  resource_discovery: {
    name: 'Resource Discovery',
    category: 'economic',
    description: 'New resource deposits discovered',
    triggers: ['exploration', 'random'],
    effects: [
      { type: 'add_resource', target: 'system', resource: 'random', value: 5000 }
    ],
    chains: ['economic_boom'],
    probability: 0.05,
    cooldown: 50
  },

  economic_boom: {
    name: 'Economic Boom',
    category: 'economic',
    description: 'Economic activity surges',
    triggers: ['resource_discovery', 'trade_route_established'],
    effects: [
      { type: 'modify_production', value: 1.2, duration: 50 }
    ],
    chains: ['population_growth'],
    probability: 0.3
  },

  economic_recession: {
    name: 'Economic Recession',
    category: 'economic',
    description: 'Economic output declines',
    triggers: ['war_declared', 'trade_route_disrupted', 'random'],
    effects: [
      { type: 'modify_production', value: 0.8, duration: 30 }
    ],
    chains: ['civil_unrest'],
    probability: 0.02
  },

  trade_route_established: {
    name: 'Trade Route Established',
    category: 'economic',
    description: 'New trade connection opens',
    triggers: ['treaty_signed', 'exploration'],
    effects: [
      { type: 'create_trade_route' }
    ],
    chains: ['economic_boom'],
    probability: 0.4
  },

  trade_route_disrupted: {
    name: 'Trade Route Disrupted',
    category: 'economic',
    description: 'Trade route blocked or destroyed',
    triggers: ['war_declared', 'piracy', 'random'],
    effects: [
      { type: 'remove_trade_route' }
    ],
    chains: ['economic_recession', 'price_spike'],
    probability: 0.1
  },

  price_spike: {
    name: 'Price Spike',
    category: 'economic',
    description: 'Market prices surge dramatically',
    triggers: ['shortage', 'trade_route_disrupted'],
    effects: [
      { type: 'modify_prices', value: 1.5, duration: 20 }
    ],
    chains: [],
    probability: 0.5
  },

  // ═══════════════════════════════════════════════════════════
  // POLITICAL EVENTS
  // ═══════════════════════════════════════════════════════════

  diplomatic_incident: {
    name: 'Diplomatic Incident',
    category: 'political',
    description: 'Relations sour over misunderstanding',
    triggers: ['border_violation', 'spy_caught', 'random'],
    effects: [
      { type: 'modify_relation', value: -15 }
    ],
    chains: ['war_tension'],
    probability: 0.03
  },

  war_tension: {
    name: 'Rising Tensions',
    category: 'political',
    description: 'War seems increasingly likely',
    triggers: ['diplomatic_incident', 'territory_dispute'],
    effects: [
      { type: 'modify_relation', value: -10 },
      { type: 'increase_military_buildup' }
    ],
    chains: ['war_declared', 'diplomatic_resolution'],
    probability: 0.4
  },

  diplomatic_resolution: {
    name: 'Diplomatic Resolution',
    category: 'political',
    description: 'Tensions defused through diplomacy',
    triggers: ['war_tension'],
    effects: [
      { type: 'modify_relation', value: 10 }
    ],
    chains: ['treaty_proposed'],
    probability: 0.3
  },

  treaty_proposed: {
    name: 'Treaty Proposed',
    category: 'political',
    description: 'Formal agreement offered',
    triggers: ['diplomatic_resolution', 'alliance_interest'],
    effects: [
      { type: 'propose_treaty' }
    ],
    chains: ['treaty_signed', 'treaty_rejected'],
    probability: 0.6
  },

  treaty_signed: {
    name: 'Treaty Signed',
    category: 'political',
    description: 'Formal agreement ratified',
    triggers: ['treaty_proposed'],
    effects: [
      { type: 'activate_treaty' },
      { type: 'modify_relation', value: 15 }
    ],
    chains: ['economic_boom'],
    probability: 0.7
  },

  succession_crisis: {
    name: 'Succession Crisis',
    category: 'political',
    description: 'Leadership dispute threatens stability',
    triggers: ['leader_death', 'random'],
    effects: [
      { type: 'faction_instability', duration: 30 }
    ],
    chains: ['civil_war', 'new_leader'],
    probability: 0.01
  },

  // ═══════════════════════════════════════════════════════════
  // MILITARY EVENTS
  // ═══════════════════════════════════════════════════════════

  border_skirmish: {
    name: 'Border Skirmish',
    category: 'military',
    description: 'Minor military engagement at border',
    triggers: ['low_relations', 'contested_system'],
    effects: [
      { type: 'modify_relation', value: -5 },
      { type: 'military_casualties', value: 'minor' }
    ],
    chains: ['war_declared', 'diplomatic_incident'],
    probability: 0.1
  },

  war_declared: {
    name: 'War Declared',
    category: 'military',
    description: 'Formal state of war begins',
    triggers: ['border_skirmish', 'war_tension', 'conquest_goal'],
    effects: [
      { type: 'start_war' },
      { type: 'modify_relation', value: -100 }
    ],
    chains: ['military_mobilization', 'economic_recession'],
    probability: 0.2
  },

  military_mobilization: {
    name: 'Military Mobilization',
    category: 'military',
    description: 'Forces prepared for war',
    triggers: ['war_declared', 'war_tension'],
    effects: [
      { type: 'increase_fleet_production' },
      { type: 'conscription' }
    ],
    chains: [],
    probability: 0.9
  },

  piracy: {
    name: 'Pirate Attack',
    category: 'military',
    description: 'Pirates raid trade routes',
    triggers: ['random', 'weak_military_presence'],
    effects: [
      { type: 'damage_trade_route' },
      { type: 'resource_loss' }
    ],
    chains: ['trade_route_disrupted'],
    probability: 0.02
  },

  // ═══════════════════════════════════════════════════════════
  // SOCIAL EVENTS
  // ═══════════════════════════════════════════════════════════

  population_growth: {
    name: 'Population Growth',
    category: 'social',
    description: 'Population increases significantly',
    triggers: ['economic_boom', 'peace_treaty'],
    effects: [
      { type: 'increase_population', value: 0.1 }
    ],
    chains: ['resource_demand'],
    probability: 0.4
  },

  civil_unrest: {
    name: 'Civil Unrest',
    category: 'social',
    description: 'Population grows restless',
    triggers: ['economic_recession', 'war_losses', 'oppression'],
    effects: [
      { type: 'decrease_stability' },
      { type: 'decrease_production', value: 0.9 }
    ],
    chains: ['rebellion', 'reforms'],
    probability: 0.2
  },

  rebellion: {
    name: 'Rebellion',
    category: 'social',
    description: 'Armed uprising against authority',
    triggers: ['civil_unrest', 'extreme_oppression'],
    effects: [
      { type: 'start_civil_war' },
      { type: 'territory_loss' }
    ],
    chains: ['civil_war'],
    probability: 0.1
  },

  // ═══════════════════════════════════════════════════════════
  // DISCOVERY EVENTS
  // ═══════════════════════════════════════════════════════════

  anomaly_discovered: {
    name: 'Anomaly Discovered',
    category: 'discovery',
    description: 'Strange phenomenon detected',
    triggers: ['exploration', 'random'],
    effects: [
      { type: 'create_anomaly' }
    ],
    chains: ['scientific_breakthrough', 'disaster'],
    probability: 0.01
  },

  scientific_breakthrough: {
    name: 'Scientific Breakthrough',
    category: 'discovery',
    description: 'Major technological advance',
    triggers: ['anomaly_discovered', 'research_complete'],
    effects: [
      { type: 'unlock_technology' },
      { type: 'increase_research', value: 1.2 }
    ],
    chains: ['economic_boom'],
    probability: 0.2
  }
};

// Event categories for filtering
export const EVENT_CATEGORIES = [
  'economic',
  'political',
  'military',
  'social',
  'discovery'
];

export default { EVENTS, EVENT_CATEGORIES };
