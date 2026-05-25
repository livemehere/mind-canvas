import { useEffect } from "react";
import { toast } from "sonner";
import { type CanvasEdge, type CanvasNode } from "../../core/nodes";
import {
  createImageRectNode,
  getImageFileFromClipboardEvent,
  readImageDataUrl,
  readNodesFromClipboardEvent,
} from "../../utils/clipboard";
import { pasteClipboardToSnapshot } from "./pasteClipboard";

interface UseGlobalPasteHandlerOptions {
  commitNodesToStep: (
    step: number,
    nodes: CanvasNode[],
    edges?: CanvasEdge[],
  ) => void;
  pasteClipboardNodes: () => Promise<boolean>;
  getLatestState: () => {
    step: number;
    snapShot: { nodes: CanvasNode[]; edges: CanvasEdge[] }[];
    activeNodeIds: string[];
  };
  setActiveNodeIds: (ids: string[]) => void;
}

export const useGlobalPasteHandler = ({
  commitNodesToStep,
  pasteClipboardNodes,
  getLatestState,
  setActiveNodeIds,
}: UseGlobalPasteHandlerOptions) => {
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const imageFile = getImageFileFromClipboardEvent(event);

      if (imageFile) {
        event.preventDefault();
        const backgroundImage = await readImageDataUrl(imageFile);
        const rectNode = await createImageRectNode(
          imageFile,
          () => window.crypto.randomUUID(),
          { x: 120, y: 120 },
        );
        const { step: activeStep, snapShot: snapshots, activeNodeIds } =
          getLatestState();
        const nodes = snapshots[activeStep].nodes;
        const edges = snapshots[activeStep].edges;

        const selectedRectNode =
          activeNodeIds.length === 1
            ? nodes.find(
                (node) => node.id === activeNodeIds[0] && node.type === "rect",
              )
            : undefined;

        if (selectedRectNode && selectedRectNode.type === "rect") {
          commitNodesToStep(
            activeStep,
            nodes.map((node) =>
              node.id === selectedRectNode.id
                ? {
                    ...node,
                    backgroundImage,
                  }
                : node,
            ),
            edges,
          );
          setActiveNodeIds([selectedRectNode.id]);
          toast.success("Image applied to selected rect");
          return;
        }

        commitNodesToStep(activeStep, [...nodes, rectNode], edges);
        setActiveNodeIds([rectNode.id]);
        toast.success("Image pasted as rect");
        return;
      }

      const eventClipboardNodes = readNodesFromClipboardEvent(event);
      if (eventClipboardNodes && eventClipboardNodes.nodes.length > 0) {
        event.preventDefault();
        const { step: activeStep, snapShot: snapshots } = getLatestState();
        const nodes = snapshots[activeStep].nodes;
        const edges = snapshots[activeStep].edges;
        const { appendedNodes: pastedNodes, appendedEdges: pastedEdges } =
          pasteClipboardToSnapshot({
            clipboard: eventClipboardNodes,
            currentNodes: nodes,
            currentEdges: edges,
          });
        commitNodesToStep(activeStep, [...nodes, ...pastedNodes], [
          ...edges,
          ...pastedEdges,
        ]);
        setActiveNodeIds(pastedNodes.map((node) => node.id));
        toast.success("Pasted nodes");
        return;
      }

      const pasted = await pasteClipboardNodes();
      if (pasted) {
        event.preventDefault();
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [commitNodesToStep, getLatestState, pasteClipboardNodes, setActiveNodeIds]);
};
