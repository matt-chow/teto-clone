import { describe, it, expect } from "vitest";
import { createPieceByType } from "../src/game/pieces.js";
import { createEmptyBoard } from "../src/game/board.js";
import { COLS } from "../src/game/constants.js";
import { getKickTests, tryRotatePieceSRS } from "../src/game/rotation.js";

function clonePiece(piece) {
  return {
    ...piece,
    shape: piece.shape.map((row) => row.slice()),
  };
}

function setCell(board, x, y, value = 9) {
  board[y][x] = value;
}

function rotateWithDebug(board, piece, direction) {
  let debugInfo = null;
  const result = tryRotatePieceSRS(board, piece, direction, {
    debug: true,
    onDebug: (info) => {
      debugInfo = info;
    },
  });
  return { result, debugInfo };
}

describe("SRS and SRS+ rotation kicks", () => {
  it("kicks T near left wall (CCW) when in-place rotation is blocked", () => {
    const board = createEmptyBoard();
    const piece = createPieceByType("T");
    piece.rot = 0;
    piece.x = 0;
    piece.y = 6;

    // Block only the no-kick placement.
    setCell(board, 1, 6);

    const { result, debugInfo } = rotateWithDebug(board, piece, "ccw");

    expect(result).not.toBe(piece);
    expect(result.rot).toBe(3);
    expect(result.x).toBe(1);
    expect(result.y).toBe(6);
    expect(debugInfo.acceptedKick).toEqual({ dx: 1, dy: 0 });
  });

  it("kicks J near right wall (CW) when in-place rotation is blocked", () => {
    const board = createEmptyBoard();
    const piece = createPieceByType("J");
    piece.rot = 0;
    piece.x = COLS - 3;
    piece.y = 6;

    // Block only the first two kick attempts; allow the third (-1, -1).
    setCell(board, COLS - 2, 6);

    const { result, debugInfo } = rotateWithDebug(board, piece, "cw");

    expect(result).not.toBe(piece);
    expect(result.rot).toBe(1);
    expect(result.x).toBe(COLS - 4);
    expect(result.y).toBe(5);
    expect(debugInfo.acceptedKick).toEqual({ dx: -1, dy: -1 });
  });

  it("uses I-piece specific wall kick table (CW)", () => {
    const board = createEmptyBoard();
    const piece = createPieceByType("I");
    piece.rot = 0;
    piece.x = COLS - 4;
    piece.y = 4;

    // Block the in-place vertical result at x=8; allow the x-2 kick to x=6.
    setCell(board, COLS - 2, 5);

    const { result, debugInfo } = rotateWithDebug(board, piece, "cw");

    expect(result).not.toBe(piece);
    expect(result.rot).toBe(1);
    expect(result.x).toBe(COLS - 6);
    expect(result.y).toBe(4);
    expect(debugInfo.acceptedKick).toEqual({ dx: -2, dy: 0 });
  });

  it("handles a tight-space T-spin-style kick path", () => {
    const board = createEmptyBoard();
    const piece = createPieceByType("T");
    piece.rot = 0;
    piece.x = 4;
    piece.y = 16;

    // Blocks 0,0 and -1,0 checks; allows -1,-1.
    setCell(board, 5, 17);

    const { result, debugInfo } = rotateWithDebug(board, piece, "cw");

    expect(result).not.toBe(piece);
    expect(result.rot).toBe(1);
    expect(result.x).toBe(3);
    expect(result.y).toBe(15);
    expect(debugInfo.acceptedKick).toEqual({ dx: -1, dy: -1 });
  });

  it("contains kick entries that enable T/J spin-style movement", () => {
    expect(getKickTests("T", 0, 1, "cw")).toContainEqual([-1, -1]);
    expect(getKickTests("J", 1, 3, "180")).toContainEqual([1, -2]);
  });

  it("returns original piece if no SRS kick can pass", () => {
    const piece = createPieceByType("L");
    piece.rot = 0;
    const original = clonePiece(piece);

    const result = tryRotatePieceSRS([], piece, "cw", () => true);

    expect(result).toEqual(original);
    expect(result).toBe(piece);
  });

  it("reports detailed failure reasons in debug mode", () => {
    const board = createEmptyBoard();
    const piece = createPieceByType("L");
    piece.rot = 0;
    piece.x = 0;
    piece.y = 0;

    // Block all legal kick targets from this wall position.
    setCell(board, 0, 0);
    setCell(board, 0, 3);
    setCell(board, 1, 2);

    const { result, debugInfo } = rotateWithDebug(board, piece, "cw");

    expect(result).toBe(piece);
    expect(debugInfo).not.toBeNull();
    expect(debugInfo.attempts.length).toBeGreaterThan(0);
    expect(debugInfo.attempts.some((a) => a.reason !== null)).toBe(true);
  });
});
