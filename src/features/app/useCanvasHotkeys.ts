import { useHotkeys } from "react-hotkeys-hook";
import { oncePerKeypress } from "../hotkeys/helpers";
import {
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
} from "../hotkeys/keys";

interface UseCanvasHotkeysOptions {
  onSelectTool: () => void;
  onRectTool: () => void;
  onTextTool: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onCut: () => void;
  onDuplicate: () => void;
  onEnter: () => void;
  onToggleOverlay: () => void;
  onEscape: () => void;
  onBackspace: () => void;
  onRemoveSnapshot: () => void;
  onSave: () => void;
  onResetViewport: () => void;
  onTogglePresentationMode: () => void;
  onFocusSelectedNodes: () => void;
  onToggleShortcutHelp: () => void;
  onStepPrev: () => void;
  onStepNext: () => void;
}

export const useCanvasHotkeys = ({
  onSelectTool,
  onRectTool,
  onTextTool,
  onUndo,
  onRedo,
  onCopy,
  onCut,
  onDuplicate,
  onEnter,
  onToggleOverlay,
  onEscape,
  onBackspace,
  onRemoveSnapshot,
  onSave,
  onResetViewport,
  onTogglePresentationMode,
  onFocusSelectedNodes,
  onToggleShortcutHelp,
  onStepPrev,
  onStepNext,
}: UseCanvasHotkeysOptions) => {
  useHotkeys(HOTKEY_SELECT_CURSOR, oncePerKeypress(onSelectTool));
  useHotkeys(HOTKEY_RECT_TOOL, oncePerKeypress(onRectTool));
  useHotkeys(HOTKEY_TEXT_TOOL, oncePerKeypress(onTextTool));
  useHotkeys(
    HOTKEY_UNDO,
    oncePerKeypress(onUndo, { preventDefault: true }),
  );
  useHotkeys(
    HOTKEY_REDO,
    oncePerKeypress(onRedo, { preventDefault: true }),
  );
  useHotkeys(HOTKEY_COPY, oncePerKeypress(onCopy, { preventDefault: true }));
  useHotkeys(HOTKEY_CUT, oncePerKeypress(onCut, { preventDefault: true }));
  useHotkeys(
    HOTKEY_DUPLICATE_TO_NEXT,
    oncePerKeypress(onDuplicate, { preventDefault: true }),
  );
  useHotkeys(HOTKEY_ENTER_EDIT, oncePerKeypress(onEnter, { preventDefault: true }));
  useHotkeys(HOTKEY_TOGGLE_HISTORY_OVERLAY, oncePerKeypress(onToggleOverlay));
  useHotkeys(HOTKEY_ESCAPE, oncePerKeypress(onEscape));
  useHotkeys(HOTKEY_DELETE_NODE, oncePerKeypress(onBackspace));
  useHotkeys(
    HOTKEY_REMOVE_SNAPSHOT,
    oncePerKeypress(onRemoveSnapshot, { preventDefault: true }),
  );
  useHotkeys(
    HOTKEY_SAVE_SNAPSHOTS,
    oncePerKeypress(onSave, { preventDefault: true }),
  );
  useHotkeys(
    HOTKEY_RESET_VIEWPORT_TO_ORIGIN,
    oncePerKeypress(onResetViewport, { preventDefault: true }),
  );
  useHotkeys(
    HOTKEY_TOGGLE_PRESENTATION_MODE,
    oncePerKeypress(onTogglePresentationMode),
  );
  useHotkeys(HOTKEY_FOCUS_SELECTED_NODES, oncePerKeypress(onFocusSelectedNodes));
  useHotkeys(
    HOTKEY_TOGGLE_SHORTCUT_HELP,
    oncePerKeypress(onToggleShortcutHelp, { preventDefault: true }),
  );
  useHotkeys(HOTKEY_PREVIOUS_STEP, oncePerKeypress(onStepPrev));
  useHotkeys(HOTKEY_NEXT_STEP, oncePerKeypress(onStepNext));
};
