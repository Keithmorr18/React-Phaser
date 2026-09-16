import { useEffect } from "react";
import { LabProvider, useLab } from "./lab/store";
import { Header, StatusBar } from "./components/Header";
import { LeftPanel } from "./components/LeftPanel";
import { Inspector } from "./components/Inspector";
import { Timeline } from "./components/Timeline";
import { ExportModal } from "./components/ExportModal";
import { HelpModal } from "./components/HelpModal";
import { PhaserPreview } from "./phaser/PhaserPreview";
import { isTypingTarget } from "./phaser/bridge";

export default function App() {
  return (
    <LabProvider>
      <Shell />
    </LabProvider>
  );
}

function Shell() {
  const { dispatch, state, loadFiles } = useLab();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget()) return;
      if (e.key === " " && state.preview.studioMode) {
        e.preventDefault();
        dispatch({ type: "SET_PLAYBACK", patch: { playing: !state.playback.playing } });
      }
      if (e.key === "ArrowRight" && state.preview.studioMode) {
        const anim = state.animations.find((a) => a.id === state.activeAnimId);
        if (!anim?.frames.length) return;
        dispatch({
          type: "SET_PLAYBACK",
          patch: { playing: false, currentFrame: (state.playback.currentFrame + 1) % anim.frames.length },
        });
      }
      if (e.key === "ArrowLeft" && state.preview.studioMode) {
        const anim = state.animations.find((a) => a.id === state.activeAnimId);
        if (!anim?.frames.length) return;
        dispatch({
          type: "SET_PLAYBACK",
          patch: {
            playing: false,
            currentFrame: (state.playback.currentFrame - 1 + anim.frames.length) % anim.frames.length,
          },
        });
      }
      if (e.key >= "1" && e.key <= "9") {
        const anim = state.animations[Number(e.key) - 1];
        if (anim) dispatch({ type: "SET_ACTIVE_ANIM", id: anim.id });
      }
      if (e.key === "g") dispatch({ type: "SET_PREVIEW", patch: { showGrid: !state.preview.showGrid } });
      if (e.key === "h") dispatch({ type: "SET_PREVIEW", patch: { showHitbox: !state.preview.showHitbox } });
      if (e.key === "o") dispatch({ type: "SET_PREVIEW", patch: { showOrigin: !state.preview.showOrigin } });
      if (e.key === "f" && !e.metaKey && !e.ctrlKey) {
        dispatch({ type: "SET_PREVIEW", patch: { flipX: !state.preview.flipX } });
      }
      if (e.key === "e" && !e.metaKey && !e.ctrlKey) {
        dispatch({ type: "SET_UI", patch: { exportOpen: true } });
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        dispatch({ type: "SET_UI", patch: { helpOpen: !state.ui.helpOpen } });
      }
      if (e.key === "Escape") {
        dispatch({ type: "SET_UI", patch: { exportOpen: false, helpOpen: false } });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, state]);

  useEffect(() => {
    const onDrag = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault();
      void loadFiles(e.dataTransfer.files);
    };
    window.addEventListener("dragover", onDrag);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDrag);
      window.removeEventListener("drop", onDrop);
    };
  }, [loadFiles]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#07090f] text-zinc-100">
      <Header />
      <div className="flex min-h-0 flex-1">
        <LeftPanel />
        <main className="flex min-w-0 flex-1 flex-col gap-2 p-2">
          <PhaserPreview />
          <Timeline />
        </main>
        <Inspector />
      </div>
      <StatusBar />
      <ExportModal />
      <HelpModal />
    </div>
  );
}
