export interface CNode {
  id: string;
  position: { x: number; y: number };
  size: {
    width: number;
    height: number;
  };
  scale: number;
  bgColor: string;
}

export const RECT: CNode = {
  id: "0",
  position: { x: 0, y: 0 },
  size: { width: 100, height: 100 },
  bgColor: "white",
  scale: 1,
};

export interface SnapShot {
  nodes: CNode[];
}
