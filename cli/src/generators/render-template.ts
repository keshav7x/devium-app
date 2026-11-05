const LINE_MARKER =
  /^(\s*)(?:\/\/|\/\*|<!--)?\s*\{\{(\w+)\}\}\s*(?:\*\/|-->)?\s*$/;

/**
 * Replaces whole-line markers (`// {{slot}}`) with the slot's value,
 * preserving the marker's indentation, then replaces any remaining
 * inline `{{key}}` tokens. Empty/missing slots drop the marker line.
 */
export function renderTemplate(
  content: string,
  slots: Record<string, string>,
): string {
  const lines: string[] = [];

  for (const line of content.split("\n")) {
    const match = line.match(LINE_MARKER);
    if (match) {
      const value = slots[match[2] ?? ""] ?? "";
      if (value) {
        const indent = match[1] ?? "";
        lines.push(
          ...value.split("\n").map((l) => (l.length > 0 ? indent + l : l)),
        );
      }
      continue;
    }
    lines.push(line);
  }

  let out = lines.join("\n");
  for (const [key, value] of Object.entries(slots)) {
    if (value && !value.includes("\n")) {
      out = out.replaceAll(`{{${key}}}`, value);
    }
  }
  return out;
}
