import { COLS, PIECE_IDS } from "./constants";

// Shapes are matrices with 1s for filled cells; we store the piece id separately.
// Rotation will come later; for now we use these "spawn" orientations.
const SHAPES = {
  O: [
    [1, 1],
    [1, 1],
  ],
  I: [[1, 1, 1, 1]],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

// Center the piece horizontally by its width.
// In classic rules some pieces have special spawn columns; centering is fine for now.
function spawnX(shape) {
  const w = shape[0].length;
  return Math.floor(COLS / 2) - Math.ceil(w / 2);
}

function spawnPiece(type) {
  const shape = SHAPES[type];
  return {
    type,
    id: PIECE_IDS[type], // numeric id stored on the board
    shape,
    x: spawnX(shape),
    y: 0, // spawn at top; some blocks will appear partly above (handled in collision)
  };
}

// Fisher–Yates shuffle
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 7-bag RNG: each "bag" contains one of each piece; we exhaust and then refill.
export function createBagRNG() {
  let bag = [];

  function refill() {
    // Create a fresh array and shuffle it
    const pieces = ["O", "I", "T", "S", "Z", "J", "L"];
    bag = shuffle(pieces);
    console.log("Refilled bag:", bag); // Debug line - remove later
  }

  // Initialize the bag immediately
  refill();

  return {
    next() {
      if (bag.length === 0) {
        refill();
      }
      const type = bag.pop();
      console.log(`Dispensed: ${type}, Remaining:`, bag); // Debug line
      return spawnPiece(type);
    },
  };
}