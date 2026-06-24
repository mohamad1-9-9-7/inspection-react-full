import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";
import {
  DOC_STATUS_META,
  getExternalDocumentDocs,
  docsToCSV,
  downloadCSV,
} from "../DocumentRegister/documentSources";

const META_TYPE = "document_metadata";

const S = {
  shell: {
    minHeight: "100vh",
    padding: "20px 16px",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    background: "linear-gradient(180deg, #f8fafc 0%, #eefdf8 100%)",
    color: "#0f172a",
  },
  layout: { width: "100%", margin: "0 auto" },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    flexWrap: "wrap",
    gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.94)",
    borderRadius: 14,
    border: "1px solid #dbeafe",
    boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#0f172a", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#475569", marginTop: 4, fontWeight: 700 },
  btn: (kind) => {
    const map = {
      primary: { bg: "linear-gradient(180deg, #0f766e, #0d9488)", color: "#fff", border: "#0f766e" },
      secondary: { bg: "#fff", color: "#334155", border: "#cbd5e1" },
    };
    const c = map[kind] || map.primary;
    return {
      background: c.bg,
      color: c.color,
      border: `1.5px solid ${c.border}`,
      padding: "8px 14px",
      borderRadius: 999,
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 13,
      whiteSpace: "nowrap",
    };
  },
  toolbar: {
    display: "flex",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
    alignItems: "center",
    padding: 12,
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e2e8f0",
  },
  search: {
    flex: "1 1 260px",
    minWidth: 220,
    padding: "9px 12px",
    border: "1.5px solid #cbd5e1",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
  },
  tableWrap: {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 6px 16px rgba(15,23,42,0.05)",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    padding: "10px 12px",
    textAlign: "start",
    background: "#0f172a",
    color: "#fff",
    fontWeight: 900,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
  },
  td: { padding: "10px 12px", borderTop: "1px solid #f1f5f9", verticalAlign: "top" },
  badge: (c) => ({
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    background: c.bg,
    color: c.color,
    whiteSpace: "nowrap",
  }),
  empty: { textAlign: "center", padding: 50, color: "#64748b", fontWeight: 800 },
};

export default function ExternalDocumentsView() {
  const navigate = useNavigate();
  const { lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";

  const [metaRecords, setMetaRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(META_TYPE)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!alive) return;
        const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
        setMetaRecords(arr);
      })
      .catch(() => {
        if (alive) setMetaRecords([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const docs = useMemo(() => getExternalDocumentDocs(metaRecords), [metaRecords]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) =>
      [d.docNo, d.title, d.titleAr, d.sourceAuthority, d.isoClause, d.owner, d.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [docs, search]);

  function exportCsv() {
    downloadCSV("master_list_external_documents.csv", docsToCSV(filtered));
  }

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>
              {isAr ? "القائمة الرئيسية للمستندات الخارجية" : "Master List of External Documents"}
            </div>
            <div style={S.subtitle}>
              {isAr
                ? "سجل المستندات الخارجية الخاضعة للرقابة ضمن HACCP / ISO"
                : "Controlled external documents register under HACCP / ISO"}
            </div>
            <HaccpLinkBadge clauses={["7.5", "7.1.6"]} label="External Document Control" />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/document-register/view")}>
              Document Register
            </button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>
              {isAr ? "رجوع" : "Back"}
            </button>
          </div>
        </div>

        <div style={S.toolbar}>
          <input
            style={S.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "بحث بالرقم أو الاسم أو الجهة..." : "Search by number, title, authority..."}
          />
          <button style={S.btn("primary")} onClick={exportCsv}>
            CSV
          </button>
        </div>

        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Doc No.</th>
                <th style={S.th}>{isAr ? "العنوان" : "Title"}</th>
                <th style={S.th}>{isAr ? "الجهة" : "Authority"}</th>
                <th style={S.th}>ISO</th>
                <th style={S.th}>{isAr ? "المسؤول" : "Owner"}</th>
                <th style={S.th}>{isAr ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td style={S.empty} colSpan={6}>{isAr ? "جاري التحميل..." : "Loading..."}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td style={S.empty} colSpan={6}>{isAr ? "لا توجد مستندات خارجية" : "No external documents found"}</td></tr>
              ) : (
                filtered.map((d) => {
                  const status = d.status || "Active";
                  const meta = DOC_STATUS_META[status] || DOC_STATUS_META.Active;
                  return (
                    <tr key={d.docNo}>
                      <td style={S.td}><strong>{d.docNo}</strong></td>
                      <td style={S.td}>
                        <div style={{ fontWeight: 900 }}>{isAr && d.titleAr ? d.titleAr : d.title}</div>
                        {d.notes ? <div style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}>{d.notes}</div> : null}
                      </td>
                      <td style={S.td}>{d.sourceAuthority || "-"}</td>
                      <td style={S.td}>{d.isoClause || "-"}</td>
                      <td style={S.td}>{d.owner || "-"}</td>
                      <td style={S.td}><span style={S.badge(meta)}>{status}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
