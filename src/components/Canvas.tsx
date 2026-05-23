import { motion } from "motion/react";
import { type CNode, RECT } from "../core/CNode";

export interface Props {
  nodes: CNode[];
  setNodes: (newNodes: CNode[]) => void;
}

export function Canvas({ nodes, setNodes }: Props) {
  const createRect = (x: number, y: number) => {
    setNodes([
      ...nodes,
      {
        ...RECT,
        id: window.crypto.randomUUID(),
        position: { x, y },
      },
    ]);
  };

  const handleOnClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    createRect(x, y);
  };

  return (
    <div className={"h-full relative"} onClick={handleOnClick}>
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          layout
          style={{
            position: "absolute",
            left: 0,
            top: 0,
          }}
          initial={false}
          animate={{
            x: node.position.x,
            y: node.position.y,
            scale: node.scale,
            width: node.size.width,
            height: node.size.height,
            backgroundColor: node.bgColor,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={"text-black text-xs"}
        >
          {node.id}
        </motion.div>
      ))}
    </div>
  );
}
