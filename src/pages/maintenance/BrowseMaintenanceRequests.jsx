// src/pages/maintenance/BrowseMaintenanceRequests.jsx
// Password-gated workflow browser: dashboard, filters, status workflow,
// maintenance edit (comment/workshop/materials/cost), approvals, timeline, print/PDF.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  STATUS, STATUS_ORDER, BRANCHES, PRIORITIES, statusTone, toTs, isOverdue, sumCost,
  fetchMaintenance, saveMaintenance, pushTimeline, deleteMaintenance,
  printMaintenanceForm, downloadMaintenancePdf,
} from "./maintenanceShared";
import { uploadImageToServer } from "../monitor/branches/shipment_recc/qcsRawApi";
import { useFontScale, FontScaleControl } from "./useFontScale";

const GATE_PW = "9999";
const GATE_KEY = "mnt_browse_gate_ok";

// Urgent → High → Medium → Low (stored as English string from the form)
const PRIORITY_RANK = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
const prRank = (p) => PRIORITY_RANK[String(p || "").trim()] || 0;
const rowCost = (r) => {
  const n = parseFloat(String(r.totalCost || "").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) && n ? n : sumCost(r.materials);
};

const fmt = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleString("en-GB", { timeZone: "Asia/Dubai" });
};
const fmtD = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? String(v) : d.toLocaleDateString("en-GB");
};

/* ===================== Password Gate ===================== */
function Gate({ onOk }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (pw === GATE_PW) {
      try { sessionStorage.setItem(GATE_KEY, "1"); } catch {}
      onOk();
    } else {
      setErr("كلمة المرور غير صحيحة / Wrong password");
      setPw("");
    }
  };
  return (
    <div style={g.wrap}>
      <form onSubmit={submit} style={g.card}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <h2 style={g.title}>تصفّح طلبات الصيانة</h2>
        <div style={g.sub}>Browse Maintenance Requests — Protected</div>
        <input
          type="password" autoFocus value={pw}
          onChange={(e) => { setPw(e.target.value); setErr(""); }}
          placeholder="كلمة المرور / Password" style={g.input}
        />
        {err && <div style={g.err}>{err}</div>}
        <button type="submit" style={g.btn}>دخول / Enter</button>
      </form>
    </div>
  );
}

/* ===================== Edit Modal ===================== */
function EditModal({ rec, onClose, onSaved, scale = 1 }) {
  const [dateReceived, setDateReceived] = useState(rec.dateReceived || "");
  const [recipient, setRecipient] = useState(rec.recipient || "");
  const [comment, setComment] = useState(rec.maintenanceComment || "");
  const [workshop, setWorkshop] = useState(rec.workshop || "");
  const [materials, setMaterials] = useState(
    rec.materials?.length ? rec.materials : [{ item: "", description: "", cost: "" }]
  );
  const [proc, setProc] = useState(rec.procurement || { name: "", date: "" });
  const [mgmt, setMgmt] = useState(rec.management || { name: "", date: "" });
  const [technician, setTechnician] = useState(rec.technician || "");
  const [completionNote, setCompletionNote] = useState(rec.completionNote || "");
  const [proofs, setProofs] = useState(Array.isArray(rec.proofs) ? rec.proofs : []);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onProofs = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true); setErr("");
    try {
      const urls = [];
      for (const f of files) {
        try {
          const url = await uploadImageToServer(f, "maintenance_proof");
          if (url) urls.push(url);
        } catch (ex) { console.warn("proof upload failed:", ex); }
      }
      if (!urls.length) setErr("❌ فشل رفع المرفقات / Upload failed");
      setProofs((s) => Array.from(new Set([...s, ...urls])));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };
  const delProof = (i) => setProofs((s) => s.filter((_, idx) => idx !== i));

  const total = useMemo(() => sumCost(materials), [materials]);

  const chMat = (i, k, v) => setMaterials((r) => r.map((m, idx) => idx === i ? { ...m, [k]: v } : m));
  const addMat = () => setMaterials((r) => [...r, { item: "", description: "", cost: "" }]);
  const delMat = (i) => setMaterials((r) => r.length > 1 ? r.filter((_, idx) => idx !== i) : r);

  const save = async () => {
    setBusy(true); setErr("");
    try {
      const cleanMat = materials.filter(
        (m) =>
          String(m?.item || "").trim() ||
          String(m?.description || "").trim() ||
          String(m?.cost || "").trim()
      );
      const next = {
        ...rec,
        dateReceived,
        recipient,
        maintenanceComment: comment,
        workshop,
        materials: cleanMat,
        totalCost: total ? total.toFixed(2) : "",
        procurement: proc,
        management: mgmt,
        technician,
        completionNote,
        proofs,
      };
      next.timeline = pushTimeline(rec, "تحديث تفاصيل الصيانة / Maintenance details updated", "Maintenance");
      await saveMaintenance(next);
      onSaved(next);
    } catch (e) {
      setErr("فشل الحفظ / Save failed: " + (e?.message || e));
    } finally { setBusy(false); }
  };

  return (
    <div style={m.overlay} onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div style={{ ...m.modal, zoom: scale }} dir="rtl">
        <h3 style={m.title}>🛠️ تعبئة قسم الصيانة / Maintenance Section — {rec.requestNo}</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={m.lbl}>تاريخ استلام الطلب / Date received</label>
            <input style={m.inp} type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} />
          </div>
          <div>
            <label style={m.lbl}>مستلم الطلب / Recipient</label>
            <input style={m.inp} placeholder="اسم المستلم / قسم الصيانة" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          </div>
        </div>

        <label style={m.lbl}>تعليق قسم الصيانة / Maintenance comment</label>
        <textarea style={m.ta} value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />

        <div style={{ margin: "10px 0", display: "flex", gap: 20, fontWeight: 700, fontSize: 14 }}>
          <label style={m.radio}>
            <input type="radio" name="ws" checked={workshop === "internal"} onChange={() => setWorkshop("internal")} />
            ورشة داخلية / Internal workshop
          </label>
          <label style={m.radio}>
            <input type="radio" name="ws" checked={workshop === "external"} onChange={() => setWorkshop("external")} />
            ورشة خارجية / External workshop
          </label>
        </div>

        <label style={m.lbl}>المواد / Material</label>
        <table style={m.table}>
          <thead><tr>
            <th style={m.th}>المادة / Item</th><th style={m.th}>الوصف / Description</th>
            <th style={{ ...m.th, width: 110 }}>التكلفة / Cost</th><th style={{ ...m.th, width: 40 }}></th>
          </tr></thead>
          <tbody>
            {materials.map((mt, i) => (
              <tr key={i}>
                <td style={m.td}><input style={m.cell} value={mt.item || ""} onChange={(e) => chMat(i, "item", e.target.value)} /></td>
                <td style={m.td}><input style={m.cell} value={mt.description || ""} onChange={(e) => chMat(i, "description", e.target.value)} /></td>
                <td style={m.td}><input style={m.cell} type="number" step="0.01" value={mt.cost || ""} onChange={(e) => chMat(i, "cost", e.target.value)} /></td>
                <td style={{ ...m.td, textAlign: "center" }}><button onClick={() => delMat(i)} style={m.x}>✕</button></td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} style={{ ...m.td, textAlign: "left", fontWeight: 900 }}>الإجمالي / Total</td>
              <td style={{ ...m.td, fontWeight: 900, textAlign: "center" }}>{total.toFixed(2)}</td>
              <td style={m.td}></td>
            </tr>
          </tbody>
        </table>
        <button onClick={addMat} style={m.add}>➕ إضافة مادة / Add material</button>

        {/* Repair proof + invoices (Cloudinary) */}
        <label style={m.lbl}>📎 إثبات التصليح والفواتير / Repair Proof &amp; Invoices</label>
        <input type="file" accept="image/*,.pdf" multiple onChange={onProofs} disabled={uploading} />
        <div style={{ fontSize: 11, color: uploading ? "#b45309" : "#64748b", marginTop: 4 }}>
          {uploading ? "⏳ جارٍ الرفع على Cloudinary…" : "صور قبل/بعد أو فواتير (PDF/صورة) — تُرفع على Cloudinary."}
        </div>
        {!!proofs.length && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {proofs.map((src, i) => {
              const isPdf = /\.pdf(\?|#|$)/i.test(src);
              return (
                <div key={i} style={{ position: "relative", width: 92, height: 92, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  {isPdf
                    ? <a href={src} target="_blank" rel="noreferrer" style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 28, textDecoration: "none" }}>📄</a>
                    : <a href={src} target="_blank" rel="noreferrer"><img src={src} alt={`p${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></a>}
                  <button type="button" onClick={() => delProof(i)} style={{ position: "absolute", top: 4, left: 4, background: "rgba(220,38,38,.95)", color: "#fff", border: "none", borderRadius: 6, padding: "2px 7px", fontWeight: 800, cursor: "pointer" }}>✕</button>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
          <div>
            <label style={m.lbl}>الفني المنفّذ / Technician</label>
            <input style={m.inp} placeholder="اسم الفني" value={technician} onChange={(e) => setTechnician(e.target.value)} />
          </div>
          <div>
            <label style={m.lbl}>ملاحظة الإنجاز / Completion note</label>
            <input style={m.inp} placeholder="ملخّص ما تم تنفيذه" value={completionNote} onChange={(e) => setCompletionNote(e.target.value)} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div>
            <label style={m.lbl}>موافقة المشتريات / Procurement approval</label>
            <input style={m.inp} placeholder="الاسم / Name" value={proc.name} onChange={(e) => setProc({ ...proc, name: e.target.value })} />
            <input style={{ ...m.inp, marginTop: 6 }} type="date" value={proc.date} onChange={(e) => setProc({ ...proc, date: e.target.value })} />
          </div>
          <div>
            <label style={m.lbl}>موافقة الإدارة / Management approval</label>
            <input style={m.inp} placeholder="الاسم / Name" value={mgmt.name} onChange={(e) => setMgmt({ ...mgmt, name: e.target.value })} />
            <input style={{ ...m.inp, marginTop: 6 }} type="date" value={mgmt.date} onChange={(e) => setMgmt({ ...mgmt, date: e.target.value })} />
          </div>
        </div>

        {err && <div style={{ ...m.lbl, color: "#b91c1c", marginTop: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onClose} disabled={busy} style={m.ghost}>إلغاء / Cancel</button>
          <button onClick={save} disabled={busy || uploading} style={m.primary}>
            {busy ? "…" : uploading ? "⏳ رفع…" : "💾 حفظ / Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== Main ===================== */
export default function BrowseMaintenanceRequests() {
  const navigate = useNavigate();
  const [gated, setGated] = useState(() => {
    try { return sessionStorage.getItem(GATE_KEY) === "1"; } catch { return false; }
  });
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("All");
  const [fBranch, setFBranch] = useState("All");
  const [fPriority, setFPriority] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const fontScale = useFontScale();
  const [expanded, setExpanded] = useState(null);
  const [editRec, setEditRec] = useState(null);
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try { setAll(await fetchMaintenance()); }
    catch (e) { setErr("تعذّر الجلب / Fetch failed: " + (e?.message || e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (gated) load(); }, [gated]);

  const stats = useMemo(() => {
    const s = { total: all.length, new: 0, prog: 0, done: 0, rej: 0, overdue: 0 };
    for (const r of all) {
      const v = r.status || STATUS.NEW;
      if (v.includes("Completed")) s.done++;
      else if (v.includes("Rejected")) s.rej++;
      else if (v.includes("In Progress")) s.prog++;
      else s.new++;
      if (isOverdue(r)) s.overdue++;
    }
    return s;
  }, [all]);

  const rows = useMemo(() => {
    let arr = all.slice();
    if (fStatus !== "All") arr = arr.filter((r) => (r.status || STATUS.NEW) === fStatus);
    if (fBranch !== "All") arr = arr.filter((r) => r.branch === fBranch);
    if (fPriority !== "All") arr = arr.filter((r) => String(r.priority || "") === fPriority);
    if (overdueOnly) arr = arr.filter((r) => isOverdue(r));
    if (dateFrom) {
      const from = toTs(dateFrom);
      arr = arr.filter((r) => toTs(r.dateOfForm || r.reportDate || r.createdAt) >= from);
    }
    if (dateTo) {
      const to = toTs(dateTo) + 86399999; // include the whole "to" day
      arr = arr.filter((r) => toTs(r.dateOfForm || r.reportDate || r.createdAt) <= to);
    }
    if (q.trim()) {
      const k = q.toLowerCase();
      arr = arr.filter((r) =>
        [r.requestNo, r.branch, r.applicant, r.recipient, r.status, r.priority,
         ...(r.problems || []).map((p) => `${p.location} ${p.problem}`)]
          .join(" ").toLowerCase().includes(k));
    }

    const newest = (a, b) => toTs(b.createdAt) - toTs(a.createdAt);
    switch (sortBy) {
      case "oldest":
        arr.sort((a, b) => toTs(a.createdAt) - toTs(b.createdAt));
        break;
      case "priority":
        arr.sort((a, b) => prRank(b.priority) - prRank(a.priority) || newest(a, b));
        break;
      case "status":
        arr.sort(
          (a, b) =>
            STATUS_ORDER.indexOf(a.status || STATUS.NEW) -
              STATUS_ORDER.indexOf(b.status || STATUS.NEW) || newest(a, b)
        );
        break;
      case "overdue":
        arr.sort((a, b) => (isOverdue(b) ? 1 : 0) - (isOverdue(a) ? 1 : 0) || newest(a, b));
        break;
      case "cost":
        arr.sort((a, b) => rowCost(b) - rowCost(a) || newest(a, b));
        break;
      case "newest":
      default:
        arr.sort(newest);
        break;
    }
    return arr;
  }, [all, q, fStatus, fBranch, fPriority, overdueOnly, dateFrom, dateTo, sortBy]);

  const activeFilters =
    (q.trim() ? 1 : 0) +
    (fStatus !== "All" ? 1 : 0) +
    (fBranch !== "All" ? 1 : 0) +
    (fPriority !== "All" ? 1 : 0) +
    (overdueOnly ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const clearFilters = () => {
    setQ(""); setFStatus("All"); setFBranch("All"); setFPriority("All");
    setOverdueOnly(false); setDateFrom(""); setDateTo(""); setSortBy("newest");
  };

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const changeStatus = async (rec, status, label, extra = {}) => {
    // Guard: cannot complete without repair proof or a completion note
    if (status === STATUS.COMPLETED) {
      const hasProof = Array.isArray(rec.proofs) && rec.proofs.length > 0;
      const hasNote = !!(rec.completionNote && rec.completionNote.trim());
      if (!hasProof && !hasNote) {
        flash("⚠️ لا يمكن الإكمال بدون إثبات تصليح أو ملاحظة إنجاز — افتح 🛠️ تعبئة الصيانة أولاً.");
        return;
      }
    }
    try {
      const next = { ...rec, status, ...extra };
      if (status === STATUS.COMPLETED) next.completedAt = new Date().toISOString();
      next.timeline = pushTimeline(rec, label, "Maintenance");
      await saveMaintenance(next);
      setAll((a) => a.map((x) => (x.requestNo === rec.requestNo && x.createdAt === rec.createdAt ? next : x)));
      flash(`✅ ${label}`);
    } catch (e) { flash("❌ فشل / Failed: " + (e?.message || e)); }
  };

  const handleDelete = async (rec) => {
    const name = rec.requestNo || rec.branch || "this request";
    if (!window.confirm(`⚠️ حذف الطلب نهائياً؟ / Permanently delete "${name}"؟\n\nلا يمكن التراجع / This cannot be undone.`)) return;
    const pin = window.prompt("أدخل رمز التأكيد للحذف / Enter delete PIN:");
    if (pin == null) return;
    if (pin !== "9999") { flash("❌ رمز خاطئ / Wrong PIN"); return; }
    try {
      await deleteMaintenance(rec);
      setAll((a) => a.filter((x) => !(x.requestNo === rec.requestNo && x.createdAt === rec.createdAt)));
      setExpanded(null);
      flash(`🗑 تم حذف الطلب ${rec.requestNo || ""} / Deleted`);
    } catch (e) {
      flash("❌ فشل الحذف / Delete failed: " + (e?.message || e));
    }
  };

  if (!gated) return <Gate onOk={() => setGated(true)} />;

  return (
    <div style={s.page} dir="rtl">
      <div style={{ ...s.shell, zoom: fontScale.scale }}>
        <div style={s.head}>
          <div style={s.hTitle}>📋 تصفّح طلبات الصيانة / Browse Maintenance Requests</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <FontScaleControl {...fontScale} />
            <button onClick={load} style={s.btnGhost}>🔄 تحديث</button>
            <button onClick={() => navigate("/maintenance-requests")} style={s.btnPrimary}>➕ طلب جديد</button>
            <button onClick={() => navigate("/maintenance-home")} style={s.btnGhost}>🏠 الرئيسية</button>
          </div>
        </div>

        {/* Dashboard */}
        <div style={s.dash}>
          <Stat label="إجمالي / Total" value={stats.total} c="#0f172a" bg="#f1f5f9" onClick={() => setFStatus("All")} />
          <Stat label="جديد / New" value={stats.new} c="#854d0e" bg="#fef9c3" onClick={() => setFStatus(STATUS.NEW)} />
          <Stat label="جاري / In Progress" value={stats.prog} c="#1e40af" bg="#dbeafe" onClick={() => setFStatus(STATUS.IN_PROGRESS)} />
          <Stat label="مكتمل / Done" value={stats.done} c="#166534" bg="#dcfce7" onClick={() => setFStatus(STATUS.COMPLETED)} />
          <Stat label="مرفوض / Rejected" value={stats.rej} c="#991b1b" bg="#fee2e2" onClick={() => setFStatus(STATUS.REJECTED)} />
          <Stat label="⚠️ متأخّر / Overdue" value={stats.overdue} c="#fff" bg="#dc2626" onClick={() => setOverdueOnly((v) => !v)} />
        </div>

        {/* Smart filters & sort */}
        <div style={s.filters}>
          <input style={s.search} placeholder="🔎 بحث / Search…" value={q} onChange={(e) => setQ(e.target.value)} />

          <select style={s.sel} value={sortBy} onChange={(e) => setSortBy(e.target.value)} title="ترتيب / Sort">
            <option value="newest">↕ الأحدث / Newest</option>
            <option value="oldest">↕ الأقدم / Oldest</option>
            <option value="priority">🔥 الأولوية / Priority</option>
            <option value="status">📌 الحالة / Status</option>
            <option value="overdue">⚠️ المتأخّر أولاً / Overdue first</option>
            <option value="cost">💰 الأعلى تكلفة / Highest cost</option>
          </select>

          <select style={s.sel} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="All">كل الحالات / All status</option>
            {STATUS_ORDER.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
          <select style={s.sel} value={fBranch} onChange={(e) => setFBranch(e.target.value)}>
            <option value="All">كل الفروع / All branches</option>
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select style={s.sel} value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
            <option value="All">كل الأولويات / All priorities</option>
            {PRIORITIES.map((p) => <option key={p.en} value={p.en}>{p.ar} / {p.en}</option>)}
          </select>

          <label style={s.dateWrap}>
            <span style={s.dateLbl}>من / From</span>
            <input type="date" style={s.dateInp} value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label style={s.dateWrap}>
            <span style={s.dateLbl}>إلى / To</span>
            <input type="date" style={s.dateInp} value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
          </label>

          <button
            onClick={() => setOverdueOnly((v) => !v)}
            style={{ ...s.toggle, ...(overdueOnly ? s.toggleOn : {}) }}
            title="عرض المتأخّر فقط / Overdue only"
          >
            ⚠️ متأخّر فقط
          </button>

          <button
            onClick={clearFilters}
            disabled={activeFilters === 0 && sortBy === "newest"}
            style={{ ...s.btnGhost, opacity: activeFilters === 0 && sortBy === "newest" ? 0.5 : 1 }}
            title="مسح كل الفلاتر / Clear all"
          >
            ✕ مسح{activeFilters ? ` (${activeFilters})` : ""}
          </button>

          <span style={{ alignSelf: "center", color: "#64748b", fontWeight: 800, whiteSpace: "nowrap" }}>
            {rows.length} / {all.length} نتيجة
          </span>
        </div>

        {toast && <div style={s.toast}>{toast}</div>}
        {err && <div style={s.alertErr}>{err}</div>}
        {loading && <div style={s.loading}>جارٍ التحميل… / Loading…</div>}

        {/* List */}
        {rows.map((r) => {
          const tone = statusTone(r.status);
          const over = isOverdue(r);
          const open = expanded === (r.requestNo + r.createdAt);
          const status = r.status || STATUS.NEW;
          return (
            <div key={r.requestNo + r.createdAt} style={{ ...s.card, ...(over ? { borderColor: "#dc2626", boxShadow: "0 0 0 1px #dc2626 inset" } : {}) }}>
              <div style={s.cardTop} onClick={() => setExpanded(open ? null : r.requestNo + r.createdAt)}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <b style={{ color: "#b91c1c", fontSize: 15 }}>{r.requestNo || "—"}</b>
                  <span style={{ ...s.chip, background: tone.bg, color: tone.fg, border: `1px solid ${tone.bd}` }}>{status}</span>
                  {over && <span style={s.overChip}>⚠️ متأخّر / Overdue</span>}
                  <span style={{ color: "#475569", fontWeight: 700 }}>{r.branch}</span>
                  <span style={{ color: "#64748b" }}>👤 {r.applicant || "—"}</span>
                </div>
                <div style={{ color: "#64748b", fontSize: 13 }}>{fmtD(r.dateOfForm)} {open ? "▲" : "▼"}</div>
              </div>

              {open && (
                <div style={s.cardBody}>
                  <div style={s.metaGrid}>
                    <div><b>تاريخ الاستلام / Received:</b> {fmtD(r.dateReceived)}</div>
                    <div><b>مستلم الطلب / Recipient:</b> {r.recipient || "—"}</div>
                    <div><b>الأولوية / Priority:</b> {r.priority || "—"}</div>
                    <div><b>ورشة / Workshop:</b> {r.workshop === "internal" ? "داخلية / Internal" : r.workshop === "external" ? "خارجية / External" : "—"}</div>
                  </div>

                  <div style={s.secT}>المشاكل / Problems</div>
                  <table style={s.tbl}>
                    <thead><tr>
                      <th style={s.th}>#</th><th style={s.th}>الموقع / Location</th><th style={s.th}>المشكلة / Problem</th>
                      <th style={s.th}>بدأت / Started</th><th style={s.th}>التنفيذ / Deadline</th>
                    </tr></thead>
                    <tbody>
                      {(r.problems || []).map((p, i) => (
                        <tr key={i}>
                          <td style={s.tdC}>{i + 1}</td>
                          <td style={s.td}>{p.location || "—"}</td>
                          <td style={s.td}>{p.problem || "—"}</td>
                          <td style={s.tdC}>{fmtD(p.startedDate)}</td>
                          <td style={s.tdC}>{fmtD(p.deadline)}</td>
                        </tr>
                      ))}
                      {(!r.problems || !r.problems.length) && (
                        <tr><td colSpan={5} style={{ ...s.tdC, color: "#94a3b8" }}>
                          {r.title ? `${r.title} — ${r.description}` : "—"}
                        </td></tr>
                      )}
                    </tbody>
                  </table>

                  {r.maintenanceComment && (
                    <><div style={s.secT}>تعليق الصيانة / Maintenance comment</div>
                      <div style={s.box}>{r.maintenanceComment}</div></>
                  )}

                  {!!(r.materials && r.materials.length) && (
                    <><div style={s.secT}>المواد / Materials — الإجمالي/Total: {r.totalCost || sumCost(r.materials).toFixed(2)}</div>
                      <table style={s.tbl}>
                        <thead><tr><th style={s.th}>#</th><th style={s.th}>المادة/Item</th><th style={s.th}>الوصف/Desc</th><th style={s.th}>التكلفة/Cost</th></tr></thead>
                        <tbody>{r.materials.map((mt, i) => (
                          <tr key={i}><td style={s.tdC}>{i + 1}</td><td style={s.td}>{mt.item}</td><td style={s.td}>{mt.description}</td><td style={s.tdC}>{mt.cost}</td></tr>
                        ))}</tbody>
                      </table></>
                  )}

                  {!!(r.images && r.images.length) && (
                    <><div style={s.secT}>صور الطلب / Request Images</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {r.images.map((src, i) => (
                          <a key={i} href={src} target="_blank" rel="noreferrer">
                            <img src={src} alt={`i${i}`} style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }} />
                          </a>
                        ))}
                      </div></>
                  )}

                  {!!(r.proofs && r.proofs.length) && (
                    <><div style={s.secT}>📎 إثبات التصليح والفواتير / Repair Proof &amp; Invoices</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {r.proofs.map((src, i) => {
                          const isPdf = /\.pdf(\?|#|$)/i.test(src);
                          return (
                            <a key={i} href={src} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                              {isPdf
                                ? <div style={{ width: 90, height: 90, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc" }}>📄</div>
                                : <img src={src} alt={`pf${i}`} style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #16a34a" }} />}
                            </a>
                          );
                        })}
                      </div></>
                  )}

                  {(r.technician || r.completionNote || r.completedAt) && (
                    <div style={s.metaGrid}>
                      {r.technician && <div><b>الفني / Technician:</b> {r.technician}</div>}
                      {r.completedAt && <div><b>تاريخ الإنجاز / Completed:</b> {fmtD(r.completedAt)}</div>}
                      {r.completionNote && <div style={{ gridColumn: "1 / -1" }}><b>ملاحظة الإنجاز / Note:</b> {r.completionNote}</div>}
                    </div>
                  )}

                  {r.rejectionReason && (
                    <div style={{ marginTop: 10, padding: "8px 12px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b", fontWeight: 700, fontSize: 13 }}>
                      ✖ سبب الرفض / Rejection reason: {r.rejectionReason}
                    </div>
                  )}

                  {/* Approvals */}
                  <div style={s.metaGrid}>
                    <div><b>موافقة المشتريات / Procurement:</b> {r.procurement?.name || "—"} {r.procurement?.date ? `(${fmtD(r.procurement.date)})` : ""}</div>
                    <div><b>موافقة الإدارة / Management:</b> {r.management?.name || "—"} {r.management?.date ? `(${fmtD(r.management.date)})` : ""}</div>
                  </div>

                  {/* Timeline */}
                  {!!(r.timeline && r.timeline.length) && (
                    <><div style={s.secT}>السجل الزمني / Timeline</div>
                      <div style={s.timeline}>
                        {r.timeline.slice().reverse().map((t, i) => (
                          <div key={i} style={s.tlItem}>
                            <span style={s.tlDot} />
                            <div><b>{t.action}</b><div style={{ fontSize: 12, color: "#64748b" }}>{fmt(t.at)} · {t.by}</div></div>
                          </div>
                        ))}
                      </div></>
                  )}

                  {/* Actions */}
                  <div style={s.actions}>
                    <button onClick={() => setEditRec(r)} style={s.aEdit}>🛠️ تعبئة الصيانة / Fill Maintenance</button>
                    {!status.includes("In Progress") && !status.includes("Completed") && !status.includes("Rejected") && (
                      <button onClick={() => changeStatus(r, STATUS.IN_PROGRESS, "بدء التنفيذ / Started")} style={s.aProg}>▶ بدء / Start</button>
                    )}
                    {!status.includes("Completed") && !status.includes("Rejected") && (
                      <button onClick={() => changeStatus(r, STATUS.COMPLETED, "تم الإكمال / Completed")} style={s.aDone}>✅ إكمال / Complete</button>
                    )}
                    {!status.includes("Rejected") && !status.includes("Completed") && (
                      <button onClick={() => {
                        const reason = window.prompt("سبب الرفض (إجباري) / Rejection reason (required):");
                        if (reason == null) return;
                        if (!reason.trim()) { flash("⚠️ سبب الرفض إجباري / Reason required"); return; }
                        changeStatus(r, STATUS.REJECTED, `تم الرفض / Rejected — ${reason.trim()}`, { rejectionReason: reason.trim(), rejectedAt: new Date().toISOString() });
                      }} style={s.aRej}>✖ رفض / Reject</button>
                    )}
                    <button onClick={() => printMaintenanceForm(r)} style={s.aPrint}>🖨 طباعة / Print</button>
                    <button onClick={() => downloadMaintenancePdf(r)} style={s.aPdf}>📄 PDF</button>
                    <button onClick={() => handleDelete(r)} style={s.aDel}>🗑 حذف / Delete</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!loading && !rows.length && <div style={s.empty}>لا توجد طلبات / No requests.</div>}
      </div>

      {editRec && (
        <EditModal
          rec={editRec}
          scale={fontScale.scale}
          onClose={() => setEditRec(null)}
          onSaved={(next) => {
            setAll((a) => a.map((x) => (x.requestNo === next.requestNo && x.createdAt === next.createdAt ? next : x)));
            setEditRec(null);
            flash("✅ تم حفظ تفاصيل الصيانة / Maintenance saved");
          }}
        />
      )}
    </div>
  );
}

const Stat = ({ label, value, c, bg, onClick }) => (
  <div onClick={onClick} style={{ ...s.stat, background: bg, color: c, cursor: onClick ? "pointer" : "default" }}>
    <div style={{ fontSize: 26, fontWeight: 900 }}>{value}</div>
    <div style={{ fontSize: 12, fontWeight: 800 }}>{label}</div>
  </div>
);

/* ===== styles ===== */
const g = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#1e1b4b,#3b0764)", fontFamily: "Cairo, system-ui" },
  card: { background: "#fff", padding: 36, borderRadius: 20, textAlign: "center", width: "min(92vw,380px)", boxShadow: "0 24px 60px rgba(0,0,0,.4)" },
  title: { margin: "10px 0 2px", fontSize: 20, fontWeight: 900, color: "#0f172a" },
  sub: { color: "#64748b", fontSize: 12, marginBottom: 18 },
  input: { width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 12, fontSize: 16, textAlign: "center", boxSizing: "border-box" },
  err: { color: "#dc2626", fontWeight: 700, marginTop: 8, fontSize: 13 },
  btn: { marginTop: 14, width: "100%", padding: "12px", background: "linear-gradient(90deg,#7c3aed,#3b82f6)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 900, fontSize: 15, cursor: "pointer" },
};
const s = {
  page: { minHeight: "100vh", background: "linear-gradient(135deg,#f1f5f9,#e0e7ff)", padding: 18, fontFamily: "Cairo, system-ui, sans-serif" },
  shell: { maxWidth: 1080, margin: "10px auto" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  hTitle: { fontSize: 20, fontWeight: 900, color: "#0f172a" },
  btnPrimary: { background: "linear-gradient(90deg,#b91c1c,#dc2626)", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 10, fontWeight: 800, cursor: "pointer" },
  btnGhost: { background: "#fff", color: "#334155", border: "1px solid #cbd5e1", padding: "9px 14px", borderRadius: 10, fontWeight: 800, cursor: "pointer" },
  dash: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 14 },
  stat: { borderRadius: 14, padding: "14px 12px", textAlign: "center", boxShadow: "0 6px 16px rgba(2,6,23,.06)" },
  filters: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 },
  search: { flex: "1 1 240px", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 10, fontSize: 14 },
  sel: { padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 10, fontSize: 14, background: "#fff", cursor: "pointer", fontWeight: 700, color: "#334155" },
  dateWrap: { display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, padding: "0 10px" },
  dateLbl: { fontSize: 12, fontWeight: 800, color: "#64748b", whiteSpace: "nowrap" },
  dateInp: { border: "none", outline: "none", background: "transparent", padding: "10px 0", fontSize: 13, color: "#334155", fontFamily: "inherit" },
  toggle: { background: "#fff", color: "#334155", border: "1px solid #cbd5e1", padding: "10px 14px", borderRadius: 10, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" },
  toggleOn: { background: "#dc2626", color: "#fff", borderColor: "#dc2626" },
  toast: { background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: 10, padding: "10px 12px", fontWeight: 800, marginBottom: 10 },
  alertErr: { whiteSpace: "pre-wrap", background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 12px", fontWeight: 700, marginBottom: 10 },
  loading: { textAlign: "center", color: "#475569", fontWeight: 800, padding: 16 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, marginBottom: 10, overflow: "hidden", boxShadow: "0 4px 12px rgba(2,6,23,.05)" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", cursor: "pointer", gap: 10, flexWrap: "wrap" },
  chip: { padding: "3px 10px", borderRadius: 999, fontWeight: 800, fontSize: 12 },
  overChip: { padding: "3px 10px", borderRadius: 999, fontWeight: 800, fontSize: 12, background: "#dc2626", color: "#fff" },
  cardBody: { padding: "0 16px 16px", borderTop: "1px solid #f1f5f9" },
  metaGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 6, fontSize: 13, margin: "12px 0", color: "#334155" },
  secT: { fontWeight: 900, color: "#0f172a", borderBottom: "2px solid #0f172a", paddingBottom: 3, margin: "14px 0 6px", fontSize: 13.5 },
  tbl: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
  th: { border: "1px solid #cbd5e1", background: "#f1f5f9", padding: "6px 8px", fontWeight: 800 },
  td: { border: "1px solid #cbd5e1", padding: "6px 8px" },
  tdC: { border: "1px solid #cbd5e1", padding: "6px 8px", textAlign: "center" },
  box: { border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, background: "#f8fafc", fontSize: 13, whiteSpace: "pre-wrap" },
  timeline: { borderInlineStart: "2px solid #c7d2fe", paddingInlineStart: 14, marginInlineStart: 6 },
  tlItem: { display: "flex", gap: 10, marginBottom: 10, position: "relative" },
  tlDot: { width: 9, height: 9, borderRadius: 999, background: "#6366f1", marginTop: 5, flex: "0 0 auto" },
  actions: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 },
  aEdit: { background: "#1e293b", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 9, fontWeight: 800, cursor: "pointer" },
  aProg: { background: "#2563eb", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 9, fontWeight: 800, cursor: "pointer" },
  aDone: { background: "#16a34a", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 9, fontWeight: 800, cursor: "pointer" },
  aRej: { background: "#dc2626", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 9, fontWeight: 800, cursor: "pointer" },
  aPrint: { background: "#fff", color: "#334155", border: "1px solid #cbd5e1", padding: "8px 14px", borderRadius: 9, fontWeight: 800, cursor: "pointer" },
  aPdf: { background: "#fff", color: "#b91c1c", border: "1px solid #fecaca", padding: "8px 14px", borderRadius: 9, fontWeight: 800, cursor: "pointer" },
  aDel: { background: "#dc2626", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 9, fontWeight: 800, cursor: "pointer" },
  empty: { textAlign: "center", color: "#94a3b8", fontWeight: 800, padding: 30 },
};
const m = {
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modal: { background: "#fff", width: "min(96vw,720px)", maxHeight: "92vh", overflow: "auto", borderRadius: 16, padding: 22, boxShadow: "0 24px 60px rgba(0,0,0,.3)", fontFamily: "Cairo, system-ui" },
  title: { margin: "0 0 14px", fontSize: 17, fontWeight: 900, color: "#0f172a" },
  lbl: { display: "block", fontWeight: 800, fontSize: 13, color: "#334155", margin: "10px 0 5px" },
  ta: { width: "100%", padding: 10, border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit" },
  inp: { width: "100%", padding: "9px 11px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, boxSizing: "border-box" },
  radio: { display: "flex", alignItems: "center", gap: 6, cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 4 },
  th: { border: "1px solid #cbd5e1", background: "#f1f5f9", padding: "6px 8px", fontWeight: 800 },
  td: { border: "1px solid #cbd5e1", padding: 3 },
  cell: { width: "100%", border: "none", outline: "none", padding: "7px 6px", background: "transparent", fontSize: 13, boxSizing: "border-box" },
  x: { border: "none", background: "#fee2e2", color: "#b91c1c", borderRadius: 6, padding: "3px 7px", cursor: "pointer", fontWeight: 800 },
  add: { marginTop: 8, border: "1px dashed #94a3b8", background: "#f8fafc", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontWeight: 800 },
  ghost: { background: "#fff", color: "#334155", border: "1px solid #cbd5e1", padding: "10px 16px", borderRadius: 10, fontWeight: 800, cursor: "pointer" },
  primary: { background: "linear-gradient(90deg,#b91c1c,#dc2626)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontWeight: 900, cursor: "pointer" },
};
