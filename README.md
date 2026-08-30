# Acuity — PatientTriage.ai

**AI-powered Emergency Department (ED) triage decision support system**

**Team ProjectVector · IIT Jodhpur · Accenture Innovation Challenge 2026**

---

## Overview

**Acuity** is an AI-powered clinical decision-support system designed to assist emergency department triage nurses in prioritizing and routing patients at the point of entry.

It helps nurses:

* Prioritize patients using an acuity score
* Maintain a fair, dynamic waiting-room queue
* Identify patients who may be deteriorating while waiting
* Handle incomplete or uncertain patient information safely
* Adapt triage decisions during periods of emergency-department surge
* Maintain a transparent audit trail of triage decisions and overrides

Acuity is designed to **support clinical judgment, not replace it**. The triage nurse remains the final decision-maker for every patient.

---

## Key Features

### DOOR — Patient Intake

A fast intake interface designed for the first 0–90 seconds of patient assessment.

* Chief-complaint selection
* Patient identification
* Vital-sign entry
* Live ESI acuity preview
* Support for sparse or incomplete vitals
* English and हिंदी interface
* Clear uncertainty and escalation indicators

### FLOW — Priority Queue

A live waiting-room board that helps nurses understand who should be prioritized next.

* Dynamic acuity-based prioritization
* Patient-level ESI scores
* Age-aware triage
* Queue re-scoring when conditions change
* Quick access to patient details
* Designed for high-volume emergency-department workflows

### WATCH — Waiting Patient Monitoring

Acuity continuously reassesses patients who are waiting for care.

* Tracks waiting time against acuity-specific thresholds
* Generates reassessment alerts
* Supports simulated time progression for demonstrations
* Detects worsening vitals
* Escalates patients when risk increases
* Prevents patients from silently becoming lower priority while waiting

### Surge Mode

Designed for periods of approximately **3× normal patient load**.

Surge mode:

* Shortens WATCH reassessment thresholds
* Increases sensitivity to uncertainty
* Escalates ambiguous cases
* Re-scores the waiting queue
* Helps nurses manage increased patient volume

Surge mode can be ended once the department returns to normal operating conditions.

### Accept vs Override

The system provides a recommendation, while the nurse retains final authority.

* **Accept** — nurse agrees with the system's recommendation
* **Override** — nurse disagrees and records a clinical reason and note
* Overrides are permanently recorded in the audit trail
* The system never automatically downgrades a patient

### Audit Trail

Every important triage action is recorded in an append-only audit history.

Examples include:

* `INTAKE_CREATED`
* `OVERRIDE`
* `WATCH_TICK`
* Reassessment events
* Surge-mode changes
* Other patient-priority changes

The audit trail provides transparency into how and why triage decisions changed over time.

---

## Safety-First Design

Acuity is designed around the principle that **missing information should increase caution rather than create false reassurance**.

| Principle                                    | Implementation                                                    |
| -------------------------------------------- | ----------------------------------------------------------------- |
| Missing data is not normal data              | Sparse vitals increase uncertainty and can escalate acuity        |
| Under-triage is more costly than over-triage | Escalation bias is applied to uncertain cases                     |
| Never auto-downgrade                         | Downgrades require a clinician override                           |
| Age matters                                  | Pediatric, adult, and geriatric thresholds are handled separately |
| Uncertainty is visible                       | Scores include confidence and uncertainty drivers                 |
| Clinician remains in control                 | Nurses can accept or override every recommendation                |
| Decisions are traceable                      | Important actions are captured in the audit trail                 |

---

## Triage Engine

The Acuity triage engine uses an **age-stratified hybrid ESI scoring approach**.

It considers:

* Chief complaint
* Vital signs
* Age group
* Clinical severity indicators
* Missing or sparse information
* Uncertainty
* Emergency-department surge conditions

The engine produces an acuity recommendation together with:

* **ESI level**
* **Confidence**
* **Uncertainty drivers**
* **Escalation indicators**

The design intentionally favors **safe escalation in ambiguous situations** rather than silently assuming that missing information is normal.

---

## Evaluation

Acuity includes a reproducible benchmark consisting of **35 expert-designed clinical vignettes**.

### Latest verified results

**Verified: August 29, 2026**

| Metric                     |           Result |
| -------------------------- | ---------------: |
| Engine tests               | **25/25 passed** |
| Golden benchmark ESI match |         **100%** |
| Under-triage rate          |           **0%** |
| Critical miss rate         |    **0% (0/11)** |

The benchmark and evaluation pipeline are included in the repository so that results can be reproduced locally.

---

## Technology Stack

* **Next.js** — Web application and nurse console
* **TypeScript** — Application and shared type safety
* **Prisma** — Database access and schema
* **SQLite** — Local development database
* **Vitest** — Automated engine testing
* **Node.js 20+** — Runtime
* **REST API** — Communication between the interface and triage services

---

## Architecture

```text
                    ┌──────────────────────┐
                    │      DOOR Intake     │
                    │ Patient + Vitals +   │
                    │ Chief Complaint       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Triage Engine     │
                    │                      │
                    │ Age-aware scoring     │
                    │ Uncertainty handling │
                    │ Escalation logic      │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
          ┌──────────┐   ┌──────────┐   ┌──────────┐
          │   FLOW   │   │  WATCH   │   │  Audit   │
          │  Queue   │   │ Monitor  │   │  Trail   │
          └──────────┘   └──────────┘   └──────────┘
                │              │
                └──────┬───────┘
                       ▼
               ┌───────────────┐
               │ Nurse Decision│
               │ Accept /      │
               │ Override      │
               └───────────────┘
```

---

## API

| Method | Endpoint        | Purpose                                         |
| ------ | --------------- | ----------------------------------------------- |
| `GET`  | `/api/board`    | Retrieve queue, capacity and WATCH alerts       |
| `POST` | `/api/intake`   | Create patient intake and generate triage score |
| `POST` | `/api/override` | Record clinician override                       |
| `POST` | `/api/surge`    | Enable or disable surge mode                    |
| `POST` | `/api/watch`    | Advance simulated time and reassess patients    |
| `PUT`  | `/api/watch`    | Update patient vitals and reassess risk         |
| `GET`  | `/api/audit`    | Retrieve the audit history                      |

---

## Project Structure

```text
apps/
└── web/
    ├── Next.js nurse console
    ├── REST API
    └── Prisma database schema

packages/
├── triage-engine/
│   ├── ESI scoring engine
│   └── Vitest tests
│
└── shared/
    ├── Shared types
    ├── ESI mappings
    └── Audit schemas

data/
├── patients.seed.json
└── benchmark/
    ├── golden-cases.json
    └── benchmark-report.json



---

## Getting Started

### Requirements

* Node.js 20+
* npm

### Installation

```bash
npm run setup
```

This installs dependencies, initializes the local database, and seeds the development environment with synthetic patient data.

### Start the application

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

### Run tests

```bash
npm test
```

### Run the benchmark

```bash
npm run evaluate
```

### Generate the benchmark report

```bash
npm run evaluate:report
```

---

## Demo Workflow

A typical demonstration follows the clinical workflow:

```text
Patient arrives
      ↓
DOOR — Rapid intake
      ↓
Triage Engine — Acuity + uncertainty
      ↓
FLOW — Priority queue
      ↓
WATCH — Monitor while waiting
      ↓
Reassessment / escalation if required
      ↓
Nurse decision
      ↓
Accept or Override
      ↓
Audit Trail
```

During high patient volume, **Surge Mode** increases monitoring sensitivity and dynamically re-prioritizes the queue. Once the department returns to normal conditions, Surge Mode can be turned off.

---

## Data & Privacy

The project uses **synthetic patient data** for development, testing, and demonstration.

No real patient records are required to run the application locally.

The system is designed with privacy, traceability, and responsible clinical decision support in mind. Additional compliance considerations are documented separately in the project documentation.

---

## Important Disclaimer

Acuity is a **clinical decision-support prototype**.

It is not intended to diagnose patients, replace trained medical professionals, or make autonomous clinical decisions.

All triage recommendations should be reviewed by qualified clinical staff, with the final triage decision remaining with the responsible healthcare professional.

---

## Team

**ProjectVector — IIT Jodhpur**

* Rohan Karna
* Sushantak Parashar Jha
* Hrishita Das

---

## License

This project is licensed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
