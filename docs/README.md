# Acuity Documentation

**Team:** ProjectVector · IIT Jodhpur · Accenture Innovation Challenge 2026 — Round 2

This folder contains all judge-facing and technical documentation for **Acuity** (PatientTriage.ai).

---

## Start here

| Audience | Document |
|----------|----------|
| **Judges / reviewers** | [submission/SUBMISSION.md](submission/SUBMISSION.md) |
| **Live demo / video** | [demo/DEMO_SCRIPT.md](demo/DEMO_SCRIPT.md) |
| **Step-by-step run** | [demo/QUICK_DEMO.md](demo/QUICK_DEMO.md) |
| **Nurse console UX** | [demo/USER_GUIDE.md](demo/USER_GUIDE.md) |

---

## Folder structure

```
docs/
├── README.md                 ← You are here
├── submission/
│   └── SUBMISSION.md         Round 2 checklist, verify commands, judge narrative
├── demo/
│   ├── DEMO_SCRIPT.md        3–4 min video script
│   ├── QUICK_DEMO.md         Setup + one complete walkthrough
│   └── USER_GUIDE.md         DOOR Accept vs Override, audit, UI behavior
├── technical/
│   ├── ARCHITECTURE.md       System design, API, scoring pipeline
│   ├── EVALUATION.md         Golden benchmark methodology
│   ├── EVALUATION_RESULTS.md Committed test + benchmark snapshot
│   ├── DATA_FLOW.md          Where intake & override data is stored
│   └── DEPLOY.md             Railway / Vercel deploy guide
├── proposal/
│   └── BUSINESS_PROPOSAL.md  Problem, solution, roadmap, validation
└── compliance/
    └── COMPLIANCE.md         DPDP + HIPAA-aligned patterns, PoC limits
```

---

## Quick verification

From repository root:

```bash
npm run setup
npm test               # 25 passed
npm run evaluate       # golden benchmark table
npm run evaluate:report  # refresh data/benchmark/benchmark-report.json
npm run dev
```

**Results on disk:** [technical/EVALUATION_RESULTS.md](technical/EVALUATION_RESULTS.md) · [data/benchmark/benchmark-report.json](../data/benchmark/benchmark-report.json)

Open **http://localhost:3000**

---

## Product modules

| Module | Purpose |
|--------|---------|
| **DOOR** | 0–90s intake kiosk — complaint, name, vitals, live recommendation |
| **FLOW** | Priority waiting-room board with capacity and routes |
| **WATCH** | Deterioration feed until patient is seen |

Languages: **English** and **हिंदी** (Hindi). All data is **synthetic**.
