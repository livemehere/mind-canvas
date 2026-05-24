import { type SelectionRect } from "./helpers";

interface Props {
  selectionRect: SelectionRect | null;
}

export function SelectionOverlay({ selectionRect }: Props) {
  if (!selectionRect) {
    return null;
  }

  return (
    <div
      className="absolute border border-purple-400 bg-purple-400/15 pointer-events-none"
      style={{
        left: Math.min(selectionRect.start.x, selectionRect.current.x),
        top: Math.min(selectionRect.start.y, selectionRect.current.y),
        width: Math.abs(selectionRect.current.x - selectionRect.start.x),
        height: Math.abs(selectionRect.current.y - selectionRect.start.y),
      }}
    />
  );
}
