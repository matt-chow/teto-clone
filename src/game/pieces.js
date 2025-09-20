import { COLS } from "./constants";

export function createOPiece() {
  return {
    shape: [
      [1, 1],
      [1, 1],
    ],
    x: Math.floor(COLS / 2) - 1,
    y: 0,
  };
}