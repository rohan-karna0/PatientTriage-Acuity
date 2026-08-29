import { readFileSync, writeFileSync } from "fs";
import path from "path";
import type { CareRoute, TriageInput } from "@acuity/shared";
import { scoreTriage } from "./scoring";
import { evaluateWatch } from "./watch";

export type GoldenCategory =
  | "critical"
  | "ambiguous"
  | "pediatric"
  | "geriatric"
  | "zero_history"
  | "minor"
  | "under_reporting"
  | "adult_comparator";

export interface GoldenCase {
  id: string;
  category: GoldenCategory | string;
  description: string;
  input: TriageInput;
  expectedEsiMin: number;
  expectedEsiMax: number;
  mustEscalateBias?: boolean;
  expectedRoute?: CareRoute;
  testSurgeEscalation?: boolean;
  compareStricterThan?: string;
  requireConfidence?: boolean;
}

export interface CaseResult {
  id: string;
  category: string;
  description: string;
  esi: number;
  confidence: number;
  escalationBiasApplied: boolean;
  recommendedRoute: string;
  esiRangeMatch: boolean;
  underTriageProxy: boolean;
  escalateBiasOk: boolean;
  routeOk: boolean;
  confidenceOk: boolean;
  surgeEscalated?: boolean;
}

export interface BenchmarkReport {
  total: number;
  esiRangeMatch: { count: number; pct: number };
  underTriageProxy: { count: number; pct: number };
  criticalMiss: { count: number; total: number; pct: number };
  confidenceCoverage: { count: number; pct: number };
  escalationBiasRequired: { pass: number; total: number; pct: number };
  routeSanity: { pass: number; total: number; pct: number };
  surgeEscalation: { pass: number; total: number; pct: number };
  watchRecall: { pass: number; total: number; pct: number };
  failures: CaseResult[];
  results: CaseResult[];
}

export function loadGoldenCases(filePath: string): GoldenCase[] {
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as GoldenCase[];
}

export function runGoldenBenchmark(cases: GoldenCase[]): BenchmarkReport {
  const results: CaseResult[] = [];
  const caseById = new Map(cases.map((c) => [c.id, c]));

  for (const c of cases) {
    const result = scoreTriage(c.input, { surgeMode: false });
    const esiRangeMatch = result.esi >= c.expectedEsiMin && result.esi <= c.expectedEsiMax;
    const underTriageProxy = result.esi > c.expectedEsiMax;
    const escalateBiasOk = c.mustEscalateBias ? result.escalationBiasApplied : true;
    const routeOk = c.expectedRoute ? result.recommendedRoute === c.expectedRoute : true;
    const confidenceOk =
      c.requireConfidence !== false
        ? result.confidence > 0 && result.confidence <= 1
        : true;

    let surgeEscalated: boolean | undefined;
    if (c.testSurgeEscalation) {
      const quiet = scoreTriage(c.input, { surgeMode: false });
      const surge = scoreTriage(c.input, { surgeMode: true });
      surgeEscalated = surge.esi <= quiet.esi;
    }

    if (c.compareStricterThan) {
      const other = caseById.get(c.compareStricterThan);
      if (other) {
        const otherResult = scoreTriage(other.input, { surgeMode: false });
        if (result.esi < otherResult.esi) {
          results.push({
            id: c.id,
            category: c.category,
            description: c.description,
            esi: result.esi,
            confidence: result.confidence,
            escalationBiasApplied: result.escalationBiasApplied,
            recommendedRoute: result.recommendedRoute,
            esiRangeMatch: false,
            underTriageProxy: true,
            escalateBiasOk,
            routeOk,
            confidenceOk,
            surgeEscalated,
          });
          continue;
        }
      }
    }

    results.push({
      id: c.id,
      category: c.category,
      description: c.description,
      esi: result.esi,
      confidence: result.confidence,
      escalationBiasApplied: result.escalationBiasApplied,
      recommendedRoute: result.recommendedRoute,
      esiRangeMatch,
      underTriageProxy,
      escalateBiasOk,
      routeOk,
      confidenceOk,
      surgeEscalated,
    });
  }

  const criticalCases = cases.filter((c) => c.category === "critical");
  const criticalResults = results.filter((r) =>
    criticalCases.some((c) => c.id === r.id),
  );
  const criticalMiss = criticalResults.filter((r) => r.esi >= 3).length;

  const mustEscalate = results.filter((r) => {
    const c = cases.find((x) => x.id === r.id);
    return c?.mustEscalateBias === true;
  });
  const escalatePass = mustEscalate.filter((r) => r.escalateBiasOk).length;

  const routeCases = results.filter((r) => {
    const c = cases.find((x) => x.id === r.id);
    return Boolean(c?.expectedRoute);
  });
  const routePass = routeCases.filter((r) => r.routeOk).length;

  const surgeCases = results.filter((r) => r.surgeEscalated !== undefined);
  const surgePass = surgeCases.filter((r) => r.surgeEscalated === true).length;

  const watchPass = evaluateWatch([
    {
      encounterId: "watch-test",
      esi: 3,
      arrivedAt: new Date(Date.now() - 40 * 60000).toISOString(),
      lastAssessedAt: new Date(Date.now() - 40 * 60000).toISOString(),
      waitingMinutes: 40,
      reassessDueMinutes: 30,
    },
  ]);
  const watchRecall = watchPass.length > 0 ? 1 : 0;

  const failures = results.filter(
    (r) =>
      !r.esiRangeMatch ||
      r.underTriageProxy ||
      !r.escalateBiasOk ||
      !r.routeOk ||
      !r.confidenceOk ||
      r.surgeEscalated === false,
  );

  const n = results.length;
  return {
    total: n,
    esiRangeMatch: {
      count: results.filter((r) => r.esiRangeMatch).length,
      pct: pct(results.filter((r) => r.esiRangeMatch).length, n),
    },
    underTriageProxy: {
      count: results.filter((r) => r.underTriageProxy).length,
      pct: pct(results.filter((r) => r.underTriageProxy).length, n),
    },
    criticalMiss: {
      count: criticalMiss,
      total: criticalResults.length,
      pct: pct(criticalMiss, criticalResults.length),
    },
    confidenceCoverage: {
      count: results.filter((r) => r.confidenceOk).length,
      pct: pct(results.filter((r) => r.confidenceOk).length, n),
    },
    escalationBiasRequired: {
      pass: escalatePass,
      total: mustEscalate.length,
      pct: pct(escalatePass, mustEscalate.length),
    },
    routeSanity: {
      pass: routePass,
      total: routeCases.length,
      pct: pct(routePass, routeCases.length),
    },
    surgeEscalation: {
      pass: surgePass,
      total: surgeCases.length,
      pct: pct(surgePass, surgeCases.length),
    },
    watchRecall: { pass: watchRecall, total: 1, pct: watchRecall * 100 },
    failures,
    results,
  };
}

function pct(num: number, den: number): number {
  if (den === 0) return 100;
  return Math.round((num / den) * 1000) / 10;
}

export function formatBenchmarkReport(report: BenchmarkReport): string {
  const lines = [
    "Acuity Golden Benchmark",
    "═".repeat(40),
    `Cases evaluated:     ${report.total}`,
    `ESI range match:     ${report.esiRangeMatch.pct}% (${report.esiRangeMatch.count}/${report.total})`,
    `Under-triage proxy:  ${report.underTriageProxy.pct}% (${report.underTriageProxy.count}/${report.total}) ← target 0%`,
    `Critical miss rate:  ${report.criticalMiss.pct}% (${report.criticalMiss.count}/${report.criticalMiss.total}) ← target 0%`,
    `Confidence coverage: ${report.confidenceCoverage.pct}% (${report.confidenceCoverage.count}/${report.total})`,
    `Escalation bias:     ${report.escalationBiasRequired.pct}% (${report.escalationBiasRequired.pass}/${report.escalationBiasRequired.total})`,
    `Route sanity:        ${report.routeSanity.pct}% (${report.routeSanity.pass}/${report.routeSanity.total})`,
    `Surge escalation:    ${report.surgeEscalation.pct}% (${report.surgeEscalation.pass}/${report.surgeEscalation.total})`,
    `WATCH recall (sim):  ${report.watchRecall.pct}% (${report.watchRecall.pass}/${report.watchRecall.total})`,
  ];

  if (report.failures.length > 0) {
    lines.push("", "Failures:");
    for (const f of report.failures) {
      lines.push(`  • ${f.id}: ESI ${f.esi} — ${f.description}`);
    }
  } else {
    lines.push("", "All golden cases passed.");
  }

  return lines.join("\n");
}

export function defaultGoldenPath(): string {
  return path.resolve(__dirname, "../../../data/benchmark/golden-cases.json");
}

export function defaultReportPath(): string {
  return path.resolve(__dirname, "../../../data/benchmark/benchmark-report.json");
}

/** CLI entry */
export function main(argv: string[] = process.argv.slice(2)) {
  const jsonOut = argv.includes("--json");
  const casesPath = argv.find((a) => !a.startsWith("--")) ?? defaultGoldenPath();
  const cases = loadGoldenCases(casesPath);
  const report = runGoldenBenchmark(cases);
  const text = formatBenchmarkReport(report);

  console.log(text);

  if (jsonOut) {
    const outPath = defaultReportPath();
    writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`\nJSON report written to ${outPath}`);
  }

  const failed = report.failures.length > 0;

  process.exit(failed ? 1 : 0);
}

if (require.main === module) {
  main();
}
