import { motion, type PanInfo } from "motion/react";
import { useRef } from "react";

export type ResizeHandleDirection =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

export interface ResizeHandleModifiers {
  altKey: boolean;
}

export interface RotateHandleModifiers {
  shiftKey: boolean;
}

interface Props {
  onResizeStart: (
    direction: ResizeHandleDirection,
    modifiers: ResizeHandleModifiers,
  ) => void;
  onResize: (
    direction: ResizeHandleDirection,
    offset: { x: number; y: number },
    modifiers: ResizeHandleModifiers,
  ) => void;
  onResizeEnd: (
    direction: ResizeHandleDirection,
    offset: { x: number; y: number },
    modifiers: ResizeHandleModifiers,
  ) => void;
  onRotateStart: (modifiers: RotateHandleModifiers) => void;
  onRotate: (
    offset: { x: number; y: number },
    modifiers: RotateHandleModifiers,
  ) => void;
  onRotateEnd: (
    offset: { x: number; y: number },
    modifiers: RotateHandleModifiers,
  ) => void;
  resizeDirections?: ResizeHandleDirection[];
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

const getResizeHandleModifiers = (
  event: PointerEvent | React.PointerEvent<HTMLElement>,
): ResizeHandleModifiers => ({
  altKey: event.altKey,
});

const getRotateHandleModifiers = (
  event: PointerEvent | React.PointerEvent<HTMLElement>,
): RotateHandleModifiers => ({
  shiftKey: event.shiftKey,
});

function ResizeHandle({
  direction,
  onResizeStart,
  onResize,
  onResizeEnd,
}: {
  direction: ResizeHandleDirection;
  onResizeStart: (
    direction: ResizeHandleDirection,
    modifiers: ResizeHandleModifiers,
  ) => void;
  onResize: (
    direction: ResizeHandleDirection,
    offset: { x: number; y: number },
    modifiers: ResizeHandleModifiers,
  ) => void;
  onResizeEnd: (
    direction: ResizeHandleDirection,
    offset: { x: number; y: number },
    modifiers: ResizeHandleModifiers,
  ) => void;
}) {
  const config = HANDLE_STYLES[direction];
  const modifiersRef = useRef<ResizeHandleModifiers>({ altKey: false });
  const dragActiveRef = useRef(false);

  return (
    <motion.button
      type="button"
      onPointerDown={stopPointerPropagation}
      onPanStart={(event) => {
        dragActiveRef.current = true;
        modifiersRef.current = getResizeHandleModifiers(event);
        onResizeStart(direction, modifiersRef.current);
      }}
      onPan={(event, info: PanInfo) => {
        if (!dragActiveRef.current) {
          return;
        }

        modifiersRef.current = getResizeHandleModifiers(event);
        onResize(direction, info.offset, modifiersRef.current);
      }}
      onPanEnd={(event, info: PanInfo) => {
        if (!dragActiveRef.current) {
          return;
        }

        modifiersRef.current = getResizeHandleModifiers(event);
        dragActiveRef.current = false;
        onResizeEnd(direction, info.offset, modifiersRef.current);
      }}
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
  resizeDirections = Object.keys(HANDLE_STYLES) as ResizeHandleDirection[],
}: Props) {
  const rotateModifiersRef = useRef<RotateHandleModifiers>({ shiftKey: false });
  const rotateActiveRef = useRef(false);

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
        onPanStart={(event) => {
          rotateActiveRef.current = true;
          rotateModifiersRef.current = getRotateHandleModifiers(event);
          onRotateStart(rotateModifiersRef.current);
        }}
        onPan={(event, info: PanInfo) => {
          if (!rotateActiveRef.current) {
            return;
          }

          rotateModifiersRef.current = getRotateHandleModifiers(event);
          onRotate(info.offset, rotateModifiersRef.current);
        }}
        onPanEnd={(event, info: PanInfo) => {
          if (!rotateActiveRef.current) {
            return;
          }

          rotateModifiersRef.current = getRotateHandleModifiers(event);
          rotateActiveRef.current = false;
          onRotateEnd(info.offset, rotateModifiersRef.current);
        }}
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
      {resizeDirections.map((direction) => (
          <ResizeHandle
            key={direction}
            direction={direction}
            onResizeStart={onResizeStart}
            onResize={onResize}
            onResizeEnd={onResizeEnd}
          />
        ))}
    </>
  );
}
