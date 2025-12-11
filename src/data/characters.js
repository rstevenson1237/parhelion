/**
 * PARHELION - Character Data
 *
 * Backgrounds, professions, skills, and character templates
 */

export const ORIGINS = {
  coreworlder: {
    id: 'coreworlder',
    name: 'Core Worlder',
    description: 'Born on an established core world with access to education and technology.',
    bonuses: { intelligence: 2, charisma: 1 },
    startingCredits: 15000,
    skillBonuses: { diplomacy: 1, trade: 1 }
  },
  rimmer: {
    id: 'rimmer',
    name: 'Rim Colonist',
    description: 'Raised on the frontier, self-reliant and resourceful.',
    bonuses: { constitution: 2, wisdom: 1 },
    startingCredits: 8000,
    skillBonuses: { engineering: 1, piloting: 1 }
  },
  spacer: {
    id: 'spacer',
    name: 'Spacer',
    description: 'Born and raised in the black, space is your home.',
    bonuses: { dexterity: 2, constitution: 1 },
    startingCredits: 10000,
    skillBonuses: { piloting: 2, engineering: 1 }
  },
  station: {
    id: 'station',
    name: 'Station Born',
    description: 'Grew up on a space station, skilled in technical work.',
    bonuses: { intelligence: 2, dexterity: 1 },
    startingCredits: 12000,
    skillBonuses: { engineering: 2, hacking: 1 }
  },
  undercity: {
    id: 'undercity',
    name: 'Undercity',
    description: 'From the lower levels, street smart and cunning.',
    bonuses: { dexterity: 2, charisma: 1 },
    startingCredits: 5000,
    skillBonuses: { deception: 2, combat: 1 }
  }
};

export const PROFESSIONS = {
  merchant: {
    id: 'merchant',
    name: 'Merchant',
    description: 'A trader of goods across the stars.',
    primarySkills: ['trade', 'diplomacy'],
    startingEquipment: ['datapad', 'trade_manifest'],
    bonusCredits: 5000,
    skillBonuses: { trade: 2, diplomacy: 1, deception: 1 }
  },
  military: {
    id: 'military',
    name: 'Military',
    description: 'Trained in the art of war and command.',
    primarySkills: ['combat', 'tactics', 'leadership'],
    startingEquipment: ['sidearm', 'combat_armor'],
    bonusCredits: 2000,
    skillBonuses: { combat: 2, tactics: 2, leadership: 1 }
  },
  scientist: {
    id: 'scientist',
    name: 'Scientist',
    description: 'A seeker of knowledge and truth.',
    primarySkills: ['science', 'medicine', 'engineering'],
    startingEquipment: ['research_kit', 'medical_scanner'],
    bonusCredits: 3000,
    skillBonuses: { science: 2, medicine: 1, engineering: 1 }
  },
  diplomat: {
    id: 'diplomat',
    name: 'Diplomat',
    description: 'A negotiator and peacemaker.',
    primarySkills: ['diplomacy', 'leadership', 'deception'],
    startingEquipment: ['diplomatic_credentials', 'encryption_device'],
    bonusCredits: 4000,
    skillBonuses: { diplomacy: 2, leadership: 2, charisma: 1 }
  },
  pilot: {
    id: 'pilot',
    name: 'Pilot',
    description: 'Master of vessels great and small.',
    primarySkills: ['piloting', 'engineering', 'tactics'],
    startingEquipment: ['flight_suit', 'nav_computer'],
    bonusCredits: 3000,
    skillBonuses: { piloting: 3, engineering: 1, tactics: 1 }
  },
  operative: {
    id: 'operative',
    name: 'Operative',
    description: 'Works in shadows, skilled in covert operations.',
    primarySkills: ['deception', 'hacking', 'combat'],
    startingEquipment: ['stealth_suit', 'hacking_kit'],
    bonusCredits: 3500,
    skillBonuses: { deception: 2, hacking: 2, combat: 1 }
  }
};

export const SKILL_DEFINITIONS = {
  // Combat
  combat: { name: 'Combat', category: 'combat', description: 'Personal combat ability' },
  tactics: { name: 'Tactics', category: 'combat', description: 'Strategic and tactical thinking' },

  // Technical
  engineering: { name: 'Engineering', category: 'technical', description: 'Mechanical and system repair' },
  piloting: { name: 'Piloting', category: 'technical', description: 'Vehicle and ship operation' },
  hacking: { name: 'Hacking', category: 'technical', description: 'Computer intrusion and security' },

  // Social
  diplomacy: { name: 'Diplomacy', category: 'social', description: 'Negotiation and persuasion' },
  leadership: { name: 'Leadership', category: 'social', description: 'Command and inspiration' },
  deception: { name: 'Deception', category: 'social', description: 'Lying and manipulation' },

  // Knowledge
  science: { name: 'Science', category: 'knowledge', description: 'Scientific knowledge' },
  medicine: { name: 'Medicine', category: 'knowledge', description: 'Medical treatment' },
  trade: { name: 'Trade', category: 'knowledge', description: 'Commerce and economics' }
};

export const ITEM_TEMPLATES = {
  // Weapons
  sidearm: {
    id: 'sidearm',
    name: 'Standard Sidearm',
    type: 'weapon',
    slot: 'weapon',
    value: 500,
    stats: { damage: 10, accuracy: 70 }
  },
  rifle: {
    id: 'rifle',
    name: 'Combat Rifle',
    type: 'weapon',
    slot: 'weapon',
    value: 1500,
    stats: { damage: 25, accuracy: 80 }
  },

  // Armor
  combat_armor: {
    id: 'combat_armor',
    name: 'Combat Armor',
    type: 'armor',
    slot: 'armor',
    value: 2000,
    stats: { protection: 20, mobility: -5 }
  },
  flight_suit: {
    id: 'flight_suit',
    name: 'Flight Suit',
    type: 'armor',
    slot: 'armor',
    value: 1000,
    stats: { protection: 5, mobility: 0, vacuum: true }
  },
  stealth_suit: {
    id: 'stealth_suit',
    name: 'Stealth Suit',
    type: 'armor',
    slot: 'armor',
    value: 5000,
    stats: { protection: 5, stealth: 30 }
  },

  // Tools
  datapad: {
    id: 'datapad',
    name: 'Datapad',
    type: 'tool',
    slot: 'tool',
    value: 200,
    stats: {}
  },
  hacking_kit: {
    id: 'hacking_kit',
    name: 'Hacking Kit',
    type: 'tool',
    slot: 'tool',
    value: 1500,
    stats: { hacking_bonus: 10 }
  },
  research_kit: {
    id: 'research_kit',
    name: 'Research Kit',
    type: 'tool',
    slot: 'tool',
    value: 1200,
    stats: { science_bonus: 10 }
  },
  medical_scanner: {
    id: 'medical_scanner',
    name: 'Medical Scanner',
    type: 'tool',
    slot: 'tool',
    value: 800,
    stats: { medicine_bonus: 10 }
  },
  nav_computer: {
    id: 'nav_computer',
    name: 'Navigation Computer',
    type: 'tool',
    slot: 'tool',
    value: 1000,
    stats: { piloting_bonus: 5 }
  },
  trade_manifest: {
    id: 'trade_manifest',
    name: 'Trade Manifest System',
    type: 'tool',
    slot: 'tool',
    value: 600,
    stats: { trade_bonus: 10 }
  },
  diplomatic_credentials: {
    id: 'diplomatic_credentials',
    name: 'Diplomatic Credentials',
    type: 'tool',
    slot: 'tool',
    value: 0,
    stats: { diplomacy_bonus: 15 }
  },
  encryption_device: {
    id: 'encryption_device',
    name: 'Encryption Device',
    type: 'tool',
    slot: null,
    value: 2000,
    stats: {}
  }
};

export default {
  ORIGINS,
  PROFESSIONS,
  SKILL_DEFINITIONS,
  ITEM_TEMPLATES
};
