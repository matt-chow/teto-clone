export default function ResultsScreen({
  title,
  finalTime,
  pps,
  totalPiecesPlaced,
  onPlayAgain,
  onBackToMenu,
}) {
  return (
    <div
      style={{
        background: "#0d0d12",
        color: "#f3f5ff",
        border: "1px solid #2f2f36",
        borderRadius: 14,
        padding: 24,
        minWidth: 360,
      }}
    >
      <h1 style={{ marginTop: 0, marginBottom: 12 }}>{title}</h1>
      <div style={{ display: "grid", gap: 8, marginBottom: 20, textAlign: "left" }}>
        <div>Final Time: <strong>{finalTime}</strong></div>
        <div>PPS: <strong>{pps.toFixed(2)}</strong></div>
        <div>Total Pieces: <strong>{totalPiecesPlaced}</strong></div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onPlayAgain}
          style={{
            flex: 1,
            background: "#1b8cff",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Play Again
        </button>
        <button
          onClick={onBackToMenu}
          style={{
            flex: 1,
            background: "#20232a",
            color: "#fff",
            border: "1px solid #2f2f36",
            borderRadius: 8,
            padding: "10px 14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}
