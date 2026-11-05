const LINE_MARKER_RE =
  /^[ \t]*(?:(?:\/\/|#|<!--)[ \t]*)?\{\{(\w+)\}\}(?:[ \t]*-->)?[ \t]*\r?\n?/gm;

const INLINE_TOKEN_RE = /\{\{(\w+)\}\}/g;

/**
 * Replaces whole-line markers like `// {{key}}` or `# {{key}}` with the
 * marker's value, or removes the line entirely when the key is absent.
 * Also replaces inline `{{KEY}}` tokens anywhere in the content.
 */
export function renderMarkers(
  content: string,
  markers: Record<string, string | undefined>,
): string {
  const rendered = content.replace(LINE_MARKER_RE, (_match, key: string) => {
    return markers[key] ?? "";
  });

  return rendered.replace(INLINE_TOKEN_RE, (_match, key: string) => {
    return markers[key] ?? "";
  });
}
