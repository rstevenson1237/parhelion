# NEXUS PROTOCOL
## Development Roadmap & Architecture Document

```
    ╔═══════════════════════════════════════════════════════════════════╗
    ║  N E X U S   P R O T O C O L                                      ║
    ║  "In the calculus of empire, every variable is human"             ║
    ╚═══════════════════════════════════════════════════════════════════╝
```

---

## VISION

A multiplayer grand strategy MUD where players inhabit single characters within 
a living, breathing galactic civilization. You don't control armies—you *command* 
them through orders, influence, and political maneuvering. Think Foundation's 
psychohistory meets Traveller's gritty spacefaring meets the diplomatic intrigue 
of Crusader Kings, all through a command-line interface that evokes 1980s 
military command systems.

---

## DEVELOPMENT PHASES

### PHASE 0: FOUNDATION (Current)
**Goal**: Core architecture and proof of concept

- [x] Project structure and module system
- [ ] Core game loop and tick system
- [ ] Entity-Component-System architecture
- [ ] Procedural universe generation (seed-based)
- [ ] Basic command interpreter
- [ ] Single-player terminal interface
- [ ] Save/Load state system

**Deliverable**: A player can generate a universe, view systems, and navigate between them.

---

### PHASE 1: ALPHA - "The Galaxy Lives"
**Goal**: Minimum playable simulation

#### 1A: Universe Simulation
- [ ] Star system generation (stars, planets, stations)
- [ ] Faction generation with traits, goals, relationships
- [ ] Economic simulation (resources, trade routes, supply/demand)
- [ ] Political simulation (treaties, wars, influence)
- [ ] Time advancement with cascading events

#### 1B: Interface Layer
- [ ] Interface 1: STRATEGIC - Galaxy map (ASCII node graph)
- [ ] Interface 2: TACTICAL - System/World view
- [ ] Interface 3: PERSONAL - Character actions
- [ ] Seamless interface switching
- [ ] Information drill-down system

#### 1C: Character System
- [ ] Character creation with backgrounds
- [ ] Skills and attributes
- [ ] Inventory and equipment
- [ ] Social connections (NPCs, other players)
- [ ] Reputation with factions

#### 1D: Command System ✓ COMPLETE
- [x] Natural language command parser
- [x] Order queue system (delayed execution)
- [x] Communication protocols (messages, broadcasts)
- [x] Intelligence/reconnaissance commands
- [x] Fleet system with command hierarchy
- [x] Player faction assignment and fleet command
- [x] Movement component for gradual fleet movement
- [x] Comprehensive integration test suite

**Deliverable**: Single player can create character, explore universe, give orders to faction units, watch events unfold.

---

### PHASE 2: BETA - "The Network"
**Goal**: Multiplayer and persistent world

#### 2A: Networking
- [ ] WebSocket server architecture
- [ ] Client authentication and sessions
- [ ] State synchronization
- [ ] Conflict resolution (simultaneous orders)

#### 2B: Persistence
- [ ] Database integration
- [ ] World state persistence
- [ ] Character persistence
- [ ] Event logging and playback

#### 2C: Multiplayer Dynamics
- [ ] Player-to-player communication
- [ ] Cooperative faction control
- [ ] Competitive scenarios
- [ ] Spectator mode

**Deliverable**: Multiple players can inhabit same universe, interact, compete, cooperate.

---

### PHASE 3: RELEASE - "The Protocol"
**Goal**: Polish, balance, content

- [ ] Tutorial/onboarding system
- [ ] Scenario editor
- [ ] Mod support
- [ ] Web client interface
- [ ] Documentation and lore

---

## ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                         GAME CORE                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Engine    │  │   Systems   │  │    Data     │              │
│  │             │  │             │  │             │              │
│  │ • GameLoop  │  │ • Universe  │  │ • Entities  │              │
│  │ • ECS       │  │ • Faction   │  │ • Templates │              │
│  │ • Events    │  │ • Economy   │  │ • Config    │              │
│  │ • Commands  │  │ • Politics  │  │ • Seeds     │              │
│  │ • State     │  │ • Military  │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│                       INTERFACE LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐  ┌───────────────────┐                   │
│  │  Terminal Client  │  │   Web Client      │                   │
│  │                   │  │                   │                   │
│  │ • STRATEGIC View  │  │ • Canvas Render   │                   │
│  │ • TACTICAL View   │  │ • WebSocket       │                   │
│  │ • PERSONAL View   │  │ • Same 3 Views    │                   │
│  │ • Command Input   │  │                   │                   │
│  └───────────────────┘  └───────────────────┘                   │
├─────────────────────────────────────────────────────────────────┤
│                       NETWORK LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Server    │  │    Sync     │  │  Persist    │              │
│  │             │  │             │  │             │              │
│  │ • Sessions  │  │ • State Δ   │  │ • Database  │              │
│  │ • Auth      │  │ • Conflict  │  │ • Snapshots │              │
│  │ • Rooms     │  │ • Broadcast │  │ • Events    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## CORE DESIGN PRINCIPLES

### 1. ORDERS, NOT ACTIONS
You don't move a fleet—you order it to move. The order travels through 
communication channels, arrives at the fleet commander, who interprets it 
based on their competence, loyalty, and circumstances. Delays, 
misinterpretations, and outright refusals are possible.

### 2. INFORMATION IS POWER
You only know what you can see or what others tell you. Intelligence 
gathering is a core gameplay loop. The strategic map shows what your 
faction knows, not objective truth.

### 3. EMERGENT COMPLEXITY
Simple rules create complex outcomes. Factions pursue goals through 
logical decision trees. Economics follow supply/demand. Wars have 
logistics. The galaxy lives whether you're watching or not.

### 4. MEANINGFUL ASYMMETRY  
Every character starts different. Every faction has unique advantages.
Every system has strategic value. No two games should feel identical.

### 5. TIME IS A RESOURCE
Real-time with pause. Or tick-based multiplayer. Orders take time.
Travel takes time. Building takes time. Patience and planning win.

---

## COMMAND INTERFACE PHILOSOPHY

```
┌─────────────────────────────────────────────────────────────────┐
│ NEXUS PROTOCOL v0.1.0                    [STRATEGIC VIEW]       │
│ Cmdr. ASHFORD, J. | Sol Hegemony | Clearance: DELTA             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│         ◉ CENTAURI          ● BARNARD                           │
│        /   \                   \                                │
│   ◉ SOL ----◉ WOLF 359 --------◉ LALANDE                        │
│        \                      /                                 │
│         ◉ EPSILON -----------◉ ROSS 154                         │
│                                                                 │
│ [INTEL] Merchant convoy departed CENTAURI for SOL               │
│ [ALERT] Unidentified fleet signatures detected LALANDE sector   │
│ [COMMS] Priority message from Admiral Chen, Epsilon Station     │
├─────────────────────────────────────────────────────────────────┤
│ > _                                                             │
└─────────────────────────────────────────────────────────────────┘

EXAMPLE COMMANDS:
> view sol                    # Drill into Sol system
> orders                      # View pending orders
> order fleet epsilon "patrol lalande"
> comms read chen             # Read Admiral Chen's message
> comms send chen "Acknowledged. Dispatching reconnaissance."
> intel lalande               # Request intelligence report
> switch tactical             # Switch to TACTICAL view
```

---

## FILE STRUCTURE

```
nexus-protocol/
├── src/
│   ├── index.js              # Entry point
│   ├── core/
│   │   ├── Engine.js         # Game loop, tick management
│   │   ├── ECS.js            # Entity-Component-System
│   │   ├── EventBus.js       # Pub/sub event system
│   │   ├── CommandParser.js  # Natural language commands
│   │   └── StateManager.js   # Game state, save/load
│   ├── systems/
│   │   ├── UniverseSystem.js # Galaxy generation, navigation
│   │   ├── FactionSystem.js  # AI factions, diplomacy
│   │   ├── EconomySystem.js  # Trade, resources, markets
│   │   ├── MilitarySystem.js # Fleets, combat, logistics
│   │   ├── PoliticsSystem.js # Laws, influence, governance
│   │   └── CharacterSystem.js# Player/NPC characters
│   ├── interfaces/
│   │   ├── Terminal.js       # Node.js terminal interface
│   │   ├── StrategicView.js  # Galaxy map renderer
│   │   ├── TacticalView.js   # System/battle renderer
│   │   ├── PersonalView.js   # Character-level renderer
│   │   └── Renderer.js       # ASCII art utilities
│   ├── network/
│   │   ├── Server.js         # WebSocket game server
│   │   ├── Client.js         # Network client
│   │   └── Protocol.js       # Message formats
│   ├── utils/
│   │   ├── Random.js         # Seeded RNG
│   │   ├── Names.js          # Procedural name generation
│   │   └── Format.js         # Text formatting utilities
│   └── data/
│       ├── templates/        # Entity templates
│       ├── events/           # Event definitions
│       └── config.js         # Game configuration
├── public/                   # Web client (future)
├── tests/                    # Test suites
├── docs/                     # Documentation
├── saves/                    # Save files
└── package.json
```

---

## GETTING STARTED

```bash
# Install dependencies
npm install

# Run in development mode (single player)
npm run dev

# Run multiplayer server
npm run server

# Run tests
npm test
```

---

## INFLUENCES & REFERENCES

**Games**:
- Dwarf Fortress (emergent complexity, ASCII interface)
- Aurora 4X (deep simulation, orders-based)
- Crusader Kings (character-driven grand strategy)
- Stars Without Number / Traveller (sci-fi sandbox RPG)
- Trade Wars (BBS door game, MUD economy)
- EVE Online (player-driven politics and economy)

**Literature**:
- Foundation Trilogy (psychohistory, galactic scale)
- Dune (politics, economics, religion intertwined)
- The Expanse (realistic space politics)
- A Fire Upon the Deep (varied tech levels, zones)

**Aesthetic**:
- 1980s military command systems
- MS-DOS interfaces
- Teletext/Ceefax information services
- Air traffic control displays

---

*"The fall of empire is a thing of beauty if you can step back far enough to see it."*
