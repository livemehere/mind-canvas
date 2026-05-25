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
export const BOX_CONTENT_KIND_OPTIONS = [
  "plain",
  "svg",
  "component",
] as const;
export const EDGE_ENTRANCE_ANIMATIONS = ["none", "fade", "draw"] as const;
export const EDGE_ANCHOR_OPTIONS = [
  "auto",
  "top",
  "right",
  "bottom",
  "left",
] as const;
export const EDGE_ROUTE_OPTIONS = ["curve", "straight", "elbow"] as const;

export type NodeTransition = (typeof NODE_TRANSITIONS)[number];
export type EntranceAnimation = (typeof ENTRANCE_ANIMATIONS)[number];
export type TextAlign = (typeof TEXT_ALIGN_OPTIONS)[number];
export type FontStyle = (typeof FONT_STYLE_OPTIONS)[number];
export type RectBackgroundSize = (typeof RECT_BACKGROUND_SIZE_OPTIONS)[number];
export type BoxContentKind = (typeof BOX_CONTENT_KIND_OPTIONS)[number];
export type EdgeEntranceAnimation =
  (typeof EDGE_ENTRANCE_ANIMATIONS)[number];
export type EdgeAnchor = (typeof EDGE_ANCHOR_OPTIONS)[number];
export type EdgeRoute = (typeof EDGE_ROUTE_OPTIONS)[number];

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
  type: "box" | "text";
  position: Position;
  opacity: number;
  scale: number;
  rotate: number;
  zIndex: number;
  transition: NodeTransition;
  entranceAnimation: EntranceAnimation;
  replayEntranceOnStepChange: boolean;
  radius: number;
  borderWidth: number;
  borderColor: string;
  borderEnabled: boolean;
}

export interface BoxNode extends BaseNode {
  type: "box";
  size: {
    width: number;
    height: number;
  };
  backgroundImage?: string;
  backgroundSize: RectBackgroundSize;
  backgroundEnabled: boolean;
  bgColor: string;
  contentKind: BoxContentKind;
  boxShadow: BoxShadowStyle;
  content: string;
  svgContent: string;
  sanitizeSvg: boolean;
  componentId: string;
  componentProps: Record<string, unknown>;
  contentTypography: RectContentTypography;
}

export interface TextNode extends BaseNode {
  type: "text";
  text: string;
  color: string;
  bgColor: string;
  backgroundEnabled: boolean;
  textShadow: TextShadowStyle;
  paddingX: number;
  paddingY: number;
  typography: Typography;
}

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
  route: EdgeRoute;
  curve: number;
  opacity: number;
  zIndex: number;
  transition: NodeTransition;
  entranceAnimation: EdgeEntranceAnimation;
  replayEntranceOnStepChange: boolean;
}

export type CanvasNode = BoxNode | TextNode;
export type CanvasEntity = CanvasNode | CanvasEdge;

export type RectNode = BoxNode;

export const DEFAULT_BOX_COMPONENT_ID = "badge-note";

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

export const DEFAULT_BOX_NODE: BoxNode = {
  id: "default-rect",
  type: "box",
  position: { x: 0, y: 0 },
  size: { width: 100, height: 100 },
  backgroundImage: undefined,
  backgroundSize: "cover",
  backgroundEnabled: true,
  borderEnabled: true,
  contentKind: "plain",
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
  svgContent: "",
  sanitizeSvg: true,
  componentId: DEFAULT_BOX_COMPONENT_ID,
  componentProps: {},
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

export const DEFAULT_RECT_NODE = DEFAULT_BOX_NODE;

export const normalizeCanvasNode = (value: unknown): CanvasNode => {
  const node = value as Record<string, unknown> | null;
  if (!node || typeof node !== "object") {
    return value as CanvasNode;
  }

  if (node.type === "rect" || node.type === "box") {
    const normalizedContentKind =
      node.contentKind === "plain" ||
      node.contentKind === "svg" ||
      node.contentKind === "component"
        ? node.contentKind
        : "plain";

    return {
      ...node,
      type: "box",
      bgColor: typeof node.bgColor === "string" ? node.bgColor : "#ffffff",
      backgroundEnabled:
        typeof node.backgroundEnabled === "boolean" ? node.backgroundEnabled : true,
      borderEnabled:
        typeof node.borderEnabled === "boolean" ? node.borderEnabled : true,
      contentKind: normalizedContentKind,
      svgContent: typeof node.svgContent === "string" ? node.svgContent : "",
      sanitizeSvg: typeof node.sanitizeSvg === "boolean" ? node.sanitizeSvg : true,
      componentId:
        typeof node.componentId === "string" && node.componentId.length > 0
          ? node.componentId
          : DEFAULT_BOX_COMPONENT_ID,
      componentProps:
        typeof node.componentProps === "object" && node.componentProps !== null
          ? (node.componentProps as Record<string, unknown>)
          : {},
    } as CanvasNode;
  }

  if (node.type === "text") {
    return {
      ...node,
      bgColor: typeof node.bgColor === "string" ? node.bgColor : "transparent",
      backgroundEnabled:
        typeof node.backgroundEnabled === "boolean"
          ? node.backgroundEnabled
          : true,
      borderEnabled:
        typeof node.borderEnabled === "boolean" ? node.borderEnabled : true,
    } as CanvasNode;
  }

  return value as CanvasNode;
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
  backgroundEnabled: true,
  radius: 0,
  borderWidth: 0,
  borderColor: "#ffffff",
  borderEnabled: true,
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
  route: "curve",
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
