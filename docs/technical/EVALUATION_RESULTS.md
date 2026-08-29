# Evaluation Results (committed snapshot)

**Generated:** 2026-08-29  
**Commands:** `npm test` · `npm run evaluate`  
**Reproduce:** `npm run setup && npm test && npm run evaluate:report`

---

## Vitest (engine + contracts)

| Suite | Tests | Status |
|-------|-------|--------|
| `integration.test.ts` | 6 | Pass |
| `scoring.test.ts` | 9 | Pass |
| `benchmark.test.ts` | 10 | Pass |
| **Total** | **25** | **All passed** |

---

## Golden benchmark (35 vignettes)

| Metric | Result | Target |
|--------|--------|--------|
| ESI range match | **100%** (35/35) | 100% |
| Under-triage proxy | **0%** (0/35) | 0% |
| Critical miss rate | **0%** (0/11) | 0% |
| Confidence coverage | **100%** (35/35) | 100% |
| Escalation bias | **100%** (6/6) | 100% |
| Route sanity | **100%** (4/4) | 100% |
| Surge escalation | **100%** (1/1) | 100% |
| WATCH recall (sim) | **100%** (1/1) | 100% |

**Failures:** none — `All golden cases passed.`

---

## Machine-readable report

Full per-case results (ESI, confidence, route, flags):

[`data/benchmark/benchmark-report.json`](../../data/benchmark/benchmark-report.json)

Golden case definitions:

[`data/benchmark/golden-cases.json`](../../data/benchmark/golden-cases.json)

---

## Refresh before submission

```bash
npm test
npm run evaluate:report
git add data/benchmark/benchmark-report.json docs/technical/EVALUATION_RESULTS.md
```

Update the **Generated** date in this file if you re-run.
