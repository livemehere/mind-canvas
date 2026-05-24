import { useMemo, useRef, useState } from "react";
import { type CanvasNode, type Position } from "../../core/nodes";
import { CanvasNodeItem } from "./CanvasNodeItem";
import {
  DRAG_THRESHOLD,
  getNormalizedBox,
  isBoxInside,
  type Box,
  type SelectionRect,
} from "../../features/selection/helpers";

import { SelectionOverlay } from "../../features/selection/SelectionOverlay";
import { type CanvasToolId } from "./CanvasToolbar";
import { SelectedNodeControls } from "../../features/controls";
import { NOOP } from "../../utils/noop";

export interface CanvasSurfaceProps {
  nodes: CanvasNode[];
  setNodes?: (newNodes: CanvasNode[]) => void;
  activeNodeIds?: string[];
  setActiveNodeIds?: (ids: string[]) => void;
  activeToolId?: CanvasToolId;
  onClickBackground?: (position: Position) => void;
  viewOnly?: boolean;
}

export function CanvasSurface({
  nodes,
  setNodes = NOOP,
  activeNodeIds = [],
  setActiveNodeIds = NOOP,
  activeToolId = "select",
  onClickBackground = NOOP,
  viewOnly = false,
}: CanvasSurfaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerStartRef = useRef<Position | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null,
  );
  const [dragPreview, setDragPreview] = useState<{
    leaderId: string;
    nodeIds: string[];
    offset: Position;
  } | null>(null);

  const selectedNodes = useMemo(
    () => nodes.filter((node) => activeNodeIds.includes(node.id)),
    [nodes, activeNodeIds],
  );

  const updateSelectedNodes = (updater: (node: CanvasNode) => CanvasNode) => {
    setNodes(
      nodes.map((currentNode) =>
        activeNodeIds.includes(currentNode.id)
          ? updater(currentNode)
          : currentNode,
      ),
    );
  };

  const getCanvasPosition = (
    event: React.PointerEvent<HTMLDivElement>,
  ): Position => {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const setNodeRef = (nodeId: string, element: HTMLDivElement | null) => {
    nodeRefs.current[nodeId] = element;
  };

  const selectNodesInBox = (box: Box) => {
    const canvasRect = containerRef.current!.getBoundingClientRect();

    const nextSelection = nodes
      .filter((node) => {
        const element = nodeRefs.current[node.id];

        if (!element) {
          return false;
        }

        const rect = element.getBoundingClientRect();
        const nodeBox = {
          left: rect.left - canvasRect.left,
          top: rect.top - canvasRect.top,
          right: rect.right - canvasRect.left,
          bottom: rect.bottom - canvasRect.top,
        };

        return isBoxInside(nodeBox, box);
      })
      .map((node) => node.id);

    setActiveNodeIds(nextSelection);
  };

  const handleBackgroundPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (viewOnly) {
      return;
    }

    if (event.target !== event.currentTarget) {
      return;
    }

    const position = getCanvasPosition(event);
    pointerStartRef.current = position;

    if (activeToolId === "select") {
      setSelectionRect({ start: position, current: position });
    }

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleBackgroundPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (viewOnly) {
      return;
    }

    if (!pointerStartRef.current || activeToolId !== "select") {
      return;
    }

    const position = getCanvasPosition(event);
    setSelectionRect({ start: pointerStartRef.current, current: position });
  };

  const handleBackgroundPointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (viewOnly) {
      return;
    }

    if (!pointerStartRef.current) {
      return;
    }

    const start = pointerStartRef.current;
    const end = getCanvasPosition(event);
    const distance = Math.hypot(end.x - start.x, end.y - start.y);

    if (activeToolId === "select") {
      if (distance < DRAG_THRESHOLD) {
        onClickBackground(end);
      } else {
        selectNodesInBox(getNormalizedBox(start, end));
      }
    } else if (distance < DRAG_THRESHOLD) {
      onClickBackground(end);
    }

    pointerStartRef.current = null;
    setSelectionRect(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const toggleNodeSelection = (nodeId: string) => {
    setActiveNodeIds(
      activeNodeIds.includes(nodeId)
        ? activeNodeIds.filter((id) => id !== nodeId)
        : [...activeNodeIds, nodeId],
    );
  };

  const handleNodePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    node: CanvasNode,
  ) => {
    if (viewOnly) {
      return;
    }

    event.stopPropagation();

    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      toggleNodeSelection(node.id);
      return;
    }

    if (!activeNodeIds.includes(node.id)) {
      setActiveNodeIds([node.id]);
    }
  };

  const handleNodeDragEnd = (
    node: CanvasNode,
    offset: { x: number; y: number },
  ) => {
    if (viewOnly) {
      return;
    }

    const movingNodeIds =
      dragPreview?.nodeIds ??
      (activeNodeIds.includes(node.id) ? activeNodeIds : [node.id]);

    setNodes(
      nodes.map((currentNode) => {
        if (!movingNodeIds.includes(currentNode.id)) {
          return currentNode;
        }

        return {
          ...currentNode,
          position: {
            x: currentNode.position.x + offset.x,
            y: currentNode.position.y + offset.y,
          },
        };
      }),
    );

    setDragPreview(null);
  };

  const handleNodeDragStart = (node: CanvasNode) => {
    if (viewOnly) {
      return;
    }

    const movingNodeIds = activeNodeIds.includes(node.id)
      ? activeNodeIds
      : [node.id];

    setDragPreview({
      leaderId: node.id,
      nodeIds: movingNodeIds,
      offset: { x: 0, y: 0 },
    });
  };

  const handleNodeDrag = (
    node: CanvasNode,
    offset: { x: number; y: number },
  ) => {
    if (viewOnly) {
      return;
    }

    const movingNodeIds = activeNodeIds.includes(node.id)
      ? activeNodeIds
      : [node.id];

    setDragPreview({
      leaderId: node.id,
      nodeIds: movingNodeIds,
      offset: { x: offset.x, y: offset.y },
    });
  };

  return (
    <div
      ref={containerRef}
      className="h-full relative"
      style={{
        pointerEvents: viewOnly ? "none" : "auto",
        opacity: viewOnly ? 0.1 : 1,
      }}
      onPointerDown={viewOnly ? undefined : handleBackgroundPointerDown}
      onPointerMove={viewOnly ? undefined : handleBackgroundPointerMove}
      onPointerUp={viewOnly ? undefined : handleBackgroundPointerUp}
    >
      {viewOnly ? null : (
        <SelectedNodeControls
          nodes={selectedNodes}
          updateSelectedNodes={updateSelectedNodes}
        />
      )}
      {nodes.map((node) => (
        <CanvasNodeItem
          key={node.id}
          node={node}
          isSelected={activeNodeIds.includes(node.id)}
          canDrag={!viewOnly && activeToolId === "select"}
          previewOffset={
            dragPreview &&
            dragPreview.leaderId !== node.id &&
            dragPreview.nodeIds.includes(node.id)
              ? dragPreview.offset
              : undefined
          }
          setNodeRef={setNodeRef}
          onPointerDown={handleNodePointerDown}
          onDragStart={handleNodeDragStart}
          onDrag={handleNodeDrag}
          onDragEnd={handleNodeDragEnd}
        />
      ))}
      {viewOnly ? null : <SelectionOverlay selectionRect={selectionRect} />}
    </div>
  );
}
