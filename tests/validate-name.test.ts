import { describe, expect, test } from "vitest";
import { validateProjectName } from "../src/utils/validate-name";

describe("validateProjectName", () => {
  test("accepts a valid name", () => {
    expect(validateProjectName("my-api")).toBeUndefined();
    expect(validateProjectName("devium_api")).toBeUndefined();
    expect(validateProjectName("app2")).toBeUndefined();
  });

  test("rejects empty or missing names", () => {
    expect(validateProjectName(undefined)).toBe("Project name is required.");
    expect(validateProjectName("")).toBe("Project name is required.");
    expect(validateProjectName("   ")).toBe("Project name is required.");
  });

  test("rejects uppercase names", () => {
    expect(validateProjectName("MyApp")).toBe("Project name must be lowercase.");
  });

  test("rejects invalid characters", () => {
    expect(validateProjectName("my app")).toMatch(/lowercase letters/);
    expect(validateProjectName("my/app")).toMatch(/lowercase letters/);
  });

  test("rejects names starting with dot or hyphen", () => {
    expect(validateProjectName(".hidden")).toMatch(/cannot start/);
    expect(validateProjectName("-pkg")).toMatch(/cannot start/);
  });

  test("rejects reserved names", () => {
    expect(validateProjectName("node_modules")).toMatch(/reserved/);
  });

  test("trims surrounding whitespace before validating", () => {
    expect(validateProjectName("  my-api  ")).toBeUndefined();
  });
});
