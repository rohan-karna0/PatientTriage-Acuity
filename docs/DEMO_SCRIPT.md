# Demo Video Script (3–4 minutes)

**Title slate (5s):** Acuity — PatientTriage.ai · ProjectVector · Accenture Innovation Challenge Round 2

## 0:00–0:25 — Problem & promise

> “Emergency triage happens in seconds with incomplete data. Under-triage kills; over-triage is costly but safer. Acuity is decision support for the nurse — DOOR, FLOW, WATCH — never a replacement.”

Show board loading with ~22 patients.

## 0:25–1:10 — Age-stratified + ambiguous + zero-history

1. Click **P001** (3y fever 38.5°C) — show pediatric stratum factor and confidence.
2. Click **P002** (75y weakness/dizziness) — geriatric atypical + history escalation.
3. Click **P003** or **P004** — zero-history / ambiguous — point at **uncertainty drivers** and **escalation bias** chip.
4. Click **P006** — ESI 1 RED critical — resus route.

> “Same fever is not the same urgency across ages. Missing data never counts as normal.”

## 1:10–1:50 — Clinician override + audit

1. Select a yellow/orange patient.
2. **Clinician Override** → change ESI → reason code + note → save.
3. Open **Audit Trail** — show `OVERRIDE` with before/after ESI, clinician ID, hash, purpose `TRIAGE_DECISION_SUPPORT`.

> “Downgrades only happen here. DPDP purpose limitation, HIPAA-style accountability.”

## 1:50–2:40 — Surge (~3×)

1. Click **Enable Surge**.
2. Show toast, surge badge, re-scored queue, shorter reassess times, inflated wait clocks.
3. Point out uncertain cases that escalated.

> “Under surge we shorten WATCH SLAs and escalate uncertainty — we do not optimize for average accuracy.”

## 2:40–3:20 — WATCH

1. Click **WATCH Tick** once or twice.
2. Show reassess alerts on overdue patients.
3. Optionally mention vitals-worsening path (API PUT `/api/watch`).

> “Triage is continuous until the patient is seen.”

## 3:20–3:50 — DOOR live intake + close

1. **DOOR Intake** — sparse vitals, first-time patient, score.
2. Close on brand line:

> “Acuity: explainable, fail-safe, nurse-controlled triage — built as a product, not a slide.”

## Recording tips

- 1080p, browser zoom 90–100%, hide bookmarks
- Cursor highlights on confidence %, escalation bias, audit entries
- Upload to GitHub releases or `docs/demo.mp4` and link from README
