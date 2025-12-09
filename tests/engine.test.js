import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Engine } from '../src/core/Engine.js';

describe('Engine', () => {
  let engine;

  beforeEach(() => {
    engine = new Engine({ paused: true });
  });

  it('should initialize with tick 0', () => {
    assert.strictEqual(engine.state.tick, 0);
  });

  it('should increment tick on step()', () => {
    engine.start();
    engine.step();
    assert.strictEqual(engine.state.tick, 1);
  });

  it('should advance multiple ticks', () => {
    engine.start();
    engine.advance(5);
    assert.strictEqual(engine.state.tick, 5);
  });

  it('should register and call systems', () => {
    let called = false;
    engine.registerSystem('test', {
      update: () => { called = true; }
    });
    engine.start();
    engine.step();
    assert.strictEqual(called, true);
  });

  it('should serialize and restore state', () => {
    engine.start();
    engine.advance(10);
    const state = engine.getState();

    const engine2 = new Engine();
    engine2.loadState(state);

    assert.strictEqual(engine2.state.tick, 10);
  });
});
