// app.js — Main controller

import { generateRecursiveBacktracking, generatePrims, generateCityBlocks, applyDifficulty, findCell, CELL } from './maze.js';
import { bfs, dfs, dijkstra, aStar } from './pathfinder.js';
import { Visualizer } from './visualizer.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const canvas          = document.getElementById('maze-canvas');
const btnGenerate     = document.getElementById('btn-generate');
const btnStart        = document.getElementById('btn-start');
const btnReset        = document.getElementById('btn-reset');
const algoSelect      = document.getElementById('algo-select');
const genAlgoSelect   = document.getElementById('gen-algo-select');
const difficultySelect= document.getElementById('difficulty-select');
const speedRange      = document.getElementById('speed-range');

const statAlgo        = document.getElementById('stat-algo');
const statNodes       = document.getElementById('stat-nodes');
const statPath        = document.getElementById('stat-path');
const statTime        = document.getElementById('stat-time');
const aiExplanation   = document.getElementById('ai-explanation');
const progressBar     = document.getElementById('progress-bar');
const progressWrap    = document.getElementById('progress-wrap');

// Landing CTA buttons
document.getElementById('cta-generate')?.addEventListener('click', () => {
  document.getElementById('playground').scrollIntoView({ behavior: 'smooth' });
  setTimeout(generateMaze, 400);
});
document.getElementById('cta-solve')?.addEventListener('click', () => {
  document.getElementById('playground').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => { generateMaze(); startSolving(); }, 600);
});

// ── State ─────────────────────────────────────────────────────────────────────
let currentGrid = null;
let isSolving   = false;
const viz       = new Visualizer(canvas);

// ── City generation ─────────────────────────────────────────────────────────────
function generateMaze() {
  if (isSolving) return;

  const genAlgo  = genAlgoSelect.value;
  const difficulty = difficultySelect ? difficultySelect.value : 'medium';
  const size = difficulty === 'easy' ? 21 : difficulty === 'medium' ? 31 : 41;

  let grid;
  if (genAlgo === 'city') {
      grid = generateCityBlocks(size + 10, size + 10); // city looks better a bit bigger
  } else if (genAlgo === 'prims') {
      grid = generatePrims(size, size);
  } else {
      grid = generateRecursiveBacktracking(size, size);
  }

  if (genAlgo !== 'city') {
      if (difficulty === 'easy') applyDifficulty(grid, 'easy');
      else if (difficulty === 'medium') applyDifficulty(grid, 'medium');
  }

  currentGrid = grid;
  viz.loadGrid(currentGrid);
  resetStats();
  setExplanation('City generated. Draw traffic jams, select an algorithm, and click Start Routing to watch the AI navigate.');
  progressWrap.style.display = 'none';
}

// ── Painting Interaction ──────────────────────────────────────────────────────
const drawModeSelect = document.getElementById('draw-mode');
let isDrawing = false;

function paintCell(e) {
  if (isSolving || !currentGrid) return;
  const rect = canvas.getBoundingClientRect();
  
  // Handle touch and mouse
  let clientX = e.clientX || (e.touches && e.touches[0].clientX);
  let clientY = e.clientY || (e.touches && e.touches[0].clientY);
  
  if (!clientX || !clientY) return;

  const x = clientX - rect.left;
  const y = clientY - rect.top;
  
  const c = Math.floor(x / viz.cellSize);
  const r = Math.floor(y / viz.cellSize);
  
  if (r >= 0 && r < currentGrid.length && c >= 0 && c < currentGrid[0].length) {
    const val = currentGrid[r][c];
    if (val === CELL.START || val === CELL.END) return; 
    
    const mode = drawModeSelect.value;
    if (mode === 'traffic' && val !== CELL.TRAFFIC) currentGrid[r][c] = CELL.TRAFFIC;
    else if (mode === 'wall' && val !== CELL.WALL) currentGrid[r][c] = CELL.WALL;
    else if (mode === 'empty' && val !== CELL.PATH) currentGrid[r][c] = CELL.PATH;
    else return; // no change
    
    viz._drawCell(r, c);
  }
}

canvas.addEventListener('mousedown', (e) => { isDrawing = true; paintCell(e); });
canvas.addEventListener('mousemove', (e) => { if (isDrawing) paintCell(e); });
window.addEventListener('mouseup', () => { isDrawing = false; });

canvas.addEventListener('touchstart', (e) => { isDrawing = true; paintCell(e); }, {passive: true});
canvas.addEventListener('touchmove', (e) => { if (isDrawing) { e.preventDefault(); paintCell(e); } }, {passive: false});
window.addEventListener('touchend', () => { isDrawing = false; });

// ── Pathfinding ───────────────────────────────────────────────────────────────
function startSolving() {
  if (isSolving || !currentGrid) {
    if (!currentGrid) { generateMaze(); return; }
    return;
  }

  const algo = algoSelect.value;
  const start = findCell(currentGrid, CELL.START);
  const end   = findCell(currentGrid, CELL.END);

  if (!start || !end) {
    setExplanation('Could not find start or end cell. Regenerate the maze.');
    return;
  }

  isSolving = true;
  btnStart.disabled = true;
  btnGenerate.disabled = true;

  statAlgo.textContent = algoSelect.options[algoSelect.selectedIndex].text;

  const t0 = performance.now();

  let result;
  switch (algo) {
    case 'bfs':      result = bfs(currentGrid, start, end);      break;
    case 'dfs':      result = dfs(currentGrid, start, end);      break;
    case 'dijkstra': result = dijkstra(currentGrid, start, end); break;
    case 'astar':    result = aStar(currentGrid, start, end);    break;
  }

  const computeTime = (performance.now() - t0).toFixed(1);
  statTime.textContent = `${computeTime} ms (compute)`;

  // Speed: range 1-10 → delay 120ms → 8ms
  const delay = Math.round(130 - algoSpeedDelay());

  progressWrap.style.display = 'block';
  progressBar.style.width = '0%';

  // Reset the visual before animating
  viz.reset();

  viz.animate(
    result.steps,
    result.path,
    delay,
    (step, idx, total) => {
      statNodes.textContent = idx + 1;
      const pct = Math.round(((idx + 1) / total) * 100);
      progressBar.style.width = `${pct}%`;
      setExplanation(step.explanation);
    },
    (pathLen, totalVisited) => {
      isSolving = false;
      btnStart.disabled = false;
      btnGenerate.disabled = false;
      progressBar.style.width = '100%';

      if (result.found) {
        let totalCost = 0;
        result.path.forEach(([r, c]) => {
           if (currentGrid[r][c] === CELL.TRAFFIC) totalCost += 5;
           else totalCost += 1;
        });
        
        const speedMultiplier = (11 - Math.min(10, Math.max(1, algoSpeedDelay()))) * 1.5; 
        const travelTime = Math.round(totalCost * speedMultiplier);
        
        statPath.textContent = `${travelTime} min`;
        setExplanation(
          `Route established. Base optimal cost: ${totalCost}. Estimated travel time factoring in traffic & speed: ${travelTime} minutes. Intersections explored: ${totalVisited}.`
        );
      } else {
        statPath.textContent = `N/A`;
        setExplanation('No route exists — the destination is completely blocked by buildings.');
      }
    }
  );
}

function algoSpeedDelay() {
  return parseInt(speedRange?.value ?? 5, 10);
}

function resetStats() {
  statAlgo.textContent  = '—';
  statNodes.textContent = '0';
  statPath.textContent  = '0 min';
  statTime.textContent  = '0 ms';
}

function setExplanation(text) {
  if (aiExplanation) aiExplanation.textContent = text;
}

// ── Button bindings ───────────────────────────────────────────────────────────
btnGenerate.addEventListener('click', generateMaze);
btnStart.addEventListener('click', startSolving);
btnReset.addEventListener('click', () => {
  if (isSolving) {
    viz.stopAnimation();
    isSolving = false;
    btnStart.disabled = false;
    btnGenerate.disabled = false;
  }
  viz.reset();
  resetStats();
  setExplanation('Simulation reset. You can modify traffic jams or adjust building layouts, then click Start Routing.');
  progressWrap.style.display = 'none';
});

// ── Init ──────────────────────────────────────────────────────────────────────
generateMaze();

// ── Landing animated grid ─────────────────────────────────────────────────────
(function animatedHeroGrid() {
  const heroCanvas = document.getElementById('hero-canvas');
  if (!heroCanvas) return;

  const hCtx = heroCanvas.getContext('2d');
  let w, h, cols, rows, cells;

  function resize() {
    w = heroCanvas.width  = heroCanvas.offsetWidth;
    h = heroCanvas.height = heroCanvas.offsetHeight;
    const sz = 28;
    cols = Math.ceil(w / sz);
    rows = Math.ceil(h / sz);
    cells = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ({
        x: c * sz,
        y: r * sz,
        sz,
        alpha: Math.random(),
        speed: 0.005 + Math.random() * 0.012,
        phase: Math.random() * Math.PI * 2,
      }))
    );
  }

  resize();
  window.addEventListener('resize', resize);

  let t = 0;
  function draw() {
    hCtx.clearRect(0, 0, w, h);
    t += 0.016;
    for (const row of cells) {
      for (const cell of row) {
        const a = 0.04 + 0.18 * Math.abs(Math.sin(t * cell.speed + cell.phase));
        hCtx.strokeStyle = `rgba(0,245,255,${a})`;
        hCtx.lineWidth = 0.5;
        hCtx.strokeRect(cell.x + 1, cell.y + 1, cell.sz - 2, cell.sz - 2);
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
