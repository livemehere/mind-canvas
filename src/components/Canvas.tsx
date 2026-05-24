import { motion } from "motion/react";
import { type CNode, RECT } from "../core/CNode";
import { useState } from "react";
import { useControls } from "leva";

export interface Props {
  nodes: CNode[];
  setNodes: (newNodes: CNode[]) => void;
}

export function Canvas({ nodes, setNodes }: Props) {
  const [activeNode, setActiveNode] = useState<CNode | null>(null);
  useControls(
    "Active Node",
    {
      color: {
        value: activeNode?.bgColor ?? "#ffffff",
        onChange: (color) => {
          if (activeNode) {
            console.log("change", color);
            updateNode({ ...activeNode, bgColor: color });
          }
        },
      },
    },
    [activeNode],
  );
  console.log(activeNode);

  const updateNode = (node: CNode) => {
    setNodes(nodes.map((n) => (n.id === node.id ? node : n)));
  };

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
    <div className={"h-full relative"}>
      {nodes.map((node) => (
        <motion.div
          drag
          dragMomentum={false}
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
          transition={{ type: "spring", stiffness: 100, damping: 30 }}
          className={"text-black text-xs"}
          onClick={() => {
            setActiveNode(node);
          }}
          onDragEnd={(_, info) => {
            // update node position at current snapShot
            setNodes(
              nodes.map((n) => {
                if (n.id !== node.id) return n;
                return {
                  ...n,
                  position: {
                    x: n.position.x + info.offset.x,
                    y: n.position.y + info.offset.y,
                  },
                  bgColor: "#ff0000",
                };
              }),
            );
          }}
        >
          {node.content}
        </motion.div>
      ))}
    </div>
  );
}
