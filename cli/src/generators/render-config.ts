const MARKER_RE = /^(\s*)(?:\/\/|\/\*|<!--|#)?\s*\{\{(\w+)\}\}\s*(?:\*\/|-->)?\s*$/;

export function renderMarkers(
  content: string,
  slots: Record<string, string>,
): string {
  const lines = content.split("\n");
  const rendered: string[] = [];

  for (const line of lines) {
    const match = line.match(MARKER_RE);
    if (!match) {
      rendered.push(line);
      continue;
    }

    const [, indent, slotName] = match;
    const value = slots[slotName];
    if (value === undefined) {
      throw new Error(`Unknown template marker: {{${slotName}}}`);
    }
    if (value.trim() === "") continue;

    for (const valueLine of value.split("\n")) {
      rendered.push(valueLine === "" ? "" : indent + valueLine);
    }
  }

  return rendered.join("\n");
}

/** Inline replacement for simple placeholders like {{projectName}}. */
export function renderInline(
  content: string,
  values: Record<string, string>,
): string {
  let result = content;
  for (const [key, value] of Object.entries(values)) {
    result = result.split(`{{${key}}}`).join(value);
  }
  return result;
}
