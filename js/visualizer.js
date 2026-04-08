// visualizer.js — Canvas rendering and animation engine

import { CELL } from './maze.js';

// ── Color palette ─────────────────────────────────────────────────────────────
export const COLORS = {
  wall:     '#0a0a0a',
  path:     '#1a2d3a',
  traffic:  '#f59e0b',
  start:    '#00ff88',
  end:      '#f87171',
  visited:  '#0d3f5c',
  frontier: '#0f766e',
  active:   '#00F5FF',
  shortest: '#a78bfa',
  shortestGlow: '#c084fc',
  grid:     '#1e293b',
};

// ── Scalable Vector Graphic Assets ──────────────────────────────────────────────
const SVG_ROAD_STR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#2d3748"/><rect x="47" y="0" width="6" height="30" fill="#fbbf24"/><rect x="47" y="40" width="6" height="30" fill="#fbbf24"/><rect x="47" y="80" width="6" height="30" fill="#fbbf24"/></svg>`;
const SVG_ROAD = `data:image/svg+xml;utf8,${encodeURIComponent(SVG_ROAD_STR)}`;

const SVG_BUILDING_STR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#0f172a"/><rect x="5" y="5" width="90" height="90" fill="#1e293b" stroke="#334155" stroke-width="2"/><rect x="20" y="20" width="20" height="20" fill="#0f172a"/><rect x="60" y="60" width="15" height="15" fill="#334155"/></svg>`;
const SVG_BUILDING = `data:image/svg+xml;utf8,${encodeURIComponent(SVG_BUILDING_STR)}`;

const SVG_CAR_MAIN_STR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200"><rect x="15" y="10" width="70" height="180" rx="30" fill="#ef4444"/><rect x="25" y="50" width="50" height="35" rx="5" fill="#111827"/><rect x="25" y="100" width="50" height="45" rx="5" fill="#111827"/><rect x="10" y="30" width="5" height="40" rx="2" fill="#000"/><rect x="85" y="30" width="5" height="40" rx="2" fill="#000"/><rect x="10" y="130" width="5" height="40" rx="2" fill="#000"/><rect x="85" y="130" width="5" height="40" rx="2" fill="#000"/></svg>`;
const SVG_CAR_MAIN = `data:image/svg+xml;utf8,${encodeURIComponent(SVG_CAR_MAIN_STR)}`;

const SVG_CAR_TRAFFIC_1_STR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200"><rect x="15" y="10" width="70" height="180" rx="15" fill="#3b82f6"/><rect x="25" y="60" width="50" height="30" rx="5" fill="#1e293b"/><rect x="25" y="110" width="50" height="40" rx="5" fill="#1e293b"/></svg>`;
const SVG_CAR_TRAFFIC_1 = `data:image/svg+xml;utf8,${encodeURIComponent(SVG_CAR_TRAFFIC_1_STR)}`;

const SVG_CAR_TRAFFIC_2_STR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200"><rect x="15" y="10" width="70" height="180" rx="15" fill="#eab308"/><rect x="25" y="60" width="50" height="30" rx="5" fill="#1e293b"/><rect x="25" y="110" width="50" height="40" rx="5" fill="#1e293b"/><rect x="40" y="25" width="20" height="15" fill="#000"/><text x="50" y="36" fill="#fff" font-size="10" font-family="sans-serif" text-anchor="middle">TAXI</text></svg>`;
const SVG_CAR_TRAFFIC_2 = `data:image/svg+xml;utf8,${encodeURIComponent(SVG_CAR_TRAFFIC_2_STR)}`;

const SVG_DESTINATION_STR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#10b981"/><circle cx="50" cy="50" r="30" fill="#fff"/><circle cx="50" cy="50" r="20" fill="#10b981"/><circle cx="50" cy="50" r="10" fill="#fff"/></svg>`;
const SVG_DESTINATION = `data:image/svg+xml;utf8,${encodeURIComponent(SVG_DESTINATION_STR)}`;

const IMAGES = {};
function preloadImages() {
  const assets = {
    road: SVG_ROAD,
    building: SVG_BUILDING,
    car_main: SVG_CAR_MAIN,
    traffic_1: SVG_CAR_TRAFFIC_1,
    traffic_2: SVG_CAR_TRAFFIC_2,
    destination: SVG_DESTINATION
  };
  for (const [name, src] of Object.entries(assets)) {
    const img = new Image();
    img.src = src;
    IMAGES[name] = img;
  }
}
preloadImages();

export class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.grid = null;
    this.cellSize = 0;
    this.visitedSet = new Set();
    this.frontierSet = new Set();
    this.pathSet = new Set();
    this.animFrameId = null;
    // Map traffic cells to specific car sprites so they don't flicker
    this.trafficMap = new Map();
  }

  /**
   * Load a new grid and compute cell sizes.
   */
  loadGrid(grid) {
    this.grid = grid;
    this.visitedSet.clear();
    this.frontierSet.clear();
    this.pathSet.clear();

    const rows = grid.length;
    const cols = grid[0].length;

    const maxW = this.canvas.width;
    const maxH = this.canvas.height;
    this.cellSize = Math.max(4, Math.min(Math.floor(maxW / cols), Math.floor(maxH / rows)));

    // Resize canvas to exactly fit
    this.canvas.width = cols * this.cellSize;
    this.canvas.height = rows * this.cellSize;

    this.drawFull();
  }

  /**
   * Draw the entire grid from scratch.
   */
  drawFull() {
    const { ctx, grid, cellSize } = this;
    if (!grid) return;

    const rows = grid.length;
    const cols = grid[0].length;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this._drawCell(r, c);
      }
    }
  }

  /**
   * Draw a single cell based on its state and overlay sets.
   */
  _drawCell(r, c) {
    const { ctx, grid, cellSize } = this;
    const x = c * cellSize;
    const y = r * cellSize;
    const key = `${r},${c}`;
    const cellType = grid[r][c];

    // Base layer: Building or Road
    if (cellType === CELL.WALL) {
      if (IMAGES.building.complete) {
        ctx.drawImage(IMAGES.building, x, y, cellSize, cellSize);
      } else {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    } else {
      if (IMAGES.road.complete) {
        ctx.drawImage(IMAGES.road, x, y, cellSize, cellSize);
      } else {
        ctx.fillStyle = COLORS.path;
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }

    // Pathfinding overlays (semi-transparent)
    if (cellType !== CELL.WALL) {
      let overlayColor = null;
      if (this.pathSet.has(key)) overlayColor = 'rgba(167, 139, 250, 0.4)'; // shortest path (purple)
      else if (this.visitedSet.has(key)) overlayColor = 'rgba(13, 63, 92, 0.4)'; // visited (blue)
      else if (this.frontierSet.has(key)) overlayColor = 'rgba(15, 118, 110, 0.4)'; // frontier
      
      if (overlayColor) {
        ctx.fillStyle = overlayColor;
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }

    // Objects on top: Traffic, Start, Destination
    if (cellType === CELL.TRAFFIC) {
      if (!this.trafficMap.has(key)) {
        this.trafficMap.set(key, Math.random() > 0.5 ? IMAGES.traffic_1 : IMAGES.traffic_2);
      }
      const img = this.trafficMap.get(key);
      const isPath = this.pathSet.has(key);
      if (img && img.complete) {
        const padding = cellSize * 0.15;
        // make traffic cars somewhat faded if they are part of the optimal path to show driving *through* them
        ctx.globalAlpha = isPath ? 0.3 : 1.0;
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.drawImage(img, x + padding, y + padding, cellSize - padding*2, cellSize - padding*2);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      }
    } else if (cellType === CELL.END) {
      if (IMAGES.destination.complete) {
        ctx.drawImage(IMAGES.destination, x, y, cellSize, cellSize);
      }
    } else if (cellType === CELL.START) {
      if (IMAGES.car_main.complete) {
        const padding = cellSize * 0.1;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.drawImage(IMAGES.car_main, x + padding, y + padding, cellSize - padding*2, cellSize - padding*2);
        ctx.shadowBlur = 0;
      }
    }
  }

  /**
   * Animate pathfinding steps.
   * @param {Array} steps  - from pathfinder
   * @param {Array} path   - final path nodes
   * @param {number} speed - ms per step
   * @param {Function} onStep - callback(step, stepIndex, totalSteps)
   * @param {Function} onDone - callback(pathLength, totalVisited)
   */
  animate(steps, path, speed, onStep, onDone) {
    this.stopAnimation();
    this.visitedSet.clear();
    this.frontierSet.clear();
    this.pathSet.clear();
    this.drawFull();

    let i = 0;

    const tick = () => {
      if (i < steps.length) {
        const step = steps[i];
        const [r, c] = step.node;
        const key = `${r},${c}`;

        // Update frontier
        this.frontierSet.clear();
        for (const [fr, fc] of (step.frontier || [])) {
          this.frontierSet.add(`${fr},${fc}`);
        }

        this.visitedSet.add(key);
        this.frontierSet.delete(key);

        // Redraw affected area efficiently
        this._redrawAffected(step);

        onStep && onStep(step, i, steps.length);
        i++;
        this.animFrameId = setTimeout(tick, speed);
      } else {
        // Draw final path
        this._drawPath(path, onDone);
      }
    };

    this.animFrameId = setTimeout(tick, speed);
  }

  _redrawAffected(step) {
    // Redraw current node + frontier nodes
    const toRedraw = [step.node, ...(step.frontier || [])];
    for (const [r, c] of toRedraw) {
      if (r >= 0 && r < this.grid.length && c >= 0 && c < this.grid[0].length) {
        this._drawCell(r, c);
      }
    }
  }

  _drawPath(pathNodes, onDone) {
    let pi = 0;
    const drawNext = () => {
      if (pi < pathNodes.length) {
        const [r, c] = pathNodes[pi];
        const key = `${r},${c}`;
        
        // Remove start marker from old pos immediately so we can "drive" the car
        if (pi > 0) {
           const [pr, pc] = pathNodes[pi-1];
           if (this.grid[pr][pc] === CELL.START) {
               this.grid[pr][pc] = CELL.PATH; // convert original start to path so car isn't duplicated
               this._drawCell(pr, pc);
           } else {
               // Redraw previous to clear car ghost just in case
               this._drawCell(pr, pc);
           }
        }

        if (this.grid[r][c] !== CELL.START && this.grid[r][c] !== CELL.END) {
          this.pathSet.add(key);
        }

        // Draw the car essentially moving along the path
        if (this.grid[r][c] !== CELL.END) {
           const x = c * this.cellSize;
           const y = r * this.cellSize;
           this._drawCell(r, c); // draws base + overlays
           
           // Draw main car on top of the current path node, oriented
           if (IMAGES.car_main.complete) {
              const padding = this.cellSize * 0.1;
              const cx = x + this.cellSize/2;
              const cy = y + this.cellSize/2;
              
              // Determine direction
              let angle = 0;
              if (pi < pathNodes.length - 1) {
                 const [nr, nc] = pathNodes[pi+1];
                 if (nr > r) angle = Math.PI; // down
                 else if (nr < r) angle = 0; // up
                 else if (nc > c) angle = Math.PI/2; // right
                 else if (nc < c) angle = -Math.PI/2; // left
              }

              this.ctx.save();
              this.ctx.translate(cx, cy);
              this.ctx.rotate(angle);
              this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
              this.ctx.shadowBlur = 10;
              this.ctx.drawImage(IMAGES.car_main, -this.cellSize/2 + padding, -this.cellSize/2 + padding, this.cellSize - padding*2, this.cellSize - padding*2);
              this.ctx.restore();
           }
        } else {
           this._drawCell(r, c);
        }

        pi++;
        
        let moveDelay = 40;
        if (this.grid[r][c] === CELL.TRAFFIC) moveDelay = 180; // Slower when driving through traffic
        
        this.animFrameId = setTimeout(drawNext, moveDelay);
      } else {
        onDone && onDone(pathNodes.length, this.visitedSet.size);
      }
    };
    drawNext();
  }

  stopAnimation() {
    if (this.animFrameId) clearTimeout(this.animFrameId);
    this.animFrameId = null;
  }

  reset() {
    this.stopAnimation();
    this.visitedSet.clear();
    this.frontierSet.clear();
    this.pathSet.clear();
    this.trafficMap.clear();
    this.drawFull();
  }
}
