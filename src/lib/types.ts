// Data model for an ESAPI "AutoPlan" site configuration.
// One SiteConfig fully describes the GENERATED CONFIGURATION region of the
// AutoPlan_<Site>.cs ESAPI plug-in script.

export type Direction = "CW" | "CCW";

export interface Arc {
  id: string;
  collimatorAngle: number;
  gantryStart: number;
  gantryStop: number;
  direction: Direction;
  doseRate: number;
  /** Jaw positions (mm). */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Avoidance sectors as [start, stop] degree pairs. Empty = none. */
  avoidSectors: Array<[number, number]>;
}

export interface SetupField {
  id: string;
  gantry: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TargetLevel {
  /** Patient structure ID (e.g. "PTV 70"). */
  structureId: string;
  dose: number;
  unit: string; // "Gy"
}

export interface StructureMatch {
  /** Patient structure ID. */
  patientId: string;
  /** RapidPlan model structure ID. */
  modelId: string;
}

export interface NtoConfig {
  automatic: boolean;
  priority: number;
  distMm: number;
  startPct: number;
  endPct: number;
  falloff: number;
}

export interface GateConfig {
  requireConfirmation: boolean;
  stopAfterDvh: boolean;
  autoOptimize: boolean;
  calcDoseAfterOpt: boolean;
  abortIfCourseExists: boolean;
  writeReport: boolean;
  reportDir: string;
}

export interface DrrConfig {
  enabled: boolean;
  weight: number;
}

export interface SiteConfig {
  siteKey: string; // e.g. "HN" (used in file name / course id)
  siteName: string; // e.g. "H&N" (display)

  machineId: string;
  energy: string;
  doseRate: number;
  technique: string;

  nFractions: number;
  dosePerFxGy: number;
  treatPct: number; // 1.0 == 100%
  rxTargetId: string;

  optAlgo: string;
  doseAlgo: string;
  dvhAlgo: string;

  rpModelId: string;
  requiresStructureMapping: boolean;

  courseIdBase: string;
  planIdBase: string;
  isocenterSource: string;

  nto: NtoConfig;
  gates: GateConfig;
  drr: DrrConfig;

  targetLevels: TargetLevel[];
  structureMatches: StructureMatch[];
  /** Patient structure IDs suggested for mapping (commented hints in script). */
  suggestedMatches: string[];

  arcs: Arc[];
  setupFields: SetupField[];
}

export function newArc(id: string): Arc {
  return {
    id,
    collimatorAngle: 0,
    gantryStart: 181,
    gantryStop: 179,
    direction: "CW",
    doseRate: 600,
    x1: -80,
    y1: -120,
    x2: 80,
    y2: 120,
    avoidSectors: [],
  };
}

export function newSetupField(id: string): SetupField {
  return { id, gantry: 0, x1: -100, y1: -100, x2: 100, y2: 100 };
}

/** A blank baseline used when importing a site that has no matching preset. */
export function blankSite(siteKey = "New", siteName = "New"): SiteConfig {
  return {
    siteKey,
    siteName,
    machineId: "TrueBeamSN1234",
    energy: "6X",
    doseRate: 600,
    technique: "ARC",
    nFractions: 1,
    dosePerFxGy: 2,
    treatPct: 1,
    rxTargetId: "PTV",
    optAlgo: "PO_17010",
    doseAlgo: "AAA_17010",
    dvhAlgo: "DVH Estimation Algorithm [17.0.1]",
    rpModelId: "",
    requiresStructureMapping: true,
    courseIdBase: "AutoPlan",
    planIdBase: "RP",
    isocenterSource: "user_origin",
    nto: { automatic: false, priority: 100, distMm: 3, startPct: 95, endPct: 50, falloff: 0.2 },
    gates: {
      requireConfirmation: true,
      stopAfterDvh: false,
      autoOptimize: true,
      calcDoseAfterOpt: true,
      abortIfCourseExists: false,
      writeReport: true,
      reportDir: "%USERPROFILE%\\Desktop\\AutoPlanReports",
    },
    drr: { enabled: true, weight: 500 },
    targetLevels: [],
    structureMatches: [],
    suggestedMatches: [],
    arcs: [newArc("A1"), newArc("A2"), newArc("A3")],
    setupFields: [
      { id: "Setup S270 kV", gantry: 270, x1: -100, y1: -100, x2: 100, y2: 100 },
      { id: "Setup S180 kV", gantry: 180, x1: -100, y1: -100, x2: 100, y2: 100 },
      { id: "Setup S0 CBCT", gantry: 0, x1: -100, y1: -100, x2: 100, y2: 100 },
    ],
  };
}
