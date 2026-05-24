import { motion } from "motion/react";
import { type CNode, RECT } from "../core/CNode";
import { useMemo, useState } from "react";
import { useControls } from "leva";

export interface Props {
  nodes: CNode[];
  setNodes: (newNodes: CNode[]) => void;
  activeNodeId: string | null;
  setActiveNodeId: (id: string | null) => void;
}

export function Canvas({
  nodes,
  setNodes,
  activeNodeId,
  setActiveNodeId,
}: Props) {
  const activeNode = useMemo(
    () => nodes.find((n) => n.id === activeNodeId) ?? null,
    [nodes, activeNodeId],
  );
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  useControls(
    `Active Node (${activeNode ? activeNode.id : "None"})`,
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
      transition: {
        value: true,
        onChange: (v: boolean) => setTransitionEnabled(v),
      },
    },
    [activeNode],
  );

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
            ...(activeNode?.id === node.id && {
              outline: "2px solid #ff0000",
            }),
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
          transition={
            transitionEnabled
              ? { type: "spring", stiffness: 100, damping: 30 }
              : { duration: 0 }
          }
          className={"text-black text-xs"}
          onClick={() => {
            setActiveNodeId(node.id);
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
