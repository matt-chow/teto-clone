import { describe, it, expect } from "vitest";
import { createBagRNG } from "../src/game/pieces.js";

// Helper to draw N times and count frequencies by type.
function freqAfterDraws(draws) {
  const rng = createBagRNG();
  const c = { O: 0, I: 0, T: 0, S: 0, Z: 0, J: 0, L: 0 };
  for (let i = 0; i < draws; i++) c[rng.next().type]++;
  return c;
}

describe("7-bag generator", () => {
  it("gives perfect counts after full bags", () => {
    const N = 500; // 500 full bags -> 3500 draws
    const f = freqAfterDraws(7 * N);
    for (const k of Object.keys(f)) expect(f[k]).toBe(N);
  });

  it("never differs by more than 1 mid-bag", () => {
    const draws = 7 * 50 + 3; // 3 draws into the next bag
    const f = freqAfterDraws(draws);
    const vals = Object.values(f);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    expect(max - min).toBeLessThanOrEqual(1);
  });

  it("is reproducible with a seed and exposes queue snapshots", () => {
    const seededA = createBagRNG({ seed: "debug-seed" });
    const seededB = createBagRNG({ seed: "debug-seed" });

    const sequenceA = Array.from({ length: 10 }, () => seededA.next().type);
    const sequenceB = Array.from({ length: 10 }, () => seededB.next().type);

    expect(sequenceA).toEqual(sequenceB);

    const snapshot = seededA.snapshot();
    expect(snapshot.drawCount).toBe(10);
    expect(snapshot.refillCount).toBeGreaterThanOrEqual(1);
    expect(snapshot.remaining.length).toBeLessThanOrEqual(7);
    expect(snapshot.recentDraws.slice(-10)).toEqual(sequenceA);
  });
});