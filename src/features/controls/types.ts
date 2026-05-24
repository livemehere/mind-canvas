import { type CanvasNode } from "../../core/nodes";

export interface LevaOnChangeContext {
  initial?: boolean;
  fromPanel?: boolean;
}

export interface SharedValue<T> {
  value: T;
  mixed: boolean;
}

export interface NumericEditSession {
  source: "input" | "drag";
  mixed: boolean;
  displayStartValue: number;
  initialValues: Map<string, number>;
}

export interface UpdateSelectedNodesOptions {
  commitHistory?: boolean;
  syncMatchingIds?: boolean;
}

export type UpdateSelectedNodes = (
  updater: (node: CanvasNode) => CanvasNode,
  options?: UpdateSelectedNodesOptions,
) => void;

export interface SelectionControlsBaseProps {
  nodes: CanvasNode[];
  updateSelectedNodes: UpdateSelectedNodes;
}

export interface BaseSelectionControlsProps extends SelectionControlsBaseProps {
  linkedNodeIds: string[];
  onDetachLinkedNodes: () => void;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface TypeSelectionControlsProps<TNode extends CanvasNode> {
  nodes: TNode[];
  updateSelectedNodes: UpdateSelectedNodes;
}
