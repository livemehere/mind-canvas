import { type CSSProperties } from "react";
import {
  type CanvasNode,
  type RectNode,
  type TextNode,
  type Typography,
} from "../../core/nodes";

export const getNodeTransition = (
  node: CanvasNode,
  isSelected: boolean,
  isPreviewing = false,
) => {
  if (isSelected || isPreviewing) {
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

const getTextDecorationLine = (typography: Typography) => {
  if (typography.underline && typography.strikethrough) {
    return "underline line-through";
  }

  if (typography.underline) {
    return "underline";
  }

  if (typography.strikethrough) {
    return "line-through";
  }

  return "none";
};

const getTypographyStyle = (
  typography: Typography,
  color?: string,
): CSSProperties => ({
  ...(color ? { color } : {}),
  fontSize: typography.fontSize,
  fontFamily: typography.fontFamily,
  fontWeight: typography.fontWeight,
  fontStyle: typography.fontStyle,
  lineHeight: typography.lineHeight,
  letterSpacing: typography.letterSpacing,
  textAlign: typography.textAlign,
  textDecorationLine: getTextDecorationLine(typography),
  WebkitTextStrokeWidth: `${typography.strokeWidth}px`,
  WebkitTextStrokeColor: typography.strokeColor,
  whiteSpace: "pre-wrap",
});

export const getTextStyle = (node: TextNode): CSSProperties => ({
  ...getTypographyStyle(node.typography, node.color),
  padding: `${node.paddingY}px ${node.paddingX}px`,
  boxSizing: "border-box",
});

export const getRectContentStyle = (node: RectNode): CSSProperties => ({
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  ...getTypographyStyle(node.contentTypography, node.contentTypography.color),
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
        backgroundImage: node.backgroundImage
          ? `url(${JSON.stringify(node.backgroundImage)})`
          : undefined,
        backgroundPosition: node.backgroundImage ? "center" : undefined,
        backgroundRepeat: node.backgroundImage ? "no-repeat" : undefined,
        backgroundSize: node.backgroundImage ? node.backgroundSize : undefined,
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
