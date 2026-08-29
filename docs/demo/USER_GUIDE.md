# Acuity Nurse Console — User Guide

How the live demo UI works for judges and testers.

---

## Console layout

| Section | What it does |
|---------|----------------|
| **Sidebar** | DOOR Intake, Surge mode, WATCH tick, Audit trail, navigation |
| **02 FLOW** | Priority queue — RED patients first, FIFO within same acuity |
| **03 WATCH** | Reassess alerts for overdue or deteriorating patients |
| **Patient Detail** | ESI, confidence, vitals at intake, factors, Override button |

**Tokens:** Seed patients show as **A-001** (internal seed **P001**). DOOR intakes get tokens like **A-847** from `INTAKE-{timestamp}`.

Click any FLOW row → page scrolls to **Patient Detail** for that patient.

---

## DOOR Intake (01)

### Fields

| Field | Required | Notes |
|-------|----------|-------|
| Language | — | English or हिंदी (full UI translation) |
| Complaint card | Yes | Chest pain, breathing, fever, etc. |
| Patient name | Optional | Defaults to "Walk-in patient" if empty |
| Vitals (HR, BP, SpO₂, Temp) | Optional | **Blank = unknown**, never treated as normal |
| Age | Yes | Used for age-stratum scoring |

### Recommendation panel (right side)

- Selected complaint (updates on tap)
- **Vitals at intake** — what you entered, or sparse-intake warning
- ESI + RED/AMBER/GREEN
- Confidence % and reasoning bullets

---

## Accept vs Override — why two buttons?

Acuity is **decision support**. The nurse always has final authority.

| Button | When to use | What happens |
|--------|-------------|--------------|
| **Accept — RED** (or AMBER/GREEN) | Nurse **agrees** with system recommendation | Patient intaken with **system ESI** → added to FLOW queue → scroll to detail |
| **Override** | Nurse **disagrees** with recommendation | Patient intaken first → override modal opens → change ESI + **reason + note** (min 3 chars) → saved to DB + audit → scroll to patient on FLOW |

Both paths **save the patient**. Only Override changes acuity with a documented clinical reason.

### Override modal shows

- Patient token + name
- Chief complaint
- System recommendation (current ESI)
- Target ESI you selected
- Reason code + clinical note (required)

---

## FLOW board override (existing patients)

1. Click patient row on FLOW
2. Scroll to **Patient Detail**
3. Click **Override acuity**
4. Save with reason + note

---

## Audit trail

Open from sidebar **Audit trail**.

- Each row shows a **one-line summary** (e.g. `ESI 2 → 3`, patient name)
- **Click a row** to expand full details (complaint, note, clinician, hash)
- Events: `INTAKE_CREATED`, `SCORE_ISSUED`, `OVERRIDE`, `WATCH_TICK`, `REASSESS_TRIGGERED`, `SURGE_MODE_CHANGED`

See [technical/DATA_FLOW.md](../technical/DATA_FLOW.md) for where data is stored.

---

## WATCH feed

- **WATCH tick** (top bar) advances simulation clock
- Overdue patients appear in **03 WATCH**
- **Reassess now** → opens override for that patient
- **Dismiss** → hides alert for this session; header alert count updates

---

## Surge mode

- **Surge mode** — ~3× load; shorter WATCH SLAs; uncertain cases may escalate
- **End surge** — queue re-scored; SLAs restore

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Empty board | `npm run setup` |
| Override does nothing | Clinical note must be ≥ 3 characters |
| `fs` module error | Restart dev server after `npm run build -w @acuity/triage-engine` |
| Port 3000 busy | `taskkill /IM node.exe /F` then `npm run dev` |
