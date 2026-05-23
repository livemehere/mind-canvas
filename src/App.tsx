import { Canvas } from "./components/Canvas";
import { useState } from "react";
import { type CNode, RECT } from "./core/CNode";

export default function App() {
  const [nodes, setNodes] = useState<CNode[]>([RECT]);
  return (
    <div className="h-full">
      <Canvas nodes={nodes} setNodes={setNodes} />
    </div>
  );
}
