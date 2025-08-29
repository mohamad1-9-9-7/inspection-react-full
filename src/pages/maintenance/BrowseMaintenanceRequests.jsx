// src/pages/maintenance/BrowseMaintenanceRequests.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ================== API ================== */
const API_BASE = process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, cache: "no-store", ...opts });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${opts.method || "GET"} ${url} -> ${res.status} ${res.statusText}\n${t}`);
  }
  try { return await res.json(); } catch { return { ok: true }; }
}

/** util: حوّل أي قيمة وقت لطابع قابل للمقارنة */
function toTs(x) {
  if (!x) return 0;
  if (typeof x === "number") return x;
  if (typeof x === "string" && /^[a-f0-9]{24}$/i.test(x)) return parseInt(x.slice(0, 8), 16) * 1000;
  const n = Date.parse(x);
  return Number.isFinite(n) ? n : 0;
}
function newer(a, b) {
  const ta = toTs(a?.updatedAt) || toTs(a?.createdAt) || toTs(a?._id) || toTs(a?._clientSavedAt);
  const tb = toTs(b?.updatedAt) || toTs(b?.createdAt) || toTs(b?._id) || toTs(b?._clientSavedAt);
  return tb >= ta ? b : a;
}
const dateOnly = (isoOrYmd) => /^\d{4}-\d{2}-\d{2}$/.test(isoOrYmd || "") ? isoOrYmd : (() => {
  const d = new Date(isoOrYmd || "");
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
})();

/** اجلب طلبات الصيانة من /api/reports?type=maintenance ثم وحّد التكرارات بحسب createdAt (أو clientKey) */
async function fetchMaintenance() {
  const raw = await apiFetch(`${API_BASE}/api/reports?type=maintenance`);
  const arr = Array.isArray(raw) ? raw : (raw?.data ?? []);
  const mapped = (arr || [])
    .filter((r) => r?.payload)
    .map((r) => {
      const p = r.payload || {};
      return {
        _id: r._id,
        _clientSavedAt: p._clientSavedAt,
        createdAt: p.createdAt || r.createdAt,
        reportDate: p.reportDate || p.requestDate || r.reportDate || dateOnly(p.createdAt),
        title: p.title || "",
        description: p.description || "",
        branch: p.branch || "",
        issueType: p.issueType || "",
        reporter: p.reporter || "",
        priority: p.priority || "",
        status: p.status || "قيد التنفيذ / In Progress",
        images: Array.isArray(p.images) ? p.images : [],
        completedAt: p.completedAt || "",
        repairer: p.repairer || "",
        completionNote: p.completionNote || "",
        rejectedAt: p.rejectedAt || "",
        rejectionReason: p.rejectionReason || "",
      };
    });

  // dedupe: استخدم مفتاح createdAt (أقرب شيء فريد) أو _id
  const byKey = new Map();
  for (const rec of mapped) {
    const key = rec.createdAt || rec._id;
    const prev = byKey.get(key);
    byKey.set(key, prev ? newer(prev, rec) : rec);
  }
  // أحدث أولاً
  return Array.from(byKey.values()).sort((a, b) => toTs(b.createdAt) - toTs(a.createdAt));
}

/** تحديث الحالة: نرسل payload كامل كـ "maintenance" (نمط السيرفر) */
async function saveMaintenanceRecord(record) {
  const ymd = record.reportDate || dateOnly(record.createdAt) || dateOnly(new Date().toISOString());
  const payload = {
    ...record,
    reportDate: ymd,
    requestDate: ymd,
    createdAt: record.createdAt || new Date(`${ymd}T12:00:00`).toISOString(),
    _clientSavedAt: Date.now(),
  };
  const body1 = JSON.stringify({ reporter: record.reporter || "system", type: "maintenance", payload });
  const body2 = JSON.stringify({ reporter: record.reporter || "system", payload });
  const attempts = [
    { url: `${API_BASE}/api/reports`, method: "PUT", body: body1 },
    { url: `${API_BASE}/api/reports?type=maintenance`, method: "PUT", body: body2 },
  ];
  let lastErr;
  for (const a of attempts) { try { return await apiFetch(a.url, a); } catch (e) { lastErr = e; } }
  throw lastErr || new Error("Update failed");
}

/* ================== UI ================== */

const BRANCHES = [
  "All / الكل",
  "QCS", "POS 6", "POS 7", "POS 10", "POS 11", "POS 14", "POS 15",
  "POS 16", "POS 17", "POS 19", "POS 21", "POS 24", "POS 25", "POS 37",
  "POS 38", "POS 42", "POS 44", "POS 45", "FTR1", "FTR2"
];

const COLORS = {
  blue: "#2563eb", blueSoft: "#e0e7ff",
  green: "#16a34a", greenSoft: "#dcfce7", greenText: "#166534",
  grayText: "#334155", graySoft: "#f1f5f9"
};

const styles = {
  page: { minHeight: "100vh", background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)", padding: "28px", fontFamily: "Cairo, ui-sans-serif, system-ui", direction: "rtl" },
  shell: { maxWidth: 1150, margin: "0 auto", background: "#fff", padding: "22px", borderRadius: 18, boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  hTitle: { fontSize: 22, fontWeight: 900, color: COLORS.blue },
  sub: { color: "#475569", fontSize: 13 },
  filters: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 14 },
  input: { width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 12, background: "#fff", fontSize: 15 },
  select: { width: "100%", padding: "12px 14px", border: "1px solid #cbd5e1", borderRadius: 12, background: "#fff", fontSize: 15 },
  chip: (bg, fg) => ({ display: "inline-flex", padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, background: bg, color: fg }),
  card: { border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, background: "#fff", boxShadow: "0 2px 12px rgba(2,6,23,0.06)" },
  row: { display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "start" },
  meta: { color: COLORS.grayText, fontSize: 14, lineHeight: 1.9 },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  btn: (bg = COLORS.blue, fg = "#fff") => ({ background: bg, color: fg, border: "none", padding: "10px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 800, fontSize: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", transition: "transform .1s ease" }),
  galleryWrap: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 },
  img: { width: 150, height: 150, objectFit: "cover", borderRadius: 12, border: "1px solid #e2e8f0", cursor: "pointer", boxShadow: "0 2px 8px rgba(2,6,23,0.08)", transition: "transform .15s ease" },
  list: { display: "grid", gap: 14, marginTop: 16 },
  empty: { textAlign: "center", color: "#64748b", padding: "28px 0", fontSize: 16 },
  pill: { background: COLORS.blueSoft, border: "1px solid #c7d2fe", color: COLORS.blue, borderRadius: 999, padding: "6px 12px", fontWeight: 800, fontSize: 13 },
  modalBack: { position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 1000, cursor: "zoom-out" },
  modal: { width: "100%", maxWidth: 880, background: "transparent", borderRadius: 16, padding: 0, boxShadow: "none" },
  modalTitle: { fontWeight: 900, color: "#0f172a", marginBottom: 10, fontSize: 18 },
  label: { fontWeight: 900, color: COLORS.grayText, fontSize: 14, marginBottom: 8, display: "inline-block" },
  toast: { position: "fixed", bottom: 18, right: 18, background: COLORS.blue, color: "#fff", padding: "10px 14px", borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,.25)", fontWeight: 800, zIndex: 70, fontSize: 14 },
  imgPreview: { maxWidth: "95vw", maxHeight: "85vh", borderRadius: 14, boxShadow: "0 12px 48px rgba(0,0,0,.35)", cursor: "default" },
};

/* =============== صغار مساعدات =============== */
const fmt = (iso) => { if (!iso) return "-"; const d = new Date(iso); return isNaN(d) ? "-" : `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`; };

function ImagePreviewModal({ src, onClose }) {
  useEffect(() => { const h = (e) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  if (!src) return null;
  return (
    <div style={styles.modalBack} onClick={onClose} title="انقر للخروج / Click to close">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="preview" style={styles.imgPreview} />
      </div>
    </div>
  );
}
function ImageGallery({ images = [], onClickImage }) {
  if (!images?.length) return null;
  return (
    <div>
      <div style={{ fontSize: 14, color: COLORS.grayText, fontWeight: 900, marginTop: 8 }}>📸 صور وقت الطلب / Request Images</div>
      <div style={styles.galleryWrap}>
        {images.map((src, i) => (
          <img key={i} src={src} alt={`img-${i}`} style={styles.img}
               onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
               onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
               onClick={() => onClickImage?.(src)} loading="lazy" />
        ))}
      </div>
    </div>
  );
}
function CompleteModal({ open, onClose, onConfirm, defaultRepairer = "" }) {
  const [repairer, setRepairer] = useState(defaultRepairer); const [note, setNote] = useState("");
  useEffect(() => { if (open) { setRepairer(defaultRepairer || ""); setNote(""); } }, [open, defaultRepairer]);
  if (!open) return null;
  return (
    <div style={styles.modalBack} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 500, background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 18px 44px rgba(0,0,0,0.18)", cursor: "default", border: `2px solid ${COLORS.greenSoft}` }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTitle}>✅ تأكيد إكمال الطلب / Mark as Completed</div>
        <div>
          <label style={styles.label}>👷 يرجى تأكيد مشرف قسم الصيانة  / Repairer</label>
          <input style={styles.input} value={repairer} onChange={(e) => setRepairer(e.target.value)} placeholder="يرجى تأكيد مشرف قسم الصيانة …" />
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={styles.label}>📝 ملاحظة (اختياري) / Note (optional)</label>
          <textarea style={{ ...styles.input, minHeight: 90, resize: "vertical" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="تفاصيل إضافية…" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <button style={styles.btn(COLORS.graySoft, COLORS.grayText)} onClick={onClose}>إلغاء / Cancel</button>
          <button style={styles.btn(COLORS.green)} onClick={() => {
            if (!repairer.trim()) { alert("يرجى تأكيد مشرف قسم الصيانة / Please enter repairer name."); return; }
            onConfirm({ repairer: repairer.trim(), note: note.trim() });
          }}>تأكيد / Confirm</button>
        </div>
      </div>
    </div>
  );
}
function RejectModal({ open, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) setReason(""); }, [open]);
  if (!open) return null;
  return (
    <div style={styles.modalBack} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 500, background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 18px 44px rgba(0,0,0,0.18)", cursor: "default", border: `2px solid ${COLORS.blueSoft}` }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalTitle}>⛔ رفض الطلب / Reject Request</div>
        <div>
          <label style={styles.label}>سبب الرفض / Rejection Reason</label>
          <textarea style={{ ...styles.input, minHeight: 100, resize: "vertical" }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اكتب سبب الرفض…" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
          <button style={styles.btn(COLORS.graySoft, COLORS.grayText)} onClick={onClose}>إلغاء / Cancel</button>
          <button style={styles.btn("#ef4444")} onClick={() => {
            if (!reason.trim()) { alert("يرجى كتابة سبب الرفض / Please enter a reason."); return; }
            onConfirm(reason.trim());
          }}>رفض / Reject</button>
        </div>
      </div>
    </div>
  );
}

/* =============== الصفحة =============== */
export default function BrowseMaintenanceRequests() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [branch, setBranch] = useState(BRANCHES[0]);
  const [status, setStatus] = useState("All / الكل");
  const [toast, setToast] = useState("");

  const [openComplete, setOpenComplete] = useState(false);
  const [openReject, setOpenReject] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);

  // معاينة الصور
  const [previewSrc, setPreviewSrc] = useState("");

  // فرز (حسب createdAt نفسه الموجود بالملف الأصلي)
  const [sortKey, setSortKey] = useState("day");  // day | month | year | branch
  const [sortDir, setSortDir] = useState("desc"); // asc | desc

  // جلب من السيرفر
  const reload = async () => {
    setErr(""); setLoading(true);
    try {
      const data = await fetchMaintenance();
      setAll(data);
    } catch (e) {
      console.error(e);
      setErr("❌ تعذّر الجلب من السيرفر الخارجي.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  // أدوات فرز (نفس منطقك السابق لكن على بيانات السيرفر)
  const getYear = (iso) => { const d = new Date(iso || ""); return isNaN(d) ? 0 : d.getFullYear(); };
  const getMonthIndex = (iso) => { const d = new Date(iso || ""); return isNaN(d) ? -1 : d.getMonth(); };
  const getDayValue = (iso) => { const d = new Date(iso || ""); return isNaN(d) ? 0 : d.getTime(); };

  const filtered = useMemo(() => {
    let arr = [...all];
    if (branch && branch !== BRANCHES[0]) arr = arr.filter((r) => r.branch === branch);
    if (status && status !== "All / الكل") arr = arr.filter((r) => (r.status || "قيد التنفيذ / In Progress") === status);
    if (q.trim()) {
      const needle = q.toLowerCase();
      arr = arr.filter((r) =>
        [r.title, r.description, r.branch, r.issueType, r.reporter, r.priority, r.status]
          .join(" | ").toLowerCase().includes(needle)
      );
    }

    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (sortKey === "year") {
        const ay = getYear(a.createdAt), by = getYear(b.createdAt);
        if (ay === by) return dir * (getDayValue(a.createdAt) - getDayValue(b.createdAt));
        return dir * (ay - by);
      }
      if (sortKey === "month") {
        const am = getMonthIndex(a.createdAt), bm = getMonthIndex(b.createdAt);
        if (am === bm) return dir * (getDayValue(a.createdAt) - getDayValue(b.createdAt));
        return dir * (am - bm);
      }
      if (sortKey === "day") return dir * (getDayValue(a.createdAt) - getDayValue(b.createdAt));
      if (sortKey === "branch") {
        const ab = (a.branch || "").localeCompare(b.branch || "", "ar");
        if (ab === 0) return dir * (getDayValue(a.createdAt) - getDayValue(b.createdAt));
        return dir * ab;
      }
      return dir * (getDayValue(a.createdAt) - getDayValue(b.createdAt));
    });

    return arr;
  }, [all, q, branch, status, sortKey, sortDir]);

  const statusChip = (s) => {
    const v = s || "قيد التنفيذ / In Progress";
    if (v.includes("Completed") || v.includes("مكتمل")) return styles.chip(COLORS.greenSoft, COLORS.greenText);
    if (v.includes("Rejected") || v.includes("مرفوض")) return styles.chip("#ffe4e6", "#9f1239");
    return styles.chip("#fef3c7", "#92400e");
  };

  const openCompleteFor = (idx) => { setActiveIndex(idx); setOpenComplete(true); };
  const openRejectFor = (idx) => { setActiveIndex(idx); setOpenReject(true); };

  // أكشن: مكتمل
  const handleConfirmComplete = async ({ repairer, note }) => {
    if (activeIndex == null) return;
    const src = filtered[activeIndex];
    const rec = { ...src,
      status: "مكتمل / Completed",
      repairer,
      completionNote: note || "",
      completedAt: new Date().toISOString(),
      rejectedAt: "",
      rejectionReason: "",
    };
    try {
      await saveMaintenanceRecord(rec);
      await reload();
      setToast(`✅ تم وضع الطلب كمكتمل • Completed at ${fmt(rec.completedAt)}`);
    } catch (e) {
      console.error(e);
      setToast("❌ فشل تحديث الحالة على السيرفر");
    } finally {
      setTimeout(() => setToast(""), 2800);
      setOpenComplete(false); setActiveIndex(null);
    }
  };

  // أكشن: رفض
  const handleConfirmReject = async (reason) => {
    if (activeIndex == null) return;
    const src = filtered[activeIndex];
    const rec = { ...src,
      status: "مرفوض / Rejected",
      rejectionReason: reason,
      rejectedAt: new Date().toISOString(),
      completedAt: "",
      completionNote: "",
      repairer: src.repairer || "",
    };
    try {
      await saveMaintenanceRecord(rec);
      await reload();
      setToast("⛔ تم رفض الطلب مع تسجيل السبب.");
    } catch (e) {
      console.error(e);
      setToast("❌ فشل تحديث الحالة على السيرفر");
    } finally {
      setTimeout(() => setToast(""), 2500);
      setOpenReject(false); setActiveIndex(null);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.header}>
          <div>
            <div style={styles.hTitle}>📋 تصفّح طلبات الصيانة / Browse Maintenance Requests</div>
            <div style={styles.sub}>عرض وتحديث الحالة يتمان مباشرة من السيرفر الخارجي</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={styles.pill}>إجمالي / Total: {filtered.length}</span>
          </div>
        </div>

        {/* فلاتر + أدوات الفرز */}
        <div style={styles.filters}>
          <div>
            <label style={styles.label}>🔎 بحث / Search</label>
            <input style={styles.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="عنوان، وصف، فرع، مبلّغ…" />
          </div>

          <div>
            <label style={styles.label}>🏢 فرع / Branch</label>
            <select style={styles.select} value={branch} onChange={(e) => setBranch(e.target.value)}>
              {BRANCHES.map((b) => (<option key={b} value={b}>{b}</option>))}
            </select>
          </div>

          <div>
            <label style={styles.label}>📌 حالة / Status</label>
            <select style={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>All / الكل</option>
              <option>قيد التنفيذ / In Progress</option>
              <option>مكتمل / Completed</option>
              <option>مرفوض / Rejected</option>
            </select>
          </div>

          {/* أدوات الفرز */}
          <div>
            <label style={styles.label}>↕️ فرز حسب / Sort By</label>
            <select style={styles.select} value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
              <option value="year">السنة / Year</option>
              <option value="month">الشهر / Month</option>
              <option value="day">اليوم / Day</option>
              <option value="branch">الفرع / Branch</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>⬆️⬇️ اتجاه الفرز / Direction</label>
            <select style={styles.select} value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
              <option value="desc">تنازلي (الأحدث أولًا)</option>
              <option value="asc">تصاعدي (الأقدم أولًا)</option>
            </select>
          </div>
        </div>

        {/* حالات التحميل */}
        {loading && <div style={{ padding: 18, color: "#475569" }}>⏳ جاري الجلب من السيرفر…</div>}
        {err && !loading && <div style={{ padding: 18, background: "#fee2e2", color: "#991b1b", borderRadius: 12 }}>{err}</div>}

        {!loading && !err && (!filtered.length ? (
          <div style={styles.empty}>لا توجد طلبات مطابقة / No matching requests</div>
        ) : (
          <div style={styles.list}>
            {filtered.map((r, i) => (
              <div key={`${r.createdAt || i}-${i}`} style={{ ...styles.card, borderColor: COLORS.blueSoft }}>
                <div style={styles.row}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 900, color: COLORS.grayText, fontSize: 18 }}>🛠️ {r.title || "-"}</div>
                      <span style={statusChip(r.status)}>{r.status || "قيد التنفيذ / In Progress"}</span>
                      {r.priority ? <span style={styles.chip(COLORS.blueSoft, COLORS.blue)}>⚠️ {r.priority}</span> : null}
                    </div>

                    <div style={{ color: "#475569", marginTop: 8, fontSize: 15 }}>{r.description || "-"}</div>

                    <div style={{ ...styles.meta, marginTop: 10 }}>
                      <div><strong>📍 الفرع / Branch:</strong> {r.branch || "-"}</div>
                      <div><strong>🧩 نوع العطل / Issue Type:</strong> {r.issueType || "-"}</div>
                      <div><strong>👤 المبلّغ / Reporter:</strong> {r.reporter || "-"}</div>
                      <div><strong>📅 تاريخ الطلب / Request Date:</strong> {r.reportDate || dateOnly(r.createdAt) || "-"}</div>
                      <div><strong>🕒 Created At:</strong> {fmt(r.createdAt)}</div>
                      {r.completedAt && <div><strong>✅ Completed At:</strong> {fmt(r.completedAt)}</div>}
                      {r.repairer && <div><strong>👷 Repairer:</strong> {r.repairer}</div>}
                      {r.rejectionReason && <div><strong>🛑 Rejection Reason:</strong> {r.rejectionReason}</div>}
                    </div>

                    <ImageGallery images={r.images} onClickImage={(src) => setPreviewSrc(src)} />
                  </div>

                  <div style={styles.actions}>
                    {(r.status || "قيد التنفيذ / In Progress").includes("In Progress") && (
                      <button
                        style={styles.btn(COLORS.green)}
                        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(.98)")}
                        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        onClick={() => { setActiveIndex(i); setOpenComplete(true); }}
                      >
                        ✅ وضع كمكتمل / Mark Completed
                      </button>
                    )}
                    {!((r.status || "").includes("Rejected")) && (
                      <button
                        style={styles.btn("#ef4444")}
                        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(.98)")}
                        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        onClick={() => { setActiveIndex(i); setOpenReject(true); }}
                      >
                        ⛔ رفض / Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {toast && <div style={styles.toast}>{toast}</div>}
      </div>

      {/* مودالات الحالة */}
      <CompleteModal
        open={openComplete}
        onClose={() => { setOpenComplete(false); setActiveIndex(null); }}
        onConfirm={handleConfirmComplete}
      />
      <RejectModal
        open={openReject}
        onClose={() => { setOpenReject(false); setActiveIndex(null); }}
        onConfirm={handleConfirmReject}
      />

      {/* مودال معاينة الصور */}
      <ImagePreviewModal src={previewSrc} onClose={() => setPreviewSrc("")} />
    </div>
  );
}
