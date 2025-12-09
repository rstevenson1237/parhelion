/**
 * NEXUS PROTOCOL - Terminal Interface
 * 
 * The primary command-line interface for the game.
 * Handles input/output, view switching, and game flow.
 */

import * as readline from 'readline';
import { Renderer, Colors, Themes } from './Renderer.js';

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
      game: this.game
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
    const universe = this.game.engine?.getSystem('universe');
    if (!universe) {
      console.log(this.renderer.themed('Universe data unavailable', 'warning'));
      return;
    }

    // Get stars and routes for map
    const stars = Array.from(universe.getStars()).map(([id, components]) => ({
      id,
      name: components.Identity.name,
      position: components.Position,
      stellarClass: components.Star.spectralClass
    }));

    const routes = Array.from(universe.getRoutes()).map(([id, components]) => ({
      id,
      from: components.Route.from,
      to: components.Route.to,
      distance: components.Route.distance
    }));

    // Render map
    const mapOptions = {
      centerX: 50,
      centerY: 50,
      zoom: 0.6,
      selectedId: this.currentSystem
    };

    console.log(this.renderer.galaxyMap(stars, routes, 60, 15, mapOptions));

    // Show star list
    console.log('');
    console.log(this.renderer.themed('Known Systems:', 'secondary'));
    const starList = stars.slice(0, 10).map(s => 
      `  ${s.stellarClass} ${s.name}`
    );
    console.log(starList.join('\n'));
    
    if (stars.length > 10) {
      console.log(this.renderer.themed(`  ... and ${stars.length - 10} more`, 'muted'));
    }
  }

  /**
   * Display tactical (system) view
   */
  displayTacticalView() {
    if (!this.currentSystem) {
      console.log(this.renderer.themed('No system selected. Use "goto <system>" to select one.', 'warning'));
      return;
    }

    const universe = this.game.engine?.getSystem('universe');
    const starData = universe?.getStar(this.currentSystem);
    
    if (!starData) {
      console.log(this.renderer.themed('System data unavailable', 'warning'));
      return;
    }

    console.log(this.renderer.themed(`═══ ${starData.Identity.name} System ═══`, 'highlight'));
    console.log(this.renderer.themed(`${starData.Star.spectralClass}-class star`, 'muted'));
    console.log('');

    // List planets
    const planets = Array.from(universe.getPlanetsInSystem(this.currentSystem));
    
    if (planets.length > 0) {
      console.log(this.renderer.themed('Planets:', 'secondary'));
      const planetData = planets.map(([id, p]) => [
        p.Identity.name,
        p.Planet.planetType,
        p.Planet.atmosphere,
        p.Planet.population > 0 ? p.Planet.population.toLocaleString() : '-'
      ]);
      console.log(this.renderer.table(
        ['Name', 'Type', 'Atmosphere', 'Population'],
        planetData
      ));
    }

    // Show connections
    const connections = universe.getConnectedSystems(this.currentSystem);
    if (connections.length > 0) {
      console.log('');
      console.log(this.renderer.themed('Jump Routes:', 'secondary'));
      for (const conn of connections) {
        const targetStar = universe.getStar(conn.id);
        console.log(`  → ${targetStar?.Identity.name || 'Unknown'} (${conn.distance.toFixed(1)} LY)`);
      }
    }
  }

  /**
   * Display personal (character) view
   */
  displayPersonalView() {
    const player = this.game.player;
    
    if (!player) {
      console.log(this.renderer.themed('No active character. Character system not initialized.', 'warning'));
      return;
    }

    console.log(this.renderer.themed(`═══ ${player.name} ═══`, 'highlight'));
    console.log(this.renderer.themed(`${player.role} | ${player.faction}`, 'muted'));
    console.log('');

    // Stats
    if (player.stats) {
      console.log(this.renderer.progressBar(player.stats.health, 100, 20, 'Health'));
      console.log(this.renderer.progressBar(player.stats.morale, 100, 20, 'Morale'));
      console.log(this.renderer.progressBar(player.stats.energy, 100, 20, 'Energy'));
    }

    console.log('');
    
    // Location
    console.log(this.renderer.themed('Location:', 'secondary'));
    console.log(`  ${this.currentLocation || 'Unknown'}`);

    // Credits
    if (player.inventory) {
      console.log('');
      console.log(this.renderer.themed(`Credits: ${player.inventory.credits.toLocaleString()}`, 'primary'));
    }
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
  }

  /**
   * Set current location
   */
  setCurrentLocation(location) {
    this.currentLocation = location;
  }
}

export default Terminal;
