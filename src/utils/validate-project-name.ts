const RESERVED_NAMES = new Set([
  "node_modules",
  "favicon.ico",
]);

const WINDOWS_DEVICE_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const WINDOWS_DEVICE_FILE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])\.[^/\\]*$/i;

export interface NameValidation {
  valid: boolean;
  error?: string;
}

export function validateProjectName(name: string): NameValidation {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: "Project name is required." };
  }
  if (trimmed.length > 214) {
    return {
      valid: false,
      error: "Project name must be 214 characters or fewer.",
    };
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(trimmed)) {
    return {
      valid: false,
      error:
        "Use lowercase letters, digits, hyphens, underscores or dots, starting with a letter or digit.",
    };
  }
  if (trimmed.endsWith(".")) {
    return {
      valid: false,
      error: "Project name must not end with a dot.",
    };
  }
  if (
    RESERVED_NAMES.has(trimmed.toLowerCase()) ||
    WINDOWS_DEVICE_NAME.test(trimmed) ||
    WINDOWS_DEVICE_FILE.test(trimmed)
  ) {
    return {
      valid: false,
      error: `"${trimmed}" is a reserved name.`,
    };
  }

  return { valid: true };
}
