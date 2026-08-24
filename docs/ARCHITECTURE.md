# Architecture

## Overview

```
Nurse Console (Next.js)
    │
    ├── /api/intake | board | override | surge | watch | audit | assess
    │
    ├── @acuity/triage-engine  (pure TS, no I/O)
    │       ├── age stratum
    │       ├── hybrid ESI scorer
    │       ├── uncertainty + escalation bias
    │       └── WATCH thresholds / worsening vitals
    │
    └── Prisma → SQLite (demo) / Postgres (production)
            ├── Patient, Encounter, TriageAssessment
            ├── HospitalProfile (rural | community | urban_trauma)
            └── AuditEvent (append-only)
```

## Why this shape

- **Scoring is a library**, not buried in React — unit-tested, deterministic, reusable from future services
- **API boundary validated with Zod**
- **HospitalProfile** feature-flags capacity and surge behavior without forking the product
- **Audit** is first-class, not an afterthought log file

## Scoring pipeline

1. Determine age stratum (pediatric <18, adult 18–64, geriatric ≥65)
2. Keyword floors (critical → ESI 1, high → ESI 2, ambiguous → ESI 3 + uncertainty)
3. Completeness of vitals — sparse → uncertainty + possible escalation
4. Age-specific vital thresholds
5. History / under-reporting / language / ambulance modifiers
6. Surge × uncertainty → additional escalation
7. Emit confidence, drivers, factors, route, WATCH minutes

## Failure modes

| Condition | System behavior |
|---|---|
| DB unavailable | API errors; UI shows retry (no silent “green” default) |
| Partial vitals | Escalate uncertainty; never invent normals |
| Surge | Shorter WATCH; re-score waiting queue |
| Clinician disagrees | Override path only; full audit |

## Future adapters (Phase 2+)

- FHIR R4 Patient / Encounter / Observation read
- HL7v2 ADT/ORM where FHIR unavailable
- IdP OIDC
- Optional ML model implementing the same `TriageResult` contract
