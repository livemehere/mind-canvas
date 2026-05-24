import { motion, type PanInfo } from "motion/react";

export type ResizeHandleDirection =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

interface Props {
  onResizeStart: (direction: ResizeHandleDirection) => void;
  onResize: (
    direction: ResizeHandleDirection,
    offset: { x: number; y: number },
  ) => void;
  onResizeEnd: (
    direction: ResizeHandleDirection,
    offset: { x: number; y: number },
  ) => void;
  onRotateStart: () => void;
  onRotate: (offset: { x: number; y: number }) => void;
  onRotateEnd: (offset: { x: number; y: number }) => void;
}

const HANDLE_SIZE = 12;
const ROTATE_PIN_OFFSET = 28;

const HANDLE_STYLES: Record<
  ResizeHandleDirection,
  {
    cursor: string;
    style: React.CSSProperties;
  }
> = {
  n: {
    cursor: "ns-resize",
    style: {
      left: "50%",
      top: -HANDLE_SIZE / 2,
      transform: "translateX(-50%)",
    },
  },
  s: {
    cursor: "ns-resize",
    style: {
      left: "50%",
      bottom: -HANDLE_SIZE / 2,
      transform: "translateX(-50%)",
    },
  },
  e: {
    cursor: "ew-resize",
    style: {
      right: -HANDLE_SIZE / 2,
      top: "50%",
      transform: "translateY(-50%)",
    },
  },
  w: {
    cursor: "ew-resize",
    style: {
      left: -HANDLE_SIZE / 2,
      top: "50%",
      transform: "translateY(-50%)",
    },
  },
  ne: {
    cursor: "nesw-resize",
    style: {
      right: -HANDLE_SIZE / 2,
      top: -HANDLE_SIZE / 2,
    },
  },
  nw: {
    cursor: "nwse-resize",
    style: {
      left: -HANDLE_SIZE / 2,
      top: -HANDLE_SIZE / 2,
    },
  },
  se: {
    cursor: "nwse-resize",
    style: {
      right: -HANDLE_SIZE / 2,
      bottom: -HANDLE_SIZE / 2,
    },
  },
  sw: {
    cursor: "nesw-resize",
    style: {
      left: -HANDLE_SIZE / 2,
      bottom: -HANDLE_SIZE / 2,
    },
  },
};

const stopPointerPropagation = (event: React.PointerEvent<HTMLElement>) => {
  event.preventDefault();
  event.stopPropagation();
};

function ResizeHandle({
  direction,
  onResizeStart,
  onResize,
  onResizeEnd,
}: {
  direction: ResizeHandleDirection;
  onResizeStart: (direction: ResizeHandleDirection) => void;
  onResize: (
    direction: ResizeHandleDirection,
    offset: { x: number; y: number },
  ) => void;
  onResizeEnd: (
    direction: ResizeHandleDirection,
    offset: { x: number; y: number },
  ) => void;
}) {
  const config = HANDLE_STYLES[direction];

  return (
    <motion.button
      type="button"
      onPointerDown={stopPointerPropagation}
      onPanStart={() => onResizeStart(direction)}
      onPan={(_, info: PanInfo) => onResize(direction, info.offset)}
      onPanEnd={(_, info: PanInfo) => onResizeEnd(direction, info.offset)}
      style={{
        position: "absolute",
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        borderRadius: 999,
        border: "2px solid #9810FA",
        background: "#ffffff",
        padding: 0,
        zIndex: 2,
        cursor: config.cursor,
        touchAction: "none",
        pointerEvents: "auto",
        ...config.style,
      }}
      data-transform-handle="true"
    />
  );
}

export function CanvasNodeTransformHandles({
  onResizeStart,
  onResize,
  onResizeEnd,
  onRotateStart,
  onRotate,
  onRotateEnd,
}: Props) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: -ROTATE_PIN_OFFSET + HANDLE_SIZE / 2,
          width: 2,
          height: ROTATE_PIN_OFFSET - HANDLE_SIZE / 2,
          background: "#9810FA",
          transform: "translateX(-50%)",
          pointerEvents: "none",
        }}
      />
      <motion.button
        type="button"
        onPointerDown={stopPointerPropagation}
        onPanStart={() => onRotateStart()}
        onPan={(_, info: PanInfo) => onRotate(info.offset)}
        onPanEnd={(_, info: PanInfo) => onRotateEnd(info.offset)}
        style={{
          position: "absolute",
          left: "50%",
          top: -ROTATE_PIN_OFFSET,
          width: HANDLE_SIZE,
          height: HANDLE_SIZE,
          borderRadius: 999,
          border: "2px solid #9810FA",
          background: "#ffffff",
          transform: "translateX(-50%)",
          padding: 0,
          zIndex: 2,
          cursor: "ew-resize",
          touchAction: "none",
          pointerEvents: "auto",
        }}
        data-transform-handle="true"
      />
      {(Object.keys(HANDLE_STYLES) as ResizeHandleDirection[]).map(
        (direction) => (
          <ResizeHandle
            key={direction}
            direction={direction}
            onResizeStart={onResizeStart}
            onResize={onResize}
            onResizeEnd={onResizeEnd}
          />
        ),
      )}
    </>
  );
}
