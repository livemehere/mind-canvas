import { folder, useControls } from "leva";
import { useEffect, useRef } from "react";
import {
  DEFAULT_BOX_SHADOW_STYLE,
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
} from "./shared";
import { consumeControlFocus, focusLevaControlByLabel } from "./focus";
import {
  createTypographyControls,
  getTypographySharedValues,
  typographyDependencyList,
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
  const boxShadowEnabled = getSharedValue(
    nodes.map(
      (node) => node.boxShadow?.enabled ?? DEFAULT_BOX_SHADOW_STYLE.enabled,
    ),
    DEFAULT_BOX_SHADOW_STYLE.enabled,
  );
  const boxShadowX = getSharedValue(
    nodes.map((node) => node.boxShadow?.x ?? DEFAULT_BOX_SHADOW_STYLE.x),
    DEFAULT_BOX_SHADOW_STYLE.x,
  );
  const boxShadowY = getSharedValue(
    nodes.map((node) => node.boxShadow?.y ?? DEFAULT_BOX_SHADOW_STYLE.y),
    DEFAULT_BOX_SHADOW_STYLE.y,
  );
  const boxShadowBlur = getSharedValue(
    nodes.map((node) => node.boxShadow?.blur ?? DEFAULT_BOX_SHADOW_STYLE.blur),
    DEFAULT_BOX_SHADOW_STYLE.blur,
  );
  const boxShadowSpread = getSharedValue(
    nodes.map((node) => node.boxShadow?.spread ?? DEFAULT_BOX_SHADOW_STYLE.spread),
    DEFAULT_BOX_SHADOW_STYLE.spread,
  );
  const boxShadowColor = getSharedValue(
    nodes.map((node) => node.boxShadow?.color ?? DEFAULT_BOX_SHADOW_STYLE.color),
    DEFAULT_BOX_SHADOW_STYLE.color,
  );
  const boxShadowOpacity = getSharedValue(
    nodes.map(
      (node) => node.boxShadow?.opacity ?? DEFAULT_BOX_SHADOW_STYLE.opacity,
    ),
    DEFAULT_BOX_SHADOW_STYLE.opacity,
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

  useControls(
    "Rect",
    () => ({
      size: folder({
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
      }),
      background: folder(
        {
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
        },
        { collapsed: true },
      ),
      boxShadow: folder(
        {
          enabled: {
            value: boxShadowEnabled.value,
            hint: boxShadowEnabled.mixed ? MIXED_HINT : undefined,
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
                  node.type === "rect"
                    ? {
                        ...node,
                        boxShadow: {
                          ...(node.boxShadow ?? DEFAULT_BOX_SHADOW_STYLE),
                          enabled: nextEnabled,
                        },
                      }
                    : node,
                { commitHistory: false },
              );
            },
          },
          x: {
            value: boxShadowX.mixed ? 0 : boxShadowX.value,
            hint: boxShadowX.mixed ? MIXED_HINT : undefined,
            step: 1,
            onChange: (
              nextValue: number,
              _: string,
              context: LevaOnChangeContext,
            ) => {
              if (shouldIgnoreLevaChange(context)) return;
              applyNumericChange(
                "rect.boxShadowX",
                nextValue,
                (node) => node.boxShadow?.x ?? DEFAULT_BOX_SHADOW_STYLE.x,
                (node, value) => ({
                  ...node,
                  boxShadow: {
                    ...(node.boxShadow ?? DEFAULT_BOX_SHADOW_STYLE),
                    x: value,
                  },
                }),
              );
            },
            onEditStart: () => {
              startEdit();
              startNumericEditSession(
                sessionsRef,
                "rect.boxShadowX",
                nodes,
                (node) => node.boxShadow?.x ?? DEFAULT_BOX_SHADOW_STYLE.x,
                boxShadowX.mixed ? 0 : boxShadowX.value,
                boxShadowX.mixed,
              );
            },
            onEditEnd: () => {
              commitSelectedNodes();
              clearNumericEditSession(sessionsRef, "rect.boxShadowX");
              endEdit();
            },
          },
          y: {
            value: boxShadowY.mixed ? 0 : boxShadowY.value,
            hint: boxShadowY.mixed ? MIXED_HINT : undefined,
            step: 1,
            onChange: (
              nextValue: number,
              _: string,
              context: LevaOnChangeContext,
            ) => {
              if (shouldIgnoreLevaChange(context)) return;
              applyNumericChange(
                "rect.boxShadowY",
                nextValue,
                (node) => node.boxShadow?.y ?? DEFAULT_BOX_SHADOW_STYLE.y,
                (node, value) => ({
                  ...node,
                  boxShadow: {
                    ...(node.boxShadow ?? DEFAULT_BOX_SHADOW_STYLE),
                    y: value,
                  },
                }),
              );
            },
            onEditStart: () => {
              startEdit();
              startNumericEditSession(
                sessionsRef,
                "rect.boxShadowY",
                nodes,
                (node) => node.boxShadow?.y ?? DEFAULT_BOX_SHADOW_STYLE.y,
                boxShadowY.mixed ? 0 : boxShadowY.value,
                boxShadowY.mixed,
              );
            },
            onEditEnd: () => {
              commitSelectedNodes();
              clearNumericEditSession(sessionsRef, "rect.boxShadowY");
              endEdit();
            },
          },
          blur: {
            value: boxShadowBlur.mixed ? 0 : boxShadowBlur.value,
            hint: boxShadowBlur.mixed ? MIXED_HINT : undefined,
            step: 1,
            min: 0,
            onChange: (
              nextValue: number,
              _: string,
              context: LevaOnChangeContext,
            ) => {
              if (shouldIgnoreLevaChange(context)) return;
              applyNumericChange(
                "rect.boxShadowBlur",
                nextValue,
                (node) => node.boxShadow?.blur ?? DEFAULT_BOX_SHADOW_STYLE.blur,
                (node, value) => ({
                  ...node,
                  boxShadow: {
                    ...(node.boxShadow ?? DEFAULT_BOX_SHADOW_STYLE),
                    blur: value,
                  },
                }),
              );
            },
            onEditStart: () => {
              startEdit();
              startNumericEditSession(
                sessionsRef,
                "rect.boxShadowBlur",
                nodes,
                (node) => node.boxShadow?.blur ?? DEFAULT_BOX_SHADOW_STYLE.blur,
                boxShadowBlur.mixed ? 0 : boxShadowBlur.value,
                boxShadowBlur.mixed,
              );
            },
            onEditEnd: () => {
              commitSelectedNodes();
              clearNumericEditSession(sessionsRef, "rect.boxShadowBlur");
              endEdit();
            },
          },
          spread: {
            value: boxShadowSpread.mixed ? 0 : boxShadowSpread.value,
            hint: boxShadowSpread.mixed ? MIXED_HINT : undefined,
            step: 1,
            onChange: (
              nextValue: number,
              _: string,
              context: LevaOnChangeContext,
            ) => {
              if (shouldIgnoreLevaChange(context)) return;
              applyNumericChange(
                "rect.boxShadowSpread",
                nextValue,
                (node) => node.boxShadow?.spread ?? DEFAULT_BOX_SHADOW_STYLE.spread,
                (node, value) => ({
                  ...node,
                  boxShadow: {
                    ...(node.boxShadow ?? DEFAULT_BOX_SHADOW_STYLE),
                    spread: value,
                  },
                }),
              );
            },
            onEditStart: () => {
              startEdit();
              startNumericEditSession(
                sessionsRef,
                "rect.boxShadowSpread",
                nodes,
                (node) => node.boxShadow?.spread ?? DEFAULT_BOX_SHADOW_STYLE.spread,
                boxShadowSpread.mixed ? 0 : boxShadowSpread.value,
                boxShadowSpread.mixed,
              );
            },
            onEditEnd: () => {
              commitSelectedNodes();
              clearNumericEditSession(sessionsRef, "rect.boxShadowSpread");
              endEdit();
            },
          },
          shadowColor: {
            value: boxShadowColor.value,
            hint: boxShadowColor.mixed ? MIXED_HINT : undefined,
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
                  node.type === "rect"
                    ? {
                        ...node,
                        boxShadow: {
                          ...(node.boxShadow ?? DEFAULT_BOX_SHADOW_STYLE),
                          color: nextColor,
                        },
                      }
                    : node,
                { commitHistory: false },
              );
            },
          },
          opacity: {
            value: boxShadowOpacity.mixed ? 0 : boxShadowOpacity.value,
            hint: boxShadowOpacity.mixed ? MIXED_HINT : undefined,
            step: 0.01,
            min: 0,
            max: 1,
            onChange: (
              nextValue: number,
              _: string,
              context: LevaOnChangeContext,
            ) => {
              if (shouldIgnoreLevaChange(context)) return;
              applyNumericChange(
                "rect.boxShadowOpacity",
                nextValue,
                (node) =>
                  node.boxShadow?.opacity ?? DEFAULT_BOX_SHADOW_STYLE.opacity,
                (node, value) => ({
                  ...node,
                  boxShadow: {
                    ...(node.boxShadow ?? DEFAULT_BOX_SHADOW_STYLE),
                    opacity: value,
                  },
                }),
              );
            },
            onEditStart: () => {
              startEdit();
              startNumericEditSession(
                sessionsRef,
                "rect.boxShadowOpacity",
                nodes,
                (node) =>
                  node.boxShadow?.opacity ?? DEFAULT_BOX_SHADOW_STYLE.opacity,
                boxShadowOpacity.mixed ? 0 : boxShadowOpacity.value,
                boxShadowOpacity.mixed,
              );
            },
            onEditEnd: () => {
              commitSelectedNodes();
              clearNumericEditSession(sessionsRef, "rect.boxShadowOpacity");
              endEdit();
            },
          },
        },
        { collapsed: true },
      ),
      contentText: folder(
        {
          content: {
            value: content.mixed ? "" : content.value,
            hint: content.mixed ? MIXED_HINT : undefined,
            rows: 3,
            onEditStart: startEdit,
            onEditEnd: () => {
              commitSelectedNodes();
              endEdit();
            },
            onChange: (
              nextValue: string,
              _: string,
              context: LevaOnChangeContext,
            ) => {
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
            onChange: (
              nextValue: string,
              _: string,
              context: LevaOnChangeContext,
            ) => {
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
          typography: folder(
            {
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
            },
            { collapsed: true },
          ),
        },
        { collapsed: false },
      ),
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
      boxShadowEnabled.value,
      boxShadowEnabled.mixed,
      boxShadowX.value,
      boxShadowX.mixed,
      boxShadowY.value,
      boxShadowY.mixed,
      boxShadowBlur.value,
      boxShadowBlur.mixed,
      boxShadowSpread.value,
      boxShadowSpread.mixed,
      boxShadowColor.value,
      boxShadowColor.mixed,
      boxShadowOpacity.value,
      boxShadowOpacity.mixed,
      ...typographyDependencyList(typography),
    ],
  );

  useEffect(() => {
    if (!consumeControlFocus("rect.content")) {
      return;
    }

    focusLevaControlByLabel("contentText.content");
  }, [nodes]);

  return null;
}
