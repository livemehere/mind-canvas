import { motion } from "motion/react";
import {
  type CanvasEdge,
  type CanvasNode,
  type EdgeAnchor,
  type EdgeRoute,
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

const getStraightPath = (source: Position, target: Position) =>
  `M ${source.x} ${source.y} L ${target.x} ${target.y}`;

const getElbowPath = (source: Position, target: Position) => {
  const midX = (source.x + target.x) / 2;
  return `M ${source.x} ${source.y} L ${midX} ${source.y} L ${midX} ${target.y} L ${target.x} ${target.y}`;
};

const getEdgePath = (
  source: Position,
  target: Position,
  route: EdgeRoute,
  curve: number,
) => {
  if (route === "straight") {
    return getStraightPath(source, target);
  }

  if (route === "elbow") {
    return getElbowPath(source, target);
  }

  return getCurvePath(source, target, curve);
};

const getTargetAnchorAngle = (anchor: Exclude<EdgeAnchor, "auto">) => {
  switch (anchor) {
    case "left":
      return 0;
    case "right":
      return 180;
    case "top":
      return 90;
    case "bottom":
      return -90;
  }
};

const getSourceAnchorAngle = (anchor: Exclude<EdgeAnchor, "auto">) => {
  switch (anchor) {
    case "left":
      return 180;
    case "right":
      return 0;
    case "top":
      return -90;
    case "bottom":
      return 90;
  }
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
      const d = getEdgePath(
        sourcePoint,
        targetPoint,
        edge.route ?? "curve",
        edge.curve,
      );
      const targetAngle = getTargetAnchorAngle(targetAnchor);
      const sourceAngle = getSourceAnchorAngle(sourceAnchor);

      return {
        edge,
        d,
        sourcePoint,
        targetPoint,
        sourceAngle,
        targetAngle,
      };
    })
    .filter(
      (
        value,
      ): value is {
        edge: CanvasEdge;
        d: string;
        sourcePoint: Position;
        targetPoint: Position;
        sourceAngle: number;
        targetAngle: number;
      } => value !== null,
    )
    .sort((a, b) => a.edge.zIndex - b.edge.zIndex);

  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      width="100%"
      height="100%"
    >
      {renderedEdges.map(
        ({ edge, d, sourcePoint, targetPoint, sourceAngle, targetAngle }) => {
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
        const drawTransition = { duration: 0.38, ease: "easeOut" as const };
        const transition = shouldPlayEntrance
          ? edge.entranceAnimation === "draw"
            ? drawTransition
            : getEntranceTransition("fade")
          : getEntityTransition(edge.transition, isSelected, isPreviewing);
        const arrowDelay = shouldPlayEntrance
          ? edge.entranceAnimation === "draw"
            ? drawTransition.duration
            : 0.22
          : 0;
        const arrowOpacityTarget = edge.opacity;
        const highlightStroke = isSelected ? Math.max(edge.width + 4, 8) : edge.width;
        const highlightColor = isSelected ? "#ffbe5c" : edge.color;

        return (
          <g key={shouldPlayEntrance ? `${edge.id}:entrance:${entranceRun}` : edge.id}>
            <motion.path
              d={d}
              initial={initial}
              animate={animateTarget}
              transition={transition}
              fill="none"
              stroke={highlightColor}
              strokeWidth={highlightStroke}
              strokeDasharray={edge.dashed ? "8 6" : undefined}
            />
            {edge.arrowStart ? (
              <motion.path
                d="M0,0 L13,6.5 L0,13 z"
                initial={
                  shouldPlayEntrance
                    ? {
                        x: sourcePoint.x - 13,
                        y: sourcePoint.y - 6.5,
                        rotate: sourceAngle,
                        opacity: 0,
                      }
                    : false
                }
                animate={{
                  x: sourcePoint.x - 13,
                  y: sourcePoint.y - 6.5,
                  rotate: sourceAngle,
                  opacity: arrowOpacityTarget,
                }}
                transition={{ ...transition, delay: arrowDelay }}
                fill={highlightColor}
                style={{ transformOrigin: "13px 6.5px" }}
              />
            ) : null}
            {edge.arrowEnd ? (
              <motion.path
                d="M0,0 L13,6.5 L0,13 z"
                initial={
                  shouldPlayEntrance
                    ? {
                        x: targetPoint.x - 13,
                        y: targetPoint.y - 6.5,
                        rotate: targetAngle,
                        opacity: 0,
                      }
                    : false
                }
                animate={{
                  x: targetPoint.x - 13,
                  y: targetPoint.y - 6.5,
                  rotate: targetAngle,
                  opacity: arrowOpacityTarget,
                }}
                transition={{ ...transition, delay: arrowDelay }}
                fill={highlightColor}
                style={{ transformOrigin: "13px 6.5px" }}
              />
            ) : null}
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
        },
      )}
    </svg>
  );
}
