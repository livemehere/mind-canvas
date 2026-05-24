import {
  type CanvasNode,
  type RectNode,
  type TextNode,
} from "../../core/nodes";
import { AlignControls } from "./AlignControls";
import { BaseSelectionControls } from "./BaseSelectionControls";
import { RectSelectionControls } from "./RectSelectionControls";
import { TextSelectionControls } from "./TextSelectionControls";
import { type CanvasSize, type UpdateSelectedNodes } from "./types";

interface Props {
  nodes: CanvasNode[];
  updateSelectedNodes: UpdateSelectedNodes;
  canvasSize: CanvasSize;
}

export function SelectedNodeControls({
  nodes,
  updateSelectedNodes,
  canvasSize,
}: Props) {
  const rectNodes = nodes.filter(
    (node): node is RectNode => node.type === "rect",
  );
  const textNodes = nodes.filter(
    (node): node is TextNode => node.type === "text",
  );

  if (nodes.length === 0) {
    return null;
  }

  return (
    <>
      <AlignControls
        nodes={nodes}
        updateSelectedNodes={updateSelectedNodes}
        canvasSize={canvasSize}
      />
      <BaseSelectionControls
        nodes={nodes}
        updateSelectedNodes={updateSelectedNodes}
      />
      {rectNodes.length > 0 ? (
        <RectSelectionControls
          nodes={rectNodes}
          updateSelectedNodes={updateSelectedNodes}
        />
      ) : null}
      {textNodes.length > 0 ? (
        <TextSelectionControls
          nodes={textNodes}
          updateSelectedNodes={updateSelectedNodes}
        />
      ) : null}
    </>
  );
}
