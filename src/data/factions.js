/**
 * NEXUS PROTOCOL - Faction Data
 *
 * Faction ideologies, traits, goals, and name generation data.
 */

export const IDEOLOGIES = {
  expansionist: {
    name: 'Expansionist',
    description: 'Believes in aggressive territorial expansion',
    aggression: 0.8,
    trade: 0.4,
    diplomacy: 0.3,
    traits: ['aggressive', 'militaristic']
  },
  mercantile: {
    name: 'Mercantile',
    description: 'Focused on trade and economic dominance',
    aggression: 0.2,
    trade: 0.9,
    diplomacy: 0.6,
    traits: ['industrious', 'diplomatic']
  },
  isolationist: {
    name: 'Isolationist',
    description: 'Prefers minimal external contact',
    aggression: 0.3,
    trade: 0.2,
    diplomacy: 0.1,
    traits: ['defensive', 'xenophobic']
  },
  federalist: {
    name: 'Federalist',
    description: 'Seeks cooperative alliances and mutual benefit',
    aggression: 0.4,
    trade: 0.6,
    diplomacy: 0.9,
    traits: ['diplomatic', 'cooperative']
  },
  militarist: {
    name: 'Militarist',
    description: 'Military strength and conquest above all',
    aggression: 0.9,
    trade: 0.3,
    diplomacy: 0.2,
    traits: ['warlike', 'disciplined']
  },
  technocratic: {
    name: 'Technocratic',
    description: 'Pursues technological and scientific advancement',
    aggression: 0.3,
    trade: 0.5,
    diplomacy: 0.5,
    traits: ['innovative', 'rational']
  }
};

export const FACTION_TRAITS = {
  industrious: {
    name: 'Industrious',
    description: 'Increased production efficiency',
    effects: { production: 1.2, morale: 0.9 }
  },
  diplomatic: {
    name: 'Diplomatic',
    description: 'Better relations with other factions',
    effects: { relations: 1.3, military: 0.8 }
  },
  warlike: {
    name: 'Warlike',
    description: 'Superior military capabilities',
    effects: { military: 1.3, trade: 0.7 }
  },
  innovative: {
    name: 'Innovative',
    description: 'Advanced technology and research',
    effects: { research: 1.4, production: 1.1 }
  },
  aggressive: {
    name: 'Aggressive',
    description: 'Bonus to expansion and conquest',
    effects: { military: 1.2, influence: 1.2, diplomacy: 0.7 }
  },
  defensive: {
    name: 'Defensive',
    description: 'Strong defensive capabilities',
    effects: { defense: 1.4, expansion: 0.8 }
  },
  cooperative: {
    name: 'Cooperative',
    description: 'Benefits from alliances',
    effects: { diplomacy: 1.3, trade: 1.2 }
  },
  xenophobic: {
    name: 'Xenophobic',
    description: 'Distrusts outsiders',
    effects: { diplomacy: 0.5, defense: 1.2, influence: 0.8 }
  },
  disciplined: {
    name: 'Disciplined',
    description: 'Efficient organization and command',
    effects: { military: 1.2, morale: 1.1 }
  },
  rational: {
    name: 'Rational',
    description: 'Logic-driven decision making',
    effects: { research: 1.2, diplomacy: 1.1 }
  },
  ruthless: {
    name: 'Ruthless',
    description: 'Willing to do whatever it takes',
    effects: { military: 1.2, relations: 0.6, influence: 1.1 }
  },
  pacifist: {
    name: 'Pacifist',
    description: 'Avoids conflict when possible',
    effects: { diplomacy: 1.3, military: 0.6, morale: 1.1 }
  }
};

export const FACTION_GOALS = [
  {
    id: 'expand_territory',
    name: 'Territorial Expansion',
    description: 'Claim new star systems',
    priority: { expansionist: 1.5, militarist: 1.3, isolationist: 0.5 }
  },
  {
    id: 'economic_dominance',
    name: 'Economic Dominance',
    description: 'Control trade and resources',
    priority: { mercantile: 1.5, technocratic: 1.1, militarist: 0.7 }
  },
  {
    id: 'military_supremacy',
    name: 'Military Supremacy',
    description: 'Build the strongest fleet',
    priority: { militarist: 1.5, expansionist: 1.2, federalist: 0.6 }
  },
  {
    id: 'political_hegemony',
    name: 'Political Hegemony',
    description: 'Dominate through diplomacy',
    priority: { federalist: 1.5, mercantile: 1.2, isolationist: 0.3 }
  },
  {
    id: 'technological_advancement',
    name: 'Technological Advancement',
    description: 'Lead in research and innovation',
    priority: { technocratic: 1.5, mercantile: 1.1, militarist: 0.9 }
  },
  {
    id: 'cultural_spread',
    name: 'Cultural Influence',
    description: 'Spread ideology across the galaxy',
    priority: { federalist: 1.3, expansionist: 1.1, isolationist: 0.4 }
  },
  {
    id: 'self_preservation',
    name: 'Self-Preservation',
    description: 'Ensure survival and security',
    priority: { isolationist: 1.5, defensive: 1.3 }
  }
];

// Faction name generation
export const FACTION_NAME_PREFIXES = [
  'United', 'Free', 'Imperial', 'Federation', 'Alliance', 'Consortium',
  'Republic', 'Commonwealth', 'Confederacy', 'Union', 'Coalition',
  'Stellar', 'Galactic', 'Solar', 'Planetary', 'Terran', 'Nova',
  'Void', 'Star', 'Cosmic', 'Celestial', 'Astral'
];

export const FACTION_NAME_CORES = [
  'Systems', 'Worlds', 'Colonies', 'Nations', 'States', 'Dominion',
  'Empire', 'League', 'Collective', 'Syndicate', 'Corporation',
  'Trading Company', 'Traders', 'Merchants', 'Explorers', 'Pioneers',
  'Defenders', 'Guardians', 'Protectorate', 'Authority', 'Council'
];

export const FACTION_NAME_SUFFIXES = [
  '', 'of Sol', 'of Terra', 'of the Outer Rim', 'of the Core Worlds',
  'of the Frontier', 'of the Expanse', 'of the Void', 'Pact', 'Treaty'
];

// Faction colors for UI/visualization
export const FACTION_COLORS = [
  '#3498db', // Blue
  '#e74c3c', // Red
  '#2ecc71', // Green
  '#f39c12', // Orange
  '#9b59b6', // Purple
  '#1abc9c', // Teal
  '#e67e22', // Dark Orange
  '#34495e', // Dark Gray
  '#16a085', // Dark Teal
  '#c0392b', // Dark Red
  '#27ae60', // Dark Green
  '#8e44ad'  // Dark Purple
];

export default {
  IDEOLOGIES,
  FACTION_TRAITS,
  FACTION_GOALS,
  FACTION_NAME_PREFIXES,
  FACTION_NAME_CORES,
  FACTION_NAME_SUFFIXES,
  FACTION_COLORS
};
