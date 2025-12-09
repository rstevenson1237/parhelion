# PARHELION Phase 0 Completion Spec
## Implementation Guide for Claude Code

**Purpose**: Complete Phase 0 foundation and prepare codebase for Phase 1.  
**Estimated Tasks**: 8 discrete implementation blocks  
**Testing**: Each block includes test requirements

---

## Current State Assessment

### ✅ Implemented
- Engine with tick system (pause/resume/step/advance)
- ECS with query system and serialize/deserialize
- EventBus with wildcards
- CommandParser with standard commands
- UniverseSystem with procedural generation
- Terminal interface (basic)
- Web interface (functional)
- Renderer with ASCII utilities
- Random with seeded RNG

### ❌ Gaps to Address
1. No test suite
2. Save/Load doesn't include ECS entity data
3. Player has no position in universe (just a plain object)
4. "goto" command doesn't track player location
5. View modes exist but aren't differentiated
6. No input validation on commands
7. Sparse error handling

---

## TASK 1: Fix Save/Load to Include Entity Data

**Problem**: `Game.save()` saves engine state but not ECS entities. Universe is lost on load.

### Modify: `src/Game.js`

In `save()` method (around line 402), update the state object:

```javascript
async save(filename, context) {
  const state = {
    version: '0.1.0',
    timestamp: Date.now(),
    seed: this.options.seed,
    engine: this.engine.getState(),
    entities: this.entities.serialize(),  // ADD THIS
    player: this.player
  };
  // ... rest unchanged
}
```

In `load()` method (around line 425), restore entities:

```javascript
async load(filename, context) {
  // ... after parsing JSON ...
  
  // Restore state
  this.options.seed = data.seed;
  this.engine.loadState(data.engine);
  
  // ADD: Restore entities
  if (data.entities) {
    this.entities.deserialize(data.entities);
  }
  
  this.player = data.player;
  // ...
}
```

### Test Requirement
Create `tests/save-load.test.js`:
- Create game, generate universe
- Save game
- Create new game instance
- Load save
- Verify star count matches
- Verify player data matches

---

## TASK 2: Create Player as ECS Entity

**Problem**: Player is a plain object, not in ECS. Can't have position, can't interact with universe properly.

### Modify: `src/Game.js`

In `initialize()` method, after creating player object (around line 77), also create player entity:

```javascript
// Create default player
this.player = {
  id: 'player_1',
  name: 'Commander',
  faction: 'Independent',
  // ... existing properties
};

// ADD: Create player as ECS entity
this.playerEntityId = this.entities.create('player_1');
this.entities.addComponent(this.playerEntityId, 'Identity', 
  Components.Identity(this.player.name, 'player', 'The player character')
);
this.entities.addComponent(this.playerEntityId, 'Character',
  Components.Character(this.player.role, {}, [], '')
);
this.entities.addComponent(this.playerEntityId, 'Stats',
  Components.Stats(100, 100, 100)
);
this.entities.addComponent(this.playerEntityId, 'Inventory',
  Components.Inventory([], this.player.inventory.credits, 100)
);
// Position will be set when player spawns at a location
```

### Add to: `src/core/ECS.js`

Add a PlayerLocation component to Components object (around line 65):

```javascript
// Add after existing components
PlayerLocation: (systemId, bodyId = null, stationId = null) => ({
  systemId,    // Current star system
  bodyId,      // Planet/moon if landed
  stationId    // Station if docked
}),
```

---

## TASK 3: Implement Player Location Tracking

**Problem**: `goto` command returns success message but doesn't track location.

### Modify: `src/Game.js`

In `newGame()` method (around line 117), after universe generation, spawn player at first star:

```javascript
async newGame(options = {}) {
  await this.initialize();

  const universe = this.engine.getSystem('universe');
  universe.generate(this.options.seed, { /* ... */ });

  // ADD: Spawn player at first star system
  const firstStar = Array.from(universe.getStars())[0];
  if (firstStar) {
    const [starId, components] = firstStar;
    this.entities.addComponent(this.playerEntityId, 'PlayerLocation',
      Components.PlayerLocation(starId, null, null)
    );
    this.player.location = components.Identity.name;
    this.player.locationId = starId;
  }

  this.engine.start();
  // ...
}
```

Update `goto()` method (around line 224):

```javascript
async goto(destination, context) {
  const universe = this.engine.getSystem('universe');
  const lower = destination.toLowerCase();

  for (const [id, components] of universe.getStars()) {
    if (components.Identity.name.toLowerCase().includes(lower)) {
      // ADD: Check if route exists from current location
      const currentLocation = this.entities.getComponent(this.playerEntityId, 'PlayerLocation');
      
      if (currentLocation && currentLocation.systemId !== id) {
        const connections = universe.getConnectedSystems(currentLocation.systemId);
        const route = connections.find(c => c.id === id);
        
        if (!route) {
          return { 
            message: `No direct route from current system to ${components.Identity.name}. Check available connections.`,
            type: 'warning'
          };
        }
      }
      
      // Update player location
      this.entities.addComponent(this.playerEntityId, 'PlayerLocation',
        Components.PlayerLocation(id, null, null)
      );
      this.player.location = components.Identity.name;
      this.player.locationId = id;

      return {
        action: 'goto',
        systemId: id,
        systemName: components.Identity.name,
        message: `Arrived at ${components.Identity.name}.`,
        type: 'success'
      };
    }
  }

  return { message: `Unknown destination: "${destination}"`, type: 'error' };
}
```

### Add Command: `connections` or `routes`

In `src/core/CommandParser.js`, in `registerStandardCommands()`, add:

```javascript
parser.register({
  name: 'connections',
  aliases: ['routes', 'jumps'],
  description: 'Show available jump routes from current location',
  handler: async (args, context) => {
    const { game } = context;
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
```

---

## TASK 4: Create Test Suite

**Create directory**: `tests/`

### Create: `tests/engine.test.js`

```javascript
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { Engine } from '../src/core/Engine.js';

describe('Engine', () => {
  let engine;

  beforeEach(() => {
    engine = new Engine({ paused: true });
  });

  it('should initialize with tick 0', () => {
    assert.strictEqual(engine.state.tick, 0);
  });

  it('should increment tick on step()', () => {
    engine.start();
    engine.step();
    assert.strictEqual(engine.state.tick, 1);
  });

  it('should advance multiple ticks', () => {
    engine.start();
    engine.advance(5);
    assert.strictEqual(engine.state.tick, 5);
  });

  it('should register and call systems', () => {
    let called = false;
    engine.registerSystem('test', {
      update: () => { called = true; }
    });
    engine.start();
    engine.step();
    assert.strictEqual(called, true);
  });

  it('should serialize and restore state', () => {
    engine.start();
    engine.advance(10);
    const state = engine.getState();
    
    const engine2 = new Engine();
    engine2.loadState(state);
    
    assert.strictEqual(engine2.state.tick, 10);
  });
});
```

### Create: `tests/ecs.test.js`

```javascript
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EntityManager, Components } from '../src/core/ECS.js';

describe('EntityManager', () => {
  let ecs;

  beforeEach(() => {
    ecs = new EntityManager();
  });

  it('should create entities with unique IDs', () => {
    const id1 = ecs.create();
    const id2 = ecs.create();
    assert.notStrictEqual(id1, id2);
  });

  it('should add and retrieve components', () => {
    const id = ecs.create('test');
    ecs.addComponent(id, 'Position', Components.Position(10, 20, 30));
    
    const pos = ecs.getComponent(id, 'Position');
    assert.strictEqual(pos.x, 10);
    assert.strictEqual(pos.y, 20);
    assert.strictEqual(pos.z, 30);
  });

  it('should query entities by components', () => {
    const id1 = ecs.create('star1');
    ecs.addComponent(id1, 'Position', Components.Position(0, 0, 0));
    ecs.addComponent(id1, 'Star', Components.Star('G', 1.0, 1.0));

    const id2 = ecs.create('planet1');
    ecs.addComponent(id2, 'Position', Components.Position(1, 0, 0));
    ecs.addComponent(id2, 'Planet', Components.Planet('temperate', 'breathable', 1.0));

    const stars = Array.from(ecs.query('Position', 'Star'));
    assert.strictEqual(stars.length, 1);
    assert.strictEqual(stars[0][0], id1);
  });

  it('should serialize and deserialize', () => {
    const id = ecs.create('test');
    ecs.addComponent(id, 'Identity', Components.Identity('Test', 'test', 'A test'));
    
    const data = ecs.serialize();
    
    const ecs2 = new EntityManager();
    ecs2.deserialize(data);
    
    const identity = ecs2.getComponent('test', 'Identity');
    assert.strictEqual(identity.name, 'Test');
  });

  it('should count entities with component', () => {
    ecs.create('a');
    ecs.addComponent('a', 'Star', Components.Star('G', 1, 1));
    ecs.create('b');
    ecs.addComponent('b', 'Star', Components.Star('M', 0.5, 0.5));
    ecs.create('c');
    ecs.addComponent('c', 'Planet', Components.Planet('rocky', 'none', 0.5));

    assert.strictEqual(ecs.count('Star'), 2);
    assert.strictEqual(ecs.count('Planet'), 1);
  });
});
```

### Create: `tests/universe.test.js`

```javascript
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { EntityManager } from '../src/core/ECS.js';
import { UniverseSystem } from '../src/systems/UniverseSystem.js';
import { Random } from '../src/utils/Random.js';

describe('UniverseSystem', () => {
  let ecs, universe, rng;

  beforeEach(() => {
    ecs = new EntityManager();
    universe = new UniverseSystem();
    rng = new Random('test-seed');
    
    universe.entities = ecs;
    universe.setRNG(rng.next.bind(rng));
  });

  it('should generate stars within bounds', () => {
    const result = universe.generate('test', {
      minStars: 10,
      maxStars: 20,
      galaxySize: 50
    });
    
    assert.ok(result.stars.length >= 10);
    assert.ok(result.stars.length <= 20);
  });

  it('should generate with same seed produces same result', () => {
    const rng1 = new Random('same-seed');
    const rng2 = new Random('same-seed');
    
    const u1 = new UniverseSystem();
    u1.entities = new EntityManager();
    u1.setRNG(rng1.next.bind(rng1));
    
    const u2 = new UniverseSystem();
    u2.entities = new EntityManager();
    u2.setRNG(rng2.next.bind(rng2));
    
    const r1 = u1.generate('x', { minStars: 10, maxStars: 15 });
    const r2 = u2.generate('x', { minStars: 10, maxStars: 15 });
    
    assert.strictEqual(r1.stars.length, r2.stars.length);
    assert.strictEqual(r1.stars[0].name, r2.stars[0].name);
  });

  it('should create connected graph (all stars reachable)', () => {
    const result = universe.generate('connectivity-test', {
      minStars: 15,
      maxStars: 20,
      galaxySize: 100
    });
    
    // BFS from first star
    const visited = new Set();
    const queue = [result.stars[0].id];
    visited.add(result.stars[0].id);
    
    while (queue.length > 0) {
      const current = queue.shift();
      const connections = universe.getConnectedSystems(current);
      
      for (const conn of connections) {
        if (!visited.has(conn.id)) {
          visited.add(conn.id);
          queue.push(conn.id);
        }
      }
    }
    
    assert.strictEqual(visited.size, result.stars.length, 
      'All stars should be reachable from first star');
  });

  it('should generate planets for stars', () => {
    universe.generate('planets-test', { minStars: 5, maxStars: 10 });
    
    const planetCount = ecs.count('Planet');
    assert.ok(planetCount > 0, 'Should generate at least some planets');
  });
});
```

### Create: `tests/game.test.js`

```javascript
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { Game } from '../src/Game.js';
import fs from 'fs';
import path from 'path';

describe('Game', () => {
  let game;
  const testSavePath = './test-saves';

  beforeEach(async () => {
    game = new Game({ 
      seed: 'test-game',
      savePath: testSavePath 
    });
  });

  afterEach(() => {
    // Cleanup test saves
    if (fs.existsSync(testSavePath)) {
      fs.rmSync(testSavePath, { recursive: true });
    }
  });

  it('should initialize without errors', async () => {
    await game.initialize();
    assert.strictEqual(game.initialized, true);
  });

  it('should generate universe on newGame', async () => {
    await game.newGame({ minStars: 10, maxStars: 15 });
    
    const starCount = game.entities.count('Star');
    assert.ok(starCount >= 10 && starCount <= 15);
  });

  it('should execute status command', async () => {
    await game.newGame();
    
    const result = await game.executeCommand('status');
    assert.ok(result.render || result.message);
  });

  it('should save and load game state', async () => {
    await game.newGame({ minStars: 10, maxStars: 15 });
    const originalStarCount = game.entities.count('Star');
    
    await game.save('test-save');
    
    // Create new game and load
    const game2 = new Game({ savePath: testSavePath });
    await game2.initialize();
    await game2.load('test-save');
    
    assert.strictEqual(game2.entities.count('Star'), originalStarCount);
  });

  it('should track player location after goto', async () => {
    await game.newGame({ minStars: 10, maxStars: 15 });
    
    // Get a connected system to travel to
    const universe = game.engine.getSystem('universe');
    const currentLoc = game.entities.getComponent(game.playerEntityId, 'PlayerLocation');
    const connections = universe.getConnectedSystems(currentLoc.systemId);
    
    if (connections.length > 0) {
      const targetStar = universe.getStar(connections[0].id);
      const result = await game.executeCommand(`goto ${targetStar.Identity.name}`);
      
      const newLoc = game.entities.getComponent(game.playerEntityId, 'PlayerLocation');
      assert.strictEqual(newLoc.systemId, connections[0].id);
    }
  });
});
```

### Update: `package.json`

Ensure test script is correct:
```json
"scripts": {
  "test": "node --test tests/*.test.js",
  // ... other scripts
}
```

---

## TASK 5: Add Input Validation to Commands

### Modify: `src/core/CommandParser.js`

Add validation utility at top of file (after imports):

```javascript
const Validators = {
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

export { Validators };
```

Update command handlers to use validators. Example for `view`:

```javascript
parser.register({
  name: 'view',
  // ...
  handler: async (args, context) => {
    try {
      const target = Validators.required(args.target, 'target');
      Validators.string(target, 'target', { minLength: 1, maxLength: 100 });
      return await context.game.view(target, args.detailed, context);
    } catch (error) {
      return { message: error.message, type: 'error' };
    }
  }
});
```

---

## TASK 6: Improve Status Command with Location

### Modify: `src/Game.js`

Update `status()` method to include current location:

```javascript
async status(context) {
  const stats = this.entities.stats();
  const time = this.engine.formatGameTime();
  
  // Get player location details
  const location = this.entities.getComponent(this.playerEntityId, 'PlayerLocation');
  let locationStr = 'Unknown';
  let systemInfo = '';
  
  if (location) {
    const universe = this.engine.getSystem('universe');
    const star = universe.getStar(location.systemId);
    if (star) {
      locationStr = star.Identity.name;
      systemInfo = `System: ${star.Star.spectralClass}-class star`;
      
      // Count planets in system
      const planets = Array.from(universe.getPlanetsInSystem(location.systemId));
      systemInfo += `\nPlanets: ${planets.length}`;
      
      // Get connections
      const connections = universe.getConnectedSystems(location.systemId);
      systemInfo += `\nJump Routes: ${connections.length}`;
    }
  }

  return {
    render: `
═══════════════════════════════════════════════════════
                    STATUS REPORT
═══════════════════════════════════════════════════════

Time: ${time}
Tick: ${this.engine.state.tick}
Engine: ${this.engine.config.paused ? 'PAUSED' : 'RUNNING'}

LOCATION
  Current: ${locationStr}
  ${systemInfo}

COMMANDER
  Name: ${this.player.name}
  Faction: ${this.player.faction}
  Role: ${this.player.role}
  Credits: ₢${this.player.inventory.credits.toLocaleString()}

GALAXY
  Total Systems: ${stats.componentCounts.Star || 0}
  Total Planets: ${stats.componentCounts.Planet || 0}
  Jump Routes: ${stats.componentCounts.Route || 0}

═══════════════════════════════════════════════════════
`.trim()
  };
}
```

---

## TASK 7: Add `local` Command for Current System Details

### Add to: `src/core/CommandParser.js` in `registerStandardCommands()`

```javascript
parser.register({
  name: 'local',
  aliases: ['system', 'here'],
  description: 'View details of current star system',
  usage: 'local',
  handler: async (args, context) => {
    const { game } = context;
    const location = game.entities.getComponent(game.playerEntityId, 'PlayerLocation');
    
    if (!location) {
      return { message: 'Location unknown.', type: 'error' };
    }
    
    // Reuse view command logic
    const universe = game.engine.getSystem('universe');
    const star = universe.getStar(location.systemId);
    
    if (!star) {
      return { message: 'System data unavailable.', type: 'error' };
    }
    
    return await game.view(star.Identity.name, true, context);
  }
});
```

---

## TASK 8: Update Web Interface for Location

### Modify: `src/server.js`

Update `getGameState()` to include player location:

```javascript
function getGameState(game) {
  const stars = [];
  const routes = [];
  
  // ... existing star/route collection ...
  
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
```

### Modify: `public/client.js`

In `renderMap()`, highlight player's current system:

```javascript
// After drawing stars, highlight player location
if (gameState.player?.locationId) {
  const playerStar = gameState.stars.find(s => s.id === gameState.player.locationId);
  if (playerStar) {
    const pos = starPositions.get(playerStar.id);
    
    // Draw player indicator
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw "YOU ARE HERE" marker
    ctx.fillStyle = '#00ff88';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▼', pos.x, pos.y - 20);
  }
}
```

---

## Verification Checklist

After completing all tasks, verify:

```bash
# Run tests
npm test

# Start game and verify commands
npm run web
# In browser:
# > new test-seed
# > status (should show location)
# > local (should show current system)
# > connections (should show jump routes)
# > goto <connected-system>
# > status (location should change)
# > save mysave
# > new different-seed
# > load mysave (should restore previous galaxy)
```

### Expected Test Output
```
✓ Engine - should initialize with tick 0
✓ Engine - should increment tick on step()
✓ Engine - should advance multiple ticks
✓ Engine - should register and call systems
✓ Engine - should serialize and restore state
✓ EntityManager - should create entities with unique IDs
✓ EntityManager - should add and retrieve components
✓ EntityManager - should query entities by components
✓ EntityManager - should serialize and deserialize
✓ EntityManager - should count entities with component
✓ UniverseSystem - should generate stars within bounds
✓ UniverseSystem - same seed produces same result
✓ UniverseSystem - should create connected graph
✓ UniverseSystem - should generate planets for stars
✓ Game - should initialize without errors
✓ Game - should generate universe on newGame
✓ Game - should execute status command
✓ Game - should save and load game state
✓ Game - should track player location after goto
```

---

## Phase 1 Readiness

After Phase 0 completion, the codebase will have:

1. **Solid foundation**: Tested engine, ECS, event system
2. **Player in universe**: Trackable location, movement between systems
3. **Persistent state**: Save/load preserves full game state
4. **Command infrastructure**: Validated, extensible command system

**Ready for Phase 1**:
- FactionSystem can use ECS to create faction entities
- EconomySystem can attach to stars/planets
- MilitarySystem can track fleet positions like player
- Events can trigger based on location/time

---

## Notes for Claude Code

- Run `npm test` frequently to catch regressions
- Use `console.log` for debugging, remove before committing
- If a task is unclear, implement the simplest working version first
- Commit after each task with descriptive message
- If tests fail, fix before moving to next task

**Commit message format**:
```
Task N: Brief description

- Detail 1
- Detail 2
```

Example:
```
Task 1: Fix save/load to include entity data

- Add entities.serialize() to save state
- Add entities.deserialize() to load
- Preserves full universe on reload
```
