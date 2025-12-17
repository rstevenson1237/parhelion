import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { FleetSystem, SHIP_TYPES } from '../src/systems/FleetSystem.js';
import { EntityManager, Components } from '../src/core/ECS.js';

describe('FleetSystem', () => {
  let fleetSystem;
  let entities;
  let mockEngine;
  let starId; // Store star ID for tests

  beforeEach(() => {
    entities = new EntityManager();
    fleetSystem = new FleetSystem();

    mockEngine = {
      state: { tick: 0 },
      events: { emit: () => {} },
      getSystem: () => ({ entities })
    };

    fleetSystem.entities = entities;
    fleetSystem.engine = mockEngine;
    fleetSystem.events = mockEngine.events;
    fleetSystem.setRNG(() => 0.5);

    // Create a star for location
    starId = entities.create();
    entities.addComponent(starId, 'Star', { spectralClass: 'G' });
    entities.addComponent(starId, 'Identity', Components.Identity('Sol', 'star'));
    entities.addComponent(starId, 'Position', Components.Position(0, 0));
  });

  describe('createFleet', () => {
    it('should create a fleet with all components', () => {
      const result = fleetSystem.createFleet({
        name: 'Test Fleet',
        locationId: starId,
        factionId: 'faction_1'
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.id);

      // Verify components
      assert.ok(entities.hasComponent(result.id, 'Fleet'));
      assert.ok(entities.hasComponent(result.id, 'Identity'));
      assert.ok(entities.hasComponent(result.id, 'Commandable'));
      assert.ok(entities.hasComponent(result.id, 'OrderQueue'));
    });

    it('should generate unique names', () => {
      const name1 = fleetSystem.generateFleetName();
      fleetSystem.setRNG(() => 0.8);
      const name2 = fleetSystem.generateFleetName();

      assert.ok(name1);
      assert.ok(name2);
    });
  });

  describe('calculateCombatPower', () => {
    it('should calculate correct combat power', () => {
      const composition = { FRIGATE: 3, DESTROYER: 2 };
      const power = fleetSystem.calculateCombatPower(composition);

      const expected = (SHIP_TYPES.FRIGATE.combat * 3) + (SHIP_TYPES.DESTROYER.combat * 2);
      assert.strictEqual(power, expected);
    });
  });

  describe('getFleets', () => {
    it('should return all fleets', () => {
      fleetSystem.createFleet({ locationId: starId });
      fleetSystem.createFleet({ locationId: starId });

      const fleets = fleetSystem.getFleets();
      assert.strictEqual(fleets.length, 2);
    });

    it('should filter by faction', () => {
      fleetSystem.createFleet({ locationId: starId, factionId: 'faction_1' });
      fleetSystem.createFleet({ locationId: starId, factionId: 'faction_2' });

      const filtered = fleetSystem.getFleets({ factionId: 'faction_1' });
      assert.strictEqual(filtered.length, 1);
    });
  });
});
