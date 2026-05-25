import { type BoxNode } from "../../core/nodes";
import { type ReactNode } from "react";

export interface BoxComponentRendererProps {
  node: BoxNode;
  props: Record<string, unknown>;
}

export type BoxComponentRenderer = (
  input: BoxComponentRendererProps,
) => ReactNode;

const readString = (
  props: Record<string, unknown>,
  key: string,
  fallback: string,
) => {
  const value = props[key];
  return typeof value === "string" ? value : fallback;
};

const readNumber = (
  props: Record<string, unknown>,
  key: string,
  fallback: number,
) => {
  const value = props[key];
  return typeof value === "number" ? value : fallback;
};

export const BOX_COMPONENT_REGISTRY: Record<string, BoxComponentRenderer> = {
  "badge-note": ({ props }) => {
    const title = readString(props, "title", "Badge");
    const body = readString(props, "body", "Short note");
    const accent = readString(props, "accent", "#60a5fa");

    return (
      <div className="h-full w-full rounded-[inherit] border border-white/20 bg-black/10 p-3 text-white">
        <div className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: accent }}>
          {title}
        </div>
        <div className="mt-2 text-xs leading-snug text-white/90">{body}</div>
      </div>
    );
  },
  "metric-chip": ({ props }) => {
    const label = readString(props, "label", "Metric");
    const value = readNumber(props, "value", 42);
    const unit = readString(props, "unit", "%");

    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-[inherit] border border-white/15 bg-black/20 text-white">
        <div className="text-[10px] uppercase tracking-[0.16em] text-white/55">{label}</div>
        <div className="mt-1 text-2xl font-bold tracking-tight">
          {value}
          <span className="ml-1 text-sm text-white/70">{unit}</span>
        </div>
      </div>
    );
  },
};

export const BOX_COMPONENT_OPTIONS = Object.keys(BOX_COMPONENT_REGISTRY);
