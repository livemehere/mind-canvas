import { BOX_COMPONENT_REGISTRY } from "./boxComponentRegistry";
import { type BoxNode } from "../../core/nodes";
import { getRectContentStyle } from "../../features/styles/helpers";
import { sanitizeSvgMarkup } from "../../utils/svg";

interface BoxContentRendererProps {
  node: BoxNode;
}

const SvgContent = ({ node }: BoxContentRendererProps) => {
  if (!node.svgContent.trim()) {
    return null;
  }

  const markup = node.sanitizeSvg
    ? sanitizeSvgMarkup(node.svgContent)
    : node.svgContent;
  if (!markup.trim()) {
    return null;
  }

  return (
    <div
      className="h-full w-full"
      style={{ overflow: "hidden", borderRadius: "inherit" }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
};

const ComponentContent = ({ node }: BoxContentRendererProps) => {
  const renderer = BOX_COMPONENT_REGISTRY[node.componentId];
  if (!renderer) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-white/60">
        Unknown component: {node.componentId}
      </div>
    );
  }

  return <>{renderer({ node, props: node.componentProps })}</>;
};

export function BoxContentRenderer({ node }: BoxContentRendererProps) {
  switch (node.contentKind) {
    case "plain":
      return node.content ? <div style={getRectContentStyle(node)}>{node.content}</div> : null;
    case "svg":
      return <SvgContent node={node} />;
    case "component":
      return <ComponentContent node={node} />;
    default:
      return null;
  }
}
