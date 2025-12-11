/**
 * NEXUS PROTOCOL - Personal View
 *
 * Character-level view showing player stats, inventory,
 * contacts, and immediate surroundings.
 */

import { Renderer, Colors } from './Renderer.js';

export class PersonalView {
  constructor(game, renderer) {
    this.game = game;
    this.renderer = renderer;
    this.options = {
      showInventory: true,
      showContacts: false,
      showSkills: false,
      activePanel: 'status'  // status, inventory, contacts, skills
    };
  }

  /**
   * Render the personal view
   */
  render(options = {}) {
    const opts = { ...this.options, ...options };
    const player = this.game.player;

    if (!player) {
      return this.renderNoCharacter();
    }

    const lines = [];

    // Header
    lines.push(this.renderHeader());
    lines.push('');

    // Character status
    lines.push(this.renderCharacterStatus());
    lines.push('');

    // Location info
    lines.push(this.renderLocation());
    lines.push('');

    // Active panel
    switch (opts.activePanel) {
      case 'inventory':
        lines.push(this.renderInventory());
        break;
      case 'contacts':
        lines.push(this.renderContacts());
        break;
      case 'skills':
        lines.push(this.renderSkills());
        break;
      default:
        lines.push(this.renderQuickInfo());
    }

    // Recent events/messages
    lines.push('');
    lines.push(this.renderRecentEvents());

    return lines.join('\n');
  }

  /**
   * Render when no character exists
   */
  renderNoCharacter() {
    return `
${this.renderer.themed('═══ PERSONAL VIEW ═══', 'highlight')}

${this.renderer.themed('No active character.', 'warning')}

Character system initializing...
`.trim();
  }

  /**
   * Render header
   */
  renderHeader() {
    const player = this.game.player;
    const tick = this.game.engine?.state.tick || 0;

    return `
${this.renderer.themed(`═══ ${player.name} ═══`, 'highlight')}
${this.renderer.themed(`${player.role} | ${player.faction}`, 'muted')}
`.trim();
  }

  /**
   * Render character status bars
   */
  renderCharacterStatus() {
    const attributes = this.game.entities.getComponent(
      this.game.playerEntityId, 'Attributes'
    );
    const stats = this.game.entities.getComponent(
      this.game.playerEntityId, 'Stats'
    );

    const lines = [this.renderer.themed('STATUS', 'secondary')];

    if (stats) {
      lines.push(this.renderer.progressBar(stats.health, stats.maxHealth || 100, 25, 'Health', this.getHealthColor(stats.health)));
      lines.push(this.renderer.progressBar(stats.morale, 100, 25, 'Morale', this.getMoraleColor(stats.morale)));
      lines.push(this.renderer.progressBar(stats.energy, 100, 25, 'Energy', Colors.cyan));
    }

    if (attributes) {
      lines.push('');
      lines.push(this.renderer.themed('ATTRIBUTES', 'secondary'));
      const attrLine1 = `STR: ${attributes.strength}  DEX: ${attributes.dexterity}  CON: ${attributes.constitution}`;
      const attrLine2 = `INT: ${attributes.intelligence}  WIS: ${attributes.wisdom}  CHA: ${attributes.charisma}`;
      lines.push(`  ${attrLine1}`);
      lines.push(`  ${attrLine2}`);
    }

    return lines.join('\n');
  }

  /**
   * Get color for health bar
   */
  getHealthColor(health) {
    if (health > 70) return Colors.green;
    if (health > 30) return Colors.yellow;
    return Colors.red;
  }

  /**
   * Get color for morale bar
   */
  getMoraleColor(morale) {
    if (morale > 70) return Colors.green;
    if (morale > 30) return Colors.yellow;
    return Colors.red;
  }

  /**
   * Render current location
   */
  renderLocation() {
    const player = this.game.player;
    const universe = this.game.engine.getSystem('universe');
    const factions = this.game.engine.getSystem('factions');

    const location = this.game.entities.getComponent(
      this.game.playerEntityId,
      'PlayerLocation'
    );

    const lines = [this.renderer.themed('LOCATION', 'secondary')];

    if (location?.systemId) {
      const star = universe.getStar(location.systemId);
      const owner = factions?.getFactionBySystem(location.systemId);

      lines.push(`  System: ${star?.Identity.name || 'Unknown'}`);
      lines.push(`  Territory: ${owner?.name || 'Unclaimed'}`);

      if (location.planetId) {
        const planet = this.game.entities.getComponent(location.planetId, 'Identity');
        lines.push(`  Planet: ${planet?.name || 'Unknown'}`);
      }

      if (location.stationId) {
        const station = this.game.entities.getComponent(location.stationId, 'Identity');
        lines.push(`  Station: ${station?.name || 'Unknown'}`);
      }
    } else {
      lines.push(`  ${player.location || 'Unknown'}`);
    }

    return lines.join('\n');
  }

  /**
   * Render quick info panel
   */
  renderQuickInfo() {
    const player = this.game.player;
    const inventory = player.inventory || { credits: 0, items: [] };

    const lines = [this.renderer.themed('QUICK INFO', 'secondary')];

    lines.push(`  Credits: ${inventory.credits.toLocaleString()} cr`);
    lines.push(`  Items: ${inventory.items?.length || 0}`);
    lines.push(`  Contacts: ${player.contacts?.length || 0}`);
    lines.push('');
    lines.push(this.renderer.themed('  [I]nventory  [C]ontacts  [S]kills', 'muted'));

    return lines.join('\n');
  }

  /**
   * Render inventory
   */
  renderInventory() {
    const inventory = this.game.entities.getComponent(
      this.game.playerEntityId, 'Inventory'
    );
    const equipment = this.game.entities.getComponent(
      this.game.playerEntityId, 'Equipment'
    );

    const lines = [this.renderer.themed('INVENTORY', 'secondary')];

    if (!inventory) {
      lines.push(this.renderer.themed('  No inventory data', 'muted'));
      return lines.join('\n');
    }

    lines.push(`  Credits: ${inventory.credits.toLocaleString()} cr`);
    lines.push(`  Capacity: ${inventory.items.length}/${inventory.capacity}`);
    lines.push('');

    // Equipment
    lines.push(this.renderer.themed('  EQUIPPED:', 'muted'));
    for (const slot of ['weapon', 'armor', 'tool', 'implant']) {
      const itemId = equipment?.[slot];
      const item = itemId ? inventory.items.find(i => i.id === itemId) : null;
      lines.push(`    ${slot}: ${item?.name || '[empty]'}`);
    }

    // Items
    lines.push('');
    lines.push(this.renderer.themed('  ITEMS:', 'muted'));
    const unequipped = inventory.items.filter(i =>
      !Object.values(equipment || {}).includes(i.id)
    );

    if (unequipped.length === 0) {
      lines.push('    No unequipped items');
    } else {
      for (const item of unequipped.slice(0, 8)) {
        lines.push(`    • ${item.name}`);
      }
      if (unequipped.length > 8) {
        lines.push(`    ... and ${unequipped.length - 8} more`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Render contacts list
   */
  renderContacts() {
    const contacts = this.game.entities.getComponent(
      this.game.playerEntityId, 'Contacts'
    );

    const lines = [this.renderer.themed('CONTACTS', 'secondary')];

    if (!contacts || contacts.contacts.length === 0) {
      lines.push(this.renderer.themed('  No contacts yet.', 'muted'));
    } else {
      for (const contact of contacts.contacts.slice(0, 10)) {
        const relation = contact.relation > 0 ? '+' : '';
        lines.push(`  ${contact.name} [${relation}${contact.relation}]`);
        lines.push(this.renderer.themed(`    ${contact.type} - ${contact.faction || 'Independent'}`, 'muted'));
      }
      if (contacts.contacts.length > 10) {
        lines.push(`  ... and ${contacts.contacts.length - 10} more`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Render skills
   */
  renderSkills() {
    const skills = this.game.entities.getComponent(
      this.game.playerEntityId, 'Skills'
    );

    const lines = [this.renderer.themed('SKILLS', 'secondary')];

    if (!skills) {
      lines.push(this.renderer.themed('  No skills data', 'muted'));
      return lines.join('\n');
    }

    const sortedSkills = Object.entries(skills)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [skill, value] of sortedSkills) {
      const bar = this.renderer.progressBar(value, 100, 15, null);
      lines.push(`  ${skill.padEnd(12)} ${bar} ${value}`);
    }

    return lines.join('\n');
  }

  /**
   * Render recent events affecting player
   */
  renderRecentEvents() {
    const eventSystem = this.game.engine.getSystem('events');
    const recent = eventSystem?.getEventHistory(3) || [];

    const lines = [this.renderer.themed('RECENT EVENTS', 'secondary')];

    if (recent.length === 0) {
      lines.push(this.renderer.themed('  Nothing of note recently.', 'muted'));
    } else {
      for (const event of recent) {
        lines.push(`  • ${event.name}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Handle view-specific commands
   */
  handleCommand(command, args) {
    switch (command) {
      case 'inventory':
      case 'i':
        this.options.activePanel = 'inventory';
        return { refresh: true };

      case 'contacts':
      case 'c':
        this.options.activePanel = 'contacts';
        return { refresh: true };

      case 'skills':
      case 's':
        this.options.activePanel = 'skills';
        return { refresh: true };

      case 'status':
        this.options.activePanel = 'status';
        return { refresh: true };

      default:
        return null;
    }
  }

  /**
   * Get context-sensitive help
   */
  getHelp() {
    return `
PERSONAL VIEW COMMANDS:
  inventory (i)     - View inventory
  contacts (c)      - View contacts
  skills (s)        - View skills
  status            - Return to status view

  comms read        - Read messages
  comms send <to>   - Send message

  switch tactical   - View current system
  switch strategic  - View galaxy map
`.trim();
  }
}

export default PersonalView;
