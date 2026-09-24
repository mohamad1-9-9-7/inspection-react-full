// src/pages/complaints/ComplaintsHub.jsx
// -----------------------------------------------------------------------------
// Two-card landing screen used for BOTH "Browse Complaints" and
// "Create Complaint" from the Returns menu. The `action` prop tells the page
// where each card should navigate.
//
//   action = "browse" → /returns/complaints/list/branch|supplier
//   action = "new"    → /returns/complaints/new/branch|supplier
// -----------------------------------------------------------------------------

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { COMPLAINTS_CSS } from "./complaintsCSS";
import { TARGETS, apiListComplaints } from "./complaintsCore";

export default function ComplaintsHub({ action = "browse" }) {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ branch: 0, supplier: 0, all: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await apiListComplaints();
        if (!alive) return;
        setCounts({
          all: rows.length,
          branch: rows.filter((r) => r.target === "branch").length,
          supplier: rows.filter((r) => r.target === "supplier").length,
        });
      } catch {
        /* silent — the hub is still usable without counts */
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const isBrowse = action === "browse";
  const heroTitle  = isBrowse ? "📚 Browse Quality Complaints" : "📨 New Quality Complaint";
  const heroSub    = isBrowse
    ? "Pick a type to open its log — complaints against branches or against suppliers."
    : "Pick the complaint type: is it against a sales branch, or against a supplier? The matching entry page opens.";
  const cardAction = isBrowse ? "list" : "new";
  const cta        = isBrowse ? "Open the log" : "Start the complaint";

  const go = (target) => navigate(`/returns/complaints/${cardAction}/${target}`);

  return (
    <div className="qc qc">
      <style>{COMPLAINTS_CSS}</style>
      <div className="qc-shell">
        <header className="qc-hero">
          <div className="qc-hero-top">
            <div>
              <h1 className="qc-hero-title">{heroTitle}</h1>
              <p className="qc-hero-sub">{heroSub}</p>
            </div>
            <div className="qc-hero-actions">
              <button className="qc-btn ghost" onClick={() => navigate("/returns/menu")}>⬅ Back to menu</button>
              {isBrowse && (
                <button className="qc-btn primary" onClick={() => navigate("/returns/complaints/new")}>
                  ➕ New complaint
                </button>
              )}
              {!isBrowse && (
                <button className="qc-btn ghost" onClick={() => navigate("/returns/complaints/browse")}>
                  📚 Browse complaints
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="qc-pick">
          {TARGETS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="qc-pick-card"
              onClick={() => go(t.id)}
              style={{ borderColor: t.tone }}
            >
              <div className="qc-pick-ic" style={{ color: t.tone }}>{t.icon}</div>
              <div className="qc-pick-t" style={{ color: t.tone }}>{t.en}</div>
              <div className="qc-pick-sub">
                {t.id === "branch"
                  ? "A QA complaint against a sales branch (e.g. damaged product returned from the branch, or a breach of the returns standards)."
                  : "A QA complaint against a supplier (e.g. expired product, a quality defect, or poor supply commitment)."}
              </div>
              <div className="qc-pick-count">
                {loading ? "…" : `${t.id === "branch" ? counts.branch : counts.supplier} recorded`}
              </div>
              <div style={{
                marginTop: 6, padding: "10px 18px", borderRadius: 12,
                background: t.tone, color: "#fff", fontWeight: 900,
                fontSize: 14, boxShadow: "0 8px 18px rgba(15,23,42,.18)",
              }}>
                {cta}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
