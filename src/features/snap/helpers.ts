import { type CanvasNode } from "../../core/nodes";
import { type CanvasSize } from "../controls/types";

export interface SnapGuide {
  x?: number;
  y?: number;
}

interface SnapBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export interface DragSnapCache {
  movingX: number[];
  movingY: number[];
  targetX: number[];
  targetY: number[];
}

const DRAG_SNAP_THRESHOLD = 8;

const getSnapBoundsFromElement = (
  element: HTMLDivElement,
  canvasRect: DOMRect,
): SnapBounds => {
  const rect = element.getBoundingClientRect();
  const left = rect.left - canvasRect.left;
  const top = rect.top - canvasRect.top;
  const right = rect.right - canvasRect.left;
  const bottom = rect.bottom - canvasRect.top;

  return {
    left,
    right,
    top,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
};

const getBestSnap = (points: number[], targets: number[]) => {
  let bestTarget: number | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (const point of points) {
    for (const target of targets) {
      const diff = target - point;
      if (Math.abs(diff) < Math.abs(bestDiff)) {
        bestDiff = diff;
        bestTarget = target;
      }
    }
  }

  if (bestTarget === null || Math.abs(bestDiff) > DRAG_SNAP_THRESHOLD) {
    return null;
  }

  return { diff: bestDiff, target: bestTarget };
};

export const buildDragSnapCache = ({
  movingNodeIds,
  nodes,
  nodeRefs,
  canvasRect,
  canvasSize,
}: {
  movingNodeIds: string[];
  nodes: CanvasNode[];
  nodeRefs: Record<string, HTMLDivElement | null>;
  canvasRect: DOMRect;
  canvasSize: CanvasSize;
}): DragSnapCache | null => {
  const movingBoundsList = movingNodeIds
    .map((nodeId) => {
      const element = nodeRefs[nodeId];
      return element ? getSnapBoundsFromElement(element, canvasRect) : null;
    })
    .filter((bounds): bounds is SnapBounds => bounds !== null);

  if (movingBoundsList.length === 0) {
    return null;
  }

  const targetBounds = nodes
    .filter((currentNode) => !movingNodeIds.includes(currentNode.id))
    .map((currentNode) => {
      const element = nodeRefs[currentNode.id];
      return element ? getSnapBoundsFromElement(element, canvasRect) : null;
    })
    .filter((bounds): bounds is SnapBounds => bounds !== null);

  return {
    movingX: movingBoundsList.flatMap((bounds) => [
      bounds.left,
      bounds.centerX,
      bounds.right,
    ]),
    movingY: movingBoundsList.flatMap((bounds) => [
      bounds.top,
      bounds.centerY,
      bounds.bottom,
    ]),
    targetX: [
      ...targetBounds.flatMap((bounds) => [
        bounds.left,
        bounds.centerX,
        bounds.right,
      ]),
      canvasSize.width / 2,
    ],
    targetY: [
      ...targetBounds.flatMap((bounds) => [
        bounds.top,
        bounds.centerY,
        bounds.bottom,
      ]),
      canvasSize.height / 2,
    ],
  };
};

export const getSnapPreviewOffset = (
  offset: { x: number; y: number },
  cache: DragSnapCache,
) => {
  const xSnap = getBestSnap(
    cache.movingX.map((point) => point + offset.x),
    cache.targetX,
  );
  const ySnap = getBestSnap(
    cache.movingY.map((point) => point + offset.y),
    cache.targetY,
  );

  return {
    offset: {
      x: xSnap ? offset.x + xSnap.diff : offset.x,
      y: ySnap ? offset.y + ySnap.diff : offset.y,
    },
    guides: {
      x: xSnap?.target,
      y: ySnap?.target,
    } satisfies SnapGuide,
  };
};
