import { useCallback } from "react";
import { toast } from "sonner";
import { type Snapshot } from "../../core/nodes";
import {
  normalizeSnapshotPayload,
  SNAPSHOT_STORAGE_KEY,
  type SnapshotPayload,
} from "./snapshotPayload";

interface UseSnapshotStorageOptions {
  step: number;
  snapShot: Snapshot[];
  hydrateSnapshots: (snapshots: Snapshot[], targetStep?: number) => void;
  clearSnapshots: () => void;
}

export const useSnapshotStorage = ({
  step,
  snapShot,
  hydrateSnapshots,
  clearSnapshots,
}: UseSnapshotStorageOptions) => {
  const copySnapshotsJsonToClipboard = useCallback(async () => {
    const payload: SnapshotPayload = {
      step,
      snapShot,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast.success("Copied snapshot JSON to clipboard");
    } catch {
      toast.error("Failed to copy snapshot JSON");
    }
  }, [snapShot, step]);

  const saveSnapshotsToLocalStorage = useCallback(() => {
    const payload: SnapshotPayload = {
      step,
      snapShot,
    };

    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(payload));
    toast.success("Saved to localStorage");
  }, [snapShot, step]);

  const loadSnapshotsFromJson = useCallback(() => {
    const initialValue = localStorage.getItem(SNAPSHOT_STORAGE_KEY) ?? "";
    const input = window.prompt("Paste snapshot JSON", initialValue);
    if (input === null) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      toast.error("Invalid JSON");
      return;
    }

    const payload = normalizeSnapshotPayload(parsed);
    if (!payload || payload.snapShot.length === 0) {
      toast.error("Invalid snapshot payload");
      return;
    }

    hydrateSnapshots(payload.snapShot, payload.step);
    localStorage.setItem(
      SNAPSHOT_STORAGE_KEY,
      JSON.stringify({
        step: payload.step,
        snapShot: payload.snapShot,
      } satisfies SnapshotPayload),
    );
    toast.success("Loaded snapshots from JSON");
  }, [hydrateSnapshots]);

  const loadSnapshotsFromLocalStorage = useCallback(
    (options?: { showToast?: boolean }) => {
      const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
      if (!raw) {
        return false;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return false;
      }

      const payload = normalizeSnapshotPayload(parsed);
      if (!payload || payload.snapShot.length === 0) {
        return false;
      }

      hydrateSnapshots(payload.snapShot, payload.step);
      if (options?.showToast) {
        toast.success("Loaded snapshots from localStorage");
      }

      return true;
    },
    [hydrateSnapshots],
  );

  const clearSavedSnapshots = useCallback(() => {
    localStorage.removeItem(SNAPSHOT_STORAGE_KEY);
    clearSnapshots();
    toast.success("Cleared localStorage snapshots");
  }, [clearSnapshots]);

  return {
    copySnapshotsJsonToClipboard,
    saveSnapshotsToLocalStorage,
    loadSnapshotsFromJson,
    loadSnapshotsFromLocalStorage,
    clearSavedSnapshots,
  };
};
