// FSMS Communication Matrix / Log - input form (ISO 22000:2018 Clause 7.4)

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "fsms_communication_log";

const empty = {
  communicationDate: new Date().toISOString().slice(0, 10),
  communicationNo: "",
  direction: "Internal",
  partyCategory: "FSMS Team",
  partyName: "",
  contactPerson: "",
  channel: "Email",
  topic: "m",
  subject: "",
  messageSummary: "",
  communicator: "",
  responseRequired: "No",
  dueDate: "",
  responseSummary: "",
  status: "Open",
  closedDate: "",
  verifiedBy: "",
  linkedModule: "None",
  linkedReference: "",
  foodSafetyConcern: "No",
  fsmsImpact: "Yes",
  escalation: "No",
  notes: "",
};

const TOPICS = [
  { v: "external_customer", en: "External - customer product / food safety information", ar: "خارجي - معلومات المنتج وسلامة الغذاء للعميل" },
  { v: "external_provider", en: "External - provider / contractor / supplier", ar: "خارجي - مورد / مقاول / مزود خدمة" },
  { v: "external_authority", en: "External - authority / regulator / laboratory", ar: "خارجي - جهة رسمية / مختبر" },
  { v: "a", en: "a) Products or new products", ar: "أ) المنتجات أو المنتجات الجديدة" },
  { v: "b", en: "b) Raw materials, ingredients and services", ar: "ب) المواد الخام والمكونات والخدمات" },
  { v: "c", en: "c) Production systems and equipment", ar: "ج) أنظمة الإنتاج والمعدات" },
  { v: "d", en: "d) Premises, equipment location, surrounding environment", ar: "د) مواقع الإنتاج وموقع المعدات والبيئة المحيطة" },
  { v: "e", en: "e) Cleaning and sanitation programmes", ar: "هـ) برامج التنظيف والتعقيم" },
  { v: "f", en: "f) Packaging, storage and distribution systems", ar: "و) أنظمة التعبئة والتخزين والتوزيع" },
  { v: "g", en: "g) Competencies / responsibilities / authorities", ar: "ز) الكفاءات أو المسؤوليات أو الصلاحيات" },
  { v: "h", en: "h) Statutory and regulatory requirements", ar: "ح) المتطلبات القانونية والتنظيمية" },
  { v: "i", en: "i) Food safety hazards and control measures", ar: "ط) مخاطر سلامة الغذاء وإجراءات التحكم" },
  { v: "j", en: "j) Customer, sector and other requirements", ar: "ي) متطلبات العملاء والقطاع وغيرها" },
  { v: "k", en: "k) Relevant enquiries from external parties", ar: "ك) الاستفسارات والمراسلات من الأطراف الخارجية" },
  { v: "l", en: "l) Complaints / alerts indicating food safety hazards", ar: "ل) الشكاوى أو التنبيهات التي تشير لمخاطر سلامة الغذاء" },
  { v: "m", en: "m) Other conditions impacting food safety", ar: "م) ظروف أخرى تؤثر على سلامة الغذاء" },
];

const partyCategories = [
  "FSMS Team", "Top Management", "QA", "HSE", "Production", "Warehouse",
  "Logistics", "Procurement", "Customer", "Supplier", "Contractor",
  "Regulatory Authority", "Laboratory", "Maintenance", "Training", "Other",
];

const channels = ["Email", "Phone", "WhatsApp", "Meeting", "Memo", "Training", "Notice Board", "Portal", "Letter", "Other"];
const linkedModules = ["None", "Customer Complaints", "Change Management", "MRM", "HSE Incident", "NCR", "CAPA", "Supplier Evaluation", "Recall", "Training", "Internal Audit", "Other"];

const LBL = {
  ar: {
    title: "سجل ومصفوفة التواصل FSMS",
    subtitle: "ISO 22000:2018 - البند 7.4",
    details: "تفاصيل التواصل",
    date: "تاريخ التواصل *",
    number: "رقم السجل",
    direction: "نوع التواصل",
    internal: "داخلي",
    external: "خارجي",
    partyCategory: "فئة الطرف",
    partyName: "اسم الطرف / القسم *",
    partyPh: "مثال: QA Team / Supplier Name / Dubai Municipality",
    contactPerson: "الشخص المعني",
    channel: "القناة",
    topic: "موضوع ISO 7.4.3 / التواصل الخارجي",
    subject: "العنوان / الموضوع *",
    summary: "ملخص الرسالة",
    communicator: "من قام بالتواصل *",
    responseRequired: "هل مطلوب رد أو متابعة؟",
    dueDate: "تاريخ الاستحقاق",
    responseSummary: "ملخص الرد / المتابعة",
    closure: "الإغلاق والربط",
    status: "الحالة",
    closedDate: "تاريخ الإغلاق",
    verifiedBy: "تم التحقق بواسطة",
    linkedModule: "الموديول المرتبط",
    linkedReference: "رقم/مرجع السجل المرتبط",
    foodSafetyConcern: "هل يوجد مؤشر خطر سلامة غذاء؟",
    fsmsImpact: "هل يؤثر على FSMS؟",
    escalation: "هل تم التصعيد؟",
    notes: "ملاحظات",
    save: "حفظ سجل التواصل",
  },
  en: {
    title: "FSMS Communication Matrix / Log",
    subtitle: "ISO 22000:2018 - Clause 7.4",
    details: "Communication Details",
    date: "Communication Date *",
    number: "Record No.",
    direction: "Direction",
    internal: "Internal",
    external: "External",
    partyCategory: "Party Category",
    partyName: "Party / Department *",
    partyPh: "e.g., QA Team / Supplier Name / Dubai Municipality",
    contactPerson: "Contact Person",
    channel: "Channel",
    topic: "ISO 7.4.3 Topic / External Communication",
    subject: "Subject *",
    summary: "Message Summary",
    communicator: "Communicated By *",
    responseRequired: "Response / follow-up required?",
    dueDate: "Due Date",
    responseSummary: "Response / Follow-up Summary",
    closure: "Closure & Linkage",
    status: "Status",
    closedDate: "Closed Date",
    verifiedBy: "Verified By",
    linkedModule: "Linked Module",
    linkedReference: "Linked Record Ref.",
    foodSafetyConcern: "Food safety hazard indicated?",
    fsmsImpact: "Impacts FSMS?",
    escalation: "Escalated?",
    notes: "Notes",
    save: "Save Communication Record",
  },
};

const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "linear-gradient(180deg,#eef7ff 0%,#f8fafc 100%)", color: "#0f172a" },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10, padding: "12px 16px", background: "rgba(255,255,255,0.94)", borderRadius: 14, border: "1px solid #bae6fd", boxShadow: "0 8px 24px rgba(2,132,199,0.10)" },
  title: { fontSize: 22, fontWeight: 950, color: "#075985", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#0369a1", marginTop: 4, fontWeight: 700 },
  card: { background: "#fff", borderRadius: 14, padding: 18, marginBottom: 12, border: "1px solid #bae6fd", boxShadow: "0 6px 16px rgba(2,132,199,0.06)" },
  sectionTitle: { fontSize: 15, fontWeight: 950, color: "#075985", margin: "0 0 12px", paddingBottom: 6, borderBottom: "2px solid #0ea5e9" },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#075985", marginBottom: 4, marginTop: 10 },
  input: { width: "100%", padding: "9px 11px", border: "1.5px solid #bae6fd", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: "#fff" },
  textarea: { width: "100%", padding: "10px 12px", border: "1.5px solid #bae6fd", borderRadius: 10, fontSize: 13, lineHeight: 1.55, fontFamily: "inherit", minHeight: 82, resize: "vertical", background: "#fff" },
  select: { width: "100%", padding: "9px 11px", border: "1.5px solid #bae6fd", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fff" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  btn: (kind) => {
    const map = {
      primary: { bg: "linear-gradient(180deg,#0ea5e9,#0284c7)", color: "#fff", border: "#0369a1" },
      secondary: { bg: "#fff", color: "#075985", border: "#bae6fd" },
    };
    const c = map[kind] || map.primary;
    return { background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, padding: "9px 18px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13 };
  },
};

function nextRecordNo(records, year) {
  const re = new RegExp(`^COM-${year}-(\\d+)$`);
  let max = 0;
  for (const rec of Array.isArray(records) ? records : []) {
    const n = String(rec?.payload?.communicationNo || "").trim();
    const m = re.exec(n);
    if (m) max = Math.max(max, parseInt(m[1], 10) || 0);
  }
  return `COM-${year}-${String(max + 1).padStart(4, "0")}`;
}

export default function CommunicationLogInput() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const { t, lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";
  const tx = LBL[isAr ? "ar" : "en"];
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!editId) return;
    fetch(`${API_BASE}/api/reports/${encodeURIComponent(editId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const p = j?.payload || j?.data?.payload || {};
        setForm({ ...empty, ...p });
      })
      .catch(() => {});
  }, [editId]);

  useEffect(() => {
    if (editId) return;
    let cancelled = false;
    const year = String(empty.communicationDate).slice(0, 4);
    (async () => {
      try {
        setGenerating(true);
        const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
        if (!cancelled) setForm((f) => (f.communicationNo ? f : { ...f, communicationNo: nextRecordNo(arr, year) }));
      } catch {
        if (!cancelled) setForm((f) => (f.communicationNo ? f : { ...f, communicationNo: `COM-${year}-0001` }));
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editId]);

  function setField(key, value) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "status" && value === "Closed" && !next.closedDate) {
        next.closedDate = new Date().toISOString().slice(0, 10);
      }
      if (key === "responseRequired" && value === "No") {
        next.dueDate = "";
      }
      return next;
    });
  }

  async function save() {
    if (!form.communicationDate || !form.partyName.trim() || !form.subject.trim() || !form.communicator.trim()) {
      alert(t("requiredField"));
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `${API_BASE}/api/reports/${encodeURIComponent(editId)}` : `${API_BASE}/api/reports`;
      const method = editId ? "PUT" : "POST";
      const payload = { ...form, savedAt: Date.now() };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: form.communicator || "fsms", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      navigate("/haccp-iso/communication-log/view");
    } catch (e) {
      alert(t("saveError") + ": " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{tx.title}</div>
            <div style={S.subtitle}>{tx.subtitle}</div>
            <HaccpLinkBadge clauses={["7.4"]} label={isAr ? "التواصل" : "Communication"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/communication-log/view")}>{t("past")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{tx.details}</div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{tx.date}</label>
              <input type="date" style={S.input} value={form.communicationDate} onChange={(e) => setField("communicationDate", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{tx.number}</label>
              <input style={{ ...S.input, background: "#f8fafc", color: "#475569" }} value={form.communicationNo} readOnly placeholder={generating ? "..." : "COM-YYYY-0001"} />
            </div>
            <div>
              <label style={S.label}>{tx.direction}</label>
              <select style={S.select} value={form.direction} onChange={(e) => setField("direction", e.target.value)}>
                <option value="Internal">{tx.internal}</option>
                <option value="External">{tx.external}</option>
              </select>
            </div>
          </div>

          <div style={S.row3}>
            <div>
              <label style={S.label}>{tx.partyCategory}</label>
              <select style={S.select} value={form.partyCategory} onChange={(e) => setField("partyCategory", e.target.value)}>
                {partyCategories.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>{tx.partyName}</label>
              <input style={S.input} value={form.partyName} onChange={(e) => setField("partyName", e.target.value)} placeholder={tx.partyPh} />
            </div>
            <div>
              <label style={S.label}>{tx.contactPerson}</label>
              <input style={S.input} value={form.contactPerson} onChange={(e) => setField("contactPerson", e.target.value)} />
            </div>
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{tx.channel}</label>
              <select style={S.select} value={form.channel} onChange={(e) => setField("channel", e.target.value)}>
                {channels.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>{tx.topic}</label>
              <select style={S.select} value={form.topic} onChange={(e) => setField("topic", e.target.value)}>
                {TOPICS.map((x) => <option key={x.v} value={x.v}>{isAr ? x.ar : x.en}</option>)}
              </select>
            </div>
          </div>

          <label style={S.label}>{tx.subject}</label>
          <input style={S.input} value={form.subject} onChange={(e) => setField("subject", e.target.value)} />

          <label style={S.label}>{tx.summary}</label>
          <textarea style={S.textarea} value={form.messageSummary} onChange={(e) => setField("messageSummary", e.target.value)} />

          <div style={S.row3}>
            <div>
              <label style={S.label}>{tx.communicator}</label>
              <input style={S.input} value={form.communicator} onChange={(e) => setField("communicator", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{tx.responseRequired}</label>
              <select style={S.select} value={form.responseRequired} onChange={(e) => setField("responseRequired", e.target.value)}>
                <option value="No">{isAr ? "لا" : "No"}</option>
                <option value="Yes">{isAr ? "نعم" : "Yes"}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{tx.dueDate}</label>
              <input type="date" style={S.input} value={form.dueDate} disabled={form.responseRequired !== "Yes"} onChange={(e) => setField("dueDate", e.target.value)} />
            </div>
          </div>

          <label style={S.label}>{tx.responseSummary}</label>
          <textarea style={S.textarea} value={form.responseSummary} onChange={(e) => setField("responseSummary", e.target.value)} />
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{tx.closure}</div>
          <div style={S.row3}>
            <div>
              <label style={S.label}>{tx.status}</label>
              <select style={S.select} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option value="Open">{isAr ? "مفتوح" : "Open"}</option>
                <option value="InProgress">{isAr ? "قيد المتابعة" : "In progress"}</option>
                <option value="Escalated">{isAr ? "مصعّد" : "Escalated"}</option>
                <option value="Closed">{isAr ? "مغلق" : "Closed"}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{tx.closedDate}</label>
              <input type="date" style={S.input} value={form.closedDate} onChange={(e) => setField("closedDate", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>{tx.verifiedBy}</label>
              <input style={S.input} value={form.verifiedBy} onChange={(e) => setField("verifiedBy", e.target.value)} />
            </div>
          </div>

          <div style={S.row}>
            <div>
              <label style={S.label}>{tx.linkedModule}</label>
              <select style={S.select} value={form.linkedModule} onChange={(e) => setField("linkedModule", e.target.value)}>
                {linkedModules.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>{tx.linkedReference}</label>
              <input style={S.input} value={form.linkedReference} onChange={(e) => setField("linkedReference", e.target.value)} placeholder="CC-2026-0001 / NCR-..." />
            </div>
          </div>

          <div style={S.row3}>
            <div>
              <label style={S.label}>{tx.foodSafetyConcern}</label>
              <select style={S.select} value={form.foodSafetyConcern} onChange={(e) => setField("foodSafetyConcern", e.target.value)}>
                <option value="No">{isAr ? "لا" : "No"}</option>
                <option value="Yes">{isAr ? "نعم" : "Yes"}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{tx.fsmsImpact}</label>
              <select style={S.select} value={form.fsmsImpact} onChange={(e) => setField("fsmsImpact", e.target.value)}>
                <option value="Yes">{isAr ? "نعم" : "Yes"}</option>
                <option value="No">{isAr ? "لا" : "No"}</option>
              </select>
            </div>
            <div>
              <label style={S.label}>{tx.escalation}</label>
              <select style={S.select} value={form.escalation} onChange={(e) => setField("escalation", e.target.value)}>
                <option value="No">{isAr ? "لا" : "No"}</option>
                <option value="Yes">{isAr ? "نعم" : "Yes"}</option>
              </select>
            </div>
          </div>

          <label style={S.label}>{tx.notes}</label>
          <textarea style={S.textarea} value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso/communication-log/view")}>{t("cancel")}</button>
          <button style={S.btn("primary")} onClick={save} disabled={saving || generating}>{saving ? t("saving") : tx.save}</button>
        </div>
      </div>
    </main>
  );
}
