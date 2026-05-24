export interface Position {
  x: number;
  y: number;
}

export const NODE_TRANSITIONS = ["spring", "none"] as const;

export const TEXT_ALIGN_OPTIONS = ["left", "center", "right"] as const;

export type NodeTransition = (typeof NODE_TRANSITIONS)[number];
export type TextAlign = (typeof TEXT_ALIGN_OPTIONS)[number];

export interface Typography {
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: TextAlign;
  strokeWidth: number;
  strokeColor: string;
}

export interface BaseNode {
  id: string;
  type: "rect" | "text";
  position: Position;
  opacity: number;
  scale: number;
  rotate: number;
  zIndex: number;
  transition: NodeTransition;
}

export interface RectNode extends BaseNode {
  type: "rect";
  size: {
    width: number;
    height: number;
  };
  bgColor: string;
  radius: number;
}

export interface TextNode extends BaseNode {
  type: "text";
  text: string;
  color: string;
  bgColor: string;
  radius: number;
  borderWidth: number;
  borderColor: string;
  typography: Typography;
}

export type CanvasNode = RectNode | TextNode;

export const DEFAULT_RECT_NODE: RectNode = {
  id: "default-rect",
  type: "rect",
  position: { x: 0, y: 0 },
  size: { width: 100, height: 100 },
  bgColor: "#ffffff",
  radius: 0,
  opacity: 1,
  rotate: 0,
  scale: 1,
  zIndex: 0,
  transition: "none",
};

export const DEFAULT_TEXT_NODE: TextNode = {
  id: "default-text",
  type: "text",
  position: { x: 0, y: 0 },
  opacity: 1,
  rotate: 0,
  scale: 1,
  zIndex: 0,
  transition: "spring",
  text: "Text",
  color: "#ffffff",
  bgColor: "transparent",
  radius: 0,
  borderWidth: 0,
  borderColor: "#ffffff",
  typography: {
    fontSize: 32,
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: 0,
    textAlign: "left",
    strokeWidth: 0,
    strokeColor: "#000000",
  },
};

export interface Snapshot {
  nodes: CanvasNode[];
}
