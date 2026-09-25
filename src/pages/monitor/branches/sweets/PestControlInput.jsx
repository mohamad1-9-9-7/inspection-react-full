// src/pages/monitor/branches/sweets/PestControlInput.jsx
// Pest Control Log — input form (visit details + bait stations + photos).
// One record per contractor visit; several visits a day are allowed, so the
// record is keyed with eventReportDate() while payload.date stays the day.

import React, { useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import { uploadImage as uploadImageRaw, deleteImage as deleteImageRaw } from "../../../../utils/imageUpload";
import { eventReportDate } from "./sweetsRecord";

const TYPE = "sweets_pest_control";
const MAX_EXTRA_IMAGES = 8;

export const LOCATIONS = [
  "Raw Material Store",
  "Production Area",
  "Baking Area",
  "Cream & Decoration Room",
  "Packaging Area",
  "Finished Goods Store",
  "Chillers & Freezers",
  "Loading Bay",
  "Staff Area & Toilets",
  "Outside Perimeter",
  "Other",
];

export const VISIT_TYPES = ["Routine", "Ad-hoc", "Re-treatment", "Initial Setup", "Inspection Only"];

export const PEST_TYPES = [
  "Rodents",
  "Flies",
  "Cockroaches",
  "Ants",
  "Birds",
  "Mosquitoes",
  "Stored Product Pests",
  "Other",
];

export const TREATMENT_METHODS = [
  "Spray",
  "Bait Station",
  "Glue Trap",
  "Snap Trap",
  "ULV Fogging",
  "Gel Application",
  "Inspection Only",
  "Other",
];

const uploadImage = (file) => uploadImageRaw(file, TYPE);
async function deleteImage(url) {
  try { await deleteImageRaw(url); } catch { /* already gone */ }
}

/* ===== Styles ===== */
const S = {
  page: { padding: 4 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" },
  title: { fontSize: 18, fontWeight: 950, color: "#0f172a", margin: "0 0 6px" },
  sub: { fontSize: 13, color: "#64748b", fontWeight: 700, marginBottom: 12 },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#0f172a", marginBottom: 4, marginTop: 8 },
  input: { width: "100%", padding: "9px 11px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "inherit", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px 12px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "inherit", minHeight: 70, resize: "vertical", boxSizing: "border-box" },
  row2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 12 },
  btnPrimary: { background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 14 },
  btnSecondary: { background: "#fff", color: "#0f172a", border: "1.5px solid #cbd5e1", padding: "10px 18px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 14 },
  btnDanger: { background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontWeight: 800, fontSize: 12, cursor: "pointer" },
  btnSmall: { background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer" },
  imgGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10, marginTop: 8 },
  imgCard: { position: "relative", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#f8fafc" },
  imgPreview: { width: "100%", height: 90, objectFit: "cover", display: "block" },
  imgRemove: { position: "absolute", top: 4, right: 4, background: "#ef4444", color: "#fff", border: "none", borderRadius: 999, width: 22, height: 22, fontWeight: 950, fontSize: 12, cursor: "pointer" },
  hint: { fontSize: 11, color: "#64748b", fontWeight: 700, marginTop: 4 },
  msg: (kind) => ({ marginTop: 10, padding: "8px 12px", borderRadius: 8, fontWeight: 800, fontSize: 13, background: kind === "ok" ? "#dcfce7" : kind === "err" ? "#fee2e2" : "#e0f2fe", color: kind === "ok" ? "#166534" : kind === "err" ? "#991b1b" : "#075985" }),
  pillBox: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 },
  pill: (active, color) => ({
    padding: "6px 12px",
    borderRadius: 999,
    border: `1.5px solid ${active ? color : "#cbd5e1"}`,
    background: active ? color : "#fff",
    color: active ? "#fff" : "#0f172a",
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
  }),
  stationCard: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, marginBottom: 8 },
  stationHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
};

const today = () => {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
};

export const STATION_STATUSES = ["Active", "Empty", "Captured", "Damaged", "Missing"];

const newStation = () => ({ id: Date.now() + Math.random(), code: "", location: "", status: STATION_STATUSES[0], captures: "" });

export default function PestControlInput() {
  // Header
  const [date, setDate] = useState(today());
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [visitType, setVisitType] = useState(VISIT_TYPES[0]);

  // Company
  const [companyName, setCompanyName] = useState("");
  const [serviceReportNo, setServiceReportNo] = useState("");
  const [technician, setTechnician] = useState("");
  const [licenseNo, setLicenseNo] = useState("");

  // Treatment
  const [pestsTargeted, setPestsTargeted] = useState([]);
  const [methods, setMethods] = useState([]);
  const [chemicals, setChemicals] = useState("");
  const [areasTreated, setAreasTreated] = useState("");

  // Stations
  const [stations, setStations] = useState([]);

  // Findings
  const [findings, setFindings] = useState("");
  const [correctiveActions, setCorrectiveActions] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [nextVisitDate, setNextVisitDate] = useState("");

  // Sign-off
  const [inspector, setInspector] = useState("");
  const [supervisor, setSupervisor] = useState("");

  // Images
  const [serviceReportImage, setServiceReportImage] = useState("");
  const [extraImages, setExtraImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });

  const reportRef = useRef(null);
  const extrasRef = useRef(null);

  function showMsg(kind, text, ms = 2500) {
    setMsg({ kind, text });
    if (ms) setTimeout(() => setMsg({ kind: "", text: "" }), ms);
  }

  function togglePill(value, list, setter) {
    if (list.includes(value)) setter(list.filter((v) => v !== value));
    else setter([...list, value]);
  }

  async function pickServiceReportImage(file) {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      showMsg("err", "The file must be an image.");
      return;
    }
    try {
      setBusy(true);
      if (serviceReportImage) await deleteImage(serviceReportImage);
      const url = await uploadImage(file);
      setServiceReportImage(url);
      showMsg("ok", "✅ Service report uploaded.");
    } catch (e) {
      showMsg("err", `Upload failed: ${e?.message || e}`);
    } finally {
      setBusy(false);
      if (reportRef.current) reportRef.current.value = "";
    }
  }

  async function clearServiceReportImage() {
    if (!serviceReportImage) return;
    const url = serviceReportImage;
    setServiceReportImage("");
    await deleteImage(url);
  }

  async function addExtraImages(fileList) {
    const files = Array.from(fileList || []).filter((f) => String(f.type || "").startsWith("image/"));
    if (!files.length) return;
    const remaining = MAX_EXTRA_IMAGES - extraImages.length;
    if (remaining <= 0) { showMsg("err", `Maximum ${MAX_EXTRA_IMAGES} photos.`); return; }
    try {
      setBusy(true);
      const urls = [];
      for (const f of files.slice(0, remaining)) {
        try { const u = await uploadImage(f); if (u) urls.push(u); } catch {}
      }
      if (urls.length) {
        setExtraImages((prev) => [...prev, ...urls].slice(0, MAX_EXTRA_IMAGES));
        showMsg("ok", `✅ ${urls.length} photo(s) uploaded.`);
      } else {
        showMsg("err", "No photo could be uploaded.");
      }
    } finally {
      setBusy(false);
      if (extrasRef.current) extrasRef.current.value = "";
    }
  }

  async function removeExtraAt(i) {
    const url = extraImages[i];
    setExtraImages((prev) => prev.filter((_, idx) => idx !== i));
    if (url) await deleteImage(url);
  }

  function updateStation(id, field, value) {
    setStations((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  function removeStation(id) {
    setStations((prev) => prev.filter((s) => s.id !== id));
  }

  function resetForm() {
    setDate(today());
    setLocation(LOCATIONS[0]);
    setVisitType(VISIT_TYPES[0]);
    setCompanyName("");
    setServiceReportNo("");
    setTechnician("");
    setLicenseNo("");
    setPestsTargeted([]);
    setMethods([]);
    setChemicals("");
    setAreasTreated("");
    setStations([]);
    setFindings("");
    setCorrectiveActions("");
    setRecommendations("");
    setNextVisitDate("");
    setInspector("");
    setSupervisor("");
    setServiceReportImage("");
    setExtraImages([]);
  }

  async function save() {
    if (!date) { showMsg("err", "Pick the date."); return; }
    if (!companyName.trim()) { showMsg("err", "Enter the pest control company."); return; }
    if (!technician.trim()) { showMsg("err", "Enter the technician name."); return; }
    if (!inspector.trim()) { showMsg("err", "Enter the inspector name."); return; }

    const payload = {
      date,
      reportDate: eventReportDate(date),
      location,
      visitType,
      company: { name: companyName, serviceReportNo, licenseNo },
      technician,
      pestsTargeted,
      methods,
      chemicals,
      areasTreated,
      stations,
      findings,
      correctiveActions,
      recommendations,
      nextVisitDate,
      inspector,
      supervisor,
      images: { serviceReport: serviceReportImage, extras: extraImages },
      savedAt: Date.now(),
    };

    try {
      setBusy(true);
      showMsg("info", "Saving…", 0);
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "sweets", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showMsg("ok", "✅ Pest control visit saved.");
      resetForm();
    } catch (e) {
      showMsg("err", `❌ Save failed: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={S.page}>
      {/* ===== Visit Info ===== */}
      <div style={S.card}>
        <h2 style={S.title}>🐀 Pest Control Log</h2>
        <div style={S.sub}>Record the contractor's visit, the treatment and the bait stations.</div>

        <div style={S.row3}>
          <div>
            <label style={S.label}>Date *</label>
            <input type="date" style={S.input} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Location</label>
            <select style={S.input} value={location} onChange={(e) => setLocation(e.target.value)}>
              {LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Visit Type</label>
            <select style={S.input} value={visitType} onChange={(e) => setVisitType(e.target.value)}>
              {VISIT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ===== Company / Technician ===== */}
      <div style={S.card}>
        <h3 style={S.title}>🏢 Pest Control Company</h3>

        <div style={S.row3}>
          <div>
            <label style={S.label}>Company Name *</label>
            <input style={S.input} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="National Pest Control..." />
          </div>
          <div>
            <label style={S.label}>Service Report No.</label>
            <input style={S.input} value={serviceReportNo} onChange={(e) => setServiceReportNo(e.target.value)} placeholder="SR-..." />
          </div>
          <div>
            <label style={S.label}>License No.</label>
            <input style={S.input} value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} />
          </div>
        </div>

        <div style={S.row2}>
          <div>
            <label style={S.label}>Technician Name *</label>
            <input style={S.input} value={technician} onChange={(e) => setTechnician(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Next Visit Date</label>
            <input type="date" style={S.input} value={nextVisitDate} onChange={(e) => setNextVisitDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* ===== Treatment ===== */}
      <div style={S.card}>
        <h3 style={S.title}>💊 Treatment</h3>

        <label style={S.label}>Pests Targeted</label>
        <div style={S.pillBox}>
          {PEST_TYPES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePill(p, pestsTargeted, setPestsTargeted)}
              style={S.pill(pestsTargeted.includes(p), "#dc2626")}
            >
              {p}
            </button>
          ))}
        </div>

        <label style={S.label}>Treatment Methods</label>
        <div style={S.pillBox}>
          {TREATMENT_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => togglePill(m, methods, setMethods)}
              style={S.pill(methods.includes(m), "#2563eb")}
            >
              {m}
            </button>
          ))}
        </div>

        <label style={S.label}>Chemicals Used</label>
        <textarea style={S.textarea} value={chemicals} onChange={(e) => setChemicals(e.target.value)} placeholder="Product name, concentration, quantity…" />

        <label style={S.label}>Areas Treated</label>
        <textarea style={S.textarea} value={areasTreated} onChange={(e) => setAreasTreated(e.target.value)} placeholder="Store, production hall, outside corridors…" />
      </div>

      {/* ===== Bait Stations ===== */}
      <div style={S.card}>
        <div style={S.stationHead}>
          <h3 style={S.title}>📍 Bait Stations</h3>
          <button type="button" style={S.btnSmall} onClick={() => setStations([...stations, newStation()])}>
            + Add station
          </button>
        </div>

        {stations.length === 0 && (
          <div style={{ ...S.sub, fontStyle: "italic" }}>No stations yet. Press "Add station" to record a bait station or trap.</div>
        )}

        {stations.map((st, idx) => (
          <div key={st.id} style={S.stationCard}>
            <div style={S.stationHead}>
              <span style={{ fontWeight: 900, fontSize: 13 }}>Station #{idx + 1}</span>
              <button type="button" style={S.btnDanger} onClick={() => removeStation(st.id)}>Remove</button>
            </div>
            <div style={S.row3}>
              <div>
                <label style={S.label}>Code</label>
                <input style={S.input} value={st.code} onChange={(e) => updateStation(st.id, "code", e.target.value)} placeholder="BS-001" />
              </div>
              <div>
                <label style={S.label}>Location</label>
                <input style={S.input} value={st.location} onChange={(e) => updateStation(st.id, "location", e.target.value)} placeholder="Store back door" />
              </div>
              <div>
                <label style={S.label}>Status</label>
                <select style={S.input} value={st.status} onChange={(e) => updateStation(st.id, "status", e.target.value)}>
                  {STATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <label style={S.label}>Captures / Activity</label>
            <input style={S.input} value={st.captures} onChange={(e) => updateStation(st.id, "captures", e.target.value)} placeholder="e.g. 2 mice, or no activity" />
          </div>
        ))}
      </div>

      {/* ===== Findings & Actions ===== */}
      <div style={S.card}>
        <h3 style={S.title}>📝 Findings & Actions</h3>

        <label style={S.label}>Findings</label>
        <textarea style={S.textarea} value={findings} onChange={(e) => setFindings(e.target.value)} placeholder="Activity level, entry points, gaps and cracks…" />

        <label style={S.label}>Corrective Actions</label>
        <textarea style={S.textarea} value={correctiveActions} onChange={(e) => setCorrectiveActions(e.target.value)} placeholder="Seal gaps, repair door sweeps, clean-down…" />

        <label style={S.label}>Recommendations for the next visit</label>
        <textarea style={S.textarea} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} placeholder="..." />
      </div>

      {/* ===== Sign-off ===== */}
      <div style={S.card}>
        <h3 style={S.title}>✍️ Sign-off</h3>
        <div style={S.row2}>
          <div>
            <label style={S.label}>Inspector *</label>
            <input style={S.input} value={inspector} onChange={(e) => setInspector(e.target.value)} placeholder="Inspector name" />
          </div>
          <div>
            <label style={S.label}>Supervisor</label>
            <input style={S.input} value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder="Supervisor name" />
          </div>
        </div>
      </div>

      {/* ===== Service Report Photo ===== */}
      <div style={S.card}>
        <h3 style={S.title}>📄 Service Report Photo</h3>
        <div style={S.sub}>Photo of the contractor's service report / invoice.</div>

        {!serviceReportImage && (
          <input
            ref={reportRef}
            type="file"
            accept="image/*"
            onChange={(e) => pickServiceReportImage(e.target.files?.[0])}
            disabled={busy}
            style={S.input}
          />
        )}
        {serviceReportImage && (
          <div style={{ ...S.imgCard, maxWidth: 320, marginTop: 6 }}>
            <a href={serviceReportImage} target="_blank" rel="noreferrer">
              <img src={serviceReportImage} alt="Service Report" style={{ ...S.imgPreview, height: 220 }} />
            </a>
            <button type="button" onClick={clearServiceReportImage} style={S.imgRemove} title="Remove">✕</button>
          </div>
        )}
      </div>

      {/* ===== Extra Photos ===== */}
      <div style={S.card}>
        <h3 style={S.title}>📷 Extra Photos (optional)</h3>
        <div style={S.sub}>Stations, pests found, entry points… (up to {MAX_EXTRA_IMAGES} photos)</div>

        <input
          ref={extrasRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => addExtraImages(e.target.files)}
          disabled={busy || extraImages.length >= MAX_EXTRA_IMAGES}
          style={S.input}
        />
        <div style={S.hint}>{extraImages.length} / {MAX_EXTRA_IMAGES}</div>

        {extraImages.length > 0 && (
          <div style={S.imgGrid}>
            {extraImages.map((u, i) => (
              <div key={`${u}-${i}`} style={S.imgCard}>
                <a href={u} target="_blank" rel="noreferrer">
                  <img src={u} alt={`Extra ${i + 1}`} style={S.imgPreview} />
                </a>
                <button type="button" onClick={() => removeExtraAt(i)} style={S.imgRemove}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button style={S.btnSecondary} onClick={resetForm} disabled={busy}>Reset</button>
        <button style={S.btnPrimary} onClick={save} disabled={busy}>
          {busy ? "⏳ Saving…" : "💾 Save"}
        </button>
      </div>

      {msg.text && <div style={S.msg(msg.kind)}>{msg.text}</div>}
    </div>
  );
}
