export interface Position {
  x: number;
  y: number;
}

export interface CNode {
  id: string;
  position: Position;
  size: {
    width: number;
    height: number;
  };
  scale: number;
  bgColor: string;
  content?: string;
}

export const RECT: CNode = {
  id: "0",
  position: { x: 0, y: 0 },
  size: { width: 100, height: 100 },
  bgColor: "#ffffff",
  scale: 1,
};

export interface SnapShot {
  nodes: CNode[];
}
