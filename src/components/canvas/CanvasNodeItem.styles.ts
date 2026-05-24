import { type CSSProperties } from "react";
import { type CanvasNode, type RectNode, type TextNode } from "../../core/nodes";

export const getNodeTransition = (node: CanvasNode, isSelected: boolean) => {
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

export const getTextStyle = (node: TextNode): CSSProperties => ({
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

export const getRectContentStyle = (node: RectNode): CSSProperties => ({
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

export const getNodeStyle = (node: CanvasNode) => {
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
