import { Eye, EyeOff, MousePointer2, Square, Type } from "lucide-react";
import { cn } from "../../utils/cn";

export type CanvasToolId = "select" | "rect" | "text";

interface ToolAction {
  id: CanvasToolId;
  icon: React.ReactNode;
}

const TOOL_ACTIONS: ToolAction[] = [
  {
    id: "select",
    icon: <MousePointer2 size={18} />,
  },
  {
    id: "rect",
    icon: <Square size={18} />,
  },
  {
    id: "text",
    icon: <Type size={18} />,
  },
];

interface Props {
  activeToolId: CanvasToolId | null;
  setActiveToolId: React.Dispatch<React.SetStateAction<CanvasToolId>>;
  showPreviousOverlay: boolean;
  setShowPreviousOverlay: React.Dispatch<React.SetStateAction<boolean>>;
}

export function CanvasToolbar({
  activeToolId,
  setActiveToolId,
  showPreviousOverlay,
  setShowPreviousOverlay,
}: Props) {
  return (
    <div className="absolute left-1/2 bottom-5 z-10 -translate-x-1/2">
      <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-neutral-950/85 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur">
        {TOOL_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => setActiveToolId(action.id)}
            className={cn(
              "rounded-xl bg-neutral-800/90 p-2 text-white/80 transition hover:opacity-80 active:scale-90",
              activeToolId === action.id && "bg-purple-600 text-white",
            )}
          >
            {action.icon}
          </button>
        ))}
        <button
          onClick={() => setShowPreviousOverlay((prev) => !prev)}
          className={cn(
            "rounded-xl bg-neutral-800/90 p-2 text-white/80 transition hover:opacity-80 active:scale-90",
            showPreviousOverlay && "bg-purple-600 text-white",
          )}
          title="Toggle previous overlay (Shift+O)"
        >
          {showPreviousOverlay ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>
    </div>
  );
}
