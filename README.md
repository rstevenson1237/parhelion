# NEXUS PROTOCOL

```
╔═══════════════════════════════════════════════════════════════════╗
║  N E X U S   P R O T O C O L                                      ║
║  "In the calculus of empire, every variable is human"             ║
╚═══════════════════════════════════════════════════════════════════╝
```

A grand strategy MUD set in a sprawling galactic civilization. Risk meets Foundation meets Traveller, rendered in glorious ASCII.

## 🌌 Vision

You don't control armies—you **command** them. Orders travel through communication channels, arrive at commanders who interpret them based on competence, loyalty, and circumstances. Information is power; you only know what you can see or what others tell you. The galaxy lives whether you're watching or not.

**Think**: Foundation's psychohistory meets Traveller's gritty spacefaring meets the diplomatic intrigue of Crusader Kings, all through a command-line interface that evokes 1980s military command systems.

## ✨ Features

### Three Interface Modes

1. **STRATEGIC VIEW** - Galaxy-scale map showing star systems as nodes
   - Navigate the cosmos
   - Monitor faction movements
   - Plan grand strategy

2. **TACTICAL VIEW** - System/regional detail
   - Issue orders to fleets and units
   - Watch battles unfold
   - Manage local resources

3. **PERSONAL VIEW** - Character-level interaction
   - Direct control of your commander
   - Manage skills, inventory, contacts
   - Navigate social and political landscapes

### Core Systems

- **Procedural Universe** - Seeded galaxy generation for infinite replayability
- **Command Interpreter** - Natural language orders, not direct control
- **Living Simulation** - Factions pursue goals, economies flow, politics evolve
- **Multiplayer Ready** - WebSocket architecture for persistent shared worlds

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/nexus-protocol.git
cd nexus-protocol

# Install dependencies
npm install

# Run the game
npm start

# Or with options
npm start -- --seed "foundation" --theme amber
```

## 🎮 Basic Commands

```
Navigation:
  view <target>      - Examine a star, planet, or entity
  goto <destination> - Set course for a system
  map                - Display the galaxy map
  switch <view>      - Change interface (strategic/tactical/personal)

Orders:
  order <unit> "<cmd>" - Issue an order to a unit
  orders               - View pending orders

Communication:
  comms read [from]    - Read messages
  comms send <to> "msg" - Send a message
  intel <target>       - Request intelligence report

System:
  status    - Display current status
  time      - View/control game time
  save      - Save current game
  load      - Load a saved game
  help      - Show available commands
  quit      - Exit the game
```

## 📁 Project Structure

```
nexus-protocol/
├── src/
│   ├── index.js              # Entry point
│   ├── Game.js               # Main game orchestrator
│   ├── core/
│   │   ├── Engine.js         # Game loop, tick management
│   │   ├── ECS.js            # Entity-Component-System
│   │   ├── EventBus.js       # Pub/sub events
│   │   └── CommandParser.js  # Command interpretation
│   ├── systems/
│   │   └── UniverseSystem.js # Galaxy generation
│   ├── interfaces/
│   │   ├── Terminal.js       # CLI interface
│   │   └── Renderer.js       # ASCII rendering
│   └── utils/
│       └── Random.js         # Seeded RNG
├── docs/
│   └── ROADMAP.md            # Development plan
├── tests/                    # Test suites
└── saves/                    # Save files
```

## 🗺️ Development Roadmap

### Phase 0: Foundation ← **CURRENT**
- [x] Core architecture
- [x] Entity-Component-System
- [x] Procedural universe generation
- [x] Command interpreter
- [x] Terminal interface
- [ ] Full test coverage

### Phase 1: Alpha - "The Galaxy Lives"
- [ ] Faction AI and diplomacy
- [ ] Economic simulation
- [ ] Military/fleet orders
- [ ] Character skills and progression
- [ ] Event system

### Phase 2: Beta - "The Network"
- [ ] WebSocket multiplayer
- [ ] Persistent world state
- [ ] Database integration
- [ ] Player-to-player interaction

### Phase 3: Release - "The Protocol"
- [ ] Tutorial system
- [ ] Scenario editor
- [ ] Web client interface
- [ ] Mod support

## 🎨 Aesthetic

The interface draws inspiration from:
- 1980s military command systems
- MS-DOS era interfaces
- Teletext/Ceefax information services
- Air traffic control displays
- Classic roguelikes (NetHack, Dwarf Fortress)

Color themes: `military` (green), `corporate` (cyan), `amber` (amber CRT)

## 🧠 Design Philosophy

1. **Orders, Not Actions** - You don't move fleets; you order them to move
2. **Information Is Power** - You only know what you can observe
3. **Emergent Complexity** - Simple rules create complex outcomes
4. **Meaningful Asymmetry** - Every game is different
5. **Time Is A Resource** - Patience and planning win

## 📚 Influences

**Games**: Dwarf Fortress, Aurora 4X, Crusader Kings, EVE Online, Trade Wars

**Literature**: Foundation Trilogy, Dune, The Expanse, A Fire Upon the Deep

## 🛠️ Technical Requirements

- Node.js 18+
- Terminal with ANSI color support
- Minimum 80x24 terminal size

## 🤝 Contributing

Contributions welcome! Please read the development roadmap in `docs/ROADMAP.md` and check existing issues before starting work.

## 📄 License

MIT License - See LICENSE file for details.

---

*"The fall of empire is a thing of beauty if you can step back far enough to see it."*
