# ESAPI AutoPlan Script Generator

A browser-based tool to generate **Varian ESAPI "AutoPlan" plug-in scripts**
(`AutoPlan_<Site>.cs`) from clinical parameters. Enter the data by hand or
import it from the supplied Excel template, preview the generated C# script
live, and download the `.cs` file.

> ⚠️ The generated script creates a **DRAFT** plan in a new course for offline
> review only. A qualified medical physicist must review every plan, objective
> and dose distribution before any clinical use.

## Features

- **Built-in presets** for H&N, Lungs and Prostate (matching the reference
  templates byte-for-byte).
- **Import Excel** (`.xlsx`) in the template layout — each site column-block is
  parsed into an editable configuration.
- Full editor for prescription, machine/energy, algorithms, RapidPlan model,
  arc geometry (incl. avoidance sectors), NTO, safety gates, DRR, target dose
  levels, structure matches and setup fields.
- **Live preview** of the generated ESAPI C# source.
- **Download** a single site's `.cs`, or all sites at once. Copy to clipboard.

## Tech

Vite + React + TypeScript, fully client-side (no backend). Excel parsing uses
[SheetJS](https://sheetjs.com/) (`xlsx`).

## Develop

```bash
npm install
npm run dev      # start dev server
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
```

## How generation works

Each generated script = **dynamic header** + **`GENERATED CONFIGURATION`
region** (built from the site configuration) + **static body** (the
Run/helpers logic, identical across sites — see `src/lib/staticBody.ts`).

The Excel template lays out one column-block per site (`Parameters | <Site>`),
with rows for dose/fraction, fraction count, per-arc gantry/collimator/dose-rate,
avoidance sectors, beam energy, the three algorithm strings and the RapidPlan
model ID. The parser (`src/lib/parseExcel.ts`) reads those blocks and merges the
values onto the matching preset so non-Excel fields keep sensible defaults.

## Project layout

```
src/
  lib/
    types.ts        # SiteConfig data model + helpers
    presets.ts      # H&N / Lungs / Prostate presets
    staticBody.ts   # verbatim static C# body
    generate.ts     # SiteConfig -> C# source
    parseExcel.ts   # .xlsx (template layout) -> SiteConfig[]
  components/        # form fields + table editors
  App.tsx            # main UI
```
