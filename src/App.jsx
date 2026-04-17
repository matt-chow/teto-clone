import { useCallback, useEffect, useState } from "react";
import GameBoard from "./components/GameBoard";
import MenuScreen from "./components/MenuScreen";
import { SPRINT_TARGET_LINES } from "./game/sprint";

const GAME_MODES = {
  SPRINT: "sprint",
};

export default function App() {
  const [started, setStarted] = useState(false);

  const handleStartSprint = useCallback(() => {
    console.log("[App] Starting sprint run");
    setStarted(true);
  }, []);

  const handleBackToMenu = useCallback(() => {
    console.log("[App] onBackToMenu triggered");
    setStarted(false);
  }, []);

  useEffect(() => {
    if (!started) {
      console.log("[App] Switched to menu view");
    }
  }, [started]);

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
      {!started ? (
        <MenuScreen onStartSprint={handleStartSprint} />
      ) : (
        <GameBoard
          gameMode={GAME_MODES.SPRINT}
          sprintTargetLines={SPRINT_TARGET_LINES}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </div>
  );
}