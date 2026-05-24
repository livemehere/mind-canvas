import {
  type CanvasNode,
  DEFAULT_RECT_NODE,
  DEFAULT_TEXT_NODE,
} from "../../core/nodes";

export const createRectNode = (x: number, y: number): CanvasNode => ({
  ...DEFAULT_RECT_NODE,
  id: window.crypto.randomUUID(),
  position: { x, y },
});

export const createTextNode = (x: number, y: number): CanvasNode => ({
  ...DEFAULT_TEXT_NODE,
  id: window.crypto.randomUUID(),
  position: { x, y },
});

export const regenerateNodeIds = (nodes: CanvasNode[]) =>
  nodes.map((node) => ({
    ...node,
    id: window.crypto.randomUUID(),
  }));
