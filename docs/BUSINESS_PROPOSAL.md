# Acuity — Business Proposal (Round 2)

**Product:** Acuity (PatientTriage.ai)  
**Team:** ProjectVector — IIT Jodhpur  
**Challenge:** Accenture Innovation Challenge 2026  

## 1. Problem framing

Emergency departments decide who is seen first under extreme time pressure, incomplete information, and overlapping symptoms. Research commonly cited in ED quality literature suggests a substantial fraction of visits may be assigned the wrong urgency, and critically ill patients are not always identified at arrival. In many Indian public hospitals, formal triage processes are strained during peaks; language barriers and thin EHR coverage amplify risk.

Most triage workflows are **point-in-time**: assess at the door, then move on. Patients waiting can deteriorate unnoticed. Under-triage (missing a critical case) is categorically more harmful than over-triage. Tools calibrated only on adult vital thresholds create silent safety risk for children and older adults.

**What is needed:** A decision-support assistant that (1) scores acuity with age-aware rules and explicit uncertainty, (2) routes fairly within priority, (3) continuously watches the waiting room, and (4) keeps the licensed clinician in control with a reviewable audit trail.

## 2. Solution design

Acuity implements three layers from Round 1:

| Layer | Window | Function |
|---|---|---|
| **DOOR** | 0–90 seconds | Recommend ESI-aligned acuity from complaint, cues, vitals, history (if any). Missing data increases uncertainty and may escalate — never assumed normal. |
| **FLOW** | Live | Route to resus / acute / fast-track / waiting; FIFO within acuity; hospital capacity profile. |
| **WATCH** | Until seen | Reassess alerts when wait exceeds safe thresholds for ESI (shorter in surge) or vitals worsen. |

**Decision model:** Hybrid, explainable, age-stratified rules (pediatric / adult / geriatric) with an uncertainty model and **deliberate escalation bias**. Designed to accept a future ML risk layer behind the same interface without changing nurse workflow.

**Non-goals:** Diagnosis, autonomous treatment decisions, replacing the triage nurse.

## 3. Target users

- **Primary:** Triage nurse (DOOR + board + override)
- **Secondary:** Charge nurse (surge mode, WATCH oversight)
- **Tertiary:** ED admin / quality (audit, retention, pilot metrics)
- **Future:** Bed management / roster systems via FHIR adapters

## 4. Business case & impact

**Value drivers**
- Reduce door-to-correct-acuity time under incomplete data
- Reduce under-triage through escalation bias + pediatric/geriatric thresholds
- Detect waiting-room deterioration earlier (WATCH)
- Create defensible audit evidence for clinical governance and regulators

**Illustrative impact (pilot assumptions — refine with hospital baseline)**
- 100–500+ visits/day environments
- Target: measurable drop in under-triage rate and time-to-reassess for ESI 2–3 waiters
- Surge mode preserves safety SLAs when volume ≈ 3× baseline

**Commercial shape (product path)**
- Hospital SaaS per ED site + optional premium connectors (EHR/FHIR, SSO)
- Configuration packs: rural community vs urban trauma (beds, languages, staffing)

## 5. Phased roadmap

| Phase | Scope | Outcome |
|---|---|---|
| **0 — PoC (this repo)** | Synthetic data, hybrid engine, nurse console, audit, surge/WATCH | Judge-demo + internal validation |
| **1 — Single-site pilot** | SSO stub → real IdP, Postgres + encryption, nurse training, shadow mode | Clinical safety review sign-off |
| **2 — Operational assist** | Live DOOR/FLOW/WATCH with override analytics; alert-fatigue tuning | Measured KPI improvement |
| **3 — Multi-site** | Hospital profiles, multi-language UX, FHIR read adapters | Scale 100–500+ visits/day sites |
| **4 — Intelligence layer** | Supervised risk models behind same explainability contract | Continuous learning with human oversight |

## 6. Key risks & mitigations

| Risk | Mitigation |
|---|---|
| Clinical liability | CDS only; nurse override mandatory for downgrade; immutable audit |
| Alert fatigue | Severity-tiered WATCH; surge-aware thresholds; charge-nurse controls |
| Adoption resistance | <90s DOOR UX; explanations in plain language; shadow mode first |
| Age/bias safety | Stratified thresholds; golden tests; no adult-only default |
| Data misuse | DPDP purpose limitation; classification tags; no secondary marketing use |
| Integration friction | Start EHR-optional; FHIR later; works with zero-history patients |
| Model opacity (future ML) | Hybrid contract: every score exposes confidence + factors |

## 7. Scalability across hospital types

`HospitalProfile` encodes visits/day, resus/acute/fast-track capacity, surge multiplier, and languages. The same engine serves a rural ED (thin staffing, walk-in heavy) and an urban trauma center (ambulance mix, higher ESI-1 volume) via configuration — not forks.

## 8. Why Acuity wins as a product

It turns Round 1’s safety narrative into a **working, testable mechanism**: age-stratified scoring, explicit uncertainty, surge behavior, WATCH, and clinician overrides with DPDP-primary / HIPAA-aligned audit — packaged as production-structured TypeScript ready for pilot hardening.
