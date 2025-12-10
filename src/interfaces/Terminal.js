/**
 * NEXUS PROTOCOL - Terminal Interface
 * 
 * The primary command-line interface for the game.
 * Handles input/output, view switching, and game flow.
 */

import * as readline from 'readline';
import { Renderer, Colors, Themes } from './Renderer.js';
import { StrategicView } from './StrategicView.js';
import { TacticalView } from './TacticalView.js';
import { PersonalView } from './PersonalView.js';

export class Terminal {
  constructor(game, options = {}) {
    this.game = game;
    this.renderer = new Renderer({
      width: options.width || 80,
      height: options.height || 24,
      theme: options.theme || 'military'
    });
    
    this.currentView = 'strategic';  // strategic, tactical, personal
    this.currentSystem = null;
    this.currentLocation = null;
    
    this.rl = null;
    this.running = false;
    this.messageLog = [];
    this.maxMessages = 100;

    // Initialize view modules
    this.strategicView = new StrategicView(game, this.renderer);
    this.tacticalView = new TacticalView(game, this.renderer);
    this.personalView = new PersonalView(game, this.renderer);

    // Bind methods
    this.handleInput = this.handleInput.bind(this);
  }

  /**
   * Start the terminal interface
   */
  async start() {
    this.running = true;
    
    // Set up readline
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    });

    // Enable raw mode for better input handling
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }

    // Handle line input
    this.rl.on('line', this.handleInput);
    
    // Handle close
    this.rl.on('close', () => {
      this.running = false;
      process.exit(0);
    });

    // Display splash screen
    await this.displaySplash();
    
    // Initial render
    this.refresh();
    
    // Start prompt
    this.prompt();
  }

  /**
   * Stop the terminal interface
   */
  stop() {
    this.running = false;
    if (this.rl) {
      this.rl.close();
    }
  }

  /**
   * Display splash screen
   */
  async displaySplash() {
    this.clear();
    
    const splash = `
${Colors.green}
    ╔═══════════════════════════════════════════════════════════════════╗
    ║                                                                   ║
    ║   ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗                     ║
    ║   ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝                     ║
    ║   ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗                     ║
    ║   ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║                     ║
    ║   ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║                     ║
    ║   ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝                     ║
    ║                                                                   ║
    ║           ██████╗ ██████╗  ██████╗ ████████╗ ██████╗  ██████╗ ██╗    ║
    ║           ██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔═══██╗██╔════╝██║    ║
    ║           ██████╔╝██████╔╝██║   ██║   ██║   ██║   ██║██║     ██║    ║
    ║           ██╔═══╝ ██╔══██╗██║   ██║   ██║   ██║   ██║██║     ██║    ║
    ║           ██║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝╚██████╗███████╗║
    ║           ╚═╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝  ╚═════╝╚══════╝║
    ║                                                                   ║
    ║        "In the calculus of empire, every variable is human"       ║
    ║                                                                   ║
    ╚═══════════════════════════════════════════════════════════════════╝
${Colors.reset}
${Colors.cyan}
                           Version 0.1.0-alpha
                     
                         Press ENTER to begin...
${Colors.reset}`;

    console.log(splash);
    
    // Wait for enter
    await new Promise(resolve => {
      const handler = () => {
        this.rl.removeListener('line', handler);
        resolve();
      };
      this.rl.on('line', handler);
    });
  }

  /**
   * Handle user input
   */
  async handleInput(input) {
    if (!this.running) return;

    const trimmed = input.trim();

    if (!trimmed) {
      this.prompt();
      return;
    }

    // Check for view-specific commands first
    const viewResult = this.handleViewCommand(trimmed);
    if (viewResult) {
      if (viewResult.refresh) {
        this.refresh();
      }
      if (viewResult.message) {
        this.log(viewResult.message, viewResult.type || 'info');
      }
      this.prompt();
      return;
    }

    // Process command
    const result = await this.game.executeCommand(trimmed, this.getContext());

    // Handle result
    if (result.success) {
      if (result.result) {
        this.displayResult(result.result);
      }

      // Check for special actions
      if (result.result?.action === 'clear') {
        this.clear();
      } else if (result.result?.action === 'quit') {
        this.log('Disconnecting from NEXUS PROTOCOL...', 'system');
        setTimeout(() => this.stop(), 1000);
        return;
      } else if (result.result?.action === 'switch') {
        this.currentView = result.result.view;
        this.refresh();
      }
    } else {
      this.log(result.error, 'error');

      if (result.usage) {
        this.log(`Usage: ${result.usage}`, 'info');
      }

      if (result.suggestions?.length) {
        const suggestions = result.suggestions.map(s => s.name).join(', ');
        this.log(`Did you mean: ${suggestions}?`, 'info');
      }
    }

    this.prompt();
  }

  /**
   * Handle view-specific commands
   */
  handleViewCommand(input) {
    const [command, ...args] = input.trim().split(/\s+/);

    switch (this.currentView) {
      case 'strategic':
        return this.strategicView.handleCommand(command, args);
      case 'tactical':
        return this.tacticalView.handleCommand(command, args);
      case 'personal':
        return this.personalView.handleCommand(command, args);
      default:
        return null;
    }
  }

  /**
   * Display command result
   */
  displayResult(result) {
    if (!result) return;

    // Handle different result types
    if (typeof result === 'string') {
      console.log(result);
    } else if (result.render) {
      // Custom rendered output
      console.log(result.render);
    } else if (result.map) {
      // Galaxy map
      console.log(result.map);
    } else if (result.table) {
      // Table data
      console.log(this.renderer.table(result.headers, result.rows, result.options));
    } else if (result.message) {
      this.log(result.message, result.type || 'info');
    } else if (result.help) {
      console.log(this.renderer.helpDisplay(result.help));
    } else if (result.view) {
      // View data for an entity
      this.displayView(result);
    }
  }

  /**
   * Display entity view
   */
  displayView(data) {
    const lines = [];
    
    lines.push(this.renderer.themed(`═══ ${data.name} ═══`, 'highlight'));
    lines.push(this.renderer.themed(data.type, 'muted'));
    lines.push('');
    
    if (data.description) {
      lines.push(data.description);
      lines.push('');
    }

    if (data.attributes) {
      for (const [key, value] of Object.entries(data.attributes)) {
        lines.push(`${this.renderer.themed(key + ':', 'secondary')} ${value}`);
      }
    }

    if (data.children?.length) {
      lines.push('');
      lines.push(this.renderer.themed('Contains:', 'secondary'));
      for (const child of data.children) {
        lines.push(`  ${child.icon || '•'} ${child.name} (${child.type})`);
      }
    }

    if (data.connections?.length) {
      lines.push('');
      lines.push(this.renderer.themed('Connected to:', 'secondary'));
      for (const conn of data.connections) {
        lines.push(`  → ${conn.name} (${conn.distance.toFixed(1)} LY)`);
      }
    }

    console.log(lines.join('\n'));
  }

  /**
   * Get current context for commands
   */
  getContext() {
    return {
      view: this.currentView,
      system: this.currentSystem,
      location: this.currentLocation,
      player: this.game.player,
      game: this.game,
      // Add view-specific context
      strategicOptions: this.strategicView.options,
      tacticalOptions: this.tacticalView.options,
      personalOptions: this.personalView.options,
      selectedEntity: this.tacticalView.selectedEntity
    };
  }

  /**
   * Log a message
   */
  log(message, type = 'info') {
    const formatted = this.renderer.message(message, type);
    console.log(formatted);
    
    this.messageLog.push({
      message,
      type,
      timestamp: Date.now()
    });
    
    if (this.messageLog.length > this.maxMessages) {
      this.messageLog.shift();
    }
  }

  /**
   * Clear the screen
   */
  clear() {
    console.clear();
    // Also try ANSI clear
    process.stdout.write('\x1b[2J\x1b[H');
  }

  /**
   * Refresh the display
   */
  refresh() {
    this.clear();
    this.displayHeader();
    
    switch (this.currentView) {
      case 'strategic':
        this.displayStrategicView();
        break;
      case 'tactical':
        this.displayTacticalView();
        break;
      case 'personal':
        this.displayPersonalView();
        break;
    }

    // Show recent messages
    this.displayMessages();
  }

  /**
   * Display header bar
   */
  displayHeader() {
    const player = this.game.player || { name: 'UNKNOWN', faction: 'UNAFFILIATED' };
    const time = this.game.engine?.formatGameTime() || 'INITIALIZING';
    const view = this.currentView.toUpperCase();

    const header = this.renderer.header(
      'NEXUS PROTOCOL v0.1.0',
      `${player.name} | ${player.faction} | ${time}`
    );

    console.log(header);
    console.log(this.renderer.statusBar([
      { label: 'VIEW', value: view, color: 'highlight' },
      { label: 'STATUS', value: this.game.engine?.config.paused ? 'PAUSED' : 'RUNNING', color: 'info' }
    ]));
    console.log('');
  }

  /**
   * Display strategic (galaxy) view
   */
  displayStrategicView() {
    const output = this.strategicView.render();
    console.log(output);
  }

  /**
   * Display tactical (system) view
   */
  displayTacticalView() {
    // Sync current system from player location
    const location = this.game.entities.getComponent(
      this.game.playerEntityId,
      'PlayerLocation'
    );
    if (location?.systemId) {
      this.tacticalView.setSystem(location.systemId);
    }

    const output = this.tacticalView.render();
    console.log(output);
  }

  /**
   * Display personal (character) view
   */
  displayPersonalView() {
    const output = this.personalView.render();
    console.log(output);
  }

  /**
   * Display recent messages
   */
  displayMessages() {
    const recent = this.messageLog.slice(-5);
    
    if (recent.length > 0) {
      console.log('');
      console.log(this.renderer.themed('─'.repeat(60), 'muted'));
      for (const msg of recent) {
        console.log(this.renderer.message(msg.message, msg.type));
      }
    }
  }

  /**
   * Display prompt
   */
  prompt() {
    const viewPrefix = {
      strategic: 'STR',
      tactical: 'TAC',
      personal: 'PER'
    };
    
    const prefix = this.renderer.themed(
      `[${viewPrefix[this.currentView]}]`,
      'primary'
    );
    
    process.stdout.write(`${prefix} ${Colors.green}>${Colors.reset} `);
  }

  /**
   * Set current system
   */
  setCurrentSystem(systemId) {
    this.currentSystem = systemId;
    this.tacticalView.setSystem(systemId);
  }

  /**
   * Set current location
   */
  setCurrentLocation(location) {
    this.currentLocation = location;
  }
}

export default Terminal;
