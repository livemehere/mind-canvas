import { useControls } from "leva";
import { useRef } from "react";
import {
  NODE_TRANSITIONS,
  type CanvasNode,
  type NodeTransition,
} from "../../core/nodes";
import {
  MIXED_HINT,
  clearNumericEditSession,
  getSharedValue,
  shouldIgnoreLevaChange,
  startNumericEditSession,
  useLevaSync,
} from "./shared";
import {
  type BaseSelectionControlsProps,
  type LevaOnChangeContext,
  type NumericEditSession,
} from "./types";

export function BaseSelectionControls({
  nodes,
  updateSelectedNodes,
}: BaseSelectionControlsProps) {
  const sessionsRef = useRef<Record<string, NumericEditSession>>({});
  const isEditingRef = useRef(0);

  const positionX = getSharedValue(
    nodes.map((node) => node.position.x),
    0,
  );
  const positionY = getSharedValue(
    nodes.map((node) => node.position.y),
    0,
  );
  const opacity = getSharedValue(
    nodes.map((node) => node.opacity),
    1,
  );
  const scale = getSharedValue(
    nodes.map((node) => node.scale),
    1,
  );
  const rotate = getSharedValue(
    nodes.map((node) => node.rotate),
    0,
  );
  const zIndex = getSharedValue(
    nodes.map((node) => node.zIndex),
    0,
  );
  const borderColor = getSharedValue(
    nodes.map((node) => node.borderColor),
    "#ffffff",
  );
  const borderWidth = getSharedValue(
    nodes.map((node) => node.borderWidth),
    0,
  );
  const bgColor = getSharedValue(
    nodes.map((node) => node.bgColor),
    "#ffffff",
  );
  const radius = getSharedValue(
    nodes.map((node) => node.radius),
    0,
  );
  const transition = getSharedValue<NodeTransition>(
    nodes.map((node) => node.transition),
    "spring",
  );

  const applyNumericChange = (
    key: string,
    nextValue: number,
    getValue: (node: CanvasNode) => number,
    setValue: (node: CanvasNode, value: number) => CanvasNode,
  ) => {
    const session = sessionsRef.current[key];

    if (session?.mixed && session.source === "drag") {
      const delta = nextValue - session.displayStartValue;

      updateSelectedNodes((node) => {
        const initialValue =
          session.initialValues.get(node.id) ?? getValue(node);
        return setValue(node, initialValue + delta);
      });
      return;
    }

    updateSelectedNodes((node) => setValue(node, nextValue));
  };

  const startEdit = () => {
    isEditingRef.current += 1;
  };

  const endEdit = () => {
    isEditingRef.current = Math.max(0, isEditingRef.current - 1);
  };

  const [, setControls] = useControls(
    () => ({
      positionX: {
        value: positionX.mixed ? 0 : positionX.value,
        hint: positionX.mixed ? MIXED_HINT : undefined,
        step: 1,
        onChange: (nextX: number, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "base.positionX",
            nextX,
            (node) => node.position.x,
            (node, value) => ({
              ...node,
              position: { ...node.position, x: value },
            }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "base.positionX",
            nodes,
            (node) => node.position.x,
            positionX.mixed ? 0 : positionX.value,
            positionX.mixed,
          );
        },
        onEditEnd: () => {
          clearNumericEditSession(sessionsRef, "base.positionX");
          endEdit();
        },
      },
      positionY: {
        value: positionY.mixed ? 0 : positionY.value,
        hint: positionY.mixed ? MIXED_HINT : undefined,
        step: 1,
        onChange: (nextY: number, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "base.positionY",
            nextY,
            (node) => node.position.y,
            (node, value) => ({
              ...node,
              position: { ...node.position, y: value },
            }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "base.positionY",
            nodes,
            (node) => node.position.y,
            positionY.mixed ? 0 : positionY.value,
            positionY.mixed,
          );
        },
        onEditEnd: () => {
          clearNumericEditSession(sessionsRef, "base.positionY");
          endEdit();
        },
      },
      opacity: {
        value: opacity.mixed ? 0 : opacity.value,
        hint: opacity.mixed ? MIXED_HINT : undefined,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: (
          nextOpacity: number,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "base.opacity",
            nextOpacity,
            (node) => node.opacity,
            (node, value) => ({ ...node, opacity: value }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "base.opacity",
            nodes,
            (node) => node.opacity,
            opacity.mixed ? 0 : opacity.value,
            opacity.mixed,
          );
        },
        onEditEnd: () => {
          clearNumericEditSession(sessionsRef, "base.opacity");
          endEdit();
        },
      },
      scale: {
        value: scale.mixed ? 0 : scale.value,
        hint: scale.mixed ? MIXED_HINT : undefined,
        step: 0.1,
        onChange: (
          nextScale: number,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "base.scale",
            nextScale,
            (node) => node.scale,
            (node, value) => ({ ...node, scale: value }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "base.scale",
            nodes,
            (node) => node.scale,
            scale.mixed ? 0 : scale.value,
            scale.mixed,
          );
        },
        onEditEnd: () => {
          clearNumericEditSession(sessionsRef, "base.scale");
          endEdit();
        },
      },
      rotate: {
        value: rotate.mixed ? 0 : rotate.value,
        hint: rotate.mixed ? MIXED_HINT : undefined,
        step: 1,
        onChange: (
          nextRotate: number,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "base.rotate",
            nextRotate,
            (node) => node.rotate,
            (node, value) => ({ ...node, rotate: value }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "base.rotate",
            nodes,
            (node) => node.rotate,
            rotate.mixed ? 0 : rotate.value,
            rotate.mixed,
          );
        },
        onEditEnd: () => {
          clearNumericEditSession(sessionsRef, "base.rotate");
          endEdit();
        },
      },
      zIndex: {
        value: zIndex.mixed ? 0 : zIndex.value,
        hint: zIndex.mixed ? MIXED_HINT : undefined,
        step: 1,
        onChange: (
          nextZIndex: number,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "base.zIndex",
            nextZIndex,
            (node) => node.zIndex,
            (node, value) => ({ ...node, zIndex: value }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "base.zIndex",
            nodes,
            (node) => node.zIndex,
            zIndex.mixed ? 0 : zIndex.value,
            zIndex.mixed,
          );
        },
        onEditEnd: () => {
          clearNumericEditSession(sessionsRef, "base.zIndex");
          endEdit();
        },
      },
      borderColor: {
        value: borderColor.value,
        hint: borderColor.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: endEdit,
        onChange: (
          nextBorderColor: string,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes((node) => ({
            ...node,
            borderColor: nextBorderColor,
          }));
        },
      },
      borderWidth: {
        value: borderWidth.mixed ? 0 : borderWidth.value,
        hint: borderWidth.mixed ? MIXED_HINT : undefined,
        step: 1,
        min: 0,
        onChange: (
          nextBorderWidth: number,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "base.borderWidth",
            nextBorderWidth,
            (node) => node.borderWidth,
            (node, value) => ({ ...node, borderWidth: value }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "base.borderWidth",
            nodes,
            (node) => node.borderWidth,
            borderWidth.mixed ? 0 : borderWidth.value,
            borderWidth.mixed,
          );
        },
        onEditEnd: () => {
          clearNumericEditSession(sessionsRef, "base.borderWidth");
          endEdit();
        },
      },
      bgColor: {
        value: bgColor.value,
        hint: bgColor.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: endEdit,
        onChange: (
          nextBgColor: string,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes((node) => ({ ...node, bgColor: nextBgColor }));
        },
      },
      radius: {
        value: radius.mixed ? 0 : radius.value,
        hint: radius.mixed ? MIXED_HINT : undefined,
        step: 1,
        min: 0,
        onChange: (
          nextRadius: number,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "base.radius",
            nextRadius,
            (node) => node.radius,
            (node, value) => ({ ...node, radius: value }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "base.radius",
            nodes,
            (node) => node.radius,
            radius.mixed ? 0 : radius.value,
            radius.mixed,
          );
        },
        onEditEnd: () => {
          clearNumericEditSession(sessionsRef, "base.radius");
          endEdit();
        },
      },
      transition: {
        options: [...NODE_TRANSITIONS],
        value: transition.value,
        hint: transition.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: endEdit,
        onChange: (
          nextTransition: NodeTransition,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes((node) => ({
            ...node,
            transition: nextTransition,
          }));
        },
      },
    }),
    [
      nodes,
      positionX.value,
      positionX.mixed,
      positionY.value,
      positionY.mixed,
      opacity.value,
      opacity.mixed,
      scale.value,
      scale.mixed,
      rotate.value,
      rotate.mixed,
      zIndex.value,
      zIndex.mixed,
      borderColor.value,
      borderColor.mixed,
      borderWidth.value,
      borderWidth.mixed,
      bgColor.value,
      bgColor.mixed,
      radius.value,
      radius.mixed,
      transition.value,
      transition.mixed,
    ],
  );

  useLevaSync(
    setControls,
    {
      positionX: positionX.mixed ? 0 : positionX.value,
      positionY: positionY.mixed ? 0 : positionY.value,
      opacity: opacity.mixed ? 0 : opacity.value,
      scale: scale.mixed ? 0 : scale.value,
      rotate: rotate.mixed ? 0 : rotate.value,
      zIndex: zIndex.mixed ? 0 : zIndex.value,
      borderColor: borderColor.value,
      borderWidth: borderWidth.mixed ? 0 : borderWidth.value,
      bgColor: bgColor.value,
      radius: radius.mixed ? 0 : radius.value,
      transition: transition.value,
    },
    isEditingRef,
  );

  return null;
}
