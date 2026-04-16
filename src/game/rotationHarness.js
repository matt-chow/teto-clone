import { createEmptyBoard } from "./board.js";
import { createPieceByType } from "./pieces.js";
import { getKickOffsets, getPieceShape, tryRotate } from "./rotation.js";

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function withFilledCells(baseBoard, filledCells = [], value = 9) {
  const board = cloneBoard(baseBoard);
  for (const cell of filledCells) {
    board[cell.y][cell.x] = value;
  }
  return board;
}

function toDirectionLabel(direction) {
  if (direction === "cw") return "CW";
  if (direction === "ccw") return "CCW";
  return "180";
}

function matchExpectation(report, testCase) {
  const expectedSuccess = testCase.expectedSuccess;
  if (report.succeeded !== expectedSuccess) return false;

  if (testCase.expectedOffset) {
    const [dx, dy] = testCase.expectedOffset;
    if (!report.acceptedKick) return false;
    if (report.acceptedKick.dx !== dx || report.acceptedKick.dy !== dy) return false;
  }

  if (testCase.expectedFinal) {
    const { x, y, state } = testCase.expectedFinal;
    if (!report.finalPiece) return false;
    if (report.finalPiece.x !== x) return false;
    if (report.finalPiece.y !== y) return false;
    if (report.finalPiece.rot !== state) return false;
  }

  return true;
}

function buildPiece(testCase) {
  const piece = createPieceByType(testCase.pieceType);
  if (!piece) {
    throw new Error(`Unknown piece type in harness case: ${testCase.pieceType}`);
  }

  piece.rot = testCase.fromState;
  piece.shape = getPieceShape(testCase.pieceType, testCase.fromState);
  piece.x = testCase.x;
  piece.y = testCase.y;
  return piece;
}

export function runKickConformanceCase(testCase, options = {}) {
  const profile = options.profile || testCase.profile || "tetrio";
  const board = testCase.board
    ? withFilledCells(testCase.board, testCase.filledCells || [])
    : withFilledCells(createEmptyBoard(), testCase.filledCells || []);

  const piece = buildPiece(testCase);
  const toState =
    testCase.direction === "cw"
      ? (testCase.fromState + 1) % 4
      : testCase.direction === "ccw"
        ? (testCase.fromState + 3) % 4
        : (testCase.fromState + 2) % 4;

  const candidateKickOrder = getKickOffsets(
    testCase.pieceType,
    testCase.fromState,
    toState,
    testCase.direction,
    profile,
  ).map(([dx, dy]) => ({ dx, dy }));

  let debugInfo = null;
  const finalPiece = tryRotate(board, piece, testCase.direction, {
    debug: true,
    profile,
    onDebug: (info) => {
      debugInfo = info;
    },
  });

  const succeeded = finalPiece !== piece;
  const report = {
    caseName: testCase.name,
    profile,
    pieceType: testCase.pieceType,
    fromState: testCase.fromState,
    direction: testCase.direction,
    toState,
    start: { x: testCase.x, y: testCase.y },
    candidateKickOrder,
    attempts: debugInfo?.attempts || [],
    acceptedKick: debugInfo?.acceptedKick || null,
    succeeded,
    finalPiece: succeeded
      ? { x: finalPiece.x, y: finalPiece.y, rot: finalPiece.rot }
      : null,
  };

  report.passedExpectation = matchExpectation(report, testCase);
  return report;
}

export function printKickConformanceReport(report, logger = console.log) {
  logger(
    `[kick-harness] ${report.caseName} | ${report.pieceType} ${toDirectionLabel(report.direction)} ${report.fromState}->${report.toState} @ (${report.start.x},${report.start.y})`,
  );
  logger(`  profile=${report.profile}`);
  logger(
    `  candidate order: ${report.candidateKickOrder.map((k) => `(${k.dx},${k.dy})`).join(" -> ")}`,
  );

  report.attempts.forEach((attempt, idx) => {
    const status = attempt.blocked ? "blocked" : "pass";
    logger(`  attempt ${idx + 1}: (${attempt.dx},${attempt.dy}) => ${status}`);
  });

  if (report.acceptedKick) {
    logger(`  accepted kick: (${report.acceptedKick.dx},${report.acceptedKick.dy})`);
    logger(
      `  final: x=${report.finalPiece.x}, y=${report.finalPiece.y}, state=${report.finalPiece.rot}`,
    );
  } else {
    logger("  accepted kick: none (rotation failed)");
  }

  logger(`  expectation: ${report.passedExpectation ? "pass" : "fail"}`);
}

export function runKickConformanceSuite(cases, options = {}) {
  const reports = cases.map((testCase) => runKickConformanceCase(testCase, options));

  if (options.log === true) {
    for (const report of reports) {
      printKickConformanceReport(report, options.logger || console.log);
    }
  }

  return reports;
}

export const defaultKickConformanceCases = [
  {
    name: "T left wall uses right kick when needed",
    pieceType: "T",
    x: 0,
    y: 6,
    fromState: 0,
    direction: "ccw",
    filledCells: [{ x: 1, y: 6 }],
    expectedSuccess: true,
    expectedOffset: [1, 0],
    expectedFinal: { x: 1, y: 6, state: 3 },
  },
  {
    name: "J corner kick clears stack corner",
    pieceType: "J",
    x: 4,
    y: 16,
    fromState: 0,
    direction: "cw",
    filledCells: [
      { x: 6, y: 16 },
      { x: 4, y: 18 },
    ],
    expectedSuccess: true,
    expectedOffset: [-1, -1],
    expectedFinal: { x: 3, y: 15, state: 1 },
  },
  {
    name: "I near right wall uses I-specific kick",
    pieceType: "I",
    x: 6,
    y: 4,
    fromState: 0,
    direction: "cw",
    filledCells: [{ x: 8, y: 5 }],
    expectedSuccess: true,
    expectedOffset: [-2, 0],
    expectedFinal: { x: 4, y: 4, state: 1 },
  },
  {
    name: "T floor kick succeeds with upward offset",
    pieceType: "T",
    x: 4,
    y: 18,
    fromState: 0,
    direction: "cw",
    filledCells: [],
    expectedSuccess: true,
    expectedOffset: [-1, -1],
    expectedFinal: { x: 3, y: 17, state: 1 },
  },
  {
    name: "I 180 in two-wide notch matches tetrio profile",
    pieceType: "I",
    x: 4,
    y: 16,
    fromState: 1,
    direction: "180",
    profile: "tetrio",
    filledCells: [
      ...Array.from({ length: 10 }, (_, x) => ({ x, y: 16 })).filter((cell) => ![5, 6].includes(cell.x)),
      ...Array.from({ length: 10 }, (_, x) => ({ x, y: 17 })).filter((cell) => ![5, 6].includes(cell.x)),
      ...Array.from({ length: 10 }, (_, x) => ({ x, y: 18 })).filter((cell) => ![5, 6].includes(cell.x)),
      ...Array.from({ length: 10 }, (_, x) => ({ x, y: 19 })).filter((cell) => ![5, 6].includes(cell.x)),
    ],
    expectedSuccess: true,
    expectedOffset: [0, 0],
    expectedFinal: { x: 4, y: 16, state: 3 },
  },
];
