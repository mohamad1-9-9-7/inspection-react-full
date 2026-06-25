import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && (process.env?.REACT_APP_API_URL || process.env?.VITE_API_URL)) ||
    API_ROOT_DEFAULT
).replace(/\/$/, "");

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

async function readJson(res) {
  const text = await res.text().catch(() => "");
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

async function fetchJson(url, options) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...(options?.body ? { "Content-Type": "application/json" } : {}) },
    ...options,
  });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  return data;
}

async function uploadImage(file) {
  if (!file || !file.type?.startsWith("image/")) throw new Error("Only image files are allowed.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} is larger than 15 MB.`);
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) throw new Error(data?.error || "Upload failed");
  return {
    url: data.optimized_url || data.url,
    originalUrl: data.url || data.optimized_url,
    name: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: new Date().toISOString(),
  };
}

function safe(v, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function submittedEvidenceMap(payload) {
  const updates = payload?.public?.submission?.closedEvidenceUpdates || payload?.closedEvidenceUpdates || [];
  return updates.reduce((acc, item) => {
    const idx = Number(item?.rowIndex);
    if (Number.isInteger(idx)) acc[idx] = Array.isArray(item.images) ? item.images : [];
    return acc;
  }, {});
}

const S = {
  page: { minHeight: "100vh", padding: 18, background: "#f8fafc", color: "#0f172a", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif' },
  wrap: { width: "100%", margin: "0 auto" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 950 },
  sub: { marginTop: 4, color: "#475569", fontSize: 13, fontWeight: 700 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, marginBottom: 12, boxShadow: "0 8px 20px rgba(15,23,42,0.06)" },
  meta: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, color: "#475569", fontSize: 12, fontWeight: 800 },
  row: { border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginTop: 10, background: "#fff" },
  label: { display: "block", marginTop: 8, marginBottom: 4, fontSize: 12, fontWeight: 950, color: "#334155" },
  readonly: { padding: 10, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" },
  badge: (bg, fg = "#fff") => ({ display: "inline-flex", padding: "3px 9px", borderRadius: 999, background: bg, color: fg, fontSize: 11, fontWeight: 950 }),
  file: { width: "100%", padding: 10, border: "1px dashed #94a3b8", borderRadius: 8, background: "#f8fafc" },
  thumbs: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, marginTop: 8 },
  thumb: { width: "100%", height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #cbd5e1" },
  btn: { background: "#16a34a", color: "#fff", border: "1px solid #15803d", borderRadius: 8, padding: "10px 14px", fontWeight: 950, cursor: "pointer" },
  ghost: { background: "#fff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: 8, padding: "10px 14px", fontWeight: 900 },
  msg: { padding: 12, borderRadius: 8, background: "#ecfeff", border: "1px solid #a5f3fc", color: "#155e75", fontWeight: 800, marginBottom: 12 },
  err: { padding: 12, borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontWeight: 800, marginBottom: 12 },
};

export default function InspectionEvidencePublic() {
  const { token } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState({});
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const data = await fetchJson(`${API_BASE}/api/reports/public/${encodeURIComponent(token || "")}`, { method: "GET" });
        const rep = data?.report || data?.item || data?.data || data;
        if (!alive) return;
        setRecord(rep);
        const p = rep?.payload || {};
        setDone(!!p?.public?.submittedAt || !!p?.public?.submission?.closedEvidenceSubmittedAt);
      } catch (e) {
        if (alive) setErr(e?.message || "Failed to load report");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [token]);

  const payload = record?.payload || {};
  const header = payload.header || {};
  const table = useMemo(() => Array.isArray(payload.table) ? payload.table : [], [payload.table]);
  const previousEvidence = submittedEvidenceMap(payload);

  async function handleFiles(rowIndex, files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    setErr("");
    setMsg("");
    setSaving(true);
    try {
      const uploaded = [];
      for (const file of list) uploaded.push(await uploadImage(file));
      setUploads((prev) => ({ ...prev, [rowIndex]: [...(prev[rowIndex] || []), ...uploaded] }));
      setMsg("Images uploaded. Press Send Evidence when ready.");
    } catch (e) {
      setErr(e?.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    const closedEvidenceUpdates = Object.entries(uploads)
      .filter(([, images]) => Array.isArray(images) && images.length)
      .map(([rowIndex, images]) => ({ rowIndex: Number(rowIndex), images }));
    if (!closedEvidenceUpdates.length) {
      setErr("Please upload at least one Closed Evidence image before sending.");
      return;
    }
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      await fetchJson(`${API_BASE}/api/reports/public/${encodeURIComponent(token || "")}/submit`, {
        method: "POST",
        body: JSON.stringify({
          submissionType: "inspection_closed_evidence",
          closedEvidenceUpdates,
          closedEvidenceSubmittedAt: new Date().toISOString(),
          submittedBy: safe(header.location || record?.branch, "branch"),
        }),
      });
      setDone(true);
      setMsg("Closed Evidence sent successfully. QA will review and close the status.");
    } catch (e) {
      setErr(e?.message || "Submit failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={S.page}>
      <div style={S.wrap}>
        <div style={S.head}>
          <div>
            <div style={S.title}>Closed Evidence Upload</div>
            <div style={S.sub}>This report is read-only. You can add corrective closure photos only.</div>
          </div>
          <span style={S.badge(done ? "#16a34a" : "#d97706")}>{done ? "Submitted" : "Pending"}</span>
        </div>

        {loading && <div style={S.card}>Loading...</div>}
        {err && <div style={S.err}>{err}</div>}
        {msg && <div style={S.msg}>{msg}</div>}

        {!loading && record && (
          <>
            <section style={S.card}>
              <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 8 }}>
                {safe(payload.title, "Internal Audit Report")}
              </div>
              <div style={S.meta}>
                <div>Branch: {safe(record.branch || header.location)}</div>
                <div>Date: {safe(header.date)}</div>
                <div>Report No: {safe(header.reportNo)}</div>
                <div>Audited By: {safe(header.auditConductedBy)}</div>
              </div>
            </section>

            <section style={S.card}>
              <div style={{ fontSize: 16, fontWeight: 950 }}>Report Findings</div>
              {table.length === 0 && <div style={S.readonly}>No rows found in this report.</div>}
              {table.map((row, idx) => {
                const ready = uploads[idx] || [];
                const previous = previousEvidence[idx] || [];
                const isClosed = String(row.status || "").toLowerCase() === "closed";
                return (
                  <div key={idx} style={S.row}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <b>Row #{idx + 1}</b>
                      <span style={S.badge(isClosed ? "#16a34a" : "#d97706")}>{safe(row.status, "Open")}</span>
                    </div>
                    <label style={S.label}>Non-Conformance</label>
                    <div style={S.readonly}>{safe(row.nonConformance)}</div>
                    <label style={S.label}>Corrective / Preventive Action</label>
                    <div style={S.readonly}>{safe(row.corrective)}</div>
                    {Array.isArray(row.evidenceImgs) && row.evidenceImgs.length > 0 && (
                      <>
                        <label style={S.label}>Original Evidence Photos</label>
                        <div style={S.thumbs}>
                          {row.evidenceImgs.map((src, imgIdx) => (
                            <a key={`${src}-${imgIdx}`} href={src} target="_blank" rel="noreferrer">
                              <img src={src} alt="Original evidence" style={S.thumb} />
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                    <label style={S.label}>Closed Evidence Photos</label>
                    {done ? (
                      <div style={S.readonly}>Evidence already submitted for this link.</div>
                    ) : (
                      <input type="file" accept="image/*" multiple style={S.file} disabled={saving || isClosed} onChange={(e) => handleFiles(idx, e.target.files)} />
                    )}
                    {(ready.length > 0 || previous.length > 0) && (
                      <div style={S.thumbs}>
                        {[...previous, ...ready].map((img, imgIdx) => (
                          <img key={`${img.url || img}-${imgIdx}`} src={img.url || img} alt={img.name || "Closed evidence"} style={S.thumb} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 24 }}>
              <button style={S.ghost} disabled>{Object.values(uploads).flat().length} image(s) ready</button>
              {!done && <button style={S.btn} onClick={submit} disabled={saving}>{saving ? "Working..." : "Send Evidence"}</button>}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
