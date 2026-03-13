#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ──────────────────────────────────────────────
// Terminal image protocol (posva style)
// ──────────────────────────────────────────────

type ImageProtocol = "kitty" | "iterm" | "none";

function detectImageProtocol(): ImageProtocol {
  if (process.env.KITTY_WINDOW_ID || process.env.TERM?.includes("kitty"))
    return "kitty";
  if (
    process.env.ITERM_SESSION_ID ||
    process.env.TERM_PROGRAM === "iTerm.app"
  )
    return "iterm";
  return "none";
}

function kittyImage(pngPath: string, cols = 8, rows = 4): string {
  if (!existsSync(pngPath)) return "";
  const data = readFileSync(pngPath);
  const b64 = data.toString("base64");
  const chunks: string[] = [];
  const chunkSize = 4096;
  for (let i = 0; i < b64.length; i += chunkSize) {
    const chunk = b64.slice(i, i + chunkSize);
    const m = i + chunkSize >= b64.length ? 0 : 1;
    chunks.push(
      i === 0
        ? `\x1b_Ga=T,f=100,c=${cols},r=${rows},m=${m};${chunk}\x1b\\`
        : `\x1b_Gm=${m};${chunk}\x1b\\`
    );
  }
  return chunks.join("");
}

function itermImage(pngPath: string, cols = 8, rows = 4): string {
  if (!existsSync(pngPath)) return "";
  const b64 = readFileSync(pngPath).toString("base64");
  return `\x1b]1337;File=inline=1;width=${cols};height=${rows}:${b64}\x07`;
}

const imageProtocol = detectImageProtocol();

function getGraphicalImage(): string | null {
  const pngPath = join(__dirname, "..", "avatar.png");
  if (imageProtocol === "kitty") return kittyImage(pngPath, 8, 4);
  if (imageProtocol === "iterm") return itermImage(pngPath, 8, 4);
  return null;
}

const graphicalImage = getGraphicalImage();

// ──────────────────────────────────────────────
// ANSI helpers
// ──────────────────────────────────────────────

const ESC = "\x1B";
const RESET = `${ESC}[0m`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;

const rgb = (r: number, g: number, b: number) =>
  `${ESC}[38;2;${r};${g};${b}m`;

// OSC 8 hyperlink (ST terminator, posva style)
const link = (url: string, text: string) =>
  `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;

// ──────────────────────────────────────────────
// Color palette
// ──────────────────────────────────────────────

const C = {
  vue: rgb(66, 184, 131),
  cyan: rgb(0, 200, 220),
  orange: rgb(255, 160, 70),
  yellow: rgb(255, 215, 0),
  white: rgb(255, 255, 255),
  gray: rgb(150, 150, 150),
};

// Rainbow gradient for border (posva style)
const RAINBOW = [
  rgb(66, 184, 131),
  rgb(40, 190, 160),
  rgb(20, 185, 200),
  rgb(30, 160, 230),
  rgb(60, 130, 250),
  rgb(110, 100, 255),
  rgb(160, 80, 255),
  rgb(210, 60, 220),
  rgb(250, 70, 160),
  rgb(255, 100, 90),
  rgb(255, 150, 50),
  rgb(240, 200, 40),
  rgb(180, 220, 60),
  rgb(100, 215, 110),
  rgb(66, 184, 131),
];

// Name gradient: Vue green → purple
const NAME_GRADIENT = [
  rgb(66, 184, 131),
  rgb(55, 170, 150),
  rgb(40, 155, 175),
  rgb(30, 140, 200),
  rgb(70, 120, 235),
  rgb(120, 105, 255),
];

function gradientText(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const idx = Math.floor((i / text.length) * NAME_GRADIENT.length);
    result += NAME_GRADIENT[idx] + text[i];
  }
  return result + RESET;
}

function rb(pos: number): string {
  const idx = Math.min(
    Math.floor(pos * (RAINBOW.length - 1)),
    RAINBOW.length - 1
  );
  return RAINBOW[idx];
}

// ──────────────────────────────────────────────
// Box drawing
// ──────────────────────────────────────────────

const WIDTH = 60;
const INNER_WIDTH = WIDTH - 4;

function getDisplayWidth(str: string): number {
  // eslint-disable-next-line no-control-regex
  const clean = str.replace(
    /\x1b\[[0-9;]*m|\x1b\]8;;[^\x1b]*\x1b\\/g,
    ""
  );
  let width = 0;
  for (const char of clean) {
    const code = char.codePointAt(0) || 0;
    if (
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0xac00 && code <= 0xd7af) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1f9ff) ||
      (code >= 0x20000 && code <= 0x2ffff)
    )
      width += 2;
    else width += 1;
  }
  return width;
}

function padRight(str: string, targetWidth: number): string {
  const padding = targetWidth - getDisplayWidth(str);
  return str + " ".repeat(Math.max(0, padding));
}

function rainbowBorder(char: string, pos: number): string {
  return rb(pos) + char + RESET;
}

function topBorder(): string {
  const inner = WIDTH - 2;
  const dashes = Array.from({ length: inner }, (_, i) =>
    rb(i / inner) + "─"
  ).join("");
  return `${rb(0)}╭${dashes}${rb(1)}╮${RESET}`;
}

function bottomBorder(): string {
  const inner = WIDTH - 2;
  const dashes = Array.from({ length: inner }, (_, i) =>
    rb(i / inner) + "─"
  ).join("");
  return `${rb(0)}╰${dashes}${rb(1)}╯${RESET}`;
}

function separator(startPos = 0.3, endPos = 0.7): string {
  const inner = WIDTH - 2;
  const dashes = Array.from({ length: inner }, (_, i) =>
    rb(startPos + (i / inner) * (endPos - startPos)) + "─"
  ).join("");
  return `${rb(startPos)}├${dashes}${rb(endPos)}┤${RESET}`;
}

function createLine(
  content: string,
  lPos = 0.1,
  rPos = 0.9
): string {
  return `${rainbowBorder("│", lPos)} ${padRight(content, INNER_WIDTH)} ${rainbowBorder("│", rPos)}`;
}

function createEmptyLine(lPos = 0.1, rPos = 0.9): string {
  return `${rainbowBorder("│", lPos)}${" ".repeat(WIDTH - 2)}${rainbowBorder("│", rPos)}`;
}

// ──────────────────────────────────────────────
// Profile content
// ──────────────────────────────────────────────

// TODO(human): 以下の profile・projects・socials を自分の情報に書き換えてください

const profile = {
  name: "NaokiHaba",
  role: "💚 Front-end Developer",
  interests: "Vue · Nuxt · TypeScript · Tokyo 🗾",
};

const authored: { name: string; url: string }[] = [
  { name: "vueyous", url: "https://github.com/chibivue-land/vueyous" },
];

const communities: { name: string; url: string }[] = [
  { name: "Vue Fes Japan Core Team", url: "https://vuefes.jp" },
];

const oss: { name: string; url: string }[] = [
  { name: "vuejs/pinia", url: "https://github.com/vuejs/pinia" },
  { name: "nuxt/learn.nuxt.com", url: "https://github.com/nuxt/learn.nuxt.com" },
];

const socials = {
  github: { url: "https://github.com/naokihaba", label: "github.com/naokihaba" },
  twitter: { url: "https://x.com/naokihaba", label: "@naokihaba" },
  blog: { url: "https://naoki-blog-v3.naoworks.workers.dev", label: "naoki-blog-v3.naoworks.workers.dev" },
};

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────

function main() {
  const lines = [
    "",
    topBorder(),
    createEmptyLine(0, 0.15),
    createLine(`${BOLD}${gradientText(profile.name)}${RESET}`, 0, 0.15),
    createEmptyLine(0.05, 0.2),
    createLine(`${C.vue}${profile.role}${RESET}`, 0.08, 0.25),
    createLine(`${DIM}${C.gray}${profile.interests}${RESET}`, 0.1, 0.3),
    createEmptyLine(0.15, 0.4),
    separator(0.15, 0.55),
    createEmptyLine(0.2, 0.45),
    createLine(`${C.orange}✦${RESET} ${C.white}Author${RESET}`, 0.2, 0.45),
    ...authored.map((p) =>
      createLine(`  ${link(p.url, C.cyan + p.name + RESET)}`, 0.25, 0.5)
    ),
    createEmptyLine(0.25, 0.5),
    createLine(`${C.vue}◈${RESET} ${C.white}Community${RESET}`, 0.25, 0.5),
    ...communities.map((p) =>
      createLine(`  ${link(p.url, C.vue + p.name + RESET)}`, 0.3, 0.55)
    ),
    createEmptyLine(0.3, 0.55),
    createLine(`${C.yellow}⚙${RESET} ${C.white}OSS Contribute${RESET}`, 0.3, 0.55),
    ...oss.map((p) =>
      createLine(`  ${link(p.url, C.gray + p.name + RESET)}`, 0.35, 0.6)
    ),
    createEmptyLine(0.4, 0.65),
    separator(0.4, 0.75),
    createEmptyLine(0.55, 0.7),
    createLine(
      `🐙 ${C.yellow}GitHub${RESET}   ${link(socials.github.url, C.gray + socials.github.label + RESET)}`,
      0.55,
      0.75
    ),
    createLine(
      `🐦 ${C.yellow}Twitter${RESET}  ${link(socials.twitter.url, C.gray + socials.twitter.label + RESET)}`,
      0.6,
      0.8
    ),
    createLine(
      `🌐 ${C.yellow}Blog${RESET}     ${link(socials.blog.url, C.gray + socials.blog.label + RESET)}`,
      0.65,
      0.85
    ),
    createEmptyLine(0.75, 0.95),
    bottomBorder(),
    "",
  ];

  process.stdout.write(lines.join("\n") + "\n");

  // Avatar overlay (posva style) — place avatar.png in repo root to activate
  if (graphicalImage) {
    const up = (n: number) => `\x1b[${n}A`;
    const right = (n: number) => `\x1b[${n}C`;
    const col1 = "\x1b[1G";
    process.stdout.write(`${up(7)}${right(47)}${graphicalImage}${col1}`);
  }
}

main();
