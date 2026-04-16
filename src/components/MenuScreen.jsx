export default function MenuScreen({ onStartSprint }) {
  return (
    <div
      style={{
        background: "#0d0d12",
        color: "#f3f5ff",
        border: "1px solid #2f2f36",
        borderRadius: 14,
        padding: 24,
        minWidth: 320,
        textAlign: "center",
      }}
    >
      <h1
        style={{
          marginTop: 0,
          marginBottom: 16,
          fontSize: 30,
          letterSpacing: 1,
        }}
      >
        Tetris Modes
      </h1>
      <button
        onClick={onStartSprint}
        style={{
          background: "#1b8cff",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "10px 18px",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        40L Sprint
      </button>
    </div>
  );
}
