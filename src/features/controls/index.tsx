import {
  type CanvasNode,
  type RectNode,
  type TextNode,
} from "../../core/nodes";
import { AlignControls } from "./AlignControls";
import { BaseSelectionControls } from "./BaseSelectionControls";
import { RectSelectionControls } from "./RectSelectionControls";
import { TextSelectionControls } from "./TextSelectionControls";
import {
  type CanvasSize,
  type CanvasViewportState,
  type UpdateSelectedNodes,
} from "./types";

interface Props {
  nodes: CanvasNode[];
  updateSelectedNodes: UpdateSelectedNodes;
  canvasSize: CanvasSize;
  viewport: CanvasViewportState;
  linkedNodeIds: string[];
  onDetachLinkedNodes: () => void;
}

export function SelectedNodeControls({
  nodes,
  updateSelectedNodes,
  canvasSize,
  viewport,
  linkedNodeIds,
  onDetachLinkedNodes,
}: Props) {
  const rectNodes = nodes.filter(
    (node): node is RectNode => node.type === "rect",
  );
  const textNodes = nodes.filter(
    (node): node is TextNode => node.type === "text",
  );
  const selectionKey = nodes.map((node) => node.id).join(":");
  const rectSelectionKey = rectNodes.map((node) => node.id).join(":");
  const textSelectionKey = textNodes.map((node) => node.id).join(":");

  if (nodes.length === 0) {
    return null;
  }

  return (
    <>
      <AlignControls
        nodes={nodes}
        updateSelectedNodes={updateSelectedNodes}
        canvasSize={canvasSize}
        viewport={viewport}
      />
      <BaseSelectionControls
        key={`base:${selectionKey}`}
        nodes={nodes}
        updateSelectedNodes={updateSelectedNodes}
        linkedNodeIds={linkedNodeIds}
        onDetachLinkedNodes={onDetachLinkedNodes}
      />
      {rectNodes.length > 0 ? (
        <RectSelectionControls
          key={`rect:${rectSelectionKey}`}
          nodes={rectNodes}
          updateSelectedNodes={updateSelectedNodes}
        />
      ) : null}
      {textNodes.length > 0 ? (
        <TextSelectionControls
          key={`text:${textSelectionKey}`}
          nodes={textNodes}
          updateSelectedNodes={updateSelectedNodes}
        />
      ) : null}
    </>
  );
}
