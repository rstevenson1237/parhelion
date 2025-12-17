import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { IntelSystem, INTEL_CLASSIFICATION } from '../src/systems/IntelSystem.js';
import { EntityManager, Components } from '../src/core/ECS.js';

describe('IntelSystem', () => {
  let intelSystem;
  let entities;
  let mockEngine;
  let playerId;
  let starId;

  beforeEach(() => {
    entities = new EntityManager();
    intelSystem = new IntelSystem();

    mockEngine = {
      state: { tick: 0 },
      events: { emit: () => {} },
      getSystem: (name) => {
        if (name === 'factions') {
          return {
            getFaction: () => ({ name: 'Test Faction', ideology: 'expansionist' }),
            getControlledSystems: () => []
          };
        }
        return null;
      }
    };

    intelSystem.entities = entities;
    intelSystem.engine = mockEngine;
    intelSystem.events = mockEngine.events;
    intelSystem.setRNG(() => 0.5);

    // Create player
    playerId = entities.create();
    entities.addComponent(playerId, 'Player', { name: 'Test Commander' });
    entities.addComponent(playerId, 'Position', Components.Position(0, 0));

    // Create star system
    starId = entities.create();
    entities.addComponent(starId, 'Star', {
      spectralClass: 'G',
      luminosity: 1.0,
      mass: 1.0,
      age: 4.6
    });
    entities.addComponent(starId, 'Identity', Components.Identity('Sol', 'star'));
    entities.addComponent(starId, 'Position', Components.Position(10, 10));
  });

  describe('generateReport', () => {
    it('should generate intel report on star', () => {
      const result = intelSystem.generateReport(starId, playerId);

      assert.strictEqual(result.success, true);
      assert.ok(result.report);
      assert.strictEqual(result.report.targetType, 'star');
      assert.strictEqual(result.report.targetName, 'Sol');
    });

    it('should reject invalid targets', () => {
      const invalidId = entities.create();
      const result = intelSystem.generateReport(invalidId, playerId);

      assert.strictEqual(result.success, false);
    });

    it('should add accuracy modifier', () => {
      const result1 = intelSystem.generateReport(starId, playerId, 1.0);
      const result2 = intelSystem.generateReport(starId, playerId, 0.5);

      assert.ok(result1.report.accuracy > result2.report.accuracy);
    });
  });

  describe('getIntelReports', () => {
    it('should retrieve stored intel reports', () => {
      intelSystem.generateReport(starId, playerId);
      intelSystem.generateReport(starId, playerId);

      const reports = intelSystem.getIntelReports(playerId);

      assert.strictEqual(reports.reports.length, 2);
    });

    it('should filter by target type', () => {
      intelSystem.generateReport(starId, playerId);

      const reports = intelSystem.getIntelReports(playerId, { targetType: 'planet' });

      assert.strictEqual(reports.reports.length, 0);
    });
  });

  describe('degradeIntelAccuracy', () => {
    it('should reduce accuracy over time', () => {
      intelSystem.generateReport(starId, playerId);
      const initialAccuracy = intelSystem.getLatestIntel(playerId, starId).accuracy;

      mockEngine.state.tick = 100;
      intelSystem.degradeIntelAccuracy({ tick: 100 });

      const degradedAccuracy = intelSystem.getLatestIntel(playerId, starId).accuracy;
      assert.ok(degradedAccuracy < initialAccuracy);
    });
  });
});
