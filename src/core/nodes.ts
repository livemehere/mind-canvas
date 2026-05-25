export interface Position {
  x: number;
  y: number;
}

export const NODE_TRANSITIONS = ["spring", "none"] as const;
export const ENTRANCE_ANIMATIONS = [
  "none",
  "fade",
  "pop",
  "slide-up",
  "slide-down",
  "slide-left",
  "slide-right",
] as const;

export const TEXT_ALIGN_OPTIONS = ["left", "center", "right"] as const;
export const FONT_STYLE_OPTIONS = ["normal", "italic"] as const;
export const RECT_BACKGROUND_SIZE_OPTIONS = ["cover", "contain"] as const;
export const EDGE_ENTRANCE_ANIMATIONS = ["none", "fade", "draw"] as const;

export type NodeTransition = (typeof NODE_TRANSITIONS)[number];
export type EntranceAnimation = (typeof ENTRANCE_ANIMATIONS)[number];
export type TextAlign = (typeof TEXT_ALIGN_OPTIONS)[number];
export type FontStyle = (typeof FONT_STYLE_OPTIONS)[number];
export type RectBackgroundSize = (typeof RECT_BACKGROUND_SIZE_OPTIONS)[number];
export type EdgeEntranceAnimation =
  (typeof EDGE_ENTRANCE_ANIMATIONS)[number];

export interface TextShadowStyle {
  enabled: boolean;
  x: number;
  y: number;
  blur: number;
  color: string;
  opacity: number;
}

export interface BoxShadowStyle extends TextShadowStyle {
  spread: number;
}

export interface Typography {
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  fontStyle: FontStyle;
  lineHeight: number;
  letterSpacing: number;
  textAlign: TextAlign;
  underline: boolean;
  strikethrough: boolean;
  strokeWidth: number;
  strokeColor: string;
}

export interface RectContentTypography extends Typography {
  color: string;
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
  entranceAnimation: EntranceAnimation;
  replayEntranceOnStepChange: boolean;
  bgColor: string;
  radius: number;
  borderWidth: number;
  borderColor: string;
}

export interface RectNode extends BaseNode {
  type: "rect";
  size: {
    width: number;
    height: number;
  };
  backgroundImage?: string;
  backgroundSize: RectBackgroundSize;
  boxShadow: BoxShadowStyle;
  content: string;
  contentTypography: RectContentTypography;
}

export interface TextNode extends BaseNode {
  type: "text";
  text: string;
  color: string;
  textShadow: TextShadowStyle;
  paddingX: number;
  paddingY: number;
  typography: Typography;
}

export type EdgeAnchor = "auto" | "top" | "right" | "bottom" | "left";

export interface CanvasEdge {
  id: string;
  type: "edge";
  sourceNodeId: string;
  targetNodeId: string;
  sourceAnchor: EdgeAnchor;
  targetAnchor: EdgeAnchor;
  color: string;
  width: number;
  dashed: boolean;
  arrowStart: boolean;
  arrowEnd: boolean;
  curve: number;
  opacity: number;
  zIndex: number;
  transition: NodeTransition;
  entranceAnimation: EdgeEntranceAnimation;
  replayEntranceOnStepChange: boolean;
}

export type CanvasNode = RectNode | TextNode;
export type CanvasEntity = CanvasNode | CanvasEdge;

export const DEFAULT_TEXT_SHADOW_STYLE: TextShadowStyle = {
  enabled: false,
  x: 0,
  y: 8,
  blur: 16,
  color: "#000000",
  opacity: 0.35,
};

export const DEFAULT_BOX_SHADOW_STYLE: BoxShadowStyle = {
  ...DEFAULT_TEXT_SHADOW_STYLE,
  y: 10,
  blur: 24,
  spread: 0,
  opacity: 0.22,
};

export const DEFAULT_RECT_NODE: RectNode = {
  id: "default-rect",
  type: "rect",
  position: { x: 0, y: 0 },
  size: { width: 100, height: 100 },
  backgroundImage: undefined,
  backgroundSize: "cover",
  boxShadow: { ...DEFAULT_BOX_SHADOW_STYLE },
  bgColor: "#ffffff",
  radius: 0,
  borderWidth: 0,
  borderColor: "#ffffff",
  opacity: 1,
  rotate: 0,
  scale: 1,
  zIndex: 0,
  transition: "spring",
  entranceAnimation: "pop",
  replayEntranceOnStepChange: false,
  content: "",
  contentTypography: {
    color: "#000000",
    fontSize: 20,
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontStyle: "normal",
    lineHeight: 1.2,
    letterSpacing: 0,
    textAlign: "center",
    underline: false,
    strikethrough: false,
    strokeWidth: 0,
    strokeColor: "#000000",
  },
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
  entranceAnimation: "pop",
  replayEntranceOnStepChange: false,
  text: "Text",
  color: "#ffffff",
  textShadow: { ...DEFAULT_TEXT_SHADOW_STYLE },
  paddingX: 0,
  paddingY: 0,
  bgColor: "transparent",
  radius: 0,
  borderWidth: 0,
  borderColor: "#ffffff",
  typography: {
    fontSize: 64,
    fontFamily: "Inter, sans-serif",
    fontWeight: 600,
    fontStyle: "normal",
    lineHeight: 1.2,
    letterSpacing: 0,
    textAlign: "left",
    underline: false,
    strikethrough: false,
    strokeWidth: 0,
    strokeColor: "#000000",
  },
};

export const DEFAULT_EDGE: CanvasEdge = {
  id: "default-edge",
  type: "edge",
  sourceNodeId: "",
  targetNodeId: "",
  sourceAnchor: "auto",
  targetAnchor: "auto",
  color: "#ffffff",
  width: 3,
  dashed: false,
  arrowStart: false,
  arrowEnd: true,
  curve: 0.32,
  opacity: 1,
  zIndex: 0,
  transition: "spring",
  entranceAnimation: "draw",
  replayEntranceOnStepChange: false,
};

export interface Snapshot {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}
