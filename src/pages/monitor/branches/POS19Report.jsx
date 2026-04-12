import React, { useState } from "react";

export default function POS19Report() {
  const [temperatures, setTemperatures] = useState({
    fridge1: "",
    fridge2: "",
    fridge3: "",
  });

  const [cleanliness, setCleanliness] = useState({
    floors: false,
    shelves: false,
    fridges: false,
  });

  const [uniform, setUniform] = useState(false);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const handleSave = () => {
    const report = {
      date: today,
      temperatures,
      cleanliness,
      uniform,
      notes,
    };

    let existing; try { existing = JSON.parse(localStorage.getItem("pos19_reports") || "[]"); } catch { existing = []; }
    const alreadyExists = existing.find((r) => r.date === today);

    if (alreadyExists) {
      setMessage("❗ تم حفظ تقرير اليوم مسبقًا.");
      return;
    }

    const updated = [...existing, report];
    localStorage.setItem("pos19_reports", JSON.stringify(updated));
    setMessage("✅ تم حفظ التقرير بنجاح.");
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "auto", background: "#fff", borderRadius: "12px" }}>
      <h2>📋 تقرير نقطة البيع - POS 19</h2>
      <p>🗓️ التاريخ: {today}</p>

      <hr />

      <h4>🌡️ درجات حرارة البرادات (°C)</h4>
      <div>
        <label>براد 1: <input type="number" value={temperatures.fridge1} onChange={(e) => setTemperatures({ ...temperatures, fridge1: e.target.value })} /></label><br />
        <label>براد 2: <input type="number" value={temperatures.fridge2} onChange={(e) => setTemperatures({ ...temperatures, fridge2: e.target.value })} /></label><br />
        <label>براد 3: <input type="number" value={temperatures.fridge3} onChange={(e) => setTemperatures({ ...temperatures, fridge3: e.target.value })} /></label>
      </div>

      <hr />

      <h4>🧼 تقييم نظافة الموقع</h4>
      <label><input type="checkbox" checked={cleanliness.floors} onChange={(e) => setCleanliness({ ...cleanliness, floors: e.target.checked })} /> الأرضيات</label><br />
      <label><input type="checkbox" checked={cleanliness.shelves} onChange={(e) => setCleanliness({ ...cleanliness, shelves: e.target.checked })} /> الرفوف</label><br />
      <label><input type="checkbox" checked={cleanliness.fridges} onChange={(e) => setCleanliness({ ...cleanliness, fridges: e.target.checked })} /> الثلاجات</label>

      <hr />

      <h4>👔 التزام الموظف بالزي الرسمي</h4>
      <label><input type="checkbox" checked={uniform} onChange={(e) => setUniform(e.target.checked)} /> يلتزم</label>

      <hr />

      <h4>📝 ملاحظات المفتش</h4>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} style={{ width: "100%" }} />

      <hr />

      <button onClick={handleSave} style={{ padding: "10px 20px", background: "#3498db", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
        💾 حفظ التقرير
      </button>

      {message && <p style={{ marginTop: "1rem", fontWeight: "bold" }}>{message}</p>}
    </div>
  );
}
