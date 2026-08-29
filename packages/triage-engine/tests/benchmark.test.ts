import { describe, expect, it } from "vitest";
import path from "path";
import {
  loadGoldenCases,
  runGoldenBenchmark,
  defaultGoldenPath,
} from "../src/evaluate";

describe("golden benchmark suite", () => {
  const casesPath = path.resolve(__dirname, "../../../data/benchmark/golden-cases.json");
  const cases = loadGoldenCases(casesPath);

  it("loads at least 35 golden cases", () => {
    expect(cases.length).toBeGreaterThanOrEqual(35);
  });

  it("achieves zero under-triage proxy on golden set", () => {
    const report = runGoldenBenchmark(cases);
    expect(report.underTriageProxy.count).toBe(0);
  });

  it("achieves zero critical miss rate", () => {
    const report = runGoldenBenchmark(cases);
    expect(report.criticalMiss.count).toBe(0);
  });

  it("has 100% confidence coverage", () => {
    const report = runGoldenBenchmark(cases);
    expect(report.confidenceCoverage.pct).toBe(100);
  });

  it("matches ESI expert ranges on all cases", () => {
    const report = runGoldenBenchmark(cases);
    expect(report.esiRangeMatch.pct).toBe(100);
  });

  it("applies escalation bias when required", () => {
    const report = runGoldenBenchmark(cases);
    expect(report.escalationBiasRequired.pct).toBe(100);
  });

  it("passes route sanity checks", () => {
    const report = runGoldenBenchmark(cases);
    expect(report.routeSanity.pct).toBe(100);
  });

  it("escalates ambiguous cases under surge", () => {
    const report = runGoldenBenchmark(cases);
    expect(report.surgeEscalation.pct).toBe(100);
  });

  it("has no benchmark failures", () => {
    const report = runGoldenBenchmark(cases);
    expect(report.failures).toHaveLength(0);
  });
});

describe("defaultGoldenPath", () => {
  it("resolves to benchmark file from package", () => {
    const p = defaultGoldenPath();
    expect(p).toContain("golden-cases.json");
  });
});
