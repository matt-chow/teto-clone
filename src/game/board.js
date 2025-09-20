import { ROWS, COLS } from "./constants";

export function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}