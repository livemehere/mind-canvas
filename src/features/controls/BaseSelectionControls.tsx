import { button, useControls } from "leva";
import { useRef } from "react";
import {
  ENTRANCE_ANIMATIONS,
  NODE_TRANSITIONS,
  type CanvasNode,
  type EntranceAnimation,
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
  linkedNodeIds,
  onDetachLinkedNodes,
}: BaseSelectionControlsProps) {
  const sessionsRef = useRef<Record<string, NumericEditSession>>({});
  const isEditingRef = useRef(0);
  const linkedAcrossSnapshots = getSharedValue(
    nodes.map((node) => linkedNodeIds.includes(node.id)),
    false,
  );

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
  const entranceAnimation = getSharedValue<EntranceAnimation>(
    nodes.map((node) => node.entranceAnimation),
    "fade",
  );
  const replayEntranceOnStepChange = getSharedValue(
    nodes.map((node) => node.replayEntranceOnStepChange),
    false,
  );

  const applyNumericChange = (
    key: string,
    nextValue: number,
    getValue: (node: CanvasNode) => number,
    setValue: (node: CanvasNode, value: number) => CanvasNode,
    options?: { commitHistory?: boolean; syncMatchingIds?: boolean },
  ) => {
    const session = sessionsRef.current[key];

    if (session?.mixed && session.source === "drag") {
      const delta = nextValue - session.displayStartValue;

      updateSelectedNodes((node) => {
        const initialValue =
          session.initialValues.get(node.id) ?? getValue(node);
        return setValue(node, initialValue + delta);
      }, options);
      return;
    }

    updateSelectedNodes((node) => setValue(node, nextValue), options);
  };

  const commitSelectedNodes = () => {
    updateSelectedNodes((node) => node, { syncMatchingIds: true });
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
            { commitHistory: false },
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
          commitSelectedNodes();
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
            { commitHistory: false },
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
          commitSelectedNodes();
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
            { commitHistory: false },
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
          commitSelectedNodes();
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
            { commitHistory: false },
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
          commitSelectedNodes();
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
            { commitHistory: false },
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
          commitSelectedNodes();
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
            { commitHistory: false },
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
          commitSelectedNodes();
          clearNumericEditSession(sessionsRef, "base.zIndex");
          endEdit();
        },
      },
      borderColor: {
        value: borderColor.value,
        hint: borderColor.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedNodes();
          endEdit();
        },
        onChange: (
          nextBorderColor: string,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes(
            (node) => ({
              ...node,
              borderColor: nextBorderColor,
            }),
            { commitHistory: false },
          );
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
            { commitHistory: false },
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
          commitSelectedNodes();
          clearNumericEditSession(sessionsRef, "base.borderWidth");
          endEdit();
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
            (node) => ({ ...node, bgColor: nextBgColor }),
            { commitHistory: false },
          );
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
            { commitHistory: false },
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
          commitSelectedNodes();
          clearNumericEditSession(sessionsRef, "base.radius");
          endEdit();
        },
      },
      transition: {
        options: [...NODE_TRANSITIONS],
        value: transition.value,
        hint: transition.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedNodes();
          endEdit();
        },
        onChange: (
          nextTransition: NodeTransition,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes(
            (node) => ({
              ...node,
              transition: nextTransition,
            }),
            { commitHistory: false },
          );
        },
      },
      entranceAnimation: {
        options: [...ENTRANCE_ANIMATIONS],
        value: entranceAnimation.value,
        hint: entranceAnimation.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedNodes();
          endEdit();
        },
        onChange: (
          nextEntranceAnimation: EntranceAnimation,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes(
            (node) => ({
              ...node,
              entranceAnimation: nextEntranceAnimation,
            }),
            { commitHistory: false },
          );
        },
      },
      replayEntranceOnStepChange: {
        value: replayEntranceOnStepChange.value,
        hint: replayEntranceOnStepChange.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedNodes();
          endEdit();
        },
        onChange: (
          nextReplayEntranceOnStepChange: boolean,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedNodes(
            (node) => ({
              ...node,
              replayEntranceOnStepChange: nextReplayEntranceOnStepChange,
            }),
            { commitHistory: false },
          );
        },
      },
      linkedAcrossSnapshots: {
        value: linkedAcrossSnapshots.mixed
          ? "mixed"
          : linkedAcrossSnapshots.value
            ? "linked"
            : "detached",
        editable: false,
      },
      detachSharedId: button(onDetachLinkedNodes, {
        disabled: linkedNodeIds.length === 0,
      }),
    }),
    [
      nodes,
      linkedNodeIds,
      onDetachLinkedNodes,
      linkedAcrossSnapshots.value,
      linkedAcrossSnapshots.mixed,
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
      entranceAnimation.value,
      entranceAnimation.mixed,
      replayEntranceOnStepChange.value,
      replayEntranceOnStepChange.mixed,
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
      entranceAnimation: entranceAnimation.value,
      replayEntranceOnStepChange: replayEntranceOnStepChange.value,
      linkedAcrossSnapshots: linkedAcrossSnapshots.mixed
        ? "mixed"
        : linkedAcrossSnapshots.value
          ? "linked"
          : "detached",
    },
    isEditingRef,
  );

  return null;
}
