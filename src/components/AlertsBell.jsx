// src/components/AlertsBell.jsx
//
// 🔔 The alerts bell — round button in the bottom-left column (above "ع/EN",
// "Aa" and day/night), on every signed-in page. Red badge = open alerts the
// account may see; a click shows the newest, "All alerts" opens /alerts.
//
// Refresh: on load, on window focus, after an ack anywhere (ALERTS_EVENT),
// and every 10 minutes while the tab is visible — never faster: the server's
// database sleeps when nobody asks, and a short poll would keep it awake
// all day (the Aug 2026 Neon bill).

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser } from "../utils/perms";
import { getAppLang, onAppLang, isUnifiedLang } from "../utils/appLang";
import { fetchAlerts, ackAlert, alertVisible, ALERTS_EVENT, SEVERITY } from "../utils/alertsApi";

const PUBLIC_PAGES = ["/", "/demo", "/readiness", "/subscription-expired"];
const PUBLIC_PREFIXES = [
  "/ref/", "/t/", "/training/quiz/", "/training/verify", "/sweets-training/",
  "/supplier-approval/", "/supplier-evaluation/", "/inspection/evidence/", "/menu-nutrition",
];
const REFRESH_MS = 10 * 60_000;

// globals.css forces `#root *` font sizes with !important — doubled classes out-rank it.
const CSS = `
.abl { position: fixed; left: 14px; z-index: 9990; width: 40px; height: 40px; padding: 0;
  border-radius: 50%; border: 1px solid rgba(15,23,42,.15); background: #fff; color: #1e3a5f;
  box-shadow: 0 4px 14px rgba(15,23,42,.22); cursor: pointer; display: grid; place-items: center;
  opacity: .92; transition: transform .15s; }
.abl:hover { transform: scale(1.06); }
.abl.on { background: #fff1f2; border-color: #fecaca; }
#root .abl.abl { font-size: 19px !important; line-height: 1; }
#root .abl-badge.abl-badge { position: absolute; top: -5px; right: -6px; min-width: 19px; height: 19px; padding: 0 5px;
  border-radius: 999px; background: #dc2626; color: #fff; font-size: 11px !important; font-weight: 800;
  display: grid; place-items: center; box-shadow: 0 0 0 2px #fff; }
.abl-panel { position: fixed; left: 14px; z-index: 9991; width: 360px; max-width: calc(100vw - 28px);
  max-height: min(70vh, 520px); overflow: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
  box-shadow: 0 18px 44px rgba(15,23,42,.22); padding: 12px; font-family: inherit; }
#root .abl-panel.abl-panel, #root .abl-panel.abl-panel * { font-size: 14px !important; }
#root .abl-panel .abl-h.abl-h { font-size: 16px !important; font-weight: 900; color: #0f172a; }
#root .abl-panel .abl-s.abl-s { font-size: 12.5px !important; color: #64748b; }
.abl-item { border: 1px solid #e2e8f0; border-radius: 12px; padding: 9px 10px; margin-top: 8px; }
.abl-btn { border: 1px solid #cbd5e1; background: #fff; border-radius: 9px; padding: 4px 10px; cursor: pointer; font-weight: 800; color: #1e3a5f; font-family: inherit; }
.abl-pri { border: 0; background: linear-gradient(135deg,#2563eb,#4f46e5); color: #fff; }
@media print { .abl, .abl-panel { display: none !important; } }
`;

export default function AlertsBell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [lang, setLang] = useState(getAppLang);
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(0);
  const lastLoad = useRef(0);

  const signedIn = !!(getCurrentUser() || {}).loginAt;
  const hidden = PUBLIC_PAGES.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === "/alerts";

  const load = useCallback(async () => {
    if (document.hidden || !(getCurrentUser() || {}).loginAt) return;
    lastLoad.current = Date.now();
    try {
      setList((await fetchAlerts("open", 100)).filter(alertVisible));
    } catch {
      /* the bell stays as it was; the Alerts page shows read errors */
    }
  }, []);

  useEffect(() => onAppLang(setLang), []);
  useEffect(() => {
    if (!signedIn) return undefined;
    load();
    const id = setInterval(load, REFRESH_MS);
    const onFocus = () => { if (Date.now() - lastLoad.current > 60_000) load(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener(ALERTS_EVENT, load);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); window.removeEventListener(ALERTS_EVENT, load); };
  }, [signedIn, load]);
  useEffect(() => { setOpen(false); }, [pathname]);

  if (!signedIn || hidden) return null;

  const ar = lang === "ar";
  const L = (en, a) => (ar ? a : en);
  // one 48 px step above the language button (only Al Mawashi has it)
  const bottom = isUnifiedLang() ? 158 : 110;
  const n = list.length;
  const critical = list.some((a) => a.severity === "critical");

  const ack = async (a) => {
    setBusy(a.id);
    try { await ackAlert(a.id); } catch { /* list reloads anyway */ } finally { setBusy(0); }
  };

  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        className={`abl abl${n ? " on" : ""}`}
        style={{ bottom }}
        onClick={() => { setOpen((v) => !v); if (!open) load(); }}
        aria-label={L(`Alerts (${n} open)`, `التنبيهات (${n} مفتوحة)`)}
        title={L("Alerts", "التنبيهات")}
      >
        {critical ? "🚨" : "🔔"}
        {n > 0 && <span className="abl-badge abl-badge">{n > 99 ? "99+" : n}</span>}
      </button>
      {open && (
        <div className="abl-panel abl-panel" style={{ bottom: bottom + 50 }} dir={ar ? "rtl" : "ltr"}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span className="abl-h abl-h">🔔 {L("Alerts", "التنبيهات")}</span>
            <button type="button" className="abl-btn abl-pri" onClick={() => navigate("/alerts")}>{L("All alerts", "كل التنبيهات")}</button>
          </div>
          {n === 0 && <div className="abl-s abl-s" style={{ marginTop: 10 }}>{L("Nothing open — all clear.", "لا يوجد تنبيه مفتوح — كل شيء تمام.")}</div>}
          {list.slice(0, 8).map((a) => {
            const sv = SEVERITY[a.severity] || SEVERITY.warning;
            return (
              <div key={a.id} className="abl-item" style={{ background: sv.bg, borderColor: sv.border }}>
                <div style={{ fontWeight: 800, color: sv.color }} dir="auto">{sv.icon} {a.title}</div>
                <div className="abl-s abl-s" style={{ marginTop: 3 }}>
                  {a.branch ? `${a.branch} · ` : ""}{new Date(a.created_at).toLocaleString(ar ? "ar-AE" : "en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button type="button" className="abl-btn" disabled={busy === a.id} onClick={() => ack(a)}>✓ {L("Seen", "تم الاطلاع")}</button>
                  {a.link && <button type="button" className="abl-btn" onClick={() => navigate(a.link)}>{L("Open", "فتح")}</button>}
                </div>
              </div>
            );
          })}
          {n > 8 && <div className="abl-s abl-s" style={{ marginTop: 8 }}>{L(`+${n - 8} more`, `+${n - 8} أخرى`)}</div>}
        </div>
      )}
    </>
  );
}
