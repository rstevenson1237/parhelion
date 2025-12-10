/**
 * NEXUS PROTOCOL - Command Parser
 *
 * Interprets player commands and translates them into game actions.
 * Supports aliases, shortcuts, context-aware completion, and command history.
 */

/**
 * Input validation utilities
 */
export const Validators = {
  required: (value, name) => {
    if (value === undefined || value === null || value === '') {
      throw new Error(`${name} is required`);
    }
    return value;
  },

  string: (value, name, opts = {}) => {
    if (typeof value !== 'string') {
      throw new Error(`${name} must be a string`);
    }
    if (opts.minLength && value.length < opts.minLength) {
      throw new Error(`${name} must be at least ${opts.minLength} characters`);
    }
    if (opts.maxLength && value.length > opts.maxLength) {
      throw new Error(`${name} must be at most ${opts.maxLength} characters`);
    }
    return value;
  },

  integer: (value, name, opts = {}) => {
    const num = parseInt(value);
    if (isNaN(num)) {
      throw new Error(`${name} must be a number`);
    }
    if (opts.min !== undefined && num < opts.min) {
      throw new Error(`${name} must be at least ${opts.min}`);
    }
    if (opts.max !== undefined && num > opts.max) {
      throw new Error(`${name} must be at most ${opts.max}`);
    }
    return num;
  }
};

export class CommandParser {
  constructor() {
    this.commands = new Map();
    this.aliases = new Map();
    this.history = [];
    this.historyIndex = -1;
    this.context = {};
    this.maxHistory = 100;
  }

  /**
   * Register a command
   * @param {string} name - Command name
   * @param {object} definition - Command definition
   */
  register(name, definition) {
    const cmd = {
      name,
      description: definition.description || '',
      usage: definition.usage || name,
      aliases: definition.aliases || [],
      args: definition.args || [],
      handler: definition.handler,
      validate: definition.validate || (() => true),
      autocomplete: definition.autocomplete || null,
      category: definition.category || 'general',
      requiresContext: definition.requiresContext || []
    };

    this.commands.set(name.toLowerCase(), cmd);

    // Register aliases
    for (const alias of cmd.aliases) {
      this.aliases.set(alias.toLowerCase(), name.toLowerCase());
    }

    return this;
  }

  /**
   * Parse and execute a command string
   * @param {string} input - Raw command input
   * @param {object} context - Current game context
   * @returns {object} Result of command execution
   */
  async execute(input, context = {}) {
    const trimmed = input.trim();
    
    if (!trimmed) {
      return { success: false, error: 'Empty command' };
    }

    // Add to history
    this.addToHistory(trimmed);

    // Parse the command
    const parsed = this.parse(trimmed);
    
    if (!parsed) {
      return { 
        success: false, 
        error: `Unknown command: "${trimmed.split(' ')[0]}"`,
        suggestions: this.getSuggestions(trimmed.split(' ')[0])
      };
    }

    // Validate context requirements
    for (const req of parsed.command.requiresContext) {
      if (!context[req]) {
        return {
          success: false,
          error: `This command requires ${req} context`
        };
      }
    }

    // Validate arguments
    const validation = parsed.command.validate(parsed.args, context);
    if (validation !== true) {
      return {
        success: false,
        error: validation || 'Invalid arguments',
        usage: parsed.command.usage
      };
    }

    // Execute the command
    try {
      const result = await parsed.command.handler(parsed.args, context);
      return {
        success: true,
        command: parsed.command.name,
        result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        command: parsed.command.name
      };
    }
  }

  /**
   * Parse a command string into command and arguments
   */
  parse(input) {
    const tokens = this.tokenize(input);
    
    if (tokens.length === 0) return null;

    const cmdName = tokens[0].toLowerCase();
    const resolvedName = this.aliases.get(cmdName) || cmdName;
    const command = this.commands.get(resolvedName);

    if (!command) return null;

    // Parse arguments based on command definition
    const args = this.parseArgs(tokens.slice(1), command.args);

    return { command, args, raw: input };
  }

  /**
   * Tokenize input, respecting quotes
   */
  tokenize(input) {
    const tokens = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Parse arguments according to command definition
   */
  parseArgs(tokens, argDefs) {
    const args = {
      _positional: [],
      _raw: tokens
    };

    let tokenIndex = 0;
    let argIndex = 0;

    while (tokenIndex < tokens.length) {
      const token = tokens[tokenIndex];

      // Check for named argument (--name or -n)
      if (token.startsWith('--')) {
        const name = token.slice(2);
        const value = tokens[tokenIndex + 1];
        args[name] = value !== undefined && !value.startsWith('-') ? value : true;
        if (value && !value.startsWith('-')) tokenIndex++;
      } else if (token.startsWith('-') && token.length === 2) {
        const flag = token.slice(1);
        // Find full name from argDefs
        const argDef = argDefs.find(a => a.short === flag);
        const name = argDef ? argDef.name : flag;
        const value = tokens[tokenIndex + 1];
        args[name] = value !== undefined && !value.startsWith('-') ? value : true;
        if (value && !value.startsWith('-')) tokenIndex++;
      } else {
        // Positional argument
        if (argIndex < argDefs.length) {
          args[argDefs[argIndex].name] = token;
        }
        args._positional.push(token);
        argIndex++;
      }

      tokenIndex++;
    }

    // Apply defaults
    for (const def of argDefs) {
      if (args[def.name] === undefined && def.default !== undefined) {
        args[def.name] = def.default;
      }
    }

    return args;
  }

  /**
   * Get command suggestions for partial input
   */
  getSuggestions(partial) {
    const lower = partial.toLowerCase();
    const suggestions = [];

    for (const [name, cmd] of this.commands) {
      if (name.startsWith(lower)) {
        suggestions.push({ name, description: cmd.description });
      }
    }

    for (const [alias, cmdName] of this.aliases) {
      if (alias.startsWith(lower)) {
        const cmd = this.commands.get(cmdName);
        suggestions.push({ 
          name: alias, 
          description: `Alias for ${cmdName}`,
          aliasFor: cmdName
        });
      }
    }

    return suggestions.slice(0, 10);
  }

  /**
   * Get autocomplete options for current input
   */
  autocomplete(input, context = {}) {
    const tokens = this.tokenize(input);
    
    if (tokens.length <= 1) {
      return this.getSuggestions(tokens[0] || '');
    }

    const cmdName = tokens[0].toLowerCase();
    const resolvedName = this.aliases.get(cmdName) || cmdName;
    const command = this.commands.get(resolvedName);

    if (!command || !command.autocomplete) {
      return [];
    }

    return command.autocomplete(tokens.slice(1), context);
  }

  /**
   * Add command to history
   */
  addToHistory(input) {
    // Don't add duplicates consecutively
    if (this.history[this.history.length - 1] !== input) {
      this.history.push(input);
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
    }
    this.historyIndex = this.history.length;
  }

  /**
   * Navigate history
   */
  historyPrev() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      return this.history[this.historyIndex];
    }
    return null;
  }

  historyNext() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      return this.history[this.historyIndex];
    }
    this.historyIndex = this.history.length;
    return '';
  }

  /**
   * Get help for a command or all commands
   */
  help(commandName = null) {
    if (commandName) {
      const resolved = this.aliases.get(commandName.toLowerCase()) || commandName.toLowerCase();
      const cmd = this.commands.get(resolved);
      
      if (!cmd) return null;

      return {
        name: cmd.name,
        description: cmd.description,
        usage: cmd.usage,
        aliases: cmd.aliases,
        args: cmd.args,
        category: cmd.category
      };
    }

    // Return all commands grouped by category
    const categories = {};
    
    for (const [name, cmd] of this.commands) {
      if (!categories[cmd.category]) {
        categories[cmd.category] = [];
      }
      categories[cmd.category].push({
        name: cmd.name,
        description: cmd.description,
        aliases: cmd.aliases
      });
    }

    return categories;
  }

  /**
   * Get all registered commands
   */
  getCommands() {
    return Array.from(this.commands.values());
  }
}

/**
 * Standard command definitions for NEXUS PROTOCOL
 */
export function registerStandardCommands(parser, game) {
  // Navigation commands
  parser.register('view', {
    description: 'View detailed information about a target',
    usage: 'view <target> [--detail]',
    aliases: ['v', 'look', 'examine', 'inspect'],
    category: 'navigation',
    args: [
      { name: 'target', required: true, description: 'What to view' }
    ],
    handler: async (args, ctx) => {
      try {
        const target = Validators.required(args.target, 'target');
        Validators.string(target, 'target', { minLength: 1, maxLength: 100 });
        return game.view(target, args.detail, ctx);
      } catch (error) {
        return { message: error.message, type: 'error' };
      }
    },
    autocomplete: (tokens, ctx) => {
      return game.getViewTargets(tokens[0] || '', ctx);
    }
  });

  parser.register('goto', {
    description: 'Navigate to a location or system',
    usage: 'goto <destination>',
    aliases: ['go', 'travel', 'jump'],
    category: 'navigation',
    args: [
      { name: 'destination', required: true }
    ],
    handler: async (args, ctx) => {
      try {
        const destination = Validators.required(args.destination, 'destination');
        Validators.string(destination, 'destination', { minLength: 1, maxLength: 100 });
        return game.goto(destination, ctx);
      } catch (error) {
        return { message: error.message, type: 'error' };
      }
    }
  });

  parser.register('map', {
    description: 'Display the galaxy/system map',
    usage: 'map [--local] [--filter <type>]',
    aliases: ['m'],
    category: 'navigation',
    handler: async (args, ctx) => {
      return game.getMap(args.local, args.filter, ctx);
    }
  });

  parser.register('connections', {
    description: 'Show available jump routes from current location',
    usage: 'connections',
    aliases: ['routes', 'jumps'],
    category: 'navigation',
    handler: async (args, ctx) => {
      const location = game.entities.getComponent(game.playerEntityId, 'PlayerLocation');

      if (!location) {
        return { message: 'Location unknown.', type: 'error' };
      }

      const universe = game.engine.getSystem('universe');
      const connections = universe.getConnectedSystems(location.systemId);
      const currentStar = universe.getStar(location.systemId);

      if (connections.length === 0) {
        return { message: 'No jump routes available from this system.', type: 'warning' };
      }

      let output = `Jump routes from ${currentStar?.Identity?.name || 'current system'}:\n\n`;

      for (const conn of connections) {
        const star = universe.getStar(conn.id);
        output += `  → ${star?.Identity?.name || 'Unknown'} (${conn.distance.toFixed(1)} LY)\n`;
      }

      return { render: output };
    }
  });

  parser.register('local', {
    description: 'View details of current star system',
    usage: 'local',
    aliases: ['system', 'here'],
    category: 'navigation',
    handler: async (args, ctx) => {
      const location = game.entities.getComponent(game.playerEntityId, 'PlayerLocation');

      if (!location) {
        return { message: 'Location unknown.', type: 'error' };
      }

      // Reuse view command logic for current system
      const universe = game.engine.getSystem('universe');
      const star = universe.getStar(location.systemId);

      if (!star) {
        return { message: 'System data unavailable.', type: 'error' };
      }

      return await game.view(star.Identity.name, true, ctx);
    }
  });

  // Interface switching
  parser.register('switch', {
    description: 'Switch between interface views',
    usage: 'switch <strategic|tactical|personal>',
    aliases: ['sw', 'interface'],
    category: 'interface',
    args: [
      { name: 'view', required: true }
    ],
    validate: (args) => {
      const valid = ['strategic', 'tactical', 'personal', 's', 't', 'p'];
      if (!valid.includes(args.view?.toLowerCase())) {
        return 'Valid views: strategic, tactical, personal';
      }
      return true;
    },
    handler: async (args, ctx) => {
      return game.switchInterface(args.view, ctx);
    }
  });

  // Order commands
  parser.register('order', {
    description: 'Issue an order to a unit or faction element',
    usage: 'order <unit> "<command>"',
    aliases: ['o', 'command'],
    category: 'orders',
    args: [
      { name: 'unit', required: true },
      { name: 'command', required: true }
    ],
    handler: async (args, ctx) => {
      return game.issueOrder(args.unit, args.command, ctx);
    }
  });

  parser.register('orders', {
    description: 'View pending orders',
    usage: 'orders [--unit <name>] [--status <pending|complete|failed>]',
    category: 'orders',
    handler: async (args, ctx) => {
      return game.getOrders(args.unit, args.status, ctx);
    }
  });

  // Communication commands
  parser.register('comms', {
    description: 'Communication system',
    usage: 'comms <read|send|list> [target] [message]',
    aliases: ['c', 'comm', 'message'],
    category: 'communication',
    args: [
      { name: 'action', required: true },
      { name: 'target', required: false },
      { name: 'message', required: false }
    ],
    handler: async (args, ctx) => {
      return game.comms(args.action, args.target, args.message, ctx);
    }
  });

  // Intelligence commands
  parser.register('intel', {
    description: 'Request intelligence report on a target',
    usage: 'intel <target> [--detailed]',
    aliases: ['i', 'recon', 'scan'],
    category: 'intelligence',
    args: [
      { name: 'target', required: true }
    ],
    handler: async (args, ctx) => {
      return game.intel(args.target, args.detailed, ctx);
    }
  });

  // Status commands
  parser.register('status', {
    description: 'Display current status',
    usage: 'status [--full]',
    aliases: ['st', 'stat'],
    category: 'status',
    handler: async (args, ctx) => {
      return game.getStatus(args.full, ctx);
    }
  });

  parser.register('time', {
    description: 'Display or control game time',
    usage: 'time [pause|resume|step|advance <n>]',
    aliases: ['t'],
    category: 'system',
    args: [
      { name: 'action', required: false },
      { name: 'amount', required: false }
    ],
    handler: async (args, ctx) => {
      return game.timeControl(args.action, args.amount, ctx);
    }
  });

  // System commands
  parser.register('help', {
    description: 'Display help information',
    usage: 'help [command]',
    aliases: ['h', '?'],
    category: 'system',
    args: [
      { name: 'command', required: false }
    ],
    handler: async (args) => {
      return parser.help(args.command);
    }
  });

  parser.register('save', {
    description: 'Save the current game',
    usage: 'save [filename]',
    category: 'system',
    args: [
      { name: 'filename', required: false, default: 'autosave' }
    ],
    handler: async (args, ctx) => {
      try {
        const filename = args.filename || 'autosave';
        Validators.string(filename, 'filename', { minLength: 1, maxLength: 50 });
        return game.save(filename, ctx);
      } catch (error) {
        return { message: error.message, type: 'error' };
      }
    }
  });

  parser.register('load', {
    description: 'Load a saved game',
    usage: 'load <filename>',
    category: 'system',
    args: [
      { name: 'filename', required: true }
    ],
    handler: async (args, ctx) => {
      try {
        const filename = Validators.required(args.filename, 'filename');
        Validators.string(filename, 'filename', { minLength: 1, maxLength: 50 });
        return game.load(filename, ctx);
      } catch (error) {
        return { message: error.message, type: 'error' };
      }
    }
  });

  // Intelligence commands
  parser.register('factions', {
    description: 'List all known factions',
    usage: 'factions [--detailed]',
    aliases: ['f'],
    category: 'intelligence',
    handler: async (args, ctx) => {
      const factionSystem = game.engine.getSystem('factions');
      return factionSystem.listFactions(args.detailed);
    }
  });

  parser.register('faction', {
    description: 'View detailed information about a faction',
    usage: 'faction <name>',
    category: 'intelligence',
    args: [
      { name: 'name', required: true, description: 'Faction name' }
    ],
    handler: async (args, ctx) => {
      try {
        const name = Validators.required(args.name, 'name');
        const factionSystem = game.engine.getSystem('factions');
        return factionSystem.getFactionDetails(name);
      } catch (error) {
        return { message: error.message, type: 'error' };
      }
    }
  });

  parser.register('relations', {
    description: 'View diplomatic relations between factions',
    usage: 'relations',
    aliases: ['diplomacy'],
    category: 'intelligence',
    handler: async (args, ctx) => {
      const factionSystem = game.engine.getSystem('factions');
      const factions = factionSystem.getFactions();

      let output = '═══════════════════════════════════════════════════════\n';
      output += '               DIPLOMATIC RELATIONS\n';
      output += '═══════════════════════════════════════════════════════\n\n';

      for (const faction of factions) {
        const diplomacy = game.entities.getComponent(faction.id, 'Diplomacy');
        output += `${faction.name}:\n`;

        for (const [otherId, value] of Object.entries(diplomacy?.relations || {})) {
          const other = factionSystem.getFaction(otherId);
          if (other) {
            let status = 'Neutral';
            if (value > 50) status = 'Allied';
            else if (value > 25) status = 'Friendly';
            else if (value > -10) status = 'Neutral';
            else if (value > -25) status = 'Unfriendly';
            else if (value > -50) status = 'Hostile';
            else status = 'At War';

            output += `  ${other.name}: ${status} (${value > 0 ? '+' : ''}${value})\n`;
          }
        }
        output += '\n';
      }

      return { render: output };
    }
  });

  parser.register('events', {
    description: 'View recent game events',
    usage: 'events [--limit <n>]',
    category: 'intelligence',
    handler: async (args, ctx) => {
      const eventSystem = game.engine.getSystem('events');
      const limit = parseInt(args.limit) || 10;
      const history = eventSystem.getEventHistory(limit);

      if (history.length === 0) {
        return { message: 'No events recorded.', type: 'info' };
      }

      let output = '═══════════════════════════════════════════════════════\n';
      output += '                  RECENT EVENTS\n';
      output += '═══════════════════════════════════════════════════════\n\n';

      for (const event of history.reverse()) {
        output += `[Tick ${event.tick}] ${event.name}\n`;
        if (event.data && Object.keys(event.data).length > 0) {
          output += `  Details: ${JSON.stringify(event.data)}\n`;
        }
        output += '\n';
      }

      return { render: output };
    }
  });

  // Economy command
  parser.register('economy', {
    description: 'View economic summary',
    usage: 'economy [--system <name>] [--faction <name>]',
    aliases: ['econ'],
    category: 'intelligence',
    handler: async (args, ctx) => {
      const economy = game.engine.getSystem('economy');
      const factions = game.engine.getSystem('factions');
      const universe = game.engine.getSystem('universe');

      let output = '═══════════════════════════════════════════════════════\n';
      output += '                 ECONOMIC OVERVIEW\n';
      output += '═══════════════════════════════════════════════════════\n\n';

      // Get resource totals across all entities
      const totals = {};
      for (const [id, components] of game.entities.query('Resources')) {
        for (const [resource, amount] of Object.entries(components.Resources.stored)) {
          totals[resource] = (totals[resource] || 0) + amount;
        }
      }

      output += 'GALAXY RESOURCE TOTALS:\n';
      for (const [resource, total] of Object.entries(totals)) {
        output += `  ${resource.padEnd(15)} ${total.toLocaleString().padStart(12)}\n`;
      }

      // Market count
      const marketCount = game.entities.count('Market');
      output += `\nActive Markets: ${marketCount}\n`;

      // Trade routes
      output += `Trade Routes: ${economy.tradeRoutes.size}\n`;

      return { render: output };
    }
  });

  // Markets command
  parser.register('markets', {
    description: 'View market prices at current location',
    usage: 'markets [--resource <type>] [--compare]',
    category: 'intelligence',
    handler: async (args, ctx) => {
      const location = game.entities.getComponent(game.playerEntityId, 'PlayerLocation');
      if (!location?.systemId) {
        return { message: 'Location unknown. Use "goto" to travel first.', type: 'error' };
      }

      const universe = game.engine.getSystem('universe');

      // Find markets in current system (stations with Market component)
      const markets = [];
      for (const [id, components] of game.entities.query('Market', 'Identity', 'Orbit')) {
        if (components.Orbit.parentId === location.systemId) {
          markets.push({ id, ...components });
        }
      }

      if (markets.length === 0) {
        return { message: 'No markets in this system.', type: 'info' };
      }

      let output = '═══════════════════════════════════════════════════════\n';
      output += '                   LOCAL MARKETS\n';
      output += '═══════════════════════════════════════════════════════\n\n';

      for (const market of markets) {
        output += `${market.Identity.name}\n`;
        output += '─'.repeat(40) + '\n';
        output += 'Resource'.padEnd(15) + 'Price'.padStart(10) + '\n';

        const prices = market.Market.prices;
        for (const [resource, price] of Object.entries(prices)) {
          if (args.resource && resource !== args.resource) continue;
          output += `${resource.padEnd(15)} ${price.toString().padStart(10)} cr\n`;
        }
        output += '\n';
      }

      return { render: output };
    }
  });

  // Treaties command
  parser.register('treaties', {
    description: 'View active treaties',
    usage: 'treaties [--faction <name>]',
    category: 'intelligence',
    handler: async (args, ctx) => {
      const politics = game.engine.getSystem('politics');
      const factions = game.engine.getSystem('factions');

      let output = '═══════════════════════════════════════════════════════\n';
      output += '                  ACTIVE TREATIES\n';
      output += '═══════════════════════════════════════════════════════\n\n';

      const activeTreaties = Array.from(politics.treaties.values())
        .filter(t => t.status === 'active');

      if (activeTreaties.length === 0) {
        output += 'No active treaties.\n';
      } else {
        for (const treaty of activeTreaties) {
          const proposer = factions.getFaction(treaty.proposer);
          const recipient = factions.getFaction(treaty.recipient);

          output += `${treaty.name || treaty.type}\n`;
          output += `  Between: ${proposer?.name || 'Unknown'} and ${recipient?.name || 'Unknown'}\n`;
          output += `  Duration: ${treaty.duration} ticks remaining\n`;
          output += '\n';
        }
      }

      return { render: output };
    }
  });

  // Wars command
  parser.register('wars', {
    description: 'View active conflicts',
    usage: 'wars',
    category: 'intelligence',
    handler: async (args, ctx) => {
      const politics = game.engine.getSystem('politics');
      const factions = game.engine.getSystem('factions');

      const activeWars = politics.getWars();

      let output = '═══════════════════════════════════════════════════════\n';
      output += '                  ACTIVE CONFLICTS\n';
      output += '═══════════════════════════════════════════════════════\n\n';

      if (activeWars.length === 0) {
        output += 'The galaxy is at peace... for now.\n';
      } else {
        for (const war of activeWars) {
          const attacker = factions.getFaction(war.attacker);
          const defender = factions.getFaction(war.defender);

          output += `${attacker?.name || 'Unknown'} vs ${defender?.name || 'Unknown'}\n`;
          output += `  Reason: ${war.reason}\n`;
          output += `  Started: Tick ${war.startedAt}\n`;
          output += '\n';
        }
      }

      return { render: output };
    }
  });

  parser.register('quit', {
    description: 'Exit the game',
    usage: 'quit [--nosave]',
    aliases: ['exit', 'q'],
    category: 'system',
    handler: async (args, ctx) => {
      return game.quit(args.nosave, ctx);
    }
  });

  parser.register('clear', {
    description: 'Clear the screen',
    usage: 'clear',
    aliases: ['cls'],
    category: 'system',
    handler: async () => {
      return { action: 'clear' };
    }
  });

  return parser;
}

export default CommandParser;
