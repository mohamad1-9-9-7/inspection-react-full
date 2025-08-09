import React, { useEffect, useState } from "react";

export default function POS19DailyView() {
  const [reports, setReports] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("pos19_reports") || "[]");
    setReports(saved);

    const today = new Date().toISOString().split("T")[0];
    const todayReport = saved.find((r) => r.date === today);

    if (todayReport) {
      setSelectedDate(today);
    } else if (saved.length > 0) {
      setSelectedDate(saved[saved.length - 1].date);
    }
  }, []);

  const selectedReport = reports.find((r) => r.date === selectedDate);

  if (!reports.length) {
    return <p>❗ لا توجد تقارير محفوظة حتى الآن لفرع POS 19.</p>;
  }

  return (
    <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "10px" }}>
      <h3>📋 تقارير فرع POS 19</h3>

      {/* إدخال التاريخ يدوي */}
      <div style={{ marginBottom: "1rem" }}>
        <strong>أدخل التاريخ:</strong>{" "}
        <input
          type="date"
          value={selectedDate || ""}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ padding: "6px", marginRight: "1rem" }}
        />
      </div>

      {selectedReport ? (
        <>
          <hr />
          <h4>🌡️ درجات حرارة البرادات</h4>
          <ul>
            <li>براد 1: {selectedReport.temperatures.fridge1}°</li>
            <li>براد 2: {selectedReport.temperatures.fridge2}°</li>
            <li>براد 3: {selectedReport.temperatures.fridge3}°</li>
          </ul>

          <hr />
          <h4>🧼 نظافة الموقع</h4>
          <ul>
            <li>{selectedReport.cleanliness.floors ? "✅" : "❌"} الأرضيات</li>
            <li>{selectedReport.cleanliness.shelves ? "✅" : "❌"} الرفوف</li>
            <li>{selectedReport.cleanliness.fridges ? "✅" : "❌"} الثلاجات</li>
          </ul>

          <hr />
          <h4>👔 الزي الرسمي</h4>
          <p>{selectedReport.uniform ? "✅ الموظف ملتزم بالزي" : "❌ الموظف غير ملتزم"}</p>

          <hr />
          <h4>📝 ملاحظات المفتش</h4>
          <p>{selectedReport.notes || "—"}</p>
        </>
      ) : (
        <p>❌ لا يوجد تقرير لهذا التاريخ.</p>
      )}
    </div>
  );
}
