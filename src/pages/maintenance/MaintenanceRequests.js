// src/pages/maintenance/MaintenanceRequests.jsx
import React, { useState } from "react";

/* ==================== API ==================== */
const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${opts.method || "GET"} ${url} -> ${res.status} ${res.statusText}\n${t}`);
  }
  try { return await res.json(); } catch { return { ok: true }; }
}

// الحفظ على السيرفر الخارجي فقط (مطلوب: payload.reportDate)
async function saveMaintenanceToServer(form) {
  const ymd =
    form.date && /^\d{4}-\d{2}-\d{2}$/.test(form.date)
      ? form.date
      : new Date().toISOString().slice(0, 10);

  const createdAtISO = new Date(`${ymd}T12:00:00`).toISOString();

  const payload = {
    ...form,
    requestDate: ymd,       // للعرض
    reportDate: ymd,        // ✅ شرط السيرفر
    createdAt: createdAtISO,
    status: form.status || "قيد التنفيذ / In Progress",
    _clientSavedAt: Date.now(),
  };

  const reporter = form.reporter || "anonymous";
  const attempts = [
    { url: `${API_BASE}/api/reports`, method: "PUT", body: JSON.stringify({ reporter, type: "maintenance", payload }) },
    { url: `${API_BASE}/api/reports?type=maintenance`, method: "PUT", body: JSON.stringify({ reporter, payload }) },
  ];

  let lastErr = null;
  for (const a of attempts) {
    try { return await apiFetch(a.url, a); } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("Save failed");
}

/* ==================== UI DATA ==================== */
const BRANCHES = [
  "QCS","POS 6","POS 7","POS 10","POS 11","POS 14","POS 15","POS 16","POS 17",
  "POS 19","POS 21","POS 24","POS 25","POS 37","POS 38","POS 42","POS 44","POS 45","FTR1","FTR2",
];
const ISSUE_TYPES = [
  { ar: "مشكلة نظافة", en: "Cleaning Issue" },
  { ar: "مشكلة برادات", en: "Refrigerator Issue" },
  { ar: "مشكلة كهرباء", en: "Electrical Issue" },
  { ar: "مشكلة مياه", en: "Water Issue" },
  { ar: "أخرى", en: "Other" },
];
const PRIORITIES = [
  { ar: "منخفضة", en: "Low" },
  { ar: "متوسطة", en: "Medium" },
  { ar: "عالية", en: "High" },
  { ar: "طارئة", en: "Urgent" },
];

/* ===== إعدادات توحيد أبعاد الصور =====
   mode: 'cover' للقصّ المركزي بدون تمديد (شكل احترافي)
         'contain' لتبطين بخلفية بيضاء بدون قصّ */
const IMG_CFG = {
  width: 180,
  height: 150,
  mode: "cover",        // بدّلها إلى "contain" إن أردت عدم القص
  type: "image/jpeg",
  quality: 0.9,
  bg: "#ffffff",        // تُستخدم مع contain فقط
};
const MAX_IMAGES = 20;

/* ===== Helpers ===== */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// يعيد DataURL موحّد الأبعاد حسب IMG_CFG
async function resizeFileToDataURL(file, cfg = IMG_CFG) {
  const srcDataURL = await readFileAsDataURL(file);
  const img = await loadImage(srcDataURL);

  const { width: W, height: H, mode, type, quality, bg } = cfg;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  if (mode === "contain") {
    // مبدئيًا خلفية بيضاء
    ctx.fillStyle = bg || "#fff";
    ctx.fillRect(0, 0, W, H);
    const scale = Math.min(W / img.width, H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    // cover (اقتصاص مركزي)
    const scale = Math.max(W / img.width, H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  return canvas.toDataURL(type || "image/jpeg", quality ?? 0.9);
}

/* ==================== PAGE ==================== */
export default function MaintenanceRequests() {
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    title: "", description: "", branch: "", issueType: "", reporter: "",
    priority: "", images: [], date: today,
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [err, setErr] = useState("");

  const handleChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  // ✅ يدعم اختيار متعدد وعلى دفعات + يجعل كل الصور بنفس الأبعاد (IMG_CFG)
  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // تحويل كل ملف إلى DataURL موحّد الأبعاد
    const normalized = await Promise.all(
      files.map((f) => resizeFileToDataURL(f, IMG_CFG))
    );

    setForm((s) => {
      const merged = [...(s.images || []), ...normalized];
      const unique = Array.from(new Set(merged)); // إزالة تكرارات بسيطة
      return { ...s, images: unique.slice(0, MAX_IMAGES) };
    });

    // تنظيف input ليسمح باختيار نفس الملف مرة أخرى
    e.target.value = "";
  };

  const removeImage = (index) => {
    setForm((s) => {
      const next = [...(s.images || [])];
      next.splice(index, 1);
      return { ...s, images: next };
    });
  };

  const resetForm = () =>
    setForm({ title: "", description: "", branch: "", issueType: "", reporter: "", priority: "", images: [], date: today });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setToast(""); setSubmitting(true);
    try {
      await saveMaintenanceToServer(form);
      setToast("✅ تم حفظ الطلب على السيرفر الخارجي");
      resetForm();
    } catch (ex) {
      setErr("❌ فشل الحفظ على السيرفر الخارجي.\n" + (ex?.message || "")); console.error(ex);
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(""), 3000);
    }
  };

  return (
    <div style={sx.page}>
      {/* شريط تقدم بسيط عند الإرسال */}
      <div style={{position:"fixed",top:0,left:0,height:3,width:submitting?"100%":0,background:"#2563eb",transition:"width .25s ease",zIndex:50}}/>
      <div style={sx.shell}>
        <div style={sx.header}>
          <div>
            <h2 style={sx.title}>Create Maintenance Request / إنشاء طلب صيانة</h2>
            <div style={sx.sub}>الحفظ يتم مباشرة على السيرفر الخارجي</div>
          </div>
        </div>

        {err && <div style={sx.alertError}>{err}</div>}
        {toast && <div style={sx.alertOk}>{toast}</div>}

        <form onSubmit={handleSubmit} style={sx.form}>
          {/* معلومات أساسية */}
          <div style={sx.sectionHead}>🧾 Basic Info / المعلومات الأساسية</div>

          <div className="grid">
            <div style={sx.field}>
              <label style={sx.label}>📅 Request Date / تاريخ الطلب</label>
              <input className="mr-input" type="date" name="date" value={form.date} onChange={handleChange} required style={sx.input}/>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>🏢 Branch / الفرع</label>
              <select className="mr-input" name="branch" value={form.branch} onChange={handleChange} required style={sx.input}>
                <option value="">-- Select Branch --</option>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>⚙️ Issue Type / نوع العطل</label>
              <select className="mr-input" name="issueType" value={form.issueType} onChange={handleChange} required style={sx.input}>
                <option value="">-- Select Issue --</option>
                {ISSUE_TYPES.map((t, i) => <option key={i} value={t.en}>{t.ar} / {t.en}</option>)}
              </select>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>🚨 Priority / درجة الأهمية</label>
              <select className="mr-input" name="priority" value={form.priority} onChange={handleChange} required style={sx.input}>
                <option value="">-- Select Priority --</option>
                {PRIORITIES.map((p, i) => <option key={i} value={p.en}>{p.ar} / {p.en}</option>)}
              </select>
            </div>

            <div style={sx.field}>
              <label style={sx.label}>👤 Reporter / المبلّغ</label>
              <input className="mr-input" name="reporter" value={form.reporter} onChange={handleChange} required placeholder="اسمك" style={sx.input}/>
            </div>
          </div>

          {/* تفاصيل الطلب */}
          <div style={sx.sectionHead}>🛠️ Details / تفاصيل الطلب</div>
          <div className="grid">
            <div style={sx.field}>
              <label style={sx.label}>📌 Title / عنوان الطلب</label>
              <input className="mr-input" name="title" value={form.title} onChange={handleChange} required placeholder="مثال: عطل ثلاجة - قسم اللحوم" style={sx.input}/>
            </div>

            <div style={{ ...sx.field, gridColumn: "1 / -1" }}>
              <label style={sx.label}>📝 Description / وصف الطلب</label>
              <textarea className="mr-textarea" name="description" value={form.description} onChange={handleChange} required rows={4} placeholder="اشرح المشكلة بإيجاز…" style={sx.textarea}/>
            </div>

            <div style={{ ...sx.field, gridColumn: "1 / -1" }}>
              <label style={sx.label}>📸 Images / صور وقت الطلب</label>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
              />
              <div style={sx.hint}>
                كل الصور ستُحَوَّل تلقائيًا إلى {IMG_CFG.width}×{IMG_CFG.height} ({IMG_CFG.mode}) قبل الحفظ. الحد الأقصى: {MAX_IMAGES}.
              </div>

              {!!form.images?.length && (
                <>
                  <div className="mr-grid-images">
                    {form.images.map((src, i) => (
                      <div key={i} className="mr-img-tile" title={`Image ${i+1}`}>
                        <img src={src} alt={`img-${i}`} />
                        <button
                          type="button"
                          className="mr-img-remove"
                          onClick={() => removeImage(i)}
                          title="حذف الصورة"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <div style={sx.hint}>تم إرفاق {form.images.length} صورة</div>
                </>
              )}
            </div>
          </div>

          {/* أزرار */}
          <div style={sx.actions}>
            <button type="button" onClick={resetForm} disabled={submitting} style={sx.btnGhost} className="mr-btnGhost" title="مسح الحقول">🧹 Clear / مسح</button>
            <button type="submit" style={sx.btnPrimary} className="mr-btnPrimary" disabled={submitting}>
              {submitting ? "جارٍ الحفظ…" : "💾 Save / حفظ الطلب"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ==================== styles ==================== */
const sx = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(900px 450px at -10% -10%, rgba(255,255,255,.18), transparent 60%)," +
      "radial-gradient(800px 400px at 110% 0%, rgba(255,255,255,.12), transparent 62%)," +
      "linear-gradient(135deg,#3b82f6 0%, #7c3aed 60%, #9333ea 100%)",
    padding: 24,
    direction: "rtl",
    fontFamily: "Cairo, ui-sans-serif, system-ui",
  },
  shell: {
    maxWidth: 980,
    margin: "24px auto",
    background: "rgba(255,255,255,.88)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    padding: 24,
    borderRadius: 24,
    boxShadow: "0 20px 60px rgba(2,6,23,.18)",
    border: "1px solid rgba(255,255,255,.65)",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 },
  title: { margin: 0, fontSize: 22, fontWeight: 900, color: "#0f172a" },
  sub: { color: "#334155", fontSize: 13 },
  alertError: { marginTop: 12, whiteSpace: "pre-wrap", background: "#fee2e2", color: "#9f1239", border: "1px solid #fecaca", borderRadius: 12, padding: "10px 12px", fontWeight: 700 },
  alertOk: { marginTop: 12, background: "#dcfce7", color: "#166534", border: "1px solid #86efac", borderRadius: 12, padding: "10px 12px", fontWeight: 700 },
  sectionHead: {
    marginTop: 18, marginBottom: 10, fontWeight: 900, color: "#0f172a",
    background: "linear-gradient(90deg,#eef2ff,#e9d5ff)",
    border: "1px solid #e0e7ff", display: "inline-block",
    padding: "6px 12px", borderRadius: 999, fontSize: 14,
  },
  form: { marginTop: 10 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontWeight: 800, color: "#0f172a", fontSize: 14 },
  input: {
    width: "100%", padding: "12px 14px",
    border: "1px solid #cbd5e1", borderRadius: 14,
    background: "#f8fafc", fontSize: 15,
    transition: "box-shadow .15s ease, border-color .15s ease, transform .05s ease",
  },
  textarea: {
    width: "100%", padding: "12px 14px",
    border: "1px solid #cbd5e1", borderRadius: 14,
    background: "#f8fafc", fontSize: 15, resize: "vertical", minHeight: 120,
    transition: "box-shadow .15s ease, border-color .15s ease",
  },
  hint: { marginTop: 6, fontSize: 13, color: "#64748b" },
  actions: { marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" },
  btnPrimary: {
    background: "linear-gradient(90deg,#2563eb,#7c3aed)",
    color: "#fff", border: "none", padding: "12px 18px",
    borderRadius: 14, fontWeight: 900, fontSize: 15, cursor: "pointer",
    minWidth: 170, boxShadow: "0 8px 20px rgba(37,99,235,.25)", transition: "transform .06s ease",
  },
  btnGhost: {
    background: "rgba(255,255,255,.6)", color: "#334155",
    border: "1px solid #e2e8f0", padding: "12px 18px",
    borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: "pointer",
    transition: "transform .06s ease",
  },
};

/* شبكة + تحسينات + شبكة صور */
const style = document.createElement("style");
style.innerHTML = `
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }

  .mr-input, .mr-textarea { outline: none; }
  .mr-input:hover, .mr-textarea:hover { border-color: #94a3b8; }
  .mr-input:focus, .mr-textarea:focus {
    border-color: #60a5fa !important;
    box-shadow: 0 0 0 4px rgba(59,130,246,.15);
    background: #ffffff;
  }

  .mr-btnPrimary:hover { transform: translateY(-1px); }
  .mr-btnPrimary:active { transform: translateY(0px) scale(.99); }
  .mr-btnGhost:hover    { transform: translateY(-1px); }
  .mr-btnGhost:active   { transform: translateY(0px) scale(.99); }

  /* شبكة معاينات الصور */
  .mr-grid-images { display:flex; flex-wrap:wrap; gap:10px; margin-top:8px; }
  .mr-img-tile { position:relative; width:120px; height:120px; border-radius:14px; overflow:hidden;
                 border:1px solid #e2e8f0; box-shadow:0 2px 8px rgba(2,6,23,0.08); background:#fff; }
  .mr-img-tile img { width:100%; height:100%; object-fit:cover; display:block; }
  .mr-img-remove { position:absolute; top:6px; left:6px; background:rgba(239,68,68,.95); color:#fff;
                   border:none; border-radius:10px; padding:2px 8px; font-weight:800; cursor:pointer; }
`;
if (typeof document !== "undefined" && !document.getElementById("mr-ui-style")) {
  style.id = "mr-ui-style";
  document.head.appendChild(style);
}
