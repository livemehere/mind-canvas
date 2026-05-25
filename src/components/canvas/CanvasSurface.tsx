import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  type BoxNode,
  type CanvasEdge,
  type CanvasNode,
  type EdgeAnchor,
  type Position,
  type TextNode,
} from "../../core/nodes";
import { CanvasNodeItem } from "./CanvasNodeItem";
import { CanvasEdgeLayer } from "./CanvasEdgeLayer";
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
  type CanvasViewportState,
  type UpdateSelectedNodesOptions,
} from "../../features/controls/types";
import {
  buildDragSnapCache,
  getSnapPreviewOffset,
  type DragSnapCache,
  type SnapGuide,
} from "../../features/snap/helpers";
import { NOOP } from "../../utils/noop";
import { createEdge } from "../../features/nodes/helpers";

export interface CanvasViewport {
  x: number;
  y: number;
  scale: number;
}

export interface CanvasFocusRequest {
  token: number;
  nodeIds: string[];
  fitPercent: number;
}

interface MeasuredTextBounds {
  key: string;
  width: number;
  height: number;
}

const toCanvasViewportState = (
  viewport: CanvasViewport,
): CanvasViewportState => ({
  x: viewport.x,
  y: viewport.y,
  scale: viewport.scale,
});

const getTextMeasurementKey = (node: TextNode) =>
  JSON.stringify({
    text: node.text,
    paddingX: node.paddingX,
    paddingY: node.paddingY,
    typography: node.typography,
  });

export interface CanvasSurfaceProps {
  nodes: CanvasNode[];
  edges?: CanvasEdge[];
  setNodes?: (
    newNodes: CanvasNode[],
    options?: { commitHistory?: boolean; syncMatchingIds?: boolean },
  ) => void;
  setEdges?: (
    newEdges: CanvasEdge[],
    options?: { commitHistory?: boolean; syncMatchingIds?: boolean },
  ) => void;
  activeNodeIds?: string[];
  setActiveNodeIds?: (ids: string[]) => void;
  activeEdgeIds?: string[];
  setActiveEdgeIds?: (ids: string[]) => void;
  activeToolId?: CanvasToolId;
  onClickBackground?: (position: Position) => void;
  viewOnly?: boolean;
  showControls?: boolean;
  onNodeDoubleClick?: (node: CanvasNode) => void;
  canvasSize?: CanvasSize;
  entranceNodeIds?: string[];
  entranceEdgeIds?: string[];
  linkedNodeIds?: string[];
  onDetachLinkedNodes?: () => void;
  additionalSnapNodes?: CanvasNode[];
  viewport?: CanvasViewport;
  onViewportChange?: (nextViewport: CanvasViewport) => void;
  showOriginAxes?: boolean;
  focusRequest?: CanvasFocusRequest | null;
  resetToOriginToken?: number;
  onShiftWheel?: (deltaY: number) => void;
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
  entranceEdgeIds = [],
  edges = [],
  setEdges = NOOP,
  activeEdgeIds = [],
  setActiveEdgeIds = NOOP,
  linkedNodeIds = [],
  onDetachLinkedNodes = NOOP,
  additionalSnapNodes = [],
  viewport: controlledViewport,
  onViewportChange,
  showOriginAxes = !viewOnly,
  focusRequest = null,
  resetToOriginToken,
  onShiftWheel,
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
  const pendingEdgeSourceNodeIdRef = useRef<string | null>(null);
  const edgeDragSourceNodeIdRef = useRef<string | null>(null);
  const edgeDragSourceAnchorRef = useRef<EdgeAnchor | null>(null);
  const edgeDragPointerIdRef = useRef<number | null>(null);
  const dragAxisRef = useRef<"x" | "y" | null>(null);
  const panPointerIdRef = useRef<number | null>(null);
  const panStartClientRef = useRef<Position | null>(null);
  const panStartViewportRef = useRef<{ x: number; y: number } | null>(null);
  const focusAnimationFrameRef = useRef<number | null>(null);
  const latestFocusTokenRef = useRef<number | null>(null);
  const hasInitializedOriginRef = useRef(false);
  const previousResetTokenRef = useRef<number | undefined>(undefined);
  const [measuredCanvasSize, setMeasuredCanvasSize] = useState<CanvasSize>({
    width: canvasSize.width,
    height: canvasSize.height,
  });
  const [uncontrolledViewport, setUncontrolledViewport] =
    useState<CanvasViewport>({ x: 0, y: 0, scale: 1 });
  const viewport = controlledViewport ?? uncontrolledViewport;
  const viewportRef = useRef(viewport);
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
  const [edgeEntranceRun, setEdgeEntranceRun] = useState(0);
  const [edgeDraftTarget, setEdgeDraftTarget] = useState<Position | null>(null);
  const [edgeDraftTargetAnchor, setEdgeDraftTargetAnchor] =
    useState<EdgeAnchor | null>(null);
  const [edgeDraftHoverNodeId, setEdgeDraftHoverNodeId] = useState<string | null>(
    null,
  );
  const [edgeDraftHoverAnchor, setEdgeDraftHoverAnchor] =
    useState<EdgeAnchor | null>(null);
  const [measuredTextBoundsByNodeId, setMeasuredTextBoundsByNodeId] = useState<
    Record<string, MeasuredTextBounds>
  >({});

  useEffect(() => {
    if (entranceNodeIds.length === 0) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntranceRun((prev) => prev + 1);
  }, [entranceNodeIds]);

  useEffect(() => {
    if (entranceEdgeIds.length === 0) {
      return;
    }

    setEdgeEntranceRun((prev) => prev + 1);
  }, [entranceEdgeIds]);

  useEffect(() => {
    if (activeToolId === "arrow") {
      return;
    }

    pendingEdgeSourceNodeIdRef.current = null;
    edgeDragSourceAnchorRef.current = null;
    setEdgeDraftTarget(null);
    setEdgeDraftTargetAnchor(null);
    setEdgeDraftHoverNodeId(null);
    setEdgeDraftHoverAnchor(null);
  }, [activeToolId]);

  const selectedNodes = useMemo(
    () => nodes.filter((node) => activeNodeIds.includes(node.id)),
    [nodes, activeNodeIds],
  );

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

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

  const commitEdges = (
    updater: (currentEdges: CanvasEdge[]) => CanvasEdge[],
    options?: { commitHistory?: boolean; syncMatchingIds?: boolean },
  ) => {
    const nextEdges = updater(edges);
    setEdges(nextEdges, options);
  };

  const updateViewport = (
    nextViewportOrUpdater:
      | CanvasViewport
      | ((currentViewport: CanvasViewport) => CanvasViewport),
  ) => {
    const currentViewport = viewportRef.current;
    const nextViewport =
      typeof nextViewportOrUpdater === "function"
        ? nextViewportOrUpdater(currentViewport)
        : nextViewportOrUpdater;

    viewportRef.current = nextViewport;

    if (!controlledViewport) {
      setUncontrolledViewport(nextViewport);
    }

    onViewportChange?.(nextViewport);
  };

  const getOriginCenteredViewport = (): CanvasViewport => ({
    x: measuredCanvasSize.width / 2,
    y: measuredCanvasSize.height / 2,
    scale: 1,
  });

  useEffect(() => {
    if (viewOnly || hasInitializedOriginRef.current) {
      return;
    }

    const element = containerRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    updateViewport({
      x: rect.width / 2,
      y: rect.height / 2,
      scale: 1,
    });
    hasInitializedOriginRef.current = true;
  }, [updateViewport, viewOnly]);

  useEffect(() => {
    return () => {
      if (focusAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(focusAnimationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof resetToOriginToken !== "number" || viewOnly) {
      return;
    }

    if (previousResetTokenRef.current === undefined) {
      previousResetTokenRef.current = resetToOriginToken;
      return;
    }

    if (previousResetTokenRef.current === resetToOriginToken) {
      return;
    }

    previousResetTokenRef.current = resetToOriginToken;
    updateViewport(getOriginCenteredViewport());
  }, [
    measuredCanvasSize.height,
    measuredCanvasSize.width,
    resetToOriginToken,
    viewOnly,
  ]);

  useEffect(() => {
    if (
      !focusRequest ||
      focusRequest.nodeIds.length === 0 ||
      !containerRef.current
    ) {
      return;
    }

    if (latestFocusTokenRef.current === focusRequest.token) {
      return;
    }
    latestFocusTokenRef.current = focusRequest.token;

    const targetElements = focusRequest.nodeIds
      .map((nodeId) => nodeRefs.current[nodeId])
      .filter((element): element is HTMLDivElement => element !== null);

    if (targetElements.length === 0) {
      return;
    }

    const worldRect = containerRef.current.getBoundingClientRect();
    const boxes = targetElements.map((element) =>
      element.getBoundingClientRect(),
    );

    const left = Math.min(...boxes.map((rect) => rect.left));
    const right = Math.max(...boxes.map((rect) => rect.right));
    const top = Math.min(...boxes.map((rect) => rect.top));
    const bottom = Math.max(...boxes.map((rect) => rect.bottom));

    const worldLeft = (left - worldRect.left - viewport.x) / viewport.scale;
    const worldRight = (right - worldRect.left - viewport.x) / viewport.scale;
    const worldTop = (top - worldRect.top - viewport.y) / viewport.scale;
    const worldBottom = (bottom - worldRect.top - viewport.y) / viewport.scale;

    const worldWidth = Math.max(1, worldRight - worldLeft);
    const worldHeight = Math.max(1, worldBottom - worldTop);
    const worldCenterX = (worldLeft + worldRight) / 2;
    const worldCenterY = (worldTop + worldBottom) / 2;

    const fitRatio = Math.max(0.01, Math.min(1, focusRequest.fitPercent / 100));
    const targetScale = Math.min(
      MAX_ZOOM,
      Math.max(
        MIN_ZOOM,
        Math.min(
          (measuredCanvasSize.width * fitRatio) / worldWidth,
          (measuredCanvasSize.height * fitRatio) / worldHeight,
        ),
      ),
    );

    const targetViewport: CanvasViewport = {
      x: measuredCanvasSize.width / 2 - worldCenterX * targetScale,
      y: measuredCanvasSize.height / 2 - worldCenterY * targetScale,
      scale: targetScale,
    };

    if (focusAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(focusAnimationFrameRef.current);
      focusAnimationFrameRef.current = null;
    }

    const lerpFactor = 0.18;
    const snapThreshold = 0.35;

    const animate = () => {
      updateViewport((current) => {
        const nextX = current.x + (targetViewport.x - current.x) * lerpFactor;
        const nextY = current.y + (targetViewport.y - current.y) * lerpFactor;
        const nextScale =
          current.scale + (targetViewport.scale - current.scale) * lerpFactor;

        const delta =
          Math.abs(targetViewport.x - nextX) +
          Math.abs(targetViewport.y - nextY) +
          Math.abs(targetViewport.scale - nextScale) * 100;

        if (delta < snapThreshold) {
          focusAnimationFrameRef.current = null;
          return targetViewport;
        }

        focusAnimationFrameRef.current = window.requestAnimationFrame(animate);
        return { x: nextX, y: nextY, scale: nextScale };
      });
    };

    focusAnimationFrameRef.current = window.requestAnimationFrame(animate);
  }, [
    focusRequest,
    measuredCanvasSize.height,
    measuredCanvasSize.width,
    viewport.scale,
    viewport.x,
    viewport.y,
  ]);

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

  const updateSelectedEdges = (
    updater: (edge: CanvasEdge) => CanvasEdge,
    options?: UpdateSelectedNodesOptions,
  ) => {
    commitEdges(
      (currentEdges) =>
        currentEdges.map((currentEdge) =>
          activeEdgeIds.includes(currentEdge.id)
            ? updater(currentEdge)
            : currentEdge,
        ),
      options,
    );
  };

  const updateBoxNode = (
    nodeId: string,
    updater: (node: BoxNode) => BoxNode,
    options?: { commitHistory?: boolean },
  ) => {
    commitNodes(
      (currentNodes) =>
        currentNodes.map((currentNode) => {
          if (currentNode.id !== nodeId || currentNode.type !== "box") {
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
    setActiveEdgeIds([]);
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

    if (activeToolId === "arrow" && edgeDragPointerIdRef.current !== null) {
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
    } else if (activeToolId === "arrow") {
      if (pendingEdgeSourceNodeIdRef.current) {
        setEdgeDraftTarget(position);
      } else {
        setActiveNodeIds([]);
        setActiveEdgeIds([]);
      }
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

    if (!pointerStartRef.current) {
      return;
    }

    if (
      activeToolId === "arrow" &&
      edgeDragPointerIdRef.current === event.pointerId &&
      edgeDragSourceNodeIdRef.current
    ) {
      const position = getCanvasPosition(event);
      setEdgeDraftTarget(position);
      const hit = getClosestPortHit(position, {
        excludeNodeId: edgeDragSourceNodeIdRef.current,
        maxDistance: 28,
      });
      if (!hit) {
        setEdgeDraftHoverNodeId(null);
        setEdgeDraftHoverAnchor(null);
        return;
      }

      setEdgeDraftHoverNodeId(hit.nodeId);
      setEdgeDraftHoverAnchor(hit.anchor);
      return;
    }

    if (activeToolId === "arrow" && pendingEdgeSourceNodeIdRef.current) {
      const position = getCanvasPosition(event);
      setEdgeDraftTarget(position);
      return;
    }

    if (activeToolId !== "select") {
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

    if (
      activeToolId === "arrow" &&
      edgeDragPointerIdRef.current === event.pointerId &&
      edgeDragSourceNodeIdRef.current
    ) {
      const sourceNodeId = edgeDragSourceNodeIdRef.current;
      const end = getCanvasPosition(event);
      const hit = getClosestPortHit(end, {
        excludeNodeId: sourceNodeId,
        maxDistance: 28,
      });
      const targetNodeId = hit?.nodeId ?? null;

      if (targetNodeId && targetNodeId !== sourceNodeId) {
        const nextEdge = {
          ...createEdge(sourceNodeId, targetNodeId),
          sourceAnchor: edgeDragSourceAnchorRef.current ?? "auto",
          targetAnchor:
            hit?.anchor ?? edgeDraftHoverAnchor ?? edgeDraftTargetAnchor ?? "auto",
        };
        commitEdges((currentEdges) => [...currentEdges, nextEdge]);
        setActiveNodeIds([]);
        setActiveEdgeIds([nextEdge.id]);
      }

      edgeDragPointerIdRef.current = null;
      edgeDragSourceNodeIdRef.current = null;
      edgeDragSourceAnchorRef.current = null;
      pendingEdgeSourceNodeIdRef.current = null;
      setEdgeDraftTarget(null);
      setEdgeDraftTargetAnchor(null);
      setEdgeDraftHoverNodeId(null);
      setEdgeDraftHoverAnchor(null);
      pointerStartRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
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
    } else if (activeToolId === "arrow") {
      if (!pendingEdgeSourceNodeIdRef.current) {
        setActiveNodeIds([]);
        setActiveEdgeIds([]);
        setEdgeDraftTargetAnchor(null);
      }
      setEdgeDraftTarget(pendingEdgeSourceNodeIdRef.current ? end : null);
      if (!pendingEdgeSourceNodeIdRef.current) {
        setEdgeDraftHoverNodeId(null);
        setEdgeDraftHoverAnchor(null);
      }
    } else if (distance < DRAG_THRESHOLD) {
      onClickBackground(end);
    }

    pointerStartRef.current = null;
    setSelectionRect(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleCanvasWheel = (event: WheelEvent) => {
    if (!containerRef.current) {
      return;
    }

    if (event.shiftKey) {
      event.preventDefault();
      const shiftWheelDelta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
      onShiftWheel?.(shiftWheelDelta);
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

  useEffect(() => {
    const element = containerRef.current;
    if (!element || viewOnly) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      handleCanvasWheel(event);
    };

    element.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      element.removeEventListener("wheel", onWheel);
    };
  }, [viewOnly, onShiftWheel]);

  const toggleNodeSelection = (nodeId: string) => {
    setActiveNodeIds(
      activeNodeIds.includes(nodeId)
        ? activeNodeIds.filter((id) => id !== nodeId)
        : [...activeNodeIds, nodeId],
    );
    setActiveEdgeIds([]);
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

    if (activeToolId === "arrow") {
      event.stopPropagation();

      const sourceNodeId = pendingEdgeSourceNodeIdRef.current;
      if (!sourceNodeId) {
        pendingEdgeSourceNodeIdRef.current = node.id;
        setActiveNodeIds([node.id]);
        setActiveEdgeIds([]);
        return;
      }

      if (sourceNodeId === node.id) {
        pendingEdgeSourceNodeIdRef.current = null;
        edgeDragSourceAnchorRef.current = null;
        setEdgeDraftTarget(null);
        setEdgeDraftTargetAnchor(null);
        return;
      }

      const sourceNode = nodes.find((item) => item.id === sourceNodeId);
      const sourceAnchor = edgeDragSourceAnchorRef.current ?? "auto";
      const targetAnchor =
        sourceNode && sourceAnchor !== "auto"
          ? resolveClosestAnchor(node, getNodePortPosition(sourceNode, sourceAnchor))
          : "auto";
      const nextEdge = {
        ...createEdge(sourceNodeId, node.id),
        sourceAnchor,
        targetAnchor,
      };
      commitEdges((currentEdges) => [...currentEdges, nextEdge]);
      pendingEdgeSourceNodeIdRef.current = null;
      edgeDragSourceAnchorRef.current = null;
      setEdgeDraftTarget(null);
      setEdgeDraftTargetAnchor(null);
      setEdgeDraftHoverNodeId(null);
      setEdgeDraftHoverAnchor(null);
      setActiveNodeIds([]);
      setActiveEdgeIds([nextEdge.id]);
      return;
    }

    event.stopPropagation();

    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      toggleNodeSelection(node.id);
      setActiveEdgeIds([]);
      return;
    }

    if (!activeNodeIds.includes(node.id)) {
      setActiveNodeIds([node.id]);
      setActiveEdgeIds([]);
    }
  };

  const handleEdgePointerDown = (
    event: React.PointerEvent<SVGPathElement>,
    edge: CanvasEdge,
  ) => {
    if (viewOnly || activeToolId !== "select") {
      return;
    }

    event.stopPropagation();

    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      setActiveEdgeIds(
        activeEdgeIds.includes(edge.id)
          ? activeEdgeIds.filter((id) => id !== edge.id)
          : [...activeEdgeIds, edge.id],
      );
      return;
    }

    setActiveNodeIds([]);
    setActiveEdgeIds([edge.id]);
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
        additionalSnapNodes,
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

  const previewOffsetByNodeId = dragPreview
    ? Object.fromEntries(
        dragPreview.nodeIds.map((nodeId) => [nodeId, dragPreview.offset]),
      )
    : undefined;

  useLayoutEffect(() => {
    if (!containerRef.current) {
      setMeasuredTextBoundsByNodeId({});
      return;
    }

    const nextBounds: Record<string, MeasuredTextBounds> = {};

    nodes.forEach((node) => {
      if (node.type !== "text") {
        return;
      }

      const element = nodeRefs.current[node.id];
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      nextBounds[node.id] = {
        key: getTextMeasurementKey(node),
        width: rect.width / viewport.scale,
        height: rect.height / viewport.scale,
      };
    });

    setMeasuredTextBoundsByNodeId(nextBounds);
  }, [nodes, viewport.scale, viewport.x, viewport.y]);

  const getMeasuredTextBounds = (node: TextNode) => {
    const measuredBounds = measuredTextBoundsByNodeId[node.id];
    if (!measuredBounds) {
      return undefined;
    }

    return measuredBounds.key === getTextMeasurementKey(node)
      ? measuredBounds
      : undefined;
  };

  const getNodeCenterForHandle = (node: CanvasNode) => {
    if (node.type === "box") {
      return {
        x: node.position.x + node.size.width / 2,
        y: node.position.y + node.size.height / 2,
      };
    }

    return {
      x: node.position.x,
      y: node.position.y,
    };
  };

  const getNodePortPosition = (node: CanvasNode, anchor: EdgeAnchor): Position => {
    const scale = Math.max(0.01, node.scale);

    if (node.type === "box") {
      const centerX = node.position.x + node.size.width / 2;
      const centerY = node.position.y + node.size.height / 2;
      const width = node.size.width * scale;
      const height = node.size.height * scale;
      const x = centerX - width / 2;
      const y = centerY - height / 2;
      const cx = x + width / 2;
      const cy = y + height / 2;

      switch (anchor) {
        case "left":
          return { x, y: cy };
        case "right":
          return { x: x + width, y: cy };
        case "top":
          return { x: cx, y };
        case "bottom":
          return { x: cx, y: y + height };
        case "auto":
          return { x: cx, y: cy };
      }
    }

    const measuredBounds = getMeasuredTextBounds(node);
    if (measuredBounds) {
      const center = getNodeCenterForHandle(node);
      const halfWidth = measuredBounds.width / 2;
      const halfHeight = measuredBounds.height / 2;

      switch (anchor) {
        case "left":
          return { x: center.x - halfWidth, y: center.y };
        case "right":
          return { x: center.x + halfWidth, y: center.y };
        case "top":
          return { x: center.x, y: center.y - halfHeight };
        case "bottom":
          return { x: center.x, y: center.y + halfHeight };
        case "auto":
          return center;
      }
    }

    const center = getNodeCenterForHandle(node);
    const halfWidth =
      Math.max(60, node.typography.fontSize * 1.25 + node.paddingX) * scale;
    const halfHeight = Math.max(
      18,
      ((node.typography.fontSize * node.typography.lineHeight + node.paddingY * 2) /
        2) *
        scale,
    );

    switch (anchor) {
      case "left":
        return { x: center.x - halfWidth, y: center.y };
      case "right":
        return { x: center.x + halfWidth, y: center.y };
      case "top":
        return { x: center.x, y: center.y - halfHeight };
      case "bottom":
        return { x: center.x, y: center.y + halfHeight };
      case "auto":
        return center;
    }
  };

  const getClosestPortHit = (
    position: Position,
    options?: { excludeNodeId?: string; maxDistance?: number },
  ) => {
    const anchors: EdgeAnchor[] = ["top", "right", "bottom", "left"];
    let bestNodeId: string | null = null;
    let bestAnchor: EdgeAnchor = "top";
    let bestDistance = Number.POSITIVE_INFINITY;

    nodes.forEach((node) => {
      if (options?.excludeNodeId && node.id === options.excludeNodeId) {
        return;
      }

      anchors.forEach((anchor) => {
        const point = getNodePortPosition(node, anchor);
        const distance = Math.hypot(position.x - point.x, position.y - point.y);
        if (distance < bestDistance) {
          bestNodeId = node.id;
          bestAnchor = anchor;
          bestDistance = distance;
        }
      });
    });

    if (!bestNodeId) {
      return null;
    }

    if (
      typeof options?.maxDistance === "number" &&
      bestDistance > options.maxDistance
    ) {
      return null;
    }

    return {
      nodeId: bestNodeId,
      anchor: bestAnchor,
      distance: bestDistance,
    };
  };

  const resolveClosestAnchor = (node: CanvasNode, position: Position): EdgeAnchor => {
    const anchors: EdgeAnchor[] = ["top", "right", "bottom", "left"];
    const nearest = anchors.reduce(
      (best, anchor) => {
        const point = getNodePortPosition(node, anchor);
        const distance = Math.hypot(position.x - point.x, position.y - point.y);
        if (distance < best.distance) {
          return { anchor, distance };
        }
        return best;
      },
      { anchor: "top" as EdgeAnchor, distance: Number.POSITIVE_INFINITY },
    );

    return nearest.anchor;
  };

  const handleEdgeDragHandlePointerDown = (
    event: React.PointerEvent<SVGCircleElement>,
    sourceNodeId: string,
    sourceAnchor: EdgeAnchor,
  ) => {
    if (viewOnly || activeToolId !== "arrow") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const start = getCanvasPositionFromClient(event.clientX, event.clientY);
    edgeDragPointerIdRef.current = event.pointerId;
    edgeDragSourceNodeIdRef.current = sourceNodeId;
    edgeDragSourceAnchorRef.current = sourceAnchor;
    pendingEdgeSourceNodeIdRef.current = sourceNodeId;
    setEdgeDraftTargetAnchor(sourceAnchor);
    setEdgeDraftHoverNodeId(null);
    setEdgeDraftHoverAnchor(null);
    setEdgeDraftTarget(start);
    pointerStartRef.current = start;
    containerRef.current?.setPointerCapture(event.pointerId);
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
      onPointerDown={viewOnly ? undefined : handleBackgroundPointerDown}
      onPointerMove={viewOnly ? undefined : handleBackgroundPointerMove}
      onPointerUp={viewOnly ? undefined : handleBackgroundPointerUp}
    >
      {showControls ? (
        <SelectedNodeControls
          nodes={selectedNodes}
          edges={edges.filter((edge) => activeEdgeIds.includes(edge.id))}
          updateSelectedNodes={updateSelectedNodes}
          updateSelectedEdges={updateSelectedEdges}
          canvasSize={measuredCanvasSize}
          viewport={toCanvasViewportState(viewport)}
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
        <CanvasEdgeLayer
          nodes={nodes}
          edges={edges}
          activeEdgeIds={activeEdgeIds}
          previewOffsetByNodeId={previewOffsetByNodeId}
          measuredTextSizeByNodeId={measuredTextBoundsByNodeId}
          isPreviewing={dragPreview !== null}
          entranceEdgeIds={entranceEdgeIds}
          entranceRun={edgeEntranceRun}
          onEdgePointerDown={handleEdgePointerDown}
        />
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
            onRectNodeChange={updateBoxNode}
            onTextNodeChange={updateTextNode}
            onPointerDown={handleNodePointerDown}
            onDoubleClick={onNodeDoubleClick}
            onDragStart={handleNodeDragStart}
            onDrag={handleNodeDrag}
            onDragEnd={handleNodeDragEnd}
          />
        ))}
        {activeToolId === "arrow" ? (
          <svg
            className="absolute inset-0 overflow-visible"
            width="100%"
            height="100%"
          >
            {nodes.flatMap((node) => {
              const anchors: EdgeAnchor[] = ["top", "right", "bottom", "left"];

              return anchors.map((anchor) => {
                const point = getNodePortPosition(node, anchor);
                const isActiveHandle =
                  pendingEdgeSourceNodeIdRef.current === node.id &&
                  edgeDragSourceAnchorRef.current === anchor;
                const isHoverHandle =
                  edgeDraftHoverNodeId === node.id && edgeDraftHoverAnchor === anchor;

                return (
                  <circle
                    key={`edge-handle-${node.id}-${anchor}`}
                    cx={point.x}
                    cy={point.y}
                    r={isActiveHandle || isHoverHandle ? 7 : 5.25}
                    fill={
                      isActiveHandle
                        ? "rgba(255,190,92,0.85)"
                        : isHoverHandle
                          ? "rgba(157,255,174,0.85)"
                          : "rgba(255,255,255,0.22)"
                    }
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth={1.25}
                    className="cursor-crosshair"
                    onPointerDown={(event) =>
                      handleEdgeDragHandlePointerDown(event, node.id, anchor)
                    }
                  />
                );
              });
            })}
          </svg>
        ) : null}
        {activeToolId === "arrow" &&
        pendingEdgeSourceNodeIdRef.current &&
        edgeDraftTarget ? (
          <svg
            className="pointer-events-none absolute inset-0 overflow-visible"
            width="100%"
            height="100%"
          >
            {(() => {
              const sourceNode = nodes.find(
                (node) => node.id === pendingEdgeSourceNodeIdRef.current,
              );
              if (!sourceNode) {
                return null;
              }

              const sourcePoint =
                edgeDragSourceAnchorRef.current &&
                edgeDragSourceAnchorRef.current !== "auto"
                  ? getNodePortPosition(sourceNode, edgeDragSourceAnchorRef.current)
                  : getNodeCenterForHandle(sourceNode);

              const targetPoint = edgeDraftHoverNodeId
                ? (() => {
                    const hoverNode = nodes.find(
                      (node) => node.id === edgeDraftHoverNodeId,
                    );
                    if (!hoverNode || !edgeDraftHoverAnchor) {
                      return edgeDraftTarget;
                    }

                    return getNodePortPosition(hoverNode, edgeDraftHoverAnchor);
                  })()
                : edgeDraftTarget;

              const targetNodeHighlight =
                edgeDraftHoverNodeId && edgeDraftHoverAnchor
                  ? (() => {
                      const hoverNode = nodes.find(
                        (node) => node.id === edgeDraftHoverNodeId,
                      );
                      if (!hoverNode) {
                        return null;
                      }

                      const point = getNodePortPosition(hoverNode, edgeDraftHoverAnchor);
                      return (
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={7.5}
                          fill="rgba(157,255,174,0.9)"
                          stroke="rgba(255,255,255,0.95)"
                          strokeWidth={1.5}
                        />
                      );
                    })()
                  : null;

              return (
                <>
                  <path
                    d={`M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                  {targetNodeHighlight}
                </>
              );
            })()}
          </svg>
        ) : null}
        {viewOnly ? null : <SelectionOverlay selectionRect={selectionRect} />}
      </div>
      {dragPreview?.guides?.x !== undefined ? (
        <div
          className="pointer-events-none absolute top-0 bottom-0 border-l border-dashed border-purple-400/80"
          style={{ left: viewport.x + dragPreview.guides.x * viewport.scale }}
        />
      ) : null}
      {dragPreview?.guides?.y !== undefined ? (
        <div
          className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-purple-400/80"
          style={{ top: viewport.y + dragPreview.guides.y * viewport.scale }}
        />
      ) : null}
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
