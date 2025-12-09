/**
 * PARHELION - Web Client
 */

(function() {
  'use strict';
  
  // DOM Elements
  const output = document.getElementById('output');
  const input = document.getElementById('input');
  const status = document.getElementById('status');
  const gameTime = document.getElementById('game-time');
  const locationEl = document.getElementById('location');
  const creditsEl = document.getElementById('credits');
  const canvas = document.getElementById('galaxy-map');
  const mapInfo = document.getElementById('map-info');
  const tooltip = document.getElementById('star-tooltip');
  const ctx = canvas.getContext('2d');
  
  // State
  let ws = null;
  let gameState = null;
  let commandHistory = [];
  let historyIndex = -1;
  let hoveredStar = null;
  let highlightedStar = null;
  
  // Spectral class colors
  const STAR_COLORS = {
    'O': '#9bb0ff',
    'B': '#aabfff',
    'A': '#cad7ff',
    'F': '#f8f7ff',
    'G': '#fff4ea',
    'K': '#ffd2a1',
    'M': '#ffcc6f'
  };
  
  // Star sizes by class
  const STAR_SIZES = {
    'O': 5, 'B': 4.5, 'A': 4, 'F': 3.5, 'G': 3, 'K': 2.5, 'M': 2
  };
  
  /**
   * Connect to WebSocket server
   */
  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    appendOutput(`Connecting to ${window.location.host}...\n`, 'dim');
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      status.textContent = 'ONLINE';
      status.className = 'status connected';
    };
    
    ws.onclose = () => {
      status.textContent = 'OFFLINE';
      status.className = 'status disconnected';
      appendOutput('\n[CONNECTION LOST] Attempting reconnect...\n', 'error');
      setTimeout(connect, 3000);
    };
    
    ws.onerror = () => {
      appendOutput('[CONNECTION ERROR]\n', 'error');
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (e) {
        appendOutput(event.data + '\n');
      }
    };
  }
  
  /**
   * Handle incoming messages from server
   */
  function handleMessage(message) {
    switch (message.type) {
      case 'system':
        appendOutput(message.content + '\n', 'system');
        break;
        
      case 'output':
        appendOutput(message.content + '\n');
        if (message.state) {
          gameState = message.state;
          updateUI();
          renderMap();
        }
        if (message.highlight) {
          highlightStar(message.highlight);
        }
        break;
        
      case 'map':
        appendOutput(message.content + '\n', 'info');
        if (message.state) {
          gameState = message.state;
          updateUI();
          renderMap();
        }
        break;
        
      case 'game_start':
        gameState = message.state;
        updateUI();
        renderMap();
        break;
        
      case 'error':
        appendOutput('[ERROR] ' + message.content + '\n', 'error');
        break;
        
      default:
        if (message.content) {
          appendOutput(message.content + '\n');
        }
    }
  }
  
  /**
   * Append text to terminal output
   */
  function appendOutput(text, className) {
    const span = document.createElement('span');
    if (className) span.className = className;
    span.textContent = text;
    output.appendChild(span);
    output.scrollTop = output.scrollHeight;
  }
  
  /**
   * Send command to server
   */
  function sendCommand(cmd) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      appendOutput('[NOT CONNECTED] Cannot send command.\n', 'error');
      return;
    }
    
    // Echo command
    appendOutput('> ' + cmd + '\n', 'command');
    
    // Add to history
    if (cmd && (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== cmd)) {
      commandHistory.push(cmd);
      if (commandHistory.length > 100) commandHistory.shift();
    }
    historyIndex = commandHistory.length;
    
    // Handle local commands
    const cmdLower = cmd.toLowerCase();
    if (cmdLower === 'clear' || cmdLower === 'cls') {
      output.innerHTML = '';
      return;
    }
    
    if (cmdLower === 'help' && !gameState) {
      showLocalHelp();
      return;
    }
    
    ws.send(JSON.stringify({
      type: 'command',
      content: cmd
    }));
  }
  
  /**
   * Show help before game starts
   */
  function showLocalHelp() {
    appendOutput(`
PARHELION COMMANDS
══════════════════

  new [seed]    Start new game (optional seed for reproducible galaxy)
  clear         Clear terminal output
  help          Show this help

After starting a game:
  map           View galaxy map
  view <star>   View star system details
  status        Show player status
  time          Show/control game time
  save          Save game
  load          Load saved game
  quit          End session

`, 'info');
  }
  
  /**
   * Update UI elements with game state
   */
  function updateUI() {
    if (!gameState) return;
    
    const time = gameState.time;
    gameTime.textContent = `YEAR ${time.years || 0} DAY ${time.days || 0}`;
    
    if (gameState.player) {
      locationEl.textContent = gameState.player.location || 'UNKNOWN SECTOR';
      creditsEl.textContent = `₢ ${(gameState.player.inventory?.credits || 0).toLocaleString()}`;
    }
    
    mapInfo.textContent = `${gameState.stars?.length || 0} SYSTEMS | ${gameState.routes?.length || 0} ROUTES`;
  }
  
  /**
   * Highlight a star on the map
   */
  function highlightStar(name) {
    if (!gameState?.stars) return;
    const nameLower = name.toLowerCase();
    highlightedStar = gameState.stars.find(s => 
      s.name.toLowerCase().includes(nameLower)
    );
    renderMap();
  }
  
  /**
   * Render the galaxy map on canvas
   */
  function renderMap() {
    if (!gameState?.stars) {
      // Draw empty state
      resizeCanvas();
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#238636';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No galaxy data', canvas.width / 2, canvas.height / 2);
      return;
    }
    
    resizeCanvas();
    
    const { stars, routes } = gameState;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (stars.length === 0) return;
    
    // Calculate view bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const star of stars) {
      minX = Math.min(minX, star.x);
      maxX = Math.max(maxX, star.x);
      minY = Math.min(minY, star.y);
      maxY = Math.max(maxY, star.y);
    }
    
    // Add padding
    const padding = 40;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min(
      (canvas.width - padding * 2) / rangeX,
      (canvas.height - padding * 2) / rangeY
    );
    
    const offsetX = padding + (canvas.width - padding * 2 - rangeX * scale) / 2;
    const offsetY = padding + (canvas.height - padding * 2 - rangeY * scale) / 2;
    
    // Transform function
    const toScreen = (x, y) => ({
      x: offsetX + (x - minX) * scale,
      y: offsetY + (y - minY) * scale
    });
    
    // Store screen positions for interaction
    const starPositions = new Map();
    for (const star of stars) {
      starPositions.set(star.id, toScreen(star.x, star.y));
    }
    
    // Draw grid (subtle)
    ctx.strokeStyle = '#ffffff08';
    ctx.lineWidth = 1;
    const gridSize = 50 * scale;
    for (let x = offsetX % gridSize; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = offsetY % gridSize; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Draw routes
    ctx.lineWidth = 1;
    for (const route of routes) {
      const from = starPositions.get(route.from);
      const to = starPositions.get(route.to);
      if (from && to) {
        // Create gradient for route
        const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
        gradient.addColorStop(0, '#00ff8822');
        gradient.addColorStop(0.5, '#00ff8844');
        gradient.addColorStop(1, '#00ff8822');
        ctx.strokeStyle = gradient;
        
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
    }
    
    // Draw stars
    for (const star of stars) {
      const pos = starPositions.get(star.id);
      const color = STAR_COLORS[star.spectralClass] || '#ffffff';
      const baseRadius = STAR_SIZES[star.spectralClass] || 3;

      const isHighlighted = highlightedStar?.id === star.id;
      const isHovered = hoveredStar?.id === star.id;
      const radius = baseRadius * (isHighlighted || isHovered ? 1.5 : 1);

      // Outer glow
      const glowRadius = radius * 4;
      const gradient = ctx.createRadialGradient(
        pos.x, pos.y, 0,
        pos.x, pos.y, glowRadius
      );
      gradient.addColorStop(0, color + (isHighlighted ? 'aa' : '66'));
      gradient.addColorStop(0.5, color + '22');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // Star core
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Highlight ring
      if (isHighlighted) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw player location indicator
    if (gameState.player?.locationId) {
      const playerStar = stars.find(s => s.id === gameState.player.locationId);
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
    
    // Store for mouse interaction
    canvas._starPositions = starPositions;
    canvas._stars = stars;
    canvas._scale = scale;
  }
  
  /**
   * Resize canvas to container
   */
  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const headerHeight = document.getElementById('map-header').offsetHeight;
    const infoHeight = mapInfo.offsetHeight;
    
    canvas.width = rect.width;
    canvas.height = rect.height - headerHeight - infoHeight;
  }
  
  /**
   * Handle mouse movement over map
   */
  function handleMapMouseMove(e) {
    if (!canvas._stars || !canvas._starPositions) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find nearest star
    let nearest = null;
    let nearestDist = Infinity;
    const threshold = 20; // pixels
    
    for (const star of canvas._stars) {
      const pos = canvas._starPositions.get(star.id);
      if (!pos) continue;
      
      const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (dist < threshold && dist < nearestDist) {
        nearest = star;
        nearestDist = dist;
      }
    }
    
    if (nearest !== hoveredStar) {
      hoveredStar = nearest;
      renderMap();
      
      if (nearest) {
        tooltip.innerHTML = `
          <div class="star-name">${nearest.name}</div>
          <div class="star-class">${nearest.spectralClass}-class star</div>
        `;
        tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
        tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
        tooltip.classList.add('visible');
      } else {
        tooltip.classList.remove('visible');
      }
    } else if (nearest) {
      // Update tooltip position
      tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
      tooltip.style.top = (e.clientY - rect.top - 10) + 'px';
    }
  }
  
  /**
   * Handle map click
   */
  function handleMapClick(e) {
    if (hoveredStar) {
      sendCommand(`view ${hoveredStar.name}`);
    }
  }
  
  /**
   * Input event handlers
   */
  input.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'Enter':
        const cmd = input.value.trim();
        if (cmd) {
          sendCommand(cmd);
        }
        input.value = '';
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (historyIndex > 0) {
          historyIndex--;
          input.value = commandHistory[historyIndex];
          // Move cursor to end
          setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
          historyIndex++;
          input.value = commandHistory[historyIndex];
        } else {
          historyIndex = commandHistory.length;
          input.value = '';
        }
        break;
        
      case 'Tab':
        e.preventDefault();
        // Could implement autocomplete here
        break;
    }
  });
  
  // Focus input when clicking terminal area
  document.getElementById('terminal-section').addEventListener('click', () => {
    input.focus();
  });
  
  // Map interactions
  canvas.addEventListener('mousemove', handleMapMouseMove);
  canvas.addEventListener('click', handleMapClick);
  canvas.addEventListener('mouseleave', () => {
    hoveredStar = null;
    tooltip.classList.remove('visible');
    renderMap();
  });
  
  // Window resize
  window.addEventListener('resize', () => {
    if (gameState) renderMap();
  });
  
  /**
   * Boot sequence
   */
  function boot() {
    const bootText = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║     ██████╗  █████╗ ██████╗ ██╗  ██╗███████╗██╗     ██╗ ██████╗ ███╗   ██║║
║     ██╔══██╗██╔══██╗██╔══██╗██║  ██║██╔════╝██║     ██║██╔═══██╗████╗  ██║║
║     ██████╔╝███████║██████╔╝███████║█████╗  ██║     ██║██║   ██║██╔██╗ ██║║
║     ██╔═══╝ ██╔══██║██╔══██╗██╔══██║██╔══╝  ██║     ██║██║   ██║██║╚██╗██║║
║     ██║     ██║  ██║██║  ██║██║  ██║███████╗███████╗██║╚██████╔╝██║ ╚████║║
║     ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝║
║                                                                           ║
║                  Grand Strategy in the Galactic Age                       ║
║                           v0.1.0-alpha                                    ║
╚═══════════════════════════════════════════════════════════════════════════╝

`;
    appendOutput(bootText, 'dim');
    renderMap();
    connect();
  }
  
  // Start
  boot();
  
})();
