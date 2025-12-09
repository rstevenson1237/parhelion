/**
 * NEXUS PROTOCOL - Resource Data
 *
 * Resource types, production chains, and market data.
 */

export const RESOURCES = {
  // Basic resources
  minerals: {
    name: 'Minerals',
    basePrice: 10,
    weight: 1.0,
    category: 'raw',
    description: 'Common minerals for construction'
  },
  metals: {
    name: 'Metals',
    basePrice: 25,
    weight: 1.5,
    category: 'raw',
    description: 'Refined metals for manufacturing'
  },
  water: {
    name: 'Water',
    basePrice: 5,
    weight: 2.0,
    category: 'basic',
    description: 'Essential for life support'
  },
  fuel: {
    name: 'Fuel',
    basePrice: 30,
    weight: 0.5,
    category: 'energy',
    description: 'Starship fuel and power generation'
  },

  // Advanced resources
  rare_earth: {
    name: 'Rare Earth',
    basePrice: 100,
    weight: 0.2,
    category: 'advanced',
    description: 'Rare minerals for advanced technology'
  },
  organics: {
    name: 'Organics',
    basePrice: 15,
    weight: 0.8,
    category: 'basic',
    description: 'Food and biological materials'
  },
  gases: {
    name: 'Gases',
    basePrice: 20,
    weight: 0.3,
    category: 'raw',
    description: 'Industrial gases'
  },

  // Manufactured goods
  electronics: {
    name: 'Electronics',
    basePrice: 200,
    weight: 0.1,
    category: 'manufactured',
    description: 'Computer systems and components'
  },
  machinery: {
    name: 'Machinery',
    basePrice: 150,
    weight: 2.0,
    category: 'manufactured',
    description: 'Industrial equipment'
  },
  weapons: {
    name: 'Weapons',
    basePrice: 300,
    weight: 1.0,
    category: 'military',
    description: 'Military armaments'
  }
};

export const PRODUCTION_CHAINS = {
  electronics: {
    inputs: { rare_earth: 2, metals: 1 },
    output: 1,
    timeTicks: 4,
    description: 'Produce electronics from rare earth and metals'
  },
  machinery: {
    inputs: { metals: 3, electronics: 1 },
    output: 1,
    timeTicks: 6,
    description: 'Produce machinery from metals and electronics'
  },
  weapons: {
    inputs: { metals: 2, electronics: 1, machinery: 1 },
    output: 1,
    timeTicks: 8,
    description: 'Produce weapons from metals, electronics, and machinery'
  }
};

// Resource production by planet/station type
export const PRODUCTION_BY_TYPE = {
  barren: { minerals: 10, metals: 5 },
  rocky: { minerals: 8, metals: 8, rare_earth: 2 },
  desert: { minerals: 5, rare_earth: 5 },
  ocean: { water: 20, organics: 10 },
  temperate: { organics: 15, water: 10, minerals: 3 },
  ice: { water: 15, gases: 5 },
  gas_giant: { gases: 30, fuel: 10 },
  volcanic: { metals: 15, fuel: 5 },

  // Station types
  mining: { minerals: 20, metals: 15, rare_earth: 5 },
  research: { electronics: 5 },
  trade: {}, // Trade stations don't produce, they facilitate exchange
  orbital: { organics: 5 }, // Basic food production
  military: { weapons: 3 },
  shipyard: { machinery: 5 }
};

// Resource consumption by population
export const CONSUMPTION_PER_1K_POP = {
  water: 2,
  organics: 1.5,
  fuel: 0.5
};

export default {
  RESOURCES,
  PRODUCTION_CHAINS,
  PRODUCTION_BY_TYPE,
  CONSUMPTION_PER_1K_POP
};
