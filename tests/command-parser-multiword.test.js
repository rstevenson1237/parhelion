/**
 * Test for multi-word argument parsing in commands
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Game } from '../src/Game.js';

describe('Multi-word Command Arguments', () => {
  let game;

  beforeEach(async () => {
    game = new Game({ seed: 'multiword-test', minStars: 5, maxStars: 10 });
    await game.initialize();
    await game.newGame();
  });

  it('should handle multi-word star names in view command', async () => {
    // Get a star from the universe
    const universe = game.engine.getSystem('universe');
    const stars = Array.from(universe.getStars());

    if (stars.length === 0) {
      return; // Skip if no stars
    }

    // Get first star name (might be multi-word like "Mu Cygni Prime")
    const starName = stars[0][1].Identity.name;

    // Execute view command with the full star name
    const result = await game.commands.execute(`view ${starName}`, { game });

    // Should succeed
    assert.strictEqual(result.success, true, `Failed to view "${starName}": ${result.error}`);
    assert.ok(result.result, 'Result should be returned');
    assert.strictEqual(result.result.name, starName, 'Result name should match');
  });

  it('should handle multi-word destinations in goto command', async () => {
    const universe = game.engine.getSystem('universe');
    const stars = Array.from(universe.getStars());

    if (stars.length < 2) {
      return; // Skip if not enough stars
    }

    const targetStar = stars[1][1].Identity.name;

    // Execute goto command
    const result = await game.commands.execute(`goto ${targetStar}`, { game });

    // Should succeed or provide meaningful response
    assert.ok(result.success || result.result, `Failed to goto "${targetStar}"`);
  });

  it('should handle multi-word targets in intel command', async () => {
    const universe = game.engine.getSystem('universe');
    const stars = Array.from(universe.getStars());

    if (stars.length === 0) {
      return; // Skip if no stars
    }

    const starName = stars[0][1].Identity.name;

    // Execute intel command
    const result = await game.commands.execute(`intel ${starName}`, { game });

    // Should succeed
    assert.ok(result.success || result.result, `Failed to get intel on "${starName}"`);
  });

  it('should handle multi-word faction names in faction command', async () => {
    const factionSystem = game.engine.getSystem('factions');
    const factions = factionSystem.getFactions();

    if (factions.length === 0) {
      return; // Skip if no factions
    }

    // Find a faction with a multi-word name (if any)
    const faction = factions.find(f => f.name.includes(' ')) || factions[0];

    // Execute faction command
    const result = await game.commands.execute(`faction ${faction.name}`, { game });

    // Should succeed or provide meaningful response
    assert.ok(result.success || result.result, `Failed to view faction "${faction.name}"`);
  });

  it('should still handle flags correctly with multi-word arguments', async () => {
    const universe = game.engine.getSystem('universe');
    const stars = Array.from(universe.getStars());

    if (stars.length === 0) {
      return; // Skip if no stars
    }

    const starName = stars[0][1].Identity.name;

    // Execute view command with --detail flag
    const result = await game.commands.execute(`view ${starName} --detail`, { game });

    // Should succeed
    assert.strictEqual(result.success, true, `Failed with flag: ${result.error}`);
    assert.ok(result.result, 'Result should be returned');
  });
});
