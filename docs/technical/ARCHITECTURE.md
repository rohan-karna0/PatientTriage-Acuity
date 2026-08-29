# Architecture

## Overview

```
Nurse Console (Next.js 15)
    │
    ├── REST API (Zod-validated)
    │       GET  /api/board
    │       POST /api/intake | override | surge | assess | watch
    │       PUT  /api/watch
    │       GET  /api/audit
    │
    ├── UI modules
    │       DOOR  — intake kiosk (en/hi), live score preview
    │       FLOW  — priority queue + patient detail
    │       WATCH — deterioration feed
    │
    ├── @acuity/triage-engine  (pure TS, browser-safe export)
    │       scoring, WATCH SLA, vitals worsening
    │       evaluate CLI: @acuity/triage-engine/evaluate (Node only)
    │
    └── Prisma → SQLite (demo) / Postgres (production)
            Patient, Encounter, TriageAssessment, AuditEvent, HospitalProfile
```

## Key source files

| Path | Role |
|------|------|
| `apps/web/src/app/page.tsx` | Main nurse console |
| `apps/web/src/lib/door-i18n.ts` | DOOR English/Hindi strings |
| `apps/web/src/lib/audit-display.ts` | Audit summary formatting |
| `apps/web/src/lib/triage-service.ts` | Server scoring + audit writes |
| `packages/triage-engine/src/scoring.ts` | Hybrid ESI engine |
| `data/patients.seed.json` | 22 seed patients |
| `data/benchmark/golden-cases.json` | 35 golden vignettes |

## Data layer

| File | Purpose |
|------|---------|
| `data/patients.seed.json` | P001–P022 synthetic cohort |
| `data/benchmark/golden-cases.json` | Expert-labeled evaluation cases |

## API surface

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/board` | Queue, capacity, WATCH alerts (+ vitals-worsening from audit) |
| POST | `/api/intake` | DOOR intake → score → audit |
| POST | `/api/override` | Clinician override → new assessment + audit |
| POST | `/api/surge` | Toggle surge; re-score all waiting encounters |
| POST | `/api/watch` | Advance sim clock; wait-threshold alerts |
| PUT | `/api/watch` | Vitals update; worsening alert if applicable |
| POST | `/api/assess` | Re-score one encounter (internal / surge) |
| GET | `/api/audit` | Append-only audit log |

## Scoring pipeline

1. Age stratum: pediatric &lt;18, adult 18–64, geriatric ≥65
2. Keyword floors (critical / high / ambiguous)
3. Vital completeness — sparse data raises uncertainty + may escalate
4. Age-stratified vital thresholds
5. History, under-reporting, ambulance; language barrier widens uncertainty only
6. Surge × uncertainty → additional escalation
7. Output: ESI, bucket, confidence, factors, route, `watchReassessMinutes`

**Safety contract:** ESI only moves toward more urgent in engine; downgrades only via override.

## UI behavior (PoC)

- Click FLOW row → scroll to Patient Detail
- DOOR Accept / Override → intake saved → focus patient on board
- Audit rows clickable for expanded summary
- WATCH Dismiss → session-local hide; count uses visible alerts

## Testing

| Layer | Command |
|-------|---------|
| Engine + golden benchmark | `npm test` |
| Benchmark report | `npm run evaluate` |
| API/UI | Manual per [demo/QUICK_DEMO.md](../demo/QUICK_DEMO.md) |

## PoC vs production

| Concern | PoC | Production |
|---------|-----|------------|
| Auth | Stub clinician | OIDC/SAML |
| DB | SQLite | Postgres + encryption |
| Consent | Static notice | Interactive ack |
| RBAC | All nurse role | CHARGE_NURSE surge gate |

## Future (Phase 2+)

FHIR read adapters, IdP, optional ML layer behind same `TriageResult` contract.

Data storage details: [DATA_FLOW.md](DATA_FLOW.md)
