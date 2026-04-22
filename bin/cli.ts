#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Image protocol ──────────────────────────────────────
function getImage(): string | null {
  const f = join(__dirname, "..", "avatar.png");
  if (!existsSync(f)) return null;
  const b64 = readFileSync(f).toString("base64");
  if (process.env.KITTY_WINDOW_ID || process.env.TERM?.includes("kitty")) {
    const out: string[] = [];
    for (let i = 0; i < b64.length; i += 4096) {
      const chunk = b64.slice(i, i + 4096);
      const m = i + 4096 >= b64.length ? 0 : 1;
      out.push(i === 0 ? `\x1b_Ga=T,f=100,c=8,r=4,m=${m};${chunk}\x1b\\` : `\x1b_Gm=${m};${chunk}\x1b\\`);
    }
    return out.join("");
  }
  if (process.env.ITERM_SESSION_ID || process.env.TERM_PROGRAM === "iTerm.app")
    return `\x1b]1337;File=inline=1;width=8;height=4:${b64}\x07`;
  return null;
}

const image = getImage();

// ── ANSI ────────────────────────────────────────────────
const rgb = (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`;
const link = (url: string, text: string) => `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
const bold = "\x1b[1m";
const reset = "\x1b[0m";
const yellow = rgb(255, 215, 0);
const vue = rgb(66, 184, 131);
const vite = rgb(189, 52, 254);

// Vite purple #BD34FE → cyan #41D1FF の線形補間 (15 steps)
const g = Array.from({ length: 15 }, (_, i) =>
  rgb(
    Math.round(189 - 124 * i / 14),
    Math.round(52  + 157 * i / 14),
    Math.round(254 +   1 * i / 14),
  )
);

// ── Padding helper ──────────────────────────────────────
const INNER = 56;

function p(s: string): string {
  const clean = s.replace(/\x1b\[[0-9;]*m|\x1b\]8;;[^\x1b]*\x1b\\/g, "");
  let w = 0;
  for (const c of clean) {
    const cp = c.codePointAt(0) ?? 0;
    w += (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0x9fff) ||
         (cp >= 0xac00 && cp <= 0xd7af) || (cp >= 0xf900 && cp <= 0xfaff) ||
         (cp >= 0x1f300 && cp <= 0x1f9ff) || (cp >= 0x20000 && cp <= 0x2ffff) ? 2 : 1;
  }
  return s + " ".repeat(Math.max(0, INNER - w));
}

// ── Box ─────────────────────────────────────────────────
const box = `
${g[0]}┏━━━━━━━${g[1]}━━━━━━━${g[2]}━━━━━━━${g[3]}━━━━━━${g[4]}━━━━━━${g[5]}━━━━━━${g[6]}━━━━━━${g[7]}━━━━━━${g[8]}━━━━━┓
${g[0]}┃${reset}${p("")}${g[9]}┃
${g[0]}┃${reset}${p(`   ${bold}NaokiHaba${reset}`)}${g[9]}┃
${g[0]}┃${reset}${p("   Front-end Developer")}${g[9]}┃
${g[1]}┃${reset}${p("")}${g[10]}┃
${g[1]}┃${reset}${p(`   ${vite}⚡ Vite+ Core Contributor${reset}`)}${g[10]}┃
${g[2]}┃${reset}${p(`   ${vue}💚 Vue Fes Japan Core Team${reset}`)}${g[11]}┃
${g[2]}┃${reset}${p(`   📦 ${link("https://github.com/chibivue-land/vueyous", vue + "vueyous" + reset)}`)}${g[11]}┃
${g[3]}┃${reset}${p("")}${g[12]}┃
${g[3]}┃${reset}${p(`   🐙 ${yellow}GitHub${reset}   ${link("https://github.com/naokihaba", "github.com/naokihaba")}`)}${g[12]}┃
${g[4]}┃${reset}${p(`   🐦 ${yellow}X${reset}        ${link("https://x.com/naokihaba", "@naokihaba")}`)}${g[13]}┃
${g[4]}┃${reset}${p(`   🌐 ${yellow}Blog${reset}     ${link("https://blog.naokihaba.com", "blog.naokihaba.com")}`)}${g[13]}┃
${g[5]}┃${reset}${p(`   ⚡ ${yellow}Vite+${reset}    ${link("https://viteplus.dev/team", "viteplus.dev/team")}`)}${g[13]}┃
${g[5]}┃${reset}${p("")}${g[14]}┃
${g[13]}┗━━━━━━━━${g[12]}━━━━━━━━${g[11]}━━━━━━━━${g[10]}━━━━━━━━${g[9]}━━━━━━━━${g[8]}━━━━━━━━${g[7]}━━━━━━━━┛${reset}
`;

console.log(box);

if (image) {
  const up = (n: number) => `\x1b[${n}A`;
  const right = (n: number) => `\x1b[${n}C`;
  process.stdout.write(`${up(7)}${right(49)}${image}\x1b[1G`);
}
