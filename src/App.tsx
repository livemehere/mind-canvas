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
        },
      ],
    },
    {
      nodes: [
        {
          ...RECT,
          position: { x: 100, y: 100 },
          scale: 2,
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

  const addSnapShot = () => {
    const newSnapShot: SnapShot = {
      nodes: [],
    };
    setSnapShot((prev) => [...prev, newSnapShot]);
  };

  useHotkeys("left", () => {
    setStep((prev) => Math.max(0, prev - 1));
  });

  useHotkeys("right", () => {
    if (step === snapShotLength - 1) {
      flushSync(() => {
        addSnapShot();
        setStep((prev) => prev + 1);
      });
    } else {
      setStep((prev) => prev + 1);
    }
  });

  return (
    <div className="h-full relative">
      <div className={"absolute top-5 right-5 z-10 text-2xl font-bold"}>
        Step : {step}
      </div>
      <Canvas nodes={currentNodes} setNodes={setCurrentSnapShotNodes} />
    </div>
  );
}
