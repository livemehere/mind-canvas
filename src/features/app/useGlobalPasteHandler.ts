import { useEffect } from "react";
import { toast } from "sonner";
import { type CanvasNode } from "../../core/nodes";
import { offsetNodes } from "../snapshots/history";
import { regenerateNodeIds } from "../nodes/helpers";
import {
  createImageRectNode,
  getImageFileFromClipboardEvent,
  readImageDataUrl,
  readNodesFromClipboardEvent,
} from "../../utils/clipboard";

interface UseGlobalPasteHandlerOptions {
  commitNodesToStep: (step: number, nodes: CanvasNode[]) => void;
  pasteClipboardNodes: () => Promise<boolean>;
  getLatestState: () => {
    step: number;
    snapShot: { nodes: CanvasNode[] }[];
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
          );
          setActiveNodeIds([selectedRectNode.id]);
          toast.success("Image applied to selected rect");
          return;
        }

        commitNodesToStep(activeStep, [...nodes, rectNode]);
        setActiveNodeIds([rectNode.id]);
        toast.success("Image pasted as rect");
        return;
      }

      const eventClipboardNodes = readNodesFromClipboardEvent(event);
      if (eventClipboardNodes && eventClipboardNodes.length > 0) {
        event.preventDefault();
        const pastedNodes = offsetNodes(regenerateNodeIds(eventClipboardNodes), {
          x: 24,
          y: 24,
        });
        const { step: activeStep, snapShot: snapshots } = getLatestState();
        const nodes = snapshots[activeStep].nodes;
        commitNodesToStep(activeStep, [...nodes, ...pastedNodes]);
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
