import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { type CanvasNode, type Snapshot } from "../../core/nodes";
import {
  applyChangedFieldPatch,
  cloneNodes,
  createStepHistory,
  createSnapshot,
  getChangedNodePatchMap,
  getEnteringNodeIds,
  getStepOverlayNodes,
  nodesEqual,
  type CommitNodesOptions,
  type StepHistory,
} from "../snapshots/history";

export const useSnapshotState = () => {
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
        const stepHistory = nextHistories[stepIndex] ?? createStepHistory(stepNodes);
        const baseSnapshots = stepHistory.snapshots.slice(0, stepHistory.index + 1);
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
    setCurrentSnapShotNodes(currentNodes.filter((node) => !nodeIds.includes(node.id)));
  };

  const goToStep = (nextStep: number, nextNodesOverride?: CanvasNode[]) => {
    const { step: currentStep, snapShot: snapshots } = latestStateRef.current;
    const previousStepNodes = snapshots[currentStep]?.nodes ?? [];
    const nextNodes = nextNodesOverride ?? snapshots[nextStep]?.nodes ?? [];

    setStepEntranceNodeIds(getEnteringNodeIds(previousStepNodes, nextNodes));
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

  const hydrateSnapshots = (snapshots: Snapshot[], nextStep?: number) => {
    if (snapshots.length === 0) {
      return;
    }

    const normalizedSnapshots = snapshots.map((snapshot) =>
      createSnapshot(snapshot.nodes),
    );
    const normalizedHistories = normalizedSnapshots.map((snapshot) =>
      createStepHistory(snapshot.nodes),
    );
    const safeStep = Math.max(
      0,
      Math.min(nextStep ?? 0, normalizedSnapshots.length - 1),
    );

    latestStateRef.current = {
      ...latestStateRef.current,
      step: safeStep,
      snapShot: normalizedSnapshots,
      histories: normalizedHistories,
      activeNodeIds: [],
    };
    setSnapShot(normalizedSnapshots);
    setHistories(normalizedHistories);
    setStepEntranceNodeIds([]);
    setActiveNodeIds([]);
    setStep(safeStep);
  };

  const clearSnapshots = () => {
    const emptySnapshots = [createSnapshot([])];
    const emptyHistories = [createStepHistory([])];

    latestStateRef.current = {
      ...latestStateRef.current,
      step: 0,
      snapShot: emptySnapshots,
      histories: emptyHistories,
      activeNodeIds: [],
    };
    setSnapShot(emptySnapshots);
    setHistories(emptyHistories);
    setStepEntranceNodeIds([]);
    setActiveNodeIds([]);
    setStep(0);
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

  return {
    step,
    setStep,
    snapShot,
    setSnapShot,
    histories,
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
  };
};
