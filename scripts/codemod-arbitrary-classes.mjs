#!/usr/bin/env node
/**
 * Codemod — replace arbitrary Tailwind utilities with named design tokens.
 *
 * Pixel-invariant by construction:
 *  - Typography: arbitrary `text-[NNpx]` set font-size only (line-height comes
 *    from cascade). They map to font-size-only tokens (text-body/text-caption/
 *    text-NN) defined in tailwind.config.js — NOT to Tailwind's default scale
 *    (text-base/sm/...) which would force a line-height and shift layout.
 *  - Radius: arbitrary `rounded[-dir]-[NNpx]` map to exact Tailwind defaults
 *    where they exist (8→lg, 12→xl, 16→2xl, 24→3xl) or to numeric rounded-NN
 *    tokens; border-radius has no side effects, so values stay identical.
 *
 * Usage:
 *   node scripts/codemod-arbitrary-classes.mjs --kind radius            # apply radius
 *   node scripts/codemod-arbitrary-classes.mjs --kind text  --dry-run   # preview typography
 *   node scripts/codemod-arbitrary-classes.mjs --kind all  --dir src/components/admin
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

// px → token name (font-size only). See tailwind.config.js theme.extend.fontSize.
const TEXT = {
  8: '8', 9: '9', 10: '10', 11: '11', 12: '12', 13: '13', 14: 'caption',
  15: '15', 16: 'body', 17: '17', 18: '18', 19: '19', 20: '20', 22: '22',
  30: '30', 32: '32', 38: '38', 120: '120', 160: '160',
};

// px → radius token. lg/xl/2xl/3xl are exact Tailwind defaults (reused);
// the rest are numeric tokens in tailwind.config.js theme.extend.borderRadius.
const RADIUS = {
  7: '7', 8: 'lg', 9: '9', 10: '10', 11: '11', 12: 'xl', 13: '13', 14: '14',
  16: '2xl', 18: '18', 20: '20', 22: '22', 24: '3xl', 26: '26', 28: '28',
  30: '30', 32: '32', 40: '40', 56: '56',
};

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valOf = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const kind = valOf('--kind') || 'all';
const dryRun = has('--dry-run');
const rootDir = valOf('--dir') || 'src';

const TEXT_RE = /\btext-\[(\d+)px\]/g;
const RADIUS_RE = /\brounded((?:-[a-z]{1,2})?)-\[(\d+)px\]/g;

const tally = new Map();
const unmapped = new Set();
let filesChanged = 0;
let totalReplacements = 0;

function transform(src) {
  let out = src;
  if (kind === 'text' || kind === 'all') {
    out = out.replace(TEXT_RE, (m, px) => {
      const t = TEXT[Number(px)];
      if (!t) { unmapped.add(m); return m; }
      const to = `text-${t}`;
      tally.set(`${m} → ${to}`, (tally.get(`${m} → ${to}`) || 0) + 1);
      return to;
    });
  }
  if (kind === 'radius' || kind === 'all') {
    out = out.replace(RADIUS_RE, (m, dir, px) => {
      const t = RADIUS[Number(px)];
      if (!t) { unmapped.add(m); return m; }
      const to = `rounded${dir}-${t}`;
      tally.set(`${m} → ${to}`, (tally.get(`${m} → ${to}`) || 0) + 1);
      return to;
    });
  }
  return out;
}

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { yield* walk(p); }
    else if (/\.(tsx|ts)$/.test(entry.name)) { yield p; }
  }
}

for await (const file of walk(rootDir)) {
  const src = await fs.readFile(file, 'utf8');
  const out = transform(src);
  if (out !== src) {
    filesChanged++;
    const n = (src.match(kind === 'radius' ? RADIUS_RE : kind === 'text' ? TEXT_RE : /\b(?:text|rounded(?:-[a-z]{1,2})?)-\[\d+px\]/g) || []).length;
    totalReplacements += n;
    if (!dryRun) await fs.writeFile(file, out, 'utf8');
  }
}

console.log(`\n[codemod] kind=${kind} dir=${rootDir} ${dryRun ? '(DRY RUN)' : '(APPLIED)'}`);
console.log(`files changed: ${filesChanged}  |  replacements: ${totalReplacements}`);
console.log('\nreplacement breakdown:');
[...tally.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
if (unmapped.size) console.log(`\n⚠ UNMAPPED (left as-is, add to map): ${[...unmapped].join(', ')}`);
