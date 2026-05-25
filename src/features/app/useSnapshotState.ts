import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";
import { type CanvasEdge, type CanvasNode, type Snapshot } from "../../core/nodes";
import {
  applyChangedFieldPatch,
  getChangedEdgePatchMap,
  cloneNodes,
  cloneEdges,
  getEnteringEdgeIds,
  createStepHistory,
  createSnapshot,
  getChangedNodePatchMap,
  getEnteringNodeIds,
  getStepOverlayEdges,
  getStepOverlayNodes,
  nodesEqual,
  type CommitNodesOptions,
  type StepHistory,
} from "../snapshots/history";

export const useSnapshotState = () => {
  const [step, setStep] = useState(0);
  const [snapShot, setSnapShot] = useState<Snapshot[]>([
    { nodes: [], edges: [] },
  ]);
  const [histories, setHistories] = useState<StepHistory[]>([
    createStepHistory([], []),
  ]);
  const [autoAddSnapshotOnAdvance, setAutoAddSnapshotOnAdvance] =
    useState(true);
  const [duplicateNodesIntoNewSnapshot, setDuplicateNodesIntoNewSnapshot] =
    useState(true);
  const [syncMatchingIdEdits, setSyncMatchingIdEdits] = useState(false);
  const [showPreviousOverlay, setShowPreviousOverlay] = useState(true);
  const [activeNodeIds, setActiveNodeIds] = useState<string[]>([]);
  const [activeEdgeIds, setActiveEdgeIds] = useState<string[]>([]);
  const [stepEntranceNodeIds, setStepEntranceNodeIds] = useState<string[]>([]);
  const [stepEntranceEdgeIds, setStepEntranceEdgeIds] = useState<string[]>([]);

  const latestStateRef = useRef({
    step: 0,
    snapShot: [{ nodes: [], edges: [] }] as Snapshot[],
    histories: [createStepHistory([], [])] as StepHistory[],
    activeNodeIds: [] as string[],
    activeEdgeIds: [] as string[],
    autoAddSnapshotOnAdvance: true,
    duplicateNodesIntoNewSnapshot: true,
    syncMatchingIdEdits: false,
  });

  const snapShotLength = snapShot.length;
  const currentSnapShot = snapShot[step];
  const currentNodes = currentSnapShot.nodes;
  const currentEdges = currentSnapShot.edges;
  const previousNodes = getStepOverlayNodes(snapShot, step);
  const previousEdges = getStepOverlayEdges(snapShot, step);
  const currentHistory =
    histories[step] ?? createStepHistory(currentNodes, currentEdges);

  useEffect(() => {
    latestStateRef.current = {
      step,
      snapShot,
      histories,
      activeNodeIds,
      activeEdgeIds,
      autoAddSnapshotOnAdvance,
      duplicateNodesIntoNewSnapshot,
      syncMatchingIdEdits,
    };
  }, [
    step,
    snapShot,
    histories,
    activeNodeIds,
    activeEdgeIds,
    autoAddSnapshotOnAdvance,
    duplicateNodesIntoNewSnapshot,
    syncMatchingIdEdits,
  ]);

  const commitNodesToStep = (
    targetStep: number,
    nodes: CanvasNode[],
    edges?: CanvasEdge[],
    options?: CommitNodesOptions,
  ) => {
    const {
      snapShot: previousSnapshots,
      histories: previousHistories,
      syncMatchingIdEdits: shouldSyncMatchingIds,
    } = latestStateRef.current;

    let nextSnapshots = [...previousSnapshots];
    const targetEdges = edges ?? previousSnapshots[targetStep]?.edges ?? [];
    nextSnapshots[targetStep] = createSnapshot(nodes, targetEdges);
    const affectedSteps = new Set([targetStep]);

    if (
      shouldSyncMatchingIds &&
      options?.syncMatchingIds &&
      !options.skipHistory &&
      options.commitHistory !== false
    ) {
      const targetHistory =
        previousHistories[targetStep] ??
        createStepHistory(
          previousSnapshots[targetStep]?.nodes ?? [],
          previousSnapshots[targetStep]?.edges ?? [],
        );
      const baselineNodes =
        targetHistory.snapshots[targetHistory.index]?.nodes ??
        previousSnapshots[targetStep]?.nodes ??
        [];
      const baselineEdges =
        targetHistory.snapshots[targetHistory.index]?.edges ??
        previousSnapshots[targetStep]?.edges ??
        [];
      const changedNodePatchMap = getChangedNodePatchMap(baselineNodes, nodes);
      const changedEdgePatchMap = getChangedEdgePatchMap(
        baselineEdges,
        targetEdges,
      );

      if (changedNodePatchMap.size > 0 || changedEdgePatchMap.size > 0) {
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
          const nextEdges = snapshot.edges.map((edge) => {
            const changedEdgePatch = changedEdgePatchMap.get(edge.id);
            if (!changedEdgePatch) {
              return edge;
            }

            didChange = true;
            return applyChangedFieldPatch(edge, changedEdgePatch);
          });

          if (!didChange) {
            return snapshot;
          }

          affectedSteps.add(stepIndex);
          return createSnapshot(nextNodes, nextEdges);
        });
      }
    }

    let nextHistories = previousHistories;
    if (!options?.skipHistory && options?.commitHistory !== false) {
      nextHistories = [...previousHistories];

      affectedSteps.forEach((stepIndex) => {
        const stepNodes = nextSnapshots[stepIndex]?.nodes ?? [];
        const stepEdges = nextSnapshots[stepIndex]?.edges ?? [];
        const stepHistory =
          nextHistories[stepIndex] ?? createStepHistory(stepNodes, stepEdges);
        const baseSnapshots = stepHistory.snapshots.slice(0, stepHistory.index + 1);
        const lastNodes = baseSnapshots.at(-1)?.nodes ?? [];
        const lastEdges = baseSnapshots.at(-1)?.edges ?? [];

        if (nodesEqual(lastNodes, stepNodes) && nodesEqual(lastEdges, stepEdges)) {
          nextHistories[stepIndex] = stepHistory;
          return;
        }

        nextHistories[stepIndex] = {
          snapshots: [...baseSnapshots, createSnapshot(stepNodes, stepEdges)],
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
    edges?: CanvasEdge[],
    options?: { commitHistory?: boolean; syncMatchingIds?: boolean },
  ) => {
    commitNodesToStep(step, nodes, edges, options);
  };

  const removeNodes = (nodeIds: string[]) => {
    const nextNodes = currentNodes.filter((node) => !nodeIds.includes(node.id));
    const nextEdges = currentEdges.filter(
      (edge) =>
        !nodeIds.includes(edge.sourceNodeId) && !nodeIds.includes(edge.targetNodeId),
    );
    setCurrentSnapShotNodes(nextNodes, nextEdges);
  };

  const setCurrentSnapShotEdges = (
    edges: CanvasEdge[],
    options?: { commitHistory?: boolean; syncMatchingIds?: boolean },
  ) => {
    commitNodesToStep(step, currentNodes, edges, options);
  };

  const removeEdges = (edgeIds: string[]) => {
    setCurrentSnapShotEdges(
      currentEdges.filter((edge) => !edgeIds.includes(edge.id)),
    );
  };

  const goToStep = (nextStep: number, nextNodesOverride?: CanvasNode[]) => {
    const { step: currentStep, snapShot: snapshots } = latestStateRef.current;
    const previousStepNodes = snapshots[currentStep]?.nodes ?? [];
    const previousStepEdges = snapshots[currentStep]?.edges ?? [];
    const nextNodes = nextNodesOverride ?? snapshots[nextStep]?.nodes ?? [];
    const nextEdges = snapshots[nextStep]?.edges ?? [];

    setStepEntranceNodeIds(getEnteringNodeIds(previousStepNodes, nextNodes));
    setStepEntranceEdgeIds(getEnteringEdgeIds(previousStepEdges, nextEdges));
    setStep(nextStep);
    setActiveNodeIds([]);
    setActiveEdgeIds([]);
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
    const nextEdges = duplicateNodesIntoNewSnapshot ? cloneEdges(currentEdges) : [];

    flushSync(() => {
      setSnapShot((prev) => [...prev, createSnapshot(nextNodes, nextEdges)]);
      setHistories((prev) => [...prev, createStepHistory(nextNodes, nextEdges)]);
      setStepEntranceNodeIds(nextNodes.map((node) => node.id));
      setStepEntranceEdgeIds(nextEdges.map((edge) => edge.id));
      setActiveNodeIds([]);
      setActiveEdgeIds([]);
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
    setStepEntranceEdgeIds([]);
    setStep(nextStep);
    setActiveNodeIds([]);
    setActiveEdgeIds([]);
    toast.success("Snapshot removed");
  };

  const hydrateSnapshots = (snapshots: Snapshot[], nextStep?: number) => {
    if (snapshots.length === 0) {
      return;
    }

    const normalizedSnapshots = snapshots.map((snapshot) =>
      createSnapshot(snapshot.nodes, snapshot.edges ?? []),
    );
    const normalizedHistories = normalizedSnapshots.map((snapshot) =>
      createStepHistory(snapshot.nodes, snapshot.edges),
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
      activeEdgeIds: [],
    };
    setSnapShot(normalizedSnapshots);
    setHistories(normalizedHistories);
    setStepEntranceNodeIds([]);
    setStepEntranceEdgeIds([]);
    setActiveNodeIds([]);
    setActiveEdgeIds([]);
    setStep(safeStep);
  };

  const clearSnapshots = () => {
    const emptySnapshots = [createSnapshot([], [])];
    const emptyHistories = [createStepHistory([], [])];

    latestStateRef.current = {
      ...latestStateRef.current,
      step: 0,
      snapShot: emptySnapshots,
      histories: emptyHistories,
      activeNodeIds: [],
      activeEdgeIds: [],
    };
    setSnapShot(emptySnapshots);
    setHistories(emptyHistories);
    setStepEntranceNodeIds([]);
    setStepEntranceEdgeIds([]);
    setActiveNodeIds([]);
    setActiveEdgeIds([]);
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
    commitNodesToStep(step, snapshot.nodes, snapshot.edges, { skipHistory: true });
    setActiveNodeIds([]);
    setActiveEdgeIds([]);
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
    commitNodesToStep(step, snapshot.nodes, snapshot.edges, { skipHistory: true });
    setActiveNodeIds([]);
    setActiveEdgeIds([]);
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
  };
};
