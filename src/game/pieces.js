import { COLS, PIECE_IDS } from "./constants.js";
import { getPieceShape } from "./rotation.js";

const PIECE_TYPES = ["O", "I", "T", "S", "Z", "J", "L"];

// Center the piece horizontally by its width.
// In classic rules some pieces have special spawn columns; centering is fine for now.
function spawnX(shape) {
  const w = shape[0].length;
  return Math.floor(COLS / 2) - Math.ceil(w / 2);
}

function spawnPiece(type) {
  const shape = getPieceShape(type, 0);
  if (!shape) return null;

  return {
    type,
    id: PIECE_IDS[type], // numeric id stored on the board
    shape,
    rot: 0, // spawn orientation index used by SRS kicks (0, R, 2, L)
    x: spawnX(shape),
    y: 0, // spawn at top; some blocks will appear partly above (handled in collision)
  };
}

export function createPieceByType(type) {
  if (!PIECE_TYPES.includes(type)) return null;
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
const BAG_PIECES = [...PIECE_TYPES];

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