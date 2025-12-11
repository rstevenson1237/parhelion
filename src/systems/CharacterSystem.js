/**
 * PARHELION - Character System
 *
 * Manages character creation, skills, inventory, contacts, and reputation.
 */

import { Components } from '../core/ECS.js';
import { ORIGINS, PROFESSIONS, SKILL_DEFINITIONS, ITEM_TEMPLATES } from '../data/characters.js';
import { v4 as uuidv4 } from 'uuid';

export class CharacterSystem {
  constructor() {
    this.entities = null;
    this.engine = null;
    this.events = null;
    this.rng = null;
    this.npcs = new Map();  // npcId -> NPC data
  }

  initialize(engine) {
    this.engine = engine;
    this.entities = engine.getSystem('entities')?.entities || engine.entities;
    this.events = engine.events;
  }

  setRNG(rng) {
    this.rng = rng;
  }

  update(tickData) {
    // Process skill improvements, reputation decay, etc.
    if (tickData.tick % 100 === 0) {
      this.processReputationDecay(tickData);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CHARACTER CREATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Create a new character with full customization
   */
  createCharacter(options = {}) {
    const {
      name = 'Commander',
      origin = 'coreworlder',
      profession = 'merchant',
      history = '',
      faction = 'Independent'
    } = options;

    const originData = ORIGINS[origin] || ORIGINS.coreworlder;
    const professionData = PROFESSIONS[profession] || PROFESSIONS.merchant;

    // Create entity
    const entityId = this.entities.create(`character_${uuidv4()}`);

    // Identity
    this.entities.addComponent(entityId, 'Identity',
      Components.Identity(name, 'character', `${professionData.name} from ${originData.name} background`)
    );

    // Background
    this.entities.addComponent(entityId, 'Background',
      Components.Background(origin, profession, history)
    );

    // Attributes (base 10 + origin bonuses)
    const baseAttrs = {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    };

    // Apply origin bonuses
    for (const [attr, bonus] of Object.entries(originData.bonuses || {})) {
      if (baseAttrs[attr] !== undefined) {
        baseAttrs[attr] += bonus;
      }
    }

    this.entities.addComponent(entityId, 'Attributes',
      Components.Attributes(baseAttrs)
    );

    // Skills (base 0 + origin + profession bonuses)
    const skills = {};
    for (const skill of Object.keys(SKILL_DEFINITIONS)) {
      skills[skill] = 0;
    }

    // Apply origin skill bonuses
    for (const [skill, bonus] of Object.entries(originData.skillBonuses || {})) {
      if (skills[skill] !== undefined) {
        skills[skill] += bonus;
      }
    }

    // Apply profession skill bonuses
    for (const [skill, bonus] of Object.entries(professionData.skillBonuses || {})) {
      if (skills[skill] !== undefined) {
        skills[skill] += bonus;
      }
    }

    this.entities.addComponent(entityId, 'Skills',
      Components.Skills(skills)
    );

    // Stats (health, morale, energy)
    const constitution = baseAttrs.constitution;
    const maxHealth = 80 + constitution * 2;
    this.entities.addComponent(entityId, 'Stats',
      Components.Stats(
        maxHealth,      // health based on constitution
        100,            // morale
        100,            // energy
        maxHealth       // maxHealth
      )
    );

    // Inventory with starting credits
    const startingCredits = originData.startingCredits + (professionData.bonusCredits || 0);
    const startingItems = this.getStartingItems(professionData.startingEquipment || []);

    this.entities.addComponent(entityId, 'Inventory',
      Components.Inventory(startingItems, startingCredits, 100)
    );

    // Equipment
    this.entities.addComponent(entityId, 'Equipment',
      Components.Equipment({})
    );

    // Contacts (empty initially)
    this.entities.addComponent(entityId, 'Contacts',
      Components.Contacts([])
    );

    // Reputation (neutral with all factions)
    this.entities.addComponent(entityId, 'Reputation',
      Components.Reputation({})
    );

    // Character component for role
    this.entities.addComponent(entityId, 'Character',
      Components.Character(profession, skills, [], history)
    );

    this.events?.emit('character:created', {
      id: entityId,
      name,
      origin,
      profession
    });

    return {
      id: entityId,
      name,
      origin: originData,
      profession: professionData,
      attributes: baseAttrs,
      skills,
      credits: startingCredits
    };
  }

  /**
   * Get starting items from templates
   */
  getStartingItems(itemIds) {
    return itemIds.map(id => {
      const template = ITEM_TEMPLATES[id];
      if (template) {
        return {
          id: `item_${uuidv4()}`,
          templateId: id,
          ...template
        };
      }
      return null;
    }).filter(Boolean);
  }

  /**
   * Get available origins for character creation
   */
  getOrigins() {
    return Object.values(ORIGINS);
  }

  /**
   * Get available professions for character creation
   */
  getProfessions() {
    return Object.values(PROFESSIONS);
  }

  // ═══════════════════════════════════════════════════════════
  // SKILL SYSTEM
  // ═══════════════════════════════════════════════════════════

  /**
   * Get character's effective skill level (includes equipment bonuses)
   */
  getEffectiveSkill(characterId, skillName) {
    const skills = this.entities.getComponent(characterId, 'Skills');
    const equipment = this.entities.getComponent(characterId, 'Equipment');
    const inventory = this.entities.getComponent(characterId, 'Inventory');

    if (!skills) return 0;

    let baseSkill = skills[skillName] || 0;

    // Check equipped items for bonuses
    if (equipment) {
      for (const slot of ['weapon', 'armor', 'tool', 'implant']) {
        const itemId = equipment[slot];
        if (itemId) {
          const item = inventory?.items.find(i => i.id === itemId);
          if (item?.stats) {
            const bonusKey = `${skillName}_bonus`;
            if (item.stats[bonusKey]) {
              baseSkill += item.stats[bonusKey];
            }
          }
        }
      }
    }

    return baseSkill;
  }

  /**
   * Improve a skill through use
   */
  improveSkill(characterId, skillName, amount = 1) {
    const skills = this.entities.getComponent(characterId, 'Skills');
    if (!skills || skills[skillName] === undefined) return false;

    const oldValue = skills[skillName];
    skills[skillName] = Math.min(100, skills[skillName] + amount);

    if (skills[skillName] !== oldValue) {
      this.events?.emit('skill:improved', {
        characterId,
        skill: skillName,
        oldValue,
        newValue: skills[skillName]
      });
    }

    return true;
  }

  /**
   * Perform a skill check
   */
  skillCheck(characterId, skillName, difficulty = 50) {
    const effectiveSkill = this.getEffectiveSkill(characterId, skillName);
    const roll = Math.floor(this.rng() * 100);
    const success = roll < effectiveSkill + (50 - difficulty);

    // Small chance of skill improvement on use
    if (this.rng() < 0.1) {
      this.improveSkill(characterId, skillName, 0.1);
    }

    return {
      success,
      roll,
      effectiveSkill,
      difficulty,
      margin: effectiveSkill + (50 - difficulty) - roll
    };
  }

  // ═══════════════════════════════════════════════════════════
  // INVENTORY SYSTEM
  // ═══════════════════════════════════════════════════════════

  /**
   * Add item to character inventory
   */
  addItem(characterId, item) {
    const inventory = this.entities.getComponent(characterId, 'Inventory');
    if (!inventory) return { success: false, reason: 'No inventory' };

    if (inventory.items.length >= inventory.capacity) {
      return { success: false, reason: 'Inventory full' };
    }

    const itemWithId = {
      id: `item_${uuidv4()}`,
      ...item
    };

    inventory.items.push(itemWithId);

    this.events?.emit('inventory:added', { characterId, item: itemWithId });

    return { success: true, item: itemWithId };
  }

  /**
   * Remove item from inventory
   */
  removeItem(characterId, itemId) {
    const inventory = this.entities.getComponent(characterId, 'Inventory');
    if (!inventory) return { success: false, reason: 'No inventory' };

    const index = inventory.items.findIndex(i => i.id === itemId);
    if (index === -1) return { success: false, reason: 'Item not found' };

    // Unequip if equipped
    const equipment = this.entities.getComponent(characterId, 'Equipment');
    if (equipment) {
      for (const slot of Object.keys(equipment)) {
        if (equipment[slot] === itemId) {
          equipment[slot] = null;
        }
      }
    }

    const [removed] = inventory.items.splice(index, 1);

    this.events?.emit('inventory:removed', { characterId, item: removed });

    return { success: true, item: removed };
  }

  /**
   * Equip an item
   */
  equipItem(characterId, itemId) {
    const inventory = this.entities.getComponent(characterId, 'Inventory');
    const equipment = this.entities.getComponent(characterId, 'Equipment');

    if (!inventory || !equipment) {
      return { success: false, reason: 'Missing components' };
    }

    const item = inventory.items.find(i => i.id === itemId);
    if (!item) return { success: false, reason: 'Item not in inventory' };
    if (!item.slot) return { success: false, reason: 'Item not equippable' };

    // Unequip current item in slot
    const currentEquipped = equipment[item.slot];
    equipment[item.slot] = itemId;

    this.events?.emit('equipment:changed', {
      characterId,
      slot: item.slot,
      equipped: itemId,
      unequipped: currentEquipped
    });

    return { success: true, slot: item.slot, previousItem: currentEquipped };
  }

  /**
   * Unequip an item
   */
  unequipItem(characterId, slot) {
    const equipment = this.entities.getComponent(characterId, 'Equipment');
    if (!equipment) return { success: false, reason: 'No equipment' };

    const itemId = equipment[slot];
    if (!itemId) return { success: false, reason: 'Slot empty' };

    equipment[slot] = null;

    this.events?.emit('equipment:changed', {
      characterId,
      slot,
      equipped: null,
      unequipped: itemId
    });

    return { success: true, item: itemId };
  }

  /**
   * Modify credits
   */
  modifyCredits(characterId, amount) {
    const inventory = this.entities.getComponent(characterId, 'Inventory');
    if (!inventory) return { success: false, reason: 'No inventory' };

    const newAmount = inventory.credits + amount;
    if (newAmount < 0) return { success: false, reason: 'Insufficient credits' };

    inventory.credits = newAmount;

    this.events?.emit('credits:changed', {
      characterId,
      delta: amount,
      total: newAmount
    });

    return { success: true, credits: newAmount };
  }

  // ═══════════════════════════════════════════════════════════
  // CONTACTS SYSTEM
  // ═══════════════════════════════════════════════════════════

  /**
   * Add a contact
   */
  addContact(characterId, contact) {
    const contacts = this.entities.getComponent(characterId, 'Contacts');
    if (!contacts) return { success: false, reason: 'No contacts component' };

    // Check if contact already exists
    if (contacts.contacts.find(c => c.id === contact.id)) {
      return { success: false, reason: 'Contact already exists' };
    }

    const contactData = {
      id: contact.id,
      name: contact.name,
      faction: contact.faction || null,
      relation: contact.relation || 0,  // -100 to 100
      type: contact.type || 'acquaintance',  // acquaintance, friend, rival, enemy, ally
      metAt: this.engine?.state.tick || 0,
      lastContact: this.engine?.state.tick || 0
    };

    contacts.contacts.push(contactData);

    this.events?.emit('contact:added', { characterId, contact: contactData });

    return { success: true, contact: contactData };
  }

  /**
   * Modify contact relationship
   */
  modifyContactRelation(characterId, contactId, delta, reason = '') {
    const contacts = this.entities.getComponent(characterId, 'Contacts');
    if (!contacts) return { success: false, reason: 'No contacts' };

    const contact = contacts.contacts.find(c => c.id === contactId);
    if (!contact) return { success: false, reason: 'Contact not found' };

    const oldRelation = contact.relation;
    contact.relation = Math.max(-100, Math.min(100, contact.relation + delta));
    contact.lastContact = this.engine?.state.tick || 0;

    // Update type based on relation
    if (contact.relation >= 50) contact.type = 'ally';
    else if (contact.relation >= 25) contact.type = 'friend';
    else if (contact.relation >= -25) contact.type = 'acquaintance';
    else if (contact.relation >= -50) contact.type = 'rival';
    else contact.type = 'enemy';

    this.events?.emit('contact:relation:changed', {
      characterId,
      contactId,
      oldRelation,
      newRelation: contact.relation,
      reason
    });

    return { success: true, contact };
  }

  /**
   * Get contacts by type
   */
  getContactsByType(characterId, type) {
    const contacts = this.entities.getComponent(characterId, 'Contacts');
    if (!contacts) return [];
    return contacts.contacts.filter(c => c.type === type);
  }

  // ═══════════════════════════════════════════════════════════
  // REPUTATION SYSTEM
  // ═══════════════════════════════════════════════════════════

  /**
   * Get reputation with a faction
   */
  getReputation(characterId, factionId) {
    const reputation = this.entities.getComponent(characterId, 'Reputation');
    if (!reputation) return 0;
    return reputation.standings[factionId] || 0;
  }

  /**
   * Modify reputation with a faction
   */
  modifyReputation(characterId, factionId, delta, reason = '') {
    const reputation = this.entities.getComponent(characterId, 'Reputation');
    if (!reputation) return { success: false, reason: 'No reputation component' };

    const oldValue = reputation.standings[factionId] || 0;
    const newValue = Math.max(-100, Math.min(100, oldValue + delta));
    reputation.standings[factionId] = newValue;

    this.events?.emit('reputation:changed', {
      characterId,
      factionId,
      oldValue,
      newValue,
      delta,
      reason
    });

    return { success: true, oldValue, newValue };
  }

  /**
   * Get reputation standing description
   */
  getReputationStanding(value) {
    if (value >= 80) return { level: 'Exalted', color: 'green' };
    if (value >= 50) return { level: 'Honored', color: 'green' };
    if (value >= 20) return { level: 'Friendly', color: 'cyan' };
    if (value >= -20) return { level: 'Neutral', color: 'white' };
    if (value >= -50) return { level: 'Unfriendly', color: 'yellow' };
    if (value >= -80) return { level: 'Hostile', color: 'red' };
    return { level: 'Hated', color: 'red' };
  }

  /**
   * Process reputation decay over time
   */
  processReputationDecay(tickData) {
    for (const [id, components] of this.entities.query('Reputation')) {
      const reputation = components.Reputation;

      for (const [factionId, value] of Object.entries(reputation.standings)) {
        // Slowly decay toward neutral
        if (Math.abs(value) > 5) {
          const decay = value > 0 ? -0.1 : 0.1;
          reputation.standings[factionId] = value + decay;
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // NPC GENERATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Generate an NPC
   */
  generateNPC(options = {}) {
    const {
      name,
      faction = null,
      role = 'merchant',
      location = null
    } = options;

    // Generate random name if not provided
    const npcName = name || this.generateName();

    // Random origin and profession
    const origins = Object.keys(ORIGINS);
    const professions = Object.keys(PROFESSIONS);
    const origin = origins[Math.floor(this.rng() * origins.length)];
    const profession = professions[Math.floor(this.rng() * professions.length)];

    const character = this.createCharacter({
      name: npcName,
      origin,
      profession,
      faction
    });

    // Mark as NPC
    this.entities.addComponent(character.id, 'Tags',
      Components.Tags(['npc', role])
    );

    if (location) {
      this.entities.addComponent(character.id, 'PlayerLocation',
        Components.PlayerLocation(location, null, null)
      );
    }

    const npcData = {
      id: character.id,
      name: npcName,
      faction,
      role,
      origin,
      profession,
      location
    };

    this.npcs.set(character.id, npcData);

    this.events?.emit('npc:generated', npcData);

    return npcData;
  }

  /**
   * Generate a random name
   */
  generateName() {
    const firstNames = [
      'Marcus', 'Lena', 'Viktor', 'Aria', 'Chen', 'Yuki', 'Dmitri', 'Sofia',
      'Raj', 'Freya', 'Omar', 'Zara', 'Kane', 'Luna', 'Axel', 'Nova'
    ];
    const lastNames = [
      'Ashford', 'Chen', 'Volkov', 'Santos', 'Nakamura', 'Singh', 'Mueller',
      'Romano', 'Park', 'Andersen', 'Hassan', 'Reyes', 'Kowalski', 'Okafor'
    ];

    const first = firstNames[Math.floor(this.rng() * firstNames.length)];
    const last = lastNames[Math.floor(this.rng() * lastNames.length)];

    return `${first} ${last}`;
  }

  // ═══════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  getState() {
    return {
      npcs: Array.from(this.npcs.entries())
    };
  }

  loadState(state) {
    if (state.npcs) {
      this.npcs = new Map(state.npcs);
    }
  }
}

export default CharacterSystem;
