import { Canvas } from "./components/Canvas";
import { useState } from "react";
import { type CNode, type Position, RECT, type SnapShot } from "./core/CNode";
import { useHotkeys } from "react-hotkeys-hook";
import { flushSync } from "react-dom";
import { Toolbar, type ToolId } from "./components/Toolbar";
import { Leva } from "leva";

export default function App() {
  const [step, setStep] = useState(0);
  const [snapShot, setSnapShot] = useState<SnapShot[]>([
    {
      nodes: [],
    },
    // {
    //   nodes: [
    //     {
    //       ...RECT,
    //       position: { x: 500, y: 500 },
    //       content: "HELLO",
    //     },
    //   ],
    // },
    // {
    //   nodes: [
    //     {
    //       ...RECT,
    //       position: { x: 800, y: 500 },
    //       scale: 2,
    //       content: "WORLD",
    //     },
    //   ],
    // },
  ]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeToolId, setActiveToolId] = useState<ToolId>("select");

  const snapShotLength = snapShot.length;

  const currentSnapShot = snapShot[step];
  const currentNodes = currentSnapShot.nodes;
  const setCurrentSnapShotNodes = (nodes: CNode[]) => {
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
      newSnapShot.nodes = [...currentSnapShot.nodes];
    }

    setSnapShot((prev) => [...prev, newSnapShot]);
  };

  const createRect = (x: number, y: number) => {
    const id = window.crypto.randomUUID();
    setCurrentSnapShotNodes([
      ...currentNodes,
      {
        ...RECT,
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
        break;
      }
      default:
        break;
    }
  };

  useHotkeys("q", () => setActiveToolId("select"));
  useHotkeys("w", () => setActiveToolId("rect"));
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
