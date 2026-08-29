"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scoreTriage } from "@acuity/triage-engine";
import type { TriageResult } from "@acuity/shared";
import { AppShell } from "@/components/AppShell";
import { HowItWorks } from "@/components/HowItWorks";
import { Logo } from "@/components/Logo";
import {
  bucketToAcuityColor,
  formatToken,
  formatVitalsSummary,
  formatWaitClock,
  routeDisplay,
  type AcuityColor,
  type VitalsSnapshot,
} from "@/lib/display";
import {
  DOOR_COMPLAINTS,
  complaintLabel,
  doorT,
  type DoorComplaintId,
  type DoorLang,
} from "@/lib/door-i18n";
import { formatAuditDetails, formatAuditSummary } from "@/lib/audit-display";

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
  chiefComplaint: string;
  tags: string[];
  hasPriorRecord: boolean;
  demoNotes: string | null;
  waitingMinutes: number;
  languageBarrier: boolean;
  underReportingSuspected: boolean;
  vitals: VitalsSnapshot;
  assessment: Assessment | null;
};

type WatchAlert = {
  encounterId: string;
  reason: string;
  message: string;
  severity: "critical" | "high" | "moderate";
};

type Capacity = {
  resus: { used: number; total: number; label: string };
  acute: { used: number; total: number; label: string };
  fastTrack: { used: number; total: number; label: string };
};

type BoardResponse = {
  hospital: { name: string; profileType: string; visitsPerDay: number } | null;
  surgeMode: boolean;
  queue: QueueItem[];
  watchAlerts: WatchAlert[];
  capacity: Capacity;
  stats: { waiting: number; alerts: number };
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

function capacityPct(used: number, total: number) {
  return Math.min(100, Math.round((used / Math.max(total, 1)) * 100));
}

function capacityClass(pct: number) {
  if (pct >= 90) return "full";
  if (pct >= 70) return "warn";
  return "";
}

export default function HomePage() {
  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [showDoor, setShowDoor] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideEncounterId, setOverrideEncounterId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<"flow" | "watch" | "detail" | "guide">("flow");

  const flowRef = useRef<HTMLElement>(null);
  const watchRef = useRef<HTMLElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const focusPatient = useCallback((encounterId: string) => {
    setSelectedId(encounterId);
    setActiveNav("detail");
    window.requestAnimationFrame(() => {
      rowRefs.current.get(encounterId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 280);
    });
  }, []);

  function scrollToNav(id: "flow" | "watch" | "detail" | "guide") {
    setActiveNav(id);
    if (id === "guide") return;
    const ref = id === "flow" ? flowRef : id === "watch" ? watchRef : detailRef;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // DOOR intake state
  const [lang, setLang] = useState<DoorLang>("en");
  const [complaintId, setComplaintId] = useState<DoorComplaintId>("chest_pain");
  const [previewFlash, setPreviewFlash] = useState(false);
  const [customComplaint, setCustomComplaint] = useState("");
  const [patientName, setPatientName] = useState("");
  const [ageYears, setAgeYears] = useState(45);
  const [heartRate, setHeartRate] = useState("");
  const [systolicBp, setSystolicBp] = useState("");
  const [spo2, setSpo2] = useState("");
  const [temperatureC, setTemperatureC] = useState("");

  const [overrideForm, setOverrideForm] = useState({
    newEsi: 3,
    reasonCode: "CLINICAL_JUDGMENT",
    note: "",
  });
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);

  const selected = useMemo(
    () => board?.queue.find((q) => q.encounterId === selectedId) ?? null,
    [board, selectedId],
  );

  const visibleWatchAlerts = useMemo(() => {
    const alerts = board?.watchAlerts ?? [];
    return alerts.filter((a) => !dismissedAlerts.has(`${a.encounterId}:${a.reason}`));
  }, [board?.watchAlerts, dismissedAlerts]);

  const doorVitals = useMemo(
    (): VitalsSnapshot => ({
      heartRate: heartRate ? Number(heartRate) : null,
      systolicBp: systolicBp ? Number(systolicBp) : null,
      spo2: spo2 ? Number(spo2) : null,
      temperatureC: temperatureC ? Number(temperatureC) : null,
    }),
    [heartRate, systolicBp, spo2, temperatureC],
  );

  const doorVitalsSummary = formatVitalsSummary(doorVitals);

  const doorPreview: TriageResult | null = useMemo(() => {
    const opt = DOOR_COMPLAINTS.find((c) => c.id === complaintId);
    const complaint =
      complaintId === "other"
        ? customComplaint || "general complaint"
        : (opt?.complaint ?? "chest pain");
    return scoreTriage(
      {
        ageYears,
        chiefComplaint: complaint,
        hasPriorRecord: false,
        languageBarrier: lang !== "en",
        vitals: doorVitals,
      },
      { surgeMode: board?.surgeMode ?? false },
    );
  }, [
    complaintId,
    customComplaint,
    ageYears,
    doorVitals,
    lang,
    board?.surgeMode,
  ]);

  const previewColor = doorPreview
    ? bucketToAcuityColor(doorPreview.bucket)
    : ("AMBER" as AcuityColor);

  const doorStrings = doorT(lang);

  function selectComplaint(id: DoorComplaintId) {
    setComplaintId(id);
    setPreviewFlash(true);
  }

  useEffect(() => {
    if (!previewFlash) return;
    const t = setTimeout(() => setPreviewFlash(false), 600);
    return () => clearTimeout(t);
  }, [previewFlash, complaintId]);

  useEffect(() => {
    setPreviewFlash(true);
    const t = setTimeout(() => setPreviewFlash(false), 600);
    return () => clearTimeout(t);
  }, [lang]);

  useEffect(() => {
    if (!pendingFocusId) return;
    if (!board?.queue.some((q) => q.encounterId === pendingFocusId)) return;
    const id = pendingFocusId;
    setPendingFocusId(null);
    focusPatient(id);
  }, [board, pendingFocusId, focusPatient]);

  const loadBoard = useCallback(async (selectEncounterId?: string) => {
    const res = await fetch("/api/board", { cache: "no-store" });
    const data = (await res.json()) as BoardResponse;
    setBoard(data);
    if (selectEncounterId) {
      setSelectedId(selectEncounterId);
    } else {
      setSelectedId((prev) => prev ?? data.queue[0]?.encounterId ?? null);
    }
    return data;
  }, []);

  const loadAudit = useCallback(async () => {
    const res = await fetch("/api/audit?limit=80", { cache: "no-store" });
    const data = await res.json();
    setAudit(data.events ?? []);
  }, []);

  useEffect(() => {
    loadBoard().catch(console.error);
    const t = setInterval(() => loadBoard().catch(() => {}), 30000);
    return () => clearInterval(t);
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
      setToast(board.surgeMode ? "Surge off — baseline SLAs restored" : "Surge ON — 3× load, shorter WATCH SLAs");
      await loadBoard();
    });
  }

  async function tickWatch() {
    await withBusy(async () => {
      const res = await fetch("/api/watch", { method: "POST" });
      const data = await res.json();
      setToast(`WATCH +${data.tickMinutes}m — ${data.alerts?.length ?? 0} reassess alerts`);
      await loadBoard();
    });
  }

  async function submitDoor(openOverrideAfter = false) {
    const opt = DOOR_COMPLAINTS.find((c) => c.id === complaintId);
    const complaint =
      complaintId === "other"
        ? customComplaint || "general complaint"
        : (opt?.complaint ?? "chest pain");

    await withBusy(async () => {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: patientName.trim() || `Walk-in patient`,
          ageYears,
          sex: "U",
          chiefComplaint: complaint,
          observedCues: [],
          vitals: doorVitals,
          hasPriorRecord: false,
          arrivalMode: "walk_in",
          languageBarrier: lang !== "en",
          underReportingSuspected: false,
          consentNoticeAcknowledged: true,
        }),
      });
      if (!res.ok) {
        setToast("Intake failed — check fields");
        return;
      }
      const data = await res.json();
      const encounterId = data.encounter.id as string;
      await loadBoard(encounterId);
      setOverrideForm({
        newEsi: data.result.esi,
        reasonCode: "CLINICAL_JUDGMENT",
        note: "",
      });

      if (openOverrideAfter) {
        setShowDoor(false);
        setOverrideEncounterId(encounterId);
        setShowOverride(true);
        setToast(`Intake scored ESI ${data.result.esi} — adjust override if needed`);
        return;
      }

      setToast(`Accepted ${previewColor} — ESI ${data.result.esi} added to queue`);
      setShowDoor(false);
      setPatientName("");
      setHeartRate("");
      setSystolicBp("");
      setSpo2("");
      setTemperatureC("");
      setPendingFocusId(encounterId);
    });
  }

  async function submitOverride() {
    const encounterId =
      overrideEncounterId ?? selectedId ?? selected?.encounterId ?? null;
    if (!encounterId) {
      setToast("No patient selected for override");
      return;
    }

    await withBusy(async () => {
      const res = await fetch("/api/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounterId,
          newEsi: Number(overrideForm.newEsi),
          reasonCode: overrideForm.reasonCode,
          note: overrideForm.note,
        }),
      });
      if (!res.ok) {
        setToast("Override failed — note required (min 3 chars)");
        return;
      }
      const data = await res.json();
      setToast(`Override logged: ESI ${data.previousEsi} → ${data.assessment.esi}`);
      setShowOverride(false);
      setOverrideEncounterId(null);
      setOverrideForm({ newEsi: 3, reasonCode: "CLINICAL_JUDGMENT", note: "" });
      await loadBoard(encounterId);
      setPendingFocusId(encounterId);
      await loadAudit();
    });
  }

  function queueByEncounter(id: string) {
    return board?.queue.find((q) => q.encounterId === id);
  }

  const overrideTarget = useMemo(() => {
    const id = overrideEncounterId ?? selectedId;
    if (id) return board?.queue.find((q) => q.encounterId === id) ?? selected;
    return selected;
  }, [board, overrideEncounterId, selectedId, selected]);

  return (
    <AppShell
      hospitalName={board?.hospital?.name}
      surgeMode={board?.surgeMode}
      waiting={board?.stats.waiting}
      alerts={visibleWatchAlerts.length}
      activeNav={activeNav}
      onNav={scrollToNav}
      onDoor={() => setShowDoor(true)}
      onSurge={toggleSurge}
      onWatchTick={tickWatch}
      onAudit={() => {
        loadAudit();
        setShowAudit(true);
      }}
      onRefresh={() => loadBoard()}
      busy={busy}
      guideContent={<HowItWorks />}
      toast={
        toast ? (
          <div className="toast" style={{ margin: "0 24px 0" }}>
            {toast}
            <button className="btn btn-sm btn-ghost" onClick={() => setToast(null)}>
              Dismiss
            </button>
          </div>
        ) : null
      }
    >
      <section className="panel" ref={flowRef} id="flow">
        <div className="section-head">
          <h2>02 FLOW — waiting room board</h2>
          <span className="live">Live</span>
        </div>

        {board?.capacity && (
          <div className="capacity-row">
            {(["resus", "acute", "fastTrack"] as const).map((key) => {
              const c = board.capacity[key];
              const pct = capacityPct(c.used, c.total);
              return (
                <div key={key} className="capacity-card">
                  <div className="name">{c.label}</div>
                  <div className="count">
                    {c.used} / {c.total} open
                  </div>
                  <div className="capacity-bar">
                    <div
                      className={`capacity-bar-inner ${capacityClass(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flow-table-wrap">
          <table className="flow-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Acuity</th>
                <th>Patient</th>
                <th>Wait</th>
                <th>Route</th>
              </tr>
            </thead>
            <tbody>
              {board?.queue.map((item, idx) => {
                const a = item.assessment;
                const color = a ? bucketToAcuityColor(a.bucket) : "BLUE";
                const token = formatToken(item.patientExternalId);
                return (
                  <tr
                    key={item.encounterId}
                    ref={(el) => {
                      if (el) rowRefs.current.set(item.encounterId, el);
                      else rowRefs.current.delete(item.encounterId);
                    }}
                    className={selectedId === item.encounterId ? "selected" : ""}
                    onClick={() => focusPatient(item.encounterId)}
                  >
                    <td className="rank">{idx + 1}</td>
                    <td>
                      <span className={`acuity-pill ${color}`}>{color}</span>
                    </td>
                    <td>
                      <div className="patient-name">
                        {token} · {item.chiefComplaint.split(" ").slice(0, 4).join(" ")}
                      </div>
                      <div className="patient-complaint">
                        {item.displayName}, {item.ageYears}y
                        {!item.hasPriorRecord && " · No prior record"}
                        {a && ` · ${Math.round(a.confidence * 100)}% confidence`}
                      </div>
                    </td>
                    <td className="wait">{formatWaitClock(item.waitingMinutes)}</td>
                    <td className="route">
                      → {a ? routeDisplay(a.recommendedRoute) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!board?.queue.length && (
            <p style={{ color: "var(--text-muted)", padding: "16px 0" }}>No patients waiting.</p>
          )}
        </div>
      </section>

      {/* WATCH */}
      <section className="panel" ref={watchRef} id="watch">
        <div className="section-head">
          <h2>03 WATCH — deterioration feed</h2>
          <span className="live">Until seen</span>
        </div>
        <div className="watch-list">
          {visibleWatchAlerts.map((al) => {
            const patient = queueByEncounter(al.encounterId);
            const a = patient?.assessment;
            const color = a ? bucketToAcuityColor(a.bucket) : "RED";
            const token = patient ? formatToken(patient.patientExternalId) : "—";
            const slaLeft = a
              ? Math.max(0, a.watchReassessMinutes - (patient?.waitingMinutes ?? 0))
              : 0;
            const urgent = al.severity === "critical" || al.severity === "high";
            return (
              <div key={al.encounterId + al.message} className={`watch-item ${urgent ? "urgent" : ""}`}>
                <div className={`watch-timer ${color === "AMBER" ? "amber" : color === "GREEN" ? "green" : ""}`}>
                  {slaLeft > 0 ? `${slaLeft}m` : "!"}
                </div>
                <div>
                  <h4>
                    {token} · {patient?.chiefComplaint ?? "Patient"}
                  </h4>
                  <div className="sub">
                    Waiting {patient?.waitingMinutes ?? 0} min · {color}
                    {al.reason === "VITALS_WORSENING" ? " · Self-reported worsening" : ""}
                  </div>
                </div>
                <div className="watch-actions">
                  {urgent ? (
                    <>
                      <span className="watch-sla">{al.message.slice(0, 40)}</span>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          focusPatient(al.encounterId);
                          setShowOverride(true);
                        }}
                      >
                        Reassess now
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() =>
                          setDismissedAlerts((prev) => {
                            const next = new Set(prev);
                            next.add(`${al.encounterId}:${al.reason}`);
                            return next;
                          })
                        }
                      >
                        Dismiss
                      </button>
                    </>
                  ) : (
                    <span className="watch-sla">SLA check in {slaLeft} min</span>
                  )}
                </div>
              </div>
            );
          })}
          {!visibleWatchAlerts.length && (
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              No active deterioration alerts. Use WATCH tick to advance the simulation clock.
            </p>
          )}
        </div>
      </section>

      {/* Detail */}
      {selected?.assessment && (
        <section className="panel detail-panel" ref={detailRef} id="detail">
          <h3>
            {formatToken(selected.patientExternalId)} — clinical detail
          </h3>
          <p className="detail-intro">
            <strong>{selected.displayName}</strong> · {selected.ageYears}y · {selected.chiefComplaint}
            {selected.languageBarrier ? " · Language barrier noted" : ""}
          </p>

          <div className="detail-vitals-block">
            <div className="detail-vitals-label">Vitals at intake</div>
            <div className="detail-vitals-value">{formatVitalsSummary(selected.vitals)}</div>
          </div>

          <div className="detail-meta">
            <span className={`acuity-pill ${bucketToAcuityColor(selected.assessment.bucket)}`}>
              {bucketToAcuityColor(selected.assessment.bucket)}
            </span>
            <span className="meta-tag">ESI {selected.assessment.esi}</span>
            <span className="meta-tag">{selected.assessment.ageStratum}</span>
            <span className="meta-tag">{routeDisplay(selected.assessment.recommendedRoute)}</span>
            {selected.assessment.escalationBiasApplied && (
              <span className="meta-tag">Escalation bias applied</span>
            )}
            {selected.assessment.source === "OVERRIDE" && (
              <span className="meta-tag">Clinician override</span>
            )}
          </div>

          <div className="confidence-row">
            <div className="confidence-label">
              <span>Confidence</span>
              <span>{Math.round(selected.assessment.confidence * 100)}%</span>
            </div>
            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{ width: `${selected.assessment.confidence * 100}%` }}
              />
            </div>
            <div className="confidence-note">
              {selected.assessment.uncertaintyDrivers.length > 0
                ? selected.assessment.uncertaintyDrivers.map((d) => d.message).join(" · ")
                : "Complete intake data — confidence reflects available signals"}
            </div>
          </div>

          <ul className="explain-list">
            {selected.assessment.factors
              .filter((f) => !f.code.startsWith("AGE_"))
              .slice(0, 5)
              .map((f) => (
                <li key={f.code}>{f.detail}</li>
              ))}
          </ul>

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button className="btn btn-danger" onClick={() => setShowOverride(true)}>
              Override acuity
            </button>
          </div>
        </section>
      )}

      {/* DOOR */}
      {showDoor && doorPreview && (
        <div className="door-overlay">
          <div className="door-topbar">
            <Logo size={32} />
            <div style={{ flex: 1, marginLeft: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{doorStrings.doorTitle}</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {doorStrings.doorSubtitle}
              </div>
            </div>
            <button className="btn btn-ghost" onClick={() => setShowDoor(false)}>
              {doorStrings.close}
            </button>
          </div>
          <div className="door-container">
            <div className="door-card">
              <div className="lang-tabs">
                {(
                  [
                    ["en", "English"],
                    ["hi", "हिंदी"],
                  ] as const
                ).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    className={`lang-tab ${lang === code ? "active" : ""}`}
                    onClick={() => setLang(code)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="complaint-grid">
                {DOOR_COMPLAINTS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`complaint-card ${complaintId === c.id ? "selected" : ""}`}
                    onClick={() => selectComplaint(c.id)}
                    aria-pressed={complaintId === c.id}
                  >
                    <span className="icon">{c.icon}</span>
                    {c.label[lang]}
                  </button>
                ))}
              </div>

              {complaintId === "other" && (
                <input
                  placeholder={doorStrings.otherPlaceholder}
                  value={customComplaint}
                  onChange={(e) => setCustomComplaint(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    marginBottom: 20,
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
              )}

              <div className="door-layout">
                <div>
                  <div className="field-label">{doorStrings.vitalsLabel}</div>
                  <div className="vitals-grid">
                    <div className="vital-box">
                      <label>{doorStrings.hr}</label>
                      <input
                        placeholder="—"
                        value={heartRate}
                        onChange={(e) => setHeartRate(e.target.value)}
                      />
                      <div className="unit">{doorStrings.bpm}</div>
                    </div>
                    <div className="vital-box">
                      <label>{doorStrings.bp}</label>
                      <input
                        placeholder="—"
                        value={systolicBp}
                        onChange={(e) => setSystolicBp(e.target.value)}
                      />
                      <div className="unit">{doorStrings.mmHg}</div>
                    </div>
                    <div className="vital-box">
                      <label>{doorStrings.spo2}</label>
                      <input placeholder="—" value={spo2} onChange={(e) => setSpo2(e.target.value)} />
                      <div className="unit">%</div>
                    </div>
                    <div className="vital-box">
                      <label>{doorStrings.temp}</label>
                      <input
                        placeholder="—"
                        value={temperatureC}
                        onChange={(e) => setTemperatureC(e.target.value)}
                      />
                      <div className="unit">°C</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <div className="field-label">{doorStrings.nameLabel}</div>
                    <input
                      type="text"
                      placeholder={doorStrings.namePlaceholder}
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      style={{
                        width: "100%",
                        maxWidth: 320,
                        padding: "10px 12px",
                        marginBottom: 16,
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                    />
                    <div className="field-label">{doorStrings.ageLabel}</div>
                    <input
                      type="number"
                      value={ageYears}
                      onChange={(e) => setAgeYears(Number(e.target.value))}
                      style={{
                        width: 120,
                        padding: "10px 12px",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontFamily: "var(--mono)",
                      }}
                    />
                  </div>
                </div>

                <div className={`recommend-panel ${previewFlash ? "updated" : ""}`}>
                  <h3>{doorStrings.recommendation}</h3>

                  <div className="selected-complaint-chip">
                    <span className="selected-complaint-label">{doorStrings.selected}</span>
                    <strong>{complaintLabel(complaintId, lang)}</strong>
                  </div>

                  <div className="selected-complaint-chip">
                    <span className="selected-complaint-label">{doorStrings.vitalsAtIntake}</span>
                    <strong>
                      {doorVitalsSummary === "No vitals recorded"
                        ? doorStrings.vitalsNone
                        : doorVitalsSummary}
                    </strong>
                  </div>

                  {previewFlash && (
                    <div className="preview-updated-toast" role="status">
                      {doorStrings.updated}
                    </div>
                  )}

                  <div className="acuity-result">
                    <span className={`acuity-dot ${previewColor}`} />
                    <span className="label">
                      {doorStrings.esi} {doorPreview.esi} — {previewColor}
                    </span>
                  </div>

                  <div className="confidence-row">
                    <div className="confidence-label">
                      <span>{doorStrings.confidence}</span>
                      <span>{Math.round(doorPreview.confidence * 100)}%</span>
                    </div>
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{ width: `${doorPreview.confidence * 100}%` }}
                      />
                    </div>
                    <div className="confidence-note">
                      {doorPreview.uncertaintyDrivers.length > 0
                        ? doorStrings.confidenceSparse
                        : doorStrings.confidenceOk}
                    </div>
                  </div>

                  <ul className="explain-list">
                    {doorPreview.factors
                      .filter((f) => !f.code.startsWith("AGE_"))
                      .slice(0, 4)
                      .map((f) => (
                        <li key={f.code}>{f.detail}</li>
                      ))}
                  </ul>

                  <div className="door-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => submitDoor()}
                      disabled={busy}
                    >
                      {doorStrings.accept} — {previewColor}
                    </button>
                    <button
                      className="btn"
                      onClick={() => submitDoor(true)}
                      disabled={busy}
                    >
                      {doorStrings.override}
                    </button>
                  </div>
                </div>
              </div>

              <p className="consent-line">{doorStrings.consent}</p>
            </div>
          </div>
        </div>
      )}

      {showOverride && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Clinician override</h3>
            {overrideTarget ? (
              <div className="override-summary">
                <p>
                  <strong>Patient:</strong> {formatToken(overrideTarget.patientExternalId)} ·{" "}
                  {overrideTarget.displayName}
                </p>
                <p>
                  <strong>Complaint:</strong> {overrideTarget.chiefComplaint}
                </p>
                <p>
                  <strong>System recommendation:</strong> ESI {overrideTarget.assessment?.esi ?? "—"}{" "}
                  ({overrideTarget.assessment ? bucketToAcuityColor(overrideTarget.assessment.bucket) : "—"})
                </p>
                <p>
                  <strong>Override to:</strong> ESI {overrideForm.newEsi}
                </p>
              </div>
            ) : (
              <p>
                Current ESI {doorPreview?.esi}. The system never auto-downgrades — overrides require
                a reason and are audit-logged.
              </p>
            )}
            <p className="override-note">
              Downgrades are allowed only here. Reason and note are stored in the append-only audit
              trail.
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
                      ESI {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Reason
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
                  placeholder="Document clinical reasoning…"
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowOverride(false);
                  setOverrideEncounterId(null);
                }}
              >
                Cancel
              </button>
              <button className="btn btn-danger" onClick={submitOverride} disabled={busy}>
                Save override
              </button>
            </div>
          </div>
        </div>
      )}

      {showAudit && (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: "min(640px, 100%)" }}>
            <h3>Audit trail</h3>
            <p>
              Append-only log · India DPDP Act 2023 · Purpose: TRIAGE_DECISION_SUPPORT
            </p>
            <div className="audit-list">
              {audit.map((e) => {
                const expanded = expandedAuditId === e.id;
                const details = formatAuditDetails(e.action, e.payload);
                return (
                  <button
                    key={e.id}
                    type="button"
                    className={`audit-item ${expanded ? "expanded" : ""}`}
                    onClick={() => setExpandedAuditId(expanded ? null : e.id)}
                  >
                    <div className="audit-item-head">
                      <strong>{e.action}</strong>
                      <span>{new Date(e.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="audit-item-summary">
                      {formatAuditSummary(e.action, e.payload)}
                    </div>
                    {expanded && (
                      <ul className="audit-item-details">
                        {details.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                        <li>Clinician: {e.clinicianId ?? "system"}</li>
                        {e.inputHash && <li>Input hash: {e.inputHash}</li>}
                      </ul>
                    )}
                    <div className="audit-item-hint">{expanded ? "Hide details" : "Show full summary"}</div>
                  </button>
                );
              })}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowAudit(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
