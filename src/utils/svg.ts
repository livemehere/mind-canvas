const URL_ATTRIBUTES = new Set(["href", "xlink:href", "src"]);

const removeUnsafeAttributes = (element: Element) => {
  Array.from(element.attributes).forEach((attribute) => {
    const attributeName = attribute.name.toLowerCase();
    const attributeValue = attribute.value.trim().toLowerCase();

    if (attributeName.startsWith("on")) {
      element.removeAttribute(attribute.name);
      return;
    }

    if (URL_ATTRIBUTES.has(attributeName) && attributeValue.startsWith("javascript:")) {
      element.removeAttribute(attribute.name);
    }
  });
};

const removeUnsafeElements = (root: ParentNode) => {
  root
    .querySelectorAll("script,iframe,object,embed,foreignObject")
    .forEach((element) => element.remove());
};

export const sanitizeSvgMarkup = (svgMarkup: string) => {
  if (typeof DOMParser === "undefined") {
    return svgMarkup;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svgElement = doc.documentElement;

  if (!svgElement || svgElement.tagName.toLowerCase() !== "svg") {
    return "";
  }

  removeUnsafeElements(svgElement);
  svgElement.querySelectorAll("*").forEach(removeUnsafeAttributes);
  removeUnsafeAttributes(svgElement);

  return svgElement.outerHTML;
};
