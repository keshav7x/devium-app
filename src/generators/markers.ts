export function applyLineMarkers(
  content: string,
  markers: Record<string, string>,
  commentToken = "//",
): string {
  const escaped = commentToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `^[ \\t]*${escaped} \\{\\{(\\w+)\\}\\}[ \\t]*\\r?\\n?`,
    "gm",
  );
  return content.replace(pattern, (line, name: string) => {
    const value = markers[name];
    if (value === undefined) return line;
    if (value === "") return "";
    return `${value}\n`;
  });
}

export function applyInlineMarkers(
  content: string,
  markers: Record<string, string>,
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const value = markers[name];
    return value === undefined ? match : value;
  });
}

export function hasUnresolvedMarkers(content: string): boolean {
  return /\{\{\w+\}\}/.test(content);
}
