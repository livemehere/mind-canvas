import { MousePointer2, Square } from "lucide-react";
import { cn } from "../utils/cn";

export type ToolId = "select" | "rect";

interface Action {
  id: ToolId;
  icon: React.ReactNode;
}

const ACTIONS: Action[] = [
  {
    id: "select",
    icon: <MousePointer2 />,
  },
  {
    id: "rect",
    icon: <Square />,
  },
];

interface Props {
  activeToolId: string | null;
  setActiveToolId: React.Dispatch<React.SetStateAction<ToolId>>;
}

export function Toolbar({ activeToolId, setActiveToolId }: Props) {
  return (
    <div className={"absolute left-1/2 -translate-1/2 bottom-4"}>
      <div className={"flex items-center gap-2 bg-neutral-700/80 p-2 rounded"}>
        {ACTIONS.map((action) => (
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
