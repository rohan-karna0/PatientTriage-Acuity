# Acuity Evaluation Methodology

**Team:** ProjectVector · IIT Jodhpur  
**Purpose:** Reproducible benchmark for judges and clinical reviewers

## Why this approach

There is no public “ImageNet for ED triage.” Real hospital datasets require ethics approval, de-identification, and clinician gold labels. For Round 2, Acuity is evaluated on:

1. **ESI-aligned golden vignettes** (expert-defined acceptable ESI ranges)
2. **Safety-first metrics** (under-triage proxy, not raw accuracy alone)
3. **Automated engine tests** (reproducible via `npm test`)
4. **Operational contracts** (WATCH alerts, override audit completeness)

All cases use **synthetic data** modeled on Indian ED presentations. Do not claim real-PHI validation without hospital partnership and IRB/DPDP clearance.

**Latest results:** [EVALUATION_RESULTS.md](EVALUATION_RESULTS.md) · JSON: [`data/benchmark/benchmark-report.json`](../../data/benchmark/benchmark-report.json)

---

## External reference benchmarks (literature)

| Reference | Typical value | How Acuity uses it |
|---|---|---|
| **ESI (Emergency Severity Index)** | 5-level standard | Primary alignment for all scores |
| **Nurse inter-rater kappa** | ~0.65–0.85 | Target for future shadow-mode pilot vs nurses |
| **Under-triage rate** | Quality KPI — minimize | Primary safety metric in golden suite |
| **Over-triage rate** | Acceptable tradeoff under uncertainty | Escalation bias by design |

**Phase 2+ datasets:** MIMIC-IV-ED (PhysioNet, credentialed), hospital de-identified exports with nurse ESI labels.

---

## Golden benchmark suite

**File:** [`data/benchmark/golden-cases.json`](../../data/benchmark/golden-cases.json)  
**Cases:** 35 expert-labeled vignettes

### Category distribution (35 total)

| Category | Count | What it tests |
|---|---|---|
| `critical` | 11 | ESI 1–2, must not miss |
| `ambiguous` | 6 | Non-specific symptoms + escalation |
| `pediatric` | 4 | Age-stratified fever thresholds |
| `geriatric` | 3 | Atypical / lower fever threshold |
| `zero_history` | 4 | First-time patients, sparse data |
| `minor` | 5 | ESI 4–5, fast-track |
| `under_reporting` | 1 | Suspected under-reporting escalation |
| `adult_comparator` | 1 | Adult fever less urgent than pediatric comparator |

### Special test flags (on existing cases)

| Flag | Count | What it tests |
|---|---|---|
| `testSurgeEscalation` | 1 | Surge escalates ambiguous presentation |
| `expectedRoute` | 4 | ESI 1 → resus; low acuity → fast_track |
| `compareStricterThan` | 1 | Adult fever case less urgent than `G-peds-001` |
| `requireConfidence` | all (default) | Every score has valid confidence |

Each case defines:
- `expectedEsiMin` / `expectedEsiMax` — acceptable expert range
- `mustEscalateBias` — engine must apply fail-safe escalation
- `expectedRoute` (optional) — resus / fast_track sanity

---

## Metrics reported

| Metric | Definition | Target |
|---|---|---|
| **ESI range match** | `expectedEsiMin ≤ score ≤ expectedEsiMax` | 100% |
| **Under-triage proxy** | `score > expectedEsiMax` (less urgent than expert allows) | **0%** |
| **Critical miss rate** | Critical vignettes scored ESI ≥ 3 | **0%** |
| **Confidence coverage** | Every score has `0 < confidence ≤ 1` | **100%** |
| **Escalation bias** | Cases flagged `mustEscalateBias` show `escalationBiasApplied` | **100%** |
| **Route sanity** | `expectedRoute` cases match recommended route | **100%** |
| **Surge escalation** | Flagged cases score equal/higher urgency in surge | **100%** |
| **WATCH recall (sim)** | Single synthetic overdue ESI-3 case triggers alert | 100% (1/1) |

> **Important:** Acuity optimizes for **low under-triage**, not maximum accuracy. Over-triage is an acceptable cost when uncertain.

> **WATCH recall** is a **synthetic self-test** of `evaluateWatch()` (one hardcoded overdue patient), not derived from golden vignettes.

---

## How to run

From repository root:

```bash
npm install
npm test               # 25 Vitest tests (engine + golden + contracts)
npm run evaluate       # print benchmark report table
npm run evaluate:report  # also writes data/benchmark/benchmark-report.json
```

Custom golden file path:

```bash
npm run evaluate -w @acuity/triage-engine -- path/to/golden-cases.json
```

### Example output

```
Acuity Golden Benchmark
════════════════════════════════════════
Cases evaluated:     35
ESI range match:     100% (35/35)
Under-triage proxy:  0% (0/35) ← target 0%
Critical miss rate:  0% (0/11) ← target 0%
Confidence coverage: 100% (35/35)
...
All golden cases passed.
```

Exit code **1** if **any** benchmark failure is recorded (`report.failures.length > 0`).

---

## Full-app evaluation (beyond the engine)

| Layer | Method | Command / action |
|---|---|---|
| Scoring engine | Golden benchmark + Vitest | `npm test` + `npm run evaluate` |
| API | Manual smoke test | Hit `/api/board`, `/api/override`, `/api/watch` |
| UI | Judge demo script | [demo/DEMO_SCRIPT.md](../demo/DEMO_SCRIPT.md) |
| Pilot (future) | Shadow mode vs nurse ESI | Cohen's kappa + outcome-linked under-triage |

Engine **contract tests** (`integration.test.ts`) validate WATCH SLA logic and override payload shapes — they do not hit HTTP endpoints.

---

## What to tell judges

> “We don’t claim accuracy on undisclosed real data. We publish a **35-case golden benchmark** with **zero under-triage proxy** on critical vignettes, **100% confidence coverage**, and **append-only DPDP audit**. The engine is safety-biased by design — we measure under-triage, not average accuracy.”

This is stronger than an unverifiable “95% on hospital data” claim without methodology.
