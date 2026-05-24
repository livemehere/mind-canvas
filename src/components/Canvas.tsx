import { motion } from "motion/react";
import { type CNode, type Position } from "../core/CNode";
import { useMemo, useState } from "react";
import { useControls } from "leva";

export interface Props {
  nodes: CNode[];
  setNodes: (newNodes: CNode[]) => void;
  activeNodeId: string | null;
  setActiveNodeId: (id: string | null) => void;
  onClickBackground: (position: Position) => void;
}

export function Canvas({
  nodes,
  setNodes,
  activeNodeId,
  setActiveNodeId,
  onClickBackground,
}: Props) {
  const activeNode = useMemo(
    () => nodes.find((n) => n.id === activeNodeId) ?? null,
    [nodes, activeNodeId],
  );

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
      content: {
        value: activeNode?.content ?? "",
        onChange: (content) => {
          if (activeNode) {
            updateNode({ ...activeNode, content });
          }
        },
      },
      scale: {
        value: activeNode?.scale ?? 1,
        step: 0.1,
        onChange: (scale) => {
          if (activeNode) {
            updateNode({ ...activeNode, scale });
          }
        },
      },
    },
    [activeNode],
  );

  const updateNode = (node: CNode) => {
    setNodes(nodes.map((n) => (n.id === node.id ? node : n)));
  };

  return (
    <div
      className={"h-full relative"}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        onClickBackground({ x, y });
      }}
    >
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
            activeNode?.id === node.id
              ? { duration: 0 }
              : { type: "spring", stiffness: 100, damping: 30 }
          }
          className={"text-black text-xs"}
          onClick={(e) => {
            e.stopPropagation();
            setActiveNodeId(node.id);
            console.log(1);
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
