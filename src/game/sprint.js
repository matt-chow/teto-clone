export const SPRINT_TARGET_LINES = 40;

export function formatDuration(ms) {
  const clamped = Math.max(0, ms);
  const totalCentiseconds = Math.floor(clamped / 10);
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

export function calculatePPS(totalPiecesPlaced, elapsedMs) {
  if (!elapsedMs || elapsedMs <= 0) return 0;
  return totalPiecesPlaced / (elapsedMs / 1000);
}
