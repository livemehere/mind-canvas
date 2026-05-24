import { motion } from "motion/react";
import { type CSSProperties } from "react";
import { type CanvasNode, type RectNode, type TextNode } from "../../core/nodes";

interface Props {
  node: CanvasNode;
  isSelected: boolean;
  canDrag: boolean;
  previewOffset?: { x: number; y: number };
  setNodeRef: (nodeId: string, element: HTMLDivElement | null) => void;
  onPointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
    node: CanvasNode,
  ) => void;
  onDragStart: (node: CanvasNode) => void;
  onDrag: (node: CanvasNode, offset: { x: number; y: number }) => void;
  onDragEnd: (node: CanvasNode, offset: { x: number; y: number }) => void;
}

const getNodeTransition = (node: CanvasNode, isSelected: boolean) => {
  if (isSelected) {
    return { duration: 0 };
  }

  if (node.transition === "spring") {
    return {
      type: "spring" as const,
      stiffness: 150,
      damping: 30,
    };
  }

  return { duration: 0 };
};

const getTextStyle = (node: TextNode): CSSProperties => ({
  color: node.color,
  fontSize: node.typography.fontSize,
  fontFamily: node.typography.fontFamily,
  fontWeight: node.typography.fontWeight,
  lineHeight: node.typography.lineHeight,
  letterSpacing: node.typography.letterSpacing,
  textAlign: node.typography.textAlign,
  WebkitTextStrokeWidth: `${node.typography.strokeWidth}px`,
  WebkitTextStrokeColor: node.typography.strokeColor,
  whiteSpace: "pre-wrap",
});

const getRectContentStyle = (node: RectNode): CSSProperties => ({
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: node.contentTypography.color,
  fontSize: node.contentTypography.fontSize,
  fontFamily: node.contentTypography.fontFamily,
  fontWeight: node.contentTypography.fontWeight,
  lineHeight: node.contentTypography.lineHeight,
  letterSpacing: node.contentTypography.letterSpacing,
  textAlign: "center",
  whiteSpace: "pre-wrap",
  overflow: "hidden",
  padding: 8,
  boxSizing: "border-box",
});

const getNodeStyle = (node: CanvasNode) => {
  switch (node.type) {
    case "rect":
      return {
        width: node.size.width,
        height: node.size.height,
        backgroundColor: node.bgColor,
        borderRadius: node.radius,
        border: `${node.borderWidth}px solid ${node.borderColor}`,
      };
    case "text":
      return {
        backgroundColor: node.bgColor,
        borderRadius: node.radius,
        border: `${node.borderWidth}px solid ${node.borderColor}`,
      };
    default:
      return {};
  }
};

export function CanvasNodeItem({
  node,
  isSelected,
  canDrag,
  previewOffset,
  setNodeRef,
  onPointerDown,
  onDragStart,
  onDrag,
  onDragEnd,
}: Props) {
  return (
    <motion.div
      ref={(element) => {
        setNodeRef(node.id, element);
      }}
      drag={canDrag}
      dragMomentum={false}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        zIndex: node.zIndex,
        userSelect: "none",
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
      onPointerDown={(event) => onPointerDown(event, node)}
      onDragStart={() => onDragStart(node)}
      onDrag={(_, info) => onDrag(node, info.offset)}
      onDragEnd={(_, info) => onDragEnd(node, info.offset)}
    >
      {node.type === "rect" && node.content ? (
        <div style={getRectContentStyle(node)}>{node.content}</div>
      ) : null}
      {node.type === "text" ? (
        <div style={getTextStyle(node)}>{node.text}</div>
      ) : null}
    </motion.div>
  );
}
