import { useEffect, useState } from "react";
import { Leva } from "leva";
import { Eraser, Save, Trash2, Upload } from "lucide-react";
import { toast, Toaster } from "sonner";
import { ShortcutHelpOverlay } from "./components/app/ShortcutHelpOverlay";
import { ViewportFocusPanel } from "./components/app/ViewportFocusPanel";
import {
  CanvasSurface,
  type CanvasFocusRequest,
  type CanvasViewport,
} from "./components/canvas/CanvasSurface";
import { CanvasToolbar } from "./components/canvas/CanvasToolbar";
import { type CanvasToolId } from "./components/canvas/types";
import { type CanvasNode, type Position } from "./core/nodes";
import {
  installLevaTextareaEnterBehavior,
  requestControlFocus,
} from "./features/controls/focus";
import { isEditableElementFocused } from "./features/hotkeys/helpers";
import { createRectNode, createTextNode } from "./features/nodes/helpers";
import { useCanvasHotkeys } from "./features/app/useCanvasHotkeys";
import { useGlobalPasteHandler } from "./features/app/useGlobalPasteHandler";
import { useCanvasSelectionActions } from "./features/app/useCanvasSelectionActions";
import { useSnapshotStorage } from "./features/app/useSnapshotStorage";
import { useSnapshotState } from "./features/app/useSnapshotState";
export default function App() {
  const [activeToolId, setActiveToolId] = useState<CanvasToolId>("select");
  const [viewport, setViewport] = useState<CanvasViewport>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [focusFitPercent, setFocusFitPercent] = useState(50);
  const [focusRequest, setFocusRequest] = useState<CanvasFocusRequest | null>(
    null,
  );
  const [showShortcutOverlay, setShowShortcutOverlay] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [resetToOriginToken, setResetToOriginToken] = useState(0);
  const {
    step,
    snapShot,
    autoAddSnapshotOnAdvance,
    setAutoAddSnapshotOnAdvance,
    duplicateNodesIntoNewSnapshot,
    setDuplicateNodesIntoNewSnapshot,
    syncMatchingIdEdits,
    setSyncMatchingIdEdits,
    showPreviousOverlay,
    setShowPreviousOverlay,
    activeNodeIds,
    setActiveNodeIds,
    activeEdgeIds,
    setActiveEdgeIds,
    stepEntranceNodeIds,
    stepEntranceEdgeIds,
    latestStateRef,
    snapShotLength,
    currentNodes,
    currentEdges,
    previousNodes,
    previousEdges,
    commitNodesToStep,
    setCurrentSnapShotNodes,
    setCurrentSnapShotEdges,
    removeNodes,
    removeEdges,
    goToStep,
    goToNextStep,
    removeCurrentStep,
    hydrateSnapshots,
    clearSnapshots,
    undo,
    redo,
  } = useSnapshotState();

  useEffect(() => installLevaTextareaEnterBehavior(), []);

  const {
    saveSnapshotsToLocalStorage,
    loadSnapshotsFromJson,
    loadSnapshotsFromLocalStorage,
    clearSavedSnapshots,
  } = useSnapshotStorage({
    step,
    snapShot,
    hydrateSnapshots,
    clearSnapshots,
  });

  const createRect = (x: number, y: number) => {
    const node = createRectNode(x, y);
    setCurrentSnapShotNodes([...currentNodes, node], currentEdges);
    return node.id;
  };

  const createText = (x: number, y: number) => {
    const node = createTextNode(x, y);
    setCurrentSnapShotNodes([...currentNodes, node], currentEdges);
    return node.id;
  };

  const handleClickBackground = (position: Position) => {
    switch (activeToolId) {
      case "select":
        setActiveNodeIds([]);
        setActiveEdgeIds([]);
        break;
      case "rect": {
        const id = createRect(position.x, position.y);
        setActiveNodeIds([id]);
        requestControlFocus("box.content");
        setActiveToolId("select");
        setActiveEdgeIds([]);
        break;
      }
      case "text": {
        const id = createText(position.x, position.y);
        setActiveNodeIds([id]);
        requestControlFocus("text.text");
        setActiveToolId("select");
        setActiveEdgeIds([]);
        break;
      }
      case "arrow": {
        setActiveNodeIds([]);
        setActiveEdgeIds([]);
        break;
      }
    }
  };

  const handleNodeDoubleClick = (node: CanvasNode) => {
    if (node.type === "box") {
      setActiveNodeIds([node.id]);
      setActiveEdgeIds([]);
      requestControlFocus("box.content");
      return;
    }

    if (node.type === "text") {
      setActiveNodeIds([node.id]);
      setActiveEdgeIds([]);
      requestControlFocus("text.text");
    }
  };

  const {
    selectedNodes,
    linkedNodeIds,
    copySelectedNodes,
    cutSelectedNodes,
    pasteClipboardNodes,
    duplicateSelectedNodes,
    detachLinkedSelectedNodes,
  } = useCanvasSelectionActions({
    currentNodes,
    currentEdges,
    snapShot,
    step,
    activeNodeIds,
    activeEdgeIds,
    setActiveNodeIds,
    setActiveEdgeIds,
    setCurrentSnapShotNodes,
    removeNodes,
    removeEdges,
  });

  const resetViewportToOrigin = () => {
    setResetToOriginToken((prev) => prev + 1);
    toast.success("Viewport reset to origin");
  };

  const focusSelectedNodes = () => {
    if (activeNodeIds.length === 0) {
      toast.warning("Select one or more nodes to focus");
      return;
    }

    setFocusRequest({
      token: Date.now(),
      nodeIds: activeNodeIds,
      fitPercent: focusFitPercent,
    });
  };

  const adjustFocusFitPercent = (deltaY: number) => {
    if (deltaY === 0 || Object.is(deltaY, -0)) {
      return;
    }

    const step = deltaY > 0 ? 5 : -5;
    setFocusFitPercent((prev) => Math.max(0, Math.min(100, prev + step)));
  };

  const goToNextStepInCurrentMode = () => {
    if (isPresentationMode) {
      if (step >= snapShotLength - 1) {
        toast.warning("Already at the last step");
        return;
      }

      goToStep(step + 1);
      return;
    }

    goToNextStep();
  };

  const preventButtonFocus = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  useEffect(() => {
    loadSnapshotsFromLocalStorage();
  }, []);

  useCanvasHotkeys({
    onSelectTool: () => setActiveToolId("select"),
    onRectTool: () => setActiveToolId("rect"),
    onTextTool: () => setActiveToolId("text"),
    onArrowTool: () => setActiveToolId("arrow"),
    onUndo: undo,
    onRedo: redo,
    onCopy: () => void copySelectedNodes(),
    onCut: () => void cutSelectedNodes(),
    onDuplicate: duplicateSelectedNodes,
    onEnter: () => {
      if (isEditableElementFocused() || selectedNodes.length !== 1) {
        return;
      }

      const selectedNode = selectedNodes[0];
      if (selectedNode.type === "box") {
        requestControlFocus("box.content");
        return;
      }

      if (selectedNode.type === "text") {
        requestControlFocus("text.text");
      }
    },
    onToggleOverlay: () => setShowPreviousOverlay((prev) => !prev),
    onEscape: () => {
      if (showShortcutOverlay) {
        setShowShortcutOverlay(false);
        return;
      }

      setActiveNodeIds([]);
      setActiveEdgeIds([]);
      setActiveToolId("select");
    },
    onBackspace: () => {
      if (activeNodeIds.length === 0 && activeEdgeIds.length === 0) {
        return;
      }

      if (activeNodeIds.length > 0) {
        removeNodes(activeNodeIds);
      }
      if (activeEdgeIds.length > 0) {
        removeEdges(activeEdgeIds);
      }
      setActiveNodeIds([]);
      setActiveEdgeIds([]);
    },
    onRemoveSnapshot: removeCurrentStep,
    onSave: saveSnapshotsToLocalStorage,
    onResetViewport: resetViewportToOrigin,
    onTogglePresentationMode: () => setIsPresentationMode((prev) => !prev),
    onFocusSelectedNodes: focusSelectedNodes,
    onToggleShortcutHelp: () => setShowShortcutOverlay((prev) => !prev),
    onStepPrev: () => {
      if (step === 0) {
        toast.warning("Already at the first step");
        return;
      }

      goToStep(step - 1);
    },
    onStepNext: goToNextStepInCurrentMode,
  });

  useGlobalPasteHandler({
    commitNodesToStep: (targetStep, nodes, edges) => {
      commitNodesToStep(targetStep, nodes, edges);
    },
    pasteClipboardNodes,
    getLatestState: () => latestStateRef.current,
    setActiveNodeIds,
  });

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="h-full relative">
        {!isPresentationMode ? (
          <div className="absolute left-1/2 bottom-20 z-10 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-neutral-950/85 px-3 py-2 text-xs font-medium text-white/80 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur">
              <span className="tracking-[0.2em] text-white/45">STEP</span>
              <span className="min-w-16 text-center text-sm font-semibold tracking-tight text-white">
                {step} / {snapShotLength - 1}
              </span>
              <button
                type="button"
                onClick={removeCurrentStep}
                disabled={snapShotLength === 1}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/6 text-white/80 transition hover:bg-white/12 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                title="Remove current snapshot (Cmd/Ctrl+Backspace)"
              >
                <Trash2 size={14} />
              </button>
              <button
                type="button"
                onClick={saveSnapshotsToLocalStorage}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/6 text-white/80 transition hover:bg-white/12 hover:text-white"
                title="Save snapshots to localStorage (Cmd/Ctrl+S)"
              >
                <Save size={14} />
              </button>
              <button
                type="button"
                onClick={loadSnapshotsFromJson}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/6 text-white/80 transition hover:bg-white/12 hover:text-white"
                title="Load snapshots from JSON and store to localStorage"
              >
                <Upload size={14} />
              </button>
              <button
                type="button"
                onClick={clearSavedSnapshots}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/6 text-white/80 transition hover:bg-white/12 hover:text-white"
                title="Clear localStorage snapshots and canvas"
              >
                <Eraser size={14} />
              </button>
            </div>
          </div>
        ) : null}

        <ShortcutHelpOverlay
          open={showShortcutOverlay && !isPresentationMode}
          onClose={() => setShowShortcutOverlay(false)}
          onPreventButtonFocus={preventButtonFocus}
        />

        <div className="absolute inset-0">
          {step > 0 && showPreviousOverlay && !isPresentationMode ? (
            <CanvasSurface
              nodes={previousNodes}
              edges={previousEdges}
              viewOnly
              showControls={false}
              activeNodeIds={[]}
              activeEdgeIds={[]}
              entranceNodeIds={[]}
              entranceEdgeIds={[]}
              linkedNodeIds={[]}
              viewport={viewport}
              showOriginAxes={false}
            />
          ) : null}
        </div>

        <div className="relative h-full overflow-hidden">
          <CanvasSurface
            nodes={currentNodes}
            edges={currentEdges}
            setNodes={(nextNodes, options) =>
              setCurrentSnapShotNodes(nextNodes, currentEdges, options)
            }
            setEdges={setCurrentSnapShotEdges}
            activeNodeIds={activeNodeIds}
            setActiveNodeIds={setActiveNodeIds}
            activeEdgeIds={activeEdgeIds}
            setActiveEdgeIds={setActiveEdgeIds}
            activeToolId={activeToolId}
            entranceNodeIds={stepEntranceNodeIds}
            entranceEdgeIds={stepEntranceEdgeIds}
            linkedNodeIds={linkedNodeIds}
            onDetachLinkedNodes={detachLinkedSelectedNodes}
            onClickBackground={handleClickBackground}
            onNodeDoubleClick={handleNodeDoubleClick}
            additionalSnapNodes={showPreviousOverlay ? previousNodes : []}
            viewport={viewport}
            onViewportChange={setViewport}
            showOriginAxes={!isPresentationMode}
            focusRequest={focusRequest}
            resetToOriginToken={resetToOriginToken}
            showControls={!isPresentationMode}
            onShiftWheel={adjustFocusFitPercent}
          />
        </div>

        {!isPresentationMode ? (
          <ViewportFocusPanel
            viewport={viewport}
            focusFitPercent={focusFitPercent}
            onFocusFitPercentChange={setFocusFitPercent}
            onResetViewportToOrigin={resetViewportToOrigin}
            onFocusSelectedNodes={focusSelectedNodes}
            onPreventButtonFocus={preventButtonFocus}
          />
        ) : null}

        {isPresentationMode ? (
          <div className="pointer-events-none absolute right-5 bottom-5 z-30 rounded-md border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-medium tracking-[0.08em] text-white/60">
            STEP {step} / {snapShotLength - 1}
          </div>
        ) : null}

        {!isPresentationMode ? (
          <CanvasToolbar
            activeToolId={activeToolId}
            setActiveToolId={setActiveToolId}
            syncMatchingIdEdits={syncMatchingIdEdits}
            setSyncMatchingIdEdits={setSyncMatchingIdEdits}
            showPreviousOverlay={showPreviousOverlay}
            setShowPreviousOverlay={setShowPreviousOverlay}
            autoAddSnapshotOnAdvance={autoAddSnapshotOnAdvance}
            setAutoAddSnapshotOnAdvance={setAutoAddSnapshotOnAdvance}
            duplicateNodesIntoNewSnapshot={duplicateNodesIntoNewSnapshot}
            setDuplicateNodesIntoNewSnapshot={setDuplicateNodesIntoNewSnapshot}
          />
        ) : null}

        {!isPresentationMode ? (
          <Leva
            hidden={activeNodeIds.length === 0 && activeEdgeIds.length === 0}
            theme={{
              sizes: {
                rootWidth: "420px",
                controlWidth: "220px",
              },
            }}
          />
        ) : null}
      </div>
    </>
  );
}
