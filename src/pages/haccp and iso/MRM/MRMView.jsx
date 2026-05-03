// src/pages/haccp and iso/MRM/MRMView.jsx
// MRM List & View

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "mrm_record";

const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "#f0f9ff" },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 },
  title: { fontSize: 22, fontWeight: 950, color: "#0c4a6e" },
  card: { background: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, border: "1px solid #e2e8f0", boxShadow: "0 6px 16px rgba(2,132,199,0.06)" },
  btn: (kind) => {
    const map = {
      primary: { bg: "linear-gradient(180deg, #0ea5e9, #06b6d4)", color: "#fff", border: "#0284c7" },
      secondary: { bg: "#fff", color: "#0c4a6e", border: "#cbd5e1" },
      danger: { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
    };
    const c = map[kind] || map.primary;
    return { background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13 };
  },
  empty: { textAlign: "center", padding: 40, color: "#64748b", fontWeight: 700 },
  rowHead: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 },
  meta: { fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 4 },
  detailBlock: { marginTop: 10, paddingTop: 10, borderTop: "1px dashed #e2e8f0" },
  miniTitle: { fontSize: 12, fontWeight: 900, color: "#0c4a6e", marginBottom: 4 },
  miniText: { fontSize: 13, color: "#1e293b", whiteSpace: "pre-wrap", lineHeight: 1.5 },
};

export default function MRMView() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useHaccpLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) => new Date(b?.payload?.meetingDate || 0) - new Date(a?.payload?.meetingDate || 0));
      setItems(arr);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function del(id) {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      load();
    } catch (e) { alert(t("deleteError") + ": " + e.message); }
  }

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{t("mrmListTitle")}</div>
            <HaccpLinkBadge clauses={["9.3"]} label={lang === "ar" ? "مراجعة الإدارة" : "Management Review"} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={load} disabled={loading}>{loading ? "⏳" : t("refresh")}</button>
            <button style={S.btn("primary")} onClick={() => navigate("/haccp-iso/mrm")}>{t("new")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        {loading && <div style={S.empty}>{t("loading")}</div>}
        {!loading && items.length === 0 && (
          <div style={S.empty}>{t("noRecords")}</div>
        )}

        {items.map((rec) => {
          const p = rec?.payload || {};
          const isOpen = openId === rec.id;
          return (
            <div key={rec.id} style={S.card}>
              <div style={S.rowHead}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 950, color: "#0c4a6e" }}>
                    {p.meetingNumber || "MRM"} — {p.meetingDate || "—"}
                  </div>
                  <div style={S.meta}>
                    📍 {p.location || "—"} • {t("mrmChair")}: {p.chairperson || "—"} • {t("mrmSignedBy")}: {p.signedBy || "—"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={S.btn("secondary")} onClick={() => setOpenId(isOpen ? null : rec.id)}>
                    {isOpen ? t("collapse") : t("expand")}
                  </button>
                  <button style={S.btn("secondary")} onClick={() => navigate(`/haccp-iso/mrm?edit=${rec.id}`)}>{t("edit")}</button>
                  <button style={S.btn("danger")} onClick={() => del(rec.id)}>{t("del")}</button>
                </div>
              </div>

              {isOpen && (
                <div style={S.detailBlock}>
                  <div style={S.miniTitle}>{t("mrmAttendees")}</div>
                  <div style={S.miniText}>{p.attendees || "—"}</div>

                  <div style={{ ...S.miniTitle, marginTop: 10 }}>{t("mrmInputs")}</div>
                  {Object.entries(p.inputs || {}).map(([k, v]) =>
                    v ? (
                      <div key={k} style={{ marginTop: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div style={S.miniText}>{v}</div>
                      </div>
                    ) : null
                  )}

                  <div style={{ ...S.miniTitle, marginTop: 10 }}>{t("mrmOutputs")}</div>
                  {Object.entries(p.outputs || {}).map(([k, v]) =>
                    v ? (
                      <div key={k} style={{ marginTop: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                        <div style={S.miniText}>{v}</div>
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
