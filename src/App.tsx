import { useEffect, useMemo, useState } from "react";
import { Leva } from "leva";
import {
  Crosshair,
  Eraser,
  Home,
  LocateFixed,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import {
  CanvasSurface,
  type CanvasFocusRequest,
  type CanvasViewport,
} from "./components/canvas/CanvasSurface";
import { CanvasToolbar } from "./components/canvas/CanvasToolbar";
import { type CanvasToolId } from "./components/canvas/types";
import { type CanvasNode, type Position, type Snapshot } from "./core/nodes";
import {
  installLevaTextareaEnterBehavior,
  requestControlFocus,
} from "./features/controls/focus";
import { isEditableElementFocused } from "./features/hotkeys/helpers";
import {
  createRectNode,
  createTextNode,
  regenerateNodeIds,
} from "./features/nodes/helpers";
import { offsetNodes } from "./features/snapshots/history";
import { useCanvasHotkeys } from "./features/app/useCanvasHotkeys";
import { useGlobalPasteHandler } from "./features/app/useGlobalPasteHandler";
import { useSnapshotState } from "./features/app/useSnapshotState";
import {
  readNodesFromClipboard,
  writeNodesToClipboard,
} from "./utils/clipboard";

const SNAPSHOT_STORAGE_KEY = "mind-canvas:snapshots";

interface SnapshotPayload {
  step: number;
  snapShot: Snapshot[];
}

const isSnapshotArray = (value: unknown): value is Snapshot[] => {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every(
    (snapshot) =>
      typeof snapshot === "object" &&
      snapshot !== null &&
      Array.isArray((snapshot as { nodes?: unknown }).nodes),
  );
};

const normalizeSnapshotPayload = (value: unknown): SnapshotPayload | null => {
  if (isSnapshotArray(value)) {
    return {
      step: 0,
      snapShot: value,
    };
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as {
    step?: unknown;
    snapShot?: unknown;
    snapshots?: unknown;
  };
  const snapshots = record.snapShot ?? record.snapshots;
  if (!isSnapshotArray(snapshots)) {
    return null;
  }

  return {
    step: typeof record.step === "number" ? record.step : 0,
    snapShot: snapshots,
  };
};

export default function App() {
  const [activeToolId, setActiveToolId] = useState<CanvasToolId>("select");
  const [viewport, setViewport] = useState<CanvasViewport>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [showOriginAxes, setShowOriginAxes] = useState(true);
  const [focusFitPercent, setFocusFitPercent] = useState(50);
  const [focusRequest, setFocusRequest] = useState<CanvasFocusRequest | null>(
    null,
  );
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
    stepEntranceNodeIds,
    latestStateRef,
    snapShotLength,
    currentNodes,
    previousNodes,
    commitNodesToStep,
    setCurrentSnapShotNodes,
    removeNodes,
    goToStep,
    goToNextStep,
    removeCurrentStep,
    hydrateSnapshots,
    clearSnapshots,
    undo,
    redo,
  } = useSnapshotState();

  useEffect(() => installLevaTextareaEnterBehavior(), []);

  const createRect = (x: number, y: number) => {
    const node = createRectNode(x, y);
    setCurrentSnapShotNodes([...currentNodes, node]);
    return node.id;
  };

  const createText = (x: number, y: number) => {
    const node = createTextNode(x, y);
    setCurrentSnapShotNodes([...currentNodes, node]);
    return node.id;
  };

  const handleClickBackground = (position: Position) => {
    switch (activeToolId) {
      case "select":
        setActiveNodeIds([]);
        break;
      case "rect": {
        const id = createRect(position.x, position.y);
        setActiveNodeIds([id]);
        requestControlFocus("rect.content");
        setActiveToolId("select");
        break;
      }
      case "text": {
        const id = createText(position.x, position.y);
        setActiveNodeIds([id]);
        requestControlFocus("text.text");
        setActiveToolId("select");
        break;
      }
    }
  };

  const handleNodeDoubleClick = (node: CanvasNode) => {
    if (node.type === "rect") {
      setActiveNodeIds([node.id]);
      requestControlFocus("rect.content");
      return;
    }

    if (node.type === "text") {
      setActiveNodeIds([node.id]);
      requestControlFocus("text.text");
    }
  };

  const selectedNodes = useMemo(
    () => currentNodes.filter((node) => activeNodeIds.includes(node.id)),
    [activeNodeIds, currentNodes],
  );

  const linkedNodeIds = useMemo(() => {
    if (activeNodeIds.length === 0) {
      return [];
    }

    const activeNodeIdSet = new Set(activeNodeIds);

    return currentNodes
      .filter((node) => activeNodeIdSet.has(node.id))
      .filter((node) =>
        snapShot.some(
          (snapshot, snapshotIndex) =>
            snapshotIndex !== step &&
            snapshot.nodes.some((snapshotNode) => snapshotNode.id === node.id),
        ),
      )
      .map((node) => node.id);
  }, [activeNodeIds, currentNodes, snapShot, step]);

  const copySelectedNodes = async () => {
    if (selectedNodes.length === 0) {
      return false;
    }

    await writeNodesToClipboard(selectedNodes);
    toast.success("Copied nodes");
    return true;
  };

  const cutSelectedNodes = async () => {
    if (selectedNodes.length === 0) {
      return;
    }

    const copied = await copySelectedNodes();
    if (!copied) {
      return;
    }

    removeNodes(selectedNodes.map((node) => node.id));
    setActiveNodeIds([]);
    toast.success("Cut nodes");
  };

  const pasteClipboardNodes = async () => {
    const clipboardNodes = await readNodesFromClipboard();

    if (!clipboardNodes || clipboardNodes.length === 0) {
      return false;
    }

    const pastedNodes = offsetNodes(regenerateNodeIds(clipboardNodes), {
      x: 24,
      y: 24,
    });
    setCurrentSnapShotNodes([...currentNodes, ...pastedNodes]);
    setActiveNodeIds(pastedNodes.map((node) => node.id));
    toast.success("Pasted nodes");
    return true;
  };

  const duplicateSelectedNodesToNextSnapshot = () => {
    if (selectedNodes.length === 0) {
      return;
    }

    const targetStep = step + 1;
    if (targetStep >= snapShot.length) {
      toast.warning("Next snapshot does not exist");
      return;
    }

    const targetNodes = snapShot[targetStep].nodes;
    const hasDuplicateId = selectedNodes.some((node) =>
      targetNodes.some((targetNode) => targetNode.id === node.id),
    );

    if (hasDuplicateId) {
      toast.warning("Next snapshot already has one of those ids");
      return;
    }

    commitNodesToStep(targetStep, [
      ...targetNodes,
      ...structuredClone(selectedNodes),
    ]);
    goToStep(targetStep);
    setActiveNodeIds(selectedNodes.map((node) => node.id));
    toast.success("Copied to next snapshot");
  };

  const detachLinkedSelectedNodes = () => {
    if (linkedNodeIds.length === 0) {
      toast.warning("No linked nodes to detach");
      return;
    }

    const detachedNodeIdMap = new Map(
      linkedNodeIds.map(
        (nodeId) => [nodeId, window.crypto.randomUUID()] as const,
      ),
    );

    setCurrentSnapShotNodes(
      currentNodes.map((node) => {
        const detachedNodeId = detachedNodeIdMap.get(node.id);
        if (!detachedNodeId) {
          return node;
        }

        return {
          ...node,
          id: detachedNodeId,
        };
      }),
    );
    setActiveNodeIds(
      activeNodeIds.map((nodeId) => detachedNodeIdMap.get(nodeId) ?? nodeId),
    );
    toast.success(
      linkedNodeIds.length === 1 ? "Node detached" : "Nodes detached",
    );
  };

  const saveSnapshotsToLocalStorage = () => {
    const payload: SnapshotPayload = {
      step,
      snapShot,
    };

    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(payload));
    toast.success("Saved to localStorage");
  };

  const loadSnapshotsFromJson = () => {
    const initialValue = localStorage.getItem(SNAPSHOT_STORAGE_KEY) ?? "";
    const input = window.prompt("Paste snapshot JSON", initialValue);
    if (input === null) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      toast.error("Invalid JSON");
      return;
    }

    const payload = normalizeSnapshotPayload(parsed);
    if (!payload || payload.snapShot.length === 0) {
      toast.error("Invalid snapshot payload");
      return;
    }

    hydrateSnapshots(payload.snapShot, payload.step);
    localStorage.setItem(
      SNAPSHOT_STORAGE_KEY,
      JSON.stringify({
        step: payload.step,
        snapShot: payload.snapShot,
      } satisfies SnapshotPayload),
    );
    toast.success("Loaded snapshots from JSON");
  };

  const clearSavedSnapshots = () => {
    localStorage.removeItem(SNAPSHOT_STORAGE_KEY);
    clearSnapshots();
    toast.success("Cleared localStorage snapshots");
  };

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

  const preventButtonFocus = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  useCanvasHotkeys({
    onSelectTool: () => setActiveToolId("select"),
    onRectTool: () => setActiveToolId("rect"),
    onTextTool: () => setActiveToolId("text"),
    onUndo: undo,
    onRedo: redo,
    onCopy: () => void copySelectedNodes(),
    onCut: () => void cutSelectedNodes(),
    onDuplicate: duplicateSelectedNodesToNextSnapshot,
    onEnter: () => {
      if (isEditableElementFocused() || selectedNodes.length !== 1) {
        return;
      }

      const selectedNode = selectedNodes[0];
      if (selectedNode.type === "rect") {
        requestControlFocus("rect.content");
        return;
      }

      if (selectedNode.type === "text") {
        requestControlFocus("text.text");
      }
    },
    onToggleOverlay: () => setShowPreviousOverlay((prev) => !prev),
    onEscape: () => {
      setActiveNodeIds([]);
      setActiveToolId("select");
    },
    onBackspace: () => {
      if (activeNodeIds.length === 0) {
        return;
      }

      removeNodes(activeNodeIds);
      setActiveNodeIds([]);
    },
    onRemoveSnapshot: removeCurrentStep,
    onSave: saveSnapshotsToLocalStorage,
    onResetViewport: resetViewportToOrigin,
    onStepPrev: () => {
      if (step === 0) {
        toast.warning("Already at the first step");
        return;
      }

      goToStep(step - 1);
    },
    onStepNext: goToNextStep,
  });

  useGlobalPasteHandler({
    commitNodesToStep: (targetStep, nodes) => {
      commitNodesToStep(targetStep, nodes);
    },
    pasteClipboardNodes,
    getLatestState: () => latestStateRef.current,
    setActiveNodeIds,
  });

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="h-full relative">
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

        <div className="absolute inset-0">
          {step > 0 && showPreviousOverlay ? (
            <CanvasSurface
              nodes={previousNodes}
              viewOnly
              showControls={false}
              activeNodeIds={[]}
              entranceNodeIds={[]}
              linkedNodeIds={[]}
              viewport={viewport}
              showOriginAxes={false}
            />
          ) : null}
        </div>

        <div className="relative h-full overflow-hidden">
          <CanvasSurface
            nodes={currentNodes}
            setNodes={setCurrentSnapShotNodes}
            activeNodeIds={activeNodeIds}
            setActiveNodeIds={setActiveNodeIds}
            activeToolId={activeToolId}
            entranceNodeIds={stepEntranceNodeIds}
            linkedNodeIds={linkedNodeIds}
            onDetachLinkedNodes={detachLinkedSelectedNodes}
            onClickBackground={handleClickBackground}
            onNodeDoubleClick={handleNodeDoubleClick}
            viewport={viewport}
            onViewportChange={setViewport}
            showOriginAxes={showOriginAxes}
            focusRequest={focusRequest}
            resetToOriginToken={resetToOriginToken}
          />
        </div>

        <div className="absolute left-5 top-5 z-10 flex flex-col gap-1">
          <button
            type="button"
            onClick={resetViewportToOrigin}
            onMouseDown={preventButtonFocus}
            tabIndex={-1}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/10 bg-neutral-950/85 px-3 text-xs font-medium text-white/80 shadow-[0_10px_32px_rgba(0,0,0,0.28)] transition hover:bg-white/12 hover:text-white"
            title="Reset pan/zoom to origin (Cmd/Ctrl+0)"
          >
            <Home size={14} />
            <span>Origin</span>
          </button>
          <button
            type="button"
            onClick={() => setShowOriginAxes((prev) => !prev)}
            onMouseDown={preventButtonFocus}
            tabIndex={-1}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/10 bg-neutral-950/85 px-3 text-xs font-medium text-white/80 shadow-[0_10px_32px_rgba(0,0,0,0.28)] transition hover:bg-white/12 hover:text-white"
            title={showOriginAxes ? "Hide origin axes" : "Show origin axes"}
          >
            <Crosshair size={13} />
            <span>{showOriginAxes ? "Axis On" : "Axis Off"}</span>
          </button>
          <div className="inline-flex h-9 items-center gap-2 px-3 text-[11px] font-semibold tracking-[0.08em] text-white/70 w-0 whitespace-nowrap">
            <span className="text-white/40">PAN</span>
            <span className="font-mono text-white/85">
              X {viewport.x.toFixed(0)}
            </span>
            <span className="text-white/30">/</span>
            <span className="font-mono text-white/85">
              Y {viewport.y.toFixed(0)}
            </span>
          </div>
          <div className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-neutral-950/70 px-2 text-[11px] font-semibold tracking-[0.06em] text-white/75 shadow-[0_10px_32px_rgba(0,0,0,0.22)]">
            <span className="px-1 text-white/45">FIT</span>
            <input
              type="number"
              min={0}
              max={100}
              value={focusFitPercent}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value, 10);
                if (Number.isNaN(value)) {
                  setFocusFitPercent(0);
                  return;
                }

                setFocusFitPercent(Math.max(0, Math.min(100, value)));
              }}
              className="h-6 w-12 rounded border border-white/15 bg-white/5 px-1 text-right font-mono text-xs text-white/90 outline-none transition focus:border-white/35"
              title="Focus fit ratio (0-100%)"
            />
            <span className="text-white/45">%</span>
            <button
              type="button"
              onClick={focusSelectedNodes}
              onMouseDown={preventButtonFocus}
              tabIndex={-1}
              className="inline-flex h-7 items-center justify-center gap-1 rounded border border-white/10 bg-white/5 px-2 text-[10px] font-semibold text-white/80 transition hover:bg-white/12 hover:text-white"
              title="Focus selected nodes"
            >
              <LocateFixed size={12} />
              <span>Focus</span>
            </button>
          </div>
        </div>

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

        <Leva
          hidden={activeNodeIds.length === 0}
          titleBar={{ position: { x: 0, y: 24 } }}
        />
      </div>
    </>
  );
}
