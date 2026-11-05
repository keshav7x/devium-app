import { describe, expect, it } from "vitest";
import { mergeManifests, getRuntimeScripts } from "./merge-package";
import type { ProjectConfig } from "../types/project";

describe("mergeManifests", () => {
  it("merges dependencies with later manifests winning", () => {
    const merged = mergeManifests([
      { dependencies: { a: "^1.0.0", b: "^1.0.0" } },
      { dependencies: { b: "^2.0.0", c: "^3.0.0" } },
    ]);
    expect(merged.dependencies).toEqual({ a: "^1.0.0", b: "^2.0.0", c: "^3.0.0" });
  });

  it("merges scripts key-wise", () => {
    const merged = mergeManifests([
      { scripts: { dev: "one", test: "vitest" } },
      { scripts: { dev: "two" } },
    ]);
    expect(merged.scripts).toEqual({ dev: "two", test: "vitest" });
  });

  it("keeps scalars from the last manifest that defines them", () => {
    const merged = mergeManifests([
      { name: "old", type: "module", private: true },
      { name: "new" },
    ]);
    expect(merged.name).toBe("new");
    expect(merged.type).toBe("module");
    expect(merged.private).toBe(true);
  });

  it("removes dependencies duplicated in devDependencies", () => {
    const merged = mergeManifests([
      { devDependencies: { zod: "^4.0.0" } },
      { dependencies: { zod: "^4.6.7" } },
    ]);
    expect(merged.dependencies).toEqual({ zod: "^4.6.7" });
    expect(merged.devDependencies).toBeUndefined();
  });

  it("never produces placeholder versions", () => {
    const merged = mergeManifests([
      { dependencies: { a: "^1.0.0" } },
      { dependencies: { b: "^2.1.0" } },
    ]);
    for (const version of Object.values(merged.dependencies ?? {})) {
      expect(version).not.toContain("0.0.0");
      expect(version).toMatch(/^[\^~]?[0-9]/);
    }
  });
});

describe("getRuntimeScripts", () => {
  const base: ProjectConfig = {
    name: "x",
    framework: "express",
    runtime: "node",
    packageManager: "npm",
    orm: "drizzle",
    features: {
      logger: false,
      cors: false,
      env: false,
      errorClass: false,
      zod: false,
      docker: false,
    },
  };

  it("uses tsx for node and bun for bun", () => {
    expect(getRuntimeScripts(base).dev).toBe("tsx watch src/server.ts");
    expect(getRuntimeScripts(base).start).toBe("node dist/server.js");
    expect(getRuntimeScripts({ ...base, runtime: "bun" }).dev).toBe(
      "bun --watch src/server.ts",
    );
    expect(getRuntimeScripts({ ...base, runtime: "bun" }).start).toBe(
      "bun dist/server.js",
    );
  });

  it("always builds with tsc", () => {
    expect(getRuntimeScripts(base).build).toBe("tsc");
  });
});
