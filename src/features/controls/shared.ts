import { useEffect } from "react";
import { type CanvasNode } from "../../core/nodes";
import {
  type LevaOnChangeContext,
  type NumericEditSession,
  type SharedValue,
} from "./types";

export type LevaSetter = (values: Record<string, unknown>) => void;

export const MIXED_HINT = "Mixed values";

export const getSharedValue = <T>(values: T[], fallback: T): SharedValue<T> => {
  if (values.length === 0) {
    return { value: fallback, mixed: false };
  }

  const [firstValue, ...restValues] = values;

  return {
    value: firstValue,
    mixed: restValues.some((value) => value !== firstValue),
  };
};

export const shouldIgnoreLevaChange = (context?: LevaOnChangeContext) =>
  context?.initial || context?.fromPanel === false;

const isTextEditingElement = () => {
  if (typeof document === "undefined") {
    return false;
  }

  const element = document.activeElement;
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  );
};

export const startNumericEditSession = <TNode extends CanvasNode>(
  sessions: React.RefObject<Record<string, NumericEditSession>>,
  key: string,
  nodes: TNode[],
  getValue: (node: TNode) => number,
  displayStartValue: number,
  mixed: boolean,
) => {
  sessions.current[key] = {
    source: isTextEditingElement() ? "input" : "drag",
    mixed,
    displayStartValue,
    initialValues: new Map(nodes.map((node) => [node.id, getValue(node)])),
  };
};

export const clearNumericEditSession = (
  sessions: React.RefObject<Record<string, NumericEditSession>>,
  key: string,
) => {
  delete sessions.current[key];
};

export const useLevaSync = (
  setControls: LevaSetter,
  values: Record<string, unknown>,
  isEditingRef: React.RefObject<number>,
) => {
  useEffect(() => {
    if (isEditingRef.current > 0) {
      return;
    }

    setControls(values);
  }, [isEditingRef, setControls, values]);
};
