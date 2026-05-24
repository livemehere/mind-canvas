import { Canvas } from "./components/Canvas";
import { useState } from "react";
import {
  type Types,
  type Position,
  DEFAULT_RECT,
  type SnapShot,
  DEFAULT_TEXT,
} from "./core/types";
import { useHotkeys } from "react-hotkeys-hook";
import { flushSync } from "react-dom";
import { Toolbar, type ToolId } from "./components/Toolbar";
import { Leva } from "leva";

export default function App() {
  // step, snapshot
  const [step, setStep] = useState(0);
  const [snapShot, setSnapShot] = useState<SnapShot[]>([
    {
      nodes: [],
    },
  ]);
  const snapShotLength = snapShot.length;
  const currentSnapShot = snapShot[step];

  // nodes, setNodes, removeNode
  const currentNodes = currentSnapShot.nodes;
  const setCurrentSnapShotNodes = (nodes: Types[]) => {
    setSnapShot((prev) => {
      const newSnapShot = [...prev];
      newSnapShot[step] = { nodes };
      return newSnapShot;
    });
  };
  const removeNode = (nodeId: string) => {
    setCurrentSnapShotNodes(currentNodes.filter((n) => n.id !== nodeId));
  };

  const addSnapShot = (duplicateLatest?: boolean) => {
    const newSnapShot: SnapShot = {
      nodes: [],
    };

    if (duplicateLatest) {
      newSnapShot.nodes = [...currentNodes];
    }

    setSnapShot((prev) => [...prev, newSnapShot]);
  };

  // states
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeToolId, setActiveToolId] = useState<ToolId>("select");

  const createRect = (x: number, y: number) => {
    const id = window.crypto.randomUUID();
    setCurrentSnapShotNodes([
      ...currentNodes,
      {
        ...DEFAULT_RECT,
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
        ...DEFAULT_TEXT,
        id,
        position: { x, y },
      },
    ]);
    return id;
  };

  const handleClickBackground = (position: Position) => {
    switch (activeToolId) {
      case "select": {
        setActiveNodeId(null);
        break;
      }
      case "rect": {
        const id = createRect(position.x, position.y);
        setActiveNodeId(id);
        setActiveToolId("select");
        break;
      }
      case "text": {
        const id = createText(position.x, position.y);
        setActiveNodeId(id);
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
    setActiveNodeId(null);
    setActiveToolId("select");
  });
  useHotkeys("Backspace", () => {
    if (activeNodeId) {
      removeNode(activeNodeId);
      setActiveNodeId(null);
    }
  });

  useHotkeys("1", () => {
    setStep((prev) => Math.max(0, prev - 1));
    setActiveNodeId(null);
  });

  useHotkeys("2", () => {
    if (step === snapShotLength - 1) return;
    setStep((prev) => prev + 1);
    setActiveNodeId(null);
  });

  useHotkeys("3", () => {
    flushSync(() => {
      addSnapShot(true);
      setActiveNodeId(null);
      setStep(snapShotLength);
    });
  });

  return (
    <div className="h-full relative">
      <div className={"absolute top-5 right-5 z-10 text-2xl font-bold"}>
        Step : {step} / {snapShotLength - 1}
      </div>
      <Canvas
        nodes={currentNodes}
        setNodes={setCurrentSnapShotNodes}
        activeNodeId={activeNodeId}
        setActiveNodeId={setActiveNodeId}
        onClickBackground={handleClickBackground}
      />
      <Toolbar activeToolId={activeToolId} setActiveToolId={setActiveToolId} />
      <Leva hidden={!activeNodeId} titleBar={{ position: { x: 0, y: 60 } }} />
    </div>
  );
}
