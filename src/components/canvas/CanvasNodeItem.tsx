import { motion, useDragControls } from "motion/react";
import { useRef } from "react";
import { type CanvasNode, type RectNode } from "../../core/nodes";
import {
  CanvasNodeTransformHandles,
  type ResizeHandleDirection,
} from "./CanvasNodeTransformHandles";
import {
  getNodeStyle,
  getNodeTransition,
  getRectContentStyle,
  getTextStyle,
} from "./CanvasNodeItem.styles";
import {
  createRectSnapshot,
  isTransformHandleTarget,
  type RectTransformSnapshot,
  resizeRectNode,
  ROTATE_SENSITIVITY,
  type RotateSnapshot,
  roundNumber,
} from "./CanvasNodeItem.transforms";

interface Props {
  node: CanvasNode;
  isSelected: boolean;
  canDrag: boolean;
  previewOffset?: { x: number; y: number };
  setNodeRef: (nodeId: string, element: HTMLDivElement | null) => void;
  onRectNodeChange: (
    nodeId: string,
    updater: (node: RectNode) => RectNode,
  ) => void;
  onPointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
    node: CanvasNode,
  ) => void;
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
  onPointerDown,
  onDragStart,
  onDrag,
  onDragEnd,
}: Props) {
  const itemRef = useRef<HTMLDivElement | null>(null);
  const resizeSnapshotRef = useRef<RectTransformSnapshot | null>(null);
  const rotateSnapshotRef = useRef<RotateSnapshot | null>(null);
  const dragControls = useDragControls();

  const handleResizeStart = () => {
    if (node.type !== "rect") {
      return;
    }

    resizeSnapshotRef.current = createRectSnapshot(node);
  };

  const handleResize = (
    direction: ResizeHandleDirection,
    offset: { x: number; y: number },
  ) => {
    if (node.type !== "rect") {
      return;
    }

    const snapshot = resizeSnapshotRef.current ?? createRectSnapshot(node);

    onRectNodeChange(node.id, (currentNode) =>
      resizeRectNode(currentNode, snapshot, direction, offset),
    );
  };

  const handleResizeEnd = (
    direction: ResizeHandleDirection,
    offset: { x: number; y: number },
  ) => {
    handleResize(direction, offset);
    resizeSnapshotRef.current = null;
  };

  const handleRotateStart = () => {
    if (node.type !== "rect") {
      return;
    }

    rotateSnapshotRef.current = {
      rotate: node.rotate,
    };
  };

  const handleRotate = (offset: { x: number; y: number }) => {
    if (node.type !== "rect") {
      return;
    }

    const snapshot = rotateSnapshotRef.current ?? {
      rotate: node.rotate,
    };

    const nextRotate = roundNumber(
      snapshot.rotate + offset.x * ROTATE_SENSITIVITY,
    );

    onRectNodeChange(node.id, (currentNode) => ({
      ...currentNode,
      rotate: nextRotate,
    }));
  };

  const handleRotateEnd = (offset: { x: number; y: number }) => {
    handleRotate(offset);
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
      onDragStart={() => onDragStart(node)}
      onDrag={(_, info) => onDrag(node, info.offset)}
      onDragEnd={(_, info) => onDragEnd(node, info.offset)}
    >
      {node.type === "rect" && isSelected && canDrag ? (
        <CanvasNodeTransformHandles
          onResizeStart={handleResizeStart}
          onResize={handleResize}
          onResizeEnd={handleResizeEnd}
          onRotateStart={handleRotateStart}
          onRotate={handleRotate}
          onRotateEnd={handleRotateEnd}
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
