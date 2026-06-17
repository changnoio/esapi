import { blankSite, SiteConfig } from "./types";

const REPORT_DIR = "%USERPROFILE%\\Desktop\\AutoPlanReports";

function base(): SiteConfig {
  return blankSite();
}

export const HN: SiteConfig = {
  ...base(),
  siteKey: "HN",
  siteName: "H&N",
  energy: "6X",
  nFractions: 33,
  dosePerFxGy: 2.121,
  rxTargetId: "PTV 70",
  rpModelId: "Model HN Chulabhorn Hospital",
  requiresStructureMapping: false,
  gates: { ...base().gates, reportDir: REPORT_DIR },
  targetLevels: [
    { structureId: "PTV 70", dose: 70, unit: "Gy" },
    { structureId: "PTV 59.4", dose: 59.4, unit: "Gy" },
    { structureId: "PTV 54", dose: 54, unit: "Gy" },
  ],
  structureMatches: [
    { patientId: "PTV 70", modelId: "PTV_High" },
    { patientId: "PTV 59.4", modelId: "PTV_Intermediate" },
    { patientId: "PTV 54", modelId: "PTV_Low" },
    { patientId: "Brain stem", modelId: "BrainStem" },
    { patientId: "z BS+0.5", modelId: "PRV_BrainStem" },
    { patientId: "z Cord+0.5", modelId: "PRV_SpinalCord" },
    { patientId: "Optic chiasm", modelId: "Optic Chiasm" },
    { patientId: "Optic n._Rt", modelId: "OpticNerve_R" },
    { patientId: "Optic n._Lt", modelId: "OpticNerve_L" },
    { patientId: "Parotid_Lt", modelId: "Parotid_L" },
    { patientId: "Parotid_Rt", modelId: "Parotid_R" },
    { patientId: "Cochlea_Lt", modelId: "Cochlea_L" },
    { patientId: "Cochlea_Rt", modelId: "Cochlea_R" },
    { patientId: "Eye_Lt", modelId: "Eye_L" },
    { patientId: "Eye_Rt", modelId: "Eye_R" },
    { patientId: "Len_Lt", modelId: "Len_L" },
    { patientId: "Len_Rt", modelId: "Len_R" },
    { patientId: "Lt IAC", modelId: "IAC_L" },
    { patientId: "Rt IAC", modelId: "IAC_R" },
    { patientId: "Mandible", modelId: "Mandible" },
    { patientId: "Temporal Rt", modelId: "TemporalLobe_R" },
    { patientId: "Temporal Lt", modelId: "TemporalLobe_L" },
    { patientId: "Larynx", modelId: "Larynx" },
    { patientId: "Esophagus", modelId: "Esophagus" },
    { patientId: "Pharynx", modelId: "Pharynx" },
    { patientId: "Mucosa", modelId: "Mucosa" },
    { patientId: "TM-joint_Lt", modelId: "TMJoint_L" },
    { patientId: "TM-joint_Rt", modelId: "TMJoint_R" },
    { patientId: "zAV40", modelId: "zAV40" },
    { patientId: "zAV45", modelId: "zAV45" },
    { patientId: "zorg80", modelId: "zRing_80" },
    { patientId: "zorg90", modelId: "zRing_90" },
  ],
  suggestedMatches: [],
  arcs: [
    { id: "A1", collimatorAngle: 10, gantryStart: 181, gantryStop: 179, direction: "CW", doseRate: 600, x1: -80, y1: -120, x2: 80, y2: 120, avoidSectors: [] },
    { id: "A2", collimatorAngle: 350, gantryStart: 179, gantryStop: 181, direction: "CCW", doseRate: 600, x1: -80, y1: -120, x2: 80, y2: 120, avoidSectors: [] },
    { id: "A3", collimatorAngle: 90, gantryStart: 181, gantryStop: 179, direction: "CW", doseRate: 600, x1: -80, y1: -120, x2: 80, y2: 120, avoidSectors: [] },
  ],
};

export const LUNGS: SiteConfig = {
  ...base(),
  siteKey: "Lungs",
  siteName: "Lungs",
  energy: "6X",
  nFractions: 30,
  dosePerFxGy: 2,
  rxTargetId: "PTV",
  rpModelId: "HFHS Lung SBRT",
  requiresStructureMapping: true,
  gates: { ...base().gates, reportDir: REPORT_DIR },
  targetLevels: [],
  structureMatches: [],
  suggestedMatches: [
    "PTV", "GTV", "CTV", "Lung_L", "Lung_R", "Lungs-GTV",
    "SpinalCord", "PRV_SpinalCord", "Heart", "Esophagus", "Trachea", "BronchialTree",
  ],
  arcs: [
    { id: "A1", collimatorAngle: 10, gantryStart: 181, gantryStop: 179, direction: "CW", doseRate: 600, x1: -80, y1: -120, x2: 80, y2: 120, avoidSectors: [[300, 250], [70, 110]] },
    { id: "A2", collimatorAngle: 350, gantryStart: 179, gantryStop: 181, direction: "CCW", doseRate: 600, x1: -80, y1: -120, x2: 80, y2: 120, avoidSectors: [[70, 110], [300, 250]] },
    { id: "A3", collimatorAngle: 90, gantryStart: 181, gantryStop: 179, direction: "CW", doseRate: 600, x1: -80, y1: -120, x2: 80, y2: 120, avoidSectors: [] },
  ],
};

export const PROSTATE: SiteConfig = {
  ...base(),
  siteKey: "Prostate",
  siteName: "Prostate",
  energy: "10X",
  nFractions: 20,
  dosePerFxGy: 3,
  rxTargetId: "PTV",
  rpModelId: "A_Prostate_Hypo",
  requiresStructureMapping: true,
  gates: { ...base().gates, reportDir: REPORT_DIR },
  targetLevels: [],
  structureMatches: [],
  suggestedMatches: [
    "PTV", "CTV", "Prostate", "SeminalVesicles", "Rectum",
    "Bladder", "Femur_L", "Femur_R", "PenileBulb", "Bowel",
  ],
  arcs: [
    { id: "A1", collimatorAngle: 10, gantryStart: 181, gantryStop: 179, direction: "CW", doseRate: 600, x1: -80, y1: -120, x2: 80, y2: 120, avoidSectors: [] },
    { id: "A2", collimatorAngle: 350, gantryStart: 179, gantryStop: 181, direction: "CCW", doseRate: 600, x1: -80, y1: -120, x2: 80, y2: 120, avoidSectors: [] },
    { id: "A3", collimatorAngle: 90, gantryStart: 181, gantryStop: 179, direction: "CW", doseRate: 600, x1: -80, y1: -120, x2: 80, y2: 120, avoidSectors: [] },
  ],
};

export const PRESETS: SiteConfig[] = [HN, LUNGS, PROSTATE];

/** Find a preset whose site name/key matches (case-insensitive, ignoring punctuation). */
export function findPreset(name: string): SiteConfig | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const n = norm(name);
  return PRESETS.find((p) => norm(p.siteName) === n || norm(p.siteKey) === n);
}
