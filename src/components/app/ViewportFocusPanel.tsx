import { Home, LocateFixed } from "lucide-react";
import { type CanvasViewport } from "../canvas/CanvasSurface";

interface ViewportFocusPanelProps {
  viewport: CanvasViewport;
  focusFitPercent: number;
  onFocusFitPercentChange: (next: number) => void;
  onResetViewportToOrigin: () => void;
  onFocusSelectedNodes: () => void;
  onPreventButtonFocus: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function ViewportFocusPanel({
  viewport,
  focusFitPercent,
  onFocusFitPercentChange,
  onResetViewportToOrigin,
  onFocusSelectedNodes,
  onPreventButtonFocus,
}: ViewportFocusPanelProps) {
  return (
    <div className="absolute left-5 top-5 z-10 flex flex-col gap-1">
      <button
        type="button"
        onClick={onResetViewportToOrigin}
        onMouseDown={onPreventButtonFocus}
        tabIndex={-1}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/10 bg-neutral-950/85 px-3 text-xs font-medium text-white/80 shadow-[0_10px_32px_rgba(0,0,0,0.28)] transition hover:bg-white/12 hover:text-white"
        title="Reset pan/zoom to origin (Cmd/Ctrl+0)"
      >
        <Home size={14} />
        <span>Origin</span>
      </button>
      <div className="inline-flex h-9 items-center gap-2 px-3 text-[11px] font-semibold tracking-[0.08em] text-white/70 w-0 whitespace-nowrap">
        <span className="text-white/40">PAN</span>
        <span className="font-mono text-white/85">X {viewport.x.toFixed(0)}</span>
        <span className="text-white/30">/</span>
        <span className="font-mono text-white/85">Y {viewport.y.toFixed(0)}</span>
      </div>
      <div className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-neutral-950/70 px-2 text-[11px] font-semibold tracking-[0.06em] text-white/75 shadow-[0_10px_32px_rgba(0,0,0,0.22)]">
        <span className="px-1 text-white/45">FIT</span>
        <input
          type="number"
          min={0}
          max={100}
          value={focusFitPercent}
          onChange={(event) => {
            const value = Number.parseInt(event.target.value, 10);
            if (Number.isNaN(value)) {
              onFocusFitPercentChange(0);
              return;
            }

            onFocusFitPercentChange(Math.max(0, Math.min(100, value)));
          }}
          className="h-6 w-12 rounded border border-white/15 bg-white/5 px-1 text-right font-mono text-xs text-white/90 outline-none transition focus:border-white/35"
          title="Focus fit ratio (0-100%)"
        />
        <span className="text-white/45">%</span>
        <button
          type="button"
          onClick={onFocusSelectedNodes}
          onMouseDown={onPreventButtonFocus}
          tabIndex={-1}
          className="inline-flex h-7 items-center justify-center gap-1 rounded border border-white/10 bg-white/5 px-2 text-[10px] font-semibold text-white/80 transition hover:bg-white/12 hover:text-white"
          title="Focus selected nodes"
        >
          <LocateFixed size={12} />
          <span>Focus</span>
        </button>
      </div>
    </div>
  );
}
