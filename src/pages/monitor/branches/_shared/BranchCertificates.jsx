// src/pages/monitor/branches/_shared/BranchCertificates.jsx
// Food-safety certificates (ISO 22000, HACCP) per certified site.
//
// Two ways in:
//   • <BranchCertificates branch="POS 10" />  — the branch's View reports tab.
//     READ ONLY for everyone (open / preview / download): a branch sees its own
//     site's certificate and nothing else.
//   • <CertificatesPanel branch="POS 10" manage />  — used by the ISO & HACCP
//     card's "Site Certificates" page, the only place files are attached,
//     replaced or removed.
//
// The SGS multisite certificate was split per site: main site = QCS (Al
// Qusais), .01 = POS 10 Abu Dhabi, .02 = POS 15 Al Barsha, .03 = POS 11 Al Ain.
// One record per site: type `branch_certificates`, reportDate `cert-<slug>`
// (≤ 10 chars — the server compares LEFT(reportDate, 10)), payload.files.
// Files go through /api/images to Cloudinary, never into the payload.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import API_BASE from "../../../../config/api";
import { getReportRowByDate, payloadOf, saveReport } from "./reportApi";
import { getCurrentUser } from "../../../../utils/perms";

export const CERT_TYPE = "branch_certificates";
const SGS = "SGS Gulf Limited";

const SCOPE_BRANCH =
  "Wholesale and retailing of fresh, chilled and frozen cheese and meat, including cutting, portioning, mincing and marination (poultry, mutton/lamb, beef and veal) and their offal.";
const SCOPE_MAIN =
  "Processing (cutting, portioning, deboning, marination) and dispatch of fresh, chilled and frozen meat (poultry, mutton/lamb, beef, veal and their offal) and reconstituted chilled meat products to retail outlets and HORECA chains; wholesale/retail of cheese, lamb carcass and beef meat.";

const ISO = { key: "iso22000", standard: "ISO 22000:2018", short: "ISO 22000", validFrom: "2026-08-12", validTo: "2029-06-08" };
const HACCP = { key: "haccp", standard: "HACCP (CXC 1-1969, Rev. 2022)", short: "HACCP", validFrom: "2026-08-14", validTo: "2029-06-08" };

/* From the SGS certificates (renewal 2026). A renewal = new numbers/dates here
   + re-attach the new PDFs from the Site Certificates page. */
export const CERT_SITES = {
  "QCS": {
    slug: "qcs", label: "QCS — Main site",
    site: "Al Qusais, opposite Zulekha Hospital, Dubai", category: "CI · FI", scope: SCOPE_MAIN,
    certs: [{ ...ISO, certNo: "AE22/00000195", issue: "5" }, { ...HACCP, certNo: "AE22/00000196", issue: "5" }],
  },
  "POS 10": {
    slug: "pos10", label: "POS 10 — Abu Dhabi",
    site: "Site 1 — Tourist Club Area, Al Miyani Street, Abu Dhabi", category: "FI", scope: SCOPE_BRANCH,
    certs: [{ ...ISO, certNo: "AE22/00000195.01", issue: "4" }, { ...HACCP, certNo: "AE22/00000196.01", issue: "4" }],
  },
  "POS 15": {
    slug: "pos15", label: "POS 15 — Al Barsha",
    site: "Site 2 — Al Ghurair Hotel Departments, Al Barsha 1 Street, Dubai", category: "FI", scope: SCOPE_BRANCH,
    certs: [{ ...ISO, certNo: "AE22/00000195.02", issue: "4" }, { ...HACCP, certNo: "AE22/00000196.02", issue: "4" }],
  },
  "POS 11": {
    slug: "pos11", label: "POS 11 — Al Ain",
    site: "Site 3 — Ali Bin Taleb Street, next to Sharjah Islamic Bank, Al Ain", category: "FI", scope: SCOPE_BRANCH,
    certs: [{ ...ISO, certNo: "AE22/00000195.03", issue: "4" }, { ...HACCP, certNo: "AE22/00000196.03", issue: "4" }],
  },
};

const keyOf = (branch) => {
  const k = String(branch || "").replace(/-/g, " ").trim().toUpperCase();
  return Object.keys(CERT_SITES).find((s) => s.toUpperCase() === k) || "";
};
/** Does this branch have certificates? (adds the View reports tab) */
export const hasCertificates = (branch) => !!keyOf(branch);
export const certReportDate = (branch) => (keyOf(branch) ? `cert-${CERT_SITES[keyOf(branch)].slug}` : "");

export const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};
const todayDubai = () => new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }));
export function certStatus(c) {
  const days = Math.round((new Date(c.validTo) - todayDubai()) / 86400000);
  const span = Math.max(1, (new Date(c.validTo) - new Date(c.validFrom)) / 86400000);
  const left = Math.min(100, Math.max(0, (days / span) * 100));
  if (days < 0) return { tone: "bad", text: `Expired ${-days} day(s) ago`, days, left: 0 };
  if (new Date(c.validFrom) > todayDubai()) return { tone: "info", text: `Starts ${fmtDate(c.validFrom)}`, days, left: 100 };
  if (days <= 90) return { tone: "warn", text: `Expires in ${days} day(s)`, days, left };
  return { tone: "good", text: "Valid", days, left };
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

/** Loads one site's attached files. */
export function useSiteCertificates(branch) {
  const reportDate = certReportDate(branch);
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Depends on the reportDate STRING only (a new object per render looped forever).
  const load = useCallback(async () => {
    if (!reportDate) { setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const row = await getReportRowByDate(CERT_TYPE, reportDate);
      setFiles(payloadOf(row)?.files || {});
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [reportDate]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (next) => {
    await saveReport(CERT_TYPE, { reportDate, branch: keyOf(branch), files: next }, { reporter: "certificates" });
    setFiles(next);
  }, [reportDate, branch]);

  return { files, loading, error, reload: load, save };
}

const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
export const CERT_CSS = `
#root .bcert.bcert { color:#0f172a; }
#root .bcert.bcert .bc-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:14px; }
#root .bcert.bcert .bc-title { font-size:${fs(21)}; font-weight:900; margin:0; }
#root .bcert.bcert .bc-site { font-size:${fs(14)}; font-weight:700; color:#475569; margin-top:4px; }
#root .bcert.bcert .bc-scope { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:10px 14px; margin-bottom:14px; }
#root .bcert.bcert .bc-scope b { display:block; font-size:${fs(11.5)}; font-weight:900; color:#64748b; text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px; }
#root .bcert.bcert .bc-scope p { margin:0; font-size:${fs(14)}; line-height:1.6; color:#334155; font-weight:600; }
#root .bcert.bcert .bc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(380px,100%),1fr)); gap:14px; }
#root .bcert.bcert .bc-card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:12px; box-shadow:0 1px 2px rgba(15,23,42,.04); }
#root .bcert.bcert .bc-top { display:flex; gap:12px; align-items:center; }
#root .bcert.bcert .bc-seal { width:54px; height:54px; border-radius:14px; display:grid; place-items:center; font-size:${fs(26)}; background:#ecfeff; border:1px solid #a5f3fc; flex-shrink:0; }
#root .bcert.bcert .bc-std { font-size:${fs(17)}; font-weight:900; line-height:1.25; }
#root .bcert.bcert .bc-no { font-size:${fs(13.5)}; font-weight:800; color:#0369a1; margin-top:2px; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
#root .bcert.bcert .bc-copy { border:1px solid #bae6fd; background:#f0f9ff; color:#0369a1; border-radius:8px; font-size:${fs(11.5)}; font-weight:800; padding:1px 8px; cursor:pointer; font-family:inherit; }
#root .bcert.bcert .bc-meta { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
#root .bcert.bcert .bc-meta div { background:#f8fafc; border:1px solid #eef2f7; border-radius:10px; padding:8px 10px; }
#root .bcert.bcert .bc-meta b { display:block; font-size:${fs(11)}; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:.05em; }
#root .bcert.bcert .bc-meta span { font-size:${fs(14)}; font-weight:800; }
#root .bcert.bcert .bc-life { height:8px; border-radius:999px; background:#e2e8f0; overflow:hidden; }
#root .bcert.bcert .bc-life i { display:block; height:100%; border-radius:999px; }
#root .bcert.bcert .bc-life-t { font-size:${fs(12)}; font-weight:700; color:#64748b; margin-top:4px; }
#root .bcert.bcert .bc-st { display:inline-block; font-size:${fs(12.5)}; font-weight:900; border-radius:999px; padding:3px 10px; white-space:nowrap; }
#root .bcert.bcert .st-good { background:#dcfce7; color:#15803d; }
#root .bcert.bcert .st-warn { background:#fef3c7; color:#a16207; }
#root .bcert.bcert .st-bad  { background:#fee2e2; color:#b91c1c; }
#root .bcert.bcert .st-info { background:#e0f2fe; color:#0369a1; }
#root .bcert.bcert .st-na   { background:#f1f5f9; color:#475569; }
#root .bcert.bcert .bc-actions { display:flex; gap:8px; flex-wrap:wrap; }
#root .bcert.bcert .bc-btn { flex:1 1 120px; min-height:44px; border-radius:11px; font-size:${fs(14)}; font-weight:800; cursor:pointer; font-family:inherit; display:inline-flex; align-items:center; justify-content:center; gap:6px; border:1.5px solid #cbd5e1; background:#fff; color:#334155; padding:0 12px; }
#root .bcert.bcert .bc-btn.pri { background:#0f766e; border-color:#0f766e; color:#fff; }
#root .bcert.bcert .bc-btn.on { background:#ecfeff; border-color:#22d3ee; color:#0e7490; }
#root .bcert.bcert .bc-btn:hover { filter:brightness(1.05); }
#root .bcert.bcert .bc-btn:disabled { opacity:.55; cursor:not-allowed; }
#root .bcert.bcert .bc-frame { width:100%; height:min(78vh, 900px); border:1px solid #e2e8f0; border-radius:12px; background:#f8fafc; }
#root .bcert.bcert .bc-admin { border-top:1px dashed #e2e8f0; padding-top:10px; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
#root .bcert.bcert .bc-admin small { font-size:${fs(12)}; color:#64748b; font-weight:700; flex:1 1 100%; }
#root .bcert.bcert .bc-admin .bc-btn { flex:0 1 auto; min-height:38px; font-size:${fs(13)}; }
#root .bcert.bcert .bc-admin .red { color:#b91c1c; border-color:#fecaca; background:#fff1f2; }
#root .bcert.bcert .bc-missing { font-size:${fs(13.5)}; font-weight:700; color:#64748b; background:#f8fafc; border:1.5px dashed #cbd5e1; border-radius:10px; padding:10px 12px; }
#root .bcert.bcert .bc-msg { margin-top:12px; font-size:${fs(14)}; font-weight:800; }
#root .bcert.bcert .bc-msg.err { color:#b91c1c; }
`;

const LIFE_COLOR = { good: "#16a34a", warn: "#ca8a04", bad: "#dc2626", info: "#0ea5e9", na: "#94a3b8" };

/**
 * One site's certificates.
 *  - manage=false (default): open / preview / download only — no edit control
 *    is rendered for anyone, admins included.
 *  - manage=true: attach / replace / remove (the Site Certificates page;
 *    the caller decides who may reach it).
 */
export function CertificatesPanel({ branch, manage = false, compactHead = false }) {
  const key = keyOf(branch);
  const site = key ? CERT_SITES[key] : null;
  const { files, loading, error, save } = useSiteCertificates(branch);
  const [busy, setBusy] = useState("");
  const [preview, setPreview] = useState("");
  const [msg, setMsg] = useState({ text: "", tone: "" });

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
      await save({ ...files, [cert.key]: { url, fileName: file.name, uploadedAt: new Date().toISOString(), uploadedBy: user.displayName || user.username || "" } });
      setMsg({ text: `✅ ${cert.short} attached for ${key}.`, tone: "" });
    } catch (e) {
      setMsg({ text: "Upload failed: " + (e?.message || e), tone: "err" });
    } finally {
      setBusy("");
    }
  }

  async function onRemove(cert) {
    if (!window.confirm(`Remove the ${cert.short} file from ${key}? The branch will no longer see it until you attach it again.`)) return;
    setBusy(cert.key);
    try {
      const next = { ...files };
      delete next[cert.key];
      await save(next);
      if (preview === cert.key) setPreview("");
    } catch (e) {
      setMsg({ text: "Could not remove: " + (e?.message || e), tone: "err" });
    } finally {
      setBusy("");
    }
  }

  /* A cross-origin <a download> is ignored by browsers, so fetch the file and
     save it under a clear name; if that is blocked, open it instead. */
  async function onDownload(cert, f) {
    const name = `${key.replace(/\s+/g, "")}_${cert.short.replace(/\s+/g, "")}_${cert.certNo.replace(/\//g, "-")}.pdf`;
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

  const copyNo = async (no) => {
    try { await navigator.clipboard.writeText(no); setMsg({ text: `Copied ${no}`, tone: "" }); }
    catch { window.prompt("Certificate number:", no); }
  };

  if (!site) return <div className="bc-missing">No certificates are registered for this branch.</div>;

  return (
    <div>
      <div className="bc-head">
        <div>
          <h2 className="bc-title">{compactHead ? site.label : `📜 Certificates — ${key}`}</h2>
          <div className="bc-site">{site.site}</div>
        </div>
      </div>

      <div className="bc-scope">
        <b>Certified scope · Food category {site.category}</b>
        <p>{site.scope}</p>
      </div>

      {loading ? <div className="bc-missing">Loading…</div> : error ? (
        <div className="bc-missing">Could not load the certificates. Refresh the page to try again.</div>
      ) : (
        <div className="bc-grid">
          {site.certs.map((c) => {
            const f = files[c.key];
            const st = certStatus(c);
            return (
              <div key={c.key} className="bc-card">
                <div className="bc-top">
                  <div className="bc-seal" aria-hidden="true">{c.key === "haccp" ? "🛡️" : "🏅"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="bc-std">{c.standard}</div>
                    <div className="bc-no">Certificate {c.certNo}
                      <button type="button" className="bc-copy" onClick={() => copyNo(c.certNo)} title="Copy the certificate number">Copy</button>
                    </div>
                  </div>
                  <span className={`bc-st st-${st.tone}`}>{st.text}</span>
                </div>
                <div className="bc-meta">
                  <div><b>Valid from</b><span>{fmtDate(c.validFrom)}</span></div>
                  <div><b>Valid until</b><span>{fmtDate(c.validTo)}</span></div>
                  <div><b>Issued by</b><span>{SGS}</span></div>
                  <div><b>Issue</b><span>{c.issue}</span></div>
                </div>
                <div>
                  <div className="bc-life" title="Validity remaining"><i style={{ width: `${st.left}%`, background: LIFE_COLOR[st.tone] }} /></div>
                  <div className="bc-life-t">{st.days >= 0 ? `${st.days} day(s) of validity left` : "Validity ended"} · surveillance audits keep it valid</div>
                </div>

                {f?.url ? (
                  <div className="bc-actions">
                    <button type="button" className={`bc-btn ${preview === c.key ? "on" : ""}`} onClick={() => setPreview(preview === c.key ? "" : c.key)}>
                      {preview === c.key ? "✕ Close preview" : "🔍 Preview"}
                    </button>
                    <button type="button" className="bc-btn pri" onClick={() => window.open(f.url, "_blank", "noopener")}>👁️ Open</button>
                    <button type="button" className="bc-btn" disabled={busy === c.key} onClick={() => onDownload(c, f)}>
                      {busy === c.key ? "…" : "⬇️ Download"}
                    </button>
                  </div>
                ) : (
                  <div className="bc-missing">{manage ? "No PDF attached yet — attach this site's own certificate below." : "The certificate file has not been published yet. Please ask the QA team."}</div>
                )}

                {manage && (
                  <div className="bc-admin">
                    <small>{f?.url ? `Attached ${f.uploadedAt ? fmtDate(f.uploadedAt) : ""}${f.uploadedBy ? ` by ${f.uploadedBy}` : ""} · ${f.fileName || ""}` : `Use the file for ${key} only (${c.certNo}).`}</small>
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

      {preview && files[preview]?.url && (
        <div style={{ marginTop: 14 }}>
          <iframe className="bc-frame" src={files[preview].url} title={`${key} certificate preview`} />
        </div>
      )}
      {msg.text && <div className={`bc-msg ${msg.tone}`}>{msg.text}</div>}
    </div>
  );
}

/** The branch's own certificates — read only (View reports tab). */
export default function BranchCertificates({ branch }) {
  const css = useMemo(() => CERT_CSS, []);
  return (
    <div className="bcert" dir="ltr" lang="en">
      <style>{css}</style>
      <CertificatesPanel branch={branch} manage={false} />
    </div>
  );
}
