import { type CanvasEdge, type CanvasNode } from "../../core/nodes";
import { type ClipboardCanvasData } from "../../utils/clipboard";

interface PasteClipboardToSnapshotOptions {
  clipboard: ClipboardCanvasData;
  currentNodes: CanvasNode[];
  currentEdges: CanvasEdge[];
  createId?: () => string;
  offset?: { x: number; y: number };
}

interface PasteClipboardToSnapshotResult {
  appendedNodes: CanvasNode[];
  appendedEdges: CanvasEdge[];
}

const applyOffset = (
  node: CanvasNode,
  offset: { x: number; y: number },
): CanvasNode => {
  if (offset.x === 0 && offset.y === 0) {
    return node;
  }

  return {
    ...node,
    position: {
      x: node.position.x + offset.x,
      y: node.position.y + offset.y,
    },
  };
};

export const pasteClipboardToSnapshot = ({
  clipboard,
  currentNodes,
  currentEdges,
  createId = () => window.crypto.randomUUID(),
  offset = { x: 24, y: 24 },
}: PasteClipboardToSnapshotOptions): PasteClipboardToSnapshotResult => {
  const takenNodeIds = new Set(currentNodes.map((node) => node.id));
  const takenEdgeIds = new Set(currentEdges.map((edge) => edge.id));

  const nodeIdMap = new Map<string, string>();
  const appendedNodes = clipboard.nodes.map((node) => {
    const canKeepId = !takenNodeIds.has(node.id);
    const nextNodeId = canKeepId ? node.id : createId();
    const nextNode = {
      ...node,
      id: nextNodeId,
    } satisfies CanvasNode;

    nodeIdMap.set(node.id, nextNodeId);
    takenNodeIds.add(nextNodeId);

    return canKeepId ? nextNode : applyOffset(nextNode, offset);
  });

  const appendedEdges: CanvasEdge[] = [];
  clipboard.edges.forEach((edge) => {
    const sourceNodeId = nodeIdMap.get(edge.sourceNodeId);
    const targetNodeId = nodeIdMap.get(edge.targetNodeId);
    if (!sourceNodeId || !targetNodeId) {
      return;
    }

    const canKeepEdgeId = !takenEdgeIds.has(edge.id);
    const nextEdgeId = canKeepEdgeId ? edge.id : createId();
    takenEdgeIds.add(nextEdgeId);

    appendedEdges.push({
      ...edge,
      id: nextEdgeId,
      sourceNodeId,
      targetNodeId,
    });
  });

  return {
    appendedNodes,
    appendedEdges,
  };
};
