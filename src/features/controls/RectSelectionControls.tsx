import { useControls } from "leva";
import { useEffect, useRef } from "react";
import {
  RECT_BACKGROUND_SIZE_OPTIONS,
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
  createTypographyControls,
  getTypographySharedValues,
  typographyDependencyList,
  typographySyncValues,
} from "./typography";
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
  const backgroundSize = getSharedValue<RectBackgroundSize>(
    nodes.map((node) => node.backgroundSize),
    "cover",
  );
  const contentColor = getSharedValue(
    nodes.map((node) => node.contentTypography.color),
    "#000000",
  );
  const typography = getTypographySharedValues(
    nodes,
    (node) => node.contentTypography,
  );

  const commitSelectedNodes = () => {
    updateSelectedNodes((node) => node, { syncMatchingIds: true });
  };

  const startEdit = () => {
    isEditingRef.current += 1;
  };

  const endEdit = () => {
    isEditingRef.current = Math.max(0, isEditingRef.current - 1);
  };

  const applyNumericChange = (
    key: string,
    nextValue: number,
    getValue: (node: RectNode) => number,
    setValue: (node: RectNode, value: number) => RectNode,
  ) => {
    const session = sessionsRef.current[key];

    if (session?.mixed && session.source === "drag") {
      const delta = nextValue - session.displayStartValue;

      updateSelectedNodes(
        (node) => {
          if (node.type !== "rect") return node;
          const initialValue =
            session.initialValues.get(node.id) ?? getValue(node);
          return setValue(node, initialValue + delta);
        },
        { commitHistory: false },
      );
      return;
    }

    updateSelectedNodes(
      (node) => (node.type === "rect" ? setValue(node, nextValue) : node),
      { commitHistory: false },
    );
  };

  const updateRectNodes = (
    updater: (node: RectNode) => RectNode,
    context: LevaOnChangeContext,
  ) => {
    if (shouldIgnoreLevaChange(context)) return;
    updateSelectedNodes(
      (node) => (node.type === "rect" ? updater(node) : node),
      { commitHistory: false },
    );
  };

  const [, setControls] = useControls(
    "Rect",
    () => ({
      width: {
        value: width.mixed ? 0 : width.value,
        hint: width.mixed ? MIXED_HINT : undefined,
        step: 1,
        min: 1,
        onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "rect.width",
            nextValue,
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
          commitSelectedNodes();
          clearNumericEditSession(sessionsRef, "rect.width");
          endEdit();
        },
      },
      height: {
        value: height.mixed ? 0 : height.value,
        hint: height.mixed ? MIXED_HINT : undefined,
        step: 1,
        min: 1,
        onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "rect.height",
            nextValue,
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
          commitSelectedNodes();
          clearNumericEditSession(sessionsRef, "rect.height");
          endEdit();
        },
      },
      content: {
        value: content.mixed ? "" : content.value,
        hint: content.mixed ? MIXED_HINT : undefined,
        rows: 3,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedNodes();
          endEdit();
        },
        onChange: (nextValue: string, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes(
            (node) =>
              node.type === "rect" ? { ...node, content: nextValue } : node,
            { commitHistory: false },
          );
        },
      },
      contentColor: {
        value: contentColor.value,
        hint: contentColor.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedNodes();
          endEdit();
        },
        onChange: (nextValue: string, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes(
            (node) =>
              node.type === "rect"
                ? {
                    ...node,
                    contentTypography: {
                      ...node.contentTypography,
                      color: nextValue,
                    },
                  }
                : node,
            { commitHistory: false },
          );
        },
      },
      backgroundSize: {
        options: [...RECT_BACKGROUND_SIZE_OPTIONS],
        value: backgroundSize.value,
        hint: backgroundSize.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedNodes();
          endEdit();
        },
        onChange: (
          nextValue: RectBackgroundSize,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes(
            (node) =>
              node.type === "rect"
                ? {
                    ...node,
                    backgroundSize: nextValue,
                  }
                : node,
            { commitHistory: false },
          );
        },
      },
      ...createTypographyControls<RectNode>({
        prefix: "rect.contentTypography",
        typography,
        startEdit,
        endEdit: () => {
          commitSelectedNodes();
          endEdit();
        },
        getTypography: (node) => node.contentTypography,
        setTypography: (node, nextTypography) => ({
          ...node,
          contentTypography: {
            ...nextTypography,
            color: node.contentTypography.color,
          },
        }),
        applyNumericChange,
        updateNodes: updateRectNodes,
      }),
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
      ...typographyDependencyList(typography),
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
      ...typographySyncValues(typography),
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
