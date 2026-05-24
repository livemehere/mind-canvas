import { Canvas } from "./components/Canvas";
import { useState } from "react";
import { type CNode, RECT, type SnapShot } from "./core/CNode";
import { useHotkeys } from "react-hotkeys-hook";
import { flushSync } from "react-dom";

export default function App() {
  const [step, setStep] = useState(0);
  const [snapShot, setSnapShot] = useState<SnapShot[]>([
    {
      nodes: [
        {
          ...RECT,
          position: { x: 500, y: 500 },
          content: "HELLO",
        },
      ],
    },
    {
      nodes: [
        {
          ...RECT,
          position: { x: 800, y: 500 },
          scale: 2,
          content: "WORLD",
        },
      ],
    },
  ]);

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

  const addSnapShot = (duplicateLatest?: boolean) => {
    const newSnapShot: SnapShot = {
      nodes: [],
    };

    if (duplicateLatest) {
      newSnapShot.nodes = [...currentSnapShot.nodes];
    }

    setSnapShot((prev) => [...prev, newSnapShot]);
  };

  useHotkeys("left", () => {
    setStep((prev) => Math.max(0, prev - 1));
  });

  useHotkeys("right", () => {
    if (step === snapShotLength - 1) return;
    setStep((prev) => prev + 1);
  });

  useHotkeys("n", () => {
    flushSync(() => {
      addSnapShot(true);
      setStep(snapShotLength);
    });
  });

  return (
    <div className="h-full relative">
      <div className={"absolute top-5 right-5 z-10 text-2xl font-bold"}>
        Step : {step} / {snapShotLength - 1}
      </div>
      <Canvas nodes={currentNodes} setNodes={setCurrentSnapShotNodes} />
    </div>
  );
}
