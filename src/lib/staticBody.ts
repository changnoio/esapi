// The static body of the AutoPlan ESAPI script: everything after the
// GENERATED CONFIGURATION region. This is byte-for-byte identical across the
// H&N / Lungs / Prostate templates, so it is stored verbatim.
//
// String.raw preserves backslashes (\\) and escape-looking sequences (\n)
// exactly as they must appear in the emitted C# source.
export const STATIC_BODY: string = String.raw`        private readonly StringBuilder _log = new StringBuilder();
        private static readonly string MsgCaption = "AutoPlan: " + SITE_NAME;

        private void Log(string s)
        {
            _log.AppendLine(DateTime.Now.ToString("HH:mm:ss") + "  " + s);
        }

        [MethodImpl(MethodImplOptions.NoInlining)]
        public void Execute(ScriptContext context)
        {
            try
            {
                Run(context);
            }
            catch (Exception ex)
            {
                Log("FATAL: " + ex.Message);
                Log(ex.StackTrace ?? "");
                TryWriteReport(context, "FAILED");
                MessageBox.Show("AutoPlan aborted with an error:\n\n" + ex.Message +
                    "\n\nNo plan should be considered valid. See the report/log.",
                    MsgCaption, MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void Run(ScriptContext context)
        {
            Log("AutoPlan started for site " + SITE_NAME + " (" + SITE_KEY + ").");

            // -------- 1. Preconditions --------
            if (context == null || context.Patient == null || context.StructureSet == null)
            {
                MessageBox.Show("Open a patient and a structure set before running this script.",
                    MsgCaption, MessageBoxButton.OK, MessageBoxImage.Exclamation);
                return;
            }
            StructureSet ss = context.StructureSet;
            Log("Patient: " + context.Patient.Id + " | StructureSet: " + ss.Id);

            // -------- 2. Configuration self-check (fail fast) --------
            var configErrors = new List<string>();
            if (string.IsNullOrWhiteSpace(MACHINE_ID))
                configErrors.Add("MACHINE_ID is blank - set it to your Linac machine ID.");
            if (string.IsNullOrWhiteSpace(RP_MODEL_ID))
                configErrors.Add("RP_MODEL_ID is blank.");
            if (REQUIRES_STRUCTURE_MAPPING && STRUCTURE_MATCHES.Count == 0)
                configErrors.Add("Structure mapping required: TARGET_LEVELS / STRUCTURE_MATCHES " +
                    "are empty for this site. Complete them in the configuration region.");
            if (TARGET_LEVELS.Count == 0)
                configErrors.Add("No target dose levels defined - RapidPlan needs at least one target.");
            if (configErrors.Count > 0)
            {
                MessageBox.Show("Cannot run - configuration incomplete:\n\n - " +
                    string.Join("\n - ", configErrors), MsgCaption,
                    MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }

            // -------- 3. Validate structure matches against the structure set --------
            var presentIds = new HashSet<string>(
                ss.Structures.Select(s => s.Id.Trim()), StringComparer.OrdinalIgnoreCase);
            var warnings = new List<string>();

            // Targets must exist.
            var missingTargets = TARGET_LEVELS.Keys
                .Where(id => !presentIds.Contains(id.Trim())).ToList();
            if (!string.IsNullOrWhiteSpace(RX_TARGET_ID) && !presentIds.Contains(RX_TARGET_ID.Trim()))
                missingTargets.Add(RX_TARGET_ID + " (prescription target)");
            if (missingTargets.Count > 0)
            {
                MessageBox.Show("Required target structure(s) not found in the structure set:\n\n - " +
                    string.Join("\n - ", missingTargets.Distinct()) +
                    "\n\nFix the structure IDs (or contours) and re-run.",
                    MsgCaption, MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }

            // Missing OARs are dropped (so CalculateDVHEstimates won't throw) and reported.
            var effectiveMatches = new Dictionary<string, string>();
            foreach (var kv in STRUCTURE_MATCHES)
            {
                if (presentIds.Contains(kv.Key.Trim()))
                    effectiveMatches[kv.Key] = kv.Value;
                else if (!TARGET_LEVELS.ContainsKey(kv.Key))
                    warnings.Add("OAR '" + kv.Key + "' not in structure set - skipped.");
            }
            foreach (var arc in ARCS)
                if (arc.AvoidSectors != null && arc.AvoidSectors.Length > 0)
                    warnings.Add("Arc " + arc.Id + " has avoidance sector(s) " +
                        FormatSectors(arc.AvoidSectors) + " - ESAPI cannot set these " +
                        "reliably; configure/verify them manually in the optimizer.");

            // -------- 4. Clinical-review confirmation gate --------
            double totalDose = DOSE_PER_FX_GY * N_FRACTIONS;
            string recipe = BuildRecipe(context, ss, totalDose, effectiveMatches, warnings);
            Log("Recipe:\n" + recipe);
            if (REQUIRE_CONFIRMATION)
            {
                var answer = MessageBox.Show(
                    recipe + "\n\nProceed to CREATE this draft plan?",
                    MsgCaption + " - REVIEW", MessageBoxButton.YesNo,
                    warnings.Count > 0 ? MessageBoxImage.Warning : MessageBoxImage.Question);
                if (answer != MessageBoxResult.Yes)
                {
                    Log("User cancelled at review gate. No modifications made.");
                    MessageBox.Show("Cancelled. No changes were made.", MsgCaption,
                        MessageBoxButton.OK, MessageBoxImage.Information);
                    return;
                }
            }

            // -------- 5. Begin modifications --------
            context.Patient.BeginModifications();

            // -------- 6. Create unique course + external beam plan --------
            string courseId = UniqueCourseId(context.Patient, COURSE_ID_BASE + "_" + SITE_KEY);
            if (ABORT_IF_COURSE_EXISTS &&
                context.Patient.Courses.Any(c => c.Id.StartsWith(COURSE_ID_BASE)))
            {
                MessageBox.Show("A course beginning with '" + COURSE_ID_BASE +
                    "' already exists and ABORT_IF_COURSE_EXISTS is true.",
                    MsgCaption, MessageBoxButton.OK, MessageBoxImage.Exclamation);
                return;
            }
            Course course = context.Patient.AddCourse();
            course.Id = courseId;
            Log("Created course: " + course.Id);

            ExternalPlanSetup eps = course.AddExternalPlanSetup(ss);
            eps.Id = UniquePlanId(course, PLAN_ID_BASE);
            Log("Created plan: " + eps.Id);

            // -------- 7. Prescription --------
            eps.SetPrescription(N_FRACTIONS, new DoseValue(DOSE_PER_FX_GY, "Gy"), TREAT_PCT);
            Log(string.Format("Prescription: {0} Gy/fx x {1} = {2:0.###} Gy at {3:0}%.",
                DOSE_PER_FX_GY, N_FRACTIONS, totalDose, TREAT_PCT * 100));

            // -------- 8. Isocenter + beams --------
            VVector iso = ResolveIsocenter(ss);
            Log(string.Format("Isocenter ({0}): ({1:0.0}, {2:0.0}, {3:0.0}) mm.",
                ISOCENTER_SOURCE, iso.x, iso.y, iso.z));

            var machine = new ExternalBeamMachineParameters(MACHINE_ID, ENERGY, DOSE_RATE, TECHNIQUE, null);
            var createdArcs = new List<Beam>();
            foreach (var a in ARCS)
            {
                var jaw = new VRect<double>(a.X1, a.Y1, a.X2, a.Y2);
                Beam b = eps.AddArcBeam(machine, jaw, a.CollimatorAngle,
                    a.GantryStart, a.GantryStop, a.Direction, 0, iso);
                b.Id = a.Id;
                createdArcs.Add(b);
                Log("Added arc " + a.Id + " G" + a.GantryStart + "->" + a.GantryStop +
                    " " + a.Direction + " coll " + a.CollimatorAngle + ".");
            }

            var setupBeams = new List<Beam>();
            foreach (var sf in SETUP_FIELDS)
            {
                var jaw = new VRect<double>(sf.X1, sf.Y1, sf.X2, sf.Y2);
                Beam sb = eps.AddSetupBeam(machine, jaw, 0, sf.Gantry, 0, iso);
                sb.Id = sf.Id;
                setupBeams.Add(sb);
                Log("Added setup field " + sf.Id + " G" + sf.Gantry + ".");
            }

            // -------- 8b. DRRs --------
            if (DRR_ENABLED)
            {
                var drr = new DRRCalculationParameters(DRR_WEIGHT);
                drr.SetLayerParameters(0, 1, -100, 1000, -1000, 1000);
                foreach (var b in createdArcs) b.CreateOrReplaceDRR(drr);
                foreach (var b in setupBeams) b.CreateOrReplaceDRR(drr);
                Log("Created DRRs for all fields.");
            }

            // -------- 9. RapidPlan DVH estimation --------
            eps.SetCalculationModel(CalculationType.DVHEstimation, DVH_ALGO);
            Log("DVH estimation model set: " + DVH_ALGO);
            var dvhResult = eps.CalculateDVHEstimates(RP_MODEL_ID,
                targetDoseLevels: TARGET_LEVELS, structureMatches: effectiveMatches);
            if (dvhResult != null && !dvhResult.Success)
                throw new Exception("CalculateDVHEstimates failed: " + dvhResult.ToString());
            Log("RapidPlan DVH estimates calculated with model '" + RP_MODEL_ID + "'.");

            // -------- 10. NTO --------
            if (NTO_AUTOMATIC)
            {
                eps.OptimizationSetup.AddAutomaticNormalTissueObjective(NTO_PRIORITY);
                Log("Added automatic NTO (priority " + NTO_PRIORITY + ").");
            }
            else
            {
                eps.OptimizationSetup.AddNormalTissueObjective(
                    NTO_PRIORITY, NTO_DIST_MM, NTO_START_PCT, NTO_END_PCT, NTO_FALLOFF);
                Log("Added manual NTO.");
            }

            // -------- 11. Optimization / dose calculation models --------
            eps.SetCalculationModel(CalculationType.PhotonVolumeDose, DOSE_ALGO);
            eps.SetCalculationModel(CalculationType.PhotonVMATOptimization, OPT_ALGO);
            Log("Calculation models set (dose=" + DOSE_ALGO + ", opt=" + OPT_ALGO + ").");

            // -------- 12. Optional stop for objective review --------
            if (STOP_AFTER_DVH_ESTIMATE)
            {
                TryWriteReport(context, "DRAFT - stopped after DVH estimate");
                MessageBox.Show("Plan '" + eps.Id + "' created in course '" + course.Id +
                    "'.\nDVH estimates and objectives are ready for your review.\n\n" +
                    "Auto-optimization was intentionally skipped (STOP_AFTER_DVH_ESTIMATE).",
                    MsgCaption, MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            // -------- 13. Optimize (+ optional dose calc) --------
            if (AUTO_OPTIMIZE)
            {
                eps.SetCalculationOption(OPT_ALGO, "AirCavityCorrection", "On");
                Log("Running VMAT optimization...");
                var optRes = eps.OptimizeVMAT();
                if (optRes != null && !optRes.Success)
                    throw new Exception("OptimizeVMAT failed.");
                Log("Optimization complete.");

                if (CALC_DOSE_AFTER_OPT)
                {
                    Log("Calculating final dose...");
                    var doseRes = eps.CalculateDose();
                    if (doseRes != null && !doseRes.Success)
                        throw new Exception("CalculateDose failed.");
                    Log("Dose calculation complete.");
                }
            }
            else
            {
                Log("AUTO_OPTIMIZE is false - plan left un-optimized for manual review.");
            }

            // -------- 14. Report + finish --------
            TryWriteReport(context, "DRAFT created");
            MessageBox.Show("Done. Draft plan '" + eps.Id + "' created in course '" +
                course.Id + "'.\n\n" +
                (warnings.Count > 0 ? "Warnings (" + warnings.Count + "): see report.\n\n" : "") +
                "REMINDER: this is an unapproved DRAFT. A physician and physicist must " +
                "review all objectives, the dose distribution and the plan before any clinical use.",
                MsgCaption, MessageBoxButton.OK, MessageBoxImage.Information);
        }

        // ----------------------------- helpers ----------------------------- //
        private VVector ResolveIsocenter(StructureSet ss)
        {
            if (ISOCENTER_SOURCE == "target_com" && !string.IsNullOrWhiteSpace(RX_TARGET_ID))
            {
                var tgt = ss.Structures.FirstOrDefault(
                    s => string.Equals(s.Id.Trim(), RX_TARGET_ID.Trim(),
                                        StringComparison.OrdinalIgnoreCase));
                if (tgt != null && tgt.HasSegment)
                {
                    var c = tgt.CenterPoint;
                    return new VVector(c.x, c.y, c.z);
                }
            }
            var o = ss.Image.UserOrigin;
            return new VVector(o.x, o.y, o.z);
        }

        private static string UniqueCourseId(Patient p, string baseId)
        {
            baseId = Truncate(baseId, 16);
            if (!p.Courses.Any(c => c.Id == baseId)) return baseId;
            for (int i = 1; i < 100; i++)
            {
                string cand = Truncate(baseId, 13) + "_" + i;
                if (!p.Courses.Any(c => c.Id == cand)) return cand;
            }
            return Truncate(baseId, 10) + "_" + DateTime.Now.ToString("HHmmss");
        }

        private static string UniquePlanId(Course course, string baseId)
        {
            baseId = Truncate(baseId, 13);
            if (!course.PlanSetups.Any(ps => ps.Id == baseId)) return baseId;
            for (int i = 1; i < 100; i++)
            {
                string cand = baseId + "_" + i;
                if (!course.PlanSetups.Any(ps => ps.Id == cand)) return cand;
            }
            return baseId + "_" + DateTime.Now.ToString("HHmmss");
        }

        private static string Truncate(string s, int n)
        {
            return (s != null && s.Length > n) ? s.Substring(0, n) : s;
        }

        private static string FormatSectors(double[][] sectors)
        {
            return string.Join(", ", sectors.Select(s => "[" + s[0] + "-" + s[1] + "]"));
        }

        private string BuildRecipe(ScriptContext ctx, StructureSet ss, double totalDose,
            Dictionary<string, string> matches, List<string> warnings)
        {
            var sb = new StringBuilder();
            sb.AppendLine("PLAN RECIPE  --  please review before proceeding");
            sb.AppendLine("------------------------------------------------");
            sb.AppendLine("Patient        : " + ctx.Patient.Id);
            sb.AppendLine("Structure set  : " + ss.Id);
            sb.AppendLine("Site           : " + SITE_NAME);
            sb.AppendLine("Machine/Energy : " + MACHINE_ID + " / " + ENERGY + " @ " + DOSE_RATE + " MU/min");
            sb.AppendLine(string.Format("Prescription   : {0} Gy x {1} fx = {2:0.###} Gy ({3:0}%)",
                DOSE_PER_FX_GY, N_FRACTIONS, totalDose, TREAT_PCT * 100));
            sb.AppendLine("RapidPlan model: " + RP_MODEL_ID);
            sb.AppendLine("DVH algo       : " + DVH_ALGO);
            sb.AppendLine("Dose/Opt algo  : " + DOSE_ALGO + " / " + OPT_ALGO);
            sb.AppendLine("Arcs:");
            foreach (var a in ARCS)
            {
                string av = (a.AvoidSectors != null && a.AvoidSectors.Length > 0)
                    ? "  AVOID " + FormatSectors(a.AvoidSectors) : "";
                sb.AppendLine(string.Format("   {0}: G {1}->{2} {3}, coll {4}{5}",
                    a.Id, a.GantryStart, a.GantryStop, a.Direction, a.CollimatorAngle, av));
            }
            sb.AppendLine("Targets (" + TARGET_LEVELS.Count + "):");
            foreach (var t in TARGET_LEVELS)
                sb.AppendLine("   " + t.Key + " -> " + t.Value.ToString());
            sb.AppendLine("Structure matches in use: " + matches.Count +
                " of " + STRUCTURE_MATCHES.Count + " defined.");
            sb.AppendLine("Auto-optimize  : " + AUTO_OPTIMIZE +
                " | Calc dose: " + CALC_DOSE_AFTER_OPT);
            if (warnings.Count > 0)
            {
                sb.AppendLine("");
                sb.AppendLine("WARNINGS (" + warnings.Count + "):");
                foreach (var w in warnings) sb.AppendLine("   ! " + w);
            }
            return sb.ToString();
        }

        private void TryWriteReport(ScriptContext ctx, string status)
        {
            if (!WRITE_REPORT) return;
            try
            {
                string dir = Environment.ExpandEnvironmentVariables(REPORT_DIR);
                System.IO.Directory.CreateDirectory(dir);
                string pid = (ctx != null && ctx.Patient != null) ? ctx.Patient.Id : "UNKNOWN";
                string file = System.IO.Path.Combine(dir,
                    "AutoPlan_" + SITE_KEY + "_" + pid + "_" +
                    DateTime.Now.ToString("yyyyMMdd_HHmmss") + ".txt");
                var sb = new StringBuilder();
                sb.AppendLine("AutoPlan generation report");
                sb.AppendLine("Status : " + status);
                sb.AppendLine("Site   : " + SITE_NAME + " (" + SITE_KEY + ")");
                sb.AppendLine("Time   : " + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
                sb.AppendLine("Model  : " + RP_MODEL_ID);
                sb.AppendLine("");
                sb.AppendLine("--- log ---");
                sb.Append(_log.ToString());
                System.IO.File.WriteAllText(file, sb.ToString());
                Log("Report written: " + file);
            }
            catch (Exception ex)
            {
                Log("Report write failed (non-fatal): " + ex.Message);
            }
        }
    }
}
`;
