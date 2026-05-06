// D:\inspection-react-full\src\pages\haccp and iso\Supplier Approval\SupplierSentLinks.jsx
// Tracker: sent links + WhatsApp share + bulk actions + group by supplier + expiry + activity log + browser notifications.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";

function normalizeApiRoot(raw) {
  let s = String(raw || "").trim();
  if (!s) return API_ROOT_DEFAULT;
  s = s.replace(/\/+$/, "");
  s = s.replace(/\/api\/reports.*$/i, "");
  s = s.replace(/\/api\/?$/i, "");
  return s || API_ROOT_DEFAULT;
}

const API_BASE = normalizeApiRoot(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
);

const TYPE = "supplier_self_assessment_form";
const POLL_MS = 30000; // poll every 30s for new submissions
const SEEN_SUBMITTED_KEY = "supplier_tracker_seen_submitted_v1";

const SUPPLIER_TYPE_LABEL = {
  food: "Food / Raw Materials",
  cleaning_chemicals: "Cleaning / Chemicals",
  packaging: "Packaging",
  services: "Services",
  other: "Other / Equipment",
};

/* ===== helpers ===== */
function fmtDateTime(s) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleString();
  } catch { return s; }
}

function fmtDate(s) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString();
  } catch { return s; }
}

function daysBetween(a, b) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.ceil(ms / 86400000);
}

function isSubmitted(rec) {
  const p = rec?.payload || {};
  if (p?.public?.submittedAt) return true;
  if (p?.meta?.submitted === true && !p?.public?.disabled) return true;
  const ans = p?.answers || {};
  if (typeof ans === "object" && Object.keys(ans).length > 0) {
    return Object.values(ans).some((v) => String(v || "").trim() !== "");
  }
  return false;
}

function isDisabled(rec) {
  return !!rec?.payload?.public?.disabled;
}

function isExpired(rec) {
  const exp = rec?.payload?.public?.expiresAt;
  if (!exp) return false;
  return new Date(exp).getTime() < Date.now();
}

function getSentAt(rec) {
  const p = rec?.payload || {};
  return p?.public?.sentAt || p?.public?.createdAt || rec?.created_at || "";
}

function getOpenedAt(rec) {
  return rec?.payload?.public?.openedAt || "";
}

/* ===== styles ===== */
const S = {
  shell: {
    minHeight: "100vh",
    padding: "20px 24px",
    background:
      "radial-gradient(circle at 12% 10%, rgba(34,211,238,0.18) 0, rgba(255,255,255,1) 46%, rgba(255,255,255,1) 100%)",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    color: "#071b2d",
  },
  layout: { width: "100%", margin: "0 auto" },
  topbar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px", borderRadius: 18, background: "rgba(255,255,255,0.84)",
    border: "1px solid rgba(15,23,42,0.18)", marginBottom: 14, flexWrap: "wrap", gap: 10,
  },
  title: { fontSize: 24, fontWeight: 980, margin: 0 },
  subtitle: { fontSize: 14, color: "#475569", marginTop: 4, fontWeight: 700 },
  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg,#06b6d4,#0891b2)", color: "#fff", border: "#0e7490" },
      secondary: { bg: "rgba(255,255,255,0.92)", color: "#071b2d", border: "rgba(15,23,42,0.16)" },
      copy:      { bg: "linear-gradient(180deg,#22c55e,#16a34a)", color: "#fff", border: "#15803d" },
      open:      { bg: "linear-gradient(180deg,#6366f1,#4f46e5)", color: "#fff", border: "#4338ca" },
      whats:     { bg: "linear-gradient(180deg,#22c55e,#15803d)", color: "#fff", border: "#166534" },
      warn:      { bg: "linear-gradient(180deg,#f59e0b,#d97706)", color: "#fff", border: "#b45309" },
      danger:    { bg: "linear-gradient(180deg,#ef4444,#dc2626)", color: "#fff", border: "#b91c1c" },
    };
    const c = map[kind] || map.secondary;
    return {
      background: c.bg, color: c.color, border: `1.5px solid ${c.border}`,
      padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13,
    };
  },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 14 },
  kpi: {
    background: "#fff", borderRadius: 14, padding: 16, border: "1px solid rgba(15,23,42,0.10)",
    boxShadow: "0 6px 18px rgba(2,132,199,0.08)",
  },
  kpiLabel: { fontSize: 12, fontWeight: 950, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" },
  kpiValue: { fontSize: 32, fontWeight: 980, marginTop: 6 },
  filters: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 },
  input: {
    padding: "8px 12px", border: "1.5px solid #cbd5e1", borderRadius: 10,
    fontSize: 14, fontWeight: 700, fontFamily: "inherit", minWidth: 220,
  },
  table: {
    width: "100%", borderCollapse: "collapse", fontSize: 13.5,
    background: "#fff", borderRadius: 14, overflow: "hidden",
    boxShadow: "0 8px 24px rgba(2,132,199,0.08)",
  },
  th: {
    padding: "12px 14px", background: "linear-gradient(180deg,#0891b2,#06b6d4)",
    color: "#fff", textAlign: "start", fontWeight: 900, fontSize: 12.5,
    textTransform: "uppercase", letterSpacing: "0.04em",
  },
  td: { padding: "10px 14px", borderTop: "1px solid #e2e8f0", fontWeight: 700, verticalAlign: "middle" },
  pill: (color, bg) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 999,
    fontSize: 11.5, fontWeight: 950, color, background: bg, border: `1px solid ${color}33`,
  }),
  empty: { textAlign: "center", padding: 50, color: "#64748b", fontWeight: 800, background: "#fff", borderRadius: 14 },
  copyBox: {
    fontSize: 11, color: "#475569", fontWeight: 700, background: "#f1f5f9",
    padding: "3px 8px", borderRadius: 6, fontFamily: "monospace",
  },
  bulkBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 14px", marginBottom: 10, borderRadius: 12,
    background: "#fef3c7", border: "1.5px solid #fde68a", gap: 10, flexWrap: "wrap",
  },
  groupHeader: {
    background: "linear-gradient(180deg,#e0f2fe,#bae6fd)",
    padding: "10px 14px", fontWeight: 950, color: "#0c4a6e", fontSize: 14,
    borderTop: "1px solid #e2e8f0",
  },
  activity: {
    fontSize: 11, color: "#64748b", fontWeight: 700, lineHeight: 1.5, marginTop: 4,
  },
};

export default function SupplierSentLinks() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("sent_desc"); // sent_desc | sent_asc | name_asc | name_desc | status
  const [copiedToken, setCopiedToken] = useState("");
  const [groupBy, setGroupBy] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const seenIdsRef = useRef(null);
  const pollRef = useRef(null);

  /* ===== Load seen-submitted IDs (for browser-notification dedupe) ===== */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_SUBMITTED_KEY);
      seenIdsRef.current = new Set(raw ? JSON.parse(raw) : []);
    } catch {
      seenIdsRef.current = new Set();
    }
  }, []);

  /* ===== Fetch ===== */
  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      const filtered = arr.filter((r) => r?.payload?.public?.token);
      filtered.sort((a, b) => new Date(getSentAt(b)).getTime() - new Date(getSentAt(a)).getTime());

      // Detect newly-submitted (not seen yet)
      if (silent && seenIdsRef.current) {
        filtered.forEach((r) => {
          const id = r.id || r._id;
          if (!id) return;
          if (isSubmitted(r) && !isDisabled(r) && !seenIdsRef.current.has(id)) {
            const name = r?.payload?.fields?.company_name || "Supplier";
            notifyBrowser(`✅ تم استلام رد من: ${name}`, "تم تقديم تقييم جديد");
            seenIdsRef.current.add(id);
          }
        });
        try { localStorage.setItem(SEEN_SUBMITTED_KEY, JSON.stringify([...seenIdsRef.current])); } catch {}
      } else if (seenIdsRef.current) {
        // First load — mark all currently submitted as seen
        filtered.forEach((r) => {
          const id = r.id || r._id;
          if (id && isSubmitted(r)) seenIdsRef.current.add(id);
        });
        try { localStorage.setItem(SEEN_SUBMITTED_KEY, JSON.stringify([...seenIdsRef.current])); } catch {}
      }

      setItems(filtered);
    } catch {
      if (!silent) setItems([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  /* ===== Polling for new submissions ===== */
  useEffect(() => {
    pollRef.current = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(pollRef.current);
  }, []);

  /* ===== Browser notifications ===== */
  function notifyBrowser(title, body) {
    try {
      if (typeof Notification === "undefined") return;
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      }
    } catch {}
  }

  async function requestNotifPermission() {
    try {
      if (typeof Notification === "undefined") {
        alert("المتصفح ما يدعم الإشعارات");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        notifyBrowser("✅ تم تفعيل الإشعارات", "رح تنبّهك عند وصول رد جديد من مورد");
      } else {
        alert("❌ لم يتم منح الإذن للإشعارات");
      }
    } catch {}
  }

  /* ===== KPIs ===== */
  const kpis = useMemo(() => {
    let submitted = 0, pending = 0, disabled = 0, expired = 0;
    items.forEach((r) => {
      if (isDisabled(r)) disabled++;
      else if (isSubmitted(r)) submitted++;
      else if (isExpired(r)) expired++;
      else pending++;
    });
    return { total: items.length, submitted, pending, disabled, expired };
  }, [items]);

  /* ===== Filtering + Sorting ===== */
  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    const out = items.filter((r) => {
      const p = r?.payload || {};
      const name = String(p?.fields?.company_name || "").toLowerCase();
      const email = String(p?.fields?.supplier_email || "").toLowerCase();
      const token = String(p?.public?.token || "").toLowerCase();
      const matchesQ = !q || name.includes(q) || email.includes(q) || token.includes(q);

      const submitted = isSubmitted(r);
      const disabled = isDisabled(r);
      const expired = isExpired(r);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "submitted" && submitted && !disabled) ||
        (statusFilter === "pending" && !submitted && !disabled && !expired) ||
        (statusFilter === "disabled" && disabled) ||
        (statusFilter === "expired" && expired && !submitted && !disabled);

      const t = String(p?.fields?.supplier_type || p?.public?.supplierType || "").toLowerCase();
      const matchesType = typeFilter === "all" || t === typeFilter;
      return matchesQ && matchesStatus && matchesType;
    });

    // statusOrder: submitted=1, pending=2, expired=3, disabled=4
    const statusOrder = (r) => {
      if (isDisabled(r)) return 4;
      if (isSubmitted(r)) return 1;
      if (isExpired(r)) return 3;
      return 2;
    };
    const nameOf = (r) => String(r?.payload?.fields?.company_name || "").toLowerCase();
    const sentMs = (r) => new Date(getSentAt(r)).getTime() || 0;

    out.sort((a, b) => {
      switch (sortBy) {
        case "sent_asc":  return sentMs(a) - sentMs(b);
        case "name_asc":  return nameOf(a).localeCompare(nameOf(b));
        case "name_desc": return nameOf(b).localeCompare(nameOf(a));
        case "status":    return statusOrder(a) - statusOrder(b) || sentMs(b) - sentMs(a);
        case "sent_desc":
        default:          return sentMs(b) - sentMs(a);
      }
    });
    return out;
  }, [items, search, statusFilter, typeFilter, sortBy]);

  /* ===== Group by supplier ===== */
  const grouped = useMemo(() => {
    if (!groupBy) return null;
    const map = new Map();
    filtered.forEach((r) => {
      const name = String(r?.payload?.fields?.company_name || "—").trim();
      const key = name.toLowerCase() || "—";
      if (!map.has(key)) map.set(key, { name, rows: [] });
      map.get(key).rows.push(r);
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered, groupBy]);

  /* ===== Selection ===== */
  function toggleSel(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((r) => r.id || r._id).filter(Boolean)));
  }
  function clearSel() { setSelected(new Set()); }

  /* ===== Actions ===== */
  async function copyLink(url, token) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(""), 1500);
        return;
      }
    } catch {}
    try { window.prompt("Copy link:", url); } catch {}
  }

  function shareWhatsApp(rec) {
    const p = rec?.payload || {};
    const name = p?.fields?.company_name || "";
    const url = p?.public?.url || "";
    if (!url) return;
    const text =
      `مرحباً ${name ? "شركة " + name : ""}،\n\n` +
      `يرجى تعبئة نموذج تقييم المورد عبر الرابط التالي:\n${url}\n\n` +
      `Al Mawashi — Quality & Food Safety`;
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(wa, "_blank", "noopener,noreferrer");
  }

  async function putRecord(rec, payloadPatch) {
    const id = rec?.id || rec?._id;
    if (!id) throw new Error("Missing ID");
    const newPayload = {
      ...(rec?.payload || {}),
      ...payloadPatch,
      public: { ...(rec?.payload?.public || {}), ...(payloadPatch?.public || {}) },
      meta: { ...(rec?.payload?.meta || {}), ...(payloadPatch?.meta || {}) },
    };
    const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reporter: rec?.reporter || "admin",
        type: TYPE,
        payload: newPayload,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  async function revokeLink(rec) {
    const name = rec?.payload?.fields?.company_name || "—";
    if (!window.confirm(`تعطيل الرابط للمورد "${name}"؟\n\nبعد التعطيل، الرابط ما رح يقدر المورد يفتحه أو يرسل ثاني.`)) return;
    try {
      await putRecord(rec, {
        public: { disabled: true, disabledAt: new Date().toISOString() },
        meta: { submitted: true, disabledByAdmin: true },
      });
      load();
    } catch (e) {
      alert("❌ فشل تعطيل الرابط: " + (e?.message || e));
    }
  }

  async function deleteRecord(rec) {
    const name = rec?.payload?.fields?.company_name || "—";
    if (!window.confirm(`حذف سجل المورد "${name}" نهائياً؟\n\nهاد الإجراء ما يمكن التراجع عنه.`)) return;
    const id = rec?.id || rec?._id;
    if (!id) { alert("⚠️ المعرّف ناقص"); return; }
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      load();
    } catch (e) {
      alert("❌ فشل الحذف: " + (e?.message || e));
    }
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`حذف ${selected.size} سجل نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    setBulkBusy(true);
    let ok = 0, fail = 0;
    for (const id of selected) {
      try {
        const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (res.ok) ok++; else fail++;
      } catch { fail++; }
    }
    setBulkBusy(false);
    clearSel();
    alert(`✅ حُذف: ${ok}${fail ? ` | ❌ فشل: ${fail}` : ""}`);
    load();
  }

  async function bulkRevoke() {
    if (selected.size === 0) return;
    if (!window.confirm(`تعطيل ${selected.size} رابط؟ ما رح يقدر المورّدين يفتحوها بعد ذلك.`)) return;
    setBulkBusy(true);
    let ok = 0, fail = 0;
    const targets = items.filter((r) => selected.has(r.id || r._id));
    for (const rec of targets) {
      try {
        await putRecord(rec, {
          public: { disabled: true, disabledAt: new Date().toISOString() },
          meta: { submitted: true, disabledByAdmin: true },
        });
        ok++;
      } catch { fail++; }
    }
    setBulkBusy(false);
    clearSel();
    alert(`✅ عُطّل: ${ok}${fail ? ` | ❌ فشل: ${fail}` : ""}`);
    load();
  }

  /* ===== Row render ===== */
  function renderRow(rec, i) {
    const p = rec?.payload || {};
    const id = rec?.id || rec?._id;
    const submitted = isSubmitted(rec);
    const disabled = isDisabled(rec);
    const expired = isExpired(rec);
    const token = p?.public?.token || "";
    const url = p?.public?.url || "";
    const sentAt = getSentAt(rec);
    const openedAt = getOpenedAt(rec);
    const submittedAt = p?.public?.submittedAt || (submitted ? p?.recordDate : "");
    const disabledAt = p?.public?.disabledAt || "";
    const expiresAt = p?.public?.expiresAt || "";
    const supplierType = p?.fields?.supplier_type || p?.public?.supplierType || "";
    const isSel = selected.has(id);

    let statusPill;
    if (disabled) statusPill = <span style={S.pill("#475569", "#f1f5f9")}>🚫 معطّل</span>;
    else if (submitted) statusPill = <span style={S.pill("#15803d", "#dcfce7")}>✅ تم الرد</span>;
    else if (expired) statusPill = <span style={S.pill("#b91c1c", "#fee2e2")}>⏰ منتهي</span>;
    else statusPill = <span style={S.pill("#a16207", "#fef3c7")}>⏳ معلّقة</span>;

    const daysLeft = expiresAt ? daysBetween(new Date(), expiresAt) : null;

    return (
      <tr key={id || i} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
        <td style={{ ...S.td, width: 36, textAlign: "center" }}>
          <input
            type="checkbox"
            checked={isSel}
            onChange={() => id && toggleSel(id)}
            style={{ width: 16, height: 16, cursor: "pointer" }}
            disabled={!id}
          />
        </td>
        <td style={S.td}>
          <div style={{ fontWeight: 950, color: "#0f172a" }}>{p?.fields?.company_name || "—"}</div>
          {token && (
            <div style={{ ...S.copyBox, marginTop: 4, display: "inline-block" }}>
              {token.slice(0, 12)}...
            </div>
          )}
          {/* Activity log mini-timeline */}
          <div style={S.activity}>
            <div>📤 أُرسل: {fmtDateTime(sentAt)}</div>
            {openedAt && <div>👁 فُتح: {fmtDateTime(openedAt)}</div>}
            {submittedAt && <div>✅ رد: {fmtDateTime(submittedAt)}</div>}
            {disabledAt && <div>🚫 عُطّل: {fmtDateTime(disabledAt)}</div>}
          </div>
        </td>
        <td style={S.td}>
          <span style={S.pill("#0369a1", "#e0f2fe")}>
            {SUPPLIER_TYPE_LABEL[supplierType] || supplierType || "—"}
          </span>
        </td>
        <td style={S.td}>{p?.fields?.supplier_email || "—"}</td>
        <td style={S.td}>
          {expiresAt ? (
            <div>
              <div>{fmtDate(expiresAt)}</div>
              {!disabled && !submitted && (
                <div style={{ fontSize: 11, fontWeight: 800, color: daysLeft < 0 ? "#dc2626" : daysLeft <= 7 ? "#d97706" : "#16a34a", marginTop: 2 }}>
                  {daysLeft < 0 ? `منتهي منذ ${Math.abs(daysLeft)} يوم` : daysLeft === 0 ? "ينتهي اليوم" : `${daysLeft} يوم متبقي`}
                </div>
              )}
            </div>
          ) : "—"}
        </td>
        <td style={S.td}>{statusPill}</td>
        <td style={S.td}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {url && !disabled && !expired && (
              <>
                <button style={S.btn("copy")} onClick={() => copyLink(url, token)} title={url}>
                  {copiedToken === token ? "✓ نُسخ" : "📋 نسخ"}
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...S.btn("open"), textDecoration: "none", display: "inline-block" }}
                >
                  🔗 فتح
                </a>
                <button
                  style={S.btn("whats")}
                  onClick={() => shareWhatsApp(rec)}
                  title="مشاركة عبر واتساب"
                >
                  💬 واتساب
                </button>
              </>
            )}
            {submitted && !disabled && (
              <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/supplier-evaluation/results")}>
                👁 الردود
              </button>
            )}
            {!disabled && (
              <button
                style={S.btn("warn")}
                onClick={() => revokeLink(rec)}
                title="تعطيل الرابط"
              >
                🚫 تعطيل
              </button>
            )}
            <button style={S.btn("danger")} onClick={() => deleteRecord(rec)} title="حذف السجل">
              🗑️ حذف
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <main style={S.shell}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <h1 style={S.title}>📨 Sent Links Tracker</h1>
            <div style={S.subtitle}>تتبع الروابط — مُرسلة، تم الرد، معلّقة، معطّلة، منتهية</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={S.btn("secondary")} onClick={requestNotifPermission} title="تفعيل تنبيهات المتصفح">
              🔔 تفعيل التنبيهات
            </button>
            <button
              style={S.btn(groupBy ? "primary" : "secondary")}
              onClick={() => setGroupBy(!groupBy)}
            >
              {groupBy ? "📃 سرد" : "📂 تجميع بالمورد"}
            </button>
            <button style={S.btn("secondary")} onClick={() => load()} disabled={loading}>
              {loading ? "⏳" : "↻ Refresh"}
            </button>
            <button style={S.btn("primary")} onClick={() => navigate("/haccp-iso/supplier-evaluation/create")}>
              + إنشاء رابط جديد
            </button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/supplier-evaluation")}>
              ↩ Back to Hub
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div style={S.kpiRow}>
          <div style={{ ...S.kpi, cursor: "pointer", borderColor: statusFilter === "all" ? "#06b6d4" : undefined, borderWidth: statusFilter === "all" ? 2 : 1 }}
               onClick={() => setStatusFilter("all")}>
            <div style={S.kpiLabel}>إجمالي المُرسلة</div>
            <div style={{ ...S.kpiValue, color: "#0369a1" }}>{kpis.total}</div>
          </div>
          <div style={{ ...S.kpi, cursor: "pointer", borderColor: statusFilter === "submitted" ? "#16a34a" : undefined, borderWidth: statusFilter === "submitted" ? 2 : 1 }}
               onClick={() => setStatusFilter(statusFilter === "submitted" ? "all" : "submitted")}>
            <div style={S.kpiLabel}>✅ تم الرد</div>
            <div style={{ ...S.kpiValue, color: "#16a34a" }}>{kpis.submitted}</div>
          </div>
          <div style={{ ...S.kpi, cursor: "pointer", borderColor: statusFilter === "pending" ? "#d97706" : undefined, borderWidth: statusFilter === "pending" ? 2 : 1 }}
               onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}>
            <div style={S.kpiLabel}>⏳ معلّقة</div>
            <div style={{ ...S.kpiValue, color: "#d97706" }}>{kpis.pending}</div>
          </div>
          <div style={{ ...S.kpi, cursor: "pointer", borderColor: statusFilter === "expired" ? "#b91c1c" : undefined, borderWidth: statusFilter === "expired" ? 2 : 1 }}
               onClick={() => setStatusFilter(statusFilter === "expired" ? "all" : "expired")}>
            <div style={S.kpiLabel}>⏰ منتهية</div>
            <div style={{ ...S.kpiValue, color: "#b91c1c" }}>{kpis.expired}</div>
          </div>
          <div style={{ ...S.kpi, cursor: "pointer", borderColor: statusFilter === "disabled" ? "#475569" : undefined, borderWidth: statusFilter === "disabled" ? 2 : 1 }}
               onClick={() => setStatusFilter(statusFilter === "disabled" ? "all" : "disabled")}>
            <div style={S.kpiLabel}>🚫 معطّلة</div>
            <div style={{ ...S.kpiValue, color: "#475569" }}>{kpis.disabled}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={S.filters}>
          <input
            style={S.input}
            placeholder="🔍 ابحث باسم المورد / الإيميل / الـ token..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            style={S.input}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            title="فرز حسب الحالة"
          >
            <option value="all">📋 كل الحالات</option>
            <option value="submitted">✅ تم الرد</option>
            <option value="pending">⏳ معلّقة (لم يرد بعد)</option>
            <option value="expired">⏰ منتهية</option>
            <option value="disabled">🚫 معطّلة</option>
          </select>
          <select style={S.input} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">🏷️ كل الأنواع</option>
            {Object.entries(SUPPLIER_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            style={S.input}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            title="ترتيب القائمة"
          >
            <option value="sent_desc">🆕 الأحدث إرسالاً</option>
            <option value="sent_asc">📅 الأقدم إرسالاً</option>
            <option value="status">🎯 حسب الحالة (تم الرد أولاً)</option>
            <option value="name_asc">🔤 الاسم (أ → ي)</option>
            <option value="name_desc">🔤 الاسم (ي → أ)</option>
          </select>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div style={S.bulkBar}>
            <div style={{ fontWeight: 900, color: "#92400e" }}>
              ✓ مُحدد: {selected.size}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={S.btn("warn")} onClick={bulkRevoke} disabled={bulkBusy}>
                🚫 تعطيل المحدد
              </button>
              <button style={S.btn("danger")} onClick={bulkDelete} disabled={bulkBusy}>
                🗑️ حذف المحدد
              </button>
              <button style={S.btn("secondary")} onClick={clearSel} disabled={bulkBusy}>
                ✖ إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {loading && <div style={S.empty}>⏳ جاري التحميل...</div>}
        {!loading && filtered.length === 0 && (
          <div style={S.empty}>
            {items.length === 0 ? "لا يوجد روابط مُرسلة بعد." : "لا توجد نتائج مطابقة للفلتر."}
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: 36, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selected.size > 0 && selected.size === filtered.length}
                      onChange={(e) => e.target.checked ? selectAll() : clearSel()}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                  </th>
                  <th style={S.th}>المورد + سجل النشاط</th>
                  <th style={S.th}>النوع</th>
                  <th style={S.th}>الإيميل</th>
                  <th style={S.th}>تاريخ الانتهاء</th>
                  <th style={S.th}>الحالة</th>
                  <th style={S.th}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {!groupBy && filtered.map((rec, i) => renderRow(rec, i))}
                {groupBy && grouped && grouped.map((g, gi) => (
                  <React.Fragment key={`g-${gi}`}>
                    <tr>
                      <td colSpan={7} style={S.groupHeader}>
                        🏢 {g.name} <span style={{ color: "#0369a1", fontWeight: 700 }}>({g.rows.length})</span>
                      </td>
                    </tr>
                    {g.rows.map((rec, i) => renderRow(rec, gi * 1000 + i))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Email reminder note */}
        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#eff6ff", border: "1px dashed #93c5fd", fontSize: 12, color: "#1e40af", fontWeight: 700 }}>
          💌 <b>تذكيرات الإيميل التلقائية</b> تحتاج إعداد على السيرفر (SMTP). أخبرني إذا تريد أعدّ نقطة API على السيرفر.
        </div>
      </div>
    </main>
  );
}
