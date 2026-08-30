# Acuity — PatientTriage.ai

Acuity is an AI-powered clinical decision-support system designed to assist
emergency department triage nurses in prioritizing and routing patients at the
point of entry. For site administrators evaluating the prototype, it offers a
complete triage workflow — intake, prioritization, monitoring, and audit — in
a single console, without requiring a live clinical backend to try it out.

Developers, on the other hand, will find a clear separation between the
triage-scoring engine and the nurse-facing application, making it
straightforward to extend the scoring logic, add new backends, or integrate
with hospital systems. Hence the modular package layout, with the engine kept
independent from the web application.

For a full description of the system, see the project proposal document.
To submit issues or track development, use the project's issue tracker.

Acuity is designed to support clinical judgment, not replace it. The triage
nurse remains the final decision-maker for every patient.


## Table of contents

- Requirements
- Installation
- Configuration
- Key features
- Information for developers
- Evaluation
- Maintainers


## Requirements

- Node.js 20 or later
- npm

No other services are required to run the prototype. The default setup uses
SQLite for local development, so no separate database server needs to be
installed.

### Recommended reading

There are a few documents worth reviewing before deploying or extending
Acuity:

- **Business proposal:** Describes the problem, solution, roadmap, and
  business model behind the system.
- **Safety-first design notes:** Explains the escalation-bias and
  uncertainty-handling principles the triage engine follows.
- **Benchmark report:** Contains the golden-case results referenced under
  Evaluation, below.


## Installation

Install dependencies and initialize the local environment with:

```bash
npm run setup
```

This installs dependencies, initializes the local database, and seeds the
development environment with synthetic patient data. No real patient records
are required to run the application locally.

Start the application with:

```bash
npm run dev
```

The application will then be available at `http://localhost:3000`.


## Configuration

After installation, for a quick start, the seeded synthetic data is enough to
explore the DOOR, FLOW, and WATCH workflows without any further setup.

Otherwise, you may want to configure a hospital profile — patient volume,
treatment capacity, surge multiplier, staffing conditions, and supported
languages — to match the environment you are demonstrating (rural/community
ED, urban hospital, or trauma center). Hospital profiles are configuration,
not separate builds of the software.

Run the automated test suite with:

```bash
npm test
```

Run the clinical benchmark with:

```bash
npm run evaluate
```

Generate the benchmark report with:

```bash
npm run evaluate:report
```

### Hidden configuration

There are some behaviors that are intentional design decisions rather than
user-facing settings:

- Downgrades are never performed automatically. A patient's acuity can only be
  lowered by a nurse recording an explicit override with a reason.
- Missing or sparse vitals increase uncertainty rather than being treated as
  normal. This cannot be disabled from the interface.
- Surge Mode changes reassessment thresholds and escalation sensitivity while
  active, and must be turned off manually once patient volume returns to
  normal.


## Key features

**DOOR — Patient Intake:** A fast intake interface for the first 0–90 seconds
of assessment: chief-complaint selection, patient identification, vital-sign
entry, a live ESI acuity preview, support for sparse or incomplete vitals, an
English/Hindi interface, and clear uncertainty and escalation indicators.

**FLOW — Priority Queue:** A live waiting-room board with dynamic
acuity-based prioritization, patient-level ESI scores, age-aware triage,
queue re-scoring when conditions change, and quick access to patient details.

**WATCH — Waiting Patient Monitoring:** Continuously reassesses waiting
patients: tracks waiting time against acuity-specific thresholds, generates
reassessment alerts, detects worsening vitals, and escalates patients when
risk increases.

**Surge Mode:** For periods of roughly 3× normal patient load: shortens WATCH
reassessment thresholds, increases sensitivity to uncertainty, escalates
ambiguous cases, and re-scores the waiting queue.

**Accept vs Override:** The system recommends; the nurse decides. Accept
means the nurse agrees with the recommendation. Override means the nurse
disagrees and records a clinical reason and note. Overrides are permanently
logged, and the system never automatically downgrades a patient.

**Audit Trail:** Every important triage action — intake, overrides,
reassessments, surge-mode changes — is recorded in an append-only history,
giving transparency into how and why decisions changed over time.


## Information for developers

The Acuity triage engine uses an age-stratified hybrid ESI scoring approach.
It considers chief complaint, vital signs, age group, clinical severity
indicators, missing or sparse information, uncertainty, and ED surge
conditions, and produces a recommendation together with an ESI level,
confidence, uncertainty drivers, and escalation indicators.

### Safety principles

These principles are followed throughout the engine and are not configurable:

- Missing data is not normal data — sparse vitals increase uncertainty and
  can escalate acuity.
- Under-triage is treated as more costly than over-triage — an escalation
  bias is applied to uncertain cases.
- Age matters — pediatric, adult, and geriatric thresholds are handled
  separately.
- Uncertainty is always visible — scores include confidence and uncertainty
  drivers, never a bare number.
- Decisions are traceable — important actions are captured in the audit
  trail.

### API

The web application exposes the following endpoints:

| Method | Endpoint         | Purpose                                          |
|--------|------------------|---------------------------------------------------|
| GET    | `/api/board`     | Retrieve queue, capacity, and WATCH alerts        |
| POST   | `/api/intake`    | Create patient intake and generate triage score   |
| POST   | `/api/override`  | Record clinician override                         |
| POST   | `/api/surge`     | Enable or disable surge mode                       |
| POST   | `/api/watch`     | Advance simulated time and reassess patients       |
| PUT    | `/api/watch`     | Update patient vitals and reassess risk            |
| GET    | `/api/audit`     | Retrieve the audit history                         |

### Project structure

The codebase is organized as a monorepo:

- `apps/web` — Next.js nurse console, REST API, and Prisma schema
- `packages/triage-engine` — ESI scoring engine and Vitest tests
- `packages/shared` — Shared types, ESI mappings, and audit schemas
- `data/` — Synthetic seed data and the golden benchmark cases

### Technology stack

- **Next.js** — Web application and nurse console
- **TypeScript** — Application and shared type safety
- **Prisma** — Database access and schema
- **SQLite** — Local development database
- **Vitest** — Automated engine testing
- **Node.js 20+** — Runtime
- **REST API** — Communication between the interface and triage services


## Evaluation

Acuity includes a reproducible benchmark of 35 expert-designed clinical
vignettes. The benchmark and evaluation pipeline are included in the
repository so results can be reproduced locally with `npm run evaluate`.

Latest verified results (verified August 29, 2026):

| Metric                     | Result        |
|-----------------------------|---------------|
| Engine tests                 | 25/25 passed  |
| Golden benchmark ESI match   | 100%          |
| Under-triage rate            | 0%            |
| Critical miss rate           | 0% (0/11)     |

These results validate the current prototype and are not a substitute for
prospective clinical validation.


## Important disclaimer

Acuity is a clinical decision-support prototype. It is not intended to
diagnose patients, replace trained medical professionals, or make autonomous
clinical decisions. All triage recommendations should be reviewed by
qualified clinical staff, with the final triage decision remaining with the
responsible healthcare professional.


## Maintainers

Current maintainers, Team ProjectVector — IIT Jodhpur:

- Rohan Karna
- Sushantak Parashar Jha
- Hrishita Das
