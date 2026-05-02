// src/components/ExpiryWidget.jsx
// ويدجت مدمجة لعرض ملخّص تواريخ الانتهاء في أي صفحة (مثلاً AdminDashboard)
// مرتبطة بـ /admin/expiry-center للتفاصيل الكاملة
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  scanExpiry,
  summarize,
  sortByUrgency,
  pickAlertable,
  DEFAULT_THRESHOLDS,
} from "../utils/expiryTracker";

export default function ExpiryWidget({ thresholdDays = 30, maxItems = 5 }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await scanExpiry({
          thresholds: DEFAULT_THRESHOLDS,
          useCache: true,
        });
        if (!cancelled) setItems(sortByUrgency(result));
      } catch (e) {
        if (!cancelled) setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const summary = useMemo(() => summarize(items), [items]);
  const urgent = useMemo(
    () => pickAlertable(items, thresholdDays).slice(0, maxItems),
    [items, thresholdDays, maxItems]
  );

  const criticalCount = summary.expired + summary.expiringSoon;

  const styles = {
    card: {
      background: criticalCount > 0
        ? "linear-gradient(135deg,#fef2f2,#fff7ed)"
        : "linear-gradient(135deg,#f0fdf4,#ecfdf5)",
      border: `1.5px solid ${criticalCount > 0 ? "#fca5a5" : "#86efac"}`,
      borderRadius: 14,
      padding: 16,
      marginBottom: 14,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      direction: "rtl",
      fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
    },
    head: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: urgent.length ? 10 : 0,
      flexWrap: "wrap",
    },
    title: {
      fontWeight: 800,
      fontSize: "1.05rem",
      color: criticalCount > 0 ? "#991b1b" : "#065f46",
      display: "flex",
      alignItems: "center",
      gap: 6,
    },
    badges: { display: "flex", gap: 6, flexWrap: "wrap" },
    badge: (color) => ({
      background: color,
      color: "#fff",
      padding: "4px 10px",
      borderRadius: 999,
      fontWeight: 800,
      fontSize: "0.82rem",
    }),
    btn: {
      background: criticalCount > 0
        ? "linear-gradient(180deg,#dc2626,#991b1b)"
        : "linear-gradient(180deg,#059669,#047857)",
      color: "#fff",
      border: "none",
      padding: "8px 16px",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 800,
      fontSize: "0.88rem",
    },
    list: {
      listStyle: "none",
      padding: 0,
      margin: 0,
      display: "flex",
      flexDirection: "column",
      gap: 6,
    },
    item: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      background: "rgba(255,255,255,0.65)",
      padding: "8px 10px",
      borderRadius: 8,
      fontSize: "0.9rem",
      border: "1px solid rgba(0,0,0,0.05)",
    },
    pill: (color) => ({
      background: color,
      color: "#fff",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: "0.75rem",
      fontWeight: 800,
      whiteSpace: "nowrap",
    }),
  };

  if (err) {
    return (
      <div style={{ ...styles.card, background: "#fef2f2", borderColor: "#fca5a5" }}>
        <div style={styles.title}>⏰ تواريخ الانتهاء</div>
        <div style={{ color: "#991b1b", fontSize: "0.9rem", marginTop: 6 }}>
          ❌ تعذّر تحميل البيانات: {err}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.title}>⏰ تواريخ الانتهاء</div>
        <div style={{ color: "#6b7280", fontSize: "0.9rem", marginTop: 6 }}>
          ⏳ جارٍ الفحص...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.head}>
        <div style={styles.title}>
          ⏰ تواريخ الانتهاء
          {criticalCount > 0 && (
            <span style={{ color: "#991b1b" }}> — {criticalCount} عنصر يحتاج اهتمام</span>
          )}
        </div>
        <div style={styles.badges}>
          {summary.expired > 0 && (
            <span style={styles.badge("#b91c1c")}>منتهي: {summary.expired}</span>
          )}
          {summary.expiringSoon > 0 && (
            <span style={styles.badge("#c2410c")}>≤30 يوم: {summary.expiringSoon}</span>
          )}
          {summary.expiring > 0 && (
            <span style={styles.badge("#a16207")}>≤90 يوم: {summary.expiring}</span>
          )}
          {criticalCount === 0 && summary.expiring === 0 && (
            <span style={styles.badge("#15803d")}>✅ كل شيء سليم</span>
          )}
        </div>
        <button style={styles.btn} onClick={() => navigate("/admin/expiry-center")}>
          عرض التفاصيل ←
        </button>
      </div>

      {urgent.length > 0 && (
        <ul style={styles.list}>
          {urgent.map((it, idx) => {
            const c = it.status.key === "expired" ? "#b91c1c"
              : it.status.key === "expiring_soon" ? "#c2410c"
              : "#a16207";
            return (
              <li key={`${it.type}-${it.id}-${idx}`} style={styles.item}>
                <span style={{ fontWeight: 700, color: "#1f2937" }}>
                  <span style={{ marginInlineEnd: 6 }}>{it.icon}</span>
                  {it.name}
                  <span style={{ color: "#6b7280", fontWeight: 600, marginInlineStart: 8 }}>
                    — {it.branch}
                  </span>
                </span>
                <span style={styles.pill(c)}>
                  {it.status.label}
                  {it.daysLeft !== null && (
                    <span style={{ marginInlineStart: 4 }}>
                      ({it.daysLeft >= 0 ? `${it.daysLeft}d` : `${Math.abs(it.daysLeft)}d ago`})
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
