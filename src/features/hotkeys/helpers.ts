export const isEditableElementFocused = () => {
  const activeElement = document.activeElement;

  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement ||
    activeElement instanceof HTMLButtonElement ||
    activeElement?.hasAttribute("contenteditable") === true
  );
};

export const oncePerKeypress =
  (handler: () => void, options?: { preventDefault?: boolean }) =>
  (event: KeyboardEvent) => {
    if (event.repeat) {
      return;
    }

    if (options?.preventDefault) {
      event.preventDefault();
    }

    handler();
  };
