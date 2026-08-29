# Quick Demo — Step by Step

One complete example you can run in ~5 minutes.

---

## 1. Start

```powershell
cd C:\Users\rohan\Desktop\Project
npm.cmd run setup
npm.cmd run dev
```

Open **http://localhost:3000** — expect **22 waiting** patients.

---

## 2. Compare two patients (30 sec)

1. Click **A-001** — pediatric fever; note **pediatric** stratum and confidence
2. Page scrolls to **Patient Detail** automatically
3. Click **A-002** — geriatric weakness; different scoring

> “Same ED, different ages — Acuity does not use one-size-fits-all rules.”

---

## 3. DOOR intake with Accept (1 min)

1. Sidebar → **DOOR Intake**
2. Tap **Chest pain**
3. Name: `Rajesh K.`
4. Age: `45` — leave vitals empty (shows sparse-intake logic)
5. Right panel: **RED**, confidence ~58%, factors listed
6. Click **Accept — RED**
7. Patient appears on FLOW; page scrolls to their detail

---

## 4. DOOR intake with Override (1 min)

1. **DOOR Intake** again
2. Complaint: **Fever**, name: `Priya S.`, age `8`, temp `38.5`
3. Click **Override** (not Accept)
4. Override modal: change ESI if needed
5. Reason: **Clinical judgment**
6. Note: `Parent reports worsening over 2 hours`
7. **Save override** — patient on FLOW with updated ESI

---

## 5. Audit (30 sec)

1. Sidebar → **Audit trail**
2. Click latest **INTAKE_CREATED** or **OVERRIDE**
3. Show expanded summary with patient name and ESI change

---

## 6. Surge + WATCH (1 min)

1. **Surge mode** → queue may re-order
2. **WATCH tick** twice → alerts in **03 WATCH**
3. **Dismiss** one alert — count in header drops
4. **End surge**

---

## 7. Verify tests (optional, for judges)

```bash
npm.cmd test
npm.cmd run evaluate
```

Video script with timings: [DEMO_SCRIPT.md](DEMO_SCRIPT.md)
