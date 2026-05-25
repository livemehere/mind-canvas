let pendingControlFocusKey: string | null = null;

const CONTROL_LABEL_BY_KEY: Record<string, string> = {
  "rect.content": "contentText.content",
  "text.text": "text",
};

const getControlLabel = (key: string) => CONTROL_LABEL_BY_KEY[key] ?? null;

export const requestControlFocus = (key: string) => {
  pendingControlFocusKey = key;

  const labelText = getControlLabel(key);
  if (labelText) {
    focusLevaControlByLabel(labelText);
  }
};

export const consumeControlFocus = (key: string) => {
  if (pendingControlFocusKey !== key) {
    return false;
  }

  pendingControlFocusKey = null;
  return true;
};

const tryFocusByLabel = (labelText: string) => {
  const labels = Array.from(document.querySelectorAll("label"));
  const targetLabel = labels.find(
    (label) => label.textContent?.trim().toLowerCase() === labelText.toLowerCase(),
  );

  if (!(targetLabel instanceof HTMLLabelElement)) {
    return false;
  }

  const controlId = targetLabel.htmlFor;
  if (!controlId) {
    return false;
  }

  const input = document.getElementById(controlId);
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
    return false;
  }

  input.focus();
  input.select?.();
  return true;
};

export const focusLevaControlByLabel = (
  labelText: string,
  attempts = 6,
  delay = 16,
) => {
  const attemptFocus = (remainingAttempts: number) => {
    if (tryFocusByLabel(labelText)) {
      return;
    }

    if (remainingAttempts <= 0) {
      return;
    }

    window.setTimeout(() => attemptFocus(remainingAttempts - 1), delay);
  };

  attemptFocus(attempts);
};

export const installLevaTextareaEnterBehavior = () => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter") {
      return;
    }

    if (
      event.shiftKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.ctrlKey
    ) {
      return;
    }

    const target = event.target;
    const activeTextarea =
      target instanceof HTMLTextAreaElement
        ? target
        : document.activeElement instanceof HTMLTextAreaElement
          ? document.activeElement
          : null;

    if (!activeTextarea) {
      return;
    }

    const isLevaTextarea =
      activeTextarea.closest("[data-leva-root]") !== null ||
      activeTextarea.closest("[class*='leva']") !== null ||
      activeTextarea.id.startsWith("leva__");
    if (!isLevaTextarea) {
      return;
    }

    event.preventDefault();
    window.setTimeout(() => {
      activeTextarea.blur();
    }, 0);
  };

  window.addEventListener("keydown", handleKeyDown, true);

  return () => {
    window.removeEventListener("keydown", handleKeyDown, true);
  };
};
