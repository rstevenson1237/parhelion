/**
 * NEXUS PROTOCOL - ASCII Renderer
 * 
 * Utilities for rendering the game in glorious ASCII/ANSI.
 * Evokes 1980s military command systems and DOS interfaces.
 */

// ANSI color codes
export const Colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Bright foreground
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  
  // Background
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Theme presets
export const Themes = {
  military: {
    primary: Colors.green,
    secondary: Colors.cyan,
    warning: Colors.yellow,
    danger: Colors.red,
    info: Colors.blue,
    muted: Colors.gray,
    highlight: Colors.brightGreen,
    border: Colors.green,
    text: Colors.green
  },
  corporate: {
    primary: Colors.cyan,
    secondary: Colors.blue,
    warning: Colors.yellow,
    danger: Colors.red,
    info: Colors.white,
    muted: Colors.gray,
    highlight: Colors.brightCyan,
    border: Colors.blue,
    text: Colors.white
  },
  amber: {
    primary: Colors.yellow,
    secondary: Colors.brightYellow,
    warning: Colors.red,
    danger: Colors.brightRed,
    info: Colors.yellow,
    muted: Colors.gray,
    highlight: Colors.brightYellow,
    border: Colors.yellow,
    text: Colors.yellow
  }
};

// Box drawing characters
export const Box = {
  // Single line
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  leftT: '├',
  rightT: '┤',
  topT: '┬',
  bottomT: '┴',
  cross: '┼',
  
  // Double line
  dTopLeft: '╔',
  dTopRight: '╗',
  dBottomLeft: '╚',
  dBottomRight: '╝',
  dHorizontal: '═',
  dVertical: '║',
  dLeftT: '╠',
  dRightT: '╣',
  dTopT: '╦',
  dBottomT: '╩',
  dCross: '╬'
};

// Map symbols
export const Symbols = {
  star: {
    O: '✦',
    B: '✧',
    A: '☆',
    F: '◇',
    G: '◉',
    K: '●',
    M: '○'
  },
  planet: {
    barren: '○',
    rocky: '◐',
    desert: '◑',
    ocean: '◕',
    temperate: '●',
    ice: '◔',
    gas_giant: '◉',
    volcanic: '◈'
  },
  station: {
    orbital: '□',
    military: '■',
    trade: '◇',
    research: '△',
    mining: '▣',
    shipyard: '▢'
  },
  ship: {
    fighter: '>',
    frigate: '▷',
    cruiser: '▶',
    battleship: '►',
    carrier: '◆',
    transport: '◇'
  },
  misc: {
    route: '─',
    selected: '▶',
    bullet: '•',
    arrow: '→',
    check: '✓',
    cross: '✗',
    warning: '⚠',
    info: 'ℹ'
  }
};

export class Renderer {
  constructor(options = {}) {
    this.width = options.width || 80;
    this.height = options.height || 24;
    this.theme = Themes[options.theme] || Themes.military;
    this.buffer = [];
    this.clearBuffer();
  }

  /**
   * Clear the render buffer
   */
  clearBuffer() {
    this.buffer = Array(this.height).fill(null).map(() => 
      Array(this.width).fill(' ')
    );
  }

  /**
   * Set a character in the buffer
   */
  setChar(x, y, char) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.buffer[y][x] = char;
    }
  }

  /**
   * Write text to buffer
   */
  writeText(x, y, text, maxWidth = null) {
    const max = maxWidth || (this.width - x);
    const truncated = text.length > max ? text.slice(0, max - 3) + '...' : text;
    
    for (let i = 0; i < truncated.length; i++) {
      this.setChar(x + i, y, truncated[i]);
    }
  }

  /**
   * Render buffer to string
   */
  render() {
    return this.buffer.map(row => row.join('')).join('\n');
  }

  /**
   * Apply color to text
   */
  color(text, colorCode) {
    return `${colorCode}${text}${Colors.reset}`;
  }

  /**
   * Apply theme color
   */
  themed(text, type = 'primary') {
    return this.color(text, this.theme[type] || this.theme.text);
  }

  /**
   * Draw a box
   */
  box(x, y, width, height, title = null, double = false) {
    const b = double ? {
      tl: Box.dTopLeft, tr: Box.dTopRight,
      bl: Box.dBottomLeft, br: Box.dBottomRight,
      h: Box.dHorizontal, v: Box.dVertical
    } : {
      tl: Box.topLeft, tr: Box.topRight,
      bl: Box.bottomLeft, br: Box.bottomRight,
      h: Box.horizontal, v: Box.vertical
    };

    // Top border
    let top = b.tl + b.h.repeat(width - 2) + b.tr;
    if (title) {
      const titleText = ` ${title} `;
      const startPos = Math.floor((width - titleText.length) / 2);
      top = b.tl + b.h.repeat(startPos - 1) + titleText + 
            b.h.repeat(width - startPos - titleText.length - 1) + b.tr;
    }
    
    const lines = [top];
    
    // Sides
    for (let i = 0; i < height - 2; i++) {
      lines.push(b.v + ' '.repeat(width - 2) + b.v);
    }
    
    // Bottom border
    lines.push(b.bl + b.h.repeat(width - 2) + b.br);

    return lines.join('\n');
  }

  /**
   * Create a styled header
   */
  header(title, subtitle = null) {
    const width = this.width;
    const lines = [];
    
    lines.push(this.themed(Box.dTopLeft + Box.dHorizontal.repeat(width - 2) + Box.dTopRight, 'border'));
    lines.push(this.themed(Box.dVertical, 'border') + 
               this.themed(title.padStart(Math.floor((width - 2 + title.length) / 2)).padEnd(width - 2), 'highlight') + 
               this.themed(Box.dVertical, 'border'));
    
    if (subtitle) {
      lines.push(this.themed(Box.dVertical, 'border') + 
                 this.themed(subtitle.padStart(Math.floor((width - 2 + subtitle.length) / 2)).padEnd(width - 2), 'muted') + 
                 this.themed(Box.dVertical, 'border'));
    }
    
    lines.push(this.themed(Box.dBottomLeft + Box.dHorizontal.repeat(width - 2) + Box.dBottomRight, 'border'));

    return lines.join('\n');
  }

  /**
   * Create a table
   */
  table(headers, rows, options = {}) {
    const colWidths = headers.map((h, i) => {
      const headerLen = h.length;
      const maxDataLen = rows.reduce((max, row) => 
        Math.max(max, (row[i] || '').toString().length), 0);
      return Math.max(headerLen, maxDataLen) + 2;
    });

    const lines = [];
    const totalWidth = colWidths.reduce((a, b) => a + b, 0) + headers.length + 1;

    // Header
    lines.push(this.themed(
      Box.topLeft + colWidths.map(w => Box.horizontal.repeat(w)).join(Box.topT) + Box.topRight,
      'border'
    ));

    const headerRow = headers.map((h, i) => 
      this.themed(h.padEnd(colWidths[i]), 'highlight')
    ).join(this.themed(Box.vertical, 'border'));
    lines.push(this.themed(Box.vertical, 'border') + headerRow + this.themed(Box.vertical, 'border'));

    // Separator
    lines.push(this.themed(
      Box.leftT + colWidths.map(w => Box.horizontal.repeat(w)).join(Box.cross) + Box.rightT,
      'border'
    ));

    // Rows
    for (const row of rows) {
      const cells = row.map((cell, i) => {
        const str = (cell || '').toString().padEnd(colWidths[i]);
        return options.rowColor ? this.themed(str, options.rowColor) : str;
      }).join(this.themed(Box.vertical, 'border'));
      lines.push(this.themed(Box.vertical, 'border') + cells + this.themed(Box.vertical, 'border'));
    }

    // Footer
    lines.push(this.themed(
      Box.bottomLeft + colWidths.map(w => Box.horizontal.repeat(w)).join(Box.bottomT) + Box.bottomRight,
      'border'
    ));

    return lines.join('\n');
  }

  /**
   * Create a status bar
   */
  statusBar(items) {
    const segments = items.map(item => {
      const color = item.color || 'primary';
      return this.themed(`[${item.label}: ${item.value}]`, color);
    });
    return segments.join(' ');
  }

  /**
   * Create a progress bar
   */
  progressBar(value, max, width = 20, label = null) {
    const percentage = Math.min(1, Math.max(0, value / max));
    const filled = Math.round(percentage * width);
    const empty = width - filled;
    
    const bar = this.themed('█'.repeat(filled), 'primary') + 
                this.themed('░'.repeat(empty), 'muted');
    
    const pctText = `${Math.round(percentage * 100)}%`;
    
    if (label) {
      return `${label}: [${bar}] ${pctText}`;
    }
    return `[${bar}] ${pctText}`;
  }

  /**
   * Render a simple galaxy map
   */
  galaxyMap(stars, routes, viewWidth = 60, viewHeight = 20, options = {}) {
    const { centerX = 50, centerY = 50, zoom = 1, selectedId = null } = options;
    
    // Initialize map buffer
    const map = Array(viewHeight).fill(null).map(() => 
      Array(viewWidth).fill(' ')
    );

    // Calculate bounds
    const halfW = (viewWidth / 2) / zoom;
    const halfH = (viewHeight / 2) / zoom;

    // Helper to convert world coords to screen
    const toScreen = (x, y) => ({
      sx: Math.floor((x - centerX + halfW) * zoom),
      sy: Math.floor((y - centerY + halfH) * zoom)
    });

    // Draw routes first (behind stars)
    for (const route of routes) {
      const from = stars.find(s => s.id === route.from);
      const to = stars.find(s => s.id === route.to);
      
      if (!from || !to) continue;

      const p1 = toScreen(from.position.x, from.position.y);
      const p2 = toScreen(to.position.x, to.position.y);

      // Bresenham's line algorithm
      this.drawLine(map, p1.sx, p1.sy, p2.sx, p2.sy, '·', viewWidth, viewHeight);
    }

    // Draw stars
    for (const star of stars) {
      const { sx, sy } = toScreen(star.position.x, star.position.y);
      
      if (sx >= 0 && sx < viewWidth && sy >= 0 && sy < viewHeight) {
        const symbol = star.id === selectedId ? '◆' : 
                       Symbols.star[star.stellarClass] || '●';
        map[sy][sx] = symbol;
      }
    }

    // Convert to string with coloring
    const lines = [];
    lines.push(this.themed(Box.topLeft + Box.horizontal.repeat(viewWidth) + Box.topRight, 'border'));
    
    for (const row of map) {
      let line = '';
      for (const char of row) {
        if (char === '·') {
          line += this.themed(char, 'muted');
        } else if (char === '◆') {
          line += this.themed(char, 'highlight');
        } else if (Object.values(Symbols.star).includes(char)) {
          line += this.themed(char, 'primary');
        } else {
          line += char;
        }
      }
      lines.push(this.themed(Box.vertical, 'border') + line + this.themed(Box.vertical, 'border'));
    }
    
    lines.push(this.themed(Box.bottomLeft + Box.horizontal.repeat(viewWidth) + Box.bottomRight, 'border'));

    return lines.join('\n');
  }

  /**
   * Draw a line on a 2D buffer using Bresenham's algorithm
   */
  drawLine(buffer, x0, y0, x1, y1, char, width, height) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (buffer[y][x] === ' ') {
          buffer[y][x] = char;
        }
      }

      if (x === x1 && y === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /**
   * Format a message with type styling
   */
  message(text, type = 'info') {
    const prefixes = {
      info: `${this.themed('[INFO]', 'info')} `,
      alert: `${this.themed('[ALERT]', 'warning')} `,
      error: `${this.themed('[ERROR]', 'danger')} `,
      success: `${this.themed('[OK]', 'secondary')} `,
      intel: `${this.themed('[INTEL]', 'primary')} `,
      comms: `${this.themed('[COMMS]', 'secondary')} `,
      system: `${this.themed('[SYSTEM]', 'muted')} `
    };

    return (prefixes[type] || '') + text;
  }

  /**
   * Word wrap text to fit width
   */
  wordWrap(text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxWidth) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
  }

  /**
   * Create a help display for commands
   */
  helpDisplay(commandHelp) {
    if (commandHelp.name) {
      // Single command help
      const lines = [];
      lines.push(this.themed(`Command: ${commandHelp.name}`, 'highlight'));
      lines.push(this.themed(commandHelp.description, 'text'));
      lines.push('');
      lines.push(this.themed('Usage:', 'secondary'));
      lines.push(`  ${commandHelp.usage}`);
      
      if (commandHelp.aliases?.length) {
        lines.push('');
        lines.push(this.themed('Aliases:', 'secondary'));
        lines.push(`  ${commandHelp.aliases.join(', ')}`);
      }

      if (commandHelp.args?.length) {
        lines.push('');
        lines.push(this.themed('Arguments:', 'secondary'));
        for (const arg of commandHelp.args) {
          const req = arg.required ? this.themed('(required)', 'warning') : this.themed('(optional)', 'muted');
          lines.push(`  ${arg.name} ${req} - ${arg.description || ''}`);
        }
      }

      return lines.join('\n');
    } else {
      // Category help
      const lines = [];
      lines.push(this.themed('Available Commands', 'highlight'));
      lines.push('');

      for (const [category, commands] of Object.entries(commandHelp)) {
        lines.push(this.themed(`${category.toUpperCase()}`, 'secondary'));
        for (const cmd of commands) {
          const aliases = cmd.aliases?.length ? ` (${cmd.aliases.join(', ')})` : '';
          lines.push(`  ${this.themed(cmd.name, 'primary')}${this.themed(aliases, 'muted')}`);
          lines.push(`    ${cmd.description}`);
        }
        lines.push('');
      }

      return lines.join('\n');
    }
  }
}

export default Renderer;
