import { type Position, type RectNode, type TextNode } from "../../core/nodes";
import {
  type ResizeHandleDirection,
  type ResizeHandleModifiers,
} from "./CanvasNodeTransformHandles";

export interface RectTransformSnapshot {
  position: Position;
  size: RectNode["size"];
  rotate: number;
  scale: number;
  center: Position;
}

export interface RotateSnapshot {
  rotate: number;
}

export interface TextTransformSnapshot {
  fontSize: number;
}

export const ROTATE_SENSITIVITY = 0.6;

const MIN_RECT_SIZE = 24;

export const roundNumber = (value: number) => Math.round(value * 100) / 100;

const toRadians = (value: number) => (value * Math.PI) / 180;

const toLocalOffset = (
  offset: { x: number; y: number },
  rotate: number,
  scale: number,
) => {
  const radians = toRadians(rotate);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const normalizedScale = scale || 1;

  return {
    x: (cos * offset.x + sin * offset.y) / normalizedScale,
    y: (-sin * offset.x + cos * offset.y) / normalizedScale,
  };
};

const rotatePoint = (x: number, y: number, rotate: number) => {
  const radians = toRadians(rotate);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: cos * x - sin * y,
    y: sin * x + cos * y,
  };
};

const clampRectSize = (value: number) => Math.max(MIN_RECT_SIZE, value);

const getNodeCenter = (size: RectNode["size"]) => ({
  x: size.width / 2,
  y: size.height / 2,
});

const getResizeAnchorPoint = (
  direction: ResizeHandleDirection,
  size: RectNode["size"],
) => {
  switch (direction) {
    case "n":
      return { x: size.width / 2, y: size.height };
    case "s":
      return { x: size.width / 2, y: 0 };
    case "e":
      return { x: 0, y: size.height / 2 };
    case "w":
      return { x: size.width, y: size.height / 2 };
    case "ne":
      return { x: 0, y: size.height };
    case "nw":
      return { x: size.width, y: size.height };
    case "se":
      return { x: 0, y: 0 };
    case "sw":
      return { x: size.width, y: 0 };
  }
};

const getWorldPointFromLocal = (
  position: Position,
  size: RectNode["size"],
  localPoint: Position,
  rotate: number,
  scale: number,
) => {
  const center = getNodeCenter(size);
  const scaledVector = {
    x: (localPoint.x - center.x) * scale,
    y: (localPoint.y - center.y) * scale,
  };
  const rotatedVector = rotatePoint(scaledVector.x, scaledVector.y, rotate);

  return {
    x: position.x + center.x + rotatedVector.x,
    y: position.y + center.y + rotatedVector.y,
  };
};

const getPositionFromFixedAnchor = (
  anchorWorldPoint: Position,
  size: RectNode["size"],
  localPoint: Position,
  rotate: number,
  scale: number,
) => {
  const center = getNodeCenter(size);
  const scaledVector = {
    x: (localPoint.x - center.x) * scale,
    y: (localPoint.y - center.y) * scale,
  };
  const rotatedVector = rotatePoint(scaledVector.x, scaledVector.y, rotate);

  return {
    x: anchorWorldPoint.x - center.x - rotatedVector.x,
    y: anchorWorldPoint.y - center.y - rotatedVector.y,
  };
};

export const createRectSnapshot = (node: RectNode): RectTransformSnapshot => ({
  position: { ...node.position },
  size: { ...node.size },
  rotate: node.rotate,
  scale: node.scale,
  center: {
    x: node.position.x + node.size.width / 2,
    y: node.position.y + node.size.height / 2,
  },
});

export const resizeRectNode = (
  node: RectNode,
  snapshot: RectTransformSnapshot,
  direction: ResizeHandleDirection,
  offset: { x: number; y: number },
  modifiers: ResizeHandleModifiers,
) => {
  const localOffset = toLocalOffset(offset, snapshot.rotate, snapshot.scale);
  let nextWidth = snapshot.size.width;
  let nextHeight = snapshot.size.height;

  if (modifiers.altKey) {
    if (direction.includes("w")) {
      nextWidth = clampRectSize(snapshot.size.width - localOffset.x * 2);
    }

    if (direction.includes("e")) {
      nextWidth = clampRectSize(snapshot.size.width + localOffset.x * 2);
    }

    if (direction.includes("n")) {
      nextHeight = clampRectSize(snapshot.size.height - localOffset.y * 2);
    }

    if (direction.includes("s")) {
      nextHeight = clampRectSize(snapshot.size.height + localOffset.y * 2);
    }

    const nextSize = {
      width: roundNumber(nextWidth),
      height: roundNumber(nextHeight),
    };

    return {
      ...node,
      position: {
        x: roundNumber(snapshot.center.x - nextSize.width / 2),
        y: roundNumber(snapshot.center.y - nextSize.height / 2),
      },
      size: nextSize,
    };
  }

  if (direction.includes("w")) {
    nextWidth = clampRectSize(snapshot.size.width - localOffset.x);
  }

  if (direction.includes("e")) {
    nextWidth = clampRectSize(snapshot.size.width + localOffset.x);
  }

  if (direction.includes("n")) {
    nextHeight = clampRectSize(snapshot.size.height - localOffset.y);
  }

  if (direction.includes("s")) {
    nextHeight = clampRectSize(snapshot.size.height + localOffset.y);
  }

  const nextSize = {
    width: roundNumber(nextWidth),
    height: roundNumber(nextHeight),
  };
  const previousAnchorPoint = getResizeAnchorPoint(direction, snapshot.size);
  const nextAnchorPoint = getResizeAnchorPoint(direction, nextSize);
  const anchorWorldPoint = getWorldPointFromLocal(
    snapshot.position,
    snapshot.size,
    previousAnchorPoint,
    snapshot.rotate,
    snapshot.scale,
  );
  const nextPosition = getPositionFromFixedAnchor(
    anchorWorldPoint,
    nextSize,
    nextAnchorPoint,
    snapshot.rotate,
    snapshot.scale,
  );

  return {
    ...node,
    position: {
      x: roundNumber(nextPosition.x),
      y: roundNumber(nextPosition.y),
    },
    size: nextSize,
  };
};

export const isTransformHandleTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.closest("[data-transform-handle='true']") !== null;
};

export const createTextSnapshot = (node: TextNode): TextTransformSnapshot => ({
  fontSize: node.typography.fontSize,
});

export const resizeTextNodeFont = (
  node: TextNode,
  snapshot: TextTransformSnapshot,
  direction: ResizeHandleDirection,
  offset: { x: number; y: number },
) => {
  const directionFactor = direction === "w" ? -1 : 1;
  const nextFontSize = Math.max(
    8,
    roundNumber(snapshot.fontSize + directionFactor * offset.x * 0.25),
  );

  return {
    ...node,
    typography: {
      ...node.typography,
      fontSize: nextFontSize,
    },
  };
};
