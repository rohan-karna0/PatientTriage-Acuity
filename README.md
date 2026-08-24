# Acuity — PatientTriage.ai

**Team:** ProjectVector (IIT Jodhpur) · Accenture Innovation Challenge 2026 — Round 2  
**Product:** Acuity — AI-powered ED triage decision support (does **not** replace clinical judgment)

Acuity helps triage nurses prioritize and route patients at the door, keep a fair live queue, and watch waiting patients for deterioration — under incomplete data, age-diverse presentations, and surge load.

## Safety design (explicit)

| Principle | Behavior in this prototype |
|---|---|
| Never assume missing vitals are normal | Sparse vitals raise uncertainty and **escalate** acuity |
| Under-triage cost > over-triage cost | `escalationBiasApplied` flag; surge + ambiguity escalate further |
| Never auto-downgrade | Downgrades only via **clinician override** with reason + note |
| Age-stratified scoring | Pediatric / adult / geriatric vital thresholds (e.g. fever 38.5°C) |
| Always show uncertainty | Every score includes `confidence` + `uncertaintyDrivers` |
| Nurse final authority | Override + append-only audit trail |

## Assumptions (stated for judges)

- ED volume ~100–500+ visits/day; demo hospital profile ~220/day
- ~50% of seed patients have prior history, ~50% zero-history
- ESI 5-level scale mapped to nurse-facing RED→BLUE buckets
- **Primary jurisdiction:** India **DPDP Act 2023**; **secondary:** HIPAA-aligned audit / minimum-necessary patterns for global product path
- All patient data is **synthetic**

## Quick start (<5 minutes)

```bash
# Node 20+ required
npm install
npm run setup          # prisma generate + db push + seed (22 patients)
npm run dev            # http://localhost:3000
```

Optional tests for the scoring engine:

```bash
npm test
```

### Demo path for judges

1. Open the FLOW board — 22 waiting patients with ESI, **confidence %**, tags (pediatric / geriatric / ambiguous / zero-history).
2. Select **P002** (geriatric weakness) and **P001** (pediatric fever) — compare age-stratum explanations.
3. Select **P004** (ambiguous) — note uncertainty drivers + escalation bias.
4. Click **Clinician Override** — change ESI, enter reason — open **Audit Trail** to see `OVERRIDE` event.
5. Click **Enable Surge** — watch re-scores, shorter WATCH SLAs, wait clocks jump (~3× pressure).
6. Click **WATCH Tick** — overdue patients emit reassess alerts.
7. Use **DOOR Intake** for a live first-time patient with incomplete vitals.

## Repository layout

```
apps/web                 Next.js nurse console + API routes + Prisma
packages/triage-engine   Pure TypeScript hybrid scorer + WATCH (unit-tested)
packages/shared          Shared types (ESI, audit actions, consent purpose)
data/patients.seed.json  22 synthetic patients
docs/                    Business proposal, compliance, demo script, architecture
```

## API surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/board` | Queue + WATCH alerts + hospital profile |
| POST | `/api/intake` | DOOR intake + score |
| POST | `/api/override` | Clinician override (audited) |
| POST | `/api/surge` | Toggle surge (~3×) + re-score |
| POST | `/api/watch` | Advance sim clock + reassess alerts |
| PUT | `/api/watch` | Update vitals; detect worsening |
| GET | `/api/audit` | Append-only audit events |
| POST | `/api/assess` | Re-score one encounter |

## Documentation

- [Business Proposal](docs/BUSINESS_PROPOSAL.md)
- [Compliance (DPDP + HIPAA-aligned)](docs/COMPLIANCE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Demo video script](docs/DEMO_SCRIPT.md)

## Demo video

Record a 3–4 minute walkthrough using [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md). Place the file at `docs/demo.mp4` (or link it from the README) before submission.

## Team

- Rohan Karna — IIT Jodhpur  
- Sushantak Parashar Jha — IIT Jodhpur  
- Hrishita Das — IIT Jodhpur  

## License

MIT — see [LICENSE](LICENSE).
