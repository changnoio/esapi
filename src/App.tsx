import { useMemo, useRef, useState } from "react";
import { SiteConfig, blankSite } from "./lib/types";
import { PRESETS } from "./lib/presets";
import { generateScript, scriptFileName } from "./lib/generate";
import { parseWorkbook } from "./lib/parseExcel";
import { CheckboxField, NumberField, Section, SelectField, TextField } from "./components/fields";
import {
  ArcsEditor,
  SetupEditor,
  StructureMatchesEditor,
  SuggestedEditor,
  TargetLevelsEditor,
} from "./components/editors";

function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T;
}

export default function App() {
  const [sites, setSites] = useState<SiteConfig[]>(() => PRESETS.map(clone));
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cfg = sites[active];

  // Recompute the script when the active config changes. The timestamp is held
  // stable per edit-session so the preview does not churn every keystroke.
  const script = useMemo(() => generateScript(cfg), [cfg]);

  function patch(p: Partial<SiteConfig>) {
    setSites((prev) => prev.map((s, i) => (i === active ? { ...s, ...p } : s)));
  }

  function download(text: string, filename: string) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadActive() {
    download(generateScript(cfg), scriptFileName(cfg));
  }

  function downloadAll() {
    sites.forEach((s) => download(generateScript(s), scriptFileName(s)));
  }

  function copyToClipboard() {
    navigator.clipboard?.writeText(script).then(
      () => flash("Script copied to clipboard."),
      () => flash("Could not copy to clipboard.")
    );
  }

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3500);
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const parsed = parseWorkbook(buf);
      if (parsed.length === 0) {
        flash("No site blocks found in that workbook.");
      } else {
        setSites(parsed);
        setActive(0);
        flash(`Imported ${parsed.length} site(s) from ${file.name}.`);
      }
    } catch (err) {
      flash("Import failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function resetPresets() {
    setSites(PRESETS.map(clone));
    setActive(0);
    flash("Reset to built-in presets.");
  }

  function addSite() {
    setSites((prev) => [...prev, blankSite(`Site${prev.length + 1}`, `Site ${prev.length + 1}`)]);
    setActive(sites.length);
  }

  function removeSite(i: number) {
    if (sites.length <= 1) return;
    setSites((prev) => prev.filter((_, idx) => idx !== i));
    setActive((a) => (a >= i && a > 0 ? a - 1 : a));
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>ESAPI AutoPlan</strong> <span>Script Generator</span>
        </div>
        <div className="toolbar">
          <button onClick={() => fileRef.current?.click()}>Import Excel…</button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={onImport}
          />
          <button onClick={resetPresets}>Reset presets</button>
          <button className="primary" onClick={downloadActive}>
            Download {scriptFileName(cfg)}
          </button>
          <button onClick={downloadAll}>Download all ({sites.length})</button>
        </div>
      </header>

      {notice && <div className="notice">{notice}</div>}

      <div className="tabs">
        {sites.map((s, i) => (
          <div key={i} className={"tab" + (i === active ? " active" : "")}>
            <button className="tab-btn" onClick={() => setActive(i)}>
              {s.siteName || s.siteKey || `Site ${i + 1}`}
            </button>
            {sites.length > 1 && (
              <button className="tab-x" title="Remove site" onClick={() => removeSite(i)}>
                ×
              </button>
            )}
          </div>
        ))}
        <button className="tab-add" onClick={addSite}>
          + Site
        </button>
      </div>

      <div className="layout">
        <div className="form">
          <Section title="Site identity">
            <div className="grid2">
              <TextField label="Site key (file/course id)" value={cfg.siteKey} onChange={(v) => patch({ siteKey: v })} hint="e.g. HN — used in AutoPlan_<key>.cs" />
              <TextField label="Site name (display)" value={cfg.siteName} onChange={(v) => patch({ siteName: v })} hint="e.g. H&N" />
            </div>
          </Section>

          <Section title="Machine / energy">
            <div className="grid2">
              <TextField label="Machine ID" value={cfg.machineId} onChange={(v) => patch({ machineId: v })} hint="MUST match your Linac" />
              <TextField label="Energy" value={cfg.energy} onChange={(v) => patch({ energy: v })} />
              <NumberField label="Dose rate (MU/min)" value={cfg.doseRate} onChange={(v) => patch({ doseRate: v })} />
              <TextField label="Technique" value={cfg.technique} onChange={(v) => patch({ technique: v })} />
            </div>
          </Section>

          <Section title="Prescription">
            <div className="grid2">
              <NumberField label="Number of fractions" value={cfg.nFractions} onChange={(v) => patch({ nFractions: v })} />
              <NumberField label="Dose per fraction (Gy)" value={cfg.dosePerFxGy} onChange={(v) => patch({ dosePerFxGy: v })} />
              <NumberField label="Treat % (1.0 = 100%)" value={cfg.treatPct} onChange={(v) => patch({ treatPct: v })} />
              <TextField label="Rx target structure ID" value={cfg.rxTargetId} onChange={(v) => patch({ rxTargetId: v })} />
            </div>
            <p className="calc">
              Total dose: <strong>{(cfg.dosePerFxGy * cfg.nFractions).toFixed(3)} Gy</strong>
            </p>
          </Section>

          <Section title="Algorithms" subtitle="Strings must match your Eclipse install.">
            <div className="grid1">
              <TextField label="Optimization algorithm" value={cfg.optAlgo} onChange={(v) => patch({ optAlgo: v })} />
              <TextField label="Volume dose algorithm" value={cfg.doseAlgo} onChange={(v) => patch({ doseAlgo: v })} />
              <TextField label="DVH estimation algorithm" value={cfg.dvhAlgo} onChange={(v) => patch({ dvhAlgo: v })} />
            </div>
          </Section>

          <Section title="RapidPlan">
            <div className="grid2">
              <TextField label="RapidPlan model ID" value={cfg.rpModelId} onChange={(v) => patch({ rpModelId: v })} />
              <CheckboxField label="Requires structure mapping" value={cfg.requiresStructureMapping} onChange={(v) => patch({ requiresStructureMapping: v })} />
            </div>
          </Section>

          <Section title="Arc geometry">
            <ArcsEditor arcs={cfg.arcs} onChange={(arcs) => patch({ arcs })} />
          </Section>

          <Section title="Target dose levels (RapidPlan)">
            <TargetLevelsEditor levels={cfg.targetLevels} onChange={(targetLevels) => patch({ targetLevels })} />
          </Section>

          <Section title="Structure matches" subtitle="Patient structure ID → RapidPlan model structure ID.">
            <StructureMatchesEditor matches={cfg.structureMatches} onChange={(structureMatches) => patch({ structureMatches })} />
          </Section>

          <Section title="Suggested matches (commented hints)">
            <SuggestedEditor items={cfg.suggestedMatches} onChange={(suggestedMatches) => patch({ suggestedMatches })} />
          </Section>

          <Section title="Setup fields">
            <SetupEditor fields={cfg.setupFields} onChange={(setupFields) => patch({ setupFields })} />
          </Section>

          <Section title="Course / plan identity">
            <div className="grid2">
              <TextField label="Course ID base" value={cfg.courseIdBase} onChange={(v) => patch({ courseIdBase: v })} />
              <TextField label="Plan ID base" value={cfg.planIdBase} onChange={(v) => patch({ planIdBase: v })} />
              <SelectField label="Isocenter source" value={cfg.isocenterSource} options={["user_origin", "target_com"]} onChange={(v) => patch({ isocenterSource: v })} />
            </div>
          </Section>

          <Section title="Normal Tissue Objective (NTO)">
            <div className="grid2">
              <CheckboxField label="Automatic NTO" value={cfg.nto.automatic} onChange={(v) => patch({ nto: { ...cfg.nto, automatic: v } })} />
              <NumberField label="Priority" value={cfg.nto.priority} onChange={(v) => patch({ nto: { ...cfg.nto, priority: v } })} />
              <NumberField label="Distance (mm)" value={cfg.nto.distMm} onChange={(v) => patch({ nto: { ...cfg.nto, distMm: v } })} />
              <NumberField label="Start %" value={cfg.nto.startPct} onChange={(v) => patch({ nto: { ...cfg.nto, startPct: v } })} />
              <NumberField label="End %" value={cfg.nto.endPct} onChange={(v) => patch({ nto: { ...cfg.nto, endPct: v } })} />
              <NumberField label="Falloff" value={cfg.nto.falloff} onChange={(v) => patch({ nto: { ...cfg.nto, falloff: v } })} />
            </div>
          </Section>

          <Section title="Safety gates">
            <div className="grid2">
              <CheckboxField label="Require confirmation" value={cfg.gates.requireConfirmation} onChange={(v) => patch({ gates: { ...cfg.gates, requireConfirmation: v } })} />
              <CheckboxField label="Stop after DVH estimate" value={cfg.gates.stopAfterDvh} onChange={(v) => patch({ gates: { ...cfg.gates, stopAfterDvh: v } })} />
              <CheckboxField label="Auto optimize" value={cfg.gates.autoOptimize} onChange={(v) => patch({ gates: { ...cfg.gates, autoOptimize: v } })} />
              <CheckboxField label="Calc dose after opt" value={cfg.gates.calcDoseAfterOpt} onChange={(v) => patch({ gates: { ...cfg.gates, calcDoseAfterOpt: v } })} />
              <CheckboxField label="Abort if course exists" value={cfg.gates.abortIfCourseExists} onChange={(v) => patch({ gates: { ...cfg.gates, abortIfCourseExists: v } })} />
              <CheckboxField label="Write report" value={cfg.gates.writeReport} onChange={(v) => patch({ gates: { ...cfg.gates, writeReport: v } })} />
            </div>
            <TextField label="Report directory" value={cfg.gates.reportDir} onChange={(v) => patch({ gates: { ...cfg.gates, reportDir: v } })} />
          </Section>

          <Section title="DRR">
            <div className="grid2">
              <CheckboxField label="DRR enabled" value={cfg.drr.enabled} onChange={(v) => patch({ drr: { ...cfg.drr, enabled: v } })} />
              <NumberField label="DRR weight" value={cfg.drr.weight} onChange={(v) => patch({ drr: { ...cfg.drr, weight: v } })} />
            </div>
          </Section>
        </div>

        <div className="preview">
          <div className="preview-head">
            <span className="preview-name">{scriptFileName(cfg)}</span>
            <div className="preview-actions">
              <button onClick={copyToClipboard}>Copy</button>
              <button className="primary" onClick={downloadActive}>Download .cs</button>
            </div>
          </div>
          <pre className="code">{script}</pre>
        </div>
      </div>

      <footer className="footer">
        Generates a <strong>DRAFT</strong> ESAPI plug-in script for offline review. A qualified
        medical physicist must review every plan, objective and dose distribution before any
        clinical use.
      </footer>
    </div>
  );
}
