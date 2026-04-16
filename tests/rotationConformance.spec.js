import { describe, expect, it } from "vitest";
import {
  defaultKickConformanceCases,
  runKickConformanceCase,
  runKickConformanceSuite,
} from "../src/game/rotationHarness.js";
import { createEmptyBoard } from "../src/game/board.js";
import { createPieceByType } from "../src/game/pieces.js";
import { getKickOffsets, tryRotate } from "../src/game/rotation.js";

describe("rotation conformance harness", () => {
  it("passes all default tetr.io observed cases", () => {
    const reports = runKickConformanceSuite(defaultKickConformanceCases, {
      profile: "tetrio",
      log: false,
    });

    expect(reports.length).toBeGreaterThan(0);
    expect(reports.every((report) => report.passedExpectation)).toBe(true);
  });

  it("provides candidate kick order exactly as attempted", () => {
    const report = runKickConformanceCase(defaultKickConformanceCases[0], {
      profile: "tetrio",
    });

    const fromOrder = report.candidateKickOrder.map((kick) => [kick.dx, kick.dy]);
    expect(fromOrder).toEqual(getKickOffsets("T", 0, 3, "ccw", "tetrio"));

    const attemptedOrder = report.attempts.map((attempt) => [attempt.dx, attempt.dy]);
    expect(attemptedOrder).toEqual(fromOrder.slice(0, attemptedOrder.length));
  });
});

describe("strict SRS vs tetr.io 180 profile", () => {
  it("treats strict SRS 180 as rotate-in-place only", () => {
    const board = createEmptyBoard();
    const piece = createPieceByType("T");
    piece.rot = 0;
    piece.x = 4;
    piece.y = 18;

    const strict = tryRotate(board, piece, "180", { profile: "srs" });
    const tetrio = tryRotate(board, piece, "180", { profile: "tetrio" });

    expect(strict).toBe(piece);
    expect(tetrio).not.toBe(piece);
  });
});
