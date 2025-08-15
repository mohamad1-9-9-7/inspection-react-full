// src/pages/maintenance/MaintenanceRequests.jsx
import React, { useState } from "react";

export default function MaintenanceRequests() {
  const branches = [
    "QCS", "POS 6", "POS 7", "POS 10", "POS 11", "POS 14", "POS 15",
    "POS 16", "POS 17", "POS 19", "POS 21", "POS 24", "POS 25", "POS 37",
    "POS 38", "POS 42", "POS 44", "POS 45", "FTR1", "FTR2"
  ];

  const issueTypes = [
    { ar: "مشكلة نظافة", en: "Cleaning Issue" },
    { ar: "مشكلة برادات", en: "Refrigerator Issue" },
    { ar: "مشكلة كهرباء", en: "Electrical Issue" },
    { ar: "مشكلة مياه", en: "Water Issue" },
    { ar: "أخرى", en: "Other" }
  ];

  const priorityLevels = [
    { ar: "منخفضة", en: "Low" },
    { ar: "متوسطة", en: "Medium" },
    { ar: "عالية", en: "High" },
    { ar: "طارئة", en: "Urgent" }
  ];

  const [form, setForm] = useState({
    title: "",
    description: "",
    branch: "",
    issueType: "",
    reporter: "",
    priority: "",
    images: []
  });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // ⬇⬇⬇ تعديل: تحويل الصور إلى Base64 قبل التخزين
  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);

    const base64Files = await Promise.all(
      files.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result); // DataURL string
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }))
    );

    setForm({ ...form, images: base64Files });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const existingRequests = JSON.parse(localStorage.getItem("maintenanceRequests") || "[]");

    const newRequest = {
      ...form,
      createdAt: new Date().toISOString(),
    };

    const updatedRequests = [...existingRequests, newRequest];

    localStorage.setItem("maintenanceRequests", JSON.stringify(updatedRequests));

    console.log("📌 تم حفظ الطلب:", newRequest);

    setMessage("✅ تم إرسال الطلب وحفظه بنجاح / Request saved successfully (local)");
    setForm({
      title: "",
      description: "",
      branch: "",
      issueType: "",
      reporter: "",
      priority: "",
      images: []
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
        padding: "2rem",
        fontFamily: "Cairo, sans-serif",
        direction: "rtl"
      }}
    >
      <div style={{
        maxWidth: 750,
        margin: "0 auto",
        background: "#fff",
        padding: "2rem",
        borderRadius: "16px",
        boxShadow: "0 6px 20px rgba(0,0,0,0.08)"
      }}>
        <h2 style={{ textAlign: "center", marginBottom: "1rem", color: "#0f172a" }}>
          🛠️ إنشاء طلب صيانة / Create Maintenance Request
        </h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Branch */}
          <div>
            <label style={{ fontWeight: "bold" }}>🏢 الفرع / Branch:</label>
            <select
              name="branch"
              value={form.branch}
              onChange={handleChange}
              required
              style={selectStyle}
            >
              <option value="">-- اختر فرع / Select Branch --</option>
              {branches.map((b, idx) => (
                <option key={idx} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Issue Type */}
          <div>
            <label style={{ fontWeight: "bold" }}>⚙️ نوع العطل / Issue Type:</label>
            <select
              name="issueType"
              value={form.issueType}
              onChange={handleChange}
              required
              style={selectStyle}
            >
              <option value="">-- اختر نوع العطل / Select Issue --</option>
              {issueTypes.map((t, idx) => (
                <option key={idx} value={t.en}>{t.ar} / {t.en}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label style={{ fontWeight: "bold" }}>📌 عنوان الطلب / Request Title:</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontWeight: "bold" }}>📝 وصف الطلب / Description:</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={4}
              style={inputStyle}
            ></textarea>
          </div>

          {/* Reporter */}
          <div>
            <label style={{ fontWeight: "bold" }}>👤 المبلّغ / Reporter:</label>
            <input
              type="text"
              name="reporter"
              value={form.reporter}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>

          {/* Priority */}
          <div>
            <label style={{ fontWeight: "bold" }}>🚨 درجة الأهمية / Priority:</label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              required
              style={selectStyle}
            >
              <option value="">-- اختر / Select Priority --</option>
              {priorityLevels.map((p, idx) => (
                <option key={idx} value={p.en}>{p.ar} / {p.en}</option>
              ))}
            </select>
          </div>

          {/* Images */}
          <div>
            <label style={{ fontWeight: "bold" }}>📸 صور وقت الطلب / Images at Request Time:</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              style={{ marginTop: "5px" }}
            />
            {form.images.length > 0 && (
              <div style={{ marginTop: "8px", fontSize: "0.9rem", color: "#475569" }}>
                {form.images.map((img, idx) => (
                  <div key={idx}>
                    {typeof img === "string" ? (
                      <span>{`📷 صورة ${idx + 1}`}</span>
                    ) : (
                      <span>{img.name}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button type="submit" style={buttonStyle}>
            💾 حفظ الطلب / Save Request
          </button>
        </form>

        {message && (
          <div style={{
            marginTop: "1rem",
            padding: "10px",
            background: "#dcfce7",
            color: "#166534",
            borderRadius: "8px",
            textAlign: "center"
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  marginTop: "5px"
};

const selectStyle = {
  ...inputStyle,
  backgroundColor: "#fff"
};

const buttonStyle = {
  background: "#16a34a",
  color: "#fff",
  padding: "12px 20px",
  border: "none",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
  fontSize: "1rem",
  transition: "background 0.2s ease"
};
