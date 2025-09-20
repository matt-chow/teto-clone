export const COLS = 10;
export const ROWS = 20;

// Visuals
export const CELL_SIZE = 28; // pixels
export const COLORS = {
  0: "#101014", // empty
  1: "#FFD54F", // O-piece color (amber)
};

// Gravity timings (ms)
export const GRAVITY_SLOW = 800;
export const GRAVITY_FAST = 60; // when holding ArrowDown

// Classic line clear scoring
export const SCORES = {
    1: 100,
    2: 300,
    3: 500,
    4: 800, // "Tetris!"
};

// Gravity delay by level progression (lower levels are faster). Clamp to 100ms minimum.
export function gravityForLevel(level) {
  return Math.max(100, GRAVITY_SLOW - (level - 1) * 60);
}

// Lines needed to level up
export const LINES_PER_LEVEL = 10;