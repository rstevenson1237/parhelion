/**
 * NEXUS PROTOCOL - Strategic View
 *
 * Galaxy-scale map showing star systems, faction territories,
 * trade routes, and fleet movements.
 */

import { Renderer, Colors, Symbols } from './Renderer.js';

export class StrategicView {
  constructor(game, renderer) {
    this.game = game;
    this.renderer = renderer;
    this.options = {
      width: 70,
      height: 20,
      showFactionColors: true,
      showTradeRoutes: false,
      showFleets: true,
      zoom: 0.5,
      centerX: 50,
      centerY: 50
    };
  }

  /**
   * Render the strategic view
   */
  render(options = {}) {
    const opts = { ...this.options, ...options };
    const lines = [];

    // Header
    lines.push(this.renderHeader());
    lines.push('');

    // Galaxy map
    lines.push(this.renderGalaxyMap(opts));

    // Legend
    lines.push('');
    lines.push(this.renderLegend());

    // System list
    lines.push('');
    lines.push(this.renderSystemList(opts));

    // Faction summary
    if (opts.showFactionColors) {
      lines.push('');
      lines.push(this.renderFactionSummary());
    }

    return lines.join('\n');
  }

  /**
   * Render header bar
   */
  renderHeader() {
    const player = this.game.player;
    const tick = this.game.engine?.state.tick || 0;

    return this.renderer.header(
      'STRATEGIC VIEW - Galaxy Map',
      `Tick: ${tick} | ${player?.name || 'Commander'}`
    );
  }

  /**
   * Render the ASCII galaxy map
   */
  renderGalaxyMap(opts) {
    const universe = this.game.engine.getSystem('universe');
    const factions = this.game.engine.getSystem('factions');

    if (!universe) return 'Universe data unavailable';

    // Get stars and routes
    const stars = Array.from(universe.getStars()).map(([id, components]) => {
      const owner = factions?.getFactionBySystem(id);
      return {
        id,
        name: components.Identity.name,
        position: components.Position,
        spectralClass: components.Star.spectralClass,
        owner,
        color: owner?.color || null
      };
    });

    const routes = Array.from(universe.getRoutes()).map(([id, components]) => ({
      from: components.Route.from,
      to: components.Route.to,
      distance: components.Route.distance
    }));

    // Get player location
    const playerLoc = this.game.entities.getComponent(
      this.game.playerEntityId,
      'PlayerLocation'
    );

    return this.renderer.galaxyMap(stars, routes, opts.width, opts.height, {
      ...opts,
      selectedId: playerLoc?.systemId,
      factionColors: opts.showFactionColors
    });
  }

  /**
   * Render map legend
   */
  renderLegend() {
    const parts = [
      `${Symbols.star.G} Star`,
      `${Symbols.misc.selected} Current`,
      `${Symbols.misc.route} Route`
    ];
    return this.renderer.themed('Legend: ', 'muted') + parts.join('  ');
  }

  /**
   * Render list of known systems
   */
  renderSystemList(opts) {
    const universe = this.game.engine.getSystem('universe');
    const factions = this.game.engine.getSystem('factions');
    const stars = Array.from(universe.getStars());

    const lines = [this.renderer.themed('Known Systems:', 'secondary')];

    const displayStars = stars.slice(0, 10);
    for (const [id, components] of displayStars) {
      const owner = factions?.getFactionBySystem(id);
      const ownerStr = owner ? ` [${owner.name.substring(0, 12)}]` : '';
      lines.push(`  ${components.Star.spectralClass} ${components.Identity.name}${ownerStr}`);
    }

    if (stars.length > 10) {
      lines.push(this.renderer.themed(`  ... and ${stars.length - 10} more`, 'muted'));
    }

    return lines.join('\n');
  }

  /**
   * Render faction territory summary
   */
  renderFactionSummary() {
    const factions = this.game.engine.getSystem('factions');
    if (!factions) return '';

    const lines = [this.renderer.themed('Faction Territories:', 'secondary')];

    for (const faction of factions.getFactions()) {
      const colorCode = this.getFactionColorCode(faction.color);
      lines.push(`  ${colorCode}■${Colors.reset} ${faction.name}: ${faction.territory.length} systems`);
    }

    return lines.join('\n');
  }

  /**
   * Get ANSI color code for faction color
   */
  getFactionColorCode(color) {
    const colorMap = {
      red: Colors.red,
      blue: Colors.blue,
      green: Colors.green,
      yellow: Colors.yellow,
      cyan: Colors.cyan,
      magenta: Colors.magenta,
      orange: Colors.brightYellow,
      purple: Colors.brightMagenta
    };
    return colorMap[color] || Colors.white;
  }

  /**
   * Handle view-specific commands
   */
  handleCommand(command, args) {
    switch (command) {
      case 'zoom':
        this.options.zoom = parseFloat(args[0]) || 0.5;
        return { refresh: true };

      case 'center':
        this.options.centerX = parseFloat(args[0]) || 50;
        this.options.centerY = parseFloat(args[1]) || 50;
        return { refresh: true };

      case 'toggle':
        if (args[0] === 'factions') {
          this.options.showFactionColors = !this.options.showFactionColors;
        } else if (args[0] === 'routes') {
          this.options.showTradeRoutes = !this.options.showTradeRoutes;
        } else if (args[0] === 'fleets') {
          this.options.showFleets = !this.options.showFleets;
        }
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
STRATEGIC VIEW COMMANDS:
  zoom <level>      - Set map zoom (0.1-2.0)
  center <x> <y>    - Center map on coordinates
  toggle factions   - Toggle faction colors
  toggle routes     - Toggle trade routes
  toggle fleets     - Toggle fleet display

  goto <system>     - Travel to system
  view <system>     - View system details (switches to TACTICAL)
  factions          - List all factions
  relations         - View diplomatic relations
`.trim();
  }
}

export default StrategicView;
