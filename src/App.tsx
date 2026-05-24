import { CanvasSurface } from "./components/canvas/CanvasSurface";
import { useState } from "react";
import {
  type CanvasNode,
  type Position,
  DEFAULT_RECT_NODE,
  type Snapshot,
  DEFAULT_TEXT_NODE,
} from "./core/nodes";
import { useHotkeys } from "react-hotkeys-hook";
import { flushSync } from "react-dom";
import {
  CanvasToolbar,
  type CanvasToolId,
} from "./components/canvas/CanvasToolbar";
import { Leva } from "leva";
import { toast, Toaster } from "sonner";

export default function App() {
  // step, snapshot
  const [step, setStep] = useState(0);
  const [snapShot, setSnapShot] = useState<Snapshot[]>([
    {
      nodes: [],
    },
  ]);
  const snapShotLength = snapShot.length;
  const currentSnapShot = snapShot[step];
  const previousNodes = step > 0 ? snapShot[step - 1].nodes : [];

  // nodes, setNodes, removeNode
  const currentNodes = currentSnapShot.nodes;
  const setCurrentSnapShotNodes = (nodes: CanvasNode[]) => {
    setSnapShot((prev) => {
      const newSnapShot = [...prev];
      newSnapShot[step] = { nodes };
      return newSnapShot;
    });
  };
  const removeNodes = (nodeIds: string[]) => {
    setCurrentSnapShotNodes(
      currentNodes.filter((n) => !nodeIds.includes(n.id)),
    );
  };

  const addSnapShot = (duplicateLatest?: boolean) => {
    const newSnapShot: Snapshot = {
      nodes: [],
    };

    if (duplicateLatest) {
      newSnapShot.nodes = [...currentNodes];
    }

    setSnapShot((prev) => [...prev, newSnapShot]);
    toast.success("Snapshot added");
  };

  // states
  const [activeNodeIds, setActiveNodeIds] = useState<string[]>([]);
  const [activeToolId, setActiveToolId] = useState<CanvasToolId>("select");

  const createRect = (x: number, y: number) => {
    const id = window.crypto.randomUUID();
    setCurrentSnapShotNodes([
      ...currentNodes,
      {
        ...DEFAULT_RECT_NODE,
        id,
        position: { x, y },
      },
    ]);
    return id;
  };

  const createText = (x: number, y: number) => {
    const id = window.crypto.randomUUID();
    setCurrentSnapShotNodes([
      ...currentNodes,
      {
        ...DEFAULT_TEXT_NODE,
        id,
        position: { x, y },
      },
    ]);
    return id;
  };

  const handleClickBackground = (position: Position) => {
    switch (activeToolId) {
      case "select": {
        setActiveNodeIds([]);
        break;
      }
      case "rect": {
        const id = createRect(position.x, position.y);
        setActiveNodeIds([id]);
        setActiveToolId("select");
        break;
      }
      case "text": {
        const id = createText(position.x, position.y);
        setActiveNodeIds([id]);
        setActiveToolId("select");
        break;
      }
      default:
        break;
    }
  };

  useHotkeys("q", () => setActiveToolId("select"));
  useHotkeys("w", () => setActiveToolId("rect"));
  useHotkeys("e", () => setActiveToolId("text"));
  useHotkeys("Escape", () => {
    setActiveNodeIds([]);
    setActiveToolId("select");
  });
  useHotkeys("Backspace", () => {
    if (activeNodeIds.length > 0) {
      removeNodes(activeNodeIds);
      setActiveNodeIds([]);
    }
  });

  useHotkeys("1", () => {
    setStep((prev) => Math.max(0, prev - 1));
    setActiveNodeIds([]);
    if (step === 0) {
      toast.warning("Already at the first step");
    }
  });

  useHotkeys("2", () => {
    if (step === snapShotLength - 1) {
      toast.warning("Already at the last step");
      return;
    }
    setStep((prev) => prev + 1);
    setActiveNodeIds([]);
  });

  useHotkeys("3", () => {
    flushSync(() => {
      addSnapShot(true);
      setActiveNodeIds([]);
      setStep(snapShotLength);
    });
  });

  return (
    <>
      <Toaster position={"top-center"} richColors />
      <div className="h-full relative">
        <div className={"absolute top-5 right-5 z-10 text-2xl font-bold"}>
          Step : {step} / {snapShotLength - 1}
        </div>
        <div className="absolute inset-0">
          {step > 0 ? <CanvasSurface nodes={previousNodes} viewOnly /> : null}
        </div>
        <div className="relative h-full">
          <CanvasSurface
            nodes={currentNodes}
            setNodes={setCurrentSnapShotNodes}
            activeNodeIds={activeNodeIds}
            setActiveNodeIds={setActiveNodeIds}
            activeToolId={activeToolId}
            onClickBackground={handleClickBackground}
          />
        </div>
        <CanvasToolbar
          activeToolId={activeToolId}
          setActiveToolId={setActiveToolId}
        />
        <Leva
          hidden={activeNodeIds.length === 0}
          titleBar={{ position: { x: 0, y: 60 } }}
        />
      </div>
    </>
  );
}
