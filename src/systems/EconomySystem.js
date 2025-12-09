/**
 * NEXUS PROTOCOL - Economy System
 *
 * Resource production, consumption, trade routes, and market pricing.
 */

import { Components } from '../core/ECS.js';
import { RESOURCES, PRODUCTION_BY_TYPE, CONSUMPTION_PER_1K_POP } from '../data/resources.js';

export class EconomySystem {
  constructor() {
    this.entities = null;
    this.engine = null;
    this.events = null;
    this.rng = null;
    this.tradeRoutes = new Map();
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
    // Process production and consumption each tick
    this.processProduction(tickData);
    this.processConsumption(tickData);
    this.updateMarketPrices(tickData);
  }

  /**
   * Process resource production
   */
  processProduction(tickData) {
    // Process planets with production
    for (const [id, components] of this.entities.query('Planet', 'Resources')) {
      const planetType = components.Planet.planetType;
      const production = PRODUCTION_BY_TYPE[planetType] || {};

      for (const [resource, amount] of Object.entries(production)) {
        components.Resources.stored[resource] =
          (components.Resources.stored[resource] || 0) + amount;
      }
    }
  }

  /**
   * Process resource consumption
   */
  processConsumption(tickData) {
    for (const [id, components] of this.entities.query('Planet', 'Resources')) {
      const population = components.Planet.population;
      if (population === 0) continue;

      const popThousands = population / 1000;

      for (const [resource, perK] of Object.entries(CONSUMPTION_PER_1K_POP)) {
        const needed = perK * popThousands;
        const available = components.Resources.stored[resource] || 0;
        const consumed = Math.min(needed, available);
        components.Resources.stored[resource] = available - consumed;
      }
    }
  }

  /**
   * Update market prices based on supply/demand
   */
  updateMarketPrices(tickData) {
    for (const [id, components] of this.entities.query('Market')) {
      // Simple price fluctuation for now
      for (const resource in RESOURCES) {
        const basePrice = RESOURCES[resource].basePrice;
        const variance = 0.8 + this.rng() * 0.4; // 0.8x to 1.2x
        components.Market.prices[resource] = Math.floor(basePrice * variance);
      }
    }
  }

  /**
   * Initialize markets for stations
   */
  initializeMarkets() {
    for (const [id, components] of this.entities.query('Market')) {
      // Set initial prices at base values
      for (const resource in RESOURCES) {
        components.Market.prices[resource] = RESOURCES[resource].basePrice;
        components.Market.demand[resource] = 0;
        components.Market.supply[resource] = 0;
      }
    }
  }

  /**
   * Get system state for serialization
   */
  getState() {
    return {
      tradeRoutes: Array.from(this.tradeRoutes.entries())
    };
  }

  /**
   * Load system state
   */
  loadState(state) {
    if (state.tradeRoutes) {
      this.tradeRoutes = new Map(state.tradeRoutes);
    }
  }
}

export default EconomySystem;
