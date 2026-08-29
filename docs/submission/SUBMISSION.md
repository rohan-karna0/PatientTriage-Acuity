# Round 2 Submission Checklist — Acuity / ProjectVector

**Team:** ProjectVector · IIT Jodhpur  
**Challenge:** Accenture Innovation Challenge 2026 — Round 2  
**Product:** Acuity (PatientTriage.ai) — ED triage decision support

---

## Deliverables

| Deliverable | Location | Status |
|---|---|---|
| Runnable prototype | `apps/web` + `npm run dev` | Included |
| Documentation index | [docs/README.md](../README.md) | Included |
| Business proposal | [proposal/BUSINESS_PROPOSAL.md](../proposal/BUSINESS_PROPOSAL.md) | Included |
| Architecture | [technical/ARCHITECTURE.md](../technical/ARCHITECTURE.md) | Included |
| Data flow | [technical/DATA_FLOW.md](../technical/DATA_FLOW.md) | Included |
| Compliance | [compliance/COMPLIANCE.md](../compliance/COMPLIANCE.md) | Included |
| Evaluation | [technical/EVALUATION.md](../technical/EVALUATION.md) | Included |
| Evaluation results | [technical/EVALUATION_RESULTS.md](../technical/EVALUATION_RESULTS.md) + `data/benchmark/benchmark-report.json` | Included |
| Demo script | [demo/DEMO_SCRIPT.md](../demo/DEMO_SCRIPT.md) | Included |
| User guide | [demo/USER_GUIDE.md](../demo/USER_GUIDE.md) | Included |
| Demo video | _Add URL below_ | **TODO** |
| Repository URL | _Add GitHub / host URL_ | **TODO** |

---

## What to push to GitHub

**Include:** `apps/`, `packages/`, `data/`, `docs/`, root `package.json`, `README.md`, `LICENSE`

**Exclude** (in `.gitignore`): `node_modules/`, `.next/`, `dev.db`, `.env`, `.tools/`

See root [README.md](../../README.md#what-to-push-to-github-and-show-judges) for full list.

---

```bash
npm run setup
npm test
npm run evaluate
```

**Expected:** 25 tests pass; `All golden cases passed.`; exit code **0**.

Optional: `npm run build` (stop dev server first on Windows if Prisma EPERM).

Windows: use `npm.cmd` if PowerShell blocks `npm`.

---

## 3-minute judge walkthrough

1. **FLOW** — 22 patients (**A-001** … **A-022**); click row → auto-scroll to Patient Detail
2. **A-001 (P001)** vs **A-002 (P002)** — pediatric vs geriatric scoring
3. **A-004 (P004)** — ambiguous case, uncertainty + escalation bias
4. **DOOR Intake** — name, complaint, vitals (optional), English/Hindi
5. **Accept — RED** vs **Override** — nurse agrees vs disagrees (see [USER_GUIDE](../demo/USER_GUIDE.md))
6. **Audit trail** — click event for full summary (`OVERRIDE`, `INTAKE_CREATED`)
7. **Surge mode** / **End surge** — queue re-scored, WATCH SLAs change
8. **WATCH tick** — alerts; **Dismiss** updates visible count

Full script: [demo/DEMO_SCRIPT.md](../demo/DEMO_SCRIPT.md)

---

## Judge narrative

> Acuity is safety-biased ED triage decision support (DOOR / FLOW / WATCH). We publish a **35-case golden benchmark** with **zero under-triage on critical vignettes**, reproducible via `npm test` and `npm run evaluate`. All data is synthetic; the nurse retains final authority — **Accept** records agreement, **Override** records disagreement with audit.

---

## Known PoC limitations

| Area | PoC | Production |
|---|---|---|
| Auth / RBAC | Stub `TRIAGE_NURSE` for all actions | Enterprise IdP |
| Consent | Static DOOR notice | Interactive acknowledgement |
| Testing | Engine Vitest only | API E2E + shadow-mode pilot |
| Database | SQLite (`apps/web/prisma/dev.db`) | Postgres + encryption |
| Score history UI | DB stores all assessments; UI shows latest only | Full timeline view |
| `PATIENT_VIEWED` audit | Planned | Row-click audit |

---

## Repository map

```
apps/web/                         Nurse console + API + Prisma
  src/app/page.tsx                FLOW / WATCH / DOOR UI
  src/lib/audit-display.ts        Human-readable audit summaries
  src/lib/door-i18n.ts            English + Hindi DOOR strings
packages/triage-engine/           Scorer (browser-safe main export)
packages/shared/                  Types, ESI mapping
data/patients.seed.json           22 synthetic patients
data/benchmark/golden-cases.json  35 expert vignettes
docs/                             This documentation tree
```

---

## Demo video URL

_Add before submission:_

`https://...`

---

## Contact

- Rohan Karna — IIT Jodhpur
- Sushantak Parashar Jha — IIT Jodhpur
- Hrishita Das — IIT Jodhpur
