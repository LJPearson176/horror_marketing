import { SceneController } from './components/canvas/SceneController';
import { CalibrationOverlay } from './components/ui/CalibrationOverlay';
import { SignalVisualizer } from './components/debug/SignalVisualizer';
import { TitleScreen } from './components/ui/TitleScreen';
import { CameraPreview } from './components/debug/CameraPreview';
import { useGameStore } from './systems/game/GameStore';
import { FakeOutOverlay } from './components/ui/FakeOutOverlay';
import { JumpscareOverlay } from './components/ui/JumpscareOverlay';
import { ContainmentOverlay } from './components/ui/ContainmentOverlay';
import { GlobalErrorBoundary } from './components/debug/GlobalErrorBoundary';

function App() {
  const { isGameActive } = useGameStore();

  return (
    <GlobalErrorBoundary>
      <div className="relative w-full h-screen bg-horror-black text-white overflow-hidden selection:bg-red-900">
        <SceneController />

        {/* --- UI LAYER --- */}

        {/* 1. Startup / Calibration (Replaces Title Screen for Start) */}
        {!isGameActive && useGameStore.getState().gameStatus === 'TITLE' && <CalibrationOverlay />}

        {/* 2. Game Over Screen */}
        {!isGameActive && useGameStore.getState().gameStatus === 'ENDING' && <TitleScreen />}

        {isGameActive && (
          <div className="absolute top-8 left-0 w-full text-center text-red-500 font-mono text-sm animate-pulse tracking-[0.2em] pointer-events-none">
            SIMULATION ACTIVE // DO NOT LOOK AWAY
          </div>
        )}

        <SignalVisualizer />
        <CameraPreview />

        {/* 4th Wall Breaks */}
        <ContainmentOverlay />
        <JumpscareOverlay />
        <FakeOutOverlay />
      </div>
    </GlobalErrorBoundary>
  );
}

export default App;
