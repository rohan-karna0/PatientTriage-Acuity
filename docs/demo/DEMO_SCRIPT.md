# Demo Video Script (3–4 minutes)

**Title slate (5s):** Acuity — PatientTriage.ai · ProjectVector · Accenture Innovation Challenge Round 2

**Pre-flight:** See [QUICK_DEMO.md](QUICK_DEMO.md) for setup commands.

---

## 0:00–0:25 — Problem & promise

> “Emergency triage happens in seconds with incomplete data. Under-triage kills; over-triage is costly but safer. Acuity is decision support for the nurse — DOOR, FLOW, WATCH — never a replacement.”

Show FLOW board with ~22 patients (**A-001** … **A-022**).

---

## 0:25–1:10 — Age-stratified scoring (FLOW)

1. Click **A-001 (P001)** — pediatric fever; auto-scroll to Patient Detail; show stratum + confidence.
2. Click **A-002 (P002)** — geriatric weakness; history + escalation bias.
3. Click **A-004 (P004)** — ambiguous; **uncertainty drivers**.
4. Click **A-006 (P006)** — ESI 1 RED, resus route.

> “Same fever is not the same urgency across ages. Missing vitals never count as normal.”

---

## 1:10–1:50 — Override from FLOW + audit

1. Select amber/yellow patient on FLOW.
2. **Override acuity** → change ESI → reason + note (≥3 chars) → **Save override**.
3. **Audit trail** → click **OVERRIDE** row → expand full summary (name, ESI before/after, note).

> “Downgrades only happen here. Every change is append-only and purpose-limited under DPDP.”

---

## 1:50–2:40 — Surge (~3×)

1. **Surge mode** → toast, badge, re-scored queue.
2. **End surge** → SLAs restore.

> “Under surge we shorten WATCH timers and escalate uncertainty — safety over average accuracy.”

---

## 2:40–3:10 — WATCH

1. **WATCH tick** ×2 → reassess alerts.
2. **Dismiss** → header alert count decreases.

> “Triage is continuous until the patient is seen.”

---

## 3:10–3:50 — DOOR intake + Accept vs Override

1. **DOOR Intake** → switch **हिंदी** → tap complaint → show vitals line + recommendation.
2. Enter name **Rajesh K.**, age 45, sparse vitals.

**Explain two buttons:**

> “**Accept** means the nurse agrees with the recommendation and sends the patient to the queue. **Override** means disagree — same intake, then change ESI with a reason and note. Both are logged; only Override changes acuity.”

3. Demo **Accept — RED** → patient on FLOW, scroll to detail.

4. (Optional second intake) Demo **Override** with clinical note.

> “Acuity: explainable, fail-safe, nurse-controlled — built as a product, not a slide.”

---

## Recording tips

- 1080p, zoom 90–100%
- Highlight: confidence %, vitals-at-intake chip, audit expand, Accept vs Override
- Upload video URL to [submission/SUBMISSION.md](../submission/SUBMISSION.md)

## Demo video URL

`https://...` _(add before submit)_
