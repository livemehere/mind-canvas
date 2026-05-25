import { type Snapshot } from "../../core/nodes";

export const SNAPSHOT_STORAGE_KEY = "mind-canvas:snapshots";

export interface SnapshotPayload {
  step: number;
  snapShot: Snapshot[];
}

const isSnapshotArray = (value: unknown): value is Snapshot[] => {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every(
    (snapshot) =>
      typeof snapshot === "object" &&
      snapshot !== null &&
      Array.isArray((snapshot as { nodes?: unknown }).nodes),
  );
};

export const normalizeSnapshotPayload = (
  value: unknown,
): SnapshotPayload | null => {
  if (isSnapshotArray(value)) {
    return {
      step: 0,
      snapShot: value,
    };
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as {
    step?: unknown;
    snapShot?: unknown;
    snapshots?: unknown;
  };
  const snapshots = record.snapShot ?? record.snapshots;
  if (!isSnapshotArray(snapshots)) {
    return null;
  }

  return {
    step: typeof record.step === "number" ? record.step : 0,
    snapShot: snapshots,
  };
};
