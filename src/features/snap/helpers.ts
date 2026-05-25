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

interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}

const DRAG_SNAP_THRESHOLD = 8;

const getSnapBoundsFromElement = (
  element: HTMLDivElement,
  canvasRect: DOMRect,
  viewport: ViewportTransform,
): SnapBounds => {
  const rect = element.getBoundingClientRect();
  const left = (rect.left - canvasRect.left - viewport.x) / viewport.scale;
  const top = (rect.top - canvasRect.top - viewport.y) / viewport.scale;
  const right = (rect.right - canvasRect.left - viewport.x) / viewport.scale;
  const bottom = (rect.bottom - canvasRect.top - viewport.y) / viewport.scale;

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
  additionalSnapNodes,
  nodeRefs,
  canvasRect,
  canvasSize,
  viewport,
}: {
  movingNodeIds: string[];
  nodes: CanvasNode[];
  additionalSnapNodes?: CanvasNode[];
  nodeRefs: Record<string, HTMLDivElement | null>;
  canvasRect: DOMRect;
  canvasSize: CanvasSize;
  viewport: ViewportTransform;
}): DragSnapCache | null => {
  const movingBoundsList = movingNodeIds
    .map((nodeId) => {
      const element = nodeRefs[nodeId];
      return element ? getSnapBoundsFromElement(element, canvasRect, viewport) : null;
    })
    .filter((bounds): bounds is SnapBounds => bounds !== null);

  if (movingBoundsList.length === 0) {
    return null;
  }

  const targetBounds = nodes
    .filter((currentNode) => !movingNodeIds.includes(currentNode.id))
    .map((currentNode) => {
      const element = nodeRefs[currentNode.id];
      return element ? getSnapBoundsFromElement(element, canvasRect, viewport) : null;
    })
    .filter((bounds): bounds is SnapBounds => bounds !== null);

  const logicalAdditionalBounds = (additionalSnapNodes ?? []).map((node) => {
    if (node.type === "box") {
      const width = node.size.width * node.scale;
      const height = node.size.height * node.scale;

      return {
        left: node.position.x,
        right: node.position.x + width,
        top: node.position.y,
        bottom: node.position.y + height,
        centerX: node.position.x + width / 2,
        centerY: node.position.y + height / 2,
      } satisfies SnapBounds;
    }

    return {
      left: node.position.x,
      right: node.position.x,
      top: node.position.y,
      bottom: node.position.y,
      centerX: node.position.x,
      centerY: node.position.y,
    } satisfies SnapBounds;
  });

  const viewportCenterX = (canvasSize.width / 2 - viewport.x) / viewport.scale;
  const viewportCenterY = (canvasSize.height / 2 - viewport.y) / viewport.scale;

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
      ...logicalAdditionalBounds.flatMap((bounds) => [
        bounds.left,
        bounds.centerX,
        bounds.right,
      ]),
      viewportCenterX,
    ],
    targetY: [
      ...targetBounds.flatMap((bounds) => [
        bounds.top,
        bounds.centerY,
        bounds.bottom,
      ]),
      ...logicalAdditionalBounds.flatMap((bounds) => [
        bounds.top,
        bounds.centerY,
        bounds.bottom,
      ]),
      viewportCenterY,
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
