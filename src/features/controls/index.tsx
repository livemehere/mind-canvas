import {
  type CanvasNode,
  type RectNode,
  type TextNode,
} from "../../core/nodes";
import { BaseSelectionControls } from "./BaseSelectionControls";
import { RectSelectionControls } from "./RectSelectionControls";
import { TextSelectionControls } from "./TextSelectionControls";
import { type UpdateSelectedNodes } from "./types";

interface Props {
  nodes: CanvasNode[];
  updateSelectedNodes: UpdateSelectedNodes;
}

export function SelectedNodeControls({ nodes, updateSelectedNodes }: Props) {
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
