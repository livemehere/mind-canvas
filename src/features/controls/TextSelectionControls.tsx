import { useControls } from "leva";
import { useEffect, useRef } from "react";
import { type TextNode } from "../../core/nodes";
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

export function TextSelectionControls({
  nodes,
  updateSelectedNodes,
}: TypeSelectionControlsProps<TextNode>) {
  const sessionsRef = useRef<Record<string, NumericEditSession>>({});
  const isEditingRef = useRef(0);

  const text = getSharedValue(
    nodes.map((node) => node.text),
    "",
  );
  const color = getSharedValue(
    nodes.map((node) => node.color),
    "#ffffff",
  );
  const paddingX = getSharedValue(
    nodes.map((node) => node.paddingX),
    0,
  );
  const paddingY = getSharedValue(
    nodes.map((node) => node.paddingY),
    0,
  );
  const typography = getTypographySharedValues(nodes, (node) => node.typography);

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
    getValue: (node: TextNode) => number,
    setValue: (node: TextNode, value: number) => TextNode,
  ) => {
    const session = sessionsRef.current[key];

    if (session?.mixed && session.source === "drag") {
      const delta = nextValue - session.displayStartValue;

      updateSelectedNodes(
        (node) => {
          if (node.type !== "text") return node;
          const initialValue =
            session.initialValues.get(node.id) ?? getValue(node);
          return setValue(node, initialValue + delta);
        },
        { commitHistory: false },
      );
      return;
    }

    updateSelectedNodes(
      (node) => (node.type === "text" ? setValue(node, nextValue) : node),
      { commitHistory: false },
    );
  };

  const updateTypographyNodes = (
    updater: (node: TextNode) => TextNode,
    context: LevaOnChangeContext,
  ) => {
    if (shouldIgnoreLevaChange(context)) return;
    updateSelectedNodes(
      (node) => (node.type === "text" ? updater(node) : node),
      { commitHistory: false },
    );
  };

  const [, setControls] = useControls(
    "Text",
    () => ({
      text: {
        value: text.mixed ? "" : text.value,
        hint: text.mixed ? MIXED_HINT : undefined,
        rows: 4,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedNodes();
          endEdit();
        },
        onChange: (
          nextText: string,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes(
            (node) =>
              node.type === "text" ? { ...node, text: nextText } : node,
            { commitHistory: false },
          );
        },
      },
      color: {
        value: color.value,
        hint: color.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedNodes();
          endEdit();
        },
        onChange: (
          nextColor: string,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes(
            (node) =>
              node.type === "text" ? { ...node, color: nextColor } : node,
            { commitHistory: false },
          );
        },
      },
      paddingX: {
        value: paddingX.mixed ? 0 : paddingX.value,
        hint: paddingX.mixed ? MIXED_HINT : undefined,
        step: 1,
        min: 0,
        onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "text.paddingX",
            nextValue,
            (node) => node.paddingX,
            (node, value) => ({ ...node, paddingX: value }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "text.paddingX",
            nodes,
            (node) => node.paddingX,
            paddingX.mixed ? 0 : paddingX.value,
            paddingX.mixed,
          );
        },
        onEditEnd: () => {
          commitSelectedNodes();
          clearNumericEditSession(sessionsRef, "text.paddingX");
          endEdit();
        },
      },
      paddingY: {
        value: paddingY.mixed ? 0 : paddingY.value,
        hint: paddingY.mixed ? MIXED_HINT : undefined,
        step: 1,
        min: 0,
        onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "text.paddingY",
            nextValue,
            (node) => node.paddingY,
            (node, value) => ({ ...node, paddingY: value }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "text.paddingY",
            nodes,
            (node) => node.paddingY,
            paddingY.mixed ? 0 : paddingY.value,
            paddingY.mixed,
          );
        },
        onEditEnd: () => {
          commitSelectedNodes();
          clearNumericEditSession(sessionsRef, "text.paddingY");
          endEdit();
        },
      },
      ...createTypographyControls<TextNode>({
        prefix: "text",
        typography,
        startEdit,
        endEdit: () => {
          commitSelectedNodes();
          endEdit();
        },
        getTypography: (node) => node.typography,
        setTypography: (node, nextTypography) => ({
          ...node,
          typography: nextTypography,
        }),
        applyNumericChange,
        updateNodes: updateTypographyNodes,
      }),
    }),
    [
      nodes,
      text.value,
      text.mixed,
      color.value,
      color.mixed,
      paddingX.value,
      paddingX.mixed,
      paddingY.value,
      paddingY.mixed,
      ...typographyDependencyList(typography),
    ],
  );

  useLevaSync(
    setControls,
    {
      text: text.mixed ? "" : text.value,
      color: color.value,
      paddingX: paddingX.mixed ? 0 : paddingX.value,
      paddingY: paddingY.mixed ? 0 : paddingY.value,
      ...typographySyncValues(typography),
    },
    isEditingRef,
  );

  useEffect(() => {
    if (!consumeControlFocus("text.text")) {
      return;
    }

    focusLevaControlByLabel("text");
  }, [nodes]);

  return null;
}
