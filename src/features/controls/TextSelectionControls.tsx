import { useControls } from "leva";
import { useEffect, useRef } from "react";
import { DEFAULT_TEXT_SHADOW_STYLE, type TextNode } from "../../core/nodes";
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
  const bgColor = getSharedValue(
    nodes.map((node) => node.bgColor),
    "transparent",
  );
  const backgroundEnabled = getSharedValue(
    nodes.map((node) => node.backgroundEnabled),
    true,
  );
  const paddingX = getSharedValue(
    nodes.map((node) => node.paddingX),
    0,
  );
  const paddingY = getSharedValue(
    nodes.map((node) => node.paddingY),
    0,
  );
  const textShadowEnabled = getSharedValue(
    nodes.map((node) => node.textShadow?.enabled ?? DEFAULT_TEXT_SHADOW_STYLE.enabled),
    DEFAULT_TEXT_SHADOW_STYLE.enabled,
  );
  const textShadowX = getSharedValue(
    nodes.map((node) => node.textShadow?.x ?? DEFAULT_TEXT_SHADOW_STYLE.x),
    DEFAULT_TEXT_SHADOW_STYLE.x,
  );
  const textShadowY = getSharedValue(
    nodes.map((node) => node.textShadow?.y ?? DEFAULT_TEXT_SHADOW_STYLE.y),
    DEFAULT_TEXT_SHADOW_STYLE.y,
  );
  const textShadowBlur = getSharedValue(
    nodes.map((node) => node.textShadow?.blur ?? DEFAULT_TEXT_SHADOW_STYLE.blur),
    DEFAULT_TEXT_SHADOW_STYLE.blur,
  );
  const textShadowColor = getSharedValue(
    nodes.map((node) => node.textShadow?.color ?? DEFAULT_TEXT_SHADOW_STYLE.color),
    DEFAULT_TEXT_SHADOW_STYLE.color,
  );
  const textShadowOpacity = getSharedValue(
    nodes.map(
      (node) => node.textShadow?.opacity ?? DEFAULT_TEXT_SHADOW_STYLE.opacity,
    ),
    DEFAULT_TEXT_SHADOW_STYLE.opacity,
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
      bgColor: {
        value: bgColor.value,
        hint: bgColor.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedNodes();
          endEdit();
        },
        onChange: (
          nextBgColor: string,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes(
            (node) =>
              node.type === "text" ? { ...node, bgColor: nextBgColor } : node,
            { commitHistory: false },
          );
        },
      },
      backgroundEnabled: {
        value: backgroundEnabled.value,
        hint: backgroundEnabled.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedNodes();
          endEdit();
        },
        onChange: (
          nextEnabled: boolean,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes(
            (node) =>
              node.type === "text"
                ? { ...node, backgroundEnabled: nextEnabled }
                : node,
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
      textShadowEnabled: {
        value: textShadowEnabled.value,
        hint: textShadowEnabled.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedNodes();
          endEdit();
        },
        onChange: (
          nextEnabled: boolean,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes(
            (node) =>
              node.type === "text"
                ? {
                    ...node,
                    textShadow: {
                      ...(node.textShadow ?? DEFAULT_TEXT_SHADOW_STYLE),
                      enabled: nextEnabled,
                    },
                  }
                : node,
            { commitHistory: false },
          );
        },
      },
      textShadowX: {
        value: textShadowX.mixed ? 0 : textShadowX.value,
        hint: textShadowX.mixed ? MIXED_HINT : undefined,
        step: 1,
        onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "text.textShadowX",
            nextValue,
            (node) => node.textShadow?.x ?? DEFAULT_TEXT_SHADOW_STYLE.x,
            (node, value) => ({
              ...node,
              textShadow: {
                ...(node.textShadow ?? DEFAULT_TEXT_SHADOW_STYLE),
                x: value,
              },
            }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "text.textShadowX",
            nodes,
            (node) => node.textShadow?.x ?? DEFAULT_TEXT_SHADOW_STYLE.x,
            textShadowX.mixed ? 0 : textShadowX.value,
            textShadowX.mixed,
          );
        },
        onEditEnd: () => {
          commitSelectedNodes();
          clearNumericEditSession(sessionsRef, "text.textShadowX");
          endEdit();
        },
      },
      textShadowY: {
        value: textShadowY.mixed ? 0 : textShadowY.value,
        hint: textShadowY.mixed ? MIXED_HINT : undefined,
        step: 1,
        onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "text.textShadowY",
            nextValue,
            (node) => node.textShadow?.y ?? DEFAULT_TEXT_SHADOW_STYLE.y,
            (node, value) => ({
              ...node,
              textShadow: {
                ...(node.textShadow ?? DEFAULT_TEXT_SHADOW_STYLE),
                y: value,
              },
            }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "text.textShadowY",
            nodes,
            (node) => node.textShadow?.y ?? DEFAULT_TEXT_SHADOW_STYLE.y,
            textShadowY.mixed ? 0 : textShadowY.value,
            textShadowY.mixed,
          );
        },
        onEditEnd: () => {
          commitSelectedNodes();
          clearNumericEditSession(sessionsRef, "text.textShadowY");
          endEdit();
        },
      },
      textShadowBlur: {
        value: textShadowBlur.mixed ? 0 : textShadowBlur.value,
        hint: textShadowBlur.mixed ? MIXED_HINT : undefined,
        step: 1,
        min: 0,
        onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "text.textShadowBlur",
            nextValue,
            (node) => node.textShadow?.blur ?? DEFAULT_TEXT_SHADOW_STYLE.blur,
            (node, value) => ({
              ...node,
              textShadow: {
                ...(node.textShadow ?? DEFAULT_TEXT_SHADOW_STYLE),
                blur: value,
              },
            }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "text.textShadowBlur",
            nodes,
            (node) => node.textShadow?.blur ?? DEFAULT_TEXT_SHADOW_STYLE.blur,
            textShadowBlur.mixed ? 0 : textShadowBlur.value,
            textShadowBlur.mixed,
          );
        },
        onEditEnd: () => {
          commitSelectedNodes();
          clearNumericEditSession(sessionsRef, "text.textShadowBlur");
          endEdit();
        },
      },
      textShadowColor: {
        value: textShadowColor.value,
        hint: textShadowColor.mixed ? MIXED_HINT : undefined,
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
              node.type === "text"
                ? {
                    ...node,
                    textShadow: {
                      ...(node.textShadow ?? DEFAULT_TEXT_SHADOW_STYLE),
                      color: nextColor,
                    },
                  }
                : node,
            { commitHistory: false },
          );
        },
      },
      textShadowOpacity: {
        value: textShadowOpacity.mixed ? 0 : textShadowOpacity.value,
        hint: textShadowOpacity.mixed ? MIXED_HINT : undefined,
        step: 0.01,
        min: 0,
        max: 1,
        onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "text.textShadowOpacity",
            nextValue,
            (node) => node.textShadow?.opacity ?? DEFAULT_TEXT_SHADOW_STYLE.opacity,
            (node, value) => ({
              ...node,
              textShadow: {
                ...(node.textShadow ?? DEFAULT_TEXT_SHADOW_STYLE),
                opacity: value,
              },
            }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "text.textShadowOpacity",
            nodes,
            (node) => node.textShadow?.opacity ?? DEFAULT_TEXT_SHADOW_STYLE.opacity,
            textShadowOpacity.mixed ? 0 : textShadowOpacity.value,
            textShadowOpacity.mixed,
          );
        },
        onEditEnd: () => {
          commitSelectedNodes();
          clearNumericEditSession(sessionsRef, "text.textShadowOpacity");
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
      bgColor.value,
      bgColor.mixed,
      backgroundEnabled.value,
      backgroundEnabled.mixed,
      paddingX.value,
      paddingX.mixed,
      paddingY.value,
      paddingY.mixed,
      textShadowEnabled.value,
      textShadowEnabled.mixed,
      textShadowX.value,
      textShadowX.mixed,
      textShadowY.value,
      textShadowY.mixed,
      textShadowBlur.value,
      textShadowBlur.mixed,
      textShadowColor.value,
      textShadowColor.mixed,
      textShadowOpacity.value,
      textShadowOpacity.mixed,
      ...typographyDependencyList(typography),
    ],
  );

  useLevaSync(
    setControls,
    {
      text: text.mixed ? "" : text.value,
      color: color.value,
      bgColor: bgColor.value,
      backgroundEnabled: backgroundEnabled.value,
      paddingX: paddingX.mixed ? 0 : paddingX.value,
      paddingY: paddingY.mixed ? 0 : paddingY.value,
      textShadowEnabled: textShadowEnabled.value,
      textShadowX: textShadowX.mixed ? 0 : textShadowX.value,
      textShadowY: textShadowY.mixed ? 0 : textShadowY.value,
      textShadowBlur: textShadowBlur.mixed ? 0 : textShadowBlur.value,
      textShadowColor: textShadowColor.value,
      textShadowOpacity: textShadowOpacity.mixed ? 0 : textShadowOpacity.value,
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
