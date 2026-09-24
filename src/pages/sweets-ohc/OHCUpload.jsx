// src/pages/sweets-ohc/OHCUpload.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";
import { uploadImage } from "../../utils/imageUpload";

/* ========= API ========= */


/* Server report type */
const TYPE = "sweets_ohc_certificate";

/* ========= Helpers ========= */
async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...opts,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

// Normalize server list
function extractReportsList(data) {
  let arr = [];
  if (Array.isArray(data)) arr = data;
  else if (Array.isArray(data?.items)) arr = data.items;
  else if (Array.isArray(data?.data?.items)) arr = data.data.items;
  else if (Array.isArray(data?.data)) arr = data.data;
  else if (Array.isArray(data?.results)) arr = data.results;
  else if (Array.isArray(data?.rows)) arr = data.rows;
  else if (Array.isArray(data?.list)) arr = data.list;
  return arr
    .filter((x) => (x?.type ? x.type === TYPE : true))
    .map((x) => x.payload || x);
}

// Try to detect duplicates on server by appNo (two passes)
async function appNoExistsOnServer(appNo) {
  const direct = await jsonFetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(
      TYPE
    )}&appNo=${encodeURIComponent(appNo)}&limit=1`
  );
  if (direct.ok) {
    const list = extractReportsList(direct.data);
    if (
      list.some(
        (p) => String(p?.appNo || "").trim() === String(appNo).trim()
      )
    )
      return true;
  }

  const wide = await jsonFetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(
      TYPE
    )}&limit=1000&sort=-createdAt`
  );
  if (wide.ok) {
    const list = extractReportsList(wide.data);
    return list.some(
      (p) => String(p?.appNo || "").trim() === String(appNo).trim()
    );
  }
  return false;
}

/* The certificate used to be stored inside the payload as base64 — one record
   ran ~87 KB, of which 99.4% was the image, and reading the list cost 12.9 MB.
   It now goes to Cloudinary via uploadImage(), which resizes to 1280px at
   quality 80 server-side, so the local canvas pass here is gone. */

/* ========= UI ========= */

// Nationality dropdown (English) including requested + all African countries + Philippines
const NATIONALITIES = [
  "Syria",
  "Lebanon",
  "Egypt",
  "India",
  "Pakistan",
  "Afghanistan",
  "Sudan",
  "Palestine",
  "Nepal",
  "Ghana",
  "Morocco",
  "Philippines",

  "Algeria",
  "Angola",
  "Benin",
  "Botswana",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cameroon",
  "Central African Republic",
  "Chad",
  "Comoros",
  "Democratic Republic of the Congo",
  "Republic of the Congo",
  "Djibouti",
  "Equatorial Guinea",
  "Eritrea",
  "Eswatini",
  "Ethiopia",
  "Gabon",
  "Gambia",
  "Guinea",
  "Guinea-Bissau",
  "Ivory Coast",
  "Kenya",
  "Lesotho",
  "Liberia",
  "Libya",
  "Madagascar",
  "Malawi",
  "Mali",
  "Mauritania",
  "Mauritius",
  "Mozambique",
  "Namibia",
  "Niger",
  "Nigeria",
  "Rwanda",
  "Sao Tome and Principe",
  "Senegal",
  "Seychelles",
  "Sierra Leone",
  "Somalia",
  "South Africa",
  "South Sudan",
  "Tanzania",
  "Togo",
  "Tunisia",
  "Uganda",
  "Zambia",
  "Zimbabwe",

  "Other",
];

/* ====== Employees mapping (ID → Name / Branch / Job) ====== */
/* Employee Name → name, Place Of Work → branch, JOB TITLE → job */
export const EMPLOYEES = {
};

/* ========= Component ========= */
export default function OHCUpload() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    appNo: "", // used as Employee Number
    name: "",
    nationality: "",
    job: "",
    expiryDate: "",
    result: "FIT", // always FIT
    branch: "",
  });

  const [imageData, setImageData] = useState("");
  const [imageMeta, setImageMeta] = useState({ name: "", type: "" });

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const setField = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setMsg({ type: "", text: "" });
  };

  // عندما نغيّر Employee Number نبحث في جدول الموظفين ونعبّي باقي الحقول
  const handleEmployeeNumberChange = (v) => {
    setMsg({ type: "", text: "" });
    const id = String(v || "").trim();
    const emp = EMPLOYEES[id];
    setForm((prev) => ({
      ...prev,
      appNo: v,
      name: emp ? emp.name : "",
      branch: emp ? emp.branch : "",
      job: emp ? emp.job : "",
    }));
  };

  const requiredKeys = [
    "appNo",
    "name",
    "nationality",
    "job",
    "expiryDate",
    "result",
    "branch",
  ];

  async function handleSave() {
    for (const k of requiredKeys) {
      if (!String(form[k] || "").trim()) {
        setMsg({
          type: "error",
          text: "Please complete all required fields before saving.",
        });
        return;
      }
    }

    const trimmedAppNo = form.appNo.trim();
    const expiryDate = String(form.expiryDate);

    const todayStr = new Date().toISOString().slice(0, 10);
    if (expiryDate < todayStr) {
      const cont = window.confirm(
        "This OHC certificate appears to be expired already.\nDo you still want to save it?"
      );
      if (!cont) return;
    }

    if (!trimmedAppNo) {
      setMsg({
        type: "error",
        text: "Invalid Employee Number format.",
      });
      return;
    }

    setBusy(true);
    setMsg({ type: "", text: "" });

    try {
      const exists = await appNoExistsOnServer(trimmedAppNo);
      if (exists) {
        setBusy(false);
        setMsg({
          type: "error",
          text: `Duplicate Employee Number: "${trimmedAppNo}". A certificate with this number already exists.`,
        });
        return;
      }

      const okConfirm = window.confirm(
        "Save this OHC certificate to the server?"
      );
      if (!okConfirm) {
        setBusy(false);
        return;
      }

      const payload = {
        ...form,
        appNo: trimmedAppNo, // stored as appNo but used as Employee Number
        result: "FIT",       // force FIT in payload
        imageUrl: imageData || undefined,
        imageName: imageData ? imageMeta.name : undefined,
        imageType: imageData ? imageMeta.type : undefined,
        savedAt: new Date().toISOString(),
      };

      const body = JSON.stringify({
        reporter: "sweets",
        type: TYPE,
        payload,
      });

      const { ok, status, data } = await jsonFetch(
        `${API_BASE}/api/reports`,
        {
          method: "POST",
          body,
        }
      );

      setBusy(false);

      if (!ok) {
        const serverMsg =
          data?.message ||
          (status >= 500
            ? "Server error. Please try again later."
            : "Failed to save. Please check the data and try again.");

        setMsg({
          type: "error",
          text: `Failed to save to server (HTTP ${status}). ${serverMsg}`,
        });
        return;
      }

      setMsg({ type: "ok", text: "✅ Saved to server successfully." });

      setForm({
        appNo: "",
        name: "",
        nationality: "",
        job: "",
        expiryDate: "",
        result: "FIT", // reset back to FIT
        branch: "",
      });
      setImageData("");
      setImageMeta({ name: "", type: "" });
    } catch (err) {
      console.error("OHC save error:", err);
      setBusy(false);
      setMsg({
        type: "error",
        text: "Network error while contacting the server. Please check your connection and try again.",
      });
    }
  }

  async function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setMsg({ type: "error", text: "Please select an image file." });
      e.target.value = "";
      return;
    }
    try {
      setMsg({ type: "", text: "⏳ Uploading image…" });
      const url = await uploadImage(file, TYPE);
      setImageData(url);
      setImageMeta({ name: file.name, type: file.type || "image/jpeg" });
      setMsg({ type: "", text: "" });
    } catch (err) {
      setMsg({
        type: "error",
        text: `Image upload failed: ${err?.message || err}`,
      });
    } finally {
      e.target.value = "";
    }
  }

  function removeImage() {
    setImageData("");
    setImageMeta({ name: "", type: "" });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        padding: "0 0 2rem",
        background:
          "radial-gradient(1100px 420px at 12% -8%, #fce7f3 0%, transparent 55%), radial-gradient(900px 360px at 92% 4%, #cffafe 0%, transparent 55%), #eef2f7",
        direction: "ltr",
        boxSizing: "border-box",
        fontFamily: 'Inter, ui-sans-serif, system-ui, "Segoe UI", Tahoma, sans-serif',
      }}
    >
      <style>{`
        .ohc-in{transition:border-color .15s ease, box-shadow .15s ease, background .15s ease}
        .ohc-in:focus{border-color:#ec4899 !important;background:#fff !important;box-shadow:0 0 0 4px rgba(236,72,153,.14) !important}
        .ohc-save:hover{transform:translateY(-1px);box-shadow:0 16px 34px rgba(190,24,93,.42) !important}
        .ohc-view:hover{background:#ecfeff !important;border-color:#0891b2 !important;color:#0e7490 !important}
      `}</style>

      <div
        style={{
          width: "100%",
          background: "#fff",
          overflow: "hidden",
          boxShadow: "0 30px 70px rgba(131,24,67,0.18)",
          borderBottom: "1px solid rgba(190,24,93,0.10)",
        }}
      >
        {/* ── Brand hero band ── */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "22px 28px 24px",
            background:
              "linear-gradient(120deg,#1e1b2e 0%,#4c1d3d 46%,#831843 100%)",
            color: "#fff",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background:
                "radial-gradient(520px 160px at 12% 0%, rgba(236,72,153,.42), transparent 60%), radial-gradient(460px 180px at 96% 40%, rgba(8,145,178,.30), transparent 60%)",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute", left: 0, bottom: 0, width: "100%", height: 4,
              background: "linear-gradient(90deg,#ec4899,#f59e0b,#0891b2,#ec4899)",
              opacity: .92,
            }}
          />
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
              <div
                style={{
                  width: 54, height: 54, borderRadius: 16, flexShrink: 0,
                  display: "grid", placeItems: "center", fontSize: 26,
                  background: "rgba(255,255,255,.14)",
                  border: "1px solid rgba(255,255,255,.28)",
                  boxShadow: "0 10px 24px rgba(0,0,0,.25)",
                }}
              >🩺</div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "2px 11px", borderRadius: 999,
                    fontSize: 10.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.7,
                    background: "rgba(255,255,255,.14)",
                    border: "1px solid rgba(255,255,255,.28)",
                    color: "#fbcfe8",
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: "#4ade80", boxShadow: "0 0 0 3px rgba(74,222,128,.28)" }} />
                  OHC Register
                </div>
                <h2 style={{ margin: "8px 0 3px", color: "#fff", fontWeight: 1000, fontSize: 23, letterSpacing: 0.2 }}>
                  OHC Certificate Entry
                </h2>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.78)", fontWeight: 600, maxWidth: 460, lineHeight: 1.5 }}>
                  Server-based record for employee OHC certificates with image attachment and expiry tracking.
                </div>
              </div>
            </div>

            <div
              style={{
                textAlign: "right", fontSize: 11, color: "rgba(255,255,255,.72)",
                background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)",
                borderRadius: 12, padding: "8px 12px", fontWeight: 600,
              }}
            >
              <div style={{ fontWeight: 900, color: "#fff" }}>
                Mode: <span style={{ color: "#6ee7b7" }}>Server Save Only</span>
              </div>
              <div>Duplicates blocked by Employee Number.</div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "1.6rem clamp(1rem,3vw,2.5rem) 1.8rem" }}>
          {msg.text && (
            <div
              style={{
                margin: "0 0 16px",
                padding: "11px 14px",
                borderRadius: 14,
                background:
                  msg.type === "ok"
                    ? "linear-gradient(135deg,#ecfdf5,#dcfce7)"
                    : "linear-gradient(135deg,#fef2f2,#fee2e2)",
                color: msg.type === "ok" ? "#065f46" : "#991b1b",
                border: `1px solid ${
                  msg.type === "ok" ? "#86efac" : "#fca5a5"
                }`,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background:
                    msg.type === "ok" ? "#16a34a" : "rgba(220,38,38,0.9)",
                  boxShadow:
                    msg.type === "ok"
                      ? "0 0 0 4px rgba(34,197,94,0.18)"
                      : "0 0 0 4px rgba(248,113,113,0.2)",
                }}
              />
              <span>{msg.text}</span>
            </div>
          )}

          {/* Sections labels */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 14,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            <span
              style={{
                padding: "4px 11px",
                borderRadius: 999,
                background: "#fce7f3",
                color: "#be185d",
                fontWeight: 800,
                border: "1px solid #fbcfe8",
              }}
            >
              Employee Details
            </span>
            <span
              style={{
                padding: "4px 11px",
                borderRadius: 999,
                background: "#cffafe",
                color: "#0e7490",
                fontWeight: 800,
                border: "1px solid #a5f3fc",
              }}
            >
              Certificate & Branch
            </span>
            <span
              style={{
                padding: "4px 11px",
                borderRadius: 999,
                background: "#f1f5f9",
                color: "#475569",
                fontWeight: 800,
                border: "1px solid #e2e8f0",
              }}
            >
              Attachment (Optional)
            </span>
          </div>

          {/* Form */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: 14,
              marginTop: 8,
            }}
          >
            <Field
              label="Employee Number"
              value={form.appNo}
              onChange={handleEmployeeNumberChange}
            />
            <Field
              label="Name"
              value={form.name}
              onChange={(v) => setField("name", v)}
            />

            <Select
              label="Nationality"
              value={form.nationality}
              onChange={(v) => setField("nationality", v)}
              options={[
                { value: "", label: "-- Select Nationality --" },
                ...NATIONALITIES.map((n) => ({ value: n, label: n })),
              ]}
            />

            {/* Occupation أصبح Text Field ليقبل كل المسميات من جدول HR */}
            <Field
              label="Occupation"
              value={form.job}
              onChange={(v) => setField("job", v)}
            />

            {/* Result fixed as FIT */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                fontWeight: 600,
                color: "#0f172a",
                fontSize: 13,
              }}
            >
              <span>Result</span>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(34,197,94,0.6)",
                  background:
                    "linear-gradient(135deg,#ecfdf5,#dcfce7,#bbf7d0)",
                  color: "#166534",
                  fontWeight: 700,
                  fontSize: 12,
                  minHeight: 32,
                }}
              >
                FIT
              </div>
            </div>

            {/* Branch أيضاً Text Field ليأخذ Place Of Work كامل */}
            <Field
              label="Branch"
              value={form.branch}
              onChange={(v) => setField("branch", v)}
            />

            <DateField
              label="Certificate Expiry Date"
              value={form.expiryDate}
              onChange={(v) => setField("expiryDate", v)}
            />

            {/* Single Image (optional) */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontWeight: 600,
                  color: "#0f172a",
                  fontSize: 13,
                }}
              >
                Certificate Image (Optional)
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{
                      flex: 1,
                      padding: 10,
                      border: "1.5px dashed #f0abfc",
                      borderRadius: 12,
                      background: "linear-gradient(135deg,#fdf4ff,#faf5ff)",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  />
                </div>
              </label>

              {imageData && (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 8,
                    borderRadius: 12,
                    background:
                      "linear-gradient(135deg,rgba(15,23,42,0.03),rgba(8,47,73,0.03))",
                    border: "1px solid rgba(148,163,184,0.4)",
                  }}
                >
                  <img
                    src={imageData}
                    alt="Preview"
                    style={{
                      height: 90,
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      objectFit: "cover",
                      boxShadow: "0 8px 20px rgba(15,23,42,0.28)",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={removeImage}
                      style={{
                        padding: "8px 14px",
                        background:
                          "linear-gradient(135deg,#ef4444,#b91c1c)",
                        color: "#fff",
                        border: 0,
                        borderRadius: 999,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Remove Image
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
            }}
          >
            <button
              className="ohc-view"
              onClick={() => navigate("/company-app?card=ohc&mode=view")}
              style={{
                padding: "11px 20px",
                background: "#fff",
                color: "#0e7490",
                border: "1.5px solid #a5f3fc",
                borderRadius: 999,
                fontWeight: 800,
                cursor: "pointer",
                fontSize: 13,
                transition: "all .15s ease",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              📋 View All Certificates
            </button>

            <button
              className="ohc-save"
              onClick={handleSave}
              disabled={busy}
              style={{
                padding: "11px 22px",
                background: busy
                  ? "linear-gradient(135deg,#f472b6,#db2777)"
                  : "linear-gradient(135deg,#ec4899,#be185d)",
                color: "#fff",
                border: 0,
                borderRadius: 999,
                fontWeight: 900,
                cursor: busy ? "default" : "pointer",
                fontSize: 13,
                letterSpacing: 0.4,
                boxShadow: "0 14px 30px rgba(190,24,93,0.42)",
                transition: "transform .15s ease, box-shadow .15s ease",
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: busy ? 0.9 : 1,
              }}
            >
              {busy ? "Saving..." : "💾 Save to Server"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========= Tiny UI helpers ========= */
function Field({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        fontWeight: 600,
        color: "#0f172a",
        fontSize: 13,
      }}
    >
      <span>{label}</span>
      <input
        className="ohc-in"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1.5px solid #e2e8f0",
          background: "#f8fafc",
          fontSize: 13,
          outline: "none",
        }}
      />
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        fontWeight: 600,
        color: "#0f172a",
        fontSize: 13,
      }}
    >
      <span>{label}</span>
      <input
        className="ohc-in"
        type="date"
        value={value}
        max="2099-12-31"
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1.5px solid #e2e8f0",
          background: "#f8fafc",
          fontSize: 13,
          outline: "none",
        }}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        fontWeight: 600,
        color: "#0f172a",
        fontSize: 13,
      }}
    >
      <span>{label}</span>
      <select
        className="ohc-in"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1.5px solid #e2e8f0",
          background: "#f8fafc",
          fontSize: 13,
          outline: "none",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
