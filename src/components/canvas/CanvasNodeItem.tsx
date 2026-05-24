import { motion, useDragControls } from "motion/react";
import { useRef } from "react";
import { type CanvasNode, type RectNode, type TextNode } from "../../core/nodes";
import {
  CanvasNodeTransformHandles,
  type ResizeHandleModifiers,
  type ResizeHandleDirection,
} from "./CanvasNodeTransformHandles";
import {
  getNodeStyle,
  getNodeTransition,
  getRectContentStyle,
  getTextStyle,
} from "./CanvasNodeItem.styles";
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
} from "./CanvasNodeItem.transforms";

interface Props {
  node: CanvasNode;
  isSelected: boolean;
  canDrag: boolean;
  autoCenterText?: boolean;
  textLayoutResetToken?: number;
  previewOffset?: { x: number; y: number };
  setNodeRef: (nodeId: string, element: HTMLDivElement | null) => void;
  onRectNodeChange: (
    nodeId: string,
    updater: (node: RectNode) => RectNode,
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
  onDragStart: (node: CanvasNode) => void;
  onDrag: (node: CanvasNode, offset: { x: number; y: number }) => void;
  onDragEnd: (node: CanvasNode, offset: { x: number; y: number }) => void;
}

export function CanvasNodeItem({
  node,
  isSelected,
  canDrag,
  previewOffset,
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
  const dragControls = useDragControls();

  const handleResizeStart = () => {
    if (node.type !== "rect") {
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

      onTextNodeChange(node.id, (currentNode) =>
        resizeTextNodeFont(currentNode, snapshot, direction, offset),
        { commitHistory: false },
      );
      return;
    }

    if (node.type !== "rect") {
      return;
    }

    const snapshot = resizeSnapshotRef.current ?? createRectSnapshot(node);

    onRectNodeChange(node.id, (currentNode) =>
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

    if (node.type === "rect") {
      const snapshot = resizeSnapshotRef.current ?? createRectSnapshot(node);

      onRectNodeChange(node.id, (currentNode) =>
        resizeRectNode(currentNode, snapshot, direction, offset, modifiers),
      );
    }

    resizeSnapshotRef.current = null;
    textSnapshotRef.current = null;
  };

  const handleRotateStart = () => {
    if (node.type !== "rect" && node.type !== "text") {
      return;
    }

    rotateSnapshotRef.current = {
      rotate: node.rotate,
    };
  };

  const handleRotate = (offset: { x: number; y: number }) => {
    if (node.type !== "rect" && node.type !== "text") {
      return;
    }

    const snapshot = rotateSnapshotRef.current ?? {
      rotate: node.rotate,
    };

    const nextRotate = roundNumber(
      snapshot.rotate + offset.x * ROTATE_SENSITIVITY,
    );

    if (node.type === "rect") {
      onRectNodeChange(node.id, (currentNode) => ({
        ...currentNode,
        rotate: nextRotate,
      }), { commitHistory: false });
      return;
    }

    onTextNodeChange(node.id, (currentNode) => ({
      ...currentNode,
      rotate: nextRotate,
    }), { commitHistory: false });
  };

  const handleRotateEnd = (offset: { x: number; y: number }) => {
    if (node.type !== "rect" && node.type !== "text") {
      return;
    }

    const snapshot = rotateSnapshotRef.current ?? {
      rotate: node.rotate,
    };
    const nextRotate = roundNumber(
      snapshot.rotate + offset.x * ROTATE_SENSITIVITY,
    );

    if (node.type === "rect") {
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

    if (!canDrag || event.button !== 0) {
      return;
    }

    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      return;
    }

    if (isTransformHandleTarget(event.target)) {
      return;
    }

    dragControls.start(event);
  };

  return (
    <motion.div
      ref={(element) => {
        itemRef.current = element;
        setNodeRef(node.id, element);
      }}
      drag={canDrag}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
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
      initial={false}
      animate={{
        x: node.position.x + (previewOffset?.x ?? 0),
        y: node.position.y + (previewOffset?.y ?? 0),
        scale: node.scale,
        opacity: node.opacity,
        rotate: node.rotate,
        ...getNodeStyle(node),
      }}
      transition={getNodeTransition(node, isSelected)}
      onPointerDown={handlePointerDown}
      onDoubleClick={() => onDoubleClick?.(node)}
      onDragStart={() => onDragStart(node)}
      onDrag={(_, info) => onDrag(node, info.offset)}
      onDragEnd={(_, info) => onDragEnd(node, info.offset)}
    >
      {(node.type === "rect" || node.type === "text") && isSelected && canDrag ? (
        <CanvasNodeTransformHandles
          onResizeStart={handleResizeStart}
          onResize={handleResize}
          onResizeEnd={handleResizeEnd}
          onRotateStart={handleRotateStart}
          onRotate={handleRotate}
          onRotateEnd={handleRotateEnd}
          resizeDirections={node.type === "text" ? ["w", "e"] : undefined}
        />
      ) : null}
      {node.type === "rect" && node.content ? (
        <div style={getRectContentStyle(node)}>{node.content}</div>
      ) : null}
      {node.type === "text" ? (
        <div style={getTextStyle(node)}>{node.text}</div>
      ) : null}
    </motion.div>
  );
}
