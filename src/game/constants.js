export const COLS = 10;
export const ROWS = 20;

// Visuals
export const CELL_SIZE = 28; // pixels

// Piece IDs (board values). 0 = empty.
// We use numbers so the board can store which piece is in each cell.
export const PIECE_IDS = {
  O: 1,
  I: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
};

// Colors keyed by the board cell value.
// Feel free to tweak to your taste.
export const COLORS = {
  0: "#101014", // empty
  [PIECE_IDS.O]: "#FFD54F", // amber
  [PIECE_IDS.I]: "#64C7FF", // cyan-ish
  [PIECE_IDS.T]: "#B388FF", // purple
  [PIECE_IDS.S]: "#69F0AE", // green
  [PIECE_IDS.Z]: "#FF6E6E", // red
  [PIECE_IDS.J]: "#5C6BC0", // blue
  [PIECE_IDS.L]: "#FFB74D", // orange
};

// Gravity timings (ms)
export const GRAVITY_SLOW = 800;
export const GRAVITY_FAST = 60; // when holding ArrowDown

// Scoring/levels (if you added line clearing already)
export const SCORES = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

export function gravityForLevel(level) {
  return Math.max(100, GRAVITY_SLOW - level * 60);
}

export const LINES_PER_LEVEL = 10;