# Project Guidelines

## Code Style
- Use existing React function component patterns and hooks style from src/components/GameBoard.jsx.
- Keep gameplay logic in src/game/*.js and UI concerns in src/components/*.jsx.
- Preserve numeric board cell IDs and PIECE_IDS mapping from src/game/constants.js.
- Follow existing Vitest style in tests/*.spec.js and tests/*.test.js using describe/it/expect.

## Architecture
- App entry is src/App.jsx, with gameplay orchestrated in src/components/GameBoard.jsx.
- Core game logic is split across:
  - src/game/board.js for board creation, cloning, and line clearing
  - src/game/pieces.js for piece creation and 7-bag RNG
  - src/game/rotation.js for SRS and tetrio-profile rotation behavior
  - src/game/rotationHarness.js for deterministic rotation conformance checks
  - src/game/constants.js for board dimensions, gravity, scoring, IDs, and colors
- Rotation details and coordinate conventions are documented in docs/rotation-audit.md.

## Build and Test
- Install dependencies: npm install
- Dev server: npm run dev
- Production build: npm run build
- Lint: npm run lint
- Test once: npm run test:run
- Test watch mode: npm run test

## Conventions
- Board indexing is board[y][x], with x increasing right and y increasing downward.
- Piece position x/y is the top-left of its current bounding box.
- Rotation states are 0, R(1), 2, L(3) with spawn state 0.
- Keep canonical SRS piece shapes (JLSTZ in 3x3, I in 4x4, O in 2x2).
- Do not mix rotation profiles in one attempt; use a consistent profile path.
- Add rotation behavior regressions through src/game/rotationHarness.js and tests/rotationConformance.spec.js.
- Prefer linking existing docs over duplicating content. See docs/rotation-audit.md.

## Common Pitfalls
- Runtime trimming of piece matrices can shift effective pivots and break wall/floor kicks.
- Y-axis direction is screen-space (down is positive); sign mistakes in kick offsets are easy.
- Spawn/rotation logic may involve cells above the visible board (y < 0); treat that as valid.
