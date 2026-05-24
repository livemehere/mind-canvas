import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
} from "lucide-react";
import {
  alignNodesToBounds,
  alignNodesToCanvas,
  type AlignAxis,
  type AlignMode,
} from "./alignment";
import { type SelectionControlsBaseProps } from "./types";

interface Props extends SelectionControlsBaseProps {
  canvasSize: { width: number; height: number };
}

interface AlignAction {
  key: string;
  icon: React.ReactNode;
  title: string;
  axis: AlignAxis;
  mode: AlignMode;
}

const ALIGN_ACTIONS: AlignAction[] = [
  {
    key: "top",
    icon: <ArrowUpToLine size={16} />,
    title: "Top",
    axis: "x",
    mode: "start",
  },
  {
    key: "middle",
    icon: <AlignCenterHorizontal size={16} />,
    title: "Middle",
    axis: "x",
    mode: "center",
  },
  {
    key: "bottom",
    icon: <ArrowDownToLine size={16} />,
    title: "Bottom",
    axis: "x",
    mode: "end",
  },
  {
    key: "left",
    icon: <ArrowLeftToLine size={16} />,
    title: "Left",
    axis: "y",
    mode: "start",
  },
  {
    key: "center",
    icon: <AlignCenterVertical size={16} />,
    title: "Center",
    axis: "y",
    mode: "center",
  },
  {
    key: "right",
    icon: <ArrowRightToLine size={16} />,
    title: "Right",
    axis: "y",
    mode: "end",
  },
];

export function AlignControls({
  nodes,
  updateSelectedNodes,
  canvasSize,
}: Props) {
  const runSelectionAlign = (axis: AlignAxis, mode: AlignMode) => {
    const alignedNodes = alignNodesToBounds(nodes, axis, mode);
    const alignedNodeMap = new Map(alignedNodes.map((node) => [node.id, node]));

    updateSelectedNodes((node) => alignedNodeMap.get(node.id) ?? node);
  };

  const runCanvasAlign = (axis: AlignAxis, mode: AlignMode) => {
    const alignedNodes = alignNodesToCanvas(nodes, canvasSize, axis, mode);
    const alignedNodeMap = new Map(alignedNodes.map((node) => [node.id, node]));

    updateSelectedNodes((node) => alignedNodeMap.get(node.id) ?? node);
  };

  return (
    <div className="absolute left-5 top-20 z-20 rounded-lg border border-white/10 bg-neutral-950/85 p-3 backdrop-blur">
      <div className="mb-2 text-xs font-medium text-white/70">Selection</div>
      <div className="grid grid-cols-3 gap-1.5">
        {ALIGN_ACTIONS.map((action) => (
          <button
            key={`selection-${action.key}`}
            type="button"
            title={`Align selection ${action.title.toLowerCase()}`}
            onClick={() => runSelectionAlign(action.axis, action.mode)}
            className="flex h-9 w-9 items-center justify-center rounded bg-neutral-800 text-white transition hover:bg-purple-600"
          >
            {action.icon}
          </button>
        ))}
      </div>
      <div className="mb-2 mt-3 text-xs font-medium text-white/70">Canvas</div>
      <div className="grid grid-cols-3 gap-1.5">
        {ALIGN_ACTIONS.map((action) => (
          <button
            key={`canvas-${action.key}`}
            type="button"
            title={`Align to canvas ${action.title.toLowerCase()}`}
            onClick={() => runCanvasAlign(action.axis, action.mode)}
            className="flex h-9 w-9 items-center justify-center rounded bg-neutral-800 text-white transition hover:bg-purple-600"
          >
            {action.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
