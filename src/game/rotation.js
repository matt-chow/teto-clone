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
  const { shape, x, y } = piece;
  const cells = [];

  for (let py = 0; py < shape.length; py++) {
    for (let px = 0; px < shape[py].length; px++) {
      if (!shape[py][px]) continue;
      cells.push({ x: x + px + dx, y: y + py + dy, px, py });
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

// SRS kick data adapted for screen coordinates (y grows downward).
const JLSTZ_KICKS = {
  "0>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "1>0": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "1>2": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "2>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "2>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "3>2": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "3>0": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "0>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

const I_KICKS = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

// SRS+ 180 kick data (TETR.IO-style), adapted for y-down coordinates.
const JLSTZ_180_KICKS = {
  "0>2": [[0, 0], [0, -1], [1, -1], [-1, -1], [1, 0], [-1, 0]],
  "1>3": [[0, 0], [1, 0], [1, -2], [1, -1], [0, -2], [0, -1]],
  "2>0": [[0, 0], [0, 1], [-1, 1], [1, 1], [-1, 0], [1, 0]],
  "3>1": [[0, 0], [-1, 0], [-1, -2], [-1, -1], [0, -2], [0, -1]],
};

const I_180_KICKS = {
  "0>2": [[0, 0], [1, 0], [2, 0], [-1, 0], [-2, 0]],
  "1>3": [[0, 0], [0, 1], [0, 2], [0, -1], [0, -2]],
  "2>0": [[0, 0], [-1, 0], [-2, 0], [1, 0], [2, 0]],
  "3>1": [[0, 0], [0, 1], [0, 2], [0, -1], [0, -2]],
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

export function getKickTests(type, fromRot, toRot, dir) {
  if (type === "O") return [[0, 0]];

  const key = `${fromRot}>${toRot}`;
  if (dir === "180") {
    if (type === "I") return I_180_KICKS[key] || [[0, 0]];
    return JLSTZ_180_KICKS[key] || [[0, 0]];
  }

  if (type === "I") return I_KICKS[key] || [[0, 0]];
  return JLSTZ_KICKS[key] || [[0, 0]];
}

function normalizeRotationOptions(optionsOrCollides) {
  if (typeof optionsOrCollides === "function") {
    return {
      collidesFn: optionsOrCollides,
      debug: false,
      onDebug: null,
    };
  }

  const options = optionsOrCollides || {};
  return {
    collidesFn:
      typeof options.collidesFn === "function" ? options.collidesFn : collidesWithBoard,
    debug: options.debug === true,
    onDebug: typeof options.onDebug === "function" ? options.onDebug : null,
  };
}

export function tryRotatePieceSRS(board, piece, direction, optionsOrCollides) {
  const { collidesFn, debug, onDebug } = normalizeRotationOptions(optionsOrCollides);
  const fromRot = piece.rot ?? 0;
  const toRot = rotateState(fromRot, direction);
  const rotatedShape = getRotatedShape(piece.shape, direction);

  const rotated = { ...piece, shape: rotatedShape, rot: toRot };
  const kicks = getKickTests(piece.type, fromRot, toRot, direction);
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
    });
  }

  return piece;
}
