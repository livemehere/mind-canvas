import {
  HOTKEY_ARROW_TOOL,
  HOTKEY_COPY,
  HOTKEY_CUT,
  HOTKEY_DELETE_NODE,
  HOTKEY_DUPLICATE_TO_NEXT,
  HOTKEY_ENTER_EDIT,
  HOTKEY_ESCAPE,
  HOTKEY_FOCUS_SELECTED_NODES,
  HOTKEY_NEXT_STEP,
  HOTKEY_PREVIOUS_STEP,
  HOTKEY_RECT_TOOL,
  HOTKEY_REDO,
  HOTKEY_REMOVE_SNAPSHOT,
  HOTKEY_RESET_VIEWPORT_TO_ORIGIN,
  HOTKEY_SAVE_SNAPSHOTS,
  HOTKEY_SELECT_CURSOR,
  HOTKEY_TEXT_TOOL,
  HOTKEY_TOGGLE_HISTORY_OVERLAY,
  HOTKEY_TOGGLE_PRESENTATION_MODE,
  HOTKEY_TOGGLE_SHORTCUT_HELP,
  HOTKEY_UNDO,
} from "../../features/hotkeys/keys";

interface ShortcutHelpOverlayProps {
  open: boolean;
  onClose: () => void;
  onPreventButtonFocus: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function ShortcutHelpOverlay({
  open,
  onClose,
  onPreventButtonFocus,
}: ShortcutHelpOverlayProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-[min(680px,92vw)] rounded-2xl border border-white/15 bg-neutral-950/95 p-5 text-white shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-[0.08em] text-white/90">
            Shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            onMouseDown={onPreventButtonFocus}
            tabIndex={-1}
            className="rounded border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            {HOTKEY_ESCAPE.toUpperCase()}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div className="text-white/70">Select cursor</div>
          <div className="font-mono text-white/90">{HOTKEY_SELECT_CURSOR}</div>
          <div className="text-white/70">Rect tool</div>
          <div className="font-mono text-white/90">{HOTKEY_RECT_TOOL}</div>
          <div className="text-white/70">Text tool</div>
          <div className="font-mono text-white/90">{HOTKEY_TEXT_TOOL}</div>
          <div className="text-white/70">Arrow tool</div>
          <div className="font-mono text-white/90">{HOTKEY_ARROW_TOOL}</div>
          <div className="text-white/70">Toggle history overlay</div>
          <div className="font-mono text-white/90">{HOTKEY_TOGGLE_HISTORY_OVERLAY}</div>
          <div className="text-white/70">Toggle presentation mode</div>
          <div className="font-mono text-white/90">{HOTKEY_TOGGLE_PRESENTATION_MODE}</div>
          <div className="text-white/70">Focus selected nodes</div>
          <div className="font-mono text-white/90">{HOTKEY_FOCUS_SELECTED_NODES}</div>
          <div className="text-white/70">Adjust focus fit (5%)</div>
          <div className="font-mono text-white/90">Shift + Wheel</div>
          <div className="text-white/70">Undo / Redo</div>
          <div className="font-mono text-white/90">
            {HOTKEY_UNDO} / {HOTKEY_REDO}
          </div>
          <div className="text-white/70">Copy / Cut</div>
          <div className="font-mono text-white/90">
            {HOTKEY_COPY} / {HOTKEY_CUT}
          </div>
          <div className="text-white/70">Duplicate selection</div>
          <div className="font-mono text-white/90">{HOTKEY_DUPLICATE_TO_NEXT}</div>
          <div className="text-white/70">Edit selected node</div>
          <div className="font-mono text-white/90">{HOTKEY_ENTER_EDIT}</div>
          <div className="text-white/70">Delete selected node</div>
          <div className="font-mono text-white/90">{HOTKEY_DELETE_NODE}</div>
          <div className="text-white/70">Remove current snapshot</div>
          <div className="font-mono text-white/90">{HOTKEY_REMOVE_SNAPSHOT}</div>
          <div className="text-white/70">Save snapshots</div>
          <div className="font-mono text-white/90">{HOTKEY_SAVE_SNAPSHOTS}</div>
          <div className="text-white/70">Reset to origin</div>
          <div className="font-mono text-white/90">{HOTKEY_RESET_VIEWPORT_TO_ORIGIN}</div>
          <div className="text-white/70">Step prev / next</div>
          <div className="font-mono text-white/90">
            {HOTKEY_PREVIOUS_STEP} / {HOTKEY_NEXT_STEP}
          </div>
          <div className="text-white/70">Toggle this help</div>
          <div className="font-mono text-white/90">{HOTKEY_TOGGLE_SHORTCUT_HELP}</div>
        </div>
      </div>
    </div>
  );
}
