import { describe, expect, it } from "vitest";
import {
  applyInlineMarkers,
  applyLineMarkers,
  hasUnresolvedMarkers,
} from "./markers";

describe("applyLineMarkers", () => {
  it("replaces marker lines with values", () => {
    const input = ["const a = 1;", "// {{import}}", "const b = 2;"].join("\n");
    const output = applyLineMarkers(input, {
      import: 'import { x } from "./x.js";',
    });
    expect(output).toBe(
      ["const a = 1;", 'import { x } from "./x.js";', "const b = 2;"].join("\n"),
    );
  });

  it("removes marker lines when the value is empty", () => {
    const input = ["a", "  // {{cleanup}}", "b"].join("\n");
    expect(applyLineMarkers(input, { cleanup: "" })).toBe(["a", "b"].join("\n"));
  });

  it("leaves unknown markers untouched", () => {
    const input = "// {{unknown}}";
    expect(applyLineMarkers(input, { other: "x" })).toBe(input);
  });

  it("supports a custom comment token", () => {
    const input = ["RUN npm install", "# {{pruneCmd}}"].join("\n");
    const output = applyLineMarkers(input, { pruneCmd: "RUN npm prune --omit=dev" }, "#");
    expect(output).toBe(
      ["RUN npm install", "RUN npm prune --omit=dev"].join("\n") + "\n",
    );
  });

  it("handles indented markers", () => {
    const input = "  // {{cleanup}}";
    expect(applyLineMarkers(input, { cleanup: "await db.end();" })).toBe(
      "await db.end();\n",
    );
  });
});

describe("applyInlineMarkers", () => {
  it("replaces inline markers", () => {
    expect(applyInlineMarkers("RUN {{installCmd}}", { installCmd: "npm install" })).toBe(
      "RUN npm install",
    );
  });

  it("keeps unknown markers", () => {
    expect(applyInlineMarkers("{{nope}}", {})).toBe("{{nope}}");
  });
});

describe("hasUnresolvedMarkers", () => {
  it("detects remaining markers", () => {
    expect(hasUnresolvedMarkers("ok")).toBe(false);
    expect(hasUnresolvedMarkers("bad {{marker}}")).toBe(true);
  });
});
