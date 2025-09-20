import GameBoard from "./components/GameBoard";

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#121216",
        color: "#fff",
      }}
    >
      <GameBoard />
    </div>
  );
}