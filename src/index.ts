import { Command } from "commander";
import pc from "picocolors";
import { getProjectConfig } from "./prompts/project";
import { buildProject } from "./generators/project";
import { showCursor } from "./ui/terminal";
import { VERSION } from "./version";

const program = new Command();

program
  .name("devium")
  .description(
    "Generate a production-ready TypeScript backend project (Express/Fastify, Drizzle/Prisma, PostgreSQL)",
  )
  .version(VERSION)
  .option("--skip-install", "skip installing dependencies after generation")
  .parse(process.argv);

const options = program.opts<{ skipInstall?: boolean }>();

try {
  const config = await getProjectConfig({
    skipInstall: options.skipInstall === true,
  });
  await buildProject(config);
} catch (error) {
  showCursor();
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n  ${pc.red("✗")} ${pc.bold(pc.red("Something went wrong"))}\n  ${pc.dim(message)}\n`);
  process.exit(1);
}
