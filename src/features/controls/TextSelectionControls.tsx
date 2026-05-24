import { useControls } from "leva";
import { useEffect, useRef } from "react";
import {
  TEXT_ALIGN_OPTIONS,
  type TextAlign,
  type TextNode,
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
  const fontSize = getSharedValue(
    nodes.map((node) => node.typography.fontSize),
    32,
  );
  const fontFamily = getSharedValue(
    nodes.map((node) => node.typography.fontFamily),
    "Inter, sans-serif",
  );
  const fontWeight = getSharedValue(
    nodes.map((node) => node.typography.fontWeight),
    600,
  );
  const lineHeight = getSharedValue(
    nodes.map((node) => node.typography.lineHeight),
    1.2,
  );
  const letterSpacing = getSharedValue(
    nodes.map((node) => node.typography.letterSpacing),
    0,
  );
  const textAlign = getSharedValue<TextAlign>(
    nodes.map((node) => node.typography.textAlign),
    "left",
  );
  const strokeWidth = getSharedValue(
    nodes.map((node) => node.typography.strokeWidth),
    0,
  );
  const strokeColor = getSharedValue(
    nodes.map((node) => node.typography.strokeColor),
    "#000000",
  );

  const applyNumericChange = (
    key: string,
    nextValue: number,
    getValue: (node: TextNode) => number,
    setValue: (node: TextNode, value: number) => TextNode,
  ) => {
    const session = sessionsRef.current[key];

    if (session?.mixed && session.source === "drag") {
      const delta = nextValue - session.displayStartValue;

      updateSelectedNodes((node) => {
        if (node.type !== "text") return node;
        const initialValue =
          session.initialValues.get(node.id) ?? getValue(node);
        return setValue(node, initialValue + delta);
      });
      return;
    }

    updateSelectedNodes((node) =>
      node.type === "text" ? setValue(node, nextValue) : node,
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
      text: {
        value: text.mixed ? "" : text.value,
        hint: text.mixed ? MIXED_HINT : undefined,
        rows: 4,
        onEditStart: startEdit,
        onEditEnd: endEdit,
        onChange: (
          nextText: string,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes((node) =>
            node.type === "text" ? { ...node, text: nextText } : node,
          );
        },
      },
      color: {
        value: color.value,
        hint: color.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: endEdit,
        onChange: (
          nextColor: string,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes((node) =>
            node.type === "text" ? { ...node, color: nextColor } : node,
          );
        },
      },
      fontSize: {
        value: fontSize.mixed ? 0 : fontSize.value,
        hint: fontSize.mixed ? MIXED_HINT : undefined,
        step: 1,
        min: 8,
        onChange: (
          nextFontSize: number,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "text.fontSize",
            nextFontSize,
            (node) => node.typography.fontSize,
            (node, value) => ({
              ...node,
              typography: { ...node.typography, fontSize: value },
            }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "text.fontSize",
            nodes,
            (node) => node.typography.fontSize,
            fontSize.mixed ? 0 : fontSize.value,
            fontSize.mixed,
          );
        },
        onEditEnd: () => {
          clearNumericEditSession(sessionsRef, "text.fontSize");
          endEdit();
        },
      },
      fontFamily: {
        value: fontFamily.mixed ? "" : fontFamily.value,
        hint: fontFamily.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: endEdit,
        onChange: (
          nextFontFamily: string,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes((node) =>
            node.type === "text"
              ? {
                  ...node,
                  typography: {
                    ...node.typography,
                    fontFamily: nextFontFamily,
                  },
                }
              : node,
          );
        },
      },
      fontWeight: {
        value: fontWeight.mixed ? 0 : fontWeight.value,
        hint: fontWeight.mixed ? MIXED_HINT : undefined,
        step: 100,
        min: 100,
        max: 900,
        onChange: (
          nextFontWeight: number,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "text.fontWeight",
            nextFontWeight,
            (node) => node.typography.fontWeight,
            (node, value) => ({
              ...node,
              typography: { ...node.typography, fontWeight: value },
            }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "text.fontWeight",
            nodes,
            (node) => node.typography.fontWeight,
            fontWeight.mixed ? 0 : fontWeight.value,
            fontWeight.mixed,
          );
        },
        onEditEnd: () => {
          clearNumericEditSession(sessionsRef, "text.fontWeight");
          endEdit();
        },
      },
      lineHeight: {
        value: lineHeight.mixed ? 0 : lineHeight.value,
        hint: lineHeight.mixed ? MIXED_HINT : undefined,
        step: 0.1,
        min: 0,
        onChange: (
          nextLineHeight: number,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "text.lineHeight",
            nextLineHeight,
            (node) => node.typography.lineHeight,
            (node, value) => ({
              ...node,
              typography: { ...node.typography, lineHeight: value },
            }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "text.lineHeight",
            nodes,
            (node) => node.typography.lineHeight,
            lineHeight.mixed ? 0 : lineHeight.value,
            lineHeight.mixed,
          );
        },
        onEditEnd: () => {
          clearNumericEditSession(sessionsRef, "text.lineHeight");
          endEdit();
        },
      },
      letterSpacing: {
        value: letterSpacing.mixed ? 0 : letterSpacing.value,
        hint: letterSpacing.mixed ? MIXED_HINT : undefined,
        step: 0.1,
        onChange: (
          nextLetterSpacing: number,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "text.letterSpacing",
            nextLetterSpacing,
            (node) => node.typography.letterSpacing,
            (node, value) => ({
              ...node,
              typography: { ...node.typography, letterSpacing: value },
            }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "text.letterSpacing",
            nodes,
            (node) => node.typography.letterSpacing,
            letterSpacing.mixed ? 0 : letterSpacing.value,
            letterSpacing.mixed,
          );
        },
        onEditEnd: () => {
          clearNumericEditSession(sessionsRef, "text.letterSpacing");
          endEdit();
        },
      },
      textAlign: {
        options: [...TEXT_ALIGN_OPTIONS],
        value: textAlign.value,
        hint: textAlign.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: endEdit,
        onChange: (
          nextTextAlign: TextAlign,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes((node) =>
            node.type === "text"
              ? {
                  ...node,
                  typography: { ...node.typography, textAlign: nextTextAlign },
                }
              : node,
          );
        },
      },
      strokeWidth: {
        value: strokeWidth.mixed ? 0 : strokeWidth.value,
        hint: strokeWidth.mixed ? MIXED_HINT : undefined,
        step: 1,
        min: 0,
        onChange: (
          nextStrokeWidth: number,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "text.strokeWidth",
            nextStrokeWidth,
            (node) => node.typography.strokeWidth,
            (node, value) => ({
              ...node,
              typography: { ...node.typography, strokeWidth: value },
            }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "text.strokeWidth",
            nodes,
            (node) => node.typography.strokeWidth,
            strokeWidth.mixed ? 0 : strokeWidth.value,
            strokeWidth.mixed,
          );
        },
        onEditEnd: () => {
          clearNumericEditSession(sessionsRef, "text.strokeWidth");
          endEdit();
        },
      },
      strokeColor: {
        value: strokeColor.value,
        hint: strokeColor.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: endEdit,
        onChange: (
          nextStrokeColor: string,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes((node) =>
            node.type === "text"
              ? {
                  ...node,
                  typography: {
                    ...node.typography,
                    strokeColor: nextStrokeColor,
                  },
                }
              : node,
          );
        },
      },
    }),
    [
      nodes,
      text.value,
      text.mixed,
      color.value,
      color.mixed,
      fontSize.value,
      fontSize.mixed,
      fontFamily.value,
      fontFamily.mixed,
      fontWeight.value,
      fontWeight.mixed,
      lineHeight.value,
      lineHeight.mixed,
      letterSpacing.value,
      letterSpacing.mixed,
      textAlign.value,
      textAlign.mixed,
      strokeWidth.value,
      strokeWidth.mixed,
      strokeColor.value,
      strokeColor.mixed,
    ],
  );

  useLevaSync(
    setControls,
    {
      text: text.mixed ? "" : text.value,
      color: color.value,
      fontSize: fontSize.mixed ? 0 : fontSize.value,
      fontFamily: fontFamily.mixed ? "" : fontFamily.value,
      fontWeight: fontWeight.mixed ? 0 : fontWeight.value,
      lineHeight: lineHeight.mixed ? 0 : lineHeight.value,
      letterSpacing: letterSpacing.mixed ? 0 : letterSpacing.value,
      textAlign: textAlign.value,
      strokeWidth: strokeWidth.mixed ? 0 : strokeWidth.value,
      strokeColor: strokeColor.value,
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
