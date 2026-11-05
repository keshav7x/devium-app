import { buildProject } from "./generators/project";
import { getProjectConfig } from "./prompts/project";

function parseArgs(argv: string[]): { skipInstall: boolean } {
  const skipInstall = argv.includes("--skip-install");
  const known = new Set(["--skip-install"]);
  const unknown = argv.filter((arg) => arg.startsWith("--") && !known.has(arg));

  if (unknown.length > 0) {
    console.error(`Unknown option(s): ${unknown.join(", ")}`);
    console.error("Usage: devium [--skip-install]");
    process.exit(2);
  }

  return { skipInstall };
}

async function main(): Promise<void> {
  const { skipInstall } = parseArgs(process.argv.slice(2));
  const config = await getProjectConfig(skipInstall);
  await buildProject(config);
}

main().catch((error: unknown) => {
  console.error("\n✗ ", error instanceof Error ? error.message : error);
  process.exit(1);
});
