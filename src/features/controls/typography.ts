import {
  FONT_STYLE_OPTIONS,
  TEXT_ALIGN_OPTIONS,
  type FontStyle,
  type TextAlign,
  type Typography,
} from "../../core/nodes";
import { MIXED_HINT, getSharedValue, shouldIgnoreLevaChange } from "./shared";
import { type LevaOnChangeContext } from "./types";

export const getTypographySharedValues = <TNode>(
  nodes: TNode[],
  getTypography: (node: TNode) => Typography,
) => ({
  fontSize: getSharedValue(
    nodes.map((node) => getTypography(node).fontSize),
    32,
  ),
  fontFamily: getSharedValue(
    nodes.map((node) => getTypography(node).fontFamily),
    "Inter, sans-serif",
  ),
  fontWeight: getSharedValue(
    nodes.map((node) => getTypography(node).fontWeight),
    600,
  ),
  fontStyle: getSharedValue<FontStyle>(
    nodes.map((node) => getTypography(node).fontStyle),
    "normal",
  ),
  lineHeight: getSharedValue(
    nodes.map((node) => getTypography(node).lineHeight),
    1.2,
  ),
  letterSpacing: getSharedValue(
    nodes.map((node) => getTypography(node).letterSpacing),
    0,
  ),
  textAlign: getSharedValue<TextAlign>(
    nodes.map((node) => getTypography(node).textAlign),
    "left",
  ),
  underline: getSharedValue(
    nodes.map((node) => getTypography(node).underline),
    false,
  ),
  strikethrough: getSharedValue(
    nodes.map((node) => getTypography(node).strikethrough),
    false,
  ),
  strokeWidth: getSharedValue(
    nodes.map((node) => getTypography(node).strokeWidth),
    0,
  ),
  strokeColor: getSharedValue(
    nodes.map((node) => getTypography(node).strokeColor),
    "#000000",
  ),
});

export const typographyDependencyList = (
  typography: ReturnType<typeof getTypographySharedValues>,
) => [
  typography.fontSize.value,
  typography.fontSize.mixed,
  typography.fontFamily.value,
  typography.fontFamily.mixed,
  typography.fontWeight.value,
  typography.fontWeight.mixed,
  typography.fontStyle.value,
  typography.fontStyle.mixed,
  typography.lineHeight.value,
  typography.lineHeight.mixed,
  typography.letterSpacing.value,
  typography.letterSpacing.mixed,
  typography.textAlign.value,
  typography.textAlign.mixed,
  typography.underline.value,
  typography.underline.mixed,
  typography.strikethrough.value,
  typography.strikethrough.mixed,
  typography.strokeWidth.value,
  typography.strokeWidth.mixed,
  typography.strokeColor.value,
  typography.strokeColor.mixed,
];

export const typographySyncValues = (
  typography: ReturnType<typeof getTypographySharedValues>,
) => ({
  fontSize: typography.fontSize.mixed ? 0 : typography.fontSize.value,
  fontFamily: typography.fontFamily.mixed ? "" : typography.fontFamily.value,
  fontWeight: typography.fontWeight.mixed ? 0 : typography.fontWeight.value,
  fontStyle: typography.fontStyle.value,
  lineHeight: typography.lineHeight.mixed ? 0 : typography.lineHeight.value,
  letterSpacing: typography.letterSpacing.mixed ? 0 : typography.letterSpacing.value,
  textAlign: typography.textAlign.value,
  underline: typography.underline.value,
  strikethrough: typography.strikethrough.value,
  strokeWidth: typography.strokeWidth.mixed ? 0 : typography.strokeWidth.value,
  strokeColor: typography.strokeColor.value,
});

export const createTypographyControls = <TNode>({
  prefix,
  typography,
  startEdit,
  endEdit,
  getTypography,
  setTypography,
  applyNumericChange,
  updateNodes,
}: {
  prefix: string;
  typography: ReturnType<typeof getTypographySharedValues>;
  startEdit: () => void;
  endEdit: () => void;
  getTypography: (node: TNode) => Typography;
  setTypography: (node: TNode, typography: Typography) => TNode;
  applyNumericChange: (
    key: string,
    nextValue: number,
    getValue: (node: TNode) => number,
    setValue: (node: TNode, value: number) => TNode,
  ) => void;
  updateNodes: (
    updater: (node: TNode) => TNode,
    context: LevaOnChangeContext,
  ) => void;
}) => ({
  fontSize: {
    value: typography.fontSize.mixed ? 0 : typography.fontSize.value,
    hint: typography.fontSize.mixed ? MIXED_HINT : undefined,
    step: 1,
    min: 8,
    onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
      if (shouldIgnoreLevaChange(context)) return;
      applyNumericChange(
        `${prefix}.fontSize`,
        nextValue,
        (node) => getTypography(node).fontSize,
        (node, value) =>
          setTypography(node, { ...getTypography(node), fontSize: value }),
      );
    },
    onEditStart: startEdit,
    onEditEnd: endEdit,
  },
  fontFamily: {
    value: typography.fontFamily.mixed ? "" : typography.fontFamily.value,
    hint: typography.fontFamily.mixed ? MIXED_HINT : undefined,
    onEditStart: startEdit,
    onEditEnd: endEdit,
    onChange: (nextValue: string, _: string, context: LevaOnChangeContext) => {
      updateNodes(
        (node) =>
          setTypography(node, {
            ...getTypography(node),
            fontFamily: nextValue,
          }),
        context,
      );
    },
  },
  fontWeight: {
    value: typography.fontWeight.mixed ? 0 : typography.fontWeight.value,
    hint: typography.fontWeight.mixed ? MIXED_HINT : undefined,
    step: 100,
    min: 100,
    max: 900,
    onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
      if (shouldIgnoreLevaChange(context)) return;
      applyNumericChange(
        `${prefix}.fontWeight`,
        nextValue,
        (node) => getTypography(node).fontWeight,
        (node, value) =>
          setTypography(node, { ...getTypography(node), fontWeight: value }),
      );
    },
    onEditStart: startEdit,
    onEditEnd: endEdit,
  },
  fontStyle: {
    options: [...FONT_STYLE_OPTIONS],
    value: typography.fontStyle.value,
    hint: typography.fontStyle.mixed ? MIXED_HINT : undefined,
    onEditStart: startEdit,
    onEditEnd: endEdit,
    onChange: (nextValue: FontStyle, _: string, context: LevaOnChangeContext) => {
      updateNodes(
        (node) =>
          setTypography(node, {
            ...getTypography(node),
            fontStyle: nextValue,
          }),
        context,
      );
    },
  },
  lineHeight: {
    value: typography.lineHeight.mixed ? 0 : typography.lineHeight.value,
    hint: typography.lineHeight.mixed ? MIXED_HINT : undefined,
    step: 0.1,
    min: 0,
    onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
      if (shouldIgnoreLevaChange(context)) return;
      applyNumericChange(
        `${prefix}.lineHeight`,
        nextValue,
        (node) => getTypography(node).lineHeight,
        (node, value) =>
          setTypography(node, { ...getTypography(node), lineHeight: value }),
      );
    },
    onEditStart: startEdit,
    onEditEnd: endEdit,
  },
  letterSpacing: {
    value: typography.letterSpacing.mixed ? 0 : typography.letterSpacing.value,
    hint: typography.letterSpacing.mixed ? MIXED_HINT : undefined,
    step: 0.1,
    onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
      if (shouldIgnoreLevaChange(context)) return;
      applyNumericChange(
        `${prefix}.letterSpacing`,
        nextValue,
        (node) => getTypography(node).letterSpacing,
        (node, value) =>
          setTypography(node, {
            ...getTypography(node),
            letterSpacing: value,
          }),
      );
    },
    onEditStart: startEdit,
    onEditEnd: endEdit,
  },
  textAlign: {
    options: [...TEXT_ALIGN_OPTIONS],
    value: typography.textAlign.value,
    hint: typography.textAlign.mixed ? MIXED_HINT : undefined,
    onEditStart: startEdit,
    onEditEnd: endEdit,
    onChange: (nextValue: TextAlign, _: string, context: LevaOnChangeContext) => {
      updateNodes(
        (node) =>
          setTypography(node, {
            ...getTypography(node),
            textAlign: nextValue,
          }),
        context,
      );
    },
  },
  underline: {
    value: typography.underline.value,
    hint: typography.underline.mixed ? MIXED_HINT : undefined,
    onEditStart: startEdit,
    onEditEnd: endEdit,
    onChange: (nextValue: boolean, _: string, context: LevaOnChangeContext) => {
      updateNodes(
        (node) =>
          setTypography(node, {
            ...getTypography(node),
            underline: nextValue,
          }),
        context,
      );
    },
  },
  strikethrough: {
    value: typography.strikethrough.value,
    hint: typography.strikethrough.mixed ? MIXED_HINT : undefined,
    onEditStart: startEdit,
    onEditEnd: endEdit,
    onChange: (nextValue: boolean, _: string, context: LevaOnChangeContext) => {
      updateNodes(
        (node) =>
          setTypography(node, {
            ...getTypography(node),
            strikethrough: nextValue,
          }),
        context,
      );
    },
  },
  strokeWidth: {
    value: typography.strokeWidth.mixed ? 0 : typography.strokeWidth.value,
    hint: typography.strokeWidth.mixed ? MIXED_HINT : undefined,
    step: 1,
    min: 0,
    onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
      if (shouldIgnoreLevaChange(context)) return;
      applyNumericChange(
        `${prefix}.strokeWidth`,
        nextValue,
        (node) => getTypography(node).strokeWidth,
        (node, value) =>
          setTypography(node, { ...getTypography(node), strokeWidth: value }),
      );
    },
    onEditStart: startEdit,
    onEditEnd: endEdit,
  },
  strokeColor: {
    value: typography.strokeColor.value,
    hint: typography.strokeColor.mixed ? MIXED_HINT : undefined,
    onEditStart: startEdit,
    onEditEnd: endEdit,
    onChange: (nextValue: string, _: string, context: LevaOnChangeContext) => {
      updateNodes(
        (node) =>
          setTypography(node, {
            ...getTypography(node),
            strokeColor: nextValue,
          }),
        context,
      );
    },
  },
});
