/**
 * NEXUS PROTOCOL - Tactical View
 *
 * System-level view showing planets, stations, fleets,
 * and detailed information about the current star system.
 */

import { Renderer, Colors, Symbols, Box } from './Renderer.js';

export class TacticalView {
  constructor(game, renderer) {
    this.game = game;
    this.renderer = renderer;
    this.currentSystemId = null;
    this.selectedEntity = null;
    this.options = {
      showOrbits: true,
      showResources: false,
      showFleets: true,
      detailPanel: 'system'  // system, planet, station, fleet
    };
  }

  /**
   * Set the current system to display
   */
  setSystem(systemId) {
    this.currentSystemId = systemId;
    this.selectedEntity = null;
    this.options.detailPanel = 'system';
  }

  /**
   * Render the tactical view
   */
  render(options = {}) {
    const opts = { ...this.options, ...options };

    if (!this.currentSystemId) {
      return this.renderNoSystem();
    }

    const lines = [];

    // Header with system info
    lines.push(this.renderHeader());
    lines.push('');

    // System diagram
    lines.push(this.renderSystemDiagram(opts));
    lines.push('');

    // Detail panel (right side info)
    lines.push(this.renderDetailPanel(opts));

    // Entity lists
    lines.push('');
    lines.push(this.renderEntityLists(opts));

    // Jump routes
    lines.push('');
    lines.push(this.renderJumpRoutes());

    return lines.join('\n');
  }

  /**
   * Render when no system selected
   */
  renderNoSystem() {
    return `
${this.renderer.themed('═══ TACTICAL VIEW ═══', 'highlight')}

${this.renderer.themed('No system selected.', 'warning')}

Use ${this.renderer.themed('goto <system>', 'secondary')} to travel to a star system.
Use ${this.renderer.themed('switch strategic', 'secondary')} to view the galaxy map.
`.trim();
  }

  /**
   * Render header with system name and owner
   */
  renderHeader() {
    const universe = this.game.engine.getSystem('universe');
    const factions = this.game.engine.getSystem('factions');
    const star = universe.getStar(this.currentSystemId);

    if (!star) return 'System data unavailable';

    const owner = factions?.getFactionBySystem(this.currentSystemId);
    const ownerStr = owner ? ` | Controlled by: ${owner.name}` : ' | Unclaimed';

    return `
${this.renderer.themed(`═══ ${star.Identity.name} System ═══`, 'highlight')}
${this.renderer.themed(`${star.Star.spectralClass}-class star${ownerStr}`, 'muted')}
`.trim();
  }

  /**
   * Render ASCII diagram of the star system
   */
  renderSystemDiagram(opts) {
    const universe = this.game.engine.getSystem('universe');
    const star = universe.getStar(this.currentSystemId);
    const planets = Array.from(universe.getPlanetsInSystem(this.currentSystemId));

    // Simple orbital diagram
    const width = 50;
    const height = 7;
    const buffer = Array(height).fill(null).map(() => Array(width).fill(' '));

    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    // Draw star at center
    buffer[centerY][centerX] = Symbols.star[star.Star.spectralClass] || '★';

    // Draw planets in orbits
    planets.forEach(([id, p], index) => {
      const orbitRadius = 3 + index * 4;
      const angle = (index * 137.5) * (Math.PI / 180); // Golden angle

      const px = Math.round(centerX + Math.cos(angle) * Math.min(orbitRadius, width/2 - 2));
      const py = Math.round(centerY + Math.sin(angle) * Math.min(orbitRadius/2, height/2 - 1));

      if (px >= 0 && px < width && py >= 0 && py < height) {
        const symbol = Symbols.planet[p.Planet.planetType] || '○';
        buffer[py][px] = symbol;
      }
    });

    // Find stations
    for (const [id, components] of this.game.entities.query('Tags', 'Orbit', 'Identity')) {
      if (components.Tags.tags.includes('station') &&
          components.Orbit.parentId === this.currentSystemId) {
        const symbol = '□';
        // Place station near edge
        buffer[1][width - 3] = symbol;
      }
    }

    return buffer.map(row => '  ' + row.join('')).join('\n');
  }

  /**
   * Render detail panel based on selection
   */
  renderDetailPanel(opts) {
    switch (opts.detailPanel) {
      case 'system':
        return this.renderSystemDetails();
      case 'planet':
        return this.renderPlanetDetails();
      case 'station':
        return this.renderStationDetails();
      default:
        return this.renderSystemDetails();
    }
  }

  /**
   * Render system overview details
   */
  renderSystemDetails() {
    const universe = this.game.engine.getSystem('universe');
    const economy = this.game.engine.getSystem('economy');
    const star = universe.getStar(this.currentSystemId);
    const planets = Array.from(universe.getPlanetsInSystem(this.currentSystemId));

    const habitablePlanets = planets.filter(([id, p]) => p.Planet.population > 0);
    const totalPop = planets.reduce((sum, [id, p]) => sum + p.Planet.population, 0);

    return `
${this.renderer.themed('SYSTEM OVERVIEW', 'secondary')}
  Star Class: ${star.Star.spectralClass} (${this.getStarDescription(star.Star.spectralClass)})
  Planets: ${planets.length}
  Inhabited: ${habitablePlanets.length}
  Population: ${totalPop.toLocaleString()}
`.trim();
  }

  /**
   * Get star class description
   */
  getStarDescription(spectralClass) {
    const descriptions = {
      O: 'Blue Giant',
      B: 'Blue-White',
      A: 'White',
      F: 'Yellow-White',
      G: 'Yellow (Sol-like)',
      K: 'Orange',
      M: 'Red Dwarf'
    };
    return descriptions[spectralClass] || 'Unknown';
  }

  /**
   * Render lists of entities in system
   */
  renderEntityLists(opts) {
    const universe = this.game.engine.getSystem('universe');
    const planets = Array.from(universe.getPlanetsInSystem(this.currentSystemId));

    const lines = [];

    // Planets table
    if (planets.length > 0) {
      lines.push(this.renderer.themed('PLANETS', 'secondary'));

      const planetData = planets.map(([id, p]) => [
        Symbols.planet[p.Planet.planetType] || '○',
        p.Identity.name,
        p.Planet.planetType,
        p.Planet.atmosphere,
        p.Planet.population > 0 ? p.Planet.population.toLocaleString() : '-'
      ]);

      lines.push(this.renderer.table(
        ['', 'Name', 'Type', 'Atmosphere', 'Population'],
        planetData,
        { compact: true }
      ));
    }

    // Stations
    const stations = [];
    for (const [id, components] of this.game.entities.query('Tags', 'Orbit', 'Identity')) {
      if (components.Tags.tags.includes('station') &&
          components.Orbit.parentId === this.currentSystemId) {
        const stationType = components.Tags.tags.find(t =>
          ['mining', 'trade', 'research', 'military', 'orbital', 'shipyard'].includes(t)
        );
        stations.push([
          Symbols.station[stationType] || '□',
          components.Identity.name,
          stationType || 'unknown'
        ]);
      }
    }

    if (stations.length > 0) {
      lines.push('');
      lines.push(this.renderer.themed('STATIONS', 'secondary'));
      lines.push(this.renderer.table(
        ['', 'Name', 'Type'],
        stations,
        { compact: true }
      ));
    }

    return lines.join('\n');
  }

  /**
   * Render available jump routes
   */
  renderJumpRoutes() {
    const universe = this.game.engine.getSystem('universe');
    const connections = universe.getConnectedSystems(this.currentSystemId);

    if (connections.length === 0) {
      return this.renderer.themed('No jump routes available.', 'warning');
    }

    const lines = [this.renderer.themed('JUMP ROUTES', 'secondary')];

    for (const conn of connections) {
      const targetStar = universe.getStar(conn.id);
      lines.push(`  → ${targetStar?.Identity.name || 'Unknown'} (${conn.distance.toFixed(1)} LY)`);
    }

    return lines.join('\n');
  }

  /**
   * Render planet details (when a planet is selected)
   */
  renderPlanetDetails() {
    if (!this.selectedEntity) return '';

    const planet = this.game.entities.getComponent(this.selectedEntity, 'Planet');
    const identity = this.game.entities.getComponent(this.selectedEntity, 'Identity');
    const resources = this.game.entities.getComponent(this.selectedEntity, 'Resources');

    if (!planet) return '';

    const lines = [
      this.renderer.themed(`PLANET: ${identity?.name || 'Unknown'}`, 'secondary'),
      `  Type: ${planet.planetType}`,
      `  Atmosphere: ${planet.atmosphere}`,
      `  Gravity: ${planet.gravity.toFixed(2)}g`,
      `  Population: ${planet.population.toLocaleString()}`
    ];

    if (resources && Object.keys(resources.stored).length > 0) {
      lines.push('');
      lines.push('  Resources:');
      for (const [resource, amount] of Object.entries(resources.stored)) {
        if (amount > 0) {
          lines.push(`    ${resource}: ${amount.toLocaleString()}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Render station details
   */
  renderStationDetails() {
    if (!this.selectedEntity) return '';

    const identity = this.game.entities.getComponent(this.selectedEntity, 'Identity');
    const market = this.game.entities.getComponent(this.selectedEntity, 'Market');
    const resources = this.game.entities.getComponent(this.selectedEntity, 'Resources');

    const lines = [
      this.renderer.themed(`STATION: ${identity?.name || 'Unknown'}`, 'secondary')
    ];

    if (market) {
      lines.push('');
      lines.push('  Market Prices:');
      for (const [resource, price] of Object.entries(market.prices).slice(0, 5)) {
        lines.push(`    ${resource}: ${price} cr`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Select an entity for detail view
   */
  selectEntity(entityId, type) {
    this.selectedEntity = entityId;
    this.options.detailPanel = type;
  }

  /**
   * Handle view-specific commands
   */
  handleCommand(command, args) {
    switch (command) {
      case 'select':
        // Select planet or station by name
        return this.handleSelect(args[0]);

      case 'toggle':
        if (args[0] === 'orbits') {
          this.options.showOrbits = !this.options.showOrbits;
        } else if (args[0] === 'resources') {
          this.options.showResources = !this.options.showResources;
        }
        return { refresh: true };

      case 'scan':
        return this.handleScan(args[0]);

      default:
        return null;
    }
  }

  /**
   * Handle entity selection
   */
  handleSelect(name) {
    const universe = this.game.engine.getSystem('universe');

    // Try to find planet
    const planets = Array.from(universe.getPlanetsInSystem(this.currentSystemId));
    for (const [id, p] of planets) {
      if (p.Identity.name.toLowerCase().includes(name.toLowerCase())) {
        this.selectEntity(id, 'planet');
        return { refresh: true, message: `Selected ${p.Identity.name}` };
      }
    }

    return { message: `Entity not found: ${name}`, type: 'error' };
  }

  /**
   * Get context-sensitive help
   */
  getHelp() {
    return `
TACTICAL VIEW COMMANDS:
  select <name>     - Select planet/station for details
  scan <target>     - Scan entity for information
  toggle orbits     - Toggle orbital display
  toggle resources  - Toggle resource overlay

  goto <system>     - Jump to another system
  switch strategic  - Return to galaxy view
  switch personal   - Switch to personal view
`.trim();
  }
}

export default TacticalView;
