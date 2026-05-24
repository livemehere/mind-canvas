import { useHotkeys } from "react-hotkeys-hook";
import { oncePerKeypress } from "../hotkeys/helpers";

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
  onStepPrev,
  onStepNext,
}: UseCanvasHotkeysOptions) => {
  useHotkeys("q", oncePerKeypress(onSelectTool));
  useHotkeys("w", oncePerKeypress(onRectTool));
  useHotkeys("e", oncePerKeypress(onTextTool));
  useHotkeys(
    "meta+z,ctrl+z",
    oncePerKeypress(onUndo, { preventDefault: true }),
  );
  useHotkeys(
    "meta+shift+z,ctrl+shift+z",
    oncePerKeypress(onRedo, { preventDefault: true }),
  );
  useHotkeys(
    "meta+c,ctrl+c",
    oncePerKeypress(onCopy, { preventDefault: true }),
  );
  useHotkeys("meta+x,ctrl+x", oncePerKeypress(onCut, { preventDefault: true }));
  useHotkeys(
    "meta+d,ctrl+d",
    oncePerKeypress(onDuplicate, { preventDefault: true }),
  );
  useHotkeys("Enter", oncePerKeypress(onEnter, { preventDefault: true }));
  useHotkeys("shift+o", oncePerKeypress(onToggleOverlay));
  useHotkeys("Escape", oncePerKeypress(onEscape));
  useHotkeys("Backspace", oncePerKeypress(onBackspace));
  useHotkeys(
    "meta+backspace,ctrl+backspace",
    oncePerKeypress(onRemoveSnapshot, { preventDefault: true }),
  );
  useHotkeys("meta+s,ctrl+s", oncePerKeypress(onSave, { preventDefault: true }));
  useHotkeys("1,left", oncePerKeypress(onStepPrev));
  useHotkeys("2,right", oncePerKeypress(onStepNext));
};
