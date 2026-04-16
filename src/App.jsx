import { useCallback, useEffect, useRef, useState } from "react";
import GameBoard from "./components/GameBoard";
import MenuScreen from "./components/MenuScreen";
import ResultsScreen from "./components/ResultsScreen";
import {
  SPRINT_TARGET_LINES,
  calculatePPS,
  formatDuration,
} from "./game/sprint";

const SCREENS = {
  MENU: "menu",
  PLAYING: "playing",
  RESULTS: "results",
};

const GAME_MODES = {
  SPRINT: "sprint",
};

const EMPTY_SPRINT_STATS = {
  linesCleared: 0,
  totalPiecesPlaced: 0,
  finalTimeMs: null,
  pps: 0,
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.MENU);
  const [gameMode, setGameMode] = useState(null);
  const [runId, setRunId] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sprintStats, setSprintStats] = useState(EMPTY_SPRINT_STATS);

  const timerStartAtRef = useRef(0);

  const stopTimer = useCallback(() => {
    setTimerRunning(false);
  }, []);

  const startTimerIfNeeded = useCallback(() => {
    if (timerRunning) return;
    timerStartAtRef.current = performance.now() - elapsedMs;
    setTimerRunning(true);
  }, [elapsedMs, timerRunning]);

  useEffect(() => {
    if (!timerRunning) return undefined;

    let frameId = null;
    const update = (now) => {
      setElapsedMs(now - timerStartAtRef.current);
      frameId = requestAnimationFrame(update);
    };

    frameId = requestAnimationFrame(update);
    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [timerRunning]);

  const startSprint = useCallback(() => {
    stopTimer();
    setElapsedMs(0);
    setSprintStats(EMPTY_SPRINT_STATS);
    setGameMode(GAME_MODES.SPRINT);
    setScreen(SCREENS.PLAYING);
    setRunId((id) => id + 1);
  }, [stopTimer]);

  const backToMenu = useCallback(() => {
    stopTimer();
    setElapsedMs(0);
    setGameMode(null);
    setSprintStats(EMPTY_SPRINT_STATS);
    setScreen(SCREENS.MENU);
  }, [stopTimer]);

  const onFirstGameplayInput = useCallback(() => {
    if (screen !== SCREENS.PLAYING || gameMode !== GAME_MODES.SPRINT) return;
    startTimerIfNeeded();
  }, [gameMode, screen, startTimerIfNeeded]);

  const onSprintProgress = useCallback((progress) => {
    setSprintStats((prev) => ({
      ...prev,
      linesCleared: progress.linesCleared,
      totalPiecesPlaced: progress.totalPiecesPlaced,
    }));
  }, []);

  const onSprintComplete = useCallback((summary) => {
    const finalTimeMs = timerRunning
      ? performance.now() - timerStartAtRef.current
      : elapsedMs;

    stopTimer();
    setElapsedMs(finalTimeMs);
    setSprintStats({
      linesCleared: summary.linesCleared,
      totalPiecesPlaced: summary.totalPiecesPlaced,
      finalTimeMs,
      pps: calculatePPS(summary.totalPiecesPlaced, finalTimeMs),
    });
    setScreen(SCREENS.RESULTS);
  }, [elapsedMs, stopTimer, timerRunning]);

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
      {screen === SCREENS.MENU && <MenuScreen onStartSprint={startSprint} />}

      {screen === SCREENS.PLAYING && gameMode === GAME_MODES.SPRINT && (
        <GameBoard
          key={`sprint-${runId}`}
          gameMode={GAME_MODES.SPRINT}
          sprintTargetLines={SPRINT_TARGET_LINES}
          elapsedTimeMs={elapsedMs}
          onFirstGameplayInput={onFirstGameplayInput}
          onSprintProgress={onSprintProgress}
          onSprintComplete={onSprintComplete}
          allowManualReset={false}
        />
      )}

      {screen === SCREENS.RESULTS && gameMode === GAME_MODES.SPRINT && (
        <ResultsScreen
          title="40L Sprint Complete"
          finalTime={formatDuration(sprintStats.finalTimeMs ?? 0)}
          pps={sprintStats.pps}
          totalPiecesPlaced={sprintStats.totalPiecesPlaced}
          onPlayAgain={startSprint}
          onBackToMenu={backToMenu}
        />
      )}
    </div>
  );
}