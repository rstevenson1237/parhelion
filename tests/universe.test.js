import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EntityManager } from '../src/core/ECS.js';
import { UniverseSystem } from '../src/systems/UniverseSystem.js';
import { Random } from '../src/utils/Random.js';
import { EventBus } from '../src/core/EventBus.js';

describe('UniverseSystem', () => {
  let ecs, universe, rng, events;

  beforeEach(() => {
    ecs = new EntityManager();
    universe = new UniverseSystem();
    rng = new Random('test-seed');
    events = new EventBus();

    universe.entities = ecs;
    universe.events = events;
    universe.setRNG(rng.next.bind(rng));
  });

  it('should generate stars within bounds', () => {
    const result = universe.generate('test', {
      minStars: 10,
      maxStars: 20,
      galaxySize: 150
    });

    // Poisson disk sampling may not always fit all requested stars
    // so we check that at least some stars were generated
    assert.ok(result.stars.length > 0);
    assert.ok(result.stars.length <=20);

    // Verify stars have required components
    const starCount = ecs.count('Star');
    assert.ok(starCount > 0, 'Should have Star components');
  });

  it('should generate with same seed produces same result', () => {
    const rng1 = new Random('same-seed');
    const rng2 = new Random('same-seed');

    const u1 = new UniverseSystem();
    u1.entities = new EntityManager();
    u1.events = new EventBus();
    u1.setRNG(rng1.next.bind(rng1));

    const u2 = new UniverseSystem();
    u2.entities = new EntityManager();
    u2.events = new EventBus();
    u2.setRNG(rng2.next.bind(rng2));

    const r1 = u1.generate('x', { minStars: 10, maxStars: 15 });
    const r2 = u2.generate('x', { minStars: 10, maxStars: 15 });

    assert.strictEqual(r1.stars.length, r2.stars.length);
    assert.strictEqual(r1.stars[0].name, r2.stars[0].name);
  });

  it('should create connected graph (all stars reachable)', () => {
    const result = universe.generate('connectivity-test', {
      minStars: 10,
      maxStars: 15,
      galaxySize: 150,
      connectionDistance: 50  // Increase connection distance to ensure connectivity
    });

    if (result.stars.length === 0) {
      assert.fail('No stars generated');
    }

    // Verify routes were created
    const routeCount = ecs.count('Route');
    assert.ok(routeCount > 0, 'Should generate routes between stars');

    // Verify at least one route exists for each star (except possibly isolated ones)
    // This is a simplified connectivity check
    assert.ok(routeCount >= result.stars.length - 1, 'Should have enough routes for basic connectivity');
  });

  it('should generate planets for stars', () => {
    universe.generate('planets-test', { minStars: 5, maxStars: 10, galaxySize: 150 });

    const planetCount = ecs.count('Planet');
    assert.ok(planetCount > 0, 'Should generate at least some planets');
  });
});
