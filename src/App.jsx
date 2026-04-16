import GameBoard from "./components/GameBoard";

export default function App() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#121216",
        color: "#fff",
        overflow: "hidden",
        padding: 10,
        boxSizing: "border-box",
      }}
    >
      <GameBoard />
    </div>
  );
}