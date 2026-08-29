# Acuity — PatientTriage.ai

**Team:** ProjectVector (IIT Jodhpur) · Accenture Innovation Challenge 2026 — Round 2  
**Product:** Acuity — AI-powered ED triage decision support (does **not** replace clinical judgment)

Acuity helps triage nurses prioritize and route patients at the door, keep a fair live queue, and watch waiting patients for deterioration — under incomplete data, age-diverse presentations, and surge load.

**UI:** Clinical light theme · DOOR kiosk + FLOW queue + WATCH feed · English + हिंदी

---

## Judges — start here

| Step | Link / command |
|------|----------------|
| 1. Submission checklist | [docs/submission/SUBMISSION.md](docs/submission/SUBMISSION.md) |
| 2. Verify tests | `npm run setup && npm test && npm run evaluate` |
| 3. Run demo | `npm run dev` → http://localhost:3000 |
| 4. Step-by-step walkthrough | [docs/demo/QUICK_DEMO.md](docs/demo/QUICK_DEMO.md) |
| 5. Full documentation index | [docs/README.md](docs/README.md) |

### Why two README files?

| File | Purpose |
|------|---------|
| **`README.md`** (this file) | **GitHub landing page** — overview, quick start, what to push, evaluation summary |
| **`docs/README.md`** | **Documentation table of contents** — links to every proposal, technical doc, and demo guide |

GitHub shows the root README first; `docs/README.md` organizes the detailed submission package.

---

## What to push to GitHub (and show judges)

### Push these (source + docs + results)

```
apps/web/                    Next.js nurse console + API + Prisma schema
packages/triage-engine/      Scoring engine + tests
packages/shared/             Shared types
data/
  patients.seed.json         22 synthetic patients
  benchmark/
    golden-cases.json        35 evaluation vignettes
    benchmark-report.json    Committed evaluation snapshot (JSON)
docs/                        All submission documentation (organized folders)
package.json                 Root scripts (setup, test, evaluate)
LICENSE
README.md                    This file
```

### Do NOT push (already in `.gitignore`)

| Path | Why |
|------|-----|
| `node_modules/` | Dependencies — judges run `npm install` |
| `apps/web/.next/` | Next.js build cache |
| `apps/web/prisma/dev.db` | Local SQLite — recreated by `npm run setup` |
| `.env` / `.env.local` | Secrets |
| `.tools/` | Local Node install (Windows) |
| `*.tsbuildinfo` | TypeScript cache |

### Before you push

```bash
npm run setup
npm test                    # expect 25 passed
npm run evaluate:report     # refreshes data/benchmark/benchmark-report.json
```

Add your **demo video URL** and **repo URL** in [docs/submission/SUBMISSION.md](docs/submission/SUBMISSION.md).

---

## Evaluation results (committed)

Last verified: **2026-08-29**

| Check | Result |
|-------|--------|
| Vitest (`npm test`) | **25/25 passed** |
| Golden benchmark (35 cases) | **100% ESI match, 0% under-triage** |
| Critical miss rate | **0%** (0/11) |

Full breakdown: [docs/technical/EVALUATION_RESULTS.md](docs/technical/EVALUATION_RESULTS.md)  
Machine-readable: [data/benchmark/benchmark-report.json](data/benchmark/benchmark-report.json)  
Methodology: [docs/technical/EVALUATION.md](docs/technical/EVALUATION.md)

---

## What we built (feature summary)

| Module | What it does |
|--------|----------------|
| **DOOR** | 0–90s intake kiosk — complaint cards, patient name, vitals, live ESI preview, English/Hindi |
| **FLOW** | Priority waiting-room board (22 seed patients A-001…A-022), click row → scroll to detail |
| **WATCH** | Reassess alerts when wait exceeds ESI threshold; **WATCH tick** advances sim clock |
| **Surge mode** | ~3× load — shorter WATCH SLAs, uncertain cases escalate, queue re-scored |
| **Accept vs Override** | Accept = nurse agrees with system ESI; Override = disagree + reason + note (audited) |
| **Audit trail** | Append-only log — click rows to expand (`INTAKE_CREATED`, `OVERRIDE`, `WATCH_TICK`, etc.) |
| **Triage engine** | Age-stratified hybrid ESI scorer — pediatric / adult / geriatric, escalation bias |
| **Golden benchmark** | 35 expert vignettes, reproducible via `npm test` + `npm run evaluate` |

---

## Safety design

| Principle | Behavior |
|---|---|
| Never assume missing vitals are normal | Sparse vitals raise uncertainty and **escalate** acuity |
| Under-triage cost > over-triage cost | Escalation bias; surge + ambiguity escalate further |
| Never auto-downgrade | Downgrades only via **clinician override** with reason + note |
| Age-stratified scoring | Pediatric / adult / geriatric vital thresholds |
| Always show uncertainty | Every score includes `confidence` + `uncertaintyDrivers` |
| Nurse final authority | Accept / Override + append-only audit trail |

---

## Quick start

**Requirements:** Node.js 20+

```bash
npm run setup          # install + DB + seed 22 patients
npm run dev            # http://localhost:3000
npm test               # 25 engine tests
npm run evaluate       # print benchmark table
npm run evaluate:report  # update benchmark-report.json
```

Windows PowerShell: use `npm.cmd` if `npm` is blocked. **Stop `npm run dev` before `npm run build`** (Prisma EPERM on Windows if Node is still running).

---

## Judge demo path (3 min)

1. **FLOW** — 22 patients; click **A-001** vs **A-002** (pediatric vs geriatric)
2. **A-004** — ambiguous case, uncertainty drivers
3. **DOOR Intake** — Hindi toggle, complaint, name, sparse vitals
4. **Accept — RED** or **Override** with clinical note
5. **Audit trail** — expand `OVERRIDE` / `INTAKE_CREATED`
6. **Surge mode** → **WATCH tick** → **Dismiss** alert

Scripts: [docs/demo/DEMO_SCRIPT.md](docs/demo/DEMO_SCRIPT.md) · [docs/demo/USER_GUIDE.md](docs/demo/USER_GUIDE.md)

---

## Repository layout

```
apps/web/                 Next.js nurse console + REST API + Prisma
packages/triage-engine/   @acuity/triage-engine — scorer + Vitest
packages/shared/          Types, ESI mapping, audit schemas
data/                     Seed patients + golden benchmark + results JSON
docs/
  submission/             Round 2 checklist
  demo/                   Video script, quick demo, user guide
  technical/              Architecture, evaluation, data flow, results
  proposal/               Business proposal
  compliance/             DPDP + HIPAA-aligned note
```

---

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/board` | Queue, capacity, WATCH alerts |
| POST | `/api/intake` | DOOR intake + score |
| POST | `/api/override` | Clinician override (audited) |
| POST | `/api/surge` | Toggle surge (~3×); re-score queue |
| POST | `/api/watch` | Advance sim clock + reassess alerts |
| PUT | `/api/watch` | Update vitals; worsening alert |
| GET | `/api/audit` | Append-only audit log |

---

## Documentation

| Document | Path |
|---|---|
| Documentation index | [docs/README.md](docs/README.md) |
| Submission checklist | [docs/submission/SUBMISSION.md](docs/submission/SUBMISSION.md) |
| Quick demo | [docs/demo/QUICK_DEMO.md](docs/demo/QUICK_DEMO.md) |
| User guide | [docs/demo/USER_GUIDE.md](docs/demo/USER_GUIDE.md) |
| Demo video script | [docs/demo/DEMO_SCRIPT.md](docs/demo/DEMO_SCRIPT.md) |
| Business proposal | [docs/proposal/BUSINESS_PROPOSAL.md](docs/proposal/BUSINESS_PROPOSAL.md) |
| Architecture | [docs/technical/ARCHITECTURE.md](docs/technical/ARCHITECTURE.md) |
| Data flow | [docs/technical/DATA_FLOW.md](docs/technical/DATA_FLOW.md) |
| Evaluation methodology | [docs/technical/EVALUATION.md](docs/technical/EVALUATION.md) |
| Evaluation results | [docs/technical/EVALUATION_RESULTS.md](docs/technical/EVALUATION_RESULTS.md) |
| Compliance | [docs/compliance/COMPLIANCE.md](docs/compliance/COMPLIANCE.md) |

---

## Team

- Rohan Karna — IIT Jodhpur
- Sushantak Parashar Jha — IIT Jodhpur
- Hrishita Das — IIT Jodhpur

## License

MIT — see [LICENSE](LICENSE).
