import { type CanvasNode, type Position } from "../../core/nodes";
import { type CanvasViewportState } from "./types";

export type AlignAxis = "x" | "y";
export type AlignMode = "start" | "center" | "end";

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export const getNodeBounds = (node: CanvasNode): Bounds => {
  const width = node.type === "rect" ? node.size.width * node.scale : 0;
  const height = node.type === "rect" ? node.size.height * node.scale : 0;

  if (node.type === "text") {
    return {
      left: node.position.x,
      top: node.position.y,
      right: node.position.x,
      bottom: node.position.y,
      centerX: node.position.x,
      centerY: node.position.y,
    };
  }

  return {
    left: node.position.x,
    top: node.position.y,
    right: node.position.x + width,
    bottom: node.position.y + height,
    centerX: node.position.x + width / 2,
    centerY: node.position.y + height / 2,
  };
};

export const getNodesBounds = (nodes: CanvasNode[]) => {
  const bounds = nodes.map(getNodeBounds);

  return {
    left: Math.min(...bounds.map((bound) => bound.left)),
    top: Math.min(...bounds.map((bound) => bound.top)),
    right: Math.max(...bounds.map((bound) => bound.right)),
    bottom: Math.max(...bounds.map((bound) => bound.bottom)),
  };
};

export const moveNodeCenterTo = (
  node: CanvasNode,
  position: Position,
): CanvasNode => {
  if (node.type === "text") {
    return {
      ...node,
      position,
    };
  }

  return {
    ...node,
    position: {
      x: position.x - (node.size.width * node.scale) / 2,
      y: position.y - (node.size.height * node.scale) / 2,
    },
  };
};

export const alignNodesToBounds = (
  nodes: CanvasNode[],
  axis: AlignAxis,
  mode: AlignMode,
) => {
  const referenceBounds = getNodesBounds(nodes);

  return nodes.map((node) => {
    const bounds = getNodeBounds(node);

    if (axis === "x") {
      const nextCenterY =
        mode === "start"
          ? referenceBounds.top + (bounds.bottom - bounds.top) / 2
          : mode === "center"
            ? (referenceBounds.top + referenceBounds.bottom) / 2
            : referenceBounds.bottom - (bounds.bottom - bounds.top) / 2;

      return moveNodeCenterTo(node, {
        x: bounds.centerX,
        y: nextCenterY,
      });
    }

    const nextCenterX =
      mode === "start"
        ? referenceBounds.left + (bounds.right - bounds.left) / 2
        : mode === "center"
          ? (referenceBounds.left + referenceBounds.right) / 2
          : referenceBounds.right - (bounds.right - bounds.left) / 2;

    return moveNodeCenterTo(node, {
      x: nextCenterX,
      y: bounds.centerY,
    });
  });
};

export const alignNodesToCanvas = (
  nodes: CanvasNode[],
  canvasSize: { width: number; height: number },
  viewport: CanvasViewportState,
  axis: AlignAxis,
  mode: AlignMode,
) => {
  const canvasWorldBounds = {
    left: (0 - viewport.x) / viewport.scale,
    right: (canvasSize.width - viewport.x) / viewport.scale,
    top: (0 - viewport.y) / viewport.scale,
    bottom: (canvasSize.height - viewport.y) / viewport.scale,
    centerX: (canvasSize.width / 2 - viewport.x) / viewport.scale,
    centerY: (canvasSize.height / 2 - viewport.y) / viewport.scale,
  };

  return nodes.map((node) => {
    const bounds = getNodeBounds(node);

    if (axis === "x") {
      const nextCenterY =
        mode === "start"
          ? canvasWorldBounds.top + (bounds.bottom - bounds.top) / 2
          : mode === "center"
            ? 0
            : canvasWorldBounds.bottom - (bounds.bottom - bounds.top) / 2;

      return moveNodeCenterTo(node, {
        x: bounds.centerX,
        y: nextCenterY,
      });
    }

    const nextCenterX =
      mode === "start"
        ? canvasWorldBounds.left + (bounds.right - bounds.left) / 2
        : mode === "center"
          ? 0
          : canvasWorldBounds.right - (bounds.right - bounds.left) / 2;

    return moveNodeCenterTo(node, {
      x: nextCenterX,
      y: bounds.centerY,
    });
  });
};
