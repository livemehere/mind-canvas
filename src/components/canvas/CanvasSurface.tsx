import { useEffect, useMemo, useRef, useState } from "react";
import {
  type CanvasNode,
  type Position,
  type RectNode,
  type TextNode,
} from "../../core/nodes";
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
import { type CanvasSize } from "../../features/controls/types";
import {
  buildDragSnapCache,
  getSnapPreviewOffset,
  type DragSnapCache,
  type SnapGuide,
} from "../../features/snap/helpers";
import { NOOP } from "../../utils/noop";

export interface CanvasSurfaceProps {
  nodes: CanvasNode[];
  setNodes?: (
    newNodes: CanvasNode[],
    options?: { commitHistory?: boolean },
  ) => void;
  activeNodeIds?: string[];
  setActiveNodeIds?: (ids: string[]) => void;
  activeToolId?: CanvasToolId;
  onClickBackground?: (position: Position) => void;
  viewOnly?: boolean;
  showControls?: boolean;
  onNodeDoubleClick?: (node: CanvasNode) => void;
  canvasSize?: CanvasSize;
}

export function CanvasSurface({
  nodes,
  setNodes = NOOP,
  activeNodeIds = [],
  setActiveNodeIds = NOOP,
  activeToolId = "select",
  onClickBackground = NOOP,
  viewOnly = false,
  showControls = !viewOnly,
  onNodeDoubleClick = NOOP,
  canvasSize = { width: 800, height: 600 },
}: CanvasSurfaceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerStartRef = useRef<Position | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const nodesRef = useRef(nodes);
  const dragSnapCacheRef = useRef<DragSnapCache | null>(null);
  const [measuredCanvasSize, setMeasuredCanvasSize] =
    useState<CanvasSize>(canvasSize);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null,
  );
  const [dragPreview, setDragPreview] = useState<{
    leaderId: string;
    nodeIds: string[];
    offset: Position;
    guides?: SnapGuide;
  } | null>(null);

  const selectedNodes = useMemo(
    () => nodes.filter((node) => activeNodeIds.includes(node.id)),
    [nodes, activeNodeIds],
  );

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateCanvasSize = () => {
      setMeasuredCanvasSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateCanvasSize();

    const observer = new ResizeObserver(() => {
      updateCanvasSize();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const commitNodes = (
    updater: (currentNodes: CanvasNode[]) => CanvasNode[],
    options?: { commitHistory?: boolean },
  ) => {
    const nextNodes = updater(nodesRef.current);
    nodesRef.current = nextNodes;
    setNodes(nextNodes, options);
  };

  const updateSelectedNodes = (updater: (node: CanvasNode) => CanvasNode) => {
    commitNodes((currentNodes) =>
      currentNodes.map((currentNode) =>
        activeNodeIds.includes(currentNode.id)
          ? updater(currentNode)
          : currentNode,
      ),
    );
  };

  const updateRectNode = (
    nodeId: string,
    updater: (node: RectNode) => RectNode,
    options?: { commitHistory?: boolean },
  ) => {
    commitNodes(
      (currentNodes) =>
        currentNodes.map((currentNode) => {
          if (currentNode.id !== nodeId || currentNode.type !== "rect") {
            return currentNode;
          }

          return updater(currentNode);
        }),
      options,
    );
  };

  const updateTextNode = (
    nodeId: string,
    updater: (node: TextNode) => TextNode,
    options?: { commitHistory?: boolean },
  ) => {
    commitNodes(
      (currentNodes) =>
        currentNodes.map((currentNode) => {
          if (currentNode.id !== nodeId || currentNode.type !== "text") {
            return currentNode;
          }

          return updater(currentNode);
        }),
      options,
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

    const finalOffset = dragPreview?.offset ?? offset;

    commitNodes((currentNodes) =>
      currentNodes.map((currentNode) => {
        if (!movingNodeIds.includes(currentNode.id)) {
          return currentNode;
        }

        return {
          ...currentNode,
          position: {
            x: currentNode.position.x + finalOffset.x,
            y: currentNode.position.y + finalOffset.y,
          },
        };
      }),
    );

    setDragPreview(null);
    dragSnapCacheRef.current = null;
  };

  const handleNodeDragStart = (node: CanvasNode) => {
    if (viewOnly) {
      return;
    }

    const movingNodeIds = activeNodeIds.includes(node.id)
      ? activeNodeIds
      : [node.id];

    const canvasRect = containerRef.current?.getBoundingClientRect();
    if (canvasRect) {
      dragSnapCacheRef.current = buildDragSnapCache({
        movingNodeIds,
        nodes,
        nodeRefs: nodeRefs.current,
        canvasRect,
        canvasSize: measuredCanvasSize,
      });
    }

    setDragPreview({
      leaderId: node.id,
      nodeIds: movingNodeIds,
      offset: { x: 0, y: 0 },
      guides: {},
    });
  };

  const handleNodeDrag = (
    node: CanvasNode,
    offset: { x: number; y: number },
    modifiers: { shiftKey: boolean },
  ) => {
    if (viewOnly) {
      return;
    }

    const movingNodeIds = activeNodeIds.includes(node.id)
      ? activeNodeIds
      : [node.id];

    let nextOffset = { x: offset.x, y: offset.y };
    let guides: SnapGuide | undefined;

    if (modifiers.shiftKey && dragSnapCacheRef.current) {
      const snappedPreview = getSnapPreviewOffset(
        offset,
        dragSnapCacheRef.current,
      );
      nextOffset = snappedPreview.offset;
      guides = snappedPreview.guides;
    }

    setDragPreview({
      leaderId: node.id,
      nodeIds: movingNodeIds,
      offset: nextOffset,
      guides,
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
      {showControls ? (
        <SelectedNodeControls
          nodes={selectedNodes}
          updateSelectedNodes={updateSelectedNodes}
          canvasSize={measuredCanvasSize}
        />
      ) : null}
      {nodes.map((node) => (
        <CanvasNodeItem
          key={node.id}
          node={node}
          isSelected={activeNodeIds.includes(node.id)}
          canDrag={!viewOnly && activeToolId === "select"}
          previewOffset={
            dragPreview && dragPreview.nodeIds.includes(node.id)
              ? dragPreview.offset
              : undefined
          }
          setNodeRef={setNodeRef}
          onRectNodeChange={updateRectNode}
          onTextNodeChange={updateTextNode}
          onPointerDown={handleNodePointerDown}
          onDoubleClick={onNodeDoubleClick}
          onDragStart={handleNodeDragStart}
          onDrag={handleNodeDrag}
          onDragEnd={handleNodeDragEnd}
        />
      ))}
      {dragPreview?.guides?.x !== undefined ? (
        <div
          className="pointer-events-none absolute top-0 bottom-0 border-l border-dashed border-purple-400/80"
          style={{ left: dragPreview.guides.x }}
        />
      ) : null}
      {dragPreview?.guides?.y !== undefined ? (
        <div
          className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-purple-400/80"
          style={{ top: dragPreview.guides.y }}
        />
      ) : null}
      {viewOnly ? null : <SelectionOverlay selectionRect={selectionRect} />}
    </div>
  );
}
