import { useEffect, useRef, useState, useCallback } from "react";
import { createEmptyBoard, cloneBoard, clearLines } from "../game/board";
import { createBagRNG } from "../game/pieces";
import {
  COLS,
  ROWS,
  CELL_SIZE,
  COLORS,
  PIECE_IDS,
  GRAVITY_FAST,
  SCORES,
  gravityForLevel,
  LINES_PER_LEVEL,
} from "../game/constants";

const PIECE_TYPES = ["O", "I", "T", "S", "Z", "J", "L"];
const ID_TO_TYPE = Object.fromEntries(
  Object.entries(PIECE_IDS).map(([type, id]) => [id, type]),
);

function countLockedCellsByType(board) {
  const cells = Object.fromEntries(PIECE_TYPES.map((type) => [type, 0]));

  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[y].length; x++) {
      const cell = board[y][x];
      if (!cell) continue;
      const type = ID_TO_TYPE[cell];
      if (type) cells[type] += 1;
    }
  }

  return cells;
}

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

function readDebugConfig() {
  if (typeof window === "undefined") {
    return { enabled: false, seed: undefined };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    enabled: params.has("debugBag"),
    seed: params.get("bagSeed") ?? undefined,
  };
}

export default function GameBoard() {
  const [board, setBoard] = useState(() => createEmptyBoard());
  const debugConfig = useRef(readDebugConfig()).current;
  const [bagLog, setBagLog] = useState([]);
  const [lockedHistory, setLockedHistory] = useState([]);
  const [lockedCountTotal, setLockedCountTotal] = useState(0);
  const debugReadyRef = useRef(false);
  const initDoneRef = useRef(false);

  const bagEventLogger = useCallback((event) => {
    if (!debugReadyRef.current) {
      return;
    }

    if (event.type === "refill") {
      setBagLog((current) => [
        ...current,
        {
          kind: "refill",
          text: `refill #${event.bagNumber}`,
          detail: `order: ${event.bag.join(" ")}`,
        },
      ].slice(-12));
      return;
    }

    const recentSeven = event.recentDraws.slice(-7);
    const uniqueRecentSeven = new Set(recentSeven).size;

    setBagLog((current) => [
      ...current,
      {
        kind: "draw",
        text: `draw #${event.drawCount}: bag ${event.bagNumber} slot ${event.bagSlot}/7 -> ${event.drawn}`,
        detail: `remaining: ${event.remaining.join(" ") || "(empty)"} | last7 unique: ${uniqueRecentSeven}/7`,
      },
    ].slice(-12));
  }, []);

  const bagRef = useRef(null);
  const [piece, setPiece] = useState(null);
  const [bagSnapshot, setBagSnapshot] = useState(() => ({
    remaining: [],
    bagNumber: 0,
    bagSlot: 0,
    bagOrder: [],
    bagConsumed: [],
    drawCount: 0,
    refillCount: 0,
    recentDraws: [],
  }));

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
    const rng = createBagRNG({
      seed: debugConfig.seed,
      onEvent: bagEventLogger,
    });
    bagRef.current = rng;

    const firstPiece = rng.next();
    const firstSnapshot = rng.snapshot();
    const emptyBoard = createEmptyBoard();

    boardRef.current = emptyBoard;
    pieceRef.current = firstPiece;
    levelRef.current = 0;

    setBoard(emptyBoard);
    setPiece(firstPiece);
    setBagSnapshot(firstSnapshot);
    setBagLog([
      {
        kind: "status",
        text: "initial bag state",
        detail: `draws: ${firstSnapshot.drawCount}, bag ${firstSnapshot.bagNumber} slot ${firstSnapshot.bagSlot}/7, active: ${firstPiece.type}`,
      },
    ]);
    setLockedHistory([]);
    setLockedCountTotal(0);
    setDropFast(false);
    setGameOver(false);
    setPaused(false);
    setScore(0);
    setLines(0);
    setLevel(0);
  }, [bagEventLogger, debugConfig.seed]);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    debugReadyRef.current = true;
    if (initDoneRef.current) return;
    initDoneRef.current = true;
    startNewGame();
  }, [startNewGame]);

  const syncBagSnapshot = useCallback(() => {
    if (!bagRef.current) return;
    setBagSnapshot(bagRef.current.snapshot());
  }, []);

  const drawNextPiece = useCallback(() => {
    if (!bagRef.current) return null;
    const next = bagRef.current.next();
    syncBagSnapshot();
    return next;
  }, [syncBagSnapshot]);

  const currentDelay = dropFast ? GRAVITY_FAST : gravityForLevel(level);

  // Gravity tick: move down if possible, otherwise lock/clear/spawn.
  const tick = useCallback(() => {
    const currentPiece = pieceRef.current;
    const currentBoard = boardRef.current;
    if (!currentPiece) return;

    if (collides(currentBoard, currentPiece, 0, 1)) {
      setLockedHistory((current) => [...current, currentPiece.type].slice(-14));
      setLockedCountTotal((count) => count + 1);

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
      setPiece((p) => {
        if (!p) return p;
        return collides(board, p, -1, 0) ? p : { ...p, x: p.x - 1 };
      });
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      setPiece((p) => {
        if (!p) return p;
        return collides(board, p, +1, 0) ? p : { ...p, x: p.x + 1 };
      });
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      setDropFast(true);
      setPiece((p) => {
        if (!p) return p;
        return collides(board, p, 0, +1) ? p : { ...p, y: p.y + 1 };
      });
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
  const lockedCells = countLockedCellsByType(board);
  const lockedApproxPieces = Object.fromEntries(
    PIECE_TYPES.map((type) => [type, Math.floor(lockedCells[type] / 4)]),
  );
  const recentSeven = bagSnapshot.recentDraws.slice(-7);
  const recentSevenUnique = new Set(recentSeven).size;
  const bagOrderWithCursor = (bagSnapshot.bagOrder || []).map((type, index) =>
    index < (bagSnapshot.bagSlot || 0) ? `[${type}]` : type,
  );
  const nextPieces = bagSnapshot.remaining.slice(0, 5);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
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

      <aside
        aria-label="7-bag debug console"
        style={{
          minWidth: 300,
          maxWidth: 380,
          flex: "1 1 320px",
          padding: 12,
          borderRadius: 10,
          border: "1px solid #3a3b45",
          background: "#11131a",
          color: "#d7d8ea",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 12,
          lineHeight: 1.5,
          boxShadow: "0 10px 24px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>7-bag Console</div>
        <div>Mode: {debugConfig.enabled ? "debug" : "live"}</div>
        <div>Seed: {debugConfig.seed ?? "random"}</div>
        <div>Active piece: {piece?.type ?? "(none)"}</div>
        <div>Next pieces: {nextPieces.join(" ") || "(refill on next draw)"}</div>
        <div>Draws: {bagSnapshot.drawCount}</div>
        <div>Locked pieces: {lockedCountTotal}</div>
        <div>Draw - lock delta: {bagSnapshot.drawCount - lockedCountTotal}</div>
        <div>Refills: {bagSnapshot.refillCount}</div>
        <div>Current bag: #{bagSnapshot.bagNumber}</div>
        <div>Current bag slot: {bagSnapshot.bagSlot}/7</div>
        <div style={{ marginTop: 8 }}>Bag order (drawn items are bracketed):</div>
        <div style={{ color: "#a9ddff", wordBreak: "break-word" }}>
          {bagOrderWithCursor.join(" ") || "(unknown)"}
        </div>
        <div style={{ marginTop: 8 }}>Remaining queue:</div>
        <div style={{ color: "#9be28f", wordBreak: "break-word" }}>
          {bagSnapshot.remaining.join(" ") || "(empty)"}
        </div>
        <div style={{ marginTop: 8 }}>Recent draws:</div>
        <div style={{ color: "#f7c873", wordBreak: "break-word" }}>
          {bagSnapshot.recentDraws.join(" ") || "(none)"}
        </div>
        <div>
          Last 7 unique: {recentSevenUnique}/7
          {recentSevenUnique < 7 ? " (can be normal at bag boundaries)" : ""}
        </div>
        <div style={{ marginTop: 8 }}>Locked piece history:</div>
        <div style={{ color: "#f5b5ff", wordBreak: "break-word" }}>
          {lockedHistory.join(" ") || "(none locked yet)"}
        </div>
        <div style={{ marginTop: 8 }}>Locked board cells by type:</div>
        <div style={{ color: "#9dc3ff", wordBreak: "break-word" }}>
          {PIECE_TYPES.map((type) => `${type}:${lockedCells[type]}`).join("  ")}
        </div>
        <div style={{ marginTop: 4 }}>Approx locked pieces by type:</div>
        <div style={{ color: "#9dc3ff", wordBreak: "break-word" }}>
          {PIECE_TYPES.map((type) => `${type}:${lockedApproxPieces[type]}`).join("  ")}
        </div>

        <div style={{ marginTop: 12, borderTop: "1px solid #2b2d36", paddingTop: 10 }}>
          <div style={{ marginBottom: 6, color: "#aeb2c8" }}>Event log</div>
          <div style={{ display: "grid", gap: 6, maxHeight: 360, overflowY: "auto" }}>
            {bagLog.length === 0 ? (
              <div style={{ color: "#7f849c" }}>(waiting for draws)</div>
            ) : (
              bagLog.map((entry, index) => (
                <div
                  key={`${entry.kind}-${index}`}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    background: entry.kind === "refill" ? "#161a24" : "#141822",
                    border: "1px solid #262b38",
                  }}
                >
                  <div style={{ color: entry.kind === "refill" ? "#8bd5ff" : entry.kind === "status" ? "#c2c9ff" : "#c7f0a1" }}>
                    {entry.text}
                  </div>
                  <div style={{ color: "#99a0bf", marginTop: 2 }}>{entry.detail}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}