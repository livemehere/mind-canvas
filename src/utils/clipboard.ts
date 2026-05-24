import { type CanvasNode, DEFAULT_RECT_NODE } from "../core/nodes";

const APP_CLIPBOARD_MIME = "application/x-mind-canvas-nodes";

interface NodesClipboardPayload {
  version: 1;
  type: "nodes";
  nodes: CanvasNode[];
}

export const serializeNodesClipboard = (nodes: CanvasNode[]) =>
  JSON.stringify({
    version: 1,
    type: "nodes",
    nodes,
  } satisfies NodesClipboardPayload);

export const parseNodesClipboard = (value: string): CanvasNode[] | null => {
  try {
    const payload = JSON.parse(value) as Partial<NodesClipboardPayload>;

    if (
      payload.version !== 1 ||
      payload.type !== "nodes" ||
      !Array.isArray(payload.nodes)
    ) {
      return null;
    }

    return payload.nodes as CanvasNode[];
  } catch {
    return null;
  }
};

export const writeNodesToClipboard = async (nodes: CanvasNode[]) => {
  const serialized = serializeNodesClipboard(nodes);

  await navigator.clipboard.writeText(serialized);

  if (typeof ClipboardItem === "undefined") {
    return;
  }

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        [APP_CLIPBOARD_MIME]: new Blob([serialized], {
          type: APP_CLIPBOARD_MIME,
        }),
        "text/plain": new Blob([serialized], { type: "text/plain" }),
      }),
    ]);
  } catch {
    // Fallback to writeText above when custom mime is not allowed.
  }
};

export const readNodesFromClipboard = async () => {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return null;
  }

  if (navigator.clipboard.read) {
    try {
      const items = await navigator.clipboard.read();

      for (const item of items) {
        if (item.types.includes(APP_CLIPBOARD_MIME)) {
          const blob = await item.getType(APP_CLIPBOARD_MIME);
          const text = await blob.text();
          const nodes = parseNodesClipboard(text);

          if (nodes) {
            return nodes;
          }
        }
      }
    } catch {
      // Fall back to text read below.
    }
  }

  try {
    const text = await navigator.clipboard.readText();
    return parseNodesClipboard(text);
  } catch {
    return null;
  }
};

export const readNodesFromClipboardEvent = (event: ClipboardEvent) => {
  const customPayload = event.clipboardData?.getData(APP_CLIPBOARD_MIME);
  if (customPayload) {
    const nodes = parseNodesClipboard(customPayload);
    if (nodes) {
      return nodes;
    }
  }

  const textPayload = event.clipboardData?.getData("text/plain");
  if (textPayload) {
    return parseNodesClipboard(textPayload);
  }

  return null;
};

export const getImageFileFromClipboardEvent = (
  event: ClipboardEvent,
): File | null => {
  const item = Array.from(event.clipboardData?.items ?? []).find(
    (clipboardItem) => clipboardItem.type.startsWith("image/"),
  );

  return item?.getAsFile() ?? null;
};

export const createImageRectNode = async (
  file: File,
  createId: () => string,
  position: { x: number; y: number },
) => {
  const backgroundImage = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const imageSize = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
      };
      image.onerror = () => reject(new Error("Failed to read image size"));
      image.src = backgroundImage;
    },
  );

  const maxWidth = 320;
  const maxHeight = 240;
  const scale = Math.min(
    maxWidth / imageSize.width,
    maxHeight / imageSize.height,
    1,
  );

  return {
    ...DEFAULT_RECT_NODE,
    id: createId(),
    position,
    size: {
      width: Math.round(imageSize.width * scale),
      height: Math.round(imageSize.height * scale),
    },
    bgColor: "transparent",
    backgroundImage,
    content: "",
  };
};
