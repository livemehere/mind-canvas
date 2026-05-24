import { motion } from "motion/react";
import { type Types, type Position, type TextNode } from "../core/types";
import { useMemo } from "react";
import { useControls } from "leva";

export interface Props {
  nodes: Types[];
  setNodes: (newNodes: Types[]) => void;
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

  const activeTextNode = activeNode?.type === "text" ? activeNode : null;

  useControls(
    `Active Node (${activeNode ? activeNode.id : "None"})`,
    {
      scale: {
        value: activeNode?.scale ?? 1,
        step: 0.1,
        onChange: (scale) => {
          if (activeNode) {
            updateNode({ ...activeNode, scale });
          }
        },
      },
      ...(activeNode?.type === "rect"
        ? {
            bgColor: {
              value: activeNode.bgColor,
              onChange: (bgColor: string) => {
                updateNode({ ...activeNode, bgColor });
              },
            },
          }
        : {}),
      ...(activeTextNode
        ? {
            text: {
              value: activeTextNode.text,
              onChange: (text: string) => {
                updateNode({ ...activeTextNode, text });
              },
            },
            color: {
              value: activeTextNode.color,
              onChange: (color: string) => {
                updateNode({ ...activeTextNode, color });
              },
            },
            fontSize: {
              value: activeTextNode.typography.fontSize,
              step: 1,
              min: 8,
              onChange: (fontSize: number) => {
                updateNode({
                  ...activeTextNode,
                  typography: { ...activeTextNode.typography, fontSize },
                });
              },
            },
          }
        : {}),
    },
    [activeNode],
  );

  const updateNode = (node: Types) => {
    setNodes(nodes.map((n) => (n.id === node.id ? node : n)));
  };

  const getNodeTransition = (node: Types) => {
    if (activeNode?.id === node.id) {
      return { duration: 0 };
    }

    if (node.transition?.type === "tween") {
      return {
        type: "tween" as const,
        duration: node.transition.duration ?? 0.25,
      };
    }

    return {
      type: "spring" as const,
      stiffness: node.transition?.stiffness ?? 100,
      damping: node.transition?.damping ?? 30,
    };
  };

  const getTextStyles = (node: TextNode) => ({
    color: node.color,
    fontSize: node.typography.fontSize,
    fontFamily: node.typography.fontFamily,
    fontWeight: node.typography.fontWeight,
    lineHeight: node.typography.lineHeight,
    letterSpacing: node.typography.letterSpacing,
    textAlign: node.typography.textAlign,
    whiteSpace: "pre-wrap" as const,
  });

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
              outline: "2px solid #ffff00",
            }),
          }}
          initial={false}
          animate={{
            x: node.position.x,
            y: node.position.y,
            scale: node.scale,
            opacity: node.opacity ?? 1,
            rotate: node.rotate ?? 0,
            ...(node.type === "rect"
              ? {
                  width: node.size.width,
                  height: node.size.height,
                  backgroundColor: node.bgColor,
                }
              : {}),
            ...(node.type === "text" ? { color: node.color } : {}),
          }}
          transition={getNodeTransition(node)}
          className={node.type === "text" ? "" : "text-black text-xs"}
          onClick={(e) => {
            e.stopPropagation();
            setActiveNodeId(node.id);
          }}
          onDragEnd={(_, info) => {
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
          {node.type === "text" ? (
            <div style={getTextStyles(node)}>{node.text}</div>
          ) : null}
        </motion.div>
      ))}
    </div>
  );
}
