// maze.js — Maze generation algorithms

// Cell states
export const CELL = {
  WALL: 0,
  PATH: 1,
  START: 2,
  END: 3,
  TRAFFIC: 4,
};

/**
 * Create a blank grid filled with walls.
 */
function createGrid(rows, cols) {
  return Array.from({ length: rows }, () => new Array(cols).fill(CELL.WALL));
}

/**
 * Recursive Backtracking (DFS-based perfect maze).
 * Works on odd-dimension grids; carves passages between cells.
 */
export function generateRecursiveBacktracking(rows, cols) {
  // Ensure odd dimensions so walls sit on even indices
  const r = rows % 2 === 0 ? rows - 1 : rows;
  const c = cols % 2 === 0 ? cols - 1 : cols;

  const grid = createGrid(r, c);

  function carve(row, col) {
    grid[row][col] = CELL.PATH;
    const dirs = shuffle([[0, 2], [0, -2], [2, 0], [-2, 0]]);
    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr > 0 && nr < r - 1 && nc > 0 && nc < c - 1 && grid[nr][nc] === CELL.WALL) {
        // Carve the wall between current and neighbour
        grid[row + dr / 2][col + dc / 2] = CELL.PATH;
        carve(nr, nc);
      }
    }
  }

  carve(1, 1);

  // Place start and end
  grid[1][1] = CELL.START;
  grid[r - 2][c - 2] = CELL.END;

  return grid;
}

/**
 * Randomized Prim's algorithm.
 */
export function generatePrims(rows, cols) {
  const r = rows % 2 === 0 ? rows - 1 : rows;
  const c = cols % 2 === 0 ? cols - 1 : cols;

  const grid = createGrid(r, c);

  const inMaze = (row, col) => row > 0 && row < r - 1 && col > 0 && col < c - 1;

  const walls = [];

  function addWalls(row, col) {
    for (const [dr, dc] of [[0, 2], [0, -2], [2, 0], [-2, 0]]) {
      const nr = row + dr;
      const nc = col + dc;
      if (inMaze(nr, nc) && grid[nr][nc] === CELL.WALL) {
        walls.push([row, col, nr, nc, row + dr / 2, col + dc / 2]);
      }
    }
  }

  // Start from (1,1)
  grid[1][1] = CELL.PATH;
  addWalls(1, 1);

  while (walls.length > 0) {
    const idx = Math.floor(Math.random() * walls.length);
    const [, , nr, nc, wr, wc] = walls.splice(idx, 1)[0];

    if (grid[nr][nc] === CELL.WALL) {
      grid[nr][nc] = CELL.PATH;
      grid[wr][wc] = CELL.PATH;
      addWalls(nr, nc);
    }
  }

  grid[1][1] = CELL.START;
  grid[r - 2][c - 2] = CELL.END;

  return grid;
}

/**
 * Add extra passages to reduce difficulty (open some walls randomly).
 */
export function applyDifficulty(grid, difficulty) {
  // difficulty: 'easy' | 'medium' | 'hard'
  const extraPassages = difficulty === 'easy' ? 0.18 : difficulty === 'medium' ? 0.08 : 0.02;
  const rows = grid.length;
  const cols = grid[0].length;

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (grid[r][c] === CELL.WALL && Math.random() < extraPassages) {
        grid[r][c] = CELL.PATH;
      }
    }
  }
  return grid;
}

/**
 * Generate a City Block Layout (Grid of streets and buildings)
 */
export function generateCityBlocks(rows, cols) {
  const r = rows % 2 === 0 ? rows - 1 : rows;
  const c = cols % 2 === 0 ? cols - 1 : cols;
  const grid = createGrid(r, c);

  const blockSize = 3; // Buildings are 2x2 or 3x3

  for (let row = 1; row < r - 1; row++) {
    for (let col = 1; col < c - 1; col++) {
      // Create streets every 'blockSize' cells
      if (row % blockSize === 1 || col % blockSize === 1) {
        grid[row][col] = CELL.PATH;
      }
    }
  }

  // Randomize a bit (maybe knock down some buildings to make bigger parking lots/alleys)
  for (let row = 1; row < r - 1; row++) {
    for (let col = 1; col < c - 1; col++) {
      if (grid[row][col] === CELL.WALL && Math.random() < 0.15) {
        grid[row][col] = CELL.PATH;
      }
    }
  }

  grid[1][1] = CELL.START;
  grid[r - 2][c - 2] = CELL.END;

  return grid;
}

// ── Utility ──────────────────────────────────────────────────────────────────

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Find the (row, col) of a given cell type in the grid.
 */
export function findCell(grid, type) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === type) return [r, c];
    }
  }
  return null;
}
