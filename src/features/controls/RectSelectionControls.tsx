import { useControls } from "leva";
import { useEffect, useRef } from "react";
import {
  RECT_BACKGROUND_SIZE_OPTIONS,
  RECT_CONTENT_COLOR_OPTIONS,
  type RectBackgroundSize,
  type RectNode,
} from "../../core/nodes";
import {
  MIXED_HINT,
  clearNumericEditSession,
  getSharedValue,
  shouldIgnoreLevaChange,
  startNumericEditSession,
  useLevaSync,
} from "./shared";
import { consumeControlFocus, focusLevaControlByLabel } from "./focus";
import {
  type LevaOnChangeContext,
  type NumericEditSession,
  type TypeSelectionControlsProps,
} from "./types";

export function RectSelectionControls({
  nodes,
  updateSelectedNodes,
}: TypeSelectionControlsProps<RectNode>) {
  const sessionsRef = useRef<Record<string, NumericEditSession>>({});
  const isEditingRef = useRef(0);

  const width = getSharedValue(
    nodes.map((node) => node.size.width),
    100,
  );
  const height = getSharedValue(
    nodes.map((node) => node.size.height),
    100,
  );
  const content = getSharedValue(
    nodes.map((node) => node.content),
    "",
  );
  const contentColor = getSharedValue(
    nodes.map((node) => node.contentTypography.color),
    RECT_CONTENT_COLOR_OPTIONS.black,
  );
  const backgroundSize = getSharedValue<RectBackgroundSize>(
    nodes.map((node) => node.backgroundSize),
    "cover",
  );

  const applyNumericChange = (
    key: string,
    nextValue: number,
    getValue: (node: RectNode) => number,
    setValue: (node: RectNode, value: number) => RectNode,
  ) => {
    const session = sessionsRef.current[key];

    if (session?.mixed && session.source === "drag") {
      const delta = nextValue - session.displayStartValue;

      updateSelectedNodes((node) => {
        if (node.type !== "rect") return node;
        const initialValue =
          session.initialValues.get(node.id) ?? getValue(node);
        return setValue(node, initialValue + delta);
      });
      return;
    }

    updateSelectedNodes((node) =>
      node.type === "rect" ? setValue(node, nextValue) : node,
    );
  };

  const startEdit = () => {
    isEditingRef.current += 1;
  };

  const endEdit = () => {
    isEditingRef.current = Math.max(0, isEditingRef.current - 1);
  };

  const [, setControls] = useControls(
    () => ({
      width: {
        value: width.mixed ? 0 : width.value,
        hint: width.mixed ? MIXED_HINT : undefined,
        step: 1,
        min: 1,
        onChange: (
          nextWidth: number,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "rect.width",
            nextWidth,
            (node) => node.size.width,
            (node, value) => ({
              ...node,
              size: { ...node.size, width: value },
            }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "rect.width",
            nodes,
            (node) => node.size.width,
            width.mixed ? 0 : width.value,
            width.mixed,
          );
        },
        onEditEnd: () => {
          clearNumericEditSession(sessionsRef, "rect.width");
          endEdit();
        },
      },
      height: {
        value: height.mixed ? 0 : height.value,
        hint: height.mixed ? MIXED_HINT : undefined,
        step: 1,
        min: 1,
        onChange: (
          nextHeight: number,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "rect.height",
            nextHeight,
            (node) => node.size.height,
            (node, value) => ({
              ...node,
              size: { ...node.size, height: value },
            }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "rect.height",
            nodes,
            (node) => node.size.height,
            height.mixed ? 0 : height.value,
            height.mixed,
          );
        },
        onEditEnd: () => {
          clearNumericEditSession(sessionsRef, "rect.height");
          endEdit();
        },
      },
      content: {
        value: content.mixed ? "" : content.value,
        hint: content.mixed ? MIXED_HINT : undefined,
        rows: 3,
        onEditStart: startEdit,
        onEditEnd: endEdit,
        onChange: (
          nextContent: string,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes((node) =>
            node.type === "rect" ? { ...node, content: nextContent } : node,
          );
        },
      },
      contentColor: {
        options: RECT_CONTENT_COLOR_OPTIONS,
        value: contentColor.value,
        hint: contentColor.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: endEdit,
        onChange: (
          nextContentColor: string,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes((node) =>
            node.type === "rect"
              ? {
                  ...node,
                  contentTypography: {
                    ...node.contentTypography,
                    color: nextContentColor,
                  },
                }
              : node,
          );
        },
      },
      backgroundSize: {
        options: [...RECT_BACKGROUND_SIZE_OPTIONS],
        value: backgroundSize.value,
        hint: backgroundSize.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: endEdit,
        onChange: (
          nextBackgroundSize: RectBackgroundSize,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes((node) =>
            node.type === "rect"
              ? {
                  ...node,
                  backgroundSize: nextBackgroundSize,
                }
              : node,
          );
        },
      },
    }),
    [
      nodes,
      width.value,
      width.mixed,
      height.value,
      height.mixed,
      content.value,
      content.mixed,
      contentColor.value,
      contentColor.mixed,
      backgroundSize.value,
      backgroundSize.mixed,
    ],
  );

  useLevaSync(
    setControls,
    {
      width: width.mixed ? 0 : width.value,
      height: height.mixed ? 0 : height.value,
      content: content.mixed ? "" : content.value,
      contentColor: contentColor.value,
      backgroundSize: backgroundSize.value,
    },
    isEditingRef,
  );

  useEffect(() => {
    if (!consumeControlFocus("rect.content")) {
      return;
    }

    focusLevaControlByLabel("content");
  }, [nodes]);

  return null;
}
