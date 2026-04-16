import { useEffect, useRef, useState, useCallback } from "react";
import { createEmptyBoard, cloneBoard, clearLines } from "../game/board";
import { createBagRNG, createPieceByType } from "../game/pieces";
import { formatCells, tryRotatePieceSRS } from "../game/rotation";
import { formatDuration } from "../game/sprint";
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

function getGhostPiece(board, piece) {
  let drop = 0;
  while (!collides(board, piece, 0, drop + 1)) {
    drop += 1;
  }
  return { ...piece, y: piece.y + drop };
}

function getPieceCellSet(piece) {
  const cells = new Set();
  const { shape, x, y } = piece;

  for (let py = 0; py < shape.length; py++) {
    for (let px = 0; px < shape[py].length; px++) {
      if (!shape[py][px]) continue;
      const gx = x + px;
      const gy = y + py;
      if (gy < 0 || gy >= ROWS || gx < 0 || gx >= COLS) continue;
      cells.add(`${gx},${gy}`);
    }
  }

  return cells;
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const normalized = clean.length === 3
    ? clean
      .split("")
      .map((c) => c + c)
      .join("")
    : clean;

  const value = Number.parseInt(normalized, 16);
  if (Number.isNaN(value)) {
    return `rgba(255,255,255,${alpha})`;
  }

  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// TETR.IO default lock delay is 30 frames at 60 Hz (~500 ms).
const LOCK_DELAY_MS = 500;
const NEXT_PREVIEW_COUNT = 5;
const PREVIEW_BOX = 4;
const PREVIEW_CELL = 12;

const INPUT_TIMING = {
  DAS_MS: 150,
  ARR_MS: 40,
};

const CONTROL_KEY_CODES = {
  left: ["ArrowLeft"],
  right: ["ArrowRight"],
  softDrop: ["ArrowDown"],
  rotateCW: ["ArrowUp", "KeyX"],
  rotateCCW: ["KeyZ"],
  rotate180: ["KeyA"],
  hardDrop: ["Space"],
  hold: ["KeyC"],
  pause: ["KeyP"],
  reset: ["KeyR"],
};

const CODE_TO_CONTROLS = Object.entries(CONTROL_KEY_CODES).reduce(
  (map, [control, codes]) => {
    codes.forEach((code) => {
      if (!map[code]) map[code] = [];
      map[code].push(control);
    });
    return map;
  },
  {},
);

const REPEATABLE_CONTROLS = ["left", "right"];

const ONE_SHOT_CONTROLS = ["hardDrop", "hold", "pause", "reset"];

const REPEATABLE_CONTROL_SET = new Set(REPEATABLE_CONTROLS);
const ONE_SHOT_CONTROL_SET = new Set(ONE_SHOT_CONTROLS);

function createInitialKeyState() {
  return {
    left: false,
    right: false,
    softDrop: false,
    rotateCW: false,
    rotateCCW: false,
    rotate180: false,
    hardDrop: false,
    hold: false,
    pause: false,
    reset: false,
  };
}

function createInitialRepeatTiming() {
  return {
    left: { pendingInitial: false, nextRepeatAt: 0, pressedAt: 0 },
    right: { pendingInitial: false, nextRepeatAt: 0, pressedAt: 0 },
  };
}

function createInitialQueuedActions() {
  return {
    hardDrop: false,
    hold: false,
    pause: false,
    reset: false,
  };
}

function renderMiniPiece(type) {
  if (!type) {
    return (
      <div
        style={{
          color: "#8e90a6",
          fontSize: 12,
          textAlign: "center",
          padding: "8px 0",
        }}
      >
        Empty
      </div>
    );
  }

  const spawned = createPieceByType(type);
  if (!spawned) {
    return null;
  }

  const { shape, id } = spawned;
  const shapeH = shape.length;
  const shapeW = shape[0].length;
  const offsetX = Math.floor((PREVIEW_BOX - shapeW) / 2);
  const offsetY = Math.floor((PREVIEW_BOX - shapeH) / 2);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${PREVIEW_BOX}, ${PREVIEW_CELL}px)`,
        gridTemplateRows: `repeat(${PREVIEW_BOX}, ${PREVIEW_CELL}px)`,
        gap: 1,
        justifyContent: "center",
      }}
    >
      {Array.from({ length: PREVIEW_BOX * PREVIEW_BOX }, (_, i) => {
        const px = i % PREVIEW_BOX;
        const py = Math.floor(i / PREVIEW_BOX);
        const sx = px - offsetX;
        const sy = py - offsetY;
        const filled =
          sy >= 0 &&
          sy < shapeH &&
          sx >= 0 &&
          sx < shapeW &&
          shape[sy][sx];

        return (
          <div
            key={`mini-${type}-${i}`}
            style={{
              width: PREVIEW_CELL,
              height: PREVIEW_CELL,
              borderRadius: 2,
              background: filled ? COLORS[id] : "#14151d",
              boxShadow: filled ? "inset 0 0 2px rgba(0,0,0,0.35)" : "none",
            }}
          />
        );
      })}
    </div>
  );
}

export default function GameBoard({
  gameMode,
  sprintTargetLines = 40,
  elapsedTimeMs = 0,
  onFirstGameplayInput,
  onSprintProgress,
  onSprintComplete,
  allowManualReset = true,
}) {
  const [board, setBoard] = useState(() => createEmptyBoard());
  const initDoneRef = useRef(false);
  const debugRotation = useRef(
    typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("debugRotation"),
  ).current;

  const bagRef = useRef(null);
  const [piece, setPiece] = useState(null);
  const [holdType, setHoldType] = useState(null);
  const [nextQueue, setNextQueue] = useState([]);

  const [dropFast, setDropFast] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(0);
  const [piecesPlaced, setPiecesPlaced] = useState(0);

  const rootRef = useRef(null);
  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  const levelRef = useRef(level);
  const linesRef = useRef(lines);
  const piecesPlacedRef = useRef(0);
  const hasNotifiedFirstInputRef = useRef(false);
  const lockTimerRef = useRef(null);
  const previewQueueRef = useRef([]);
  const holdUsedRef = useRef(false);
  const pressedKeysRef = useRef(new Set());
  const keyStateRef = useRef(createInitialKeyState());
  const prevKeyStateRef = useRef(createInitialKeyState());
  const repeatTimingRef = useRef(createInitialRepeatTiming());
  const queuedActionsRef = useRef(createInitialQueuedActions());
  const softDropAppliedRef = useRef(false);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    pieceRef.current = piece;
  }, [piece]);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  const isSprintMode = gameMode === "sprint";

  const markFirstGameplayInput = useCallback(() => {
    if (hasNotifiedFirstInputRef.current) return;
    hasNotifiedFirstInputRef.current = true;
    onFirstGameplayInput?.();
  }, [onFirstGameplayInput]);

  const clearLockTimer = useCallback(() => {
    if (lockTimerRef.current === null) return;
    clearTimeout(lockTimerRef.current);
    lockTimerRef.current = null;
  }, []);

  const syncNextQueueState = useCallback(() => {
    setNextQueue(previewQueueRef.current.map((p) => p.type));
  }, []);

  const fillPreviewQueue = useCallback(() => {
    if (!bagRef.current) return;

    while (previewQueueRef.current.length < NEXT_PREVIEW_COUNT) {
      const drawn = bagRef.current.next();
      if (!drawn) break;
      previewQueueRef.current.push(drawn);
    }
  }, []);

  const popNextPiece = useCallback(() => {
    if (!bagRef.current) return null;

    fillPreviewQueue();
    const next = previewQueueRef.current.shift() ?? null;
    fillPreviewQueue();
    syncNextQueueState();
    return next;
  }, [fillPreviewQueue, syncNextQueueState]);

  const startNewGame = useCallback(() => {
    clearLockTimer();

    const rng = createBagRNG();
    bagRef.current = rng;

    const firstPiece = rng.next();
    const emptyBoard = createEmptyBoard();
    previewQueueRef.current = [];
    fillPreviewQueue();

    boardRef.current = emptyBoard;
    pieceRef.current = firstPiece;
    levelRef.current = 0;
    linesRef.current = 0;
    piecesPlacedRef.current = 0;
    hasNotifiedFirstInputRef.current = false;
    holdUsedRef.current = false;

    setBoard(emptyBoard);
    setPiece(firstPiece);
    setHoldType(null);
    syncNextQueueState();
    setDropFast(false);
    setGameOver(false);
    setPaused(false);
    setScore(0);
    setLines(0);
    setLevel(0);
    setPiecesPlaced(0);

    if (isSprintMode) {
      onSprintProgress?.({
        linesCleared: 0,
        totalPiecesPlaced: 0,
        targetLines: sprintTargetLines,
      });
    }
  }, [
    clearLockTimer,
    fillPreviewQueue,
    isSprintMode,
    onSprintProgress,
    sprintTargetLines,
    syncNextQueueState,
  ]);

  const clearInputState = useCallback(() => {
    pressedKeysRef.current.clear();
    keyStateRef.current = createInitialKeyState();
    prevKeyStateRef.current = createInitialKeyState();
    repeatTimingRef.current = createInitialRepeatTiming();
    queuedActionsRef.current = createInitialQueuedActions();
    if (softDropAppliedRef.current) {
      softDropAppliedRef.current = false;
      setDropFast(false);
    }
  }, []);

  const setControlPressed = useCallback((control, isPressed, timestamp) => {
    const currentState = keyStateRef.current[control];
    if (currentState === isPressed) return;

    keyStateRef.current[control] = isPressed;

    if (REPEATABLE_CONTROL_SET.has(control)) {
      const timing = repeatTimingRef.current[control];
      if (isPressed) {
        timing.pendingInitial = true;
        timing.nextRepeatAt = timestamp;
        timing.pressedAt = timestamp;
      } else {
        timing.pendingInitial = false;
        timing.nextRepeatAt = 0;
        timing.pressedAt = 0;
      }
    }

    if (isPressed && ONE_SHOT_CONTROL_SET.has(control)) {
      queuedActionsRef.current[control] = true;
    }
  }, []);

  const syncControlForCode = useCallback((code, isPressed, timestamp) => {
    const controls = CODE_TO_CONTROLS[code];
    if (!controls) return;

    if (isPressed) {
      pressedKeysRef.current.add(code);
    } else {
      pressedKeysRef.current.delete(code);
    }

    controls.forEach((control) => {
      const pressed = CONTROL_KEY_CODES[control].some((boundCode) =>
        pressedKeysRef.current.has(boundCode),
      );
      setControlPressed(control, pressed, timestamp);
    });
  }, [setControlPressed]);

  const pollRepeatControl = useCallback((
    control,
    now,
    initialDelay,
    repeatInterval,
    allowFire = true,
  ) => {
    if (!keyStateRef.current[control]) return false;

    const timing = repeatTimingRef.current[control];
    if (timing.pendingInitial && now >= timing.nextRepeatAt) {
      timing.pendingInitial = false;
      timing.nextRepeatAt = now + initialDelay;
      return allowFire;
    }

    if (now >= timing.nextRepeatAt) {
      timing.nextRepeatAt = now + repeatInterval;
      return allowFire;
    }

    return false;
  }, []);

  const reset = useCallback(() => {
    clearInputState();
    startNewGame();
    rootRef.current?.focus();
  }, [clearInputState, startNewGame]);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;
    startNewGame();
  }, [startNewGame]);

  const drawNextPiece = useCallback(() => {
    return popNextPiece();
  }, [popNextPiece]);

  const currentDelay = dropFast ? GRAVITY_FAST : gravityForLevel(level);

  const lockCurrentPiece = useCallback(() => {
    const currentPiece = pieceRef.current;
    const currentBoard = boardRef.current;
    if (!currentPiece) return;

    if (!collides(currentBoard, currentPiece, 0, 1)) return;

    clearLockTimer();

    const locked = mergePiece(currentBoard, currentPiece);
    const { board: clearedBoard, linesCleared } = clearLines
      ? clearLines(locked)
      : { board: locked, linesCleared: 0 };

    boardRef.current = clearedBoard;
    setBoard(clearedBoard);

    const nextPiecesPlaced = piecesPlacedRef.current + 1;
    piecesPlacedRef.current = nextPiecesPlaced;
    setPiecesPlaced(nextPiecesPlaced);

    const nextTotalLines = linesRef.current + linesCleared;
    linesRef.current = nextTotalLines;

    if (linesCleared > 0) {
      const currentLevel = levelRef.current;
      setScore((s) => s + (SCORES?.[linesCleared] || 0) * (currentLevel + 1));
      setLines(nextTotalLines);

      const newLevel = Math.floor(nextTotalLines / LINES_PER_LEVEL);
      if (newLevel !== levelRef.current) {
        levelRef.current = newLevel;
        setLevel(newLevel);
      }
    }

    if (isSprintMode) {
      onSprintProgress?.({
        linesCleared: nextTotalLines,
        totalPiecesPlaced: nextPiecesPlaced,
        targetLines: sprintTargetLines,
      });

      if (nextTotalLines >= sprintTargetLines) {
        setGameOver(true);
        onSprintComplete?.({
          linesCleared: nextTotalLines,
          totalPiecesPlaced: nextPiecesPlaced,
        });
        return;
      }
    }

    const next = drawNextPiece();
    if (!next) return;
    holdUsedRef.current = false;
    if (collides(clearedBoard, next, 0, 0)) {
      setGameOver(true);
      return;
    }

    pieceRef.current = next;
    setPiece(next);
  }, [
    clearLockTimer,
    drawNextPiece,
    isSprintMode,
    onSprintComplete,
    onSprintProgress,
    sprintTargetLines,
  ]);

  const scheduleLockTimer = useCallback(() => {
    if (lockTimerRef.current !== null) return;

    lockTimerRef.current = setTimeout(() => {
      lockTimerRef.current = null;
      lockCurrentPiece();
    }, LOCK_DELAY_MS);
  }, [lockCurrentPiece]);

  const moveActivePiece = useCallback((dx, dy) => {
    const currentPiece = pieceRef.current;
    const currentBoard = boardRef.current;
    if (!currentPiece) return;
    if (collides(currentBoard, currentPiece, dx, dy)) {
      if (dy > 0 && collides(currentBoard, currentPiece, 0, 1)) {
        scheduleLockTimer();
      }
      return;
    }

    const moved = {
      ...currentPiece,
      x: currentPiece.x + dx,
      y: currentPiece.y + dy,
    };

    if (collides(currentBoard, moved, 0, 1)) {
      clearLockTimer();
      scheduleLockTimer();
    } else {
      clearLockTimer();
    }

    pieceRef.current = moved;
    setPiece(moved);
  }, [clearLockTimer, scheduleLockTimer]);

  const rotateActivePiece = useCallback((direction) => {
    const currentPiece = pieceRef.current;
    const currentBoard = boardRef.current;
    if (!currentPiece) return;

    const rotated = tryRotatePieceSRS(currentBoard, currentPiece, direction, {
      debug: debugRotation,
      onDebug: (info) => {
        if (!debugRotation || typeof console === "undefined") return;

        console.groupCollapsed(
          `[rotation] ${info.pieceType} ${direction.toUpperCase()} ${info.fromRotation}->${info.toRotation} @ (${info.fromX},${info.fromY})`,
        );
        console.log("origin cells:", formatCells(info.originCells));
        console.log("raw rotated offsets:", formatCells(info.rawRotatedOffsets));

        info.attempts.forEach((attempt, idx) => {
          const status = attempt.blocked ? "fail" : "pass";
          const reason = attempt.reason
            ? JSON.stringify(attempt.reason)
            : "none";
          console.log(
            `[kick ${idx + 1}] dx=${attempt.dx}, dy=${attempt.dy} -> ${status}; reason=${reason}; cells=${formatCells(attempt.cells)}`,
          );
        });

        if (info.acceptedKick) {
          console.log(
            `accepted kick: dx=${info.acceptedKick.dx}, dy=${info.acceptedKick.dy}; cells=${formatCells(info.acceptedCells || [])}`,
          );
        } else {
          console.log("rotation failed: no legal kick found");
        }
        console.groupEnd();
      },
    });
    if (rotated === currentPiece) return;

    if (collides(currentBoard, rotated, 0, 1)) {
      clearLockTimer();
      scheduleLockTimer();
    } else {
      clearLockTimer();
    }

    pieceRef.current = rotated;
    setPiece(rotated);
  }, [clearLockTimer, debugRotation, scheduleLockTimer]);

  const hardDropActivePiece = useCallback(() => {
    const currentPiece = pieceRef.current;
    const currentBoard = boardRef.current;
    if (!currentPiece) return;

    let dropped = currentPiece;
    while (!collides(currentBoard, dropped, 0, 1)) {
      dropped = { ...dropped, y: dropped.y + 1 };
    }

    clearLockTimer();
    pieceRef.current = dropped;
    setPiece(dropped);
    lockCurrentPiece();
  }, [clearLockTimer, lockCurrentPiece]);

  const holdActivePiece = useCallback(() => {
    const currentPiece = pieceRef.current;
    const currentBoard = boardRef.current;
    if (!currentPiece || holdUsedRef.current) return;

    clearLockTimer();

    if (!holdType) {
      setHoldType(currentPiece.type);
      const next = popNextPiece();
      if (!next) return;
      if (collides(currentBoard, next, 0, 0)) {
        setGameOver(true);
        return;
      }

      pieceRef.current = next;
      setPiece(next);
      holdUsedRef.current = true;
      return;
    }

    const swapped = createPieceByType(holdType);
    if (!swapped) return;
    if (collides(currentBoard, swapped, 0, 0)) {
      setGameOver(true);
      return;
    }

    setHoldType(currentPiece.type);
    pieceRef.current = swapped;
    setPiece(swapped);
    holdUsedRef.current = true;
  }, [clearLockTimer, holdType, popNextPiece]);

  // Gravity tick: move down if possible, otherwise lock/clear/spawn.
  const tick = useCallback(() => {
    const currentPiece = pieceRef.current;
    const currentBoard = boardRef.current;
    if (!currentPiece) return;

    if (collides(currentBoard, currentPiece, 0, 1)) {
      scheduleLockTimer();
      return;
    }

    clearLockTimer();
    const moved = { ...currentPiece, y: currentPiece.y + 1 };
    pieceRef.current = moved;
    setPiece(moved);
  }, [clearLockTimer, scheduleLockTimer]);

  useEffect(() => {
    if (gameOver || paused) return;
    const id = setInterval(tick, currentDelay);
    return () => clearInterval(id);
  }, [tick, currentDelay, gameOver, paused]);

  useEffect(() => {
    if (paused || gameOver) {
      clearLockTimer();
    }
  }, [paused, gameOver, clearLockTimer]);

  useEffect(() => {
    return () => {
      clearLockTimer();
    };
  }, [clearLockTimer]);

  const processInputFrame = useCallback((now) => {
    const currentKeyState = keyStateRef.current;
    const prevKeyState = prevKeyStateRef.current;
    const commitKeyFrame = () => {
      prevKeyStateRef.current = { ...currentKeyState };
    };

    const queued = queuedActionsRef.current;

    if (queued.pause) {
      queued.pause = false;
      setPaused((prev) => !prev);
      commitKeyFrame();
      return;
    }

    if (queued.reset) {
      queued.reset = false;
      if (allowManualReset) {
        reset();
      }
      commitKeyFrame();
      return;
    }

    const canPlay = !paused && !gameOver;
    const softDropActive = canPlay && currentKeyState.softDrop;
    if (softDropAppliedRef.current !== softDropActive) {
      softDropAppliedRef.current = softDropActive;
      setDropFast(softDropActive);
    }

    if (!canPlay) {
      queued.hardDrop = false;
      queued.hold = false;
      commitKeyFrame();
      return;
    }

    if (queued.hardDrop) {
      queued.hardDrop = false;
      markFirstGameplayInput();
      hardDropActivePiece();
    }

    if (queued.hold) {
      queued.hold = false;
      markFirstGameplayInput();
      holdActivePiece();
    }

    const leftPressed = currentKeyState.left;
    const rightPressed = currentKeyState.right;
    if (leftPressed || rightPressed) {
      if (leftPressed && rightPressed) {
        const leftTiming = repeatTimingRef.current.left;
        const rightTiming = repeatTimingRef.current.right;
        const primary = leftTiming.pressedAt >= rightTiming.pressedAt ? "left" : "right";
        const secondary = primary === "left" ? "right" : "left";

        const shouldMovePrimary = pollRepeatControl(
          primary,
          now,
          INPUT_TIMING.DAS_MS,
          INPUT_TIMING.ARR_MS,
          true,
        );

        pollRepeatControl(
          secondary,
          now,
          INPUT_TIMING.DAS_MS,
          INPUT_TIMING.ARR_MS,
          false,
        );

        if (shouldMovePrimary) {
          markFirstGameplayInput();
          moveActivePiece(primary === "left" ? -1 : 1, 0);
        }
      } else if (leftPressed) {
        if (pollRepeatControl("left", now, INPUT_TIMING.DAS_MS, INPUT_TIMING.ARR_MS)) {
          markFirstGameplayInput();
          moveActivePiece(-1, 0);
        }
      } else if (
        pollRepeatControl("right", now, INPUT_TIMING.DAS_MS, INPUT_TIMING.ARR_MS)
      ) {
        markFirstGameplayInput();
        moveActivePiece(1, 0);
      }
    }

    if (currentKeyState.softDrop && !prevKeyState.softDrop) {
      markFirstGameplayInput();
    }

    const rotateCWPressed = currentKeyState.rotateCW && !prevKeyState.rotateCW;
    const rotateCCWPressed = currentKeyState.rotateCCW && !prevKeyState.rotateCCW;
    const rotate180Pressed = currentKeyState.rotate180 && !prevKeyState.rotate180;

    if (rotateCWPressed) {
      markFirstGameplayInput();
      rotateActivePiece("cw");
    }

    if (rotateCCWPressed) {
      markFirstGameplayInput();
      rotateActivePiece("ccw");
    }

    if (rotate180Pressed) {
      markFirstGameplayInput();
      rotateActivePiece("180");
    }

    commitKeyFrame();
  }, [
    gameOver,
    hardDropActivePiece,
    holdActivePiece,
    moveActivePiece,
    paused,
    pollRepeatControl,
    reset,
    rotateActivePiece,
    allowManualReset,
    markFirstGameplayInput,
  ]);

  useEffect(() => {
    let frameId = null;

    const step = (now) => {
      processInputFrame(now);
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [processInputFrame]);

  useEffect(() => {
    return () => {
      clearInputState();
    };
  }, [clearInputState]);

  const onKeyDown = useCallback((e) => {
    if (!CODE_TO_CONTROLS[e.code]) return;
    e.preventDefault();
    if (e.repeat) return;
    syncControlForCode(e.code, true, performance.now());
  }, [syncControlForCode]);

  const onKeyUp = useCallback((e) => {
    if (!CODE_TO_CONTROLS[e.code]) return;
    e.preventDefault();
    syncControlForCode(e.code, false, performance.now());
  }, [syncControlForCode]);

  const onInputBlur = useCallback(() => {
    clearInputState();
  }, [clearInputState]);

  const view = piece ? cellsWithCurrentPiece(board, piece) : board;
  const ghostPiece = piece ? getGhostPiece(board, piece) : null;
  const ghostCells = ghostPiece ? getPieceCellSet(ghostPiece) : new Set();
  const ghostFill = piece ? hexToRgba(COLORS[piece.id], 0.18) : "transparent";
  const ghostStroke = piece ? hexToRgba(COLORS[piece.id], 0.65) : "transparent";

  return (
    <div
      style={{
        outline: "2px solid #2f2f36",
        padding: 12,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        background: "#0d0d12",
        borderRadius: 10,
        userSelect: "none",
      }}
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={onInputBlur}
      aria-label="Tetris game board"
      role="application"
    >
      <div
        style={{
          width: 132,
          display: "grid",
          gap: 10,
          color: "#d0d2e6",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 12,
        }}
      >
        <div
          style={{
            border: "1px solid #2f2f36",
            borderRadius: 8,
            background: "#12131a",
            padding: 8,
          }}
        >
          <div style={{ marginBottom: 6, color: "#9ea2be" }}>HOLD (C)</div>
          {renderMiniPiece(holdType)}
        </div>

        <div
          style={{
            border: "1px solid #2f2f36",
            borderRadius: 8,
            background: "#12131a",
            padding: 8,
            lineHeight: 1.4,
          }}
        >
          <div style={{ color: "#9ea2be", marginBottom: 4 }}>CONTROLS</div>
          <div>Move: Arrows</div>
          <div>Hard Drop: Space</div>
          <div>Rotate CW: Up / X</div>
          <div>Rotate CCW: Z</div>
          <div>Rotate 180: A</div>
          <div>Hold: C</div>
          <div>Pause: P</div>
          {allowManualReset && <div>Reset: R</div>}
        </div>

        {allowManualReset && (
          <button
            onClick={reset}
            style={{
              padding: "7px 12px",
              background: "#20232a",
              color: "#fff",
              border: "1px solid #2f2f36",
              borderRadius: 6,
              cursor: "pointer",
              width: "100%",
            }}
          >
            Reset
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#cfcfe1",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 14,
          }}
        >
          {isSprintMode ? (
            <>
              <div>Time: {formatDuration(elapsedTimeMs)}</div>
              <div>Lines: {lines}/{sprintTargetLines}</div>
              <div>Pieces: {piecesPlaced}</div>
            </>
          ) : (
            <>
              <div>Score: {score}</div>
              <div>Lines: {lines}</div>
              <div>Level: {level}</div>
            </>
          )}
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
          title="Click to focus, then use Arrows + Space + C"
        >
          {view.map((row, y) =>
            row.map((cell, x) => {
              const filled = cell !== 0;
              const isGhost = !filled && ghostCells.has(`${x},${y}`);
              return (
                <div
                  key={`${y}-${x}`}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    background: filled ? COLORS[cell] : isGhost ? ghostFill : COLORS[0],
                    borderRadius: 3,
                    boxShadow: filled ? "inset 0 0 3px rgba(0,0,0,0.5)" : "none",
                    border: isGhost ? `1px dashed ${ghostStroke}` : "none",
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
      </div>

      <div
        style={{
          width: 132,
          display: "grid",
          gap: 8,
          color: "#d0d2e6",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 12,
        }}
      >
        <div style={{ color: "#9ea2be" }}>NEXT</div>
        {Array.from({ length: NEXT_PREVIEW_COUNT }, (_, index) => (
          <div
            key={`next-${index}`}
            style={{
              border: "1px solid #2f2f36",
              borderRadius: 8,
              background: "#12131a",
              padding: 6,
              minHeight: 62,
              display: "grid",
              placeItems: "center",
            }}
          >
            {renderMiniPiece(nextQueue[index] ?? null)}
          </div>
        ))}
      </div>
    </div>
  );
}