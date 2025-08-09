import React from "react";

// ✅ البنود الثابتة (عربي + إنكليزي)
const checklistRows = [
  { groupEn: "Hand Washing Area", groupAr: "منطقة غسل اليدين", items: [
      { en: "Tissue available", ar: "المناديل متوفرة" },
      { en: "Hair Net available", ar: "شبكة الشعر متوفرة" },
      { en: "Face Masks available", ar: "الكمامات متوفرة" },
    ]
  },
  ...Array.from({ length: 8 }, (_, i) => ({
    groupEn: `Chiller Room ${i + 1}`,
    groupAr: `غرفة التبريد ${i + 1}`,
    items: [
      { en: "Floors", ar: "الأرضيات" },
      { en: "Drainage", ar: "التصريف" },
      { en: "Proper arrangement of Products", ar: "ترتيب المنتجات" },
      { en: "Door", ar: "الباب" },
    ]
  })),
  { groupEn: "Loading Area", groupAr: "منطقة التحميل", items: [
      { en: "Walls/Floors", ar: "الجدران/الأرضيات" },
      { en: "Trolleys", ar: "العربات" },
    ]
  },
  { groupEn: "Waste Disposal", groupAr: "التخلص من النفايات", items: [
      { en: "Collection of waste", ar: "جمع النفايات" },
      { en: "Disposal", ar: "التخلص" },
    ]
  },
  { groupEn: "Working Conditions & Cleanliness", groupAr: "نظافة وظروف العمل", items: [
      { en: "Lights", ar: "الإضاءة" },
      { en: "Fly Catchers", ar: "مصائد الذباب" },
      { en: "Floor/wall", ar: "الأرضية/الجدار" },
    ]
  },
  { groupEn: "Painting and Plastering", groupAr: "الدهان واللياسة", items: [] },
  { groupEn: "Weighing Balance", groupAr: "ميزان الوزن", items: [] },
  { groupEn: "Tap Water", groupAr: "مياه الصنبور", items: [] },
];

// ✅ تحويل البنود لقائمة صفوف
const initialRows = [];
let siNo = 1;
checklistRows.forEach(section => {
  if (!section.items.length) {
    initialRows.push({
      siNo: siNo++,
      groupEn: section.groupEn,
      groupAr: section.groupAr,
      itemEn: "",
      itemAr: "",
      result: "",
      observation: "",
      informed: "",
      remarks: "",
    });
  } else {
    section.items.forEach(item => {
      initialRows.push({
        siNo: siNo++,
        groupEn: section.groupEn,
        groupAr: section.groupAr,
        itemEn: item.en,
        itemAr: item.ar,
        result: "",
        observation: "",
        informed: "",
        remarks: "",
      });
    });
  }
});

export default function DailyCleanlinessTab({ cleanlinessRows, setCleanlinessRows, auditTime, setAuditTime }) {
  // ❗اعتمد initialRows دائماً عند عدم وجود بيانات
  React.useEffect(() => {
    if (!cleanlinessRows || !cleanlinessRows.length) {
      setCleanlinessRows(initialRows);
    }
    // eslint-disable-next-line
  }, []);

  const handleChange = (index, field, value) => {
    const updated = [...cleanlinessRows];
    updated[index][field] = value;
    setCleanlinessRows(updated);
  };

  return (
    <div style={{
      background: "#fff", padding: "1.5rem", borderRadius: 12,
      boxShadow: "0 0 8px rgba(0,0,0,0.12)", overflowX: "auto"
    }}>
      <h3 style={{ color: "#d35400", marginBottom: "1.5rem" }}>🧹 قائمة التحقق من النظافة اليومية للمستودع</h3>
      
      {/* 👇 حقل الوقت العام */}
      <div style={{ marginBottom: "1rem", textAlign: "right" }}>
        <label style={{ fontWeight: "bold" }}>
          وقت التدقيق:&nbsp;
          <input
            type="time"
            value={auditTime}
            onChange={e => setAuditTime(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: 5, border: "1px solid #ccc" }}
          />
        </label>
      </div>
      
      <table style={{ width: "100%", minWidth: 1200, borderCollapse: "collapse", fontSize: "1rem" }}>
        <thead>
          <tr style={{ background: "#f9f9f9" }}>
            <th style={thStyle}>SI-No</th>
            <th style={thStyle}>المجموعة<br /><span style={{ color: "#555", fontWeight: 400 }}>Group</span></th>
            <th style={thStyle}>البند<br /><span style={{ color: "#555", fontWeight: 400 }}>Item</span></th>
            {/* حذفت عمود الوقت */}
            <th style={thStyle}>C / NC</th>
            <th style={thStyle}>ملاحظة<br /><span style={{ color: "#555", fontWeight: 400 }}>Observation</span></th>
            <th style={thStyle}>تم الإبلاغ لـ<br /><span style={{ color: "#555", fontWeight: 400 }}>Informed to</span></th>
            <th style={thStyle}>ملاحظات/إجراء تصحيحي<br /><span style={{ color: "#555", fontWeight: 400 }}>Remarks/CA</span></th>
          </tr>
        </thead>
        <tbody>
          {cleanlinessRows?.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
              <td style={tdStyle}>{row.siNo}</td>
              <td style={tdStyle}><b>{row.groupAr}</b><br /><span style={{ color: "#777", fontSize: "0.95em" }}>{row.groupEn}</span></td>
              <td style={tdStyle}>{row.itemAr || "-"}<br /><span style={{ color: "#777", fontSize: "0.95em" }}>{row.itemEn || ""}</span></td>
              {/* شيل حقل الوقت من هنا */}
              <td style={tdStyle}>
                <select
                  value={row.result}
                  onChange={e => handleChange(i, "result", e.target.value)}
                  style={inputStyle}
                >
                  <option value="">--</option>
                  <option value="C">C</option>
                  <option value="NC">NC</option>
                </select>
              </td>
              <td style={tdStyle}>
                <input
                  type="text"
                  value={row.observation}
                  onChange={e => handleChange(i, "observation", e.target.value)}
                  style={inputStyle}
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="text"
                  value={row.informed}
                  onChange={e => handleChange(i, "informed", e.target.value)}
                  style={inputStyle}
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="text"
                  value={row.remarks}
                  onChange={e => handleChange(i, "remarks", e.target.value)}
                  style={inputStyle}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "2rem", color: "#888", fontSize: "0.95rem" }}>
        <strong>ملاحظة:</strong> C = مطابقة، NC = غير مطابقة
      </div>
    </div>
  );
}

const thStyle = {
  borderBottom: "2px solid #d35400",
  padding: "8px 5px",
  textAlign: "center",
  background: "#fbeee7"
};

const tdStyle = {
  padding: "6px 3px",
  textAlign: "center"
};

const inputStyle = {
  width: "100%",
  padding: "5px 4px",
  borderRadius: 5,
  border: "1px solid #ccc",
  fontSize: "1rem"
};
