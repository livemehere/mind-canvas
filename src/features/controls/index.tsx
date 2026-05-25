import {
  type BoxNode,
  type CanvasEdge,
  type CanvasNode,
  type TextNode,
} from "../../core/nodes";
import { AlignControls } from "./AlignControls";
import { BaseSelectionControls } from "./BaseSelectionControls";
import { EdgeSelectionControls } from "./EdgeSelectionControls";
import { BoxSelectionControls } from "./BoxSelectionControls";
import { TextSelectionControls } from "./TextSelectionControls";
import {
  type CanvasSize,
  type CanvasViewportState,
  type UpdateSelectedEdges,
  type UpdateSelectedNodes,
} from "./types";

interface Props {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  updateSelectedNodes: UpdateSelectedNodes;
  updateSelectedEdges: UpdateSelectedEdges;
  canvasSize: CanvasSize;
  viewport: CanvasViewportState;
  linkedNodeIds: string[];
  onDetachLinkedNodes: () => void;
}

export function SelectedNodeControls({
  nodes,
  edges,
  updateSelectedNodes,
  updateSelectedEdges,
  canvasSize,
  viewport,
  linkedNodeIds,
  onDetachLinkedNodes,
}: Props) {
  const rectNodes = nodes.filter(
    (node): node is BoxNode => node.type === "box",
  );
  const textNodes = nodes.filter(
    (node): node is TextNode => node.type === "text",
  );
  const selectionKey = nodes.map((node) => node.id).join(":");
  const edgeSelectionKey = edges.map((edge) => edge.id).join(":");
  const rectSelectionKey = rectNodes.map((node) => node.id).join(":");
  const textSelectionKey = textNodes.map((node) => node.id).join(":");

  if (nodes.length === 0 && edges.length === 0) {
    return null;
  }

  return (
    <>
      {nodes.length > 0 ? (
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
        </>
      ) : null}
      {rectNodes.length > 0 ? (
        <BoxSelectionControls
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
      {edges.length > 0 ? (
        <EdgeSelectionControls
          key={`edge:${edgeSelectionKey}`}
          edges={edges}
          updateSelectedEdges={updateSelectedEdges}
        />
      ) : null}
    </>
  );
}
