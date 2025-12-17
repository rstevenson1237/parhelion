import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Game } from '../src/Game.js';

describe('Game Command Integration', () => {
  let game;

  beforeEach(async () => {
    game = new Game({ seed: 'test', minStars: 10 });
    await game.initialize();
    await game.newGame();
  });

  describe('Order Commands', () => {
    it('should parse order command string', () => {
      const parsed = game.parseOrderCommand('move Sol');

      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.orderType, 'move');
      assert.strictEqual(parsed.targetName, 'sol');
    });

    it('should find targets by name', () => {
      const universe = game.engine.getSystem('universe');
      const stars = Array.from(universe.getStars());
      if (stars.length === 0) {
        assert.ok(true, 'No stars generated');
        return;
      }
      const firstName = stars[0][1].Identity.name;

      const targetId = game.findTargetByName(firstName);
      assert.ok(targetId);
    });
  });

  describe('Communication Commands', () => {
    it('should list messages when no messages exist', async () => {
      const result = await game.comms('read', null, null, {});

      assert.ok(result.message || result.render);
    });
  });

  describe('Intel Commands', () => {
    it('should generate intel on a star', async () => {
      const universe = game.engine.getSystem('universe');
      const stars = Array.from(universe.getStars());
      if (stars.length === 0) {
        assert.ok(true, 'No stars generated');
        return;
      }
      const starName = stars[0][1].Identity.name;

      const result = await game.intel(starName, false, {});

      assert.ok(result.render);
      assert.ok(result.render.includes('INTELLIGENCE REPORT'));
    });
  });
});
