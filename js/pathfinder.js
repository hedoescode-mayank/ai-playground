// pathfinder.js — Pathfinding algorithms with step recording

import { CELL } from './maze.js';

const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const TRAFFIC_COST = 5;

/**
 * Check whether (r, c) is traversable.
 */
function isPassable(grid, r, c) {
  return r >= 0 && r < grid.length && c >= 0 && c < grid[0].length && grid[r][c] !== CELL.WALL;
}

/**
 * Reconstruct path from parent map.
 */
function reconstructPath(parent, start, end) {
  const path = [];
  let cur = end;
  while (cur) {
    path.unshift(cur);
    const key = `${cur[0]},${cur[1]}`;
    cur = parent[key] || null;
    if (cur && cur[0] === start[0] && cur[1] === start[1]) {
      path.unshift(start);
      break;
    }
  }
  return path;
}

// ── BFS ──────────────────────────────────────────────────────────────────────

export function bfs(grid, start, end) {
  const visited = new Set();
  const parent = {};
  const queue = [start];
  const steps = []; // each step: { visited: [r,c], frontier: [[r,c],...] }

  visited.add(`${start[0]},${start[1]}`);

  const explanations = [
    'BFS initialises with the start node in a queue.',
    'BFS dequeues a node and enqueues all unvisited neighbours.',
    'Each node is visited exactly once, guaranteeing the shortest path in an unweighted grid.',
    'All nodes at distance N are explored before distance N+1.',
    'BFS found the destination — tracing back the shortest path.',
  ];
  let exIdx = 0;

  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const key = `${r},${c}`;

    steps.push({
      node: [r, c],
      frontier: queue.map(n => [...n]),
      explanation: explanations[Math.min(exIdx++, explanations.length - 1)],
    });

    if (r === end[0] && c === end[1]) {
      const path = [];
      let cur = end;
      while (cur) {
        path.unshift(cur);
        cur = parent[`${cur[0]},${cur[1]}`] ?? null;
      }
      return { steps, path, found: true };
    }

    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      const nk = `${nr},${nc}`;
      if (isPassable(grid, nr, nc) && !visited.has(nk)) {
        visited.add(nk);
        parent[nk] = [r, c];
        queue.push([nr, nc]);
      }
    }
  }

  return { steps, path: [], found: false };
}

// ── DFS ──────────────────────────────────────────────────────────────────────

export function dfs(grid, start, end) {
  const visited = new Set();
  const parent = {};
  const stack = [start];
  const steps = [];

  const explanations = [
    'DFS pushes the start node onto a stack.',
    'DFS pops the top node and explores as deep as possible before backtracking.',
    'DFS does not guarantee the shortest path — it follows a single branch deeply.',
    'If a dead end is reached, DFS backtracks to the previous decision point.',
    'DFS reached the destination by depth-first traversal.',
  ];
  let exIdx = 0;

  while (stack.length > 0) {
    const [r, c] = stack.pop();
    const key = `${r},${c}`;

    if (visited.has(key)) continue;
    visited.add(key);

    steps.push({
      node: [r, c],
      frontier: stack.map(n => [...n]),
      explanation: explanations[Math.min(exIdx++, explanations.length - 1)],
    });

    if (r === end[0] && c === end[1]) {
      const path = [];
      let cur = end;
      while (cur) {
        path.unshift(cur);
        cur = parent[`${cur[0]},${cur[1]}`] ?? null;
      }
      return { steps, path, found: true };
    }

    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      const nk = `${nr},${nc}`;
      if (isPassable(grid, nr, nc) && !visited.has(nk)) {
        if (!parent[nk]) parent[nk] = [r, c];
        stack.push([nr, nc]);
      }
    }
  }

  return { steps, path: [], found: false };
}

// ── Dijkstra ─────────────────────────────────────────────────────────────────

export function dijkstra(grid, start, end) {
  const dist = {};
  const parent = {};
  const visited = new Set();
  const steps = [];

  // Simple priority queue (min-heap via sorted array for clarity)
  const pq = [{ node: start, cost: 0 }];
  dist[`${start[0]},${start[1]}`] = 0;

  const explanations = [
    'Dijkstra initialises all distances to infinity except the start (cost 0).',
    'Dijkstra always expands the node with the smallest known cost.',
    'Edge weight is 1 for every traversable cell — equal cost grid.',
    'Unlike BFS, Dijkstra can handle variable edge weights.',
    'Dijkstra reached the destination with optimal cost.',
  ];
  let exIdx = 0;

  while (pq.length > 0) {
    pq.sort((a, b) => a.cost - b.cost);
    const { node: [r, c], cost } = pq.shift();
    const key = `${r},${c}`;

    if (visited.has(key)) continue;
    visited.add(key);

    steps.push({
      node: [r, c],
      frontier: pq.map(e => [...e.node]),
      explanation: explanations[Math.min(exIdx++, explanations.length - 1)],
    });

    if (r === end[0] && c === end[1]) {
      const path = [];
      let cur = end;
      while (cur) {
        path.unshift(cur);
        cur = parent[`${cur[0]},${cur[1]}`] ?? null;
      }
      return { steps, path, found: true };
    }

    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      const nk = `${nr},${nc}`;
      
      if (isPassable(grid, nr, nc) && !visited.has(nk)) {
        const moveCost = grid[nr][nc] === CELL.TRAFFIC ? TRAFFIC_COST : 1;
        const newCost = cost + moveCost;
        
        if (dist[nk] === undefined || newCost < dist[nk]) {
          dist[nk] = newCost;
          parent[nk] = [r, c];
          pq.push({ node: [nr, nc], cost: newCost });
        }
      }
    }
  }

  return { steps, path: [], found: false };
}

// ── A* ───────────────────────────────────────────────────────────────────────

function heuristic(a, b) {
  // Manhattan distance
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

export function aStar(grid, start, end) {
  const gScore = {};
  const parent = {};
  const visited = new Set();
  const steps = [];

  gScore[`${start[0]},${start[1]}`] = 0;
  const pq = [{ node: start, f: heuristic(start, end) }];

  const explanations = [
    'A* uses f(n) = g(n) + h(n) where g is the cost from start and h is the Manhattan heuristic.',
    'A* expands the node with the lowest f-score first — smarter than Dijkstra.',
    'The heuristic guides the search toward the goal, reducing unnecessary exploration.',
    'A* is optimal and complete when the heuristic is admissible (never overestimates).',
    'A* reached the destination — this is the optimal path.',
  ];
  let exIdx = 0;

  while (pq.length > 0) {
    pq.sort((a, b) => a.f - b.f);
    const { node: [r, c] } = pq.shift();
    const key = `${r},${c}`;

    if (visited.has(key)) continue;
    visited.add(key);

    steps.push({
      node: [r, c],
      frontier: pq.map(e => [...e.node]),
      explanation: explanations[Math.min(exIdx++, explanations.length - 1)],
    });

    if (r === end[0] && c === end[1]) {
      const path = [];
      let cur = end;
      while (cur) {
        path.unshift(cur);
        cur = parent[`${cur[0]},${cur[1]}`] ?? null;
      }
      return { steps, path, found: true };
    }

    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      const nk = `${nr},${nc}`;
      
      if (isPassable(grid, nr, nc) && !visited.has(nk)) {
        const moveCost = grid[nr][nc] === CELL.TRAFFIC ? TRAFFIC_COST : 1;
        const tentativeG = (gScore[key] ?? Infinity) + moveCost;

        if (tentativeG < (gScore[nk] ?? Infinity)) {
          gScore[nk] = tentativeG;
          parent[nk] = [r, c];
          pq.push({ node: [nr, nc], f: tentativeG + heuristic([nr, nc], end) });
        }
      }
    }
  }

  return { steps, path: [], found: false };
}
