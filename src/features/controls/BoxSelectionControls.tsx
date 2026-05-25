import { folder, useControls } from "leva";
import { useEffect, useRef } from "react";
import {
  BOX_CONTENT_KIND_OPTIONS,
  type BoxNode,
  DEFAULT_BOX_SHADOW_STYLE,
  RECT_BACKGROUND_SIZE_OPTIONS,
  type BoxContentKind,
  type RectBackgroundSize,
} from "../../core/nodes";
import { BOX_COMPONENT_OPTIONS } from "../../components/box/boxComponentRegistry";
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

export function BoxSelectionControls({
  nodes,
  updateSelectedNodes,
}: TypeSelectionControlsProps<BoxNode>) {
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
  const bgColor = getSharedValue(
    nodes.map((node) => node.bgColor),
    "#ffffff",
  );
  const contentKind = getSharedValue<BoxContentKind>(
    nodes.map((node) => node.contentKind),
    "plain",
  );
  const svgContent = getSharedValue(
    nodes.map((node) => node.svgContent),
    "",
  );
  const componentId = getSharedValue(
    nodes.map((node) => node.componentId),
    BOX_COMPONENT_OPTIONS[0] ?? "badge-note",
  );
  const componentPropsText = getSharedValue(
    nodes.map((node) => JSON.stringify(node.componentProps, null, 2)),
    "{}",
  );
  const backgroundSize = getSharedValue<RectBackgroundSize>(
    nodes.map((node) => node.backgroundSize),
    "cover",
  );
  const backgroundEnabled = getSharedValue(
    nodes.map((node) => node.backgroundEnabled),
    true,
  );
  const sanitizeSvg = getSharedValue(
    nodes.map((node) => node.sanitizeSvg),
    true,
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
    getValue: (node: BoxNode) => number,
    setValue: (node: BoxNode, value: number) => BoxNode,
  ) => {
    const session = sessionsRef.current[key];

    if (session?.mixed && session.source === "drag") {
      const delta = nextValue - session.displayStartValue;

      updateSelectedNodes(
        (node) => {
          if (node.type !== "box") return node;
          const initialValue =
            session.initialValues.get(node.id) ?? getValue(node);
          return setValue(node, initialValue + delta);
        },
        { commitHistory: false },
      );
      return;
    }

    updateSelectedNodes(
      (node) => (node.type === "box" ? setValue(node, nextValue) : node),
      { commitHistory: false },
    );
  };

  const updateRectNodes = (
    updater: (node: BoxNode) => BoxNode,
    context: LevaOnChangeContext,
  ) => {
    if (shouldIgnoreLevaChange(context)) return;
    updateSelectedNodes(
      (node) => (node.type === "box" ? updater(node) : node),
      { commitHistory: false },
    );
  };

  useControls(
    "Box",
    () => ({
      kind: {
        options: [...BOX_CONTENT_KIND_OPTIONS],
        value: contentKind.value,
        hint: contentKind.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedNodes();
          endEdit();
        },
        onChange: (
          nextValue: BoxContentKind,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes(
            (node) =>
              node.type === "box"
                ? {
                    ...node,
                    contentKind: nextValue,
                  }
                : node,
            { commitHistory: false },
          );
        },
      },
      size: folder({
        width: {
          value: width.mixed ? 0 : width.value,
          hint: width.mixed ? MIXED_HINT : undefined,
          step: 1,
          min: 1,
          onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
            if (shouldIgnoreLevaChange(context)) return;
            applyNumericChange(
                "box.width",
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
                "box.width",
              nodes,
              (node) => node.size.width,
              width.mixed ? 0 : width.value,
              width.mixed,
            );
          },
          onEditEnd: () => {
            commitSelectedNodes();
              clearNumericEditSession(sessionsRef, "box.width");
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
                "box.height",
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
                "box.height",
              nodes,
              (node) => node.size.height,
              height.mixed ? 0 : height.value,
              height.mixed,
            );
          },
          onEditEnd: () => {
            commitSelectedNodes();
              clearNumericEditSession(sessionsRef, "box.height");
            endEdit();
          },
        },
      }),
      background: folder(
        {
          bgColor: {
            value: bgColor.value,
            hint: bgColor.mixed ? MIXED_HINT : undefined,
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
                  node.type === "box"
                    ? {
                        ...node,
                        bgColor: nextValue,
                      }
                    : node,
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
                  node.type === "box"
                    ? {
                        ...node,
                        backgroundEnabled: nextEnabled,
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
                  node.type === "box"
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
                  node.type === "box"
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
                "box.boxShadowX",
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
                "box.boxShadowX",
                nodes,
                (node) => node.boxShadow?.x ?? DEFAULT_BOX_SHADOW_STYLE.x,
                boxShadowX.mixed ? 0 : boxShadowX.value,
                boxShadowX.mixed,
              );
            },
            onEditEnd: () => {
              commitSelectedNodes();
              clearNumericEditSession(sessionsRef, "box.boxShadowX");
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
                "box.boxShadowY",
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
                "box.boxShadowY",
                nodes,
                (node) => node.boxShadow?.y ?? DEFAULT_BOX_SHADOW_STYLE.y,
                boxShadowY.mixed ? 0 : boxShadowY.value,
                boxShadowY.mixed,
              );
            },
            onEditEnd: () => {
              commitSelectedNodes();
              clearNumericEditSession(sessionsRef, "box.boxShadowY");
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
                "box.boxShadowBlur",
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
                "box.boxShadowBlur",
                nodes,
                (node) => node.boxShadow?.blur ?? DEFAULT_BOX_SHADOW_STYLE.blur,
                boxShadowBlur.mixed ? 0 : boxShadowBlur.value,
                boxShadowBlur.mixed,
              );
            },
            onEditEnd: () => {
              commitSelectedNodes();
              clearNumericEditSession(sessionsRef, "box.boxShadowBlur");
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
                "box.boxShadowSpread",
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
                "box.boxShadowSpread",
                nodes,
                (node) => node.boxShadow?.spread ?? DEFAULT_BOX_SHADOW_STYLE.spread,
                boxShadowSpread.mixed ? 0 : boxShadowSpread.value,
                boxShadowSpread.mixed,
              );
            },
            onEditEnd: () => {
              commitSelectedNodes();
              clearNumericEditSession(sessionsRef, "box.boxShadowSpread");
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
                  node.type === "box"
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
                "box.boxShadowOpacity",
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
                "box.boxShadowOpacity",
                nodes,
                (node) =>
                  node.boxShadow?.opacity ?? DEFAULT_BOX_SHADOW_STYLE.opacity,
                boxShadowOpacity.mixed ? 0 : boxShadowOpacity.value,
                boxShadowOpacity.mixed,
              );
            },
            onEditEnd: () => {
              commitSelectedNodes();
              clearNumericEditSession(sessionsRef, "box.boxShadowOpacity");
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
                  node.type === "box" ? { ...node, content: nextValue } : node,
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
                  node.type === "box"
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
              ...createTypographyControls<BoxNode>({
                prefix: "box.contentTypography",
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
        {
          collapsed: false,
          render: (get) => get("Box.kind") === "plain",
        },
      ),
      svg: folder(
        {
          svgContent: {
            value: svgContent.mixed ? "" : svgContent.value,
            hint: svgContent.mixed ? MIXED_HINT : undefined,
            rows: 8,
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
                  node.type === "box"
                    ? {
                        ...node,
                        svgContent: nextValue,
                      }
                    : node,
                { commitHistory: false },
              );
            },
          },
          sanitize: {
            value: sanitizeSvg.value,
            hint: sanitizeSvg.mixed ? MIXED_HINT : undefined,
            onEditStart: startEdit,
            onEditEnd: () => {
              commitSelectedNodes();
              endEdit();
            },
            onChange: (
              nextValue: boolean,
              _: string,
              context: LevaOnChangeContext,
            ) => {
              if (shouldIgnoreLevaChange(context)) return;
              updateSelectedNodes(
                (node) =>
                  node.type === "box"
                    ? {
                        ...node,
                        sanitizeSvg: nextValue,
                      }
                    : node,
                { commitHistory: false },
              );
            },
          },
        },
        {
          collapsed: false,
          render: (get) => get("Box.kind") === "svg",
        },
      ),
      component: folder(
        {
          componentId: {
            options: BOX_COMPONENT_OPTIONS,
            value: componentId.value,
            hint: componentId.mixed ? MIXED_HINT : undefined,
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
                  node.type === "box"
                    ? {
                        ...node,
                        componentId: nextValue,
                      }
                    : node,
                { commitHistory: false },
              );
            },
          },
          componentProps: {
            value: componentPropsText.mixed ? "" : componentPropsText.value,
            hint: componentPropsText.mixed ? MIXED_HINT : undefined,
            rows: 8,
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
              try {
                const parsed = JSON.parse(nextValue) as Record<string, unknown>;
                if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                  return;
                }

                updateSelectedNodes(
                  (node) =>
                    node.type === "box"
                      ? {
                          ...node,
                          componentProps: parsed,
                        }
                      : node,
                  { commitHistory: false },
                );
              } catch {
                // keep editing flow while json is incomplete
              }
            },
          },
        },
        {
          collapsed: false,
          render: (get) => get("Box.kind") === "component",
        },
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
      bgColor.value,
      bgColor.mixed,
      contentKind.value,
      contentKind.mixed,
      svgContent.value,
      svgContent.mixed,
      componentId.value,
      componentId.mixed,
      componentPropsText.value,
      componentPropsText.mixed,
      contentColor.value,
      contentColor.mixed,
      backgroundSize.value,
      backgroundSize.mixed,
      backgroundEnabled.value,
      backgroundEnabled.mixed,
      sanitizeSvg.value,
      sanitizeSvg.mixed,
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
    if (!consumeControlFocus("box.content")) {
      return;
    }

    focusLevaControlByLabel("contentText.content");
  }, [nodes]);

  return null;
}
