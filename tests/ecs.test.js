import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EntityManager, Components } from '../src/core/ECS.js';

describe('EntityManager', () => {
  let ecs;

  beforeEach(() => {
    ecs = new EntityManager();
  });

  it('should create entities with unique IDs', () => {
    const id1 = ecs.create();
    const id2 = ecs.create();
    assert.notStrictEqual(id1, id2);
  });

  it('should add and retrieve components', () => {
    const id = ecs.create('test');
    ecs.addComponent(id, 'Position', Components.Position(10, 20, 30));

    const pos = ecs.getComponent(id, 'Position');
    assert.strictEqual(pos.x, 10);
    assert.strictEqual(pos.y, 20);
    assert.strictEqual(pos.z, 30);
  });

  it('should query entities by components', () => {
    const id1 = ecs.create('star1');
    ecs.addComponent(id1, 'Position', Components.Position(0, 0, 0));
    ecs.addComponent(id1, 'Star', Components.Star('G', 1.0, 1.0));

    const id2 = ecs.create('planet1');
    ecs.addComponent(id2, 'Position', Components.Position(1, 0, 0));
    ecs.addComponent(id2, 'Planet', Components.Planet('temperate', 'breathable', 1.0));

    const stars = Array.from(ecs.query('Position', 'Star'));
    assert.strictEqual(stars.length, 1);
    assert.strictEqual(stars[0][0], id1);
  });

  it('should serialize and deserialize', () => {
    const id = ecs.create('test');
    ecs.addComponent(id, 'Identity', Components.Identity('Test', 'test', 'A test'));

    const data = ecs.serialize();

    const ecs2 = new EntityManager();
    ecs2.deserialize(data);

    const identity = ecs2.getComponent('test', 'Identity');
    assert.strictEqual(identity.name, 'Test');
  });

  it('should count entities with component', () => {
    ecs.create('a');
    ecs.addComponent('a', 'Star', Components.Star('G', 1, 1));
    ecs.create('b');
    ecs.addComponent('b', 'Star', Components.Star('M', 0.5, 0.5));
    ecs.create('c');
    ecs.addComponent('c', 'Planet', Components.Planet('rocky', 'none', 0.5));

    assert.strictEqual(ecs.count('Star'), 2);
    assert.strictEqual(ecs.count('Planet'), 1);
  });
});
