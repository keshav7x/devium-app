import pc from "picocolors";
import path from "node:path";
import { VERSION } from "../version";

export const isTTY = (): boolean =>
  Boolean(process.stdout.isTTY) && process.env.TERM !== "dumb";
export const colorEnabled = (): boolean =>
  isTTY() && !process.env.NO_COLOR && process.env.NODE_DISABLE_COLORS === undefined;

const out = (s: string): void => {
  process.stdout.write(s);
};
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const hideCursor = (): void => {
  if (isTTY()) out("\x1b[?25l");
};
export const showCursor = (): void => {
  if (isTTY()) out("\x1b[?25h");
};
process.on("exit", showCursor);

// ───────────────────────── text measurement ─────────────────────────

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;
export const stripAnsi = (s: string): string => s.replace(ANSI_RE, "");
const visibleWidth = (s: string): number => [...stripAnsi(s)].length;

export const padVisible = (s: string, w: number): string =>
  s + " ".repeat(Math.max(0, w - visibleWidth(s)));

// truncate to a visible width, preserving ANSI sequences, closing styles with a reset
export function fitAnsi(line: string, maxWidth: number): string {
  if (visibleWidth(line) <= maxWidth) return line;
  const target = Math.max(0, maxWidth - 1);
  let visible = 0;
  let i = 0;
  let acc = "";
  while (i < line.length && visible < target) {
    if (line[i] === "\x1b") {
      const rest = line.slice(i);
      const match = /^\x1b\[[0-9;]*m/.exec(rest);
      if (match) {
        acc += match[0];
        i += match[0].length;
        continue;
      }
    }
    // copy one code point (handle surrogate pairs)
    const code = line.codePointAt(i);
    if (code === undefined) break;
    const ch = String.fromCodePoint(code);
    acc += ch;
    i += ch.length;
    visible += 1;
  }
  return `${acc}\x1b[0m…`;
}

// ───────────────────────── color engine (truecolor) ─────────────────────────

type RGB = [number, number, number];
const CYAN: RGB = [0, 229, 255];
const PURPLE: RGB = [168, 85, 247];
const PINK: RGB = [255, 80, 180];
const STOPS: RGB[] = [CYAN, PURPLE, PINK, CYAN]; // loops seamlessly

const lerp = (a: number, b: number, t: number): number =>
  Math.round(a + (b - a) * t);

const paint = (s: string, [r, g, b]: RGB): string =>
  colorEnabled() ? `\x1b[38;2;${r};${g};${b}m${s}\x1b[39m` : s;

function sample(stops: RGB[], t: number): RGB {
  const x = ((t % 1) + 1) % 1;
  const seg = x * (stops.length - 1);
  const i = Math.min(Math.floor(seg), stops.length - 2);
  const f = seg - i;
  const a = stops[i] as RGB;
  const b = stops[i + 1] as RGB;
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
}

// horizontal gradient across each line, shifted by `offset` (for shimmer)
function gradientBlock(lines: string[], offset = 0): string[] {
  const width = Math.max(...lines.map((l) => [...l].length));
  if (!colorEnabled()) return lines.slice();
  return lines.map((line) =>
    [...line]
      .map((ch, i) =>
        ch === " " ? ch : paint(ch, sample(STOPS, i / width + offset)),
      )
      .join(""),
  );
}

export const gradientText = (s: string, offset = 0): string =>
  gradientBlock([s], offset)[0] ?? s;

// ───────────────────────── art ─────────────────────────

const WORDMARK = [
  "██████╗ ███████╗██╗   ██╗██╗██╗   ██╗███╗   ███╗",
  "██╔══██╗██╔════╝██║   ██║██║██║   ██║████╗ ████║",
  "██║  ██║█████╗  ██║   ██║██║██║   ██║██╔████╔██║",
  "██║  ██║██╔══╝  ╚██╗ ██╔╝██║██║   ██║██║╚██╔╝██║",
  "██████╔╝███████╗ ╚████╔╝ ██║╚██████╔╝██║ ╚═╝ ██║",
  "╚═════╝ ╚══════╝  ╚═══╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝",
];
const WORDMARK_WIDTH = Math.max(...WORDMARK.map((l) => [...l].length));

const ICON = [
  "   ▄██████▄   ",
  " ▄██      ██▄ ",
  " ██   ❯❯   ██ ",
  " ▀██      ██▀ ",
  "   ▀██████▀   ",
];
const ICON_WIDTH = 16;

function iconColumn(): string[] {
  return [
    ...gradientBlock(ICON, 0.1),
    "",
    pc.bold(pc.white("    DEVIUM    ")),
    pc.dim(`    v${VERSION}    `),
  ];
}

// ───────────────────────── animations ─────────────────────────

export async function typewriter(text: string, ms = 16): Promise<void> {
  if (!isTTY()) {
    console.log(text);
    return;
  }
  for (const ch of text) {
    out(ch);
    await sleep(ms);
  }
  out("\n");
}

// intro: wordmark shimmer, redrawn in place
export async function shimmerIntro(frames = 30): Promise<void> {
  if (!isTTY() || (process.stdout.columns ?? 80) < WORDMARK_WIDTH + 4) {
    console.log(gradientBlock(WORDMARK, 0.15).map((l) => "  " + l).join("\n"));
    return;
  }
  console.clear();
  hideCursor();
  console.log();
  for (let f = 0; f < frames; f++) {
    const block = gradientBlock(WORDMARK, f / frames).map((l) => "  " + l);
    if (f > 0) out(`\x1b[${WORDMARK.length}A`);
    out(block.join("\n") + "\n");
    await sleep(40);
  }
  showCursor();
}

export function detectRuntime(): string {
  const bun = process.versions.bun;
  return bun ? `Bun ${bun}` : `Node ${process.version}`;
}

export function detectPm(): string {
  const name = (process.env.npm_config_user_agent ?? "").split("/")[0];
  return ["bun", "pnpm", "yarn", "npm"].includes(name ?? "") ? (name as string) : "npm";
}

export async function bootSequence(): Promise<void> {
  const checks: [string, string][] = [
    ["Runtime", detectRuntime()],
    ["Launched by", detectPm()],
    ["Platform", `${process.platform} ${process.arch}`],
    ["Workspace", path.basename(process.cwd()) || "/"],
  ];
  if (!isTTY()) {
    for (const [k, v] of checks) console.log(`  ✔ ${k.padEnd(12)} ${v}`);
    return;
  }
  hideCursor();
  for (const [k, v] of checks) {
    out(`  ${pc.dim("…")} ${pc.dim(k.padEnd(12))}`);
    await sleep(160);
    out(`\r\x1b[2K  ${pc.green("✔")} ${pc.dim(k.padEnd(12))}${pc.cyan(v)}\n`);
  }
  showCursor();
}

export async function sparkle(width = 46, frames = 14): Promise<void> {
  if (!isTTY()) return;
  const chars = ["·", "✦", "✧", "+", "*", " ", " ", " "];
  hideCursor();
  for (let f = 0; f < frames; f++) {
    const line = Array.from({ length: width }, () => {
      const c = chars[Math.floor(Math.random() * chars.length)] as string;
      return c === " " ? " " : paint(c, sample(STOPS, Math.random()));
    }).join("");
    out("\r\x1b[2K  " + line);
    await sleep(70);
  }
  out("\r\x1b[2K");
  showCursor();
}

export function progressBar(pct: number, width = 34): string {
  const clamped = Math.min(1, Math.max(0, pct));
  const filled = Math.round(clamped * width);
  let bar = "";
  for (let i = 0; i < width; i++) {
    bar +=
      i < filled
        ? paint("━", sample([CYAN, PURPLE, PINK], i / width))
        : pc.dim("━");
  }
  return bar;
}

// wait for any keypress; resolves immediately when stdin is not a TTY
export function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
      resolve();
      return;
    }
    stdin.setRawMode(true);
    stdin.resume();
    const onData = (buf: Buffer): void => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      if (buf.includes(0x03)) {
        // Ctrl+C
        showCursor();
        process.exit(0);
      }
      const rest = buf.subarray(1);
      if (rest.length > 0) {
        // hand back any bytes that arrived with the first keypress
        stdin.unshift(rest);
      }
      resolve();
    };
    stdin.on("data", onData);
  });
}

// ───────────────────────── layout: icon + boxed live panel ─────────────────────────

export type PanelSummary = {
  name?: string;
  runtime?: string;
  framework?: string;
  pm?: string;
  orm?: string;
  modules?: string[];
};

export const TOTAL_STEPS = 6;
export const INNER = 46;

function box(lines: string[]): string[] {
  const top = pc.dim("╭" + "─".repeat(INNER + 2) + "╮");
  const bot = pc.dim("╰" + "─".repeat(INNER + 2) + "╯");
  return [
    top,
    ...lines.map(
      (l) =>
        pc.dim("│") + " " + padVisible(fitAnsi(l, INNER), INNER) + " " + pc.dim("│"),
    ),
    bot,
  ];
}

export type PanelKey = keyof PanelSummary;

export function panel(
  title: string,
  s: PanelSummary,
  step: number,
  active?: PanelKey,
): string[] {
  const row = (key: PanelKey, label: string, value?: string): string => {
    const marker = active === key ? pc.yellow("▸ ") : "  ";
    const prefix = `${marker}${pc.dim(label.padEnd(11))} `;
    const prefixWidth = visibleWidth(prefix);
    const budget = INNER - prefixWidth;
    const val = value
      ? pc.cyan(fitAnsi(value, budget))
      : pc.dim("···");
    return `${prefix}${val}`;
  };
  const dots = Array.from({ length: TOTAL_STEPS }, (_, i) =>
    i < step
      ? paint("●", CYAN)
      : i === step
        ? pc.yellow("●")
        : pc.dim("○"),
  ).join(" ");
  const titleText = pc.bold(pc.white(title));
  const meta = `${dots}${pc.dim(`  ${Math.min(step + 1, TOTAL_STEPS)}/${TOTAL_STEPS}`)}`;
  const titleBudget = INNER - visibleWidth(meta) - 2;
  return box([
    `${fitAnsi(titleText, Math.max(8, titleBudget))}  ${meta}`,
    pc.dim("─".repeat(INNER)),
    row("name", "name", s.name),
    row("runtime", "runtime", s.runtime),
    row("framework", "engine", s.framework),
    row("pm", "installer", s.pm),
    row("orm", "database", s.orm ? `PostgreSQL (${s.orm})` : undefined),
    row("modules", "modules", s.modules ? s.modules.join(", ") || "none" : undefined),
  ]);
}

export function frame(right: string[]): void {
  if (!isTTY()) {
    for (const line of right) console.log(line);
    return;
  }
  console.clear();
  const columns = process.stdout.columns ?? 80;
  if (columns < ICON_WIDTH + INNER + 8) {
    // too narrow for the side-by-side layout — print the panel alone
    for (const line of right) console.log(line);
    console.log();
    return;
  }
  const icon = iconColumn();
  const rows = Math.max(icon.length, right.length);
  console.log();
  for (let i = 0; i < rows; i++) {
    console.log(`  ${padVisible(icon[i] ?? "", ICON_WIDTH)} ${right[i] ?? ""}`);
  }
  console.log();
}
