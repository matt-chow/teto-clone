import { useEffect, useRef, useState, useCallback } from "react";
import { createEmptyBoard, cloneBoard, clearLines } from "../game/board";
import { createBagRNG } from "../game/pieces";
import {
  COLS,
  ROWS,
  CELL_SIZE,
  COLORS,
  GRAVITY_FAST,
  SCORES,
  gravityForLevel,
  LINES_PER_LEVEL,
} from "../game/constants";

// Overlay the active piece onto a copy of the board to render.
function cellsWithCurrentPiece(board, piece) {
  const view = board.map((row) => row.slice());
  const { shape, x, y, id } = piece;

  for (let py = 0; py < shape.length; py++) {
    for (let px = 0; px < shape[py].length; px++) {
      if (!shape[py][px]) continue;
      const gx = x + px;
      const gy = y + py;
      if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
        view[gy][gx] = id; // use piece.id so color matches the tetromino
      }
    }
  }
  return view;
}

function collides(board, piece, dx, dy) {
  const { shape, x, y } = piece;
  for (let py = 0; py < shape.length; py++) {
    for (let px = 0; px < shape[py].length; px++) {
      if (!shape[py][px]) continue;
      const nx = x + px + dx;
      const ny = y + py + dy;

      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx] !== 0) return true;
    }
  }
  return false;
}

function mergePiece(board, piece) {
  const next = cloneBoard(board);
  const { shape, x, y, id } = piece;
  for (let py = 0; py < shape.length; py++) {
    for (let px = 0; px < shape[py].length; px++) {
      if (!shape[py][px]) continue;
      const gx = x + px;
      const gy = y + py;
      if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
        next[gy][gx] = id;
      }
    }
  }
  return next;
}

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

const SIMPLE_KICKS = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [-2, 0],
  [2, 0],
  [0, -1],
];

function tryRotatePiece(board, piece, direction) {
  let rotatedShape;

  if (direction === "cw") {
    rotatedShape = rotateShapeCW(piece.shape);
  } else if (direction === "ccw") {
    rotatedShape = rotateShapeCCW(piece.shape);
  } else {
    rotatedShape = rotateShapeCW(rotateShapeCW(piece.shape));
  }

  const rotated = { ...piece, shape: rotatedShape };

  for (const [dx, dy] of SIMPLE_KICKS) {
    if (!collides(board, rotated, dx, dy)) {
      return { ...rotated, x: rotated.x + dx, y: rotated.y + dy };
    }
  }

  return piece;
}

export default function GameBoard() {
  const [board, setBoard] = useState(() => createEmptyBoard());
  const initDoneRef = useRef(false);

  const bagRef = useRef(null);
  const [piece, setPiece] = useState(null);

  const [dropFast, setDropFast] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(0);

  const rootRef = useRef(null);
  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  const levelRef = useRef(level);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    pieceRef.current = piece;
  }, [piece]);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  const startNewGame = useCallback(() => {
    const rng = createBagRNG();
    bagRef.current = rng;

    const firstPiece = rng.next();
    const emptyBoard = createEmptyBoard();

    boardRef.current = emptyBoard;
    pieceRef.current = firstPiece;
    levelRef.current = 0;

    setBoard(emptyBoard);
    setPiece(firstPiece);
    setDropFast(false);
    setGameOver(false);
    setPaused(false);
    setScore(0);
    setLines(0);
    setLevel(0);
  }, []);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;
    startNewGame();
  }, [startNewGame]);

  const drawNextPiece = useCallback(() => {
    if (!bagRef.current) return null;
    return bagRef.current.next();
  }, []);

  const currentDelay = dropFast ? GRAVITY_FAST : gravityForLevel(level);

  const moveActivePiece = useCallback((dx, dy) => {
    const currentPiece = pieceRef.current;
    const currentBoard = boardRef.current;
    if (!currentPiece) return;
    if (collides(currentBoard, currentPiece, dx, dy)) return;

    const moved = {
      ...currentPiece,
      x: currentPiece.x + dx,
      y: currentPiece.y + dy,
    };
    pieceRef.current = moved;
    setPiece(moved);
  }, []);

  const rotateActivePiece = useCallback((direction) => {
    const currentPiece = pieceRef.current;
    const currentBoard = boardRef.current;
    if (!currentPiece) return;

    const rotated = tryRotatePiece(currentBoard, currentPiece, direction);
    if (rotated === currentPiece) return;

    pieceRef.current = rotated;
    setPiece(rotated);
  }, []);

  // Gravity tick: move down if possible, otherwise lock/clear/spawn.
  const tick = useCallback(() => {
    const currentPiece = pieceRef.current;
    const currentBoard = boardRef.current;
    if (!currentPiece) return;

    if (collides(currentBoard, currentPiece, 0, 1)) {
      const locked = mergePiece(currentBoard, currentPiece);
      const { board: clearedBoard, linesCleared } = clearLines
        ? clearLines(locked)
        : { board: locked, linesCleared: 0 };

      boardRef.current = clearedBoard;
      setBoard(clearedBoard);

      if (linesCleared > 0) {
        const currentLevel = levelRef.current;
        setScore((s) => s + (SCORES?.[linesCleared] || 0) * (currentLevel + 1));
        setLines((ln) => {
          const total = ln + linesCleared;
          const newLevel = Math.floor(total / LINES_PER_LEVEL);
          if (newLevel !== levelRef.current) {
            levelRef.current = newLevel;
            setLevel(newLevel);
          }
          return total;
        });
      }

      const next = drawNextPiece();
      if (!next) return;
      if (collides(clearedBoard, next, 0, 0)) {
        setGameOver(true);
        return;
      }

      pieceRef.current = next;
      setPiece(next);
      return;
    }

    const moved = { ...currentPiece, y: currentPiece.y + 1 };
    pieceRef.current = moved;
    setPiece(moved);
  }, [drawNextPiece]);

  useEffect(() => {
    if (gameOver || paused) return;
    const id = setInterval(tick, currentDelay);
    return () => clearInterval(id);
  }, [tick, currentDelay, gameOver, paused]);

  const onKeyDown = (e) => {
    const key = e.key.toLowerCase();

    if (key === "p") {
      setPaused((p) => !p);
      e.preventDefault();
      return;
    }
    if (key === "r") {
      reset();
      e.preventDefault();
      return;
    }

    if (paused || gameOver) return;

    if (e.key === "ArrowLeft") {
      moveActivePiece(-1, 0);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      moveActivePiece(1, 0);
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      setDropFast(true);
      moveActivePiece(0, 1);
      e.preventDefault();
    } else if (e.key === "ArrowUp" || key === "x") {
      rotateActivePiece("cw");
      e.preventDefault();
    } else if (key === "z") {
      rotateActivePiece("ccw");
      e.preventDefault();
    } else if (key === "a") {
      rotateActivePiece("180");
      e.preventDefault();
    }
  };

  const onKeyUp = (e) => {
    if (e.key === "ArrowDown") setDropFast(false);
  };

  const reset = () => {
    startNewGame();
    rootRef.current?.focus();
  };

  const view = piece ? cellsWithCurrentPiece(board, piece) : board;

  return (
    <div
      style={{
        outline: "2px solid #2f2f36",
        padding: 12,
        display: "inline-block",
        background: "#0d0d12",
        borderRadius: 10,
        userSelect: "none",
      }}
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      aria-label="Tetris game board"
      role="application"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          color: "#cfcfe1",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 14,
        }}
      >
        <div>Score: {score}</div>
        <div>Lines: {lines}</div>
        <div>Level: {level}</div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`,
          gap: 1,
          background: "#22232b",
          border: "1px solid #2f2f36",
          position: "relative",
        }}
        onClick={() => rootRef.current?.focus()}
        title="Click to focus, then use Arrow keys (Up/X rotate CW, Z rotate CCW, A rotate 180, P pause, R reset)"
      >
        {view.map((row, y) =>
          row.map((cell, x) => {
            const filled = cell !== 0;
            return (
              <div
                key={`${y}-${x}`}
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  background: filled ? COLORS[cell] : COLORS[0],
                  borderRadius: 3,
                  boxShadow: filled ? "inset 0 0 3px rgba(0,0,0,0.5)" : "none",
                }}
              />
            );
          }),
        )}

        {(paused || gameOver) && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: 1,
            }}
          >
            {gameOver ? "GAME OVER" : "PAUSED"}
          </div>
        )}
      </div>

      <div style={{ marginTop: 10, color: "#aaa", fontSize: 14 }}>
        P = Pause/Resume · R = Reset · Arrows move · Up/X = CW · Z = CCW · A = 180
      </div>

      <button
        onClick={reset}
        style={{
          marginTop: 8,
          padding: "6px 12px",
          background: "#20232a",
          color: "#fff",
          border: "1px solid #2f2f36",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        Reset
      </button>
    </div>
  );
}