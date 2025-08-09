import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function OHCUpload() {
  const [formData, setFormData] = useState({
    name: '',
    nationality: '',
    job: '',
    branch: '',
    issueDate: '',
    expiryDate: '',
    result: '',
  });

  const [reports, setReports] = useState(() => {
    const saved = localStorage.getItem("ohc_reports");
    return saved ? JSON.parse(saved) : [];
  });

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const navigate = useNavigate();

  const branches = [
    "QCS", "POS 6", "POS 7", "POS 10", "POS 11", "POS 14", "POS 15", "POS 16",
    "POS 17", "POS 19", "POS 21", "POS 24", "POS 25", "POS 37", "POS 38",
    "POS 42", "POS 44", "POS 45"
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccessMsg('');
  };

  const handleSave = () => {
    // تحقق من ملأ جميع الحقول
    for (const key in formData) {
      if (formData[key].trim() === '') {
        setError('يرجى تعبئة جميع الحقول قبل الحفظ.');
        setSuccessMsg('');
        return;
      }
    }

    // رسالة التأكيد قبل الحفظ
    const confirmSave = window.confirm('هل أنت متأكد من حفظ التقرير؟');
    if (!confirmSave) return;

    const updatedReports = [...reports, formData];
    setReports(updatedReports);
    localStorage.setItem("ohc_reports", JSON.stringify(updatedReports));
    setError('');
    setSuccessMsg('✅ تم حفظ التقرير بنجاح');
    setFormData({
      name: '',
      nationality: '',
      job: '',
      branch: '',
      issueDate: '',
      expiryDate: '',
      result: '',
    });
  };

  return (
    <div style={{
      padding: "2rem",
      background: "#fff",
      borderRadius: "12px",
      direction: "rtl",
      maxWidth: "700px",
      margin: "2rem auto",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
      fontFamily: "Cairo"
    }}>
      <h2 style={{ marginBottom: "1rem", color: "#2c3e50" }}>📑 إدخال تقرير الفحص الطبي - OHC</h2>

      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
      {successMsg && <p style={{ color: 'green', fontWeight: 'bold' }}>{successMsg}</p>}

      {Object.entries(formData).map(([key, value]) => {
        if (key === 'branch') {
          return (
            <div key={key} style={{ marginBottom: "1rem" }}>
              <label style={{ fontWeight: "bold" }}>
                الفرع:
              </label>
              <select
                value={value}
                onChange={e => handleChange(key, e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
              >
                <option value="">-- اختر الفرع --</option>
                {branches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
          );
        }

        if (key === 'result') {
          return (
            <div key={key} style={{ marginBottom: "1rem" }}>
              <label style={{ fontWeight: "bold" }}>
                نتيجة الفحص:
              </label>
              <select
                value={value}
                onChange={e => handleChange(key, e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
              >
                <option value="">-- اختر النتيجة --</option>
                <option value="سليم">سليم</option>
              </select>
            </div>
          );
        }

        if (key === 'issueDate' || key === 'expiryDate') {
          return (
            <div key={key} style={{ marginBottom: "1rem" }}>
              <label style={{ fontWeight: "bold" }}>
                {key === "issueDate" ? "تاريخ الإصدار" : "تاريخ الانتهاء"}:
              </label>
              <input
                type="date"
                value={value}
                onChange={e => handleChange(key, e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
              />
            </div>
          );
        }

        return (
          <div key={key} style={{ marginBottom: "1rem" }}>
            <label style={{ fontWeight: "bold" }}>
              {key === "name" ? "الاسم" :
               key === "nationality" ? "الجنسية" :
               key === "job" ? "المهنة الحالية" : key}:
            </label>
            <input
              type="text"
              value={value}
              onChange={e => handleChange(key, e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
            />
          </div>
        );
      })}

      <button
        onClick={handleSave}
        style={{
          marginTop: "1rem",
          padding: "10px 20px",
          background: "#27ae60",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "1rem"
        }}
      >
        💾 حفظ التقرير
      </button>

      <button
        onClick={() => navigate("/ohc/view")}
        style={{
          marginTop: "1rem",
          marginRight: "1rem",
          padding: "10px 20px",
          background: "#34495e",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "1rem"
        }}
      >
        📋 عرض جميع التقارير
      </button>
    </div>
  );
}
