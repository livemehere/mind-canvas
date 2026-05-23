import { type CNode, RECT } from "../core/CNode";

export interface Props {
  nodes: CNode[];
  setNodes: React.Dispatch<React.SetStateAction<CNode[]>>;
}

export function Canvas({ nodes, setNodes }: Props) {
  const createRect = (x: number, y: number) => {
    setNodes((prev) => [
      ...prev,
      {
        ...RECT,
        id: window.crypto.randomUUID(),
        position: { x, y },
      },
    ]);
  };

  const handleOnClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    createRect(x, y);
  };

  return (
    <div className={"h-full relative ml-4 mt-4"} onClick={handleOnClick}>
      {nodes.map((node) => (
        <div
          key={node.id}
          style={{
            position: "absolute",
            left: node.position.x,
            top: node.position.y,
            width: node.size.width,
            height: node.size.height,
            backgroundColor: node.bgColor,
          }}
        ></div>
      ))}
    </div>
  );
}
