import { useMemo } from "react";
import { toast } from "sonner";
import { type CanvasEdge, type CanvasNode, type Snapshot } from "../../core/nodes";
import { readNodesFromClipboard, writeNodesToClipboard } from "../../utils/clipboard";
import { regenerateNodeIds } from "../nodes/helpers";
import { offsetNodes } from "../snapshots/history";
import { pasteClipboardToSnapshot } from "./pasteClipboard";

interface UseCanvasSelectionActionsOptions {
  currentNodes: CanvasNode[];
  currentEdges: CanvasEdge[];
  snapShot: Snapshot[];
  step: number;
  activeNodeIds: string[];
  activeEdgeIds: string[];
  setActiveNodeIds: (ids: string[]) => void;
  setActiveEdgeIds: (ids: string[]) => void;
  setCurrentSnapShotNodes: (nodes: CanvasNode[], edges: CanvasEdge[]) => void;
  removeNodes: (nodeIds: string[]) => void;
  removeEdges: (edgeIds: string[]) => void;
}

export const useCanvasSelectionActions = ({
  currentNodes,
  currentEdges,
  snapShot,
  step,
  activeNodeIds,
  activeEdgeIds,
  setActiveNodeIds,
  setActiveEdgeIds,
  setCurrentSnapShotNodes,
  removeNodes,
  removeEdges,
}: UseCanvasSelectionActionsOptions) => {
  const selectedNodes = useMemo(
    () => currentNodes.filter((node) => activeNodeIds.includes(node.id)),
    [activeNodeIds, currentNodes],
  );
  const selectedEdges = useMemo(
    () => currentEdges.filter((edge) => activeEdgeIds.includes(edge.id)),
    [activeEdgeIds, currentEdges],
  );

  const linkedNodeIds = useMemo(() => {
    if (activeNodeIds.length === 0) {
      return [];
    }

    const activeNodeIdSet = new Set(activeNodeIds);

    return currentNodes
      .filter((node) => activeNodeIdSet.has(node.id))
      .filter((node) =>
        snapShot.some(
          (snapshot, snapshotIndex) =>
            snapshotIndex !== step &&
            snapshot.nodes.some((snapshotNode) => snapshotNode.id === node.id),
        ),
      )
      .map((node) => node.id);
  }, [activeNodeIds, currentNodes, snapShot, step]);

  const copySelectedNodes = async () => {
    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      return false;
    }

    const selectedNodeIdSet = new Set(selectedNodes.map((node) => node.id));
    const internalEdges = currentEdges.filter(
      (edge) =>
        selectedNodeIdSet.has(edge.sourceNodeId) &&
        selectedNodeIdSet.has(edge.targetNodeId),
    );
    const mergedEdges = [
      ...internalEdges,
      ...selectedEdges.filter(
        (edge) => !internalEdges.some((internalEdge) => internalEdge.id === edge.id),
      ),
    ];

    await writeNodesToClipboard(selectedNodes, mergedEdges);
    toast.success("Copied selection");
    return true;
  };

  const cutSelectedNodes = async () => {
    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
      return;
    }

    const copied = await copySelectedNodes();
    if (!copied) {
      return;
    }

    if (selectedNodes.length > 0) {
      removeNodes(selectedNodes.map((node) => node.id));
    }
    if (selectedEdges.length > 0) {
      removeEdges(selectedEdges.map((edge) => edge.id));
    }
    setActiveNodeIds([]);
    setActiveEdgeIds([]);
    toast.success("Cut selection");
  };

  const pasteClipboardNodes = async () => {
    const clipboardNodes = await readNodesFromClipboard();

    if (!clipboardNodes || clipboardNodes.nodes.length === 0) {
      return false;
    }

    const { appendedNodes: pastedNodes, appendedEdges: pastedEdges } =
      pasteClipboardToSnapshot({
        clipboard: clipboardNodes,
        currentNodes,
        currentEdges,
      });
    setCurrentSnapShotNodes(
      [...currentNodes, ...pastedNodes],
      [...currentEdges, ...pastedEdges],
    );
    setActiveNodeIds(pastedNodes.map((node) => node.id));
    setActiveEdgeIds(pastedEdges.map((edge) => edge.id));
    toast.success("Pasted selection");
    return true;
  };

  const duplicateSelectedNodes = () => {
    if (selectedNodes.length === 0) {
      return;
    }

    const duplicatedNodes = offsetNodes(regenerateNodeIds(selectedNodes), {
      x: 24,
      y: 24,
    });

    const sourceNodeIdSet = new Set(selectedNodes.map((node) => node.id));
    const nodeIdMap = new Map<string, string>();
    selectedNodes.forEach((node, index) => {
      nodeIdMap.set(node.id, duplicatedNodes[index].id);
    });
    const duplicatedEdges = currentEdges
      .filter(
        (edge) =>
          sourceNodeIdSet.has(edge.sourceNodeId) &&
          sourceNodeIdSet.has(edge.targetNodeId),
      )
      .map((edge) => ({
        ...edge,
        id: window.crypto.randomUUID(),
        sourceNodeId: nodeIdMap.get(edge.sourceNodeId) ?? edge.sourceNodeId,
        targetNodeId: nodeIdMap.get(edge.targetNodeId) ?? edge.targetNodeId,
      }));

    setCurrentSnapShotNodes(
      [...currentNodes, ...duplicatedNodes],
      [...currentEdges, ...duplicatedEdges],
    );
    setActiveNodeIds(duplicatedNodes.map((node) => node.id));
    setActiveEdgeIds(duplicatedEdges.map((edge) => edge.id));
    toast.success("Duplicated nodes");
  };

  const detachLinkedSelectedNodes = () => {
    if (linkedNodeIds.length === 0) {
      toast.warning("No linked nodes to detach");
      return;
    }

    const detachedNodeIdMap = new Map(
      linkedNodeIds.map((nodeId) => [nodeId, window.crypto.randomUUID()] as const),
    );

    const nextNodes = currentNodes.map((node) => {
      const detachedNodeId = detachedNodeIdMap.get(node.id);
      if (!detachedNodeId) {
        return node;
      }

      return {
        ...node,
        id: detachedNodeId,
      };
    });
    const nextEdges = currentEdges.map((edge) => ({
      ...edge,
      sourceNodeId: detachedNodeIdMap.get(edge.sourceNodeId) ?? edge.sourceNodeId,
      targetNodeId: detachedNodeIdMap.get(edge.targetNodeId) ?? edge.targetNodeId,
    }));
    setCurrentSnapShotNodes(nextNodes, nextEdges);
    setActiveNodeIds(
      activeNodeIds.map((nodeId) => detachedNodeIdMap.get(nodeId) ?? nodeId),
    );
    toast.success(linkedNodeIds.length === 1 ? "Node detached" : "Nodes detached");
  };

  return {
    selectedNodes,
    selectedEdges,
    linkedNodeIds,
    copySelectedNodes,
    cutSelectedNodes,
    pasteClipboardNodes,
    duplicateSelectedNodes,
    detachLinkedSelectedNodes,
  };
};
