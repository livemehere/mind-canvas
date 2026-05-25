import { motion } from "motion/react";
import {
  type CanvasEdge,
  type CanvasNode,
  type EdgeAnchor,
  type Position,
} from "../../core/nodes";
import {
  getEntityTransition,
  getEntranceTransition,
} from "../../features/styles/helpers";

interface Props {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  activeEdgeIds: string[];
  previewOffsetByNodeId?: Record<string, Position>;
  isPreviewing?: boolean;
  entranceEdgeIds?: string[];
  entranceRun?: number;
  onEdgePointerDown?: (
    event: React.PointerEvent<SVGPathElement>,
    edge: CanvasEdge,
  ) => void;
}

const getNodeBounds = (
  node: CanvasNode,
  offset: Position | undefined,
): { left: number; right: number; top: number; bottom: number } => {
  const x = node.position.x + (offset?.x ?? 0);
  const y = node.position.y + (offset?.y ?? 0);

  if (node.type === "rect") {
    return {
      left: x,
      right: x + node.size.width,
      top: y,
      bottom: y + node.size.height,
    };
  }

  const width = Math.max(120, node.typography.fontSize * 2.5 + node.paddingX * 2);
  const height = Math.max(
    node.typography.fontSize * node.typography.lineHeight + node.paddingY * 2,
    32,
  );
  return {
    left: x - width / 2,
    right: x + width / 2,
    top: y - height / 2,
    bottom: y + height / 2,
  };
};

const getCenter = (bounds: {
  left: number;
  right: number;
  top: number;
  bottom: number;
}) => ({
  x: (bounds.left + bounds.right) / 2,
  y: (bounds.top + bounds.bottom) / 2,
});

const resolveAutoAnchor = (
  from: ReturnType<typeof getCenter>,
  to: ReturnType<typeof getCenter>,
): Exclude<EdgeAnchor, "auto"> => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }

  return dy >= 0 ? "bottom" : "top";
};

const getAnchorPoint = (
  bounds: { left: number; right: number; top: number; bottom: number },
  anchor: Exclude<EdgeAnchor, "auto">,
) => {
  const center = getCenter(bounds);

  switch (anchor) {
    case "left":
      return { x: bounds.left, y: center.y };
    case "right":
      return { x: bounds.right, y: center.y };
    case "top":
      return { x: center.x, y: bounds.top };
    case "bottom":
      return { x: center.x, y: bounds.bottom };
  }
};

const getCurvePath = (
  source: Position,
  target: Position,
  curve: number,
) => {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy);
  const bend = Math.max(24, distance * Math.max(0, Math.min(1, curve)));

  const useHorizontal = Math.abs(dx) >= Math.abs(dy);
  const c1 = useHorizontal
    ? { x: source.x + Math.sign(dx || 1) * bend, y: source.y }
    : { x: source.x, y: source.y + Math.sign(dy || 1) * bend };
  const c2 = useHorizontal
    ? { x: target.x - Math.sign(dx || 1) * bend, y: target.y }
    : { x: target.x, y: target.y - Math.sign(dy || 1) * bend };

  return `M ${source.x} ${source.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${target.x} ${target.y}`;
};

export function CanvasEdgeLayer({
  nodes,
  edges,
  activeEdgeIds,
  previewOffsetByNodeId,
  isPreviewing = false,
  entranceEdgeIds = [],
  entranceRun = 0,
  onEdgePointerDown,
}: Props) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node] as const));

  const renderedEdges = edges
    .map((edge) => {
      const sourceNode = nodeMap.get(edge.sourceNodeId);
      const targetNode = nodeMap.get(edge.targetNodeId);
      if (!sourceNode || !targetNode) {
        return null;
      }

      const sourceBounds = getNodeBounds(
        sourceNode,
        previewOffsetByNodeId?.[sourceNode.id],
      );
      const targetBounds = getNodeBounds(
        targetNode,
        previewOffsetByNodeId?.[targetNode.id],
      );

      const sourceCenter = getCenter(sourceBounds);
      const targetCenter = getCenter(targetBounds);
      const sourceAnchor =
        edge.sourceAnchor === "auto"
          ? resolveAutoAnchor(sourceCenter, targetCenter)
          : edge.sourceAnchor;
      const targetAnchor =
        edge.targetAnchor === "auto"
          ? resolveAutoAnchor(targetCenter, sourceCenter)
          : edge.targetAnchor;

      const sourcePoint = getAnchorPoint(sourceBounds, sourceAnchor);
      const targetPoint = getAnchorPoint(targetBounds, targetAnchor);
      const d = getCurvePath(sourcePoint, targetPoint, edge.curve);

      return {
        edge,
        d,
      };
    })
    .filter((value): value is { edge: CanvasEdge; d: string } => value !== null)
    .sort((a, b) => a.edge.zIndex - b.edge.zIndex);

  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      width="100%"
      height="100%"
    >
      <defs>
        {renderedEdges.map(({ edge }) => (
          <marker
            key={`arrow-end-${edge.id}`}
            id={`arrow-end-${edge.id}`}
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={edge.color} />
          </marker>
        ))}
      </defs>
      {renderedEdges.map(({ edge, d }) => {
        const isSelected = activeEdgeIds.includes(edge.id);
        const animateTarget = {
          d,
          opacity: edge.opacity,
          pathLength: 1,
        };
        const shouldPlayEntrance = entranceEdgeIds.includes(edge.id);
        const initial = shouldPlayEntrance
          ? edge.entranceAnimation === "draw"
            ? { d, opacity: 0, pathLength: 0 }
            : edge.entranceAnimation === "fade"
              ? { d, opacity: 0, pathLength: 1 }
              : false
          : false;
        const transition =
          shouldPlayEntrance && edge.entranceAnimation !== "draw"
            ? getEntranceTransition("fade")
            : getEntityTransition(edge.transition, isSelected, isPreviewing);

        return (
          <g key={shouldPlayEntrance ? `${edge.id}:entrance:${entranceRun}` : edge.id}>
            <motion.path
              d={d}
              initial={initial}
              animate={animateTarget}
              transition={transition}
              fill="none"
              stroke={edge.color}
              strokeWidth={edge.width}
              strokeDasharray={edge.dashed ? "8 6" : undefined}
              markerEnd={
                edge.arrowEnd ? `url(#arrow-end-${edge.id})` : undefined
              }
              markerStart={
                edge.arrowStart ? `url(#arrow-end-${edge.id})` : undefined
              }
              style={{
                filter: isSelected ? "drop-shadow(0 0 5px rgba(152,16,250,0.75))" : undefined,
              }}
            />
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth={Math.max(edge.width + 12, 16)}
              className="pointer-events-auto"
              onPointerDown={(event) => onEdgePointerDown?.(event, edge)}
            />
          </g>
        );
      })}
    </svg>
  );
}
