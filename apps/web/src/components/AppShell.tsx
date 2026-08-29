"use client";

import { useState, type ReactNode } from "react";
import { Logo } from "./Logo";

export type NavId = "flow" | "watch" | "detail" | "guide";

type AppShellProps = {
  children: ReactNode;
  hospitalName?: string;
  surgeMode?: boolean;
  waiting?: number;
  alerts?: number;
  activeNav?: NavId;
  onNav?: (id: NavId) => void;
  onDoor: () => void;
  onSurge: () => void;
  onWatchTick: () => void;
  onAudit: () => void;
  onRefresh?: () => void;
  busy?: boolean;
  toast?: ReactNode;
  guideContent?: ReactNode;
};

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AppShell({
  children,
  hospitalName = "Acuity Demo ED",
  surgeMode = false,
  waiting = 0,
  alerts = 0,
  activeNav = "flow",
  onNav,
  onDoor,
  onSurge,
  onWatchTick,
  onAudit,
  onRefresh,
  busy = false,
  toast,
  guideContent,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  const nav = [
    { id: "flow" as const, label: "FLOW Board", icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
    { id: "watch" as const, label: "WATCH Feed", icon: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 100-6 3 3 0 000 6z" },
    { id: "detail" as const, label: "Patient Detail", icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z" },
    { id: "guide" as const, label: "How it works", icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 16v-4 M12 8h.01" },
  ];

  return (
    <div className={`app-frame ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-brand">
          <Logo size={collapsed ? 36 : 40} showWordmark={!collapsed} />
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <NavIcon d={collapsed ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6"} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-link ${activeNav === item.id ? "active" : ""}`}
              onClick={() => onNav?.(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <NavIcon d={item.icon} />
              {!collapsed && (
                <>
                  {item.label}
                  {item.id === "watch" && alerts > 0 && (
                    <span className="sidebar-badge">{alerts}</span>
                  )}
                </>
              )}
              {collapsed && item.id === "watch" && alerts > 0 && (
                <span className="sidebar-badge-dot" />
              )}
            </button>
          ))}
          <div className="sidebar-divider" />
          <button
            type="button"
            className="sidebar-link accent"
            onClick={onDoor}
            disabled={busy}
            title={collapsed ? "DOOR Intake" : undefined}
          >
            <NavIcon d="M12 5v14M5 12h14" />
            {!collapsed && "DOOR Intake"}
          </button>
          <button
            type="button"
            className="sidebar-link"
            onClick={onAudit}
            disabled={busy}
            title={collapsed ? "Audit Trail" : undefined}
          >
            <NavIcon d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8M16 17H8M10 9H8" />
            {!collapsed && "Audit Trail"}
          </button>
        </nav>

        {!collapsed && (
          <div className="sidebar-footer">
            <div className="sidebar-ed">
              <span className="sidebar-ed-label">Facility</span>
              <span className="sidebar-ed-name">{hospitalName}</span>
            </div>
            <div className="sidebar-powered">
              <span>by</span>
              <strong>ProjectVector</strong>
              <span className="sidebar-iit">IIT Jodhpur</span>
            </div>
          </div>
        )}
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="topbar-title">
              {activeNav === "guide" ? "How Acuity works" : "Emergency Department Console"}
            </h1>
            {activeNav !== "guide" && (
              <div className="topbar-meta">
                <span className={`status-pill ${surgeMode ? "surge" : "normal"}`}>
                  <span className="status-dot" />
                  {surgeMode ? "Surge mode active" : "Normal operations"}
                </span>
                <span className="topbar-stat">{waiting} waiting</span>
                <span className="topbar-stat">{alerts} WATCH alerts</span>
              </div>
            )}
          </div>
          <div className="topbar-right">
            {activeNav !== "guide" && (
              <>
                <button type="button" className="btn btn-sm" onClick={onWatchTick} disabled={busy}>
                  WATCH tick
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${surgeMode ? "surge-active" : ""}`}
                  onClick={onSurge}
                  disabled={busy}
                >
                  {surgeMode ? "End surge" : "Surge mode"}
                </button>
                {onRefresh && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={onRefresh}
                    disabled={busy}
                  >
                    Refresh
                  </button>
                )}
              </>
            )}
            <div className="user-chip">
              <div className="user-avatar">RN</div>
              <div className="user-chip-text">
                <div className="user-name">Triage Nurse</div>
                <div className="user-role">TRIAGE_NURSE</div>
              </div>
            </div>
          </div>
        </header>

        {toast}

        <main className="main-content">
          {activeNav === "guide" && guideContent ? guideContent : children}
        </main>

        <footer className="app-footer">
          <div className="app-footer-left">
            <Logo size={24} showWordmark={false} />
            <span>Acuity v1.0 · Decision support only · DPDP Act 2023</span>
          </div>
          <div className="app-footer-right">
            <span className="footer-badge">Synthetic demo data</span>
            <span>© 2026 ProjectVector</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
