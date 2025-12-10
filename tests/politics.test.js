import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EntityManager, Components } from '../src/core/ECS.js';
import { PoliticsSystem } from '../src/systems/PoliticsSystem.js';
import { EventBus } from '../src/core/EventBus.js';

describe('PoliticsSystem', () => {
  let ecs, politics, events;

  beforeEach(() => {
    ecs = new EntityManager();
    politics = new PoliticsSystem();
    events = new EventBus();

    politics.entities = ecs;
    politics.events = events;

    // Create two test factions
    const faction1 = ecs.create('faction_1');
    ecs.addComponent(faction1, 'Faction', Components.Faction('expansionist', [], []));
    ecs.addComponent(faction1, 'Diplomacy', Components.Diplomacy({ faction_2: 25 }, [], 50));

    const faction2 = ecs.create('faction_2');
    ecs.addComponent(faction2, 'Faction', Components.Faction('mercantile', [], []));
    ecs.addComponent(faction2, 'Diplomacy', Components.Diplomacy({ faction_1: 25 }, [], 50));
  });

  describe('Relations', () => {
    it('should modify relations symmetrically', () => {
      politics.modifyRelation('faction_1', 'faction_2', -20, 'border_dispute');

      const rel1 = politics.getRelation('faction_1', 'faction_2');
      const rel2 = politics.getRelation('faction_2', 'faction_1');

      assert.strictEqual(rel1, 5, 'Faction 1 relation should decrease');
      assert.strictEqual(rel2, 5, 'Faction 2 relation should decrease symmetrically');
    });

    it('should clamp relations to -100/+100', () => {
      politics.modifyRelation('faction_1', 'faction_2', 200, 'alliance');
      assert.strictEqual(politics.getRelation('faction_1', 'faction_2'), 100);

      politics.modifyRelation('faction_1', 'faction_2', -300, 'betrayal');
      assert.strictEqual(politics.getRelation('faction_1', 'faction_2'), -100);
    });

    it('should drift relations toward neutral over time', () => {
      // Set extreme relations
      const diplomacy = ecs.getComponent('faction_1', 'Diplomacy');
      diplomacy.relations['faction_2'] = 50;

      const diplomacy2 = ecs.getComponent('faction_2', 'Diplomacy');
      diplomacy2.relations['faction_1'] = 50;

      // Run many update cycles
      for (let i = 0; i < 100; i++) {
        politics.updateRelations({ tick: i });
      }

      const finalRel = politics.getRelation('faction_1', 'faction_2');
      assert.ok(finalRel < 50, 'Positive relations should drift down');
      assert.ok(finalRel >= 0, 'Should drift toward neutral, not negative');
    });

    it('should emit event on relation change', () => {
      let emittedEvent = null;
      events.on('relation:changed', (e) => { emittedEvent = e; });

      politics.modifyRelation('faction_1', 'faction_2', -10, 'test');

      assert.ok(emittedEvent, 'Should emit relation changed event');
      assert.strictEqual(emittedEvent.data.delta, -10);
      assert.strictEqual(emittedEvent.data.reason, 'test');
    });
  });

  describe('Treaties', () => {
    it('should track treaty expiration', () => {
      politics.treaties.set('treaty_1', {
        type: 'trade_agreement',
        parties: ['faction_1', 'faction_2'],
        duration: 5
      });

      // Advance 5 ticks
      for (let i = 0; i < 5; i++) {
        politics.updateTreaties({ tick: i });
      }

      assert.ok(!politics.treaties.has('treaty_1'), 'Treaty should expire');
    });

    it('should emit event on treaty expiration', () => {
      let expiredEvent = null;
      events.on('treaty:expired', (e) => { expiredEvent = e; });

      politics.treaties.set('treaty_1', {
        type: 'non_aggression',
        parties: ['faction_1', 'faction_2'],
        duration: 1
      });

      politics.updateTreaties({ tick: 1 });

      assert.ok(expiredEvent, 'Should emit expiration event');
    });

    it('should not expire treaties with duration 0', () => {
      politics.treaties.set('permanent_treaty', {
        type: 'alliance',
        parties: ['faction_1', 'faction_2'],
        duration: 0
      });

      // Run multiple updates
      for (let i = 0; i < 10; i++) {
        politics.updateTreaties({ tick: i });
      }

      assert.ok(politics.treaties.has('permanent_treaty'), 'Permanent treaty should remain');
    });
  });

  describe('State Management', () => {
    it('should serialize and restore state', () => {
      politics.treaties.set('t1', { type: 'alliance', duration: 100 });
      politics.wars.set('w1', { attacker: 'faction_1', defender: 'faction_2' });

      const state = politics.getState();

      const newPolitics = new PoliticsSystem();
      newPolitics.loadState(state);

      assert.ok(newPolitics.treaties.has('t1'), 'Should restore treaties');
      assert.ok(newPolitics.wars.has('w1'), 'Should restore wars');
    });

    it('should preserve treaty and war data on restore', () => {
      const treaty = {
        type: 'trade_agreement',
        parties: ['faction_1', 'faction_2'],
        duration: 50
      };
      politics.treaties.set('treaty_1', treaty);

      const state = politics.getState();
      const newPolitics = new PoliticsSystem();
      newPolitics.loadState(state);

      const restored = newPolitics.treaties.get('treaty_1');
      assert.strictEqual(restored.type, 'trade_agreement');
      assert.strictEqual(restored.duration, 50);
    });
  });
});
