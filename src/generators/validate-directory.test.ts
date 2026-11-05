import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateDirectory } from "./validate-directory";

describe("validateDirectory", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "devium-validate-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("allows a directory that does not exist", async () => {
    await expect(
      validateDirectory(path.join(tmpDir, "missing")),
    ).resolves.toBeUndefined();
  });

  it("allows an existing empty directory", async () => {
    const empty = path.join(tmpDir, "empty");
    await mkdir(empty);
    await expect(validateDirectory(empty)).resolves.toBeUndefined();
  });

  it("rejects a non-empty directory", async () => {
    const full = path.join(tmpDir, "full");
    await mkdir(full);
    await writeFile(path.join(full, "keep.txt"), "x");
    await expect(validateDirectory(full)).rejects.toThrow(/not empty/);
  });

  it("rejects when the path is an existing file", async () => {
    const filePath = path.join(tmpDir, "file.txt");
    await writeFile(filePath, "x");
    await expect(validateDirectory(filePath)).rejects.toThrow(
      /not a directory/,
    );
  });
});
