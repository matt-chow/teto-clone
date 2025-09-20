import { useEffect, useRef, useState, useCallback } from "react";
import { createEmptyBoard, cloneBoard } from "../game/board";
import { createOPiece } from "../game/pieces";
import {
  COLS,
  ROWS,
  CELL_SIZE,
  COLORS,
  GRAVITY_SLOW,
  GRAVITY_FAST,
} from "../game/constants";

function cellsWithCurrentPiece(board, piece) {
  const view = board.map((row) => row.slice());
  const { shape, x, y } = piece;
  for (let py = 0; py < shape.length; py++) {
    for (let px = 0; px < shape[py].length; px++) {
      if (!shape[py][px]) continue;
      const gx = x + px;
      const gy = y + py;
      if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
        view[gy][gx] = shape[py][px];
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
  const { shape, x, y } = piece;
  for (let py = 0; py < shape.length; py++) {
    for (let px = 0; px < shape[py].length; px++) {
      if (!shape[py][px]) continue;
      const gx = x + px;
      const gy = y + py;
      if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
        next[gy][gx] = shape[py][px];
      }
    }
  }
  return next;
}

export default function GameBoard() {
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [piece, setPiece] = useState(() => createOPiece());
  const [dropFast, setDropFast] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const rootRef = useRef(null);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  const tick = useCallback(() => {
    setPiece((prev) => {
      if (collides(board, prev, 0, 1)) {
        const locked = mergePiece(board, prev);
        setBoard(locked);
        const next = createOPiece();
        if (collides(locked, next, 0, 0)) {
          setGameOver(true);
          return prev;
        }
        return next;
      } else {
        return { ...prev, y: prev.y + 1 };
      }
    });
  }, [board]);

  useEffect(() => {
    if (gameOver) return;
    const delay = dropFast ? GRAVITY_FAST : GRAVITY_SLOW;
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [tick, dropFast, gameOver]);

  const onKeyDown = (e) => {
    if (gameOver) return;
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
    setPiece(createOPiece());
    setDropFast(false);
    setGameOver(false);
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
        padding: 8,
        display: "inline-block",
        background: "#0d0d12",
        borderRadius: 8,
        userSelect: "none",
      }}
      aria-label="Tetris game board"
      role="application"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`,
          gap: 1,
          background: "#22232b",
          border: "1px solid #2f2f36",
        }}
        onClick={() => rootRef.current?.focus()}
        title="Click to focus, then use Arrow keys"
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
      </div>

      <div style={{ marginTop: 10, color: "#aaa", fontSize: 14 }}>
        {gameOver ? (
          <>
            <strong>Game Over.</strong> Press the Reset button below.
          </>
        ) : (
          <>Use Arrow Left/Right/Down. Click the board if keys don’t work.</>
        )}
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