const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;
const MAX_LENGTH = 214;

const RESERVED = new Set([
  "node_modules",
  "favicon.ico",
  "con",
  "prn",
  "aux",
  "nul",
  "com1",
  "com2",
  "com3",
  "com4",
  "com5",
  "com6",
  "com7",
  "com8",
  "com9",
  "lpt1",
  "lpt2",
  "lpt3",
  "lpt4",
  "lpt5",
  "lpt6",
  "lpt7",
  "lpt8",
  "lpt9",
]);

export function validateProjectName(value: string): string | undefined {
  const name = value.trim();

  if (!name) return "Project name is required.";
  if (name.length > MAX_LENGTH) {
    return `Project name must be at most ${MAX_LENGTH} characters.`;
  }
  if (!NAME_RE.test(name)) {
    return "Use lowercase letters, numbers, hyphens, underscores or dots (must start with a letter or number).";
  }
  if (RESERVED.has(name)) {
    return `"${name}" is a reserved name.`;
  }

  return undefined;
}
