// src/pages/monitor/branches/production/_shared/PRDReportHeader.jsx
// Unified header for all Production input forms.
// Renders a clean banner + responsive grid of metadata cards.

import React from "react";
import { useLang } from "./i18n";

/**
 * Props:
 *  - title       (string)        — main English title (e.g. "Personal Hygiene")
 *  - subtitle    (string, opt)   — description under title
 *  - titleAr     (string, opt)   — Arabic subtitle shown on the right
 *  - accent      (string, opt)   — hex color for banner accent (default teal)
 *  - fields      (array)         — metadata fields to render
 *
 * Each field:
 *  - label       (string)
 *  - value       (any)
 *  - onChange    (fn, opt)       — if provided, renders an input
 *  - type        (string, opt)   — "date" | "text" | "time" (default "text")
 *  - placeholder (string, opt)
 *  - width       (string, opt)   — "sm" | "md" | "lg" for grid cell width
 */
/**
 * Each field can have:
 *  - labelKey (translation key)  OR  label (literal string)
 *  - value, onChange, type, placeholder, width  (as before)
 */
export default function PRDReportHeader({
  title,
  titleAr,              // Arabic title (shows in EN mode as decoration, becomes main in AR)
  subtitle,
  subtitleAr,
  accent = "#0f766e",
  fields = [],
}) {
  const { t, isAr, dir } = useLang();

  const mainTitle    = isAr && titleAr ? titleAr : title;
  const secondTitle  = isAr ? title : titleAr;
  const mainSubtitle = isAr && subtitleAr ? subtitleAr : subtitle;

  return (
    <div style={{ marginBottom: 16, direction: dir }}>
      <style>{HEADER_STYLES}</style>

      {/* Banner */}
      <div
        className="prd-rh-banner"
        style={{
          background: `linear-gradient(135deg, ${accent} 0%, ${shade(accent, -20)} 100%)`,
        }}
      >
        <div className="prd-rh-banner-content">
          <div>
            <h2 className="prd-rh-title">{mainTitle}</h2>
            {mainSubtitle && <p className="prd-rh-subtitle">{mainSubtitle}</p>}
          </div>
          {secondTitle && (
            <div
              className="prd-rh-title-ar"
              style={{ direction: isAr ? "ltr" : "rtl" }}
            >
              {secondTitle}
            </div>
          )}
        </div>
      </div>

      {/* Fields grid */}
      {fields.length > 0 && (
        <div className="prd-rh-fields">
          {fields.map((f, i) => {
            const label = f.labelKey ? t(f.labelKey) : f.label;
            return (
              <div key={i} className="prd-rh-cell">
                <div className="prd-rh-label">{label}</div>
                {typeof f.onChange === "function" ? (
                  <input
                    type={f.type || "text"}
                    value={f.value ?? ""}
                    onChange={(e) => f.onChange(e.target.value)}
                    placeholder={f.placeholder || ""}
                    className="prd-rh-input"
                  />
                ) : (
                  <div className="prd-rh-value">{f.value || "—"}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Light utility to darken a hex color */
function shade(hex, percent) {
  const c = hex.replace("#", "");
  const num = parseInt(c, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round((255 * percent) / 100)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + Math.round((255 * percent) / 100)));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + Math.round((255 * percent) / 100)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const HEADER_STYLES = `
  .prd-rh-banner {
    padding: 18px 22px;
    border-radius: 14px;
    color: #fff;
    box-shadow: 0 6px 18px rgba(15, 23, 42, .1);
    position: relative;
    overflow: hidden;
  }
  .prd-rh-banner::before {
    content: '';
    position: absolute; top: -40%; right: -10%;
    width: 240px; height: 240px;
    border-radius: 50%;
    background: rgba(255,255,255,.08);
  }
  .prd-rh-banner::after {
    content: '';
    position: absolute; bottom: -50%; left: -5%;
    width: 180px; height: 180px;
    border-radius: 50%;
    background: rgba(255,255,255,.06);
  }
  .prd-rh-banner-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    position: relative;
    z-index: 1;
  }
  .prd-rh-title {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -.015em;
    line-height: 1.2;
  }
  .prd-rh-subtitle {
    margin: 4px 0 0;
    font-size: 13px;
    font-weight: 500;
    color: rgba(255,255,255,.82);
    letter-spacing: .01em;
  }
  .prd-rh-title-ar {
    font-size: 14px;
    font-weight: 700;
    color: rgba(255, 245, 197, .95);
    direction: rtl;
    font-family: 'Tajawal', 'Cairo', sans-serif;
  }

  .prd-rh-fields {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
  }
  .prd-rh-cell {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    transition: border .15s, background .15s;
  }
  .prd-rh-cell:hover {
    border-color: #cbd5e1;
    background: #fff;
  }
  .prd-rh-label {
    font-size: 10px;
    font-weight: 800;
    color: #0f766e;
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  .prd-rh-value {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    padding: 2px 0;
    min-height: 22px;
  }
  .prd-rh-input {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 10px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    background: #fff;
    outline: none;
    font-family: inherit;
    transition: border .15s, box-shadow .15s;
  }
  .prd-rh-input:focus {
    border-color: #0f766e;
    box-shadow: 0 0 0 3px rgba(15, 118, 110, .12);
  }

  @media (max-width: 640px) {
    .prd-rh-banner { padding: 14px 16px; border-radius: 10px; }
    .prd-rh-title { font-size: 17px; }
    .prd-rh-fields { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
  }
`;
