import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EntityManager, Components } from '../src/core/ECS.js';
import { FactionSystem } from '../src/systems/FactionSystem.js';
import { Random } from '../src/utils/Random.js';
import { EventBus } from '../src/core/EventBus.js';

describe('FactionSystem', () => {
  let ecs, factions, rng, events;

  beforeEach(() => {
    ecs = new EntityManager();
    factions = new FactionSystem();
    rng = new Random('faction-test');
    events = new EventBus();

    factions.entities = ecs;
    factions.events = events;
    factions.setRNG(rng.next.bind(rng));
    factions.engine = { state: { tick: 0 } };
  });

  describe('Faction Generation', () => {
    it('should generate specified number of factions', () => {
      const result = factions.generate(6, { stars: [] });
      assert.strictEqual(result.length, 6);
    });

    it('should create factions with unique names', () => {
      const result = factions.generate(6, { stars: [] });
      const names = result.map(f => f.name);
      const uniqueNames = new Set(names);
      assert.strictEqual(uniqueNames.size, 6);
    });

    it('should assign ideology to each faction', () => {
      const result = factions.generate(4, { stars: [] });
      for (const faction of result) {
        assert.ok(faction.ideology);
        assert.ok(faction.ideologyData);
      }
    });

    it('should assign traits to factions', () => {
      const result = factions.generate(4, { stars: [] });
      for (const faction of result) {
        assert.ok(Array.isArray(faction.traits));
        assert.ok(faction.traits.length >= 1);
      }
    });

    it('should assign goals to factions', () => {
      const result = factions.generate(4, { stars: [] });
      for (const faction of result) {
        assert.ok(Array.isArray(faction.goals));
        assert.ok(faction.goals.length >= 2);
      }
    });
  });

  describe('Territory Assignment', () => {
    it('should assign territories when stars provided', () => {
      // Create mock stars
      const star1 = ecs.create('star_1');
      ecs.addComponent(star1, 'Position', Components.Position(0, 0, 0));
      ecs.addComponent(star1, 'Star', Components.Star('G', 1.0, 1.0));

      const star2 = ecs.create('star_2');
      ecs.addComponent(star2, 'Position', Components.Position(10, 10, 0));
      ecs.addComponent(star2, 'Star', Components.Star('K', 0.8, 0.8));

      const stars = [[star1, {}], [star2, {}]];
      factions.generate(2, { stars });

      // Check territories assigned
      const allFactions = factions.getFactions();
      const totalTerritory = allFactions.reduce((sum, f) => sum + f.territory.length, 0);
      assert.ok(totalTerritory > 0, 'Should assign some territory');
    });
  });

  describe('Diplomatic Relations', () => {
    it('should initialize relations between factions', () => {
      factions.generate(3, { stars: [] });
      const allFactions = factions.getFactions();

      // Check that factions have relations with each other
      for (const faction of allFactions) {
        const diplomacy = ecs.getComponent(faction.id, 'Diplomacy');
        assert.ok(diplomacy, 'Faction should have Diplomacy component');
      }
    });
  });

  describe('Faction Retrieval', () => {
    it('should get faction by ID', () => {
      const result = factions.generate(2, { stars: [] });
      const retrieved = factions.getFaction(result[0].id);
      assert.strictEqual(retrieved.name, result[0].name);
    });

    it('should get faction by name', () => {
      const result = factions.generate(2, { stars: [] });
      const retrieved = factions.getFactionByName(result[0].name);
      assert.strictEqual(retrieved.id, result[0].id);
    });

    it('should return null for unknown faction', () => {
      factions.generate(2, { stars: [] });
      const retrieved = factions.getFaction('nonexistent');
      assert.strictEqual(retrieved, undefined);
    });
  });

  describe('State Management', () => {
    it('should serialize and restore state', () => {
      factions.generate(3, { stars: [] });
      const originalCount = factions.getFactions().length;

      const state = factions.getState();

      const newFactions = new FactionSystem();
      newFactions.entities = new EntityManager();
      newFactions.loadState(state);

      assert.strictEqual(newFactions.factions.size, originalCount);
    });
  });
});
