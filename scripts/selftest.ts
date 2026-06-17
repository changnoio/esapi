// Self-test: the generated script for each preset must match the original
// reference template byte-for-byte (with a fixed UTC stamp). Run via:
//   node_modules/.bin/esbuild scripts/selftest.ts --bundle --platform=node \
//     --format=esm --outfile=/tmp/selftest.mjs && node /tmp/selftest.mjs
import fs from "node:fs";
import { PRESETS } from "../src/lib/presets";
import { generateScript, scriptFileName } from "../src/lib/generate";

const STAMP = "2026-06-17 16:17:37 UTC"; // matches the reference templates

const originals: Record<string, string | undefined> = {
  HN: process.env.HN,
  Lungs: process.env.LUNGS,
  Prostate: process.env.PROSTATE,
};

function norm(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n+$/, "\n");
}

let failures = 0;
for (const cfg of PRESETS) {
  const gen = norm(generateScript(cfg, STAMP));
  const path = originals[cfg.siteKey];
  if (!path) {
    console.log(`SKIP ${cfg.siteKey}: no original provided`);
    continue;
  }
  const orig = norm(fs.readFileSync(path, "utf8"));
  if (gen === orig) {
    console.log(`PASS ${scriptFileName(cfg)} (${gen.length} chars)`);
  } else {
    failures++;
    const a = gen.split("\n");
    const b = orig.split("\n");
    const max = Math.max(a.length, b.length);
    console.log(`FAIL ${scriptFileName(cfg)} (gen ${a.length} lines vs orig ${b.length} lines)`);
    let shown = 0;
    for (let i = 0; i < max && shown < 6; i++) {
      if (a[i] !== b[i]) {
        console.log(`  line ${i + 1}:`);
        console.log(`    gen : ${JSON.stringify(a[i])}`);
        console.log(`    orig: ${JSON.stringify(b[i])}`);
        shown++;
      }
    }
  }
}
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
