# Compliance Note — Acuity

## Jurisdiction statement

| Layer | Standard | Role in Acuity |
|---|---|---|
| **Primary** | India **Digital Personal Data Protection Act, 2023 (DPDP)** | Lawful purpose, notice, retention, fiduciary duties for Indian hospital deployments |
| **Secondary (product export)** | **HIPAA**-aligned patterns (US) | Access logging, minimum necessary, audit controls for global roadmap |

This prototype uses **synthetic data only**. No real PHI/PII is processed.

## Purpose limitation (DPDP)

- **Declared purpose:** `TRIAGE_DECISION_SUPPORT` only
- Data classification tags: `TRIAGE_OPERATIONAL` | `CLINICAL_DECISION` | `AUDIT`
- No secondary use for marketing, insurance scoring, or unrelated analytics in product design
- Intake UI includes a consent/notice acknowledgement before scoring

## Consent & notice model

At DOOR intake the nurse acknowledges a notice that:
1. Data is collected for triage decision support
2. Clinician access is logged
3. Retention follows hospital policy (demo default: 7-year clinical retention clock field)

Production: hospital remains Data Fiduciary; Acuity acts as Data Processor under contract.

## Audit trail (DPDP + HIPAA-aligned)

Append-only `AuditEvent` records:

- `SCORE_ISSUED`, `OVERRIDE`, `REASSESS_TRIGGERED`, `SURGE_MODE_CHANGED`, `INTAKE_CREATED`, `VITALS_UPDATED`, `WATCH_TICK`, `PATIENT_VIEWED` (extensible)
- Clinician ID + role
- Purpose string
- Optional **input hash** (SHA-256 truncated) instead of dumping full clinical payloads into logs where avoidable
- Override legally-relevant fields: previous ESI, new ESI, **reason code**, free-text note, timestamp

HIPAA-aligned: auditable access and amendment-like override history; minimum necessary via purpose tags.

## Access control (PoC stub → production)

| Role | Capabilities |
|---|---|
| `TRIAGE_NURSE` | Intake, view board, override, WATCH actions |
| `CHARGE_NURSE` | Surge mode, oversight |
| `AUDITOR` | Read-only audit (enforced in production IdP; stubbed in PoC via role field) |

Production: enterprise IdP (OIDC/SAML), least privilege, session timeout, break-glass with extra audit.

## Retention

- Schema field `Patient.retentionUntil` (demo: +7 years)
- Soft operational vs clinical decision retention to be configured per hospital policy
- Right to correction / erasure requests handled by hospital process; system supports soft-delete hooks in Phase 1

## Security roadmap (production)

- Postgres with encryption at rest (cloud KMS)
- TLS in transit
- Secrets in vault; no secrets in git
- Penetration test + clinical safety validation before go-live
- BAA / DPDP processor agreement templates

## Explicit non-claims

Acuity is **clinical decision support**, not an autonomous medical device diagnosing or treating patients. Local regulatory classification (e.g., CDS vs SaMD) must be confirmed with hospital counsel before production.
