import { describe, it, expect } from "vitest";
import { createBagRNG } from "../src/game/pieces.js";

describe('Bag RNG', () => {
  it('should contain all 7 pieces in first bag', () => {
    const rng = createBagRNG();
    const firstBag = Array.from({ length: 7 }, () => rng.next().type);
    
    const expectedPieces = ["O", "I", "T", "S", "Z", "J", "L"];
    expectedPieces.forEach(piece => {
      expect(firstBag).toContain(piece);
    });
    
    // Should have exactly 7 pieces
    expect(firstBag.length).toBe(7);
  });
  
  it('should have no duplicates in a single bag', () => {
    const rng = createBagRNG();
    const firstBag = Array.from({ length: 7 }, () => rng.next().type);
    
    const uniquePieces = [...new Set(firstBag)];
    expect(uniquePieces.length).toBe(7);
  });
  
  it('should refill correctly after 7 pieces', () => {
    const rng = createBagRNG();
    
    // Get first 7 pieces
    const firstBag = Array.from({ length: 7 }, () => rng.next().type);
    
    // Get next 7 pieces (should be a new shuffled bag)
    const secondBag = Array.from({ length: 7 }, () => rng.next().type);
    
    // Both bags should contain all 7 pieces
    const expectedPieces = ["O", "I", "T", "S", "Z", "J", "L"];
    expectedPieces.forEach(piece => {
      expect(firstBag).toContain(piece);
      expect(secondBag).toContain(piece);
    });
  });
});