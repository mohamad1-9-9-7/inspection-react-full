// src/pages/monitor/branches/pos15/POS15EquipmentInspectionSanitizingLogInput.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ===== API base ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof process !== "undefined" &&
      (process.env.REACT_APP_API_URL ||
        process.env.VITE_API_URL ||
        process.env.RENDER_EXTERNAL_URL)) ||
    "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ===== ثابت التقرير ===== */
const TYPE = "pos15_equipment_inspection";
const BRANCH = "POS 15";

/* ===== نوافذ التعقيم الافتراضية (يمكن تعديلها لاحقًا) ===== */
const SLOTS = [
  { key: "s_8_9_AM", label: "8-9 AM" },
  { key: "s_12_1_PM", label: "12-1 PM" },
  { key: "s_4_5_PM", label: "4-5 PM" },
  { key: "s_8_9_PM", label: "8-9 PM" },
  { key: "s_12_1_AM", label: "12-1 AM" },
];

/* ===== قالب صف ===== */
function emptyRow(name = "") {
  const base = {
    equipment: name,
    freeFromDamage: "", // Yes / No
    freeFromBrokenPieces: "", // Yes / No
    correctiveAction: "",
    checkedByRow: "",
  };
  SLOTS.forEach((s) => (base[s.key] = "")); // "", "√", "✗"
  return base;
}

/* ===== قائمة افتراضية ===== */
const DEFAULT_EQUIP = [
  "Cutting Board, Knives, Wrapping Machine, Weighing Scale",
  "Slicer, Grater",
  "Bone saw Machine , Mincer",
];

function isISODate(v) {
  // YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
}

function isRowFilled(r = {}) {
  return Object.values(r).some((v) => String(v ?? "").trim() !== "");
}

export default function POS15EquipmentInspectionSanitizingLogInput() {
  /* Header fields */
  const [formRef, setFormRef] = useState("FSMS/BR/F17");

  // ✅ قابل للتعديل يدويًا
  const [date, setDate] = useState(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
    }
  });

  const [section, setSection] = useState("");

  /* Rows & footer */
  const [rows, setRows] = useState(() => DEFAULT_EQUIP.map((n) => emptyRow(n)));
  const [verifiedBy, setVerifiedBy] = useState("");
  const [saving, setSaving] = useState(false);

  /* ✅ تحقق التكرار */
  const [dateBusy, setDateBusy] = useState(false);
  const [dateTaken, setDateTaken] = useState(false);
  const [dateError, setDateError] = useState("");

  /* Styles */
  const gridStyle = useMemo(
    () => ({
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
      fontSize: 12,
    }),
    []
  );

  const th = {
    border: "1px solid #1f3b70",
    padding: "6px 4px",
    textAlign: "center",
    whiteSpace: "pre-line",
    fontWeight: 700,
    background: "#f5f8ff",
    color: "#0b1f4d",
  };

  const td = {
    border: "1px solid #1f3b70",
    padding: "6px 4px",
    textAlign: "center",
    verticalAlign: "middle",
  };

  const input = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #c7d2fe",
    borderRadius: 6,
    padding: "4px 6px",
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
    background: "#fff",
  };

  const btn = (bg) => ({
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  });

  const tdHeader = {
    border: "1px solid #9aa4ae",
    padding: "6px 8px",
    verticalAlign: "middle",
  };

  const topTable = {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: 10,
    fontSize: "0.9rem",
    border: "1px solid #9aa4ae",
    background: "#f8fbff",
  };

  const colDefs = useMemo(
    () => [
      <col key="equip" style={{ width: 280 }} />,
      <col key="freeDamage" style={{ width: 140 }} />,
      <col key="freeBroken" style={{ width: 160 }} />,
      ...SLOTS.map((_, i) => <col key={`s${i}`} style={{ width: 90 }} />),
      <col key="corr" style={{ width: 240 }} />,
      <col key="checkedBy" style={{ width: 140 }} />,
      <col key="actions" style={{ width: 80 }} />,
    ],
    []
  );

  /* Helpers */
  function updateCell(rIdx, key, val) {
    setRows((prev) => {
      const next = [...prev];
      next[rIdx] = { ...next[rIdx], [key]: val };
      return next;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow("")]);
  }

  function removeRow(i) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function hasDuplicateForDate(d) {
    try {
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];

      return list.some((r) => {
        const p = r?.payload || {};
        const recBranch = p?.branch || r?.branch;
        const recDate = p?.reportDate || p?.header?.reportDate; // احتياط
        return String(recBranch) === BRANCH && String(recDate) === String(d);
      });
    } catch (e) {
      console.warn("Duplicate check failed:", e);
      return false;
    }
  }

  // ✅ فحص فوري عند تغيير التاريخ
  useEffect(() => {
    let alive = true;

    async function run() {
      setDateError("");
      setDateTaken(false);

      if (!date || !isISODate(date)) {
        setDateTaken(false);
        return;
      }

      setDateBusy(true);
      try {
        const exists = await hasDuplicateForDate(date);
        if (!alive) return;
        setDateTaken(Boolean(exists));
      } catch (e) {
        if (!alive) return;
        setDateError(e?.message || "Duplicate check error");
      } finally {
        if (alive) setDateBusy(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [date]);

  /* Save */
  async function handleSave() {
    // 1) تاريخ صحيح
    if (!date || !isISODate(date)) {
      alert("الرجاء إدخال تاريخ صحيح بصيغة YYYY-MM-DD");
      return;
    }

    // 2) منع تكرار (نفس التاريخ)
    if (dateTaken) {
      alert("⚠️ يوجد تقرير محفوظ مسبقًا لنفس التاريخ. اختر تاريخًا آخر.");
      return;
    }

    // 3) لازم Verified by
    if (!String(verifiedBy || "").trim()) {
      alert("الرجاء تعبئة Verified by قبل الحفظ.");
      return;
    }

    // 4) لازم يكون في بيانات فعلًا
    const filledRows = rows.filter((r) => isRowFilled(r));
    if (filledRows.length === 0) {
      alert("لا يوجد بيانات للحفظ. املأ على الأقل صف واحد.");
      return;
    }

    // 5) شرطك: وجود No أو ✗ يستلزم Corrective Action
    for (const r of filledRows) {
      const hasRisk =
        r.freeFromDamage === "No" ||
        r.freeFromBrokenPieces === "No" ||
        SLOTS.some((s) => r[s.key] === "✗");

      if (hasRisk && !String(r.correctiveAction || "").trim()) {
        alert(
          "هناك صف به ملاحظة (✗ أو No) بدون إجراء تصحيحي. الرجاء تعبئة Corrective Action."
        );
        return;
      }
    }

    const uniqueKey = `${TYPE}__${BRANCH}__${date}`;

    const payload = {
      uniqueKey,
      branch: BRANCH,
      formRef,
      section,
      reportDate: date,
      slots: SLOTS.map((s) => s.key),
      entries: rows.map((r) => ({ ...r })),
      verifiedBy,
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos15", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ تم الحفظ بنجاح!");
    } catch (e) {
      console.error(e);
      alert("❌ فشل الحفظ. تحقق من السيرفر أو الشبكة.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #dbe3f4",
        borderRadius: 12,
        padding: 16,
        color: "#0b1f4d",
      }}
    >
      {/* === ترويسة AL MAWASHI + جدول المستند === */}
      <table style={topTable}>
        <tbody>
          <tr>
            <td rowSpan={3} style={{ ...tdHeader, width: 120, textAlign: "center" }}>
              <div style={{ fontWeight: 900, color: "#a00", lineHeight: 1.1 }}>
                AL<br />
                MAWASHI
              </div>
            </td>
            <td style={tdHeader}>
              <b>Document Title:</b> Equipment Inspection &amp; Sanitizing Log
            </td>
            <td style={tdHeader}>
              <b>Document No:</b>{" "}
              <input
                value={formRef}
                onChange={(e) => setFormRef(e.target.value)}
                style={{
                  border: "1px solid #9aa4ae",
                  borderRadius: 6,
                  padding: "3px 6px",
                  width: "60%",
                  background: "#fff",
                }}
              />
            </td>
          </tr>
          <tr>
            <td style={tdHeader}>
              <b>Issue Date:</b> 05/02/2020
            </td>
            <td style={tdHeader}>
              <b>Revision No:</b> 0
            </td>
          </tr>
          <tr>
            <td style={tdHeader}>
              <b>Area:</b> {BRANCH}
            </td>
            <td style={tdHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <b>Date:</b>
                {/* ✅ إدخال التاريخ يدوي */}
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    border: "1px solid #9aa4ae",
                    borderRadius: 6,
                    padding: "3px 6px",
                    background: "#fff",
                    minWidth: 160,
                  }}
                />

                {/* ✅ حالة التحقق */}
                {date && (
                  <span style={{ fontSize: 12 }}>
                    {dateBusy && <span style={{ color: "#6b7280", fontWeight: 700 }}>جارٍ التحقق…</span>}
                    {!dateBusy && dateTaken && (
                      <span style={{ color: "#b91c1c", fontWeight: 800 }}>⛔ موجود مسبقًا</span>
                    )}
                    {!dateBusy && !dateTaken && !dateError && (
                      <span style={{ color: "#065f46", fontWeight: 800 }}>✅ متاح</span>
                    )}
                    {dateError && <span style={{ color: "#b45309", fontWeight: 800 }}>⚠️ تعذر التحقق</span>}
                  </span>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* شريط عنوان التعقيم + الملاحظات (ثنائية اللغة جنباً إلى جنب) */}
      <div style={{ border: "1px solid #1f3b70", borderBottom: "none" }}>
        <div style={{ ...th, background: "#e9f0ff" }}>Sanitizing Schedule</div>

        {/* سطر الليجند */}
        <div style={{ fontSize: 11, textAlign: "center", padding: "6px 8px", color: "#0b1f4d" }}>
          <strong>Legend:</strong> (√) — Satisfactory ; (✗) — Needs Improvement
        </div>

        {/* الملاحظة: عربي / إنجليزي جنباً إلى جنب */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            alignItems: "stretch",
            padding: "4px 8px 10px",
          }}
        >
          <div
            dir="rtl"
            style={{
              border: "1px dashed #9aa4ae",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 12,
              lineHeight: 1.7,
              background: "#fcfdff",
            }}
          >
            <strong>ملاحظة (AR):</strong> عند <b>الاستخدام</b> يجب التعقيم كل <b>30 دقيقة</b>، وعند{" "}
            <b>عدم الاستخدام</b> التعقيم كل <b>4 ساعات</b>.
          </div>
          <div
            dir="ltr"
            style={{
              border: "1px dashed #9aa4ae",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 12,
              lineHeight: 1.7,
              background: "#fcfdff",
              textAlign: "left",
            }}
          >
            <strong>Note (EN):</strong> When <b>in use</b>, sanitize every <b>30 minutes</b>; when{" "}
            <b>not in use</b>, sanitize every <b>4 hours</b>.
          </div>
        </div>
      </div>

      {/* الجدول */}
      <div style={{ overflowX: "auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={th}>Equipment’s</th>
              <th style={th}>
                Free from{"\n"}damage{"\n"}(yes/no)
              </th>
              <th style={th}>
                Free from{"\n"}broken{"\n"}metal/plastic pieces{"\n"}(yes/no)
              </th>
              {SLOTS.map((s) => (
                <th key={s.key} style={th}>
                  {s.label}
                </th>
              ))}
              <th style={th}>
                Corrective{"\n"}Action{"\n"}(if any)
              </th>
              <th style={th}>
                Checked{"\n"}by
              </th>
              <th style={th}>—</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const risky =
                r.freeFromDamage === "No" ||
                r.freeFromBrokenPieces === "No" ||
                SLOTS.some((s) => r[s.key] === "✗");

              return (
                <tr key={i}>
                  <td style={td}>
                    <input
                      value={r.equipment}
                      onChange={(e) => updateCell(i, "equipment", e.target.value)}
                      style={input}
                      placeholder="Equipment name"
                    />
                  </td>

                  <td style={td}>
                    <select
                      value={r.freeFromDamage}
                      onChange={(e) => updateCell(i, "freeFromDamage", e.target.value)}
                      style={input}
                    >
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>

                  <td style={td}>
                    <select
                      value={r.freeFromBrokenPieces}
                      onChange={(e) => updateCell(i, "freeFromBrokenPieces", e.target.value)}
                      style={input}
                    >
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>

                  {SLOTS.map((s) => (
                    <td style={td} key={s.key}>
                      <select
                        value={r[s.key]}
                        onChange={(e) => updateCell(i, s.key, e.target.value)}
                        style={{
                          ...input,
                          background:
                            r[s.key] === "√" ? "#e7f7ec" : r[s.key] === "✗" ? "#fde8e8" : "#fff",
                        }}
                        title="√ = Satisfactory, ✗ = Needs Improvement"
                      >
                        <option value=""></option>
                        <option value="√">√</option>
                        <option value="✗">✗</option>
                      </select>
                    </td>
                  ))}

                  <td style={td}>
                    <input
                      value={r.correctiveAction}
                      onChange={(e) => updateCell(i, "correctiveAction", e.target.value)}
                      style={{ ...input, background: risky ? "#fff7ed" : "#fff" }}
                      placeholder={risky ? "Required when ✗ or No" : "Optional"}
                    />
                  </td>

                  <td style={td}>
                    <input
                      value={r.checkedByRow}
                      onChange={(e) => updateCell(i, "checkedByRow", e.target.value)}
                      style={input}
                    />
                  </td>

                  <td style={td}>
                    <button onClick={() => removeRow(i)} style={btn("#dc2626")}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* أزرار التحكم */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button onClick={addRow} style={btn("#0ea5e9")}>
          Add Row
        </button>
        <button onClick={handleSave} disabled={saving || dateBusy} style={btn("#2563eb")}>
          {saving ? "Saving…" : "Save Equipment Log"}
        </button>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 16,
          alignItems: "center",
          fontSize: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>Verified by:</span>
          <input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} style={input} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", color: "#6b7280" }}>
          {dateTaken ? "⚠️ لا يمكن الحفظ لأن التقرير موجود لنفس التاريخ." : ""}
        </div>
      </div>
    </div>
  );
}
