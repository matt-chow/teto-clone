import { ROWS, COLS } from "./constants";

// Create an empty game board
export function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

// Deep clone a game board
export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

// Remove full rows and return the new board + number of cleared lines
export function clearLines(board) {
  let cleared = 0;
  const rowsToKeep = [];

  for (let y = 0; y < board.length; y++) {
    const full = board[y]. every((v) => v !== 0);
    if (full) {
      cleared++;
    } else {
      rowsToKeep.push(board[y]);
    }
  }

  if (cleared === 0) {
    return { board, linesCleared: 0}
  }

  const newRows = Array.from({ length: cleared }, () => Array(COLS).fill(0));
  const newBoard = [...newRows, ...rowsToKeep];

  return { board: newBoard, linesCleared: cleared };
}