import { MousePointer2, Square, Type } from "lucide-react";
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
}

export function CanvasToolbar({ activeToolId, setActiveToolId }: Props) {
  return (
    <div className="absolute left-1/2 -translate-1/2 bottom-4">
      <div className="flex items-center gap-1.5 bg-neutral-950/80 p-2 rounded">
        {TOOL_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => setActiveToolId(action.id)}
            className={cn(
              "bg-neutral-800 p-2 rounded hover:opacity-80 transition active:scale-90",
              activeToolId === action.id && "bg-purple-600",
            )}
          >
            {action.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
