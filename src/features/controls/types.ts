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

export type UpdateSelectedNodes = (
  updater: (node: CanvasNode) => CanvasNode,
) => void;

export interface BaseSelectionControlsProps {
  nodes: CanvasNode[];
  updateSelectedNodes: UpdateSelectedNodes;
}

export interface TypeSelectionControlsProps<TNode extends CanvasNode> {
  nodes: TNode[];
  updateSelectedNodes: UpdateSelectedNodes;
}
