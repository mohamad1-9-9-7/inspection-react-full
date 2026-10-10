// src/pages/haccp and iso/SiteCertificates.jsx
// ISO & HACCP ▸ Site Certificates — the ONE place certificate PDFs are
// attached, replaced or removed. Branches only see their own site's
// certificate (open / preview / download) in their View reports.
//
// Top: one row per certified site with the state of each certificate
// (attached or missing, valid / expiring / expired). Below: the chosen site's
// cards with the edit controls. Editing needs ISO & HACCP write access (or
// admin); anyone else who reaches the page sees it read-only.
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CERT_CSS, CERT_SITES, CertificatesPanel, certStatus, fmtDate, useSiteCertificates,
} from "../monitor/branches/_shared/BranchCertificates";
import { can } from "../../utils/perms";

const SITE_KEYS = Object.keys(CERT_SITES);

const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const PAGE_CSS = `
#root .scp.scp { min-height:100vh; background:#f4f8fd; padding:20px clamp(12px,3vw,36px) 48px; color:#0f172a; }
#root .scp.scp .sc-top { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
#root .scp.scp .sc-title { font-size:${fs(26)}; font-weight:900; margin:0; }
#root .scp.scp .sc-sub { font-size:${fs(14)}; color:#475569; font-weight:600; margin-top:6px; max-width:760px; line-height:1.55; }
#root .scp.scp .sc-back { border:1.5px solid #cbd5e1; background:#fff; border-radius:10px; min-height:40px; padding:0 14px; font-size:${fs(13.5)}; font-weight:800; cursor:pointer; font-family:inherit; color:#334155; }
#root .scp.scp .sc-card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:14px 16px; margin-bottom:16px; overflow-x:auto; }
#root .scp.scp .sc-card-t { font-size:${fs(13)}; font-weight:900; color:#334155; text-transform:uppercase; letter-spacing:.06em; margin-bottom:10px; }
#root .scp.scp table.sc-tab { width:100%; border-collapse:collapse; min-width:640px; }
#root .scp.scp .sc-tab th { text-align:left; font-size:${fs(12)}; font-weight:900; color:#64748b; text-transform:uppercase; letter-spacing:.05em; padding:8px 10px; border-bottom:1px solid #e2e8f0; }
#root .scp.scp .sc-tab td { padding:10px; border-bottom:1px solid #f1f5f9; font-size:${fs(14)}; vertical-align:middle; }
#root .scp.scp .sc-tab tr.on td { background:#f0f9ff; }
#root .scp.scp .sc-tab tr { cursor:pointer; }
#root .scp.scp .sc-tab tr:hover td { background:#f8fafc; }
#root .scp.scp .sc-site { font-weight:900; }
#root .scp.scp .sc-addr { font-size:${fs(12.5)}; color:#64748b; font-weight:600; }
#root .scp.scp .sc-cell { display:flex; flex-direction:column; gap:3px; }
#root .scp.scp .sc-pill { display:inline-block; width:fit-content; font-size:${fs(12)}; font-weight:900; border-radius:999px; padding:2px 9px; }
#root .scp.scp .p-ok { background:#dcfce7; color:#15803d; }
#root .scp.scp .p-miss { background:#fee2e2; color:#b91c1c; }
#root .scp.scp .p-warn { background:#fef3c7; color:#a16207; }
#root .scp.scp .p-bad { background:#fee2e2; color:#b91c1c; }
#root .scp.scp .p-info { background:#e0f2fe; color:#0369a1; }
#root .scp.scp .sc-note { font-size:${fs(12.5)}; color:#64748b; font-weight:700; margin-top:10px; line-height:1.5; }
#root .scp.scp .sc-chips { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
#root .scp.scp .sc-chip { border:1.5px solid #cbd5e1; background:#fff; border-radius:999px; min-height:38px; padding:0 14px; font-size:${fs(13.5)}; font-weight:800; cursor:pointer; font-family:inherit; color:#334155; }
#root .scp.scp .sc-chip.on { background:#0f766e; border-color:#0f766e; color:#fff; }
#root .scp.scp .sc-ro { background:#fffbeb; border:1px solid #fde68a; color:#92400e; border-radius:12px; padding:10px 14px; font-weight:800; font-size:${fs(13.5)}; margin-bottom:12px; }
`;

function SiteRow({ siteKey, active, onPick }) {
  const site = CERT_SITES[siteKey];
  const { files, loading } = useSiteCertificates(siteKey);
  return (
    <tr className={active ? "on" : ""} onClick={() => onPick(siteKey)}>
      <td>
        <div className="sc-site">{site.label}</div>
        <div className="sc-addr">{site.site}</div>
      </td>
      {site.certs.map((c) => {
        const st = certStatus(c);
        const attached = !!files[c.key]?.url;
        return (
          <td key={c.key}>
            <div className="sc-cell">
              <span style={{ fontWeight: 800 }}>{c.certNo}</span>
              {loading ? <span className="sc-pill p-info">…</span> : (
                <span className={`sc-pill ${attached ? "p-ok" : "p-miss"}`}>{attached ? "PDF attached" : "PDF missing"}</span>
              )}
              <span className={`sc-pill p-${st.tone === "good" ? "ok" : st.tone}`}>{st.text} · to {fmtDate(c.validTo)}</span>
            </div>
          </td>
        );
      })}
    </tr>
  );
}

export default function SiteCertificates() {
  const navigate = useNavigate();
  const [siteKey, setSiteKey] = useState(SITE_KEYS[0]);
  const canManage = can("iso", "write"); // admins pass too

  return (
    <div className="scp" dir="ltr" lang="en">
      <style>{PAGE_CSS + CERT_CSS}</style>

      <div className="sc-top">
        <div>
          <h1 className="sc-title">📜 Site Certificates</h1>
          <div className="sc-sub">
            ISO 22000:2018 and HACCP certificates issued by SGS for each certified site. Attach each site's own PDF here —
            every branch then sees only its own certificate (open, preview, download) under its View reports.
          </div>
        </div>
        <button type="button" className="sc-back" onClick={() => navigate("/haccp-iso")}>← ISO &amp; HACCP</button>
      </div>

      <div className="sc-card">
        <div className="sc-card-t">Overview — tap a site to manage it</div>
        <table className="sc-tab">
          <thead>
            <tr><th>Site</th><th>ISO 22000:2018</th><th>HACCP</th></tr>
          </thead>
          <tbody>
            {SITE_KEYS.map((k) => <SiteRow key={k} siteKey={k} active={k === siteKey} onPick={setSiteKey} />)}
          </tbody>
        </table>
        <div className="sc-note">
          Main certificates: ISO 22000 AE22/00000195 and HACCP AE22/00000196 (main site = QCS). Sites .01 / .02 / .03 depend on the main
          certificate staying valid. A renewal: update the numbers and dates in BranchCertificates (CERT_SITES), then replace the PDFs here.
        </div>
      </div>

      <div className="sc-chips" role="tablist" aria-label="Site">
        {SITE_KEYS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={k === siteKey}
            className={`sc-chip ${k === siteKey ? "on" : ""}`} onClick={() => setSiteKey(k)}>{CERT_SITES[k].label}</button>
        ))}
      </div>

      {!canManage && <div className="sc-ro">Read-only: attaching or replacing certificates needs ISO &amp; HACCP edit access.</div>}

      <div className="sc-card bcert">
        <CertificatesPanel key={siteKey} branch={siteKey} manage={canManage} compactHead />
      </div>
    </div>
  );
}
