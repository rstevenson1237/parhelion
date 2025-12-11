import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EntityManager, Components } from '../src/core/ECS.js';
import { CharacterSystem } from '../src/systems/CharacterSystem.js';
import { Random } from '../src/utils/Random.js';
import { EventBus } from '../src/core/EventBus.js';

describe('CharacterSystem', () => {
  let ecs, characters, rng, events;

  beforeEach(() => {
    ecs = new EntityManager();
    characters = new CharacterSystem();
    rng = new Random('character-test');
    events = new EventBus();

    characters.entities = ecs;
    characters.events = events;
    characters.setRNG(rng.next.bind(rng));
    characters.engine = { state: { tick: 0 } };
  });

  describe('Character Creation', () => {
    it('should create character with default values', () => {
      const result = characters.createCharacter({ name: 'Test' });

      assert.ok(result.id);
      assert.strictEqual(result.name, 'Test');
      assert.ok(result.origin);
      assert.ok(result.profession);
    });

    it('should apply origin bonuses', () => {
      const result = characters.createCharacter({
        name: 'Test',
        origin: 'spacer'
      });

      // Spacer gives +2 dexterity, +1 constitution
      assert.strictEqual(result.attributes.dexterity, 12);
      assert.strictEqual(result.attributes.constitution, 11);
    });

    it('should apply profession skill bonuses', () => {
      const result = characters.createCharacter({
        name: 'Test',
        profession: 'pilot'
      });

      // Pilot gives +3 piloting
      assert.ok(result.skills.piloting >= 3);
    });

    it('should calculate starting credits', () => {
      const result = characters.createCharacter({
        name: 'Test',
        origin: 'coreworlder',
        profession: 'merchant'
      });

      // Coreworlder: 15000, Merchant: +5000
      assert.strictEqual(result.credits, 20000);
    });
  });

  describe('Skill System', () => {
    let charId;

    beforeEach(() => {
      const result = characters.createCharacter({ name: 'Test' });
      charId = result.id;
    });

    it('should get effective skill level', () => {
      const skills = ecs.getComponent(charId, 'Skills');
      skills.piloting = 10;

      const effective = characters.getEffectiveSkill(charId, 'piloting');
      assert.strictEqual(effective, 10);
    });

    it('should improve skills', () => {
      const skills = ecs.getComponent(charId, 'Skills');
      const oldValue = skills.combat;

      characters.improveSkill(charId, 'combat', 5);

      assert.strictEqual(skills.combat, oldValue + 5);
    });

    it('should cap skills at 100', () => {
      const skills = ecs.getComponent(charId, 'Skills');
      skills.combat = 99;

      characters.improveSkill(charId, 'combat', 10);

      assert.strictEqual(skills.combat, 100);
    });

    it('should perform skill checks', () => {
      const skills = ecs.getComponent(charId, 'Skills');
      skills.diplomacy = 50;

      const result = characters.skillCheck(charId, 'diplomacy', 50);

      assert.ok('success' in result);
      assert.ok('roll' in result);
      assert.ok('effectiveSkill' in result);
    });
  });

  describe('Inventory System', () => {
    let charId;

    beforeEach(() => {
      const result = characters.createCharacter({ name: 'Test' });
      charId = result.id;
    });

    it('should add items to inventory', () => {
      const result = characters.addItem(charId, {
        name: 'Test Item',
        type: 'misc',
        value: 100
      });

      assert.ok(result.success);
      assert.ok(result.item.id);
    });

    it('should remove items from inventory', () => {
      const addResult = characters.addItem(charId, {
        name: 'Test Item',
        type: 'misc',
        value: 100
      });

      const removeResult = characters.removeItem(charId, addResult.item.id);

      assert.ok(removeResult.success);
    });

    it('should equip items', () => {
      const addResult = characters.addItem(charId, {
        name: 'Test Weapon',
        type: 'weapon',
        slot: 'weapon',
        value: 500
      });

      const equipResult = characters.equipItem(charId, addResult.item.id);

      assert.ok(equipResult.success);
      assert.strictEqual(equipResult.slot, 'weapon');
    });

    it('should modify credits', () => {
      const inventory = ecs.getComponent(charId, 'Inventory');
      const originalCredits = inventory.credits;

      characters.modifyCredits(charId, 1000);

      assert.strictEqual(inventory.credits, originalCredits + 1000);
    });

    it('should not allow negative credits', () => {
      const inventory = ecs.getComponent(charId, 'Inventory');
      inventory.credits = 100;

      const result = characters.modifyCredits(charId, -500);

      assert.ok(!result.success);
      assert.strictEqual(inventory.credits, 100);
    });
  });

  describe('Contacts System', () => {
    let charId;

    beforeEach(() => {
      const result = characters.createCharacter({ name: 'Test' });
      charId = result.id;
    });

    it('should add contacts', () => {
      const result = characters.addContact(charId, {
        id: 'npc_1',
        name: 'Test NPC',
        faction: 'Test Faction'
      });

      assert.ok(result.success);
      assert.strictEqual(result.contact.name, 'Test NPC');
    });

    it('should modify contact relations', () => {
      characters.addContact(charId, {
        id: 'npc_1',
        name: 'Test NPC',
        relation: 0
      });

      characters.modifyContactRelation(charId, 'npc_1', 30, 'helped');

      const contacts = ecs.getComponent(charId, 'Contacts');
      const contact = contacts.contacts.find(c => c.id === 'npc_1');

      assert.strictEqual(contact.relation, 30);
      assert.strictEqual(contact.type, 'friend');
    });
  });

  describe('Reputation System', () => {
    let charId;

    beforeEach(() => {
      const result = characters.createCharacter({ name: 'Test' });
      charId = result.id;
    });

    it('should get faction reputation', () => {
      const rep = characters.getReputation(charId, 'faction_1');
      assert.strictEqual(rep, 0);  // Default neutral
    });

    it('should modify faction reputation', () => {
      characters.modifyReputation(charId, 'faction_1', 25, 'completed_mission');

      const rep = characters.getReputation(charId, 'faction_1');
      assert.strictEqual(rep, 25);
    });

    it('should clamp reputation to bounds', () => {
      characters.modifyReputation(charId, 'faction_1', 150, 'test');
      assert.strictEqual(characters.getReputation(charId, 'faction_1'), 100);

      characters.modifyReputation(charId, 'faction_1', -300, 'test');
      assert.strictEqual(characters.getReputation(charId, 'faction_1'), -100);
    });

    it('should return correct standing description', () => {
      const exalted = characters.getReputationStanding(85);
      assert.strictEqual(exalted.level, 'Exalted');

      const neutral = characters.getReputationStanding(0);
      assert.strictEqual(neutral.level, 'Neutral');

      const hated = characters.getReputationStanding(-90);
      assert.strictEqual(hated.level, 'Hated');
    });
  });

  describe('NPC Generation', () => {
    it('should generate NPCs', () => {
      const npc = characters.generateNPC({
        faction: 'Test Faction',
        role: 'merchant'
      });

      assert.ok(npc.id);
      assert.ok(npc.name);
      assert.strictEqual(npc.faction, 'Test Faction');
      assert.strictEqual(npc.role, 'merchant');
    });

    it('should generate unique names', () => {
      const names = new Set();
      for (let i = 0; i < 50; i++) {
        const npc = characters.generateNPC({});
        names.add(npc.name);
      }
      // Most names should be unique
      assert.ok(names.size > 30);
    });
  });

  describe('State Management', () => {
    it('should serialize and restore state', () => {
      characters.generateNPC({ name: 'Test NPC 1' });
      characters.generateNPC({ name: 'Test NPC 2' });

      const state = characters.getState();

      const newCharacters = new CharacterSystem();
      newCharacters.entities = new EntityManager();
      newCharacters.loadState(state);

      assert.strictEqual(newCharacters.npcs.size, 2);
    });
  });
});
