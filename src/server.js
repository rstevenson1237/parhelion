/**
 * PARHELION - Web Server
 * 
 * HTTP server for static files + WebSocket for game communication
 */

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Game } from './Game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = join(__dirname, '../public');

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

// Game instances per session
const sessions = new Map();

// Create HTTP server
const server = createServer(async (req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  
  // Prevent directory traversal
  filePath = filePath.split('?')[0];
  filePath = join(PUBLIC_DIR, filePath);
  
  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';
  
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(500);
      res.end('Server Error');
    }
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const sessionId = Math.random().toString(36).substring(7);
  let game = null;
  
  console.log(`[${sessionId}] Client connected`);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'system',
    content: 'Connected to PARHELION server. Type "new" to start a new game or "help" for commands.'
  }));
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'command') {
        const input = message.content.trim();
        const inputLower = input.toLowerCase();
        
        // Handle special commands
        if (inputLower === 'new' || inputLower.startsWith('new ')) {
          const seedMatch = input.match(/^new\s+(.+)/i);
          const seed = seedMatch ? seedMatch[1] : Date.now().toString();
          
          game = new Game({ seed, headless: true });
          await game.newGame({ minStars: 20, maxStars: 35 });
          sessions.set(sessionId, game);
          
          // Send initial game state
          ws.send(JSON.stringify({
            type: 'game_start',
            seed: seed,
            state: getGameState(game)
          }));
          
          const stars = game.entities.count('Star');
          const planets = game.entities.count('Planet');
          
          ws.send(JSON.stringify({
            type: 'output',
            content: `
═══════════════════════════════════════════════════════════
           P A R H E L I O N   I N I T I A L I Z E D
═══════════════════════════════════════════════════════════

  Seed: ${seed}
  Star Systems: ${stars}
  Planets: ${planets}

  Type "help" for commands, "map" for galaxy overview.
═══════════════════════════════════════════════════════════`
          }));
          
          return;
        }
        
        if (!game) {
          ws.send(JSON.stringify({
            type: 'error',
            content: 'No active game. Type "new" to start, or "new <seed>" for a specific galaxy.'
          }));
          return;
        }
        
        // Handle map command specially for web
        if (inputLower === 'map') {
          const state = getGameState(game);
          ws.send(JSON.stringify({
            type: 'map',
            state: state,
            content: `Galaxy Map: ${state.stars.length} systems, ${state.routes.length} jump routes`
          }));
          return;
        }
        
        // Handle view command for stars
        if (inputLower.startsWith('view ')) {
          const target = input.substring(5).trim();
          const cmdResult = await game.executeCommand(input);
          const result = cmdResult.result || {};

          ws.send(JSON.stringify({
            type: 'output',
            content: result.output || result.render || result.message || formatStarView(game, target),
            state: getGameState(game),
            highlight: target
          }));
          return;
        }
        
        // Execute game command
        const cmdResult = await game.executeCommand(input);
        const result = cmdResult.result || {};

        ws.send(JSON.stringify({
          type: 'output',
          content: result.output || result.render || result.message || 'Command executed.',
          state: getGameState(game)
        }));
        
      }
    } catch (err) {
      console.error(`[${sessionId}] Error:`, err);
      ws.send(JSON.stringify({
        type: 'error',
        content: `Error: ${err.message}`
      }));
    }
  });
  
  ws.on('close', () => {
    console.log(`[${sessionId}] Client disconnected`);
    sessions.delete(sessionId);
  });
});

/**
 * Format star view output
 */
function formatStarView(game, targetName) {
  const targetLower = targetName.toLowerCase();
  
  for (const [id, components] of game.entities.entities) {
    if (components.has('Star')) {
      const identity = game.entities.getComponent(id, 'Identity');
      if (identity?.name?.toLowerCase().includes(targetLower)) {
        const star = game.entities.getComponent(id, 'Star');
        const position = game.entities.getComponent(id, 'Position');
        
        // Find planets in this system
        const planets = [];
        for (const [pid, pcomps] of game.entities.entities) {
          if (pcomps.has('Planet')) {
            const orbit = game.entities.getComponent(pid, 'Orbit');
            if (orbit?.parentId === id) {
              const pIdentity = game.entities.getComponent(pid, 'Identity');
              const planet = game.entities.getComponent(pid, 'Planet');
              planets.push({ name: pIdentity?.name, type: planet?.planetType });
            }
          }
        }
        
        let output = `
╔══════════════════════════════════════════════════════════╗
  STAR SYSTEM: ${identity.name}
╠══════════════════════════════════════════════════════════╣
  Class: ${star.spectralClass}-type
  Position: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})
  Luminosity: ${star.luminosity.toFixed(2)} Sol
  Mass: ${star.mass.toFixed(2)} Sol
`;
        
        if (planets.length > 0) {
          output += `
  PLANETS (${planets.length}):`;
          planets.forEach((p, i) => {
            output += `
    ${i + 1}. ${p.name || 'Unknown'} [${p.type || 'unknown'}]`;
          });
        }
        
        output += `
╚══════════════════════════════════════════════════════════╝`;
        
        return output;
      }
    }
  }
  
  return `System "${targetName}" not found.`;
}

/**
 * Extract game state for client
 */
function getGameState(game) {
  const stars = [];
  const routes = [];

  for (const [id, components] of game.entities.entities) {
    if (components.has('Star')) {
      const identity = game.entities.getComponent(id, 'Identity');
      const position = game.entities.getComponent(id, 'Position');
      const star = game.entities.getComponent(id, 'Star');
      stars.push({
        id,
        name: identity?.name || id,
        x: position?.x || 0,
        y: position?.y || 0,
        z: position?.z || 0,
        spectralClass: star?.spectralClass || 'G'
      });
    }

    if (components.has('Route')) {
      const route = game.entities.getComponent(id, 'Route');
      routes.push({
        from: route.from,
        to: route.to,
        distance: route.distance
      });
    }
  }

  // Get player location
  let playerLocation = null;
  if (game.playerEntityId) {
    const loc = game.entities.getComponent(game.playerEntityId, 'PlayerLocation');
    if (loc) {
      playerLocation = loc.systemId;
    }
  }

  return {
    stars,
    routes,
    player: {
      ...game.player,
      locationId: playerLocation
    },
    time: game.engine?.time || { tick: 0, hours: 0, days: 0, years: 0 }
  };
}

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    P A R H E L I O N                          ║
║                   Web Server Online                           ║
╠═══════════════════════════════════════════════════════════════╣
║  Local:   http://localhost:${String(PORT).padEnd(5)}                           ║
║  Network: http://0.0.0.0:${String(PORT).padEnd(5)}                             ║
╚═══════════════════════════════════════════════════════════════╝
`);
});
