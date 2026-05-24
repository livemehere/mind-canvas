import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Leva } from "leva";
import { Trash2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";
import { CanvasSurface } from "./components/canvas/CanvasSurface";
import {
  CanvasToolbar,
  type CanvasToolId,
} from "./components/canvas/CanvasToolbar";
import {
  type CanvasNode,
  DEFAULT_RECT_NODE,
  DEFAULT_TEXT_NODE,
  type Position,
  type Snapshot,
} from "./core/nodes";
import {
  installLevaTextareaEnterBehavior,
  requestControlFocus,
} from "./features/controls/focus";
import {
  createImageRectNode,
  getImageFileFromClipboardEvent,
  readImageDataUrl,
  readNodesFromClipboard,
  readNodesFromClipboardEvent,
  writeNodesToClipboard,
} from "./utils/clipboard";

interface StepHistory {
  snapshots: Snapshot[];
  index: number;
}

const NO_FIELD_CHANGE = Symbol("NO_FIELD_CHANGE");

interface CommitNodesOptions {
  skipHistory?: boolean;
  commitHistory?: boolean;
  syncMatchingIds?: boolean;
}

const cloneNodes = (nodes: CanvasNode[]) => structuredClone(nodes);

const createSnapshot = (nodes: CanvasNode[]): Snapshot => ({
  nodes: cloneNodes(nodes),
});

const createStepHistory = (nodes: CanvasNode[]): StepHistory => ({
  snapshots: [createSnapshot(nodes)],
  index: 0,
});

const nodesEqual = (a: CanvasNode[], b: CanvasNode[]) =>
  JSON.stringify(a) === JSON.stringify(b);

const offsetNodes = (nodes: CanvasNode[], offset: Position) =>
  nodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x + offset.x,
      y: node.position.y + offset.y,
    },
  }));

const regenerateNodeIds = (nodes: CanvasNode[]) =>
  nodes.map((node) => ({
    ...node,
    id: window.crypto.randomUUID(),
  }));

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isEditableElementFocused = () => {
  const activeElement = document.activeElement;

  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement ||
    activeElement instanceof HTMLButtonElement ||
    activeElement?.hasAttribute("contenteditable") === true
  );
};

const getStepOverlayNodes = (snapshots: Snapshot[], step: number) =>
  step > 0 ? snapshots[step - 1].nodes : [];

const getEnteringNodeIds = (
  previousNodes: CanvasNode[],
  nextNodes: CanvasNode[],
) => {
  const previousNodeIds = new Set(previousNodes.map((node) => node.id));

  return nextNodes
    .filter(
      (node) =>
        node.replayEntranceOnStepChange || !previousNodeIds.has(node.id),
    )
    .map((node) => node.id);
};

const createChangedFieldPatch = (
  baseline: unknown,
  next: unknown,
): unknown | typeof NO_FIELD_CHANGE => {
  if (Object.is(baseline, next)) {
    return NO_FIELD_CHANGE;
  }

  if (isPlainObject(baseline) && isPlainObject(next)) {
    const patch: Record<string, unknown> = {};
    let hasChange = false;

    const keys = new Set([...Object.keys(baseline), ...Object.keys(next)]);
    keys.forEach((key) => {
      const childPatch = createChangedFieldPatch(baseline[key], next[key]);
      if (childPatch === NO_FIELD_CHANGE) {
        return;
      }

      patch[key] = childPatch;
      hasChange = true;
    });

    return hasChange ? patch : NO_FIELD_CHANGE;
  }

  return structuredClone(next);
};

const applyChangedFieldPatch = <T,>(target: T, patch: unknown): T => {
  if (isPlainObject(target) && isPlainObject(patch)) {
    const nextTarget: Record<string, unknown> = { ...target };

    Object.entries(patch).forEach(([key, value]) => {
      const currentValue = (target as Record<string, unknown>)[key];
      nextTarget[key] =
        isPlainObject(currentValue) && isPlainObject(value)
          ? applyChangedFieldPatch(currentValue, value)
          : structuredClone(value);
    });

    return nextTarget as T;
  }

  return structuredClone(patch) as T;
};

const getChangedNodePatchMap = (
  baselineNodes: CanvasNode[],
  nextNodes: CanvasNode[],
) => {
  const baselineNodeMap = new Map(
    baselineNodes.map((node) => [node.id, node] as const),
  );
  const changedNodePatchMap = new Map<string, unknown>();

  nextNodes.forEach((node) => {
    const baselineNode = baselineNodeMap.get(node.id);
    if (!baselineNode) {
      return;
    }

    const patch = createChangedFieldPatch(baselineNode, node);
    if (patch === NO_FIELD_CHANGE) {
      return;
    }

    changedNodePatchMap.set(node.id, patch);
  });

  return changedNodePatchMap;
};

const oncePerKeypress =
  (handler: () => void, options?: { preventDefault?: boolean }) =>
  (event: KeyboardEvent) => {
    if (event.repeat) {
      return;
    }

    if (options?.preventDefault) {
      event.preventDefault();
    }

    handler();
  };

export default function App() {
  const [step, setStep] = useState(0);
  const [snapShot, setSnapShot] = useState<Snapshot[]>([{ nodes: [] }]);
  const [histories, setHistories] = useState<StepHistory[]>([
    createStepHistory([]),
  ]);
  const [autoAddSnapshotOnAdvance, setAutoAddSnapshotOnAdvance] =
    useState(true);
  const [duplicateNodesIntoNewSnapshot, setDuplicateNodesIntoNewSnapshot] =
    useState(true);
  const [syncMatchingIdEdits, setSyncMatchingIdEdits] = useState(false);
  const [showPreviousOverlay, setShowPreviousOverlay] = useState(true);
  const [activeNodeIds, setActiveNodeIds] = useState<string[]>([]);
  const [stepEntranceNodeIds, setStepEntranceNodeIds] = useState<string[]>([]);
  const [activeToolId, setActiveToolId] = useState<CanvasToolId>("select");
  const latestStateRef = useRef({
    step: 0,
    snapShot: [{ nodes: [] }] as Snapshot[],
    histories: [createStepHistory([])] as StepHistory[],
    activeNodeIds: [] as string[],
    autoAddSnapshotOnAdvance: true,
    duplicateNodesIntoNewSnapshot: true,
    syncMatchingIdEdits: false,
  });

  const snapShotLength = snapShot.length;
  const currentSnapShot = snapShot[step];
  const currentNodes = currentSnapShot.nodes;
  const previousNodes = getStepOverlayNodes(snapShot, step);
  const currentHistory = histories[step] ?? createStepHistory(currentNodes);

  useEffect(() => installLevaTextareaEnterBehavior(), []);

  useEffect(() => {
    latestStateRef.current = {
      step,
      snapShot,
      histories,
      activeNodeIds,
      autoAddSnapshotOnAdvance,
      duplicateNodesIntoNewSnapshot,
      syncMatchingIdEdits,
    };
  }, [
    step,
    snapShot,
    histories,
    activeNodeIds,
    autoAddSnapshotOnAdvance,
    duplicateNodesIntoNewSnapshot,
    syncMatchingIdEdits,
  ]);

  const commitNodesToStep = (
    targetStep: number,
    nodes: CanvasNode[],
    options?: CommitNodesOptions,
  ) => {
    const {
      snapShot: previousSnapshots,
      histories: previousHistories,
      syncMatchingIdEdits: shouldSyncMatchingIds,
    } = latestStateRef.current;

    let nextSnapshots = [...previousSnapshots];
    nextSnapshots[targetStep] = createSnapshot(nodes);
    const affectedSteps = new Set([targetStep]);

    if (
      shouldSyncMatchingIds &&
      options?.syncMatchingIds &&
      !options.skipHistory &&
      options.commitHistory !== false
    ) {
      const targetHistory =
        previousHistories[targetStep] ??
        createStepHistory(previousSnapshots[targetStep]?.nodes ?? []);
      const baselineNodes =
        targetHistory.snapshots[targetHistory.index]?.nodes ??
        previousSnapshots[targetStep]?.nodes ??
        [];
      const changedNodePatchMap = getChangedNodePatchMap(baselineNodes, nodes);

      if (changedNodePatchMap.size > 0) {
        nextSnapshots = nextSnapshots.map((snapshot, stepIndex) => {
          if (stepIndex === targetStep) {
            return snapshot;
          }

          let didChange = false;
          const nextNodes = snapshot.nodes.map((node) => {
            const changedNodePatch = changedNodePatchMap.get(node.id);
            if (!changedNodePatch) {
              return node;
            }

            didChange = true;
            return applyChangedFieldPatch(node, changedNodePatch);
          });

          if (!didChange) {
            return snapshot;
          }

          affectedSteps.add(stepIndex);
          return createSnapshot(nextNodes);
        });
      }
    }

    let nextHistories = previousHistories;
    if (!options?.skipHistory && options?.commitHistory !== false) {
      nextHistories = [...previousHistories];

      affectedSteps.forEach((stepIndex) => {
        const stepNodes = nextSnapshots[stepIndex]?.nodes ?? [];
        const stepHistory =
          nextHistories[stepIndex] ?? createStepHistory(stepNodes);
        const baseSnapshots = stepHistory.snapshots.slice(
          0,
          stepHistory.index + 1,
        );
        const lastNodes = baseSnapshots.at(-1)?.nodes ?? [];

        if (nodesEqual(lastNodes, stepNodes)) {
          nextHistories[stepIndex] = stepHistory;
          return;
        }

        nextHistories[stepIndex] = {
          snapshots: [...baseSnapshots, createSnapshot(stepNodes)],
          index: baseSnapshots.length,
        };
      });
    }

    latestStateRef.current = {
      ...latestStateRef.current,
      snapShot: nextSnapshots,
      histories: nextHistories,
    };
    setSnapShot(nextSnapshots);
    if (nextHistories !== previousHistories) {
      setHistories(nextHistories);
    }
  };

  const setCurrentSnapShotNodes = (
    nodes: CanvasNode[],
    options?: { commitHistory?: boolean; syncMatchingIds?: boolean },
  ) => {
    commitNodesToStep(step, nodes, options);
  };

  const removeNodes = (nodeIds: string[]) => {
    setCurrentSnapShotNodes(
      currentNodes.filter((node) => !nodeIds.includes(node.id)),
    );
  };

  const goToStep = (nextStep: number, nextNodesOverride?: CanvasNode[]) => {
    const { step: currentStep, snapShot: snapshots } = latestStateRef.current;
    const previousNodes = snapshots[currentStep]?.nodes ?? [];
    const nextNodes = nextNodesOverride ?? snapshots[nextStep]?.nodes ?? [];

    setStepEntranceNodeIds(getEnteringNodeIds(previousNodes, nextNodes));
    setStep(nextStep);
    setActiveNodeIds([]);
  };

  const goToNextStep = () => {
    if (step < snapShotLength - 1) {
      goToStep(step + 1);
      return;
    }

    if (!autoAddSnapshotOnAdvance) {
      toast.warning("Already at the last step");
      return;
    }

    const nextNodes = duplicateNodesIntoNewSnapshot ? cloneNodes(currentNodes) : [];

    flushSync(() => {
      setSnapShot((prev) => [...prev, createSnapshot(nextNodes)]);
      setHistories((prev) => [...prev, createStepHistory(nextNodes)]);
      setStepEntranceNodeIds(nextNodes.map((node) => node.id));
      setActiveNodeIds([]);
      setStep(snapShotLength);
    });

    toast.success("Snapshot added");
  };

  const removeCurrentStep = () => {
    if (snapShot.length === 1) {
      toast.warning("Cannot remove the last snapshot");
      return;
    }

    const targetStep = step;
    const nextStep = Math.max(0, Math.min(targetStep, snapShot.length - 2));

    setSnapShot((prev) => prev.filter((_, index) => index !== targetStep));
    setHistories((prev) => prev.filter((_, index) => index !== targetStep));
    setStepEntranceNodeIds([]);
    setStep(nextStep);
    setActiveNodeIds([]);
    toast.success("Snapshot removed");
  };

  const undo = () => {
    if (currentHistory.index === 0) {
      toast.warning("Nothing to undo");
      return;
    }

    const nextIndex = currentHistory.index - 1;
    const snapshot = currentHistory.snapshots[nextIndex];

    setHistories((prev) => {
      const next = [...prev];
      next[step] = { ...currentHistory, index: nextIndex };
      return next;
    });
    commitNodesToStep(step, snapshot.nodes, { skipHistory: true });
    setActiveNodeIds([]);
  };

  const redo = () => {
    if (currentHistory.index >= currentHistory.snapshots.length - 1) {
      toast.warning("Nothing to redo");
      return;
    }

    const nextIndex = currentHistory.index + 1;
    const snapshot = currentHistory.snapshots[nextIndex];

    setHistories((prev) => {
      const next = [...prev];
      next[step] = { ...currentHistory, index: nextIndex };
      return next;
    });
    commitNodesToStep(step, snapshot.nodes, { skipHistory: true });
    setActiveNodeIds([]);
  };

  const createRect = (x: number, y: number) => {
    const id = window.crypto.randomUUID();
    setCurrentSnapShotNodes([
      ...currentNodes,
      {
        ...DEFAULT_RECT_NODE,
        id,
        position: { x, y },
      },
    ]);
    return id;
  };

  const createText = (x: number, y: number) => {
    const id = window.crypto.randomUUID();
    setCurrentSnapShotNodes([
      ...currentNodes,
      {
        ...DEFAULT_TEXT_NODE,
        id,
        position: { x, y },
      },
    ]);
    return id;
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
      return;
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
      ...cloneNodes(selectedNodes),
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
    toast.success(
      linkedNodeIds.length === 1 ? "Node detached" : "Nodes detached",
    );
  };

  useHotkeys(
    "q",
    oncePerKeypress(() => setActiveToolId("select")),
  );
  useHotkeys(
    "w",
    oncePerKeypress(() => setActiveToolId("rect")),
  );
  useHotkeys(
    "e",
    oncePerKeypress(() => setActiveToolId("text")),
  );
  useHotkeys(
    "meta+z,ctrl+z",
    oncePerKeypress(() => undo(), { preventDefault: true }),
  );
  useHotkeys(
    "meta+shift+z,ctrl+shift+z",
    oncePerKeypress(() => redo(), { preventDefault: true }),
  );
  useHotkeys(
    "meta+c,ctrl+c",
    oncePerKeypress(() => void copySelectedNodes(), { preventDefault: true }),
  );
  useHotkeys(
    "meta+x,ctrl+x",
    oncePerKeypress(() => void cutSelectedNodes(), { preventDefault: true }),
  );
  useHotkeys(
    "meta+d,ctrl+d",
    oncePerKeypress(() => duplicateSelectedNodesToNextSnapshot(), {
      preventDefault: true,
    }),
  );
  useHotkeys(
    "Enter",
    oncePerKeypress(
      () => {
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
      { preventDefault: true },
    ),
  );
  useHotkeys(
    "shift+o",
    oncePerKeypress(() => setShowPreviousOverlay((prev) => !prev)),
  );
  useHotkeys(
    "Escape",
    oncePerKeypress(() => {
      setActiveNodeIds([]);
      setActiveToolId("select");
    }),
  );
  useHotkeys(
    "Backspace",
    oncePerKeypress(() => {
      if (activeNodeIds.length === 0) {
        return;
      }

      removeNodes(activeNodeIds);
      setActiveNodeIds([]);
    }),
  );
  useHotkeys(
    "1",
    oncePerKeypress(() => {
      if (step === 0) {
        toast.warning("Already at the first step");
        return;
      }

      goToStep(step - 1);
    }),
  );
  useHotkeys(
    "2",
    oncePerKeypress(() => goToNextStep()),
  );

  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const imageFile = getImageFileFromClipboardEvent(event);

      if (imageFile) {
        event.preventDefault();
        const backgroundImage = await readImageDataUrl(imageFile);
        const rectNode = await createImageRectNode(
          imageFile,
          () => window.crypto.randomUUID(),
          { x: 120, y: 120 },
        );
        const {
          step: activeStep,
          snapShot: snapshots,
          activeNodeIds: selectedIds,
        } = latestStateRef.current;
        const nodes = snapshots[activeStep].nodes;

        const selectedRectNode =
          selectedIds.length === 1
            ? nodes.find(
                (node) => node.id === selectedIds[0] && node.type === "rect",
              )
            : undefined;

        if (selectedRectNode && selectedRectNode.type === "rect") {
          commitNodesToStep(
            activeStep,
            nodes.map((node) =>
              node.id === selectedRectNode.id
                ? {
                    ...node,
                    backgroundImage,
                  }
                : node,
            ),
          );
          setActiveNodeIds([selectedRectNode.id]);
          toast.success("Image applied to selected rect");
          return;
        }

        commitNodesToStep(activeStep, [...nodes, rectNode]);
        setActiveNodeIds([rectNode.id]);
        toast.success("Image pasted as rect");
        return;
      }

      const eventClipboardNodes = readNodesFromClipboardEvent(event);
      if (eventClipboardNodes && eventClipboardNodes.length > 0) {
        event.preventDefault();
        const pastedNodes = offsetNodes(
          regenerateNodeIds(eventClipboardNodes),
          {
            x: 24,
            y: 24,
          },
        );
        const { step: activeStep, snapShot: snapshots } =
          latestStateRef.current;
        const nodes = snapshots[activeStep].nodes;
        commitNodesToStep(activeStep, [...nodes, ...pastedNodes]);
        setActiveNodeIds(pastedNodes.map((node) => node.id));
        toast.success("Pasted nodes");
        return;
      }

      const pasted = await pasteClipboardNodes();

      if (pasted) {
        event.preventDefault();
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [currentNodes, step]);

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
