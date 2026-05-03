// src/pages/haccp and iso/CCPMonitoring/CCPKPIWidget.jsx
// ويدجت مدمجة لعرض ملخص CCP (للاستخدام في AdminDashboard / ExpiryCenter)

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";

const TYPE = "ccp_monitoring_record";

export default function CCPKPIWidget({ compact = false }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((json) => {
        if (cancelled) return;
        const arr = Array.isArray(json) ? json : json?.data || [];
        setItems(arr);
      })
      .catch((e) => !cancelled && setErr(String(e?.message || e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let total = 0, compliant = 0, deviation = 0, pending = 0;
    let monthTotal = 0, monthCompliant = 0, monthDeviation = 0;
    let recentDeviations = [];
    for (const it of items) {
      const p = it?.payload || {};
      const w = p?.autoEval?.withinLimit;
      total++;
      if (w === true) compliant++;
      else if (w === false) {
        deviation++;
        recentDeviations.push({
          id: it.id || it._id,
          date: p.reportDate,
          ccp: p.ccpSnapshot?.nameAr || p.ccpSnapshot?.nameEn || p.ccpId,
          reading: p.reading?.value,
          unit: p.ccpSnapshot?.criticalLimit?.unit || "",
          product: p.product?.name,
        });
      } else pending++;
      // شهر حالي
      if ((p.reportDate || "").startsWith(thisMonth)) {
        monthTotal++;
        if (w === true) monthCompliant++;
        if (w === false) monthDeviation++;
      }
    }
    // ترتيب الانحرافات الأحدث
    recentDeviations.sort((a, b) => (a.date < b.date ? 1 : -1));
    const rate = total ? Math.round((compliant / total) * 100) : null;
    const monthRate = monthTotal ? Math.round((monthCompliant / monthTotal) * 100) : null;
    return {
      total, compliant, deviation, pending,
      monthTotal, monthCompliant, monthDeviation, monthRate,
      rate,
      recentDeviations: recentDeviations.slice(0, 3),
    };
  }, [items]);

  const hasIssues = stats.deviation > 0 || stats.pending > 0;

  return (
    <div style={{
      ...S.card,
      background: hasIssues
        ? "linear-gradient(135deg,#fef2f2,#fff7ed)"
        : "linear-gradient(135deg,#f0fdf4,#ecfdf5)",
      borderColor: hasIssues ? "#fca5a5" : "#86efac",
    }}>
      <div style={S.head}>
        <div style={{
          fontWeight: 800, fontSize: "1.05rem",
          color: hasIssues ? "#991b1b" : "#065f46",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          🎯 CCP Monitoring
          {stats.deviation > 0 && (
            <span style={S.badge("#b91c1c")}>🔴 {stats.deviation}</span>
          )}
          {stats.deviation === 0 && stats.total > 0 && (
            <span style={S.badge("#15803d")}>✅ {stats.rate}%</span>
          )}
        </div>
        <button onClick={() => navigate("/haccp-iso/ccp-monitoring/view")}
          style={{
            background: hasIssues
              ? "linear-gradient(180deg,#dc2626,#991b1b)"
              : "linear-gradient(180deg,#059669,#047857)",
            color: "#fff", border: "none", padding: "8px 16px",
            borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: "0.88rem",
          }}>
          عرض السجلات ←
        </button>
      </div>

      {loading ? (
        <div style={{ color: "#6b7280", marginTop: 8 }}>⏳ جاري التحميل...</div>
      ) : err ? (
        <div style={{ color: "#991b1b", marginTop: 8 }}>❌ {err}</div>
      ) : stats.total === 0 ? (
        <div style={{ color: "#6b7280", marginTop: 8, fontWeight: 700 }}>
          لا توجد سجلات CCP بعد. <button onClick={() => navigate("/haccp-iso/ccp-monitoring")}
          style={{ background: "none", border: "none", color: "#1e40af", textDecoration: "underline", cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: "inherit" }}>
            ابدأ الآن
          </button>
        </div>
      ) : (
        <>
          <div style={S.kpiRow}>
            <Stat icon="📋" label="إجمالي السجلات" value={stats.total} color="#1e40af" />
            <Stat icon={stats.rate >= 95 ? "✅" : stats.rate >= 80 ? "⚠️" : "🔴"}
              label="الالتزام الكلّي" value={`${stats.rate}%`}
              color={stats.rate >= 95 ? "#15803d" : stats.rate >= 80 ? "#a16207" : "#b91c1c"} />
            <Stat icon="🔴" label="الانحرافات" value={stats.deviation}
              color={stats.deviation > 0 ? "#b91c1c" : "#15803d"} />
            <Stat icon="📅" label="انحرافات الشهر" value={stats.monthDeviation}
              color={stats.monthDeviation > 0 ? "#9a3412" : "#15803d"} />
            {!compact && (
              <Stat icon="⏳" label="معلّقة" value={stats.pending} color="#7c3aed" />
            )}
          </div>

          {!compact && stats.recentDeviations.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, color: "#991b1b", fontSize: "0.88rem", marginBottom: 6 }}>
                🚨 آخر الانحرافات:
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {stats.recentDeviations.map((d, i) => (
                  <li key={i} style={{
                    background: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 8, padding: "6px 10px",
                    fontSize: "0.86rem", color: "#0b1f4d",
                    display: "flex", justifyContent: "space-between", gap: 8,
                  }}>
                    <span>
                      <b>{d.ccp}</b> — {d.product || "—"}
                      <span style={{ color: "#991b1b", fontFamily: "monospace", marginInlineStart: 8 }}>
                        ({d.reading}{d.unit})
                      </span>
                    </span>
                    <span style={{ color: "#64748b", fontWeight: 700, fontSize: "0.78rem" }}>
                      📅 {d.date}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value, color = "#1e40af" }) {
  return (
    <div style={{
      flex: "1 1 130px", minWidth: 120,
      background: "rgba(255,255,255,0.75)",
      border: "1px solid rgba(0,0,0,0.06)",
      borderInlineStart: `4px solid ${color}`,
      borderRadius: 10, padding: "8px 12px",
    }}>
      <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: "1.4rem", fontWeight: 900, color, lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
  );
}

const S = {
  card: {
    border: "1.5px solid",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    direction: "rtl",
    fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
  },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" },
  kpiRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
  badge: (color) => ({
    background: color, color: "#fff",
    padding: "2px 8px", borderRadius: 999,
    fontSize: "0.72rem", fontWeight: 800, marginInlineStart: 4,
  }),
};
