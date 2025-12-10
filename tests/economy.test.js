import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EntityManager, Components } from '../src/core/ECS.js';
import { EconomySystem } from '../src/systems/EconomySystem.js';
import { Random } from '../src/utils/Random.js';
import { EventBus } from '../src/core/EventBus.js';

describe('EconomySystem', () => {
  let ecs, economy, rng, events;

  beforeEach(() => {
    ecs = new EntityManager();
    economy = new EconomySystem();
    rng = new Random('economy-test');
    events = new EventBus();

    economy.entities = ecs;
    economy.events = events;
    economy.setRNG(rng.next.bind(rng));
  });

  describe('Production', () => {
    it('should increase resources based on planet type', () => {
      // Create a rocky planet with Resources component
      const planetId = ecs.create('test_planet');
      ecs.addComponent(planetId, 'Planet',
        Components.Planet('rocky', 'none', 1.0, 0));
      ecs.addComponent(planetId, 'Resources',
        Components.Resources({ minerals: 0, metals: 0 }, 100000));

      // Process production
      economy.processProduction({ tick: 1 });

      const resources = ecs.getComponent(planetId, 'Resources');
      assert.ok(resources.stored.minerals > 0, 'Should produce minerals');
      assert.ok(resources.stored.metals > 0, 'Should produce metals');
    });

    it('should produce different resources for different planet types', () => {
      const oceanPlanet = ecs.create('ocean');
      ecs.addComponent(oceanPlanet, 'Planet',
        Components.Planet('ocean', 'breathable', 1.0, 0));
      ecs.addComponent(oceanPlanet, 'Resources',
        Components.Resources({}, 100000));

      economy.processProduction({ tick: 1 });

      const resources = ecs.getComponent(oceanPlanet, 'Resources');
      assert.ok(resources.stored.water > 0, 'Ocean should produce water');
      assert.ok(resources.stored.organics > 0, 'Ocean should produce organics');
    });
  });

  describe('Consumption', () => {
    it('should consume resources based on population', () => {
      const planetId = ecs.create('populated');
      ecs.addComponent(planetId, 'Planet',
        Components.Planet('temperate', 'breathable', 1.0, 10000));
      ecs.addComponent(planetId, 'Resources',
        Components.Resources({ water: 1000, organics: 1000, fuel: 1000 }, 100000));

      const before = { ...ecs.getComponent(planetId, 'Resources').stored };
      economy.processConsumption({ tick: 1 });
      const after = ecs.getComponent(planetId, 'Resources').stored;

      assert.ok(after.water < before.water, 'Should consume water');
      assert.ok(after.organics < before.organics, 'Should consume organics');
    });

    it('should not consume more than available', () => {
      const planetId = ecs.create('scarce');
      ecs.addComponent(planetId, 'Planet',
        Components.Planet('temperate', 'breathable', 1.0, 1000000));
      ecs.addComponent(planetId, 'Resources',
        Components.Resources({ water: 10 }, 100000));

      economy.processConsumption({ tick: 1 });

      const resources = ecs.getComponent(planetId, 'Resources');
      assert.ok(resources.stored.water >= 0, 'Should not go negative');
    });
  });

  describe('Market Prices', () => {
    it('should initialize market prices at base values', () => {
      const stationId = ecs.create('station');
      ecs.addComponent(stationId, 'Market',
        Components.Market({}, {}, {}));

      economy.initializeMarkets();

      const market = ecs.getComponent(stationId, 'Market');
      assert.ok(market.prices.minerals > 0, 'Should have mineral price');
      assert.ok(market.prices.metals > 0, 'Should have metal price');
    });

    it('should fluctuate prices within bounds', () => {
      const stationId = ecs.create('station');
      ecs.addComponent(stationId, 'Market',
        Components.Market({}, {}, {}));

      economy.initializeMarkets();

      // Run multiple price updates
      for (let i = 0; i < 100; i++) {
        economy.updateMarketPrices({ tick: i });
      }

      const market = ecs.getComponent(stationId, 'Market');
      // Prices should stay within reasonable bounds (0.5x to 3x base)
      assert.ok(market.prices.minerals >= 5, 'Price should not go below 0.5x base');
      assert.ok(market.prices.minerals <= 30, 'Price should not exceed 3x base');
    });
  });

  describe('State Management', () => {
    it('should serialize and restore state', () => {
      economy.tradeRoutes.set('route1', { from: 'a', to: 'b', goods: ['minerals'] });

      const state = economy.getState();

      const newEconomy = new EconomySystem();
      newEconomy.loadState(state);

      assert.ok(newEconomy.tradeRoutes.has('route1'), 'Should restore trade routes');
    });
  });
});
