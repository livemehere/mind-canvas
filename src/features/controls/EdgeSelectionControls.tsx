import { useControls } from "leva";
import { useRef } from "react";
import {
  EDGE_ANCHOR_OPTIONS,
  EDGE_ENTRANCE_ANIMATIONS,
  EDGE_ROUTE_OPTIONS,
  NODE_TRANSITIONS,
  type CanvasEdge,
  type EdgeAnchor,
  type EdgeEntranceAnimation,
  type EdgeRoute,
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
  type EdgeSelectionControlsProps,
  type LevaOnChangeContext,
  type NumericEditSession,
} from "./types";

export function EdgeSelectionControls({
  edges,
  updateSelectedEdges,
}: EdgeSelectionControlsProps) {
  const sessionsRef = useRef<Record<string, NumericEditSession>>({});
  const isEditingRef = useRef(0);

  const color = getSharedValue(
    edges.map((edge) => edge.color),
    "#ffffff",
  );
  const width = getSharedValue(
    edges.map((edge) => edge.width),
    3,
  );
  const dashed = getSharedValue(
    edges.map((edge) => edge.dashed),
    false,
  );
  const arrowStart = getSharedValue(
    edges.map((edge) => edge.arrowStart),
    false,
  );
  const arrowEnd = getSharedValue(
    edges.map((edge) => edge.arrowEnd),
    true,
  );
  const sourceAnchor = getSharedValue<EdgeAnchor>(
    edges.map((edge) => edge.sourceAnchor ?? "auto"),
    "auto",
  );
  const targetAnchor = getSharedValue<EdgeAnchor>(
    edges.map((edge) => edge.targetAnchor ?? "auto"),
    "auto",
  );
  const route = getSharedValue<EdgeRoute>(
    edges.map((edge) => edge.route ?? "curve"),
    "curve",
  );
  const curve = getSharedValue(
    edges.map((edge) => edge.curve),
    0.32,
  );
  const opacity = getSharedValue(
    edges.map((edge) => edge.opacity),
    1,
  );
  const zIndex = getSharedValue(
    edges.map((edge) => edge.zIndex),
    0,
  );
  const transition = getSharedValue<NodeTransition>(
    edges.map((edge) => edge.transition),
    "spring",
  );
  const entranceAnimation = getSharedValue<EdgeEntranceAnimation>(
    edges.map((edge) => edge.entranceAnimation),
    "draw",
  );
  const replayEntranceOnStepChange = getSharedValue(
    edges.map((edge) => edge.replayEntranceOnStepChange),
    false,
  );

  const startEdit = () => {
    isEditingRef.current += 1;
  };

  const endEdit = () => {
    isEditingRef.current = Math.max(0, isEditingRef.current - 1);
  };

  const commitSelectedEdges = () => {
    updateSelectedEdges((edge) => edge, { syncMatchingIds: true });
  };

  const applyNumericChange = (
    key: string,
    nextValue: number,
    getValue: (edge: CanvasEdge) => number,
    setValue: (edge: CanvasEdge, value: number) => CanvasEdge,
  ) => {
    const session = sessionsRef.current[key];

    if (session?.mixed && session.source === "drag") {
      const delta = nextValue - session.displayStartValue;

      updateSelectedEdges(
        (edge) => {
          const initialValue = session.initialValues.get(edge.id) ?? getValue(edge);
          return setValue(edge, initialValue + delta);
        },
        { commitHistory: false },
      );
      return;
    }

    updateSelectedEdges((edge) => setValue(edge, nextValue), {
      commitHistory: false,
    });
  };

  const [, setControls] = useControls(
    "Edge",
    () => ({
      color: {
        value: color.value,
        hint: color.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedEdges();
          endEdit();
        },
        onChange: (nextValue: string, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedEdges((edge) => ({ ...edge, color: nextValue }), {
            commitHistory: false,
          });
        },
      },
      width: {
        value: width.mixed ? 0 : width.value,
        hint: width.mixed ? MIXED_HINT : undefined,
        step: 1,
        min: 1,
        onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "edge.width",
            nextValue,
            (edge) => edge.width,
            (edge, value) => ({ ...edge, width: value }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "edge.width",
            edges,
            (edge) => edge.width,
            width.mixed ? 0 : width.value,
            width.mixed,
          );
        },
        onEditEnd: () => {
          commitSelectedEdges();
          clearNumericEditSession(sessionsRef, "edge.width");
          endEdit();
        },
      },
      dashed: {
        value: dashed.value,
        hint: dashed.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedEdges();
          endEdit();
        },
        onChange: (nextValue: boolean, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedEdges((edge) => ({ ...edge, dashed: nextValue }), {
            commitHistory: false,
          });
        },
      },
      arrowStart: {
        value: arrowStart.value,
        hint: arrowStart.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedEdges();
          endEdit();
        },
        onChange: (nextValue: boolean, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedEdges((edge) => ({ ...edge, arrowStart: nextValue }), {
            commitHistory: false,
          });
        },
      },
      arrowEnd: {
        value: arrowEnd.value,
        hint: arrowEnd.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedEdges();
          endEdit();
        },
        onChange: (nextValue: boolean, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedEdges((edge) => ({ ...edge, arrowEnd: nextValue }), {
            commitHistory: false,
          });
        },
      },
      sourceAnchor: {
        options: [...EDGE_ANCHOR_OPTIONS],
        value: sourceAnchor.value,
        hint: sourceAnchor.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedEdges();
          endEdit();
        },
        onChange: (nextValue: EdgeAnchor, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedEdges((edge) => ({ ...edge, sourceAnchor: nextValue }), {
            commitHistory: false,
          });
        },
      },
      targetAnchor: {
        options: [...EDGE_ANCHOR_OPTIONS],
        value: targetAnchor.value,
        hint: targetAnchor.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedEdges();
          endEdit();
        },
        onChange: (nextValue: EdgeAnchor, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedEdges((edge) => ({ ...edge, targetAnchor: nextValue }), {
            commitHistory: false,
          });
        },
      },
      route: {
        options: [...EDGE_ROUTE_OPTIONS],
        value: route.value,
        hint: route.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedEdges();
          endEdit();
        },
        onChange: (nextValue: EdgeRoute, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedEdges((edge) => ({ ...edge, route: nextValue }), {
            commitHistory: false,
          });
        },
      },
      curve: {
        value: curve.mixed ? 0 : curve.value,
        hint: curve.mixed ? MIXED_HINT : undefined,
        step: 0.01,
        min: 0,
        max: 1,
        onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "edge.curve",
            nextValue,
            (edge) => edge.curve,
            (edge, value) => ({
              ...edge,
              route: "curve",
              curve: value,
            }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "edge.curve",
            edges,
            (edge) => edge.curve,
            curve.mixed ? 0 : curve.value,
            curve.mixed,
          );
        },
        onEditEnd: () => {
          commitSelectedEdges();
          clearNumericEditSession(sessionsRef, "edge.curve");
          endEdit();
        },
      },
      opacity: {
        value: opacity.mixed ? 0 : opacity.value,
        hint: opacity.mixed ? MIXED_HINT : undefined,
        step: 0.01,
        min: 0,
        max: 1,
        onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "edge.opacity",
            nextValue,
            (edge) => edge.opacity,
            (edge, value) => ({ ...edge, opacity: value }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "edge.opacity",
            edges,
            (edge) => edge.opacity,
            opacity.mixed ? 0 : opacity.value,
            opacity.mixed,
          );
        },
        onEditEnd: () => {
          commitSelectedEdges();
          clearNumericEditSession(sessionsRef, "edge.opacity");
          endEdit();
        },
      },
      zIndex: {
        value: zIndex.mixed ? 0 : zIndex.value,
        hint: zIndex.mixed ? MIXED_HINT : undefined,
        step: 1,
        onChange: (nextValue: number, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          applyNumericChange(
            "edge.zIndex",
            nextValue,
            (edge) => edge.zIndex,
            (edge, value) => ({ ...edge, zIndex: value }),
          );
        },
        onEditStart: () => {
          startEdit();
          startNumericEditSession(
            sessionsRef,
            "edge.zIndex",
            edges,
            (edge) => edge.zIndex,
            zIndex.mixed ? 0 : zIndex.value,
            zIndex.mixed,
          );
        },
        onEditEnd: () => {
          commitSelectedEdges();
          clearNumericEditSession(sessionsRef, "edge.zIndex");
          endEdit();
        },
      },
      transition: {
        options: [...NODE_TRANSITIONS],
        value: transition.value,
        hint: transition.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedEdges();
          endEdit();
        },
        onChange: (
          nextValue: NodeTransition,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedEdges((edge) => ({ ...edge, transition: nextValue }), {
            commitHistory: false,
          });
        },
      },
      entranceAnimation: {
        options: [...EDGE_ENTRANCE_ANIMATIONS],
        value: entranceAnimation.value,
        hint: entranceAnimation.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedEdges();
          endEdit();
        },
        onChange: (
          nextValue: EdgeEntranceAnimation,
          _: string,
          context: LevaOnChangeContext,
        ) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedEdges(
            (edge) => ({ ...edge, entranceAnimation: nextValue }),
            { commitHistory: false },
          );
        },
      },
      replayEntranceOnStepChange: {
        value: replayEntranceOnStepChange.value,
        hint: replayEntranceOnStepChange.mixed ? MIXED_HINT : undefined,
        onEditStart: startEdit,
        onEditEnd: () => {
          commitSelectedEdges();
          endEdit();
        },
        onChange: (nextValue: boolean, _: string, context: LevaOnChangeContext) => {
          if (shouldIgnoreLevaChange(context)) return;
          updateSelectedEdges(
            (edge) => ({ ...edge, replayEntranceOnStepChange: nextValue }),
            { commitHistory: false },
          );
        },
      },
    }),
    [
      edges,
      color.value,
      color.mixed,
      width.value,
      width.mixed,
      dashed.value,
      dashed.mixed,
      arrowStart.value,
      arrowStart.mixed,
      arrowEnd.value,
      arrowEnd.mixed,
      sourceAnchor.value,
      sourceAnchor.mixed,
      targetAnchor.value,
      targetAnchor.mixed,
      route.value,
      route.mixed,
      curve.value,
      curve.mixed,
      opacity.value,
      opacity.mixed,
      zIndex.value,
      zIndex.mixed,
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
      color: color.value,
      width: width.mixed ? 0 : width.value,
      dashed: dashed.value,
      arrowStart: arrowStart.value,
      arrowEnd: arrowEnd.value,
      sourceAnchor: sourceAnchor.value,
      targetAnchor: targetAnchor.value,
      route: route.value,
      curve: curve.mixed ? 0 : curve.value,
      opacity: opacity.mixed ? 0 : opacity.value,
      zIndex: zIndex.mixed ? 0 : zIndex.value,
      transition: transition.value,
      entranceAnimation: entranceAnimation.value,
      replayEntranceOnStepChange: replayEntranceOnStepChange.value,
    },
    isEditingRef,
  );

  return null;
}
