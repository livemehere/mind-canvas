let pendingControlFocusKey: string | null = null;

export const requestControlFocus = (key: string) => {
  pendingControlFocusKey = key;
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
