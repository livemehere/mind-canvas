export interface Position {
  x: number;
  y: number;
}

export interface NodeTransition {
  type?: "spring" | "tween";
  duration?: number;
  stiffness?: number;
  damping?: number;
}

export type TextEffect =
  | { type: "none" }
  | { type: "fade"; duration: number }
  | { type: "typewriter"; duration: number; by?: "char" | "word" }
  | { type: "blur-in"; duration: number; blur: number }
  | { type: "scramble"; duration: number };

export interface BaseNode {
  id: string;
  type: "rect" | "text";
  position: Position;
  opacity?: number;
  scale: number;
  rotate?: number;
  transition?: NodeTransition;
}

export interface RectNode extends BaseNode {
  type: "rect";
  size: {
    width: number;
    height: number;
  };
  bgColor: string;
  radius?: number;
}

export interface TextNode extends BaseNode {
  type: "text";
  text: string;
  color: string;
  typography: {
    fontSize: number;
    fontFamily?: string;
    fontWeight?: number;
    lineHeight?: number;
    letterSpacing?: number;
    textAlign?: "left" | "center" | "right";
  };
  textEffect?: TextEffect;
}

export type Types = RectNode | TextNode;

export const DEFAULT_RECT: RectNode = {
  id: "default-rect",
  type: "rect",
  position: { x: 0, y: 0 },
  size: { width: 100, height: 100 },
  bgColor: "#ffffff",
  rotate: 0,
  scale: 1,
};

export const DEFAULT_TEXT: TextNode = {
  id: "default-text",
  type: "text",
  position: { x: 0, y: 0 },
  rotate: 0,
  scale: 1,
  text: "Text",
  color: "#ffffff",
  typography: {
    fontSize: 32,
    fontWeight: 600,
    textAlign: "left",
  },
  textEffect: { type: "none" },
};

export interface SnapShot {
  nodes: Types[];
}
