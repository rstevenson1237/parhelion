#!/usr/bin/env node

/**
 * NEXUS PROTOCOL - Entry Point
 * 
 * "In the calculus of empire, every variable is human"
 * 
 * A grand strategy MUD where you command through orders,
 * not actions. Information is power. The galaxy lives.
 */

import { Game } from './Game.js';
import { Terminal } from './interfaces/Terminal.js';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  seed: null,
  debug: false,
  theme: 'military'
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--seed':
    case '-s':
      options.seed = args[++i];
      break;
    case '--debug':
    case '-d':
      options.debug = true;
      break;
    case '--theme':
    case '-t':
      options.theme = args[++i];
      break;
    case '--help':
    case '-h':
      console.log(`
NEXUS PROTOCOL v0.1.0-alpha

Usage: node src/index.js [options]

Options:
  --seed, -s <seed>    Set universe generation seed
  --debug, -d          Enable debug output
  --theme, -t <theme>  Color theme (military, corporate, amber)
  --help, -h           Show this help

Example:
  node src/index.js --seed "foundation" --theme amber
`);
      process.exit(0);
  }
}

// Main entry point
async function main() {
  try {
    // Generate seed if not provided
    if (!options.seed) {
      options.seed = Date.now();
    }

    console.log('Initializing NEXUS PROTOCOL...');
    console.log(`Seed: ${options.seed}`);

    // Create game instance
    const game = new Game({
      seed: options.seed,
      debug: options.debug,
      galaxySize: 100,
      minStars: 25,
      maxStars: 60
    });

    // Initialize and start new game
    await game.initialize();
    await game.newGame();

    // Create terminal interface
    const terminal = new Terminal(game, {
      theme: options.theme,
      width: process.stdout.columns || 80,
      height: process.stdout.rows || 24
    });

    // Wire up navigation
    game.events.on('*', (event) => {
      if (event.data?.systemId) {
        terminal.setCurrentSystem(event.data.systemId);
      }
    });

    // Handle goto specially
    const originalGoto = game.goto.bind(game);
    game.goto = async (destination, context) => {
      const result = await originalGoto(destination, context);
      if (result.systemId) {
        terminal.setCurrentSystem(result.systemId);
        terminal.setCurrentLocation(result.systemName);
      }
      return result;
    };

    // Handle interface switch
    const originalSwitch = game.switchInterface.bind(game);
    game.switchInterface = async (view, context) => {
      const result = await originalSwitch(view, context);
      terminal.currentView = result.view;
      terminal.refresh();
      return result;
    };

    // Start the terminal interface
    await terminal.start();

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Saving and exiting...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Saving and exiting...');
  process.exit(0);
});

// Run
main();
