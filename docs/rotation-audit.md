# Rotation Audit (SRS + TETR.IO 180)

## Coordinate system
- Grid uses screen coordinates.
- `x` increases to the right.
- `y` increases downward.
- Board indexing is `board[y][x]` with origin at top-left.
- Piece position (`piece.x`, `piece.y`) is the top-left of the piece bounding box matrix.

## Board geometry
- Width: 10 columns.
- Height: 20 rows.
- Spawn y: `0`.
- Spawn x: centered by piece bounding-box width (`Math.floor(COLS / 2) - Math.ceil(width / 2)`).

## Rotation states
- Internal states: `0, 1, 2, 3`.
- State naming: `0, R, 2, L`.
- Spawn orientation is state `0` for all pieces.

## Pivot and shape model
- JLSTZ use canonical 3x3 SRS state matrices.
- I uses canonical 4x4 SRS state matrices.
- O uses 2x2 matrix and deterministic no-kick rotation behavior (`[0,0]` only).
- Rotation now resolves by state (type + target state), not by rotating trimmed matrices at runtime.

## Kick tables and profiles
- CW/CCW: strict SRS kick order for JLSTZ and I.
- 180:
  - `srs` profile: rotate-in-place only (`[0,0]`) because strict SRS has no native 180 kick table.
  - `tetrio` profile: TETR.IO-style SRS+ 180 kick tables.

## Root causes fixed
- Trimmed matrix rotation (for pieces that should use 3x3/4x4 canonical boxes) shifted effective pivot and caused inconsistent wall/floor/corner behavior.
- 180 behavior was mixed into one path without a profile boundary, making strict SRS vs TETR.IO behavior hard to reason about.
- Missing deterministic harness made regression checks depend on manual gameplay.

## Added verification tools
- `src/game/rotationHarness.js` contains deterministic kick conformance harness with golden expectations.
- `tests/rotationConformance.spec.js` validates observed cases and profile behavior.
