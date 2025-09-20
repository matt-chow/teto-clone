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

export default function GameBoard() {
  const [board, setBoard] = useState(() => createEmptyBoard());

  // Keep the bag RNG stable across renders.
  const bagRef = useRef(null);
  if (!bagRef.current) bagRef.current = createBagRNG();

  const [piece, setPiece] = useState(() => bagRef.current.next());

  const [dropFast, setDropFast] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(0);

  const rootRef = useRef(null);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  const currentDelay = dropFast ? GRAVITY_FAST : gravityForLevel(level);

  // Gravity tick: move down if possible, otherwise lock/clear/spawn.
  const tick = useCallback(() => {
    setPiece((prev) => {
      if (collides(board, prev, 0, 1)) {
        const locked = mergePiece(board, prev);
        const { board: clearedBoard, linesCleared } = clearLines
          ? clearLines(locked)
          : { board: locked, linesCleared: 0 };
        setBoard(clearedBoard);

        if (linesCleared > 0) {
          setScore((s) => s + (SCORES?.[linesCleared] || 0) * (level + 1));
          setLines((ln) => {
            const total = ln + linesCleared;
            const newLevel = Math.floor(total / LINES_PER_LEVEL);
            if (newLevel !== level) setLevel(newLevel);
            return total;
          });
        }

        const next = bagRef.current.next();
        if (collides(clearedBoard, next, 0, 0)) {
          setGameOver(true);
          return prev;
        }
        return next;
      }
      return { ...prev, y: prev.y + 1 };
    });
  }, [board, level]);

  useEffect(() => {
    if (gameOver || paused) return;
    const id = setInterval(tick, currentDelay);
    return () => clearInterval(id);
  }, [tick, currentDelay, gameOver, paused]);

  const onKeyDown = (e) => {
    if (e.key.toLowerCase() === "p") {
      setPaused((p) => !p);
      e.preventDefault();
      return;
    }
    if (e.key.toLowerCase() === "r") {
      reset();
      e.preventDefault();
      return;
    }

    if (paused || gameOver) return;

    if (e.key === "ArrowLeft") {
      setPiece((p) => (collides(board, p, -1, 0) ? p : { ...p, x: p.x - 1 }));
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      setPiece((p) => (collides(board, p, +1, 0) ? p : { ...p, x: p.x + 1 }));
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      setDropFast(true);
      setPiece((p) => (collides(board, p, 0, +1) ? p : { ...p, y: p.y + 1 }));
      e.preventDefault();
    }
  };

  const onKeyUp = (e) => {
    if (e.key === "ArrowDown") setDropFast(false);
  };

  const reset = () => {
    setBoard(createEmptyBoard());
    bagRef.current = createBagRNG();
    setPiece(bagRef.current.next());
    setDropFast(false);
    setGameOver(false);
    setPaused(false);
    setScore(0);
    setLines(0);
    setLevel(0);
    rootRef.current?.focus();
  };

  const view = cellsWithCurrentPiece(board, piece);

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      style={{
        outline: "2px solid #2f2f36",
        padding: 12,
        display: "inline-block",
        background: "#0d0d12",
        borderRadius: 10,
        userSelect: "none",
      }}
      aria-label="Tetris game board"
      role="application"
    >
      {/* HUD */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          color: "#cfcfe1",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 14,
        }}
      >
        <div>Score: {score}</div>
        <div>Lines: {lines}</div>
        <div>Level: {level}</div>
      </div>

      {/* Grid */}
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
        title="Click to focus, then use Arrow keys (P to pause, R to reset)"
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
          })
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
        P = Pause/Resume · R = Reset · Arrow Left/Right/Down to move
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