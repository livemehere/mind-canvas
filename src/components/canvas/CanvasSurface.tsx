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
import { type CanvasToolId } from "./types";
import { SelectedNodeControls } from "../../features/controls";
import {
  type CanvasSize,
  type UpdateSelectedNodesOptions,
} from "../../features/controls/types";
import {
  buildDragSnapCache,
  getSnapPreviewOffset,
  type DragSnapCache,
  type SnapGuide,
} from "../../features/snap/helpers";
import { NOOP } from "../../utils/noop";

export interface CanvasViewport {
  x: number;
  y: number;
  scale: number;
}

export interface CanvasSurfaceProps {
  nodes: CanvasNode[];
  setNodes?: (
    newNodes: CanvasNode[],
    options?: { commitHistory?: boolean; syncMatchingIds?: boolean },
  ) => void;
  activeNodeIds?: string[];
  setActiveNodeIds?: (ids: string[]) => void;
  activeToolId?: CanvasToolId;
  onClickBackground?: (position: Position) => void;
  viewOnly?: boolean;
  showControls?: boolean;
  onNodeDoubleClick?: (node: CanvasNode) => void;
  canvasSize?: CanvasSize;
  entranceNodeIds?: string[];
  linkedNodeIds?: string[];
  onDetachLinkedNodes?: () => void;
  viewport?: CanvasViewport;
  onViewportChange?: (nextViewport: CanvasViewport) => void;
  showOriginAxes?: boolean;
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
  entranceNodeIds = [],
  linkedNodeIds = [],
  onDetachLinkedNodes = NOOP,
  viewport: controlledViewport,
  onViewportChange,
  showOriginAxes = !viewOnly,
}: CanvasSurfaceProps) {
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 3;
  const ZOOM_SENSITIVITY = 0.0015;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const pointerStartRef = useRef<Position | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const nodesRef = useRef(nodes);
  const dragSnapCacheRef = useRef<DragSnapCache | null>(null);
  const dragNodeIdsRef = useRef<string[] | null>(null);
  const dragAxisRef = useRef<"x" | "y" | null>(null);
  const panPointerIdRef = useRef<number | null>(null);
  const panStartClientRef = useRef<Position | null>(null);
  const panStartViewportRef = useRef<{ x: number; y: number } | null>(null);
  const [measuredCanvasSize, setMeasuredCanvasSize] =
    useState<CanvasSize>(canvasSize);
  const [uncontrolledViewport, setUncontrolledViewport] =
    useState<CanvasViewport>({ x: 0, y: 0, scale: 1 });
  const viewport = controlledViewport ?? uncontrolledViewport;
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null,
  );
  const [dragPreview, setDragPreview] = useState<{
    leaderId: string;
    nodeIds: string[];
    offset: Position;
    guides?: SnapGuide;
  } | null>(null);
  const [entranceRun, setEntranceRun] = useState(0);

  useEffect(() => {
    if (entranceNodeIds.length === 0) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntranceRun((prev) => prev + 1);
  }, [entranceNodeIds]);

  const selectedNodes = useMemo(
    () => nodes.filter((node) => activeNodeIds.includes(node.id)),
    [nodes, activeNodeIds],
  );

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

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
    options?: { commitHistory?: boolean; syncMatchingIds?: boolean },
  ) => {
    const nextNodes = updater(nodesRef.current);
    nodesRef.current = nextNodes;
    setNodes(nextNodes, options);
  };

  const updateViewport = (
    nextViewportOrUpdater:
      | CanvasViewport
      | ((currentViewport: CanvasViewport) => CanvasViewport),
  ) => {
    const nextViewport =
      typeof nextViewportOrUpdater === "function"
        ? nextViewportOrUpdater(viewport)
        : nextViewportOrUpdater;

    if (!controlledViewport) {
      setUncontrolledViewport(nextViewport);
    }

    onViewportChange?.(nextViewport);
  };

  const updateSelectedNodes = (
    updater: (node: CanvasNode) => CanvasNode,
    options?: UpdateSelectedNodesOptions,
  ) => {
    commitNodes(
      (currentNodes) =>
        currentNodes.map((currentNode) =>
          activeNodeIds.includes(currentNode.id)
            ? updater(currentNode)
            : currentNode,
        ),
      options,
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
    return getCanvasPositionFromClient(
      event.clientX,
      event.clientY,
      event.currentTarget,
    );
  };

  const getCanvasPositionFromClient = (
    clientX: number,
    clientY: number,
    target?: HTMLDivElement,
  ): Position => {
    const element = target ?? containerRef.current;
    if (!element) {
      return { x: 0, y: 0 };
    }

    const rect = element.getBoundingClientRect();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;

    return {
      x: (pointerX - viewport.x) / viewport.scale,
      y: (pointerY - viewport.y) / viewport.scale,
    };
  };

  const isPanGesture = (event: React.PointerEvent<HTMLDivElement>) =>
    event.button === 1 || (event.button === 0 && isSpacePressed);

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
          left: (rect.left - canvasRect.left - viewport.x) / viewport.scale,
          top: (rect.top - canvasRect.top - viewport.y) / viewport.scale,
          right: (rect.right - canvasRect.left - viewport.x) / viewport.scale,
          bottom: (rect.bottom - canvasRect.top - viewport.y) / viewport.scale,
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

    if (isPanGesture(event)) {
      panPointerIdRef.current = event.pointerId;
      panStartClientRef.current = { x: event.clientX, y: event.clientY };
      panStartViewportRef.current = { x: viewport.x, y: viewport.y };
      pointerStartRef.current = null;
      setSelectionRect(null);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    if (event.button !== 0) {
      return;
    }

    if (
      event.target !== event.currentTarget &&
      event.target !== worldRef.current
    ) {
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

    if (
      panPointerIdRef.current === event.pointerId &&
      panStartClientRef.current &&
      panStartViewportRef.current
    ) {
      const deltaX = event.clientX - panStartClientRef.current.x;
      const deltaY = event.clientY - panStartClientRef.current.y;
      updateViewport((prev) => ({
        ...prev,
        x: panStartViewportRef.current!.x + deltaX,
        y: panStartViewportRef.current!.y + deltaY,
      }));
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

    if (panPointerIdRef.current === event.pointerId) {
      panPointerIdRef.current = null;
      panStartClientRef.current = null;
      panStartViewportRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
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

  const handleCanvasWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!containerRef.current) {
      return;
    }

    event.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    updateViewport((prev) => {
      const nextScale = Math.min(
        MAX_ZOOM,
        Math.max(
          MIN_ZOOM,
          prev.scale * Math.exp(-event.deltaY * ZOOM_SENSITIVITY),
        ),
      );

      if (nextScale === prev.scale) {
        return prev;
      }

      const worldX = (pointerX - prev.x) / prev.scale;
      const worldY = (pointerY - prev.y) / prev.scale;

      return {
        x: pointerX - worldX * nextScale,
        y: pointerY - worldY * nextScale,
        scale: nextScale,
      };
    });
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

    if (isSpacePressed) {
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
      dragNodeIdsRef.current ??
      dragPreview?.nodeIds ??
      (activeNodeIds.includes(node.id) ? activeNodeIds : [node.id]);

    const finalOffset = dragPreview?.offset ?? {
      x: offset.x / viewport.scale,
      y: offset.y / viewport.scale,
    };

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
    dragNodeIdsRef.current = null;
    dragAxisRef.current = null;
  };

  const handleNodeDragStart = (
    node: CanvasNode,
    modifiers: { altKey: boolean },
  ) => {
    if (viewOnly) {
      return;
    }

    const sourceNodeIds = activeNodeIds.includes(node.id)
      ? activeNodeIds
      : [node.id];
    let movingNodeIds = sourceNodeIds;
    let leaderId = node.id;

    if (modifiers.altKey) {
      const duplicatedNodes = nodesRef.current
        .filter((currentNode) => sourceNodeIds.includes(currentNode.id))
        .map((currentNode) => {
          const duplicatedNode = structuredClone(currentNode);
          duplicatedNode.id = window.crypto.randomUUID();

          if (currentNode.id === node.id) {
            leaderId = duplicatedNode.id;
          }

          return duplicatedNode;
        });

      movingNodeIds = duplicatedNodes.map(
        (duplicatedNode) => duplicatedNode.id,
      );
      commitNodes((currentNodes) => [...currentNodes, ...duplicatedNodes], {
        commitHistory: false,
      });
      setActiveNodeIds(movingNodeIds);
    }

    dragNodeIdsRef.current = movingNodeIds;
    dragAxisRef.current = null;

    const canvasRect = containerRef.current?.getBoundingClientRect();
    if (canvasRect) {
      dragSnapCacheRef.current = buildDragSnapCache({
        movingNodeIds,
        nodes: nodesRef.current,
        nodeRefs: nodeRefs.current,
        canvasRect,
        canvasSize: measuredCanvasSize,
        viewport,
      });
    }

    setDragPreview({
      leaderId,
      nodeIds: movingNodeIds,
      offset: { x: 0, y: 0 },
      guides: {},
    });
  };

  const handleNodeDrag = (
    node: CanvasNode,
    offset: { x: number; y: number },
    modifiers: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
  ) => {
    if (viewOnly) {
      return;
    }

    const movingNodeIds =
      dragNodeIdsRef.current ??
      (activeNodeIds.includes(node.id) ? activeNodeIds : [node.id]);
    const scaledOffset = {
      x: offset.x / viewport.scale,
      y: offset.y / viewport.scale,
    };
    const shouldDisableSnap = modifiers.ctrlKey || modifiers.metaKey;

    if (modifiers.shiftKey && dragAxisRef.current === null) {
      dragAxisRef.current =
        Math.abs(scaledOffset.x) >= Math.abs(scaledOffset.y) ? "x" : "y";
    }

    if (!modifiers.shiftKey) {
      dragAxisRef.current = null;
    }

    let nextOffset = { x: scaledOffset.x, y: scaledOffset.y };
    let guides: SnapGuide | undefined;

    if (dragAxisRef.current === "x") {
      nextOffset = { x: scaledOffset.x, y: 0 };
    } else if (dragAxisRef.current === "y") {
      nextOffset = { x: 0, y: scaledOffset.y };
    } else if (!shouldDisableSnap && dragSnapCacheRef.current) {
      const snappedPreview = getSnapPreviewOffset(
        scaledOffset,
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
      className="h-full relative overflow-hidden"
      style={{
        pointerEvents: viewOnly ? "none" : "auto",
        opacity: viewOnly ? 0.1 : 1,
        cursor:
          panPointerIdRef.current === null
            ? isSpacePressed
              ? "grab"
              : "default"
            : "grabbing",
      }}
      onWheel={viewOnly ? undefined : handleCanvasWheel}
      onPointerDown={viewOnly ? undefined : handleBackgroundPointerDown}
      onPointerMove={viewOnly ? undefined : handleBackgroundPointerMove}
      onPointerUp={viewOnly ? undefined : handleBackgroundPointerUp}
    >
      {showControls ? (
        <SelectedNodeControls
          nodes={selectedNodes}
          updateSelectedNodes={updateSelectedNodes}
          canvasSize={measuredCanvasSize}
          linkedNodeIds={linkedNodeIds}
          onDetachLinkedNodes={onDetachLinkedNodes}
        />
      ) : null}
      <div
        ref={worldRef}
        className="absolute left-0 top-0 h-full w-full"
        style={{
          transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        {nodes.map((node) => (
          <CanvasNodeItem
            key={
              entranceNodeIds.includes(node.id)
                ? `${node.id}:entrance:${entranceRun}`
                : node.id
            }
            node={node}
            isSelected={activeNodeIds.includes(node.id)}
            canDrag={!viewOnly && activeToolId === "select" && !isSpacePressed}
            shouldPlayEntranceAnimation={entranceNodeIds.includes(node.id)}
            isPreviewing={dragPreview?.nodeIds.includes(node.id) === true}
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
      {showOriginAxes ? (
        <>
          <div
            className="pointer-events-none absolute left-0 right-0 border-t border-dotted border-white/20"
            style={{ top: viewport.y }}
          />
          <div
            className="pointer-events-none absolute top-0 bottom-0 border-l border-dotted border-white/20"
            style={{ left: viewport.x }}
          />
        </>
      ) : null}
    </div>
  );
}
