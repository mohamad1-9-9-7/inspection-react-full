// src/pages/monitor/branches/sweets/SweetsStaffManager.jsx
//
// 👥 The confectionery staff list editor — opened from the forms that read it
// (Personal Hygiene, Sick Employee). There is no separate settings screen in
// the company-app shell, so the list is kept where it is used.
//
// Edits a working copy; nothing is written until "Save list".

import { Bi } from "./bilingual";
import React, { useEffect, useState } from "react";
import {
  fetchSweetsStaff,
  saveSweetsStaff,
  upsertSweetsStaff,
  removeSweetsStaff,
} from "./sweetsStaff";

const blank = { empNo: "", name: "", job: "", active: true };

export default function SweetsStaffManager({ open, onClose }) {
  const [list, setList] = useState([]);
  const [draft, setDraft] = useState(blank);
  const [editingNo, setEditingNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [dirty, setDirty] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    setMsg("Loading… · جارٍ التحميل…");
    fetchSweetsStaff(ctrl.signal).then((server) => {
      if (ctrl.signal.aborted) return;
      if (Array.isArray(server)) { setList(server); setMsg(""); }
      else setMsg("⚠️ Could not reach the server — try again before editing. · تعذّر الوصول للخادم — حاول مجدداً.");
      setDirty(false);
    });
    return () => ctrl.abort();
  }, [open]);

  if (!open) return null;

  const apply = () => {
    try {
      setList((l) => upsertSweetsStaff(l, draft, editingNo));
      setDraft(blank);
      setEditingNo("");
      setDirty(true);
      setMsg("");
    } catch (e) {
      setMsg(`⚠️ ${e.message}`);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const saved = await saveSweetsStaff(list);
      setList(saved);
      setDirty(false);
      setMsg(`✅ Saved — ${saved.length} people. · تم الحفظ.`);
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (dirty && !window.confirm("Close without saving the staff list? · إغلاق دون حفظ القائمة؟")) return;
    onClose?.();
  };

  const needle = q.trim().toLowerCase();
  const shown = needle
    ? list.filter((s) => `${s.empNo} ${s.name} ${s.job}`.toLowerCase().includes(needle))
    : list;

  return (
    <div style={S.backdrop} role="dialog" aria-modal="true" onClick={close}>
      <div style={S.box} onClick={(e) => e.stopPropagation()}>
        <div style={S.head}>
          <div>
            <div style={S.title}>👥 <Bi en="Staff List" /></div>
            <div style={S.sub}>
              <Bi en="Active people fill the Personal Hygiene sheet and the Sick Employee pickers." ar="الموظفون النشطون يظهرون في ورقة النظافة الشخصية واختيار الموظف المريض." />
            </div>
          </div>
          <button type="button" style={S.x} onClick={close} aria-label="Close">✕</button>
        </div>

        <div style={S.form}>
          <input style={S.in} placeholder="Emp. No. · الرقم الوظيفي" value={draft.empNo}
            onChange={(e) => setDraft({ ...draft, empNo: e.target.value })} />
          <input style={{ ...S.in, flex: 2 }} placeholder="Full name · الاسم الكامل" value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input style={{ ...S.in, flex: 1.4 }} placeholder="Job title · المسمى الوظيفي" value={draft.job}
            onChange={(e) => setDraft({ ...draft, job: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") apply(); }} />
          <button type="button" style={S.primary} onClick={apply}>
            {editingNo ? <Bi en="Update" /> : <>＋ <Bi en="Add" /></>}
          </button>
          {editingNo && (
            <button type="button" style={S.ghost} onClick={() => { setDraft(blank); setEditingNo(""); }}>
              <Bi en="Cancel" />
            </button>
          )}
        </div>

        <input style={{ ...S.in, width: "100%", margin: "0 0 10px" }} placeholder="🔎 Search… · بحث…"
          value={q} onChange={(e) => setQ(e.target.value)} />

        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}><Bi en="Emp. No." stack /></th>
                <th style={S.th}><Bi en="Name" stack /></th>
                <th style={S.th}><Bi en="Job" stack /></th>
                <th style={S.th}><Bi en="Active" ar="نشط" stack /></th>
                <th style={S.th} />
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr><td style={{ ...S.td, textAlign: "center", color: "#64748b" }} colSpan={5}>
                  {list.length ? <Bi en="No match." ar="لا توجد نتيجة." /> : <Bi en="No staff yet — add the first person above." ar="لا يوجد موظفون — أضف أول شخص أعلاه." />}
                </td></tr>
              )}
              {shown.map((s) => (
                <tr key={s.empNo} style={s.active ? null : { opacity: 0.55 }}>
                  <td style={S.td}>{s.empNo}</td>
                  <td style={{ ...S.td, fontWeight: 800 }}>{s.name}</td>
                  <td style={S.td}>{s.job}</td>
                  <td style={S.td}>
                    <input type="checkbox" checked={s.active}
                      onChange={() => { setList((l) => upsertSweetsStaff(l, { ...s, active: !s.active }, s.empNo)); setDirty(true); }} />
                  </td>
                  <td style={{ ...S.td, whiteSpace: "nowrap", textAlign: "end" }}>
                    <button type="button" style={S.mini}
                      onClick={() => { setDraft(s); setEditingNo(s.empNo); }}><Bi en="Edit" /></button>
                    <button type="button" style={{ ...S.mini, color: "#b91c1c" }}
                      onClick={() => {
                        if (!window.confirm(`Remove ${s.name} from the list? · حذف من القائمة؟`)) return;
                        setList((l) => removeSweetsStaff(l, s.empNo));
                        setDirty(true);
                      }}><Bi en="Remove" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={S.foot}>
          <span style={S.msg}>{msg || (dirty ? "Unsaved changes · تغييرات غير محفوظة" : `${list.length} people · موظف`)}</span>
          <button type="button" style={S.ghost} onClick={close}><Bi en="Close" /></button>
          <button type="button" style={{ ...S.primary, opacity: busy || !dirty ? 0.6 : 1 }}
            disabled={busy || !dirty} onClick={save}>
            {busy ? <Bi en="Saving…" /> : <>💾 <Bi en="Save list" ar="حفظ القائمة" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

const S = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 1000, display: "grid", placeItems: "center", padding: 16 },
  box: { width: "min(860px,100%)", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 30px 80px rgba(15,23,42,.35)", color: "#0f172a" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  title: { fontWeight: 1000, fontSize: 18 },
  sub: { color: "#64748b", fontWeight: 600, fontSize: 13, marginTop: 2 },
  x: { border: "none", background: "#f1f5f9", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontWeight: 900 },
  form: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  in: { flex: 1, minWidth: 110, padding: "9px 11px", borderRadius: 9, border: "1px solid #cbd5e1", fontWeight: 700, boxSizing: "border-box", fontFamily: "inherit" },
  primary: { padding: "9px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", fontWeight: 900, cursor: "pointer" },
  ghost: { padding: "9px 14px", borderRadius: 9, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 800, cursor: "pointer" },
  mini: { padding: "4px 10px", marginInlineStart: 6, borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", fontWeight: 800, cursor: "pointer" },
  tableWrap: { overflow: "auto", flex: 1, border: "1px solid #e2e8f0", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { position: "sticky", top: 0, background: "#f8fafc", textAlign: "start", padding: "8px 10px", fontSize: 12, color: "#475569", borderBottom: "1px solid #e2e8f0" },
  td: { padding: "7px 10px", borderBottom: "1px solid #f1f5f9", fontSize: 13.5 },
  foot: { display: "flex", alignItems: "center", gap: 8, marginTop: 12 },
  msg: { marginInlineEnd: "auto", color: "#475569", fontWeight: 700, fontSize: 13 },
};
