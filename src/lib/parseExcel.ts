import * as XLSX from "xlsx";
import { Arc, newArc, SiteConfig } from "./types";
import { findPreset } from "./presets";
import { blankSite } from "./types";

type Row = Array<string | number | null>;
type Token = { c: number; v: string };

function str(v: string | number | null | undefined): string {
  return v == null ? "" : String(v).trim();
}

function num(v: string | number | null | undefined, fallback = 0): number {
  const n = typeof v === "number" ? v : parseFloat(str(v));
  return Number.isFinite(n) ? n : fallback;
}

/** Non-empty trimmed cells within [c0, c1) of a row. */
function tokens(row: Row, c0: number, c1: number): Token[] {
  const out: Token[] = [];
  for (let c = c0; c < c1; c++) {
    const v = str(row?.[c]);
    if (v !== "") out.push({ c, v });
  }
  return out;
}

function normalizeAlgo(s: string): string {
  // Excel uses "(version 17.0.1)" whereas Eclipse/ESAPI uses "[17.0.1]".
  return s.replace(/\(version\s*([^)]+)\)/i, "[$1]").trim();
}

function parseGantry(range: string): [number, number] {
  const parts = range.split("-").map((p) => parseFloat(p.trim()));
  return [parts[0] || 0, parts[1] || 0];
}

function parseSector(s: string): [number, number] | null {
  const t = s.trim();
  if (!t || /^no$/i.test(t)) return null;
  const parts = t.split("-").map((p) => parseFloat(p.trim()));
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  return [parts[0], parts[1]];
}

function findArcNum(toks: Token[]): { idx: number; n: number } | null {
  for (let i = 0; i < toks.length; i++) {
    const m = /^arc\s*(\d+)$/i.exec(toks[i].v);
    if (m) return { idx: i, n: parseInt(m[1], 10) };
  }
  return null;
}

type ArcAccum = {
  gantry?: [number, number];
  direction?: "CW" | "CCW";
  collimator?: number;
  doseRate?: number;
  avoid: Array<[number, number]>;
};

/** Parse one site block spanning columns [c0, c1). */
function parseBlock(rows: Row[], c0: number, c1: number, headerRow: number): SiteConfig | null {
  const siteName = str(rows[headerRow]?.[c0 + 1]);
  if (!siteName) return null;

  const presetClone = (): SiteConfig => {
    const p = findPreset(siteName);
    return p ? (JSON.parse(JSON.stringify(p)) as SiteConfig) : blankSite(siteName, siteName);
  };
  const cfg = presetClone();
  cfg.siteName = siteName;

  const arcs: Record<number, ArcAccum> = {};
  const ensureArc = (n: number) => (arcs[n] ??= { avoid: [] });

  type Section = "none" | "gantry" | "collimator" | "doserate";
  let section: Section = "none";

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const toks = tokens(row, c0, c1);
    if (toks.length === 0) continue;

    const label = str(row[c0]).toLowerCase();

    // Section headers (label sits in the block's first column).
    if (label.startsWith("gantry rotation")) section = "gantry";
    else if (label.startsWith("collimator angle")) section = "collimator";
    else if (label.startsWith("dose rates")) section = "doserate";
    else if (label.startsWith("dose per fraction")) {
      cfg.dosePerFxGy = num(toks[1]?.v, cfg.dosePerFxGy);
      section = "none";
      continue;
    } else if (label.startsWith("number of frac")) {
      cfg.nFractions = num(toks[1]?.v, cfg.nFractions);
      section = "none";
      continue;
    } else if (label.startsWith("beam energy")) {
      cfg.energy = toks[1]?.v ?? cfg.energy;
      section = "none";
      continue;
    } else if (label.startsWith("optimization algorithm")) {
      cfg.optAlgo = toks[1]?.v ?? cfg.optAlgo;
      section = "none";
      continue;
    } else if (label.startsWith("volume cal")) {
      cfg.doseAlgo = toks[1]?.v ?? cfg.doseAlgo;
      section = "none";
      continue;
    } else if (label.startsWith("dvh estimation")) {
      cfg.dvhAlgo = normalizeAlgo(toks[1]?.v ?? cfg.dvhAlgo);
      section = "none";
      continue;
    } else if (label.startsWith("rapid plan model")) {
      cfg.rpModelId = toks[1]?.v ?? cfg.rpModelId;
      section = "none";
      continue;
    }

    // Arc-based sections: rows carry an "Arc N" token.
    const found = findArcNum(toks);
    if (found && section !== "none") {
      const acc = ensureArc(found.n);
      const after = toks.slice(found.idx + 1);
      if (section === "gantry") {
        if (after[0]) acc.gantry = parseGantry(after[0].v);
        if (after[1]) acc.direction = /ccw/i.test(after[1].v) ? "CCW" : "CW";
        // Optional "Avoid arc" group following the direction.
        const avoidIdx = after.findIndex((t) => /^avoid arc$/i.test(t.v));
        if (avoidIdx >= 0) {
          for (const t of after.slice(avoidIdx + 1)) {
            const sec = parseSector(t.v);
            if (sec) acc.avoid.push(sec);
          }
        }
      } else if (section === "collimator") {
        if (after[0]) acc.collimator = num(after[0].v);
      } else if (section === "doserate") {
        if (after[0]) acc.doseRate = num(after[0].v);
      }
    }
  }

  // Merge parsed arc data onto preset arcs (or defaults).
  const arcNums = Object.keys(arcs)
    .map((k) => parseInt(k, 10))
    .sort((a, b) => a - b);
  if (arcNums.length > 0) {
    const builtArcs: Arc[] = arcNums.map((n, i) => {
      const baseArc: Arc = cfg.arcs[i]
        ? (JSON.parse(JSON.stringify(cfg.arcs[i])) as Arc)
        : newArc(`A${n}`);
      const acc = arcs[n];
      baseArc.id = `A${n}`;
      if (acc.gantry) {
        baseArc.gantryStart = acc.gantry[0];
        baseArc.gantryStop = acc.gantry[1];
      }
      if (acc.direction) baseArc.direction = acc.direction;
      if (acc.collimator != null) baseArc.collimatorAngle = acc.collimator;
      if (acc.doseRate != null) baseArc.doseRate = acc.doseRate;
      baseArc.avoidSectors = acc.avoid;
      return baseArc;
    });
    cfg.arcs = builtArcs;
    if (builtArcs[0]) cfg.doseRate = builtArcs[0].doseRate;
  }

  return cfg;
}

/** Locate the header row + the column where each site block begins. */
function findBlocks(rows: Row[]): { headerRow: number; starts: number[] } | null {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const starts: number[] = [];
    for (let c = 0; c < row.length; c++) {
      if (/^parameters$/i.test(str(row[c]))) starts.push(c);
    }
    if (starts.length >= 1) return { headerRow: r, starts };
  }
  return null;
}

/** Parse an uploaded .xlsx (template layout) into one SiteConfig per block. */
export function parseWorkbook(data: ArrayBuffer): SiteConfig[] {
  const wb = XLSX.read(data, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: true, defval: null });

  const blocks = findBlocks(rows);
  if (!blocks) {
    throw new Error(
      'Could not find a "Parameters" header row. Expected the supplied template layout.'
    );
  }

  // Determine each block's column span (up to the next block, or last used column).
  const maxCol = rows.reduce((m, r) => Math.max(m, r ? r.length : 0), 0);
  const bounds = blocks.starts.map((c0, i) => ({
    c0,
    c1: i + 1 < blocks.starts.length ? blocks.starts[i + 1] : maxCol,
  }));

  const configs: SiteConfig[] = [];
  for (const b of bounds) {
    const cfg = parseBlock(rows, b.c0, b.c1, blocks.headerRow);
    if (cfg) configs.push(cfg);
  }
  return configs;
}
