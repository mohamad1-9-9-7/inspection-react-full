// src/pages/monitor/branches/qcs/PersonalHygieneTab.jsx

import React from "react";

const options = ["C", "NC"];

/* ===== API (خارجي دائمًا) ===== */
const API_BASE = (process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com").replace(/\/$/, "");

/* ===== Helpers: قراءة/حفظ قسم النظافة الشخصية فقط مع دمج باقي الحقول لنفس التاريخ ===== */
async function loadExisting(date) {
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=qcs-daily`, { method: "GET", cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const arr = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
    const found = arr.find(r => String(r?.payload?.reportDate || r?.reportDate || "") === String(date));
    return found?.payload || null;
  } catch {
    return null;
  }
}

async function savePersonalHygieneToServer({ date, data }) {
  const existing = (await loadExisting(date)) || {};
  const payload = {
    reportDate: date,
    auditTime: existing.auditTime || "",
    coolers: Array.isArray(existing.coolers) ? existing.coolers : [],
    personalHygiene: Array.isArray(data) ? data : [],
    cleanlinessRows: Array.isArray(existing.cleanlinessRows) ? existing.cleanlinessRows : [],
    headers: existing.headers || {},
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "qcs-daily", payload }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || "Failed to save report");
  }
  return res.json().catch(() => ({}));
}

export default function PersonalHygieneTab({ reportDate, personalHygiene, setPersonalHygiene }) {
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  const handleChange = (index, field, value) => {
    const updated = [...personalHygiene];
    updated[index][field] = value;
    setPersonalHygiene(updated);
  };

  const addEmployee = () => {
    setPersonalHygiene([...personalHygiene, {
      employName: "",
      nails: "",
      hair: "",
      notWearingJewelries: "",
      wearingCleanCloth: "",
      communicableDisease: "",
      openWounds: "",
      remarks: "",
    }]);
  };

  const removeEmployee = (index) => {
    const updated = [...personalHygiene];
    updated.splice(index, 1);
    setPersonalHygiene(updated);
  };

  const handleSave = async () => {
    if (!reportDate) {
      setMsg("❌ حدّد التاريخ قبل الحفظ");
      setTimeout(() => setMsg(""), 1800);
      return;
    }
    try {
      setSaving(true);
      setMsg("⏳ جارِ الحفظ على السيرفر…");
      await savePersonalHygieneToServer({ date: reportDate, data: personalHygiene });
      setMsg("✅ تم الحفظ");
    } catch (e) {
      setMsg("❌ فشل الحفظ");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2200);
    }
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end", marginBottom: 10, flexWrap: "wrap" }}>
        <button
          onClick={addEmployee}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            backgroundColor: "#fff",
            color: "#111827",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          ➕ إضافة موظف
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            backgroundColor: "#059669",
            color: "white",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 3px 10px rgba(5,150,105,.25)",
            opacity: saving ? 0.75 : 1,
          }}
          title="حفظ قسم النظافة الشخصية لهذا التاريخ"
        >
          {saving ? "⏳ جاري الحفظ…" : "💾 حفظ النظافة الشخصية"}
        </button>
        {msg && <span style={{ fontWeight: 700 }}>{msg}</span>}
      </div>

      <h3>🧼 قائمة النظافة الشخصية للموظفين</h3>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: 900,
          backgroundColor: "#fff",
          borderRadius: 8,
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>S. No</th>
            <th style={thStyle}>Employ Name</th>
            <th style={thStyle}>Nails</th>
            <th style={thStyle}>Hair</th>
            <th style={thStyle}>Not wearing Jewelries</th>
            <th style={thStyle}>Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/ Shoe</th>
            <th style={thStyle}>Communicable disease</th>
            <th style={thStyle}>Open wounds/ sores & cut</th>
            <th style={thStyle}>Remarks and Corrective Actions</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {personalHygiene.map((emp, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={tdStyle}>{i + 1}</td>
              <td style={tdStyle}>
                <input
                  type="text"
                  value={emp.employName}
                  onChange={(e) => handleChange(i, "employName", e.target.value)}
                  style={inputStyle}
                  placeholder="اسم الموظف"
                />
              </td>

              {["nails", "hair", "notWearingJewelries", "wearingCleanCloth", "communicableDisease", "openWounds"].map(
                (field) => (
                  <td key={field} style={tdStyle}>
                    <select
                      value={emp[field]}
                      onChange={(e) => handleChange(i, field, e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">--</option>
                      {options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                )
              )}

              <td style={tdStyle}>
                <input
                  type="text"
                  value={emp.remarks}
                  onChange={(e) => handleChange(i, "remarks", e.target.value)}
                  style={inputStyle}
                  placeholder="ملاحظات"
                />
              </td>
              <td style={{ textAlign: "center" }}>
                <button
                  onClick={() => removeEmployee(i)}
                  style={removeBtnStyle}
                  title="حذف الموظف"
                >
                  ❌
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  borderBottom: "2px solid #2980b9",
  padding: "10px 8px",
  textAlign: "center",
  backgroundColor: "#d6eaf8",
};

const tdStyle = {
  padding: "8px 6px",
  textAlign: "center",
  borderRight: "1px solid #ddd",
};

const inputStyle = {
  width: "100%",
  padding: "6px 8px",
  boxSizing: "border-box",
  borderRadius: 4,
  border: "1px solid #ccc",
  textAlign: "center",
};

const selectStyle = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: 4,
  border: "1px solid #ccc",
  textAlign: "center",
  cursor: "pointer",
};

const removeBtnStyle = {
  backgroundColor: "#e74c3c",
  border: "none",
  color: "white",
  padding: "4px 8px",
  borderRadius: 6,
  cursor: "pointer",
};
