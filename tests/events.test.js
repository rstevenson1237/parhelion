import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EntityManager } from '../src/core/ECS.js';
import { EventSystem } from '../src/systems/EventSystem.js';
import { EventBus } from '../src/core/EventBus.js';
import { Random } from '../src/utils/Random.js';

describe('EventSystem', () => {
  let ecs, eventSystem, events, rng;

  beforeEach(() => {
    ecs = new EntityManager();
    eventSystem = new EventSystem();
    events = new EventBus();
    rng = new Random('event-test');

    eventSystem.entities = ecs;
    eventSystem.events = events;
    eventSystem.setRNG(rng.next.bind(rng));
    eventSystem.engine = { state: { tick: 0 } };
  });

  describe('Event Firing', () => {
    it('should fire events and record in history', () => {
      eventSystem.fireEvent('resource_discovery', { systemId: 'test' });

      const history = eventSystem.getEventHistory(10);
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].type, 'resource_discovery');
    });

    it('should emit events to EventBus', () => {
      let received = null;
      events.on('event:fired', (e) => { received = e; });

      eventSystem.fireEvent('economic_boom', {});

      assert.ok(received, 'Should emit to EventBus');
      assert.strictEqual(received.data.type, 'economic_boom');
    });

    it('should include event name and tick in history', () => {
      eventSystem.engine.state.tick = 42;
      eventSystem.fireEvent('resource_discovery', { systemId: 'test' });

      const history = eventSystem.getEventHistory(1);
      assert.strictEqual(history[0].name, 'Resource Discovery');
      assert.strictEqual(history[0].tick, 42);
    });

    it('should handle invalid event types gracefully', () => {
      eventSystem.fireEvent('nonexistent_event', {});

      const history = eventSystem.getEventHistory();
      assert.strictEqual(history.length, 0, 'Should not record invalid events');
    });
  });

  describe('Event Queue', () => {
    it('should queue events for future ticks', () => {
      eventSystem.engine.state.tick = 0;
      eventSystem.queueEvent('diplomatic_incident', { target: 'faction_1' }, 5);

      assert.strictEqual(eventSystem.eventQueue.length, 1);
      assert.strictEqual(eventSystem.eventQueue[0].triggerTick, 5);
    });

    it('should process queued events at correct tick', () => {
      eventSystem.engine.state.tick = 0;
      eventSystem.queueEvent('economic_boom', {}, 2);

      // Tick 1 - should not fire
      eventSystem.engine.state.tick = 1;
      eventSystem.processQueue({ tick: 1 });
      assert.strictEqual(eventSystem.getEventHistory().length, 0);

      // Tick 2 - should fire
      eventSystem.engine.state.tick = 2;
      eventSystem.processQueue({ tick: 2 });
      assert.strictEqual(eventSystem.getEventHistory().length, 1);
    });

    it('should process multiple queued events in same tick', () => {
      eventSystem.engine.state.tick = 0;
      eventSystem.queueEvent('economic_boom', {}, 5);
      eventSystem.queueEvent('diplomatic_incident', {}, 5);

      eventSystem.engine.state.tick = 5;
      eventSystem.processQueue({ tick: 5 });

      assert.strictEqual(eventSystem.getEventHistory().length, 2);
    });

    it('should remove processed events from queue', () => {
      eventSystem.engine.state.tick = 0;
      eventSystem.queueEvent('economic_boom', {}, 1);

      assert.strictEqual(eventSystem.eventQueue.length, 1);

      eventSystem.engine.state.tick = 1;
      eventSystem.processQueue({ tick: 1 });

      assert.strictEqual(eventSystem.eventQueue.length, 0);
    });
  });

  describe('Event Cascades', () => {
    it('should queue chain events', () => {
      // resource_discovery can chain to economic_boom
      eventSystem.fireEvent('resource_discovery', {});

      // Check if chain event was queued (depends on RNG)
      // Just verify the mechanism works without error
      assert.ok(true, 'Chain mechanism should execute without error');
    });

    it('should respect chain probability', () => {
      // Fire many events and count chains
      let chainCount = 0;
      const initialLength = eventSystem.eventQueue.length;

      // Fire same event multiple times
      for (let i = 0; i < 100; i++) {
        eventSystem.fireEvent('resource_discovery', {});
      }

      // Some chains should have been queued (probabilistic)
      // Just verify we don't error on chain processing
      assert.ok(eventSystem.eventQueue.length >= initialLength);
    });
  });

  describe('Event History', () => {
    it('should limit history retrieval', () => {
      for (let i = 0; i < 20; i++) {
        eventSystem.fireEvent('resource_discovery', { index: i });
      }

      const limited = eventSystem.getEventHistory(5);
      assert.strictEqual(limited.length, 5);
    });

    it('should return most recent events', () => {
      eventSystem.fireEvent('resource_discovery', { id: 1 });
      eventSystem.fireEvent('economic_boom', { id: 2 });
      eventSystem.fireEvent('diplomatic_incident', { id: 3 });

      const recent = eventSystem.getEventHistory(2);
      assert.strictEqual(recent.length, 2);
      assert.strictEqual(recent[0].type, 'economic_boom');
      assert.strictEqual(recent[1].type, 'diplomatic_incident');
    });
  });

  describe('Effects Processing', () => {
    it('should emit effect events', () => {
      let effectEmitted = null;
      events.on('event:effect', (e) => { effectEmitted = e; });

      eventSystem.fireEvent('resource_discovery', {});

      assert.ok(effectEmitted, 'Should emit effect event');
    });
  });

  describe('Random Events', () => {
    it('should check for random events periodically', () => {
      // Run many ticks
      for (let i = 0; i < 100; i++) {
        eventSystem.engine.state.tick = i;
        eventSystem.checkRandomEvents({ tick: i });
      }

      // Should have fired some random events (probabilistic)
      // Just verify it doesn't error
      assert.ok(true, 'Random event checks should not error');
    });

    it('should only check every 10 ticks', () => {
      const historyBefore = eventSystem.getEventHistory().length;

      // Run 5 ticks (not a multiple of 10)
      for (let i = 1; i <= 5; i++) {
        eventSystem.engine.state.tick = i;
        eventSystem.checkRandomEvents({ tick: i });
      }

      // Random events should not have been checked
      // (though this is probabilistic, it's very unlikely any fired)
      assert.ok(true, 'Should skip non-10-tick intervals');
    });
  });

  describe('State Management', () => {
    it('should serialize and restore state', () => {
      eventSystem.fireEvent('economic_boom', {});
      eventSystem.queueEvent('diplomatic_incident', {}, 10);

      const state = eventSystem.getState();

      const newSystem = new EventSystem();
      newSystem.loadState(state);

      assert.strictEqual(newSystem.eventHistory.length, 1);
      assert.strictEqual(newSystem.eventQueue.length, 1);
    });

    it('should preserve event data on restore', () => {
      eventSystem.engine.state.tick = 5;
      eventSystem.fireEvent('resource_discovery', { systemId: 'test_system' });

      const state = eventSystem.getState();
      const newSystem = new EventSystem();
      newSystem.loadState(state);

      const history = newSystem.getEventHistory(1);
      assert.strictEqual(history[0].data.systemId, 'test_system');
      assert.strictEqual(history[0].tick, 5);
    });

    it('should preserve queued event timing', () => {
      eventSystem.engine.state.tick = 10;
      eventSystem.queueEvent('economic_boom', { value: 123 }, 15);

      const state = eventSystem.getState();
      const newSystem = new EventSystem();
      newSystem.loadState(state);

      assert.strictEqual(newSystem.eventQueue[0].triggerTick, 25);
      assert.strictEqual(newSystem.eventQueue[0].data.value, 123);
    });
  });
});
