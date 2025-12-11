import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { Game } from '../src/Game.js';
import fs from 'fs';

describe('Integration: Character System', () => {
  let game;
  const testSavePath = './test-saves-integration';

  beforeEach(async () => {
    game = new Game({
      seed: 'integration-test',
      savePath: testSavePath
    });
    await game.initialize();
    await game.newGame({ minStars: 10, maxStars: 15 });
  });

  afterEach(() => {
    if (fs.existsSync(testSavePath)) {
      fs.rmSync(testSavePath, { recursive: true });
    }
  });

  it('should create character through command', async () => {
    const result = await game.executeCommand('create character --name TestChar --origin spacer --profession pilot');

    assert.ok(result.success);
    assert.ok(result.result.render.includes('TestChar'));
    assert.ok(result.result.render.includes('Spacer'));
    assert.ok(result.result.render.includes('Pilot'));
  });

  it('should list available origins', async () => {
    const result = await game.executeCommand('origins');

    assert.ok(result.success);
    assert.ok(result.result.render.includes('CORE WORLDER'));
    assert.ok(result.result.render.includes('SPACER'));
  });

  it('should display skills', async () => {
    const result = await game.executeCommand('skills');

    assert.ok(result.success);
    assert.ok(result.result.render.includes('COMBAT'));
    assert.ok(result.result.render.includes('TECHNICAL'));
  });

  it('should display inventory', async () => {
    const result = await game.executeCommand('inventory');

    assert.ok(result.success);
    assert.ok(result.result.render.includes('Credits'));
    assert.ok(result.result.render.includes('EQUIPPED'));
  });

  it('should display contacts', async () => {
    const result = await game.executeCommand('contacts');

    assert.ok(result.success);
    assert.ok(result.result.render.includes('CONTACTS'));
  });

  it('should display reputation', async () => {
    const result = await game.executeCommand('reputation');

    assert.ok(result.success);
    assert.ok(result.result.render.includes('FACTION REPUTATION'));
  });

  it('should save and load character data', async () => {
    // Create character
    await game.executeCommand('create character --name SaveTest --origin rimmer --profession scientist');

    // Modify character
    const characters = game.engine.getSystem('characters');
    characters.modifyCredits(game.playerEntityId, 5000);
    characters.improveSkill(game.playerEntityId, 'science', 10);

    // Save
    await game.save('character-test');

    // Create new game and load
    const game2 = new Game({ savePath: testSavePath });
    await game2.initialize();
    await game2.load('character-test');

    // Verify
    const inventory = game2.entities.getComponent(game2.playerEntityId, 'Inventory');
    const skills = game2.entities.getComponent(game2.playerEntityId, 'Skills');

    // Credits should include modification
    assert.ok(inventory.credits > 10000);
  });
});
