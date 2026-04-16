function rotateShapeCW(shape) {
  const h = shape.length;
  const w = shape[0].length;
  const rotated = Array.from({ length: w }, () => Array(h).fill(0));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      rotated[x][h - 1 - y] = shape[y][x];
    }
  }

  return rotated;
}

function rotateShapeCCW(shape) {
  const h = shape.length;
  const w = shape[0].length;
  const rotated = Array.from({ length: w }, () => Array(h).fill(0));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      rotated[w - 1 - x][y] = shape[y][x];
    }
  }

  return rotated;
}

function rotateShape180(shape) {
  return rotateShapeCW(rotateShapeCW(shape));
}

function cloneShape(shape) {
  return shape.map((row) => row.slice());
}

function normalizeRot(rot) {
  return ((rot % 4) + 4) % 4;
}

const SPAWN_STATE_SHAPES = {
  O: [
    [1, 1],
    [1, 1],
  ],
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

const SHAPES_BY_ROTATION = Object.fromEntries(
  Object.entries(SPAWN_STATE_SHAPES).map(([type, shape0]) => {
    const state0 = cloneShape(shape0);
    const state1 = rotateShapeCW(state0);
    const state2 = rotateShapeCW(state1);
    const state3 = rotateShapeCW(state2);
    return [type, [state0, state1, state2, state3]];
  }),
);

export function getPieceShape(type, rot = 0) {
  const states = SHAPES_BY_ROTATION[type];
  if (!states) return null;
  return cloneShape(states[normalizeRot(rot)]);
}

function getFilledOffsets(shape) {
  const cells = [];
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      cells.push({ x, y });
    }
  }
  return cells;
}

export function getOccupiedCells(piece, dx = 0, dy = 0) {
  const rot = piece.rot ?? 0;
  return getRotatedCells(piece.type, rot, piece.x + dx, piece.y + dy);
}

export function getRotatedCells(pieceType, rotationState, x = 0, y = 0) {
  const shape = getPieceShape(pieceType, rotationState);
  if (!shape) return [];

  const cells = [];
  for (let py = 0; py < shape.length; py++) {
    for (let px = 0; px < shape[py].length; px++) {
      if (!shape[py][px]) continue;
      cells.push({ x: x + px, y: y + py, px, py });
    }
  }
  return cells;
}

export function formatCells(cells) {
  return cells.map((c) => `(${c.x},${c.y})`).join(" ");
}

export function inspectPlacement(board, piece, dx, dy) {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;

  for (const cell of getOccupiedCells(piece, dx, dy)) {
    const { x, y, px, py } = cell;

    if (x < 0) {
      return {
        fits: false,
        reason: {
          kind: "out-of-bounds",
          edge: "left",
          x,
          y,
          px,
          py,
        },
      };
    }
    if (x >= cols) {
      return {
        fits: false,
        reason: {
          kind: "out-of-bounds",
          edge: "right",
          x,
          y,
          px,
          py,
        },
      };
    }
    if (y >= rows) {
      return {
        fits: false,
        reason: {
          kind: "out-of-bounds",
          edge: "bottom",
          x,
          y,
          px,
          py,
        },
      };
    }
    if (y >= 0 && board[y][x] !== 0) {
      return {
        fits: false,
        reason: {
          kind: "occupied",
          x,
          y,
          px,
          py,
          value: board[y][x],
        },
      };
    }
  }

  return { fits: true, reason: null };
}

function collidesWithBoard(board, piece, dx, dy) {
  return !inspectPlacement(board, piece, dx, dy).fits;
}

// Strict SRS kick data adapted for screen coordinates (y grows downward).
const JLSTZ_KICKS_SRS = {
  "0>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "1>0": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "1>2": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "2>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "2>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "3>2": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "3>0": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "0>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

const I_KICKS_SRS = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

// TETR.IO SRS+ 180 kick data (y-down coordinates).
const JLSTZ_180_KICKS_TETRIO = {
  "0>2": [[0, 0], [0, -1], [1, -1], [-1, -1], [1, 0], [-1, 0]],
  "1>3": [[0, 0], [1, 0], [1, -2], [1, -1], [0, -2], [0, -1]],
  "2>0": [[0, 0], [0, 1], [-1, 1], [1, 1], [-1, 0], [1, 0]],
  "3>1": [[0, 0], [-1, 0], [-1, -2], [-1, -1], [0, -2], [0, -1]],
};

const I_180_KICKS_TETRIO = {
  "0>2": [[0, 0], [1, 0], [2, 0], [-1, 0], [-2, 0]],
  "1>3": [[0, 0], [0, 1], [0, 2], [0, -1], [0, -2]],
  "2>0": [[0, 0], [-1, 0], [-2, 0], [1, 0], [2, 0]],
  "3>1": [[0, 0], [0, 1], [0, 2], [0, -1], [0, -2]],
};

const kickTablesSRS = {
  jlstz: JLSTZ_KICKS_SRS,
  i: I_KICKS_SRS,
};

const kickTablesTetrio180 = {
  jlstz180: JLSTZ_180_KICKS_TETRIO,
  i180: I_180_KICKS_TETRIO,
};

function rotateState(rot, dir) {
  if (dir === "cw") return (rot + 1) % 4;
  if (dir === "ccw") return (rot + 3) % 4;
  return (rot + 2) % 4;
}

function getRotatedShape(shape, dir) {
  if (dir === "cw") return rotateShapeCW(shape);
  if (dir === "ccw") return rotateShapeCCW(shape);
  return rotateShape180(shape);
}

export function getKickOffsets(type, fromRot, toRot, dir, profile = "tetrio") {
  if (type === "O") return [[0, 0]];
  const key = `${fromRot}>${toRot}`;

  if (dir === "180") {
    if (profile !== "tetrio") return [[0, 0]];
    if (type === "I") return kickTablesTetrio180.i180[key] || [[0, 0]];
    return kickTablesTetrio180.jlstz180[key] || [[0, 0]];
  }

  if (type === "I") return kickTablesSRS.i[key] || [[0, 0]];
  return kickTablesSRS.jlstz[key] || [[0, 0]];
}

// Backward-compatible alias used by existing tests.
export function getKickTests(type, fromRot, toRot, dir) {
  return getKickOffsets(type, fromRot, toRot, dir, "tetrio");
}

function normalizeRotationOptions(optionsOrCollides) {
  if (typeof optionsOrCollides === "function") {
    return {
      collidesFn: optionsOrCollides,
      debug: false,
      onDebug: null,
      profile: "tetrio",
    };
  }

  const options = optionsOrCollides || {};
  return {
    collidesFn:
      typeof options.collidesFn === "function" ? options.collidesFn : collidesWithBoard,
    debug: options.debug === true,
    onDebug: typeof options.onDebug === "function" ? options.onDebug : null,
    profile: options.profile === "srs" ? "srs" : "tetrio",
  };
}

export function tryRotatePieceSRS(board, piece, direction, optionsOrCollides) {
  return tryRotate(board, piece, direction, optionsOrCollides);
}

export function tryRotate(board, piece, direction, optionsOrCollides) {
  const { collidesFn, debug, onDebug, profile } = normalizeRotationOptions(optionsOrCollides);
  const fromRot = piece.rot ?? 0;
  const toRot = rotateState(fromRot, direction);
  const rotatedShape = getPieceShape(piece.type, toRot) || getRotatedShape(piece.shape, direction);

  const rotated = { ...piece, shape: rotatedShape, rot: toRot };
  const kicks = getKickOffsets(piece.type, fromRot, toRot, direction, profile);
  const attempts = [];

  const originCells = getOccupiedCells(piece);
  const rawRotatedOffsets = getFilledOffsets(rotatedShape);

  for (const [dx, dy] of kicks) {
    const usingBuiltInCollision = collidesFn === collidesWithBoard;
    const inspection = usingBuiltInCollision
      ? inspectPlacement(board, rotated, dx, dy)
      : null;
    const blocked = usingBuiltInCollision
      ? !inspection.fits
      : collidesFn(board, rotated, dx, dy);

    attempts.push({
      dx,
      dy,
      blocked,
      reason: inspection?.reason || null,
      cells: getOccupiedCells(rotated, dx, dy),
    });

    if (!blocked) {
      const accepted = { ...rotated, x: rotated.x + dx, y: rotated.y + dy };
      if (debug && onDebug) {
        onDebug({
          pieceType: piece.type,
          direction,
          fromRotation: fromRot,
          toRotation: toRot,
          fromX: piece.x,
          fromY: piece.y,
          rawRotatedOffsets,
          originCells,
          attempts,
          acceptedKick: { dx, dy },
          acceptedCells: getOccupiedCells(accepted),
          profile,
        });
      }
      return accepted;
    }
  }

  if (debug && onDebug) {
    onDebug({
      pieceType: piece.type,
      direction,
      fromRotation: fromRot,
      toRotation: toRot,
      fromX: piece.x,
      fromY: piece.y,
      rawRotatedOffsets,
      originCells,
      attempts,
      acceptedKick: null,
      acceptedCells: null,
      profile,
    });
  }

  return piece;
}

export function getRotationAuditSummary() {
  return {
    axis: {
      xIncreasesRight: true,
      yIncreasesDown: true,
    },
    boardIndexing: {
      order: "board[y][x]",
      origin: { x: 0, y: 0 },
    },
    pieceAnchor: "piece.x and piece.y are the top-left cell of the piece bounding box",
    rotationStates: [0, 1, 2, 3],
    stateNames: ["0", "R", "2", "L"],
    kickProfiles: ["srs", "tetrio"],
  };
}
