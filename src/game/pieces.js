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

export function createPieceByType(type) {
  if (!SHAPES[type]) return null;
  return spawnPiece(type);
}

// Fisher–Yates shuffle
function shuffle(arr, random = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hashSeed(seed) {
  const text = String(seed ?? "");
  let hash = 2166136261;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRandom(seed) {
  let state = hashSeed(seed) || 1;

  return function nextRandom() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// 7-bag RNG: each "bag" contains one of each piece; we exhaust and then refill.
const BAG_PIECES = ["O", "I", "T", "S", "Z", "J", "L"];

export function createBagRNG(options = {}) {
  const random =
    typeof options.random === "function"
      ? options.random
      : options.seed !== undefined
        ? createSeededRandom(options.seed)
        : Math.random;

  let bag = [];
  let drawCount = 0;
  let refillCount = 0;
  let recentDraws = [];

  function refill() {
    bag = shuffle([...BAG_PIECES], random);
    refillCount += 1;
  }

  // Initialize the bag immediately
  refill();

  function recordDraw(type) {
    drawCount += 1;
    recentDraws = [...recentDraws, type].slice(-14);
  }

  return {
    next() {
      if (bag.length === 0) {
        refill();
      }
      const type = bag.shift();
      recordDraw(type);
      return spawnPiece(type);
    },
    snapshot() {
      return {
        remaining: [...bag],
        drawCount,
        refillCount,
        recentDraws: [...recentDraws],
      };
    },
  };
}