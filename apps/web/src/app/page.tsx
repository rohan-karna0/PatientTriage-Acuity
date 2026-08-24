"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Assessment = {
  id: string;
  esi: number;
  bucket: string;
  confidence: number;
  escalationBiasApplied: boolean;
  ageStratum: string;
  recommendedRoute: string;
  watchReassessMinutes: number;
  summary: string;
  source: string;
  uncertaintyDrivers: { code: string; message: string; impact: string }[];
  factors: { code: string; label: string; contribution: string; detail: string }[];
};

type QueueItem = {
  encounterId: string;
  patientExternalId: string;
  displayName: string;
  ageYears: number;
  sex: string;
  chiefComplaint: string;
  tags: string[];
  hasPriorRecord: boolean;
  demoNotes: string | null;
  waitingMinutes: number;
  languageBarrier: boolean;
  underReportingSuspected: boolean;
  assessment: Assessment | null;
};

type WatchAlert = {
  encounterId: string;
  reason: string;
  message: string;
  severity: "critical" | "high" | "moderate";
};

type BoardResponse = {
  hospital: {
    name: string;
    profileType: string;
    visitsPerDay: number;
    resusBeds: number;
    acuteBeds: number;
    fastTrackSlots: number;
    surgeMultiplier: number;
  } | null;
  surgeMode: boolean;
  queue: QueueItem[];
  watchAlerts: WatchAlert[];
  stats: {
    waiting: number;
    byEsi: { esi: number; count: number }[];
    alerts: number;
  };
};

type AuditEvent = {
  id: string;
  action: string;
  entityId: string;
  clinicianId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  inputHash: string | null;
};

const emptyIntake = {
  displayName: "",
  ageYears: 40,
  sex: "U",
  chiefComplaint: "",
  observedCues: "",
  heartRate: "",
  spo2: "",
  temperatureC: "",
  systolicBp: "",
  hasPriorRecord: false,
  arrivalMode: "walk_in",
  languageBarrier: false,
  underReportingSuspected: false,
  consentNoticeAcknowledged: true,
};

export default function HomePage() {
  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [showIntake, setShowIntake] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [intake, setIntake] = useState(emptyIntake);
  const [overrideForm, setOverrideForm] = useState({
    newEsi: 3,
    reasonCode: "CLINICAL_JUDGMENT",
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const selected = useMemo(
    () => board?.queue.find((q) => q.encounterId === selectedId) ?? null,
    [board, selectedId],
  );

  const loadBoard = useCallback(async () => {
    const res = await fetch("/api/board", { cache: "no-store" });
    const data = (await res.json()) as BoardResponse;
    setBoard(data);
    setSelectedId((prev) => prev ?? data.queue[0]?.encounterId ?? null);
  }, []);

  const loadAudit = useCallback(async () => {
    const res = await fetch("/api/audit?limit=80", { cache: "no-store" });
    const data = await res.json();
    setAudit(data.events ?? []);
  }, []);

  useEffect(() => {
    loadBoard().catch(console.error);
  }, [loadBoard]);

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  async function toggleSurge() {
    if (!board) return;
    await withBusy(async () => {
      await fetch("/api/surge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surgeMode: !board.surgeMode }),
      });
      setToast(board.surgeMode ? "Surge mode off — baseline SLAs restored" : "Surge ON — ~3× pressure, shorter WATCH SLAs, uncertainty escalates");
      await loadBoard();
    });
  }

  async function tickWatch() {
    await withBusy(async () => {
      const res = await fetch("/api/watch", { method: "POST" });
      const data = await res.json();
      setToast(`WATCH tick +${data.tickMinutes}m — ${data.alerts?.length ?? 0} reassess alerts`);
      await loadBoard();
    });
  }

  async function submitIntake() {
    await withBusy(async () => {
      const payload = {
        displayName: intake.displayName || "Walk-in Patient",
        ageYears: Number(intake.ageYears),
        sex: intake.sex,
        chiefComplaint: intake.chiefComplaint,
        observedCues: intake.observedCues
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        vitals: {
          heartRate: intake.heartRate ? Number(intake.heartRate) : null,
          spo2: intake.spo2 ? Number(intake.spo2) : null,
          temperatureC: intake.temperatureC ? Number(intake.temperatureC) : null,
          systolicBp: intake.systolicBp ? Number(intake.systolicBp) : null,
        },
        hasPriorRecord: intake.hasPriorRecord,
        arrivalMode: intake.arrivalMode,
        languageBarrier: intake.languageBarrier,
        underReportingSuspected: intake.underReportingSuspected,
        consentNoticeAcknowledged: true as const,
      };
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setToast("Intake failed — check required fields");
        return;
      }
      const data = await res.json();
      setToast(
        `DOOR scored ESI ${data.result.esi} @ ${(data.result.confidence * 100).toFixed(0)}% confidence`,
      );
      setShowIntake(false);
      setIntake(emptyIntake);
      await loadBoard();
      setSelectedId(data.encounter.id);
    });
  }

  async function submitOverride() {
    if (!selected) return;
    await withBusy(async () => {
      const res = await fetch("/api/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounterId: selected.encounterId,
          newEsi: Number(overrideForm.newEsi),
          reasonCode: overrideForm.reasonCode,
          note: overrideForm.note,
        }),
      });
      if (!res.ok) {
        setToast("Override failed — note required");
        return;
      }
      const data = await res.json();
      setToast(`Override logged: ESI ${data.previousEsi} → ${data.assessment.esi}`);
      setShowOverride(false);
      setOverrideForm({ newEsi: 3, reasonCode: "CLINICAL_JUDGMENT", note: "" });
      await loadBoard();
      await loadAudit();
      setShowAudit(true);
    });
  }

  async function openAudit() {
    await loadAudit();
    setShowAudit(true);
  }

  const alertIds = new Set(board?.watchAlerts.map((a) => a.encounterId) ?? []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>Acuity</h1>
          <span>
            PatientTriage.ai · ProjectVector · Nurse remains final authority · DPDP primary /
            HIPAA-aligned audit
          </span>
        </div>
        <div className="top-actions">
          <button className="btn" onClick={() => setShowIntake(true)} disabled={busy}>
            DOOR Intake
          </button>
          <button
            className={`btn btn-warn ${board?.surgeMode ? "surge-on" : ""}`}
            onClick={toggleSurge}
            disabled={busy}
          >
            {board?.surgeMode ? "Surge ON (3×)" : "Enable Surge"}
          </button>
          <button className="btn" onClick={tickWatch} disabled={busy}>
            WATCH Tick
          </button>
          <button className="btn" onClick={openAudit} disabled={busy}>
            Audit Trail
          </button>
          <button className="btn" onClick={() => loadBoard()} disabled={busy}>
            Refresh
          </button>
        </div>
      </header>

      {toast && (
        <div className="panel" style={{ marginBottom: "0.85rem", borderColor: "var(--accent)" }}>
          {toast}
          <button className="btn" style={{ marginLeft: "0.75rem" }} onClick={() => setToast(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <div className="label">Waiting</div>
          <div className="value">{board?.stats.waiting ?? "—"}</div>
        </div>
        <div className="stat">
          <div className="label">WATCH alerts</div>
          <div className="value">{board?.stats.alerts ?? "—"}</div>
        </div>
        <div className="stat">
          <div className="label">Hospital profile</div>
          <div className="value" style={{ fontSize: "0.95rem" }}>
            {board?.hospital?.profileType ?? "—"}
          </div>
        </div>
        <div className="stat">
          <div className="label">Surge</div>
          <div className="value">{board?.surgeMode ? "ACTIVE" : "off"}</div>
        </div>
      </div>

      <div className="layout">
        <section className="panel">
          <h2>FLOW — Live triage board (FIFO within ESI)</h2>
          <div className="queue">
            {board?.queue.map((item) => {
              const a = item.assessment;
              const overdue = alertIds.has(item.encounterId);
              return (
                <button
                  key={item.encounterId}
                  className={`card ${selectedId === item.encounterId ? "selected" : ""}`}
                  onClick={() => setSelectedId(item.encounterId)}
                  style={{ textAlign: "left", width: "100%" }}
                >
                  <div className={`badge ${a?.bucket ?? "BLUE"}`}>
                    ESI {a?.esi ?? "—"}
                    <div style={{ fontSize: "0.65rem", marginTop: 2 }}>{a?.bucket}</div>
                  </div>
                  <div>
                    <strong>
                      {item.displayName} · {item.ageYears}y
                    </strong>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      {item.chiefComplaint}
                    </div>
                    <div className="meta">
                      <span className="chip">{item.patientExternalId}</span>
                      <span className="chip">{a?.ageStratum}</span>
                      <span className="chip">{a?.recommendedRoute}</span>
                      <span className="chip">wait {item.waitingMinutes}m</span>
                      {!item.hasPriorRecord && <span className="chip hot">zero-history</span>}
                      {item.tags.slice(0, 3).map((t) => (
                        <span key={t} className="chip">
                          {t}
                        </span>
                      ))}
                      {a?.escalationBiasApplied && <span className="chip hot">escalation bias</span>}
                      {overdue && <span className="chip danger">WATCH reassess</span>}
                    </div>
                  </div>
                  <div className="confidence">
                    {a ? `${Math.round(a.confidence * 100)}%` : "—"}
                    <div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>confidence</div>
                  </div>
                </button>
              );
            })}
            {!board?.queue.length && <p style={{ color: "var(--text-muted)" }}>No waiting patients.</p>}
          </div>
        </section>

        <aside className="side-stack">
          <section className="panel">
            <h2>WATCH — Reassessment alerts</h2>
            <div className="alerts">
              {(board?.watchAlerts ?? []).map((al) => (
                <div key={al.encounterId + al.message} className={`alert ${al.severity}`}>
                  <strong>{al.reason}</strong>
                  <div>{al.message}</div>
                </div>
              ))}
              {!board?.watchAlerts?.length && (
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  No overdue reassessments. Use WATCH Tick to advance the sim clock.
                </p>
              )}
            </div>
          </section>

          <section className="panel detail">
            <h2>Recommendation detail</h2>
            {selected && selected.assessment ? (
              <>
                <h3>
                  {selected.displayName}{" "}
                  <span className={`badge ${selected.assessment.bucket}`}>
                    ESI {selected.assessment.esi}
                  </span>
                </h3>
                <p>{selected.assessment.summary}</p>
                <p>
                  Confidence{" "}
                  <strong style={{ color: "var(--accent)" }}>
                    {Math.round(selected.assessment.confidence * 100)}%
                  </strong>
                  {" · "}
                  Route <strong>{selected.assessment.recommendedRoute}</strong>
                  {" · "}
                  Reassess ≤ {selected.assessment.watchReassessMinutes}m
                  {" · "}
                  Source {selected.assessment.source}
                </p>
                {selected.demoNotes && <p>Demo note: {selected.demoNotes}</p>}
                <p style={{ marginTop: "0.6rem" }}>Uncertainty drivers</p>
                <ul className="factor-list">
                  {selected.assessment.uncertaintyDrivers.length === 0 && (
                    <li>None flagged — still always shows confidence.</li>
                  )}
                  {selected.assessment.uncertaintyDrivers.map((d) => (
                    <li key={d.code}>
                      <strong>{d.code}</strong> — {d.message} ({d.impact})
                    </li>
                  ))}
                </ul>
                <p style={{ marginTop: "0.6rem" }}>Explanation factors</p>
                <ul className="factor-list">
                  {selected.assessment.factors.map((f) => (
                    <li key={f.code}>
                      <strong>{f.label}</strong> [{f.contribution}] — {f.detail}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: "0.85rem", display: "flex", gap: "0.5rem" }}>
                  <button className="btn btn-danger" onClick={() => setShowOverride(true)}>
                    Clinician Override
                  </button>
                </div>
              </>
            ) : (
              <p>Select a patient from the board.</p>
            )}
          </section>
        </aside>
      </div>

      <p className="footnote">
        Synthetic data only · Never auto-downgrades · Missing vitals raise uncertainty and may escalate ·
        {board?.hospital?.name ?? "Acuity Demo ED"}
      </p>

      {showIntake && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>DOOR — Intake (0–90s)</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
              Consent notice: data used only for triage decision support (DPDP purpose limitation).
              Clinician access is logged.
            </p>
            <div className="form-grid">
              <label>
                Display name
                <input
                  value={intake.displayName}
                  onChange={(e) => setIntake({ ...intake, displayName: e.target.value })}
                />
              </label>
              <label>
                Age (years)
                <input
                  type="number"
                  value={intake.ageYears}
                  onChange={(e) => setIntake({ ...intake, ageYears: Number(e.target.value) })}
                />
              </label>
              <label className="full">
                Chief complaint
                <textarea
                  value={intake.chiefComplaint}
                  onChange={(e) => setIntake({ ...intake, chiefComplaint: e.target.value })}
                />
              </label>
              <label className="full">
                Observed cues (comma-separated)
                <input
                  value={intake.observedCues}
                  onChange={(e) => setIntake({ ...intake, observedCues: e.target.value })}
                />
              </label>
              <label>
                HR
                <input
                  value={intake.heartRate}
                  onChange={(e) => setIntake({ ...intake, heartRate: e.target.value })}
                />
              </label>
              <label>
                SpO₂
                <input
                  value={intake.spo2}
                  onChange={(e) => setIntake({ ...intake, spo2: e.target.value })}
                />
              </label>
              <label>
                Temp °C
                <input
                  value={intake.temperatureC}
                  onChange={(e) => setIntake({ ...intake, temperatureC: e.target.value })}
                />
              </label>
              <label>
                SBP
                <input
                  value={intake.systolicBp}
                  onChange={(e) => setIntake({ ...intake, systolicBp: e.target.value })}
                />
              </label>
              <label>
                Arrival
                <select
                  value={intake.arrivalMode}
                  onChange={(e) => setIntake({ ...intake, arrivalMode: e.target.value })}
                >
                  <option value="walk_in">Walk-in</option>
                  <option value="ambulance">Ambulance</option>
                  <option value="transfer">Transfer</option>
                </select>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={intake.hasPriorRecord}
                  onChange={(e) => setIntake({ ...intake, hasPriorRecord: e.target.checked })}
                />
                Prior record on file
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={intake.languageBarrier}
                  onChange={(e) => setIntake({ ...intake, languageBarrier: e.target.checked })}
                />
                Language barrier
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={intake.underReportingSuspected}
                  onChange={(e) =>
                    setIntake({ ...intake, underReportingSuspected: e.target.checked })
                  }
                />
                Suspect under-reporting
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowIntake(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submitIntake} disabled={busy}>
                Score now
              </button>
            </div>
          </div>
        </div>
      )}

      {showOverride && selected && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Clinician override</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
              Current ESI {selected.assessment?.esi}. Downgrades require an explicit override — the
              engine never auto-downgrades. Reason code + note are mandatory for the audit trail.
            </p>
            <div className="form-grid">
              <label>
                New ESI
                <select
                  value={overrideForm.newEsi}
                  onChange={(e) =>
                    setOverrideForm({ ...overrideForm, newEsi: Number(e.target.value) })
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Reason code
                <select
                  value={overrideForm.reasonCode}
                  onChange={(e) =>
                    setOverrideForm({ ...overrideForm, reasonCode: e.target.value })
                  }
                >
                  <option value="CLINICAL_JUDGMENT">Clinical judgment</option>
                  <option value="ADDITIONAL_HISTORY">Additional history</option>
                  <option value="VITALS_RECHECK">Vitals recheck</option>
                  <option value="RESOURCE_CONSTRAINT">Resource constraint</option>
                  <option value="PATIENT_DETERIORATION">Patient deterioration</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label className="full">
                Clinical note (required)
                <textarea
                  value={overrideForm.note}
                  onChange={(e) => setOverrideForm({ ...overrideForm, note: e.target.value })}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowOverride(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={submitOverride} disabled={busy}>
                Save override + audit
              </button>
            </div>
          </div>
        </div>
      )}

      {showAudit && (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: "min(720px, 100%)" }}>
            <h3>Append-only audit trail</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
              Purpose: TRIAGE_DECISION_SUPPORT · Jurisdiction: India DPDP Act 2023 (primary) with
              HIPAA-aligned access logging. Inputs stored as hashes where possible.
            </p>
            <div className="audit-list">
              {audit.map((e) => (
                <div key={e.id} className="audit-item">
                  <div>
                    <strong>{e.action}</strong> · {new Date(e.createdAt).toLocaleString()} ·{" "}
                    {e.clinicianId}
                  </div>
                  <div style={{ color: "var(--text-muted)" }}>
                    entity {e.entityId.slice(0, 10)}… · hash {e.inputHash ?? "—"}
                  </div>
                  <div style={{ color: "var(--text-muted)" }}>
                    {JSON.stringify(e.payload).slice(0, 180)}
                    {JSON.stringify(e.payload).length > 180 ? "…" : ""}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowAudit(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
