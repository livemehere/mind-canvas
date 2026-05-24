import { type CanvasNode, type Position, type Snapshot } from "../../core/nodes";

export interface StepHistory {
  snapshots: Snapshot[];
  index: number;
}

export interface CommitNodesOptions {
  skipHistory?: boolean;
  commitHistory?: boolean;
  syncMatchingIds?: boolean;
}

const NO_FIELD_CHANGE = Symbol("NO_FIELD_CHANGE");

export const cloneNodes = (nodes: CanvasNode[]) => structuredClone(nodes);

export const createSnapshot = (nodes: CanvasNode[]): Snapshot => ({
  nodes: cloneNodes(nodes),
});

export const createStepHistory = (nodes: CanvasNode[]): StepHistory => ({
  snapshots: [createSnapshot(nodes)],
  index: 0,
});

export const nodesEqual = (a: CanvasNode[], b: CanvasNode[]) =>
  JSON.stringify(a) === JSON.stringify(b);

export const getStepOverlayNodes = (snapshots: Snapshot[], step: number) =>
  step > 0 ? snapshots[step - 1].nodes : [];

export const getEnteringNodeIds = (
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

export const offsetNodes = (nodes: CanvasNode[], offset: Position) =>
  nodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x + offset.x,
      y: node.position.y + offset.y,
    },
  }));

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

export const applyChangedFieldPatch = <T,>(target: T, patch: unknown): T => {
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

export const getChangedNodePatchMap = (
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
