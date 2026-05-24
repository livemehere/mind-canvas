import { type Position } from "../../core/nodes";

export interface SelectionRect {
  start: Position;
  current: Position;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const DRAG_THRESHOLD = 4;

export const getNormalizedBox = (start: Position, end: Position): Box => ({
  left: Math.min(start.x, end.x),
  top: Math.min(start.y, end.y),
  right: Math.max(start.x, end.x),
  bottom: Math.max(start.y, end.y),
});

export const isBoxInside = (inner: Box, outer: Box) =>
  inner.left >= outer.left &&
  inner.right <= outer.right &&
  inner.top >= outer.top &&
  inner.bottom <= outer.bottom;
