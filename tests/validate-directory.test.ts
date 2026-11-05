import { afterEach, beforeEach, describe, expect, test } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateDirectory } from "../src/generators/validate-directory";

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "devium-validate-"));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("validateDirectory", () => {
  test("accepts a path that does not exist", async () => {
    const target = path.join(tempDir, "does-not-exist");
    await expect(validateDirectory(target)).resolves.toBeUndefined();
  });

  test("accepts an existing empty directory", async () => {
    await expect(validateDirectory(tempDir)).resolves.toBeUndefined();
  });

  test("rejects a non-empty directory", async () => {
    await fs.writeFile(path.join(tempDir, "file.txt"), "x");
    await expect(validateDirectory(tempDir)).rejects.toThrow(/not empty/);
  });

  test("rejects an existing file", async () => {
    const filePath = path.join(tempDir, "some-file");
    await fs.writeFile(filePath, "x");
    await expect(validateDirectory(filePath)).rejects.toThrow(
      /not a directory/
    );
  });

  test("rejects a path under a file (ENOTDIR)", async () => {
    const filePath = path.join(tempDir, "blocker");
    await fs.writeFile(filePath, "x");
    await expect(
      validateDirectory(path.join(filePath, "child"))
    ).rejects.toThrow(/not a directory/);
  });
});
