import { motion } from "motion/react";
import { useMemo, useRef } from "react";
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
  measuredBoundsByNodeId?: Record<
    string,
    { left: number; right: number; top: number; bottom: number }
  >;
  isPreviewing?: boolean;
  entranceEdgeIds?: string[];
  entranceRun?: number;
  onEdgePointerDown?: (
    event: React.PointerEvent<SVGPathElement>,
    edge: CanvasEdge,
  ) => void;
}

const ARROW_LENGTH = 13;
const ARROW_HALF_WIDTH = 6.5;
const TEXT_EDGE_GUTTER = 10;

const getNodeBounds = (
  node: CanvasNode,
  offset: Position | undefined,
  measuredBounds?: { left: number; right: number; top: number; bottom: number },
): { left: number; right: number; top: number; bottom: number } => {
  if (node.type === "text" && measuredBounds && !offset) {
    return measuredBounds;
  }

  const x = node.position.x + (offset?.x ?? 0);
  const y = node.position.y + (offset?.y ?? 0);
  const scale = Math.max(0.01, node.scale);

  if (node.type === "box") {
    const centerX = x + node.size.width / 2;
    const centerY = y + node.size.height / 2;
    const halfWidth = (node.size.width * scale) / 2;
    const halfHeight = (node.size.height * scale) / 2;

    return {
      left: centerX - halfWidth,
      right: centerX + halfWidth,
      top: centerY - halfHeight,
      bottom: centerY + halfHeight,
    };
  }

  const width =
    Math.max(
      120,
      Math.max(
        ...node.text
          .split("\n")
          .map(
            (line) =>
              line.length *
              (node.typography.fontSize * 0.58 + node.typography.letterSpacing),
          ),
      ) +
        node.paddingX * 2,
    ) * scale;
  const height =
    Math.max(
      node.text.split("\n").length *
        (node.typography.fontSize * node.typography.lineHeight) +
        node.paddingY * 2,
      32,
    ) * scale;
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
  options?: { outward?: number },
) => {
  const center = getCenter(bounds);
  const outward = options?.outward ?? 0;

  switch (anchor) {
    case "left":
      return { x: bounds.left - outward, y: center.y };
    case "right":
      return { x: bounds.right + outward, y: center.y };
    case "top":
      return { x: center.x, y: bounds.top - outward };
    case "bottom":
      return { x: center.x, y: bounds.bottom + outward };
  }
};

const getAnchorNormal = (anchor: Exclude<EdgeAnchor, "auto">): Position => {
  switch (anchor) {
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
    case "top":
      return { x: 0, y: -1 };
    case "bottom":
      return { x: 0, y: 1 };
  }
};

const toAngle = (vector: Position) =>
  (Math.atan2(vector.y, vector.x) * 180) / Math.PI;

const directionFromAngle = (angle: number): Position => {
  const radians = (angle * Math.PI) / 180;
  return { x: Math.cos(radians), y: Math.sin(radians) };
};

const normalize = (vector: Position): Position => {
  const length = Math.hypot(vector.x, vector.y);
  if (length < 0.0001) {
    return { x: 1, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
};

const add = (a: Position, b: Position): Position => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Position, b: Position): Position => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (v: Position, scalar: number): Position => ({
  x: v.x * scalar,
  y: v.y * scalar,
});

const getArrowPath = (
  tip: Position,
  angle: number,
  size = ARROW_LENGTH,
  halfWidth = ARROW_HALF_WIDTH,
) => {
  const radians = (angle * Math.PI) / 180;
  const dir = { x: Math.cos(radians), y: Math.sin(radians) };
  const perp = { x: -dir.y, y: dir.x };
  const back = sub(tip, mul(dir, size));
  const left = add(back, mul(perp, halfWidth));
  const right = sub(back, mul(perp, halfWidth));

  return `M ${tip.x} ${tip.y} L ${left.x} ${left.y} L ${right.x} ${right.y} Z`;
};

const getCurvePathGeometry = (
  source: Position,
  target: Position,
  sourceAnchor: Exclude<EdgeAnchor, "auto">,
  targetAnchor: Exclude<EdgeAnchor, "auto">,
  curve: number,
) => {
  const distance = Math.hypot(target.x - source.x, target.y - source.y);
  const curveFactor = Math.max(0.08, Math.min(1, curve));
  const handleLength = Math.max(22, Math.min(220, distance * curveFactor));
  const sourceDir = getAnchorNormal(sourceAnchor);
  const targetNormal = getAnchorNormal(targetAnchor);
  const endDir = mul(targetNormal, -1);
  const c1 = add(source, mul(sourceDir, handleLength));
  const c2 = sub(target, mul(endDir, handleLength));

  const d = `M ${source.x} ${source.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${target.x} ${target.y}`;
  const sourceAngle = toAngle(sourceDir);
  const targetAngle = toAngle(sub(target, c2));

  return { d, sourceAngle, targetAngle };
};

const getStraightPathGeometry = (source: Position, target: Position) => {
  const d = `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
  const vector = normalize(sub(target, source));
  const angle = toAngle(vector);

  return {
    d,
    sourceAngle: angle,
    targetAngle: angle,
  };
};

const getElbowPathGeometry = (
  source: Position,
  target: Position,
  sourceAnchor: Exclude<EdgeAnchor, "auto">,
  targetAnchor: Exclude<EdgeAnchor, "auto">,
) => {
  const sourceNormal = getAnchorNormal(sourceAnchor);
  const targetNormal = getAnchorNormal(targetAnchor);
  const endDir = mul(targetNormal, -1);
  const distance = Math.hypot(target.x - source.x, target.y - source.y);
  const offset = Math.max(20, Math.min(72, distance * 0.25));

  const sourceOut = add(source, mul(sourceNormal, offset));
  const targetIn = sub(target, mul(endDir, offset));

  const firstHorizontal = Math.abs(sourceNormal.x) > Math.abs(sourceNormal.y);
  const bend = firstHorizontal
    ? { x: targetIn.x, y: sourceOut.y }
    : { x: sourceOut.x, y: targetIn.y };

  const d = `M ${source.x} ${source.y} L ${sourceOut.x} ${sourceOut.y} L ${bend.x} ${bend.y} L ${targetIn.x} ${targetIn.y} L ${target.x} ${target.y}`;
  const sourceAngle = toAngle(sub(sourceOut, source));
  const targetAngle = toAngle(sub(target, targetIn));

  return {
    d,
    sourceAngle,
    targetAngle,
  };
};

const getEdgePathGeometry = (
  source: Position,
  target: Position,
  sourceAnchor: Exclude<EdgeAnchor, "auto">,
  targetAnchor: Exclude<EdgeAnchor, "auto">,
  route: EdgeRoute,
  curve: number,
) => {
  if (route === "straight") {
    return getStraightPathGeometry(source, target);
  }

  if (route === "elbow") {
    return getElbowPathGeometry(source, target, sourceAnchor, targetAnchor);
  }

  return getCurvePathGeometry(source, target, sourceAnchor, targetAnchor, curve);
};

export function CanvasEdgeLayer({
  nodes,
  edges,
  activeEdgeIds,
  previewOffsetByNodeId,
  measuredBoundsByNodeId,
  isPreviewing = false,
  entranceEdgeIds = [],
  entranceRun = 0,
  onEdgePointerDown,
}: Props) {
  const edgeRenderRunRef = useRef<Record<string, number>>({});
  const nodeMap = new Map(nodes.map((node) => [node.id, node] as const));

  const edgeKeyRunById = useMemo(() => {
    const nextRuns: Record<string, number> = {};

    edges.forEach((edge) => {
      const previousRun = edgeRenderRunRef.current[edge.id] ?? 0;
      const shouldPlayEntrance = entranceEdgeIds.includes(edge.id);
      nextRuns[edge.id] = shouldPlayEntrance ? entranceRun : previousRun;
    });

    edgeRenderRunRef.current = nextRuns;
    return nextRuns;
  }, [edges, entranceEdgeIds, entranceRun]);

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
        measuredBoundsByNodeId?.[sourceNode.id],
      );
      const targetBounds = getNodeBounds(
        targetNode,
        previewOffsetByNodeId?.[targetNode.id],
        measuredBoundsByNodeId?.[targetNode.id],
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

      const sourcePoint = getAnchorPoint(sourceBounds, sourceAnchor, {
        outward: sourceNode.type === "text" ? TEXT_EDGE_GUTTER : 0,
      });
      const targetPoint = getAnchorPoint(targetBounds, targetAnchor, {
        outward: targetNode.type === "text" ? TEXT_EDGE_GUTTER : 0,
      });
      const geometry = getEdgePathGeometry(
        sourcePoint,
        targetPoint,
        sourceAnchor,
        targetAnchor,
        edge.route ?? "curve",
        edge.curve,
      );

      let strokeSourcePoint = sourcePoint;
      let strokeTargetPoint = targetPoint;

      if (edge.arrowStart) {
        const startDirection = directionFromAngle(geometry.sourceAngle);
        strokeSourcePoint = add(
          strokeSourcePoint,
          mul(startDirection, ARROW_LENGTH * 0.92),
        );
      }

      if (edge.arrowEnd) {
        const endDirection = directionFromAngle(geometry.targetAngle);
        strokeTargetPoint = sub(
          strokeTargetPoint,
          mul(endDirection, ARROW_LENGTH * 0.92),
        );
      }

      const strokeGeometry = getEdgePathGeometry(
        strokeSourcePoint,
        strokeTargetPoint,
        sourceAnchor,
        targetAnchor,
        edge.route ?? "curve",
        edge.curve,
      );

      return {
        edge,
        d: strokeGeometry.d,
        sourcePoint,
        targetPoint,
        sourceAngle: strokeGeometry.sourceAngle,
        targetAngle: strokeGeometry.targetAngle,
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
        const startArrowPath = getArrowPath(sourcePoint, sourceAngle);
        const endArrowPath = getArrowPath(targetPoint, targetAngle);
        const highlightStroke = isSelected ? Math.max(edge.width + 4, 8) : edge.width;
        const highlightColor = isSelected ? "#ffbe5c" : edge.color;

        return (
          <g key={`${edge.id}:entrance:${edgeKeyRunById[edge.id] ?? 0}`}>
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
                d={startArrowPath}
                initial={
                  shouldPlayEntrance
                    ? {
                        d: startArrowPath,
                        opacity: 0,
                      }
                    : false
                }
                animate={{
                  d: startArrowPath,
                  opacity: arrowOpacityTarget,
                }}
                transition={{ ...transition, delay: arrowDelay }}
                fill={highlightColor}
              />
            ) : null}
            {edge.arrowEnd ? (
              <motion.path
                d={endArrowPath}
                initial={
                  shouldPlayEntrance
                    ? {
                        d: endArrowPath,
                        opacity: 0,
                      }
                    : false
                }
                animate={{
                  d: endArrowPath,
                  opacity: arrowOpacityTarget,
                }}
                transition={{ ...transition, delay: arrowDelay }}
                fill={highlightColor}
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
