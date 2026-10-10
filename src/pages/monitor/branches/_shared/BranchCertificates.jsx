// src/pages/monitor/branches/_shared/BranchCertificates.jsx
// A branch's own food-safety certificates (ISO 22000, HACCP) — open or
// download only. Each branch sees ITS certificate and nothing else: the SGS
// multisite certificate was split per site (main site = QCS, .01 = POS 10
// Abu Dhabi, .02 = POS 15 Al Barsha, .03 = POS 11 Al Ain), and every branch
// keeps its own record (type `branch_certificates`, reportDate `cert-<slug>`).
//
// Uploading / replacing / removing a file is admin-only. Files go through the
// server's /api/images route to Cloudinary, the same path the Licenses page
// uses for PDFs — never into the payload (no base64).
import React, { useCallback, useEffect, useState } from "react";
import API_BASE from "../../../../config/api";
import { getReportRowByDate, payloadOf, saveReport } from "./reportApi";
import { getPerms, getCurrentUser } from "../../../../utils/perms";

const TYPE = "branch_certificates";
const SGS = "SGS Gulf Limited";

/* What each site is certified for, read from the SGS certificates (renewal
   2026). The file is attached from the page; the details below are shown even
   before it is. Validity is per certificate, so a renewal = new dates here. */
const SITES = {
  "QCS": {
    slug: "qcs",
    site: "Main site — Al Qusais, opposite Zulekha Hospital, Dubai",
    certs: [
      { key: "iso22000", standard: "ISO 22000:2018", certNo: "AE22/00000195", validFrom: "2026-08-12", validTo: "2029-06-08", issue: "5" },
      { key: "haccp", standard: "HACCP (CXC 1-1969, Rev. 2022)", certNo: "AE22/00000196", validFrom: "2026-08-14", validTo: "2029-06-08", issue: "5" },
    ],
  },
  "POS 10": {
    slug: "pos10",
    site: "Site 1 — Tourist Club Area, Al Miyani Street, Abu Dhabi",
    certs: [
      { key: "iso22000", standard: "ISO 22000:2018", certNo: "AE22/00000195.01", validFrom: "2026-08-12", validTo: "2029-06-08", issue: "4" },
      { key: "haccp", standard: "HACCP (CXC 1-1969, Rev. 2022)", certNo: "AE22/00000196.01", validFrom: "2026-08-14", validTo: "2029-06-08", issue: "4" },
    ],
  },
  "POS 15": {
    slug: "pos15",
    site: "Site 2 — Al Ghurair Hotel Departments, Al Barsha 1 Street, Dubai",
    certs: [
      { key: "iso22000", standard: "ISO 22000:2018", certNo: "AE22/00000195.02", validFrom: "2026-08-12", validTo: "2029-06-08", issue: "4" },
      { key: "haccp", standard: "HACCP (CXC 1-1969, Rev. 2022)", certNo: "AE22/00000196.02", validFrom: "2026-08-14", validTo: "2029-06-08", issue: "4" },
    ],
  },
  "POS 11": {
    slug: "pos11",
    site: "Site 3 — Ali Bin Taleb Street, next to Sharjah Islamic Bank, Al Ain",
    certs: [
      { key: "iso22000", standard: "ISO 22000:2018", certNo: "AE22/00000195.03", validFrom: "2026-08-12", validTo: "2029-06-08", issue: "4" },
      { key: "haccp", standard: "HACCP (CXC 1-1969, Rev. 2022)", certNo: "AE22/00000196.03", validFrom: "2026-08-14", validTo: "2029-06-08", issue: "4" },
    ],
  },
};

const normBranch = (b) => String(b || "").replace(/-/g, " ").trim().toUpperCase().replace(/^QCS$/, "QCS");
/** Does this branch have certificates to show? (used to add the tab) */
export function hasCertificates(branch) {
  const k = normBranch(branch);
  return Object.keys(SITES).some((s) => s.toUpperCase() === k);
}
const siteOf = (branch) => {
  const k = normBranch(branch);
  const key = Object.keys(SITES).find((s) => s.toUpperCase() === k);
  return key ? { branch: key, ...SITES[key] } : null;
};

const fmt = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};
function statusOf(validTo) {
  if (!validTo) return { tone: "na", text: "No expiry date" };
  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }));
  const days = Math.round((new Date(validTo) - today) / 86400000);
  if (days < 0) return { tone: "bad", text: `Expired ${-days} day(s) ago` };
  if (days <= 90) return { tone: "warn", text: `Expires in ${days} day(s)` };
  return { tone: "good", text: "Valid" };
}

async function uploadPdf(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("purpose", "branch_certificate");
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Upload failed (HTTP ${res.status})`);
  const url = data?.url || data?.secure_url || data?.optimized_url || "";
  if (!url) throw new Error("No file link came back from the server.");
  return url;
}

const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
#root .bcert.bcert { color:#0f172a; }
#root .bcert.bcert .bc-head { margin-bottom:14px; }
#root .bcert.bcert .bc-title { font-size:${fs(21)}; font-weight:900; margin:0; }
#root .bcert.bcert .bc-site { font-size:${fs(14)}; font-weight:700; color:#475569; margin-top:4px; }
#root .bcert.bcert .bc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(380px,100%),1fr)); gap:14px; }
#root .bcert.bcert .bc-card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:12px; box-shadow:0 1px 2px rgba(15,23,42,.04); }
#root .bcert.bcert .bc-top { display:flex; gap:12px; align-items:center; }
#root .bcert.bcert .bc-seal { width:54px; height:54px; border-radius:14px; display:grid; place-items:center; font-size:${fs(26)}; background:#ecfeff; border:1px solid #a5f3fc; flex-shrink:0; }
#root .bcert.bcert .bc-std { font-size:${fs(17)}; font-weight:900; line-height:1.25; }
#root .bcert.bcert .bc-no { font-size:${fs(13.5)}; font-weight:800; color:#0369a1; margin-top:2px; }
#root .bcert.bcert .bc-meta { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
#root .bcert.bcert .bc-meta div { background:#f8fafc; border:1px solid #eef2f7; border-radius:10px; padding:8px 10px; }
#root .bcert.bcert .bc-meta b { display:block; font-size:${fs(11)}; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:.05em; }
#root .bcert.bcert .bc-meta span { font-size:${fs(14)}; font-weight:800; }
#root .bcert.bcert .bc-st { display:inline-block; font-size:${fs(12.5)}; font-weight:900; border-radius:999px; padding:3px 10px; }
#root .bcert.bcert .st-good { background:#dcfce7; color:#15803d; }
#root .bcert.bcert .st-warn { background:#fef3c7; color:#a16207; }
#root .bcert.bcert .st-bad  { background:#fee2e2; color:#b91c1c; }
#root .bcert.bcert .st-na   { background:#f1f5f9; color:#475569; }
#root .bcert.bcert .bc-actions { display:flex; gap:8px; flex-wrap:wrap; }
#root .bcert.bcert .bc-btn { flex:1 1 140px; min-height:44px; border-radius:11px; font-size:${fs(14)}; font-weight:800; cursor:pointer; font-family:inherit; display:inline-flex; align-items:center; justify-content:center; gap:6px; border:1.5px solid #cbd5e1; background:#fff; color:#334155; }
#root .bcert.bcert .bc-btn.pri { background:#0f766e; border-color:#0f766e; color:#fff; }
#root .bcert.bcert .bc-btn:hover { filter:brightness(1.05); }
#root .bcert.bcert .bc-btn:disabled { opacity:.55; cursor:not-allowed; }
#root .bcert.bcert .bc-admin { border-top:1px dashed #e2e8f0; padding-top:10px; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
#root .bcert.bcert .bc-admin small { font-size:${fs(12)}; color:#64748b; font-weight:700; flex:1 1 100%; }
#root .bcert.bcert .bc-admin .bc-btn { flex:0 1 auto; min-height:38px; font-size:${fs(13)}; padding:0 12px; }
#root .bcert.bcert .bc-admin .red { color:#b91c1c; border-color:#fecaca; background:#fff1f2; }
#root .bcert.bcert .bc-missing { font-size:${fs(13.5)}; font-weight:700; color:#64748b; background:#f8fafc; border:1.5px dashed #cbd5e1; border-radius:10px; padding:10px 12px; }
#root .bcert.bcert .bc-msg { margin-top:12px; font-size:${fs(14)}; font-weight:800; }
#root .bcert.bcert .bc-msg.err { color:#b91c1c; }
`;

export default function BranchCertificates({ branch }) {
  const site = siteOf(branch);
  const perms = getPerms();
  const isAdmin = !!(perms?.isAdmin || perms?.isSuperAdmin || getCurrentUser()?.isSuperAdmin);

  const [files, setFiles] = useState({});      // certKey → { url, fileName, uploadedAt, uploadedBy }
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState({ text: "", tone: "" });

  const reportDate = site ? `cert-${site.slug}` : "";

  /* Depends on the reportDate STRING only. siteOf() builds a new object on
     every render, so depending on `site` re-ran this after each setState and
     the page never left "Loading…". */
  const load = useCallback(async () => {
    if (!reportDate) { setLoading(false); return; }
    setLoading(true);
    try {
      const row = await getReportRowByDate(TYPE, reportDate);
      setFiles(payloadOf(row)?.files || {});
    } catch (e) {
      setMsg({ text: "Could not load the certificates: " + (e?.message || e), tone: "err" });
    } finally {
      setLoading(false);
    }
  }, [reportDate]);

  useEffect(() => { load(); }, [load]);

  async function persist(next) {
    // One config record per branch: PUT upserts by (type, reportDate).
    await saveReport(TYPE, { reportDate, branch: site.branch, files: next }, { reporter: "certificates" });
    setFiles(next);
  }

  async function onPick(cert, file) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      setMsg({ text: "Please choose the certificate PDF.", tone: "err" });
      return;
    }
    setBusy(cert.key);
    setMsg({ text: "", tone: "" });
    try {
      const url = await uploadPdf(file);
      const user = getCurrentUser() || {};
      await persist({
        ...files,
        [cert.key]: { url, fileName: file.name, uploadedAt: new Date().toISOString(), uploadedBy: user.displayName || user.username || "" },
      });
      setMsg({ text: `✅ ${cert.standard} attached.`, tone: "" });
    } catch (e) {
      setMsg({ text: "Upload failed: " + (e?.message || e), tone: "err" });
    } finally {
      setBusy("");
    }
  }

  async function onRemove(cert) {
    if (!window.confirm(`Remove the ${cert.standard} file from ${site.branch}? (You can attach it again.)`)) return;
    setBusy(cert.key);
    try {
      const next = { ...files };
      delete next[cert.key];
      await persist(next);
    } catch (e) {
      setMsg({ text: "Could not remove: " + (e?.message || e), tone: "err" });
    } finally {
      setBusy("");
    }
  }

  /* A cross-origin <a download> is ignored by browsers, so fetch the file and
     save it under a clear name; if that is blocked, open it instead. */
  async function onDownload(cert, f) {
    const name = `${site.branch.replace(/\s+/g, "")}_${cert.key.toUpperCase()}_${cert.certNo.replace(/\//g, "-")}.pdf`;
    setBusy(cert.key);
    try {
      const res = await fetch(f.url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch {
      window.open(f.url, "_blank", "noopener");
    } finally {
      setBusy("");
    }
  }

  if (!site) {
    return <div className="bcert"><style>{CSS}</style><div className="bc-missing">No certificates are registered for this branch.</div></div>;
  }

  return (
    <div className="bcert" dir="ltr" lang="en">
      <style>{CSS}</style>
      <div className="bc-head">
        <h2 className="bc-title">📜 Certificates — {site.branch}</h2>
        <div className="bc-site">{site.site}</div>
      </div>

      {loading ? <div className="bc-missing">Loading…</div> : (
        <div className="bc-grid">
          {site.certs.map((c) => {
            const f = files[c.key];
            const st = statusOf(c.validTo);
            return (
              <div key={c.key} className="bc-card">
                <div className="bc-top">
                  <div className="bc-seal" aria-hidden="true">{c.key === "haccp" ? "🛡️" : "🏅"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="bc-std">{c.standard}</div>
                    <div className="bc-no">Certificate {c.certNo}</div>
                  </div>
                  <span className={`bc-st st-${st.tone}`}>{st.text}</span>
                </div>
                <div className="bc-meta">
                  <div><b>Valid from</b><span>{fmt(c.validFrom)}</span></div>
                  <div><b>Valid until</b><span>{fmt(c.validTo)}</span></div>
                  <div><b>Issued by</b><span>{SGS}</span></div>
                  <div><b>Issue</b><span>{c.issue}</span></div>
                </div>

                {f?.url ? (
                  <div className="bc-actions">
                    <button type="button" className="bc-btn pri" onClick={() => window.open(f.url, "_blank", "noopener")}>👁️ Open</button>
                    <button type="button" className="bc-btn" disabled={busy === c.key} onClick={() => onDownload(c, f)}>
                      {busy === c.key ? "…" : "⬇️ Download"}
                    </button>
                  </div>
                ) : (
                  <div className="bc-missing">The certificate file has not been attached yet.</div>
                )}

                {isAdmin && (
                  <div className="bc-admin">
                    <small>{f?.url ? `Attached ${f.uploadedAt ? fmt(f.uploadedAt.slice(0, 10)) : ""}${f.uploadedBy ? ` by ${f.uploadedBy}` : ""} · ${f.fileName || ""}` : "Admin: attach this branch's own certificate PDF."}</small>
                    <label className="bc-btn" style={{ cursor: busy ? "wait" : "pointer" }}>
                      {busy === c.key ? "Uploading…" : f?.url ? "Replace PDF" : "📎 Attach PDF"}
                      <input type="file" accept="application/pdf" hidden disabled={!!busy}
                        onChange={(e) => { onPick(c, e.target.files?.[0]); e.target.value = ""; }} />
                    </label>
                    {f?.url && <button type="button" className="bc-btn red" disabled={!!busy} onClick={() => onRemove(c)}>Remove</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {msg.text && <div className={`bc-msg ${msg.tone}`}>{msg.text}</div>}
    </div>
  );
}
