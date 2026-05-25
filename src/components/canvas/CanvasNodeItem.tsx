import { motion } from "motion/react";
import { useRef, useState } from "react";
import {
  type BoxNode,
  type CanvasNode,
  type TextNode,
} from "../../core/nodes";
import {
  CanvasNodeTransformHandles,
  type RotateHandleModifiers,
  type ResizeHandleModifiers,
  type ResizeHandleDirection,
} from "./CanvasNodeTransformHandles";
import {
  getNodeStyle,
  getNodeTransition,
  getTextStyle,
  getEntranceInitialFromTarget,
  getEntranceTransition,
} from "../../features/styles/helpers";
import { BoxContentRenderer } from "../box/BoxContentRenderer";
import {
  createTextSnapshot,
  createRectSnapshot,
  isTransformHandleTarget,
  type RectTransformSnapshot,
  resizeRectNode,
  resizeTextNodeFont,
  ROTATE_SENSITIVITY,
  type RotateSnapshot,
  roundNumber,
  type TextTransformSnapshot,
} from "../../features/transform/helpers";

interface Props {
  node: CanvasNode;
  isSelected: boolean;
  canDrag: boolean;
  shouldPlayEntranceAnimation?: boolean;
  autoCenterText?: boolean;
  textLayoutResetToken?: number;
  previewOffset?: { x: number; y: number };
  isPreviewing?: boolean;
  setNodeRef: (nodeId: string, element: HTMLDivElement | null) => void;
  onRectNodeChange: (
    nodeId: string,
    updater: (node: BoxNode) => BoxNode,
    options?: { commitHistory?: boolean },
  ) => void;
  onTextNodeChange: (
    nodeId: string,
    updater: (node: TextNode) => TextNode,
    options?: { commitHistory?: boolean },
  ) => void;
  onPointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
    node: CanvasNode,
  ) => void;
  onDoubleClick?: (node: CanvasNode) => void;
  onDragStart: (node: CanvasNode, modifiers: { altKey: boolean }) => void;
  onDrag: (
    node: CanvasNode,
    offset: { x: number; y: number },
    modifiers: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
  ) => void;
  onDragEnd: (
    node: CanvasNode,
    offset: { x: number; y: number },
    modifiers: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
  ) => void;
}

export function CanvasNodeItem({
  node,
  isSelected,
  canDrag,
  shouldPlayEntranceAnimation = false,
  previewOffset,
  isPreviewing = false,
  setNodeRef,
  onRectNodeChange,
  onTextNodeChange,
  onPointerDown,
  onDoubleClick,
  onDragStart,
  onDrag,
  onDragEnd,
}: Props) {
  const itemRef = useRef<HTMLDivElement | null>(null);
  const resizeSnapshotRef = useRef<RectTransformSnapshot | null>(null);
  const rotateSnapshotRef = useRef<RotateSnapshot | null>(null);
  const textSnapshotRef = useRef<TextTransformSnapshot | null>(null);
  const canPanDragRef = useRef(false);
  const [isEntranceAnimating, setIsEntranceAnimating] = useState(
    shouldPlayEntranceAnimation,
  );

  const handleResizeStart = () => {
    if (node.type !== "box") {
      if (node.type === "text") {
        textSnapshotRef.current = createTextSnapshot(node);
      }
      return;
    }

    resizeSnapshotRef.current = createRectSnapshot(node);
  };

  const handleResize = (
    direction: ResizeHandleDirection,
    offset: { x: number; y: number },
    modifiers: ResizeHandleModifiers,
  ) => {
    if (node.type === "text") {
      const snapshot = textSnapshotRef.current ?? createTextSnapshot(node);

      onTextNodeChange(
        node.id,
        (currentNode) =>
          resizeTextNodeFont(currentNode, snapshot, direction, offset),
        { commitHistory: false },
      );
      return;
    }

    if (node.type !== "box") {
      return;
    }

    const snapshot = resizeSnapshotRef.current ?? createRectSnapshot(node);

    onRectNodeChange(
      node.id,
      (currentNode) =>
        resizeRectNode(currentNode, snapshot, direction, offset, modifiers),
      { commitHistory: false },
    );
  };

  const handleResizeEnd = (
    direction: ResizeHandleDirection,
    offset: { x: number; y: number },
    modifiers: ResizeHandleModifiers,
  ) => {
    if (node.type === "text") {
      const snapshot = textSnapshotRef.current ?? createTextSnapshot(node);

      onTextNodeChange(node.id, (currentNode) =>
        resizeTextNodeFont(currentNode, snapshot, direction, offset),
      );
      resizeSnapshotRef.current = null;
      textSnapshotRef.current = null;
      return;
    }

    if (node.type === "box") {
      const snapshot = resizeSnapshotRef.current ?? createRectSnapshot(node);

      onRectNodeChange(node.id, (currentNode) =>
        resizeRectNode(currentNode, snapshot, direction, offset, modifiers),
      );
    }

    resizeSnapshotRef.current = null;
    textSnapshotRef.current = null;
  };

  const handleRotateStart = () => {
    if (node.type !== "box" && node.type !== "text") {
      return;
    }

    rotateSnapshotRef.current = {
      rotate: node.rotate,
    };
  };

  const handleRotate = (
    offset: { x: number; y: number },
    modifiers: RotateHandleModifiers,
  ) => {
    if (node.type !== "box" && node.type !== "text") {
      return;
    }

    const snapshot = rotateSnapshotRef.current ?? {
      rotate: node.rotate,
    };

    const rawRotate = roundNumber(
      snapshot.rotate + offset.x * ROTATE_SENSITIVITY,
    );
    const shouldFreeTransform = modifiers.ctrlKey || modifiers.metaKey;
    const nextRotate = shouldFreeTransform
      ? rawRotate
      : roundNumber(Math.round(rawRotate / 15) * 15);

    if (node.type === "box") {
      onRectNodeChange(
        node.id,
        (currentNode) => ({
          ...currentNode,
          rotate: nextRotate,
        }),
        { commitHistory: false },
      );
      return;
    }

    onTextNodeChange(
      node.id,
      (currentNode) => ({
        ...currentNode,
        rotate: nextRotate,
      }),
      { commitHistory: false },
    );
  };

  const handleRotateEnd = (
    offset: { x: number; y: number },
    modifiers: RotateHandleModifiers,
  ) => {
    if (node.type !== "box" && node.type !== "text") {
      return;
    }

    const snapshot = rotateSnapshotRef.current ?? {
      rotate: node.rotate,
    };
    const rawRotate = roundNumber(
      snapshot.rotate + offset.x * ROTATE_SENSITIVITY,
    );
    const shouldFreeTransform = modifiers.ctrlKey || modifiers.metaKey;
    const nextRotate = shouldFreeTransform
      ? rawRotate
      : roundNumber(Math.round(rawRotate / 15) * 15);

    if (node.type === "box") {
      onRectNodeChange(node.id, (currentNode) => ({
        ...currentNode,
        rotate: nextRotate,
      }));
    } else {
      onTextNodeChange(node.id, (currentNode) => ({
        ...currentNode,
        rotate: nextRotate,
      }));
    }

    rotateSnapshotRef.current = null;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerDown(event, node);

    canPanDragRef.current =
      canDrag &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !isTransformHandleTarget(event.target);
  };

  const handleTransformPointerDown = () => {
    canPanDragRef.current = false;
  };

  const animateTarget = {
    x: node.position.x + (previewOffset?.x ?? 0),
    y: node.position.y + (previewOffset?.y ?? 0),
    scale: node.scale,
    opacity: node.opacity,
    rotate: node.rotate,
    ...getNodeStyle(node),
  };

  const shouldApplyEntranceAnimation =
    isEntranceAnimating &&
    node.entranceAnimation !== "none";

  const entranceInitial = shouldApplyEntranceAnimation
    ? getEntranceInitialFromTarget(node.entranceAnimation, animateTarget)
    : false;

  const entranceTransition = shouldApplyEntranceAnimation
    ? getEntranceTransition(node.entranceAnimation)
    : undefined;

  return (
    <motion.div
      data-node-id={node.id}
      ref={(element) => {
        itemRef.current = element;
        setNodeRef(node.id, element);
      }}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        translate: node.type === "text" ? "-50% -50%" : undefined,
        zIndex: node.zIndex,
        userSelect: "none",
        overflow: "visible",
        ...(isSelected ? { outline: "4px solid #9810FA" } : {}),
      }}
      initial={entranceInitial}
      animate={animateTarget}
      transition={
        entranceTransition ?? getNodeTransition(node, isSelected, isPreviewing)
      }
      onAnimationComplete={() => {
        if (!isEntranceAnimating) {
          return;
        }

        setIsEntranceAnimating(false);
      }}
      onPointerDown={handlePointerDown}
      onDoubleClick={() => onDoubleClick?.(node)}
      onPanStart={(event) => {
        if (isTransformHandleTarget(event.target)) {
          canPanDragRef.current = false;
          return;
        }

        if (!canPanDragRef.current) {
          return;
        }

        onDragStart(node, { altKey: event.altKey });
      }}
      onPan={(event, info) => {
        if (isTransformHandleTarget(event.target)) {
          return;
        }

        if (!canPanDragRef.current) {
          return;
        }

        onDrag(node, info.offset, {
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
        });
      }}
      onPanEnd={(event, info) => {
        if (isTransformHandleTarget(event.target)) {
          canPanDragRef.current = false;
          return;
        }

        if (!canPanDragRef.current) {
          return;
        }

        onDragEnd(node, info.offset, {
          shiftKey: event.shiftKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
        });
        canPanDragRef.current = false;
      }}
    >
      {(node.type === "box" || node.type === "text") &&
      isSelected &&
      canDrag ? (
        <CanvasNodeTransformHandles
          onHandlePointerDown={handleTransformPointerDown}
          onResizeStart={handleResizeStart}
          onResize={handleResize}
          onResizeEnd={handleResizeEnd}
          onRotateStart={handleRotateStart}
          onRotate={handleRotate}
          onRotateEnd={handleRotateEnd}
          resizeDirections={node.type === "text" ? ["w", "e"] : undefined}
        />
      ) : null}
      {node.type === "box" ? <BoxContentRenderer node={node} /> : null}
      {node.type === "text" ? (
        <div style={getTextStyle(node)}>{node.text}</div>
      ) : null}
    </motion.div>
  );
}
