import { type CSSProperties } from "react";
import {
  type EntranceAnimation,
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

export const getEntranceInitial = (animation: EntranceAnimation) => {
  switch (animation) {
    case "fade":
      return { opacity: 0 };
    case "pop":
      return { opacity: 0, scale: 0.85 };
    case "slide-up":
      return { opacity: 0, y: 24 };
    case "slide-down":
      return { opacity: 0, y: -24 };
    case "slide-left":
      return { opacity: 0, x: 24 };
    case "slide-right":
      return { opacity: 0, x: -24 };
    case "none":
    default:
      return undefined;
  }
};

export const getEntranceInitialFromTarget = <T extends Record<string, unknown>>(
  animation: EntranceAnimation,
  target: T,
) => {
  const initial = getEntranceInitial(animation);
  if (!initial) {
    return false;
  }

  return {
    ...target,
    ...initial,
    x:
      typeof target.x === "number" && typeof initial.x === "number"
        ? target.x + initial.x
        : target.x,
    y:
      typeof target.y === "number" && typeof initial.y === "number"
        ? target.y + initial.y
        : target.y,
    scale:
      typeof target.scale === "number" && typeof initial.scale === "number"
        ? target.scale * initial.scale
        : target.scale,
  };
};

export const getEntranceTransition = (animation: EntranceAnimation) => {
  if (animation === "none") {
    return undefined;
  }

  if (animation === "pop") {
    return {
      opacity: { duration: 0.18, ease: "easeOut" as const },
      scale: { type: "spring" as const, stiffness: 380, damping: 24 },
    };
  }

  return {
    duration: 0.22,
    ease: "easeOut" as const,
  };
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
