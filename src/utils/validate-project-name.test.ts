import { describe, expect, it } from "vitest";
import { validateProjectName } from "./validate-project-name";

describe("validateProjectName", () => {
  it("accepts valid names", () => {
    expect(validateProjectName("devium-api").valid).toBe(true);
    expect(validateProjectName("my_app").valid).toBe(true);
    expect(validateProjectName("app.v2").valid).toBe(true);
    expect(validateProjectName("a").valid).toBe(true);
  });

  it("rejects empty or whitespace-only names", () => {
    expect(validateProjectName("").valid).toBe(false);
    expect(validateProjectName("   ").valid).toBe(false);
  });

  it("rejects uppercase names", () => {
    expect(validateProjectName("MyApp").valid).toBe(false);
  });

  it("rejects names with path separators or spaces", () => {
    expect(validateProjectName("my app").valid).toBe(false);
    expect(validateProjectName("../evil").valid).toBe(false);
    expect(validateProjectName("my/app").valid).toBe(false);
  });

  it("rejects names starting with a dot or hyphen", () => {
    expect(validateProjectName(".hidden").valid).toBe(false);
    expect(validateProjectName("-dash").valid).toBe(false);
  });

  it("rejects reserved names", () => {
    expect(validateProjectName("node_modules").valid).toBe(false);
  });

  it("rejects names longer than 214 characters", () => {
    expect(validateProjectName("a".repeat(215)).valid).toBe(false);
  });
});
