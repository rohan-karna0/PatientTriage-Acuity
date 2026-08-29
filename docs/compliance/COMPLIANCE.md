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
- DOOR displays a **purpose-limitation notice** (production will require explicit acknowledgement control)

## Consent & notice model

At DOOR intake the UI displays a notice that:
1. Data is collected for triage decision support
2. Clinician access is logged
3. Retention follows hospital policy (demo default: 7-year clinical retention clock field)

**PoC:** Static notice text; `consentNoticeAcknowledged: true` is sent with intake.  
**Production:** Interactive acknowledgement before scoring.

Production: hospital remains Data Fiduciary; Acuity acts as Data Processor under contract.

## Audit trail (DPDP + HIPAA-aligned)

Append-only `AuditEvent` records:

- `SCORE_ISSUED`, `OVERRIDE`, `REASSESS_TRIGGERED`, `SURGE_MODE_CHANGED`, `INTAKE_CREATED`, `VITALS_UPDATED`, `WATCH_TICK`
- `PATIENT_VIEWED` — **planned** (not implemented in PoC)
- Clinician ID + role
- Purpose string
- Optional **input hash** (SHA-256 truncated) instead of dumping full clinical payloads into logs where avoidable
- Override legally-relevant fields: previous ESI, new ESI, **reason code**, free-text note, timestamp

HIPAA-aligned: auditable access and amendment-like override history; minimum necessary via purpose tags.

See [technical/DATA_FLOW.md](../technical/DATA_FLOW.md) for intake and override storage details.

## Access control (PoC stub → production)

| Role | Intended capabilities | PoC behavior |
|---|---|---|
| `TRIAGE_NURSE` | Intake, view board, override, WATCH actions | **All actions** (stub) |
| `CHARGE_NURSE` | Surge mode, oversight | Surge available to stub nurse role |
| `AUDITOR` | Read-only audit | Audit readable by any console user |

Production: enterprise IdP (OIDC/SAML), least privilege, session timeout, break-glass with extra audit.

## PoC limitations (disclose to judges)

| Control | PoC | Production |
|---|---|---|
| Consent | Static notice | Checkbox / signature |
| RBAC | Single stub role | IdP-enforced roles |
| Audit read access | Open in demo UI | AUDITOR role only |
| Soft-delete / erasure hooks | Not implemented | Phase 1 hospital policy |

## Retention

- Schema field `Patient.retentionUntil` (demo: +7 years)
- Soft operational vs clinical decision retention to be configured per hospital policy
- Right to correction / erasure requests handled by hospital process; soft-delete hooks planned for Phase 1

## Security roadmap (production)

- Postgres with encryption at rest (cloud KMS)
- TLS in transit
- Secrets in vault; no secrets in git
- Penetration test + clinical safety validation before go-live
- BAA / DPDP processor agreement templates

## Explicit non-claims

Acuity is **clinical decision support**, not an autonomous medical device diagnosing or treating patients. Local regulatory classification (e.g., CDS vs SaMD) must be confirmed with hospital counsel before production.
