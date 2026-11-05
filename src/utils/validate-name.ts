const RESERVED_NAMES = new Set(["node_modules", "favicon.ico", "con", "prn", "aux", "nul"]);

export function validateProjectName(value: string | undefined): string | undefined {
  const name = value?.trim() ?? "";

  if (!name) return "Project name is required.";
  if (name.length > 214) return "Project name must be 214 characters or fewer.";
  if (name !== name.toLowerCase()) return "Project name must be lowercase.";
  if (!/^[a-z0-9._-]+$/.test(name)) {
    return "Use only lowercase letters, numbers, dots, hyphens and underscores.";
  }
  if (name.startsWith(".") || name.startsWith("-")) {
    return "Project name cannot start with a dot or hyphen.";
  }
  if (RESERVED_NAMES.has(name)) return `"${name}" is a reserved name.`;

  return undefined;
}
