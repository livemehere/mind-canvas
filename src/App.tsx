import { useEffect, useMemo, useState } from "react";
import { Leva } from "leva";
import { Trash2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { CanvasSurface } from "./components/canvas/CanvasSurface";
import { CanvasToolbar } from "./components/canvas/CanvasToolbar";
import { type CanvasToolId } from "./components/canvas/types";
import { type CanvasNode, type Position } from "./core/nodes";
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
import { readNodesFromClipboard, writeNodesToClipboard } from "./utils/clipboard";

export default function App() {
  const [activeToolId, setActiveToolId] = useState<CanvasToolId>("select");
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

    commitNodesToStep(targetStep, [...targetNodes, ...structuredClone(selectedNodes)]);
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
      linkedNodeIds.map((nodeId) => [nodeId, window.crypto.randomUUID()] as const),
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
    toast.success(linkedNodeIds.length === 1 ? "Node detached" : "Nodes detached");
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
              title="Remove current snapshot"
            >
              <Trash2 size={14} />
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
          />
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
