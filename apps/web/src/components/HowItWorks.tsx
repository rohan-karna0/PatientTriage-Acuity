export function HowItWorks() {
  return (
    <div className="guide">
      <div className="guide-hero">
        <h2>How Acuity works</h2>
        <p>
          Acuity is a <strong>clinical decision-support</strong> tool for emergency department triage.
          It helps nurses prioritize patients faster — but the <strong>nurse always has final
          authority</strong>. Nothing here replaces clinical judgment or makes a diagnosis.
        </p>
      </div>

      <div className="guide-grid">
        <article className="guide-card">
          <span className="guide-num">01</span>
          <h3>DOOR — Intake (0–90 seconds)</h3>
          <p>
            When a patient arrives, capture their complaint and any available vitals. Acuity scores
            acuity immediately — even with missing data.
          </p>
          <ul>
            <li>Tap a complaint card or describe symptoms</li>
            <li>Enter vitals only if available — blanks are never treated as “normal”</li>
            <li>See a live recommendation with confidence % before accepting</li>
            <li>Multi-language tabs support English and Hindi intake</li>
          </ul>
        </article>

        <article className="guide-card">
          <span className="guide-num">02</span>
          <h3>FLOW — Waiting room board</h3>
          <p>
            All waiting patients appear in a live priority queue. Higher urgency (RED) is seen
            first; within the same level, order is <strong>first-in-first-out</strong> (fair queue).
          </p>
          <ul>
            <li>
              <strong>Capacity cards</strong> — Resus, Acute care, Fast-track bed availability
            </li>
            <li>
              <strong>Token</strong> — Hospital-style ID (e.g. A-001) for each patient
            </li>
            <li>
              <strong>Wait clock</strong> — How long the patient has been waiting
            </li>
            <li>
              <strong>Route</strong> — Suggested destination (Resus → Acute → Fast-track)
            </li>
          </ul>
        </article>

        <article className="guide-card">
          <span className="guide-num">03</span>
          <h3>WATCH — Deterioration monitoring</h3>
          <p>
            Triage is not a one-time decision. Acuity keeps watching patients until they are seen.
            If someone waits too long for their acuity level, or vitals worsen, a reassess alert
            fires.
          </p>
          <ul>
            <li>Red ring = urgent reassess now</li>
            <li>Amber / green rings = SLA countdown until next check</li>
            <li>
              <strong>WATCH tick</strong> — Advances the simulation clock (demo mode)
            </li>
          </ul>
        </article>
      </div>

      <section className="guide-section">
        <h3>Acuity color language</h3>
        <div className="guide-colors">
          <div className="guide-color-item">
            <span className="acuity-pill RED">RED</span>
            <div>
              <strong>Immediate / Emergent</strong> — ESI 1–2. Life-threatening or high-risk
              (e.g. chest pain, low SpO₂, unresponsive). Route to Resus or Acute.
            </div>
          </div>
          <div className="guide-color-item">
            <span className="acuity-pill AMBER">AMBER</span>
            <div>
              <strong>Urgent</strong> — ESI 3. Needs timely care; ambiguous presentations often
              land here with escalation bias.
            </div>
          </div>
          <div className="guide-color-item">
            <span className="acuity-pill GREEN">GREEN</span>
            <div>
              <strong>Less urgent</strong> — ESI 4–5. Stable presentations; Fast-track or routine
              waiting.
            </div>
          </div>
        </div>
      </section>

      <section className="guide-section">
        <h3>Key UI components explained</h3>
        <table className="guide-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>What it means</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Confidence %</td>
              <td>
                How certain the engine is given available data. Every score always shows this —
                never a number without uncertainty.
              </td>
            </tr>
            <tr>
              <td>Escalation bias</td>
              <td>
                Under missing data or ambiguity, Acuity prefers <em>over-triage</em> to under-triage
                (safer to prioritize up than miss a critical case).
              </td>
            </tr>
            <tr>
              <td>Age stratum</td>
              <td>
                Pediatric, adult, and geriatric patients use <strong>different vital thresholds</strong>{" "}
                (e.g. fever 38.5°C is more urgent in a 3-year-old than a healthy adult).
              </td>
            </tr>
            <tr>
              <td>Surge mode</td>
              <td>
                Simulates ~3× ED volume. Shortens WATCH timers and escalates uncertain cases — models
                how the system behaves under pressure.
              </td>
            </tr>
            <tr>
              <td>Clinician override</td>
              <td>
                Nurse can change acuity with a mandatory reason + note. The system{" "}
                <strong>never auto-downgrades</strong> — only a human can lower priority.
              </td>
            </tr>
            <tr>
              <td>Audit trail</td>
              <td>
                Append-only log of scores, overrides, and alerts. Compliant with India DPDP Act 2023
                purpose limitation.
              </td>
            </tr>
            <tr>
              <td>Zero-history patient</td>
              <td>
                First-time visitors with no prior record — scoring relies on intake only; uncertainty
                is higher.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="guide-section guide-safety">
        <h3>Safety principles (built into the product)</h3>
        <div className="guide-safety-grid">
          <div>✓ Missing vitals → raise uncertainty, may escalate</div>
          <div>✓ Nurse retains final authority on every decision</div>
          <div>✓ Never auto-downgrade acuity</div>
          <div>✓ Continuous WATCH until patient is seen</div>
          <div>✓ Synthetic demo data only — no real PHI</div>
          <div>✓ Explainable factors on every recommendation</div>
        </div>
      </section>

      <p className="guide-footer">
        Team ProjectVector · IIT Jodhpur · Accenture Innovation Challenge 2026 · Questions? Use
        Audit Trail to verify every system action.
      </p>
    </div>
  );
}
