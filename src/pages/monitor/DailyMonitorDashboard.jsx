// src/pages/DailyMonitorDashboard.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const branches = [
  { id: "QCS",        label: "QCS",               type: "qcs"     },
  { id: "PRODUCTION", label: "PRODUCTION",         type: "prod"    },
  { id: "POS 6",      label: "POS 6",              type: "pos"     },
  { id: "POS 7",      label: "POS 7",              type: "pos"     },
  { id: "POS 10",     label: "POS 10",             type: "pos"     },
  { id: "POS 11",     label: "POS 11",             type: "pos"     },
  { id: "POS 14",     label: "POS 14",             type: "pos"     },
  { id: "POS 15",     label: "POS 15",             type: "pos"     },
  { id: "POS 16",     label: "POS 16",             type: "pos"     },
  { id: "POS 17",     label: "POS 17",             type: "pos"     },
  { id: "POS 18",     label: "POS 18",             type: "pos"     },
  { id: "POS 19",     label: "Al Warqa Kitchen",   type: "kitchen" },
  { id: "POS 21",     label: "POS 21",             type: "pos"     },
  { id: "POS 24",     label: "POS 24",             type: "pos"     },
  { id: "POS 25",     label: "POS 25",             type: "pos"     },
  { id: "POS 26",     label: "POS 26",             type: "pos"     },
  { id: "POS 31",     label: "POS 31",             type: "pos"     },
  { id: "POS 34",     label: "POS 34",             type: "pos"     },
  { id: "POS 35",     label: "POS 35",             type: "pos"     },
  { id: "POS 36",     label: "POS 36",             type: "pos"     },
  { id: "POS 37",     label: "POS 37",             type: "pos"     },
  { id: "POS 38",     label: "POS 38",             type: "pos"     },
  { id: "POS 41",     label: "POS 41",             type: "pos"     },
  { id: "POS 42",     label: "POS 42",             type: "pos"     },
  { id: "POS 43",     label: "POS 43",             type: "pos"     },
  { id: "POS 44",     label: "POS 44",             type: "pos"     },
  { id: "POS 45",     label: "POS 45",             type: "pos"     },
  { id: "FTR 1",      label: "FTR 1",              type: "ftr"     },
  { id: "FTR 2",      label: "FTR 2",              type: "ftr"     },
];

const toSlug = (id) => id.trim().toLowerCase().replace(/\s+/g, "");

const META = {
  qcs:     { color: "#34d399", dark: "#064e3b", badge: "Quality Control", icon: "🛡️" },
  prod:    { color: "#a78bfa", dark: "#2e1065", badge: "Production",       icon: "🏭" },
  pos:     { color: "#60a5fa", dark: "#1e3a5f", badge: "Point of Sale",    icon: "🏪" },
  kitchen: { color: "#fb923c", dark: "#431407", badge: "Kitchen Branch",   icon: "👨‍🍳" },
  ftr:     { color: "#fbbf24", dark: "#451a03", badge: "FTR Branch",       icon: "🚚" },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  background: #05080f;
  color: #cbd5e1;
  -webkit-font-smoothing: antialiased;
}

/* blobs */
.d-blob {
  position: fixed; border-radius: 50%;
  pointer-events: none; z-index: 0; filter: blur(90px);
}
.d-blob-1 {
  width: 640px; height: 640px; top: -220px; left: -160px;
  background: radial-gradient(circle, rgba(52,211,153,.12) 0%, transparent 70%);
  animation: bf 20s ease-in-out infinite alternate;
}
.d-blob-2 {
  width: 720px; height: 720px; bottom: -220px; right: -220px;
  background: radial-gradient(circle, rgba(96,165,250,.09) 0%, transparent 70%);
  animation: bf 26s ease-in-out infinite alternate-reverse;
}
@keyframes bf { to { transform: translate(50px, 40px); } }

/* root */
.d-root {
  position: relative; z-index: 1;
  max-width: 100%; margin: 0;
  padding: 24px 20px 60px;
}

/* header */
.d-header {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  background: #0b1525;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 18px;
  padding: 22px 28px;
  margin-bottom: 14px;
  box-shadow: 0 1px 0 rgba(255,255,255,.04) inset, 0 20px 50px rgba(0,0,0,.45);
}
.d-pulse-row { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
.d-pulse-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #34d399; box-shadow: 0 0 10px #34d399;
  animation: pdot 2.2s ease-in-out infinite;
}
@keyframes pdot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.65)} }
.d-pulse-label {
  font-size: 10px; font-weight: 700; letter-spacing: .2em;
  text-transform: uppercase; color: #34d399;
}
.d-h-title {
  font-size: 23px; font-weight: 900; color: #f1f5f9;
  letter-spacing: -.4px; line-height: 1;
}
.d-h-date { font-size: 11.5px; color: #2d3f55; font-weight: 500; margin-top: 6px; }

.d-brand { text-align: right; flex-shrink: 0; }
.d-brand-name {
  font-size: 17px; font-weight: 900; color: #ef4444; letter-spacing: .05em;
}
.d-brand-sub {
  font-size: 9px; font-weight: 700; color: #1e3a5f;
  letter-spacing: .07em; text-transform: uppercase;
  line-height: 1.5; margin-top: 4px; max-width: 210px;
}

/* stats */
.d-stats {
  display: grid; grid-template-columns: repeat(4,1fr); gap: 10px;
  margin-bottom: 18px;
}
.d-stat {
  background: #0b1525;
  border: 1px solid rgba(255,255,255,.055);
  border-radius: 13px; padding: 13px 15px;
  display: flex; align-items: center; gap: 10px;
}
.d-stat-icon { font-size: 19px; flex-shrink: 0; line-height: 1; }
.d-stat-val { font-size: 21px; font-weight: 900; color: #f1f5f9; line-height: 1; }
.d-stat-lbl {
  font-size: 9.5px; font-weight: 700; color: #253245;
  text-transform: uppercase; letter-spacing: .1em; margin-top: 2px;
}

/* section label */
.d-section {
  font-size: 10px; font-weight: 700; color: #1a2840;
  text-transform: uppercase; letter-spacing: .18em;
  display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
}
.d-section::after {
  content: ''; flex: 1; height: 1px; background: rgba(255,255,255,.04);
}

/* grid */
.d-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(196px,1fr));
  gap: 9px;
}

/* card — fixed height */
.d-card {
  position: relative; overflow: hidden;
  height: 70px;
  background: #0b1525;
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 13px;
  display: flex; align-items: center; gap: 11px;
  padding: 0 13px;
  cursor: pointer; outline: none;
  transition: transform .13s ease, border-color .18s, box-shadow .18s;
}
/* bottom accent */
.d-card::after {
  content: '';
  position: absolute; bottom: 0; left: 10px; right: 10px;
  height: 1.5px; border-radius: 99px;
  background: var(--cc, transparent); opacity: 0;
  transition: opacity .18s;
}
.d-card:hover::after, .d-card:focus-visible::after { opacity: .55; }
.d-card:hover, .d-card:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(255,255,255,.13);
  box-shadow: 0 8px 24px rgba(0,0,0,.4), 0 0 0 1px var(--cc);
}
.d-card.kitchen {
  background: linear-gradient(110deg, #110600 0%, #0b1525 75%);
  border-color: rgba(251,146,60,.16);
}
.d-card.kitchen:hover {
  border-color: rgba(251,146,60,.35);
  box-shadow: 0 8px 28px rgba(251,146,60,.1), 0 0 0 1px rgba(251,146,60,.25);
}

/* icon */
.d-icon {
  width: 40px; height: 40px; flex-shrink: 0;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; line-height: 1;
  background: var(--cd, #0d1a2e);
  border: 1px solid rgba(255,255,255,.06);
}

/* body */
.d-card-body { flex: 1; min-width: 0; }
.d-card-name {
  font-size: 13px; font-weight: 800; color: #dde5f0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  line-height: 1;
}
.d-card.kitchen .d-card-name { color: #fb923c; font-size: 12.5px; }
.d-card-tag {
  font-size: 9px; font-weight: 700;
  letter-spacing: .09em; text-transform: uppercase;
  color: var(--cc, #2d3f55); margin-top: 5px; opacity: .7;
  display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* arrow */
.d-arrow {
  color: #151f30; flex-shrink: 0;
  transition: color .14s, transform .14s;
}
.d-card:hover .d-arrow, .d-card:focus-visible .d-arrow {
  color: var(--cc, #60a5fa); transform: translateX(2px);
}

/* modal */
.d-backdrop {
  position: fixed; inset: 0;
  background: rgba(2,6,18,.75);
  backdrop-filter: blur(8px);
  display: grid; place-items: center; z-index: 50;
  animation: bfade .14s ease;
}
@keyframes bfade { from { opacity: 0; } }

.d-modal {
  width: calc(100% - 32px); max-width: 330px;
  background: #0b1525;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 18px; padding: 22px;
  box-shadow: 0 40px 80px rgba(0,0,0,.65);
  animation: mup .17s ease;
}
@keyframes mup { from { transform: translateY(14px); opacity: 0; } }

.d-modal-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 19px; margin-bottom: 12px;
  background: var(--cd, #111);
  border: 1px solid rgba(255,255,255,.07);
}
.d-modal-title { font-size: 16px; font-weight: 900; color: #f1f5f9; margin-bottom: 3px; }
.d-modal-sub   { font-size: 12px; color: #2d3f55; margin-bottom: 14px; }
.d-modal-sub b { color: var(--cc, #60a5fa); font-weight: 700; }

.d-modal-input {
  width: 100%; padding: 11px 13px;
  background: #06090f;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 9px;
  color: #f1f5f9; font-size: 14px; font-weight: 700;
  font-family: 'Plus Jakarta Sans', sans-serif;
  outline: none; transition: border-color .15s, box-shadow .15s;
}
.d-modal-input:focus {
  border-color: var(--cc, #60a5fa);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--cc, #60a5fa) 14%, transparent);
}
.d-modal-err {
  font-size: 11px; font-weight: 700; color: #f87171;
  margin-top: 7px; display: flex; align-items: center; gap: 5px;
}
.d-modal-actions {
  display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px;
}
.d-btn {
  padding: 9px 15px; border-radius: 9px; border: none;
  font-size: 13px; font-weight: 800;
  font-family: 'Plus Jakarta Sans', sans-serif;
  cursor: pointer; transition: opacity .15s, transform .1s;
}
.d-btn:active { transform: scale(.96); }
.d-btn-ghost {
  background: rgba(255,255,255,.05); color: #475569;
  border: 1px solid rgba(255,255,255,.07);
}
.d-btn-primary { background: var(--cc, #60a5fa); color: #05080f; font-weight: 900; }
.d-btn-primary:hover { opacity: .88; }

@media (max-width: 640px) {
  .d-root { padding: 16px 14px 48px; }
  .d-stats { grid-template-columns: repeat(2,1fr); }
  .d-header { flex-direction: column; align-items: flex-start; gap: 12px; padding: 16px 18px; }
  .d-brand { text-align: left; }
  .d-h-title { font-size: 20px; }
  .d-grid { grid-template-columns: repeat(auto-fill, minmax(155px,1fr)); }
}

@media (max-width: 480px) {
  .d-root { padding: 12px 10px 40px; }
  .d-header { padding: 14px 14px; gap: 10px; border-radius: 14px; }
  .d-h-title { font-size: 18px; }
  .d-h-date { font-size: 10.5px; }
  .d-brand-name { font-size: 14px; }
  .d-brand-sub { font-size: 8px; max-width: 160px; }
  .d-stat { padding: 10px 12px; border-radius: 10px; }
  .d-stat-val { font-size: 18px; }
  .d-stat-lbl { font-size: 8.5px; }
  .d-section { font-size: 9px; letter-spacing: .12em; }
  .d-grid { grid-template-columns: repeat(auto-fill, minmax(145px,1fr)); gap: 7px; }
  .d-card { height: 64px; padding: 0 11px; border-radius: 11px; }
  .d-card-name { font-size: 12px; }
  .d-icon { width: 36px; height: 36px; font-size: 16px; border-radius: 8px; }
  .d-modal { padding: 18px; border-radius: 14px; }
}

@media (max-width: 360px) {
  .d-grid { grid-template-columns: repeat(2,1fr); }
  .d-stats { grid-template-columns: repeat(2,1fr); gap: 7px; }
}

/* Modern monitor refresh */
.d-blob { display: none; }

body:has(.d-root) {
  background: linear-gradient(180deg, #f8fafc 0%, #eef7f4 44%, #f8fafc 100%);
  color: #0f172a;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.d-root {
  width: min(1760px, 100%);
  min-height: 100vh;
  margin: 0 auto;
  padding: 24px clamp(18px, 3vw, 48px) 48px;
  color: #0f172a;
}

.d-header {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  min-height: 220px;
  padding: 30px clamp(22px, 4vw, 56px);
  margin-bottom: 18px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,118,110,0.94) 52%, rgba(8,145,178,0.92));
  color: #fff;
  border: 1px solid rgba(255,255,255,0.20);
  box-shadow: 0 24px 64px rgba(15,23,42,0.22);
}

.d-header::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(820px 260px at 12% 0%, rgba(45,212,191,0.28), transparent 62%),
    radial-gradient(760px 300px at 90% 20%, rgba(125,211,252,0.22), transparent 60%);
  pointer-events: none;
}

.d-header > * {
  position: relative;
}

.d-pulse-row {
  gap: 10px;
  margin-bottom: 16px;
}

.d-pulse-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 18px rgba(34,197,94,0.78);
}

.d-pulse-label {
  color: rgba(255,255,255,0.78);
  font-weight: 950;
  letter-spacing: .08em;
}

.d-h-title {
  color: #fff;
  font-weight: 1000;
  line-height: 1.05;
  letter-spacing: 0;
}

.d-h-date {
  margin-top: 14px;
  color: rgba(255,255,255,0.76);
  font-weight: 800;
  line-height: 1.4;
}

.d-brand {
  min-width: 360px;
  padding: 18px;
  border-radius: 8px;
  text-align: left;
  background: rgba(255,255,255,0.13);
  border: 1px solid rgba(255,255,255,0.22);
  backdrop-filter: blur(12px);
}

.d-brand-name {
  color: #fff;
  font-weight: 1000;
  letter-spacing: .08em;
}

.d-brand-sub {
  max-width: none;
  margin-top: 10px;
  color: rgba(255,255,255,0.76);
  font-weight: 850;
  letter-spacing: .04em;
}

.d-stats {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 18px;
}

.d-stat {
  position: relative;
  overflow: hidden;
  min-height: 150px;
  align-items: flex-start;
  padding: 24px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid rgba(15,23,42,0.12);
  box-shadow: 0 12px 30px rgba(15,23,42,0.08);
}

.d-stat::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 6px;
  background: linear-gradient(180deg, #0f766e, #0891b2);
}

.d-stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #ecfeff;
  color: #0f766e;
}

.d-stat-val {
  color: #0f172a;
  font-weight: 1000;
  line-height: 1;
}

.d-stat-lbl {
  margin-top: 10px;
  color: #64748b;
  font-weight: 950;
  letter-spacing: .08em;
}

.d-section {
  margin: 22px 0 16px;
  color: #334155;
  font-weight: 950;
  letter-spacing: .08em;
}

.d-section::before {
  content: "";
  width: 6px;
  height: 34px;
  border-radius: 999px;
  background: linear-gradient(180deg, #0f766e, #0891b2);
}

.d-section::after {
  background: rgba(15,23,42,0.12);
}

.d-grid {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.d-card,
.d-card.kitchen {
  min-height: 132px;
  height: auto;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) 32px;
  gap: 16px;
  padding: 20px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid rgba(15,23,42,0.12);
  box-shadow: 0 12px 30px rgba(15,23,42,0.08);
}

.d-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 6px;
  background: linear-gradient(180deg, var(--cc, #0f766e), #0891b2);
}

.d-card::after {
  display: none;
}

.d-card:hover,
.d-card:focus-visible,
.d-card.kitchen:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--cc, #0f766e) 48%, transparent);
  box-shadow: 0 20px 42px rgba(15,23,42,0.13);
}

.d-icon {
  width: 58px;
  height: 58px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--cc, #0f766e) 15%, white);
  border: 1px solid color-mix(in srgb, var(--cc, #0f766e) 24%, transparent);
}

.d-card-name,
.d-card.kitchen .d-card-name {
  color: #0f172a;
  font-weight: 1000;
  line-height: 1.15;
  letter-spacing: 0;
}

.d-card-tag {
  margin-top: 9px;
  color: #64748b;
  font-weight: 850;
  letter-spacing: 0;
  text-transform: none;
  opacity: 1;
  line-height: 1.25;
}

.d-arrow {
  color: #94a3b8;
  justify-self: end;
}

.d-card:hover .d-arrow,
.d-card:focus-visible .d-arrow {
  color: var(--cc, #0f766e);
  transform: translateX(3px);
}

.d-empty {
  grid-column: 1 / -1;
  min-height: 180px;
  display: grid;
  place-items: center;
  padding: 28px;
  text-align: center;
  color: #64748b;
  font-weight: 850;
  border-radius: 8px;
  background: #fff;
  border: 1px dashed rgba(15,23,42,0.22);
}

.d-modal {
  border-radius: 8px;
  background: #fff;
  border: 1px solid rgba(15,23,42,0.12);
  box-shadow: 0 24px 64px rgba(15,23,42,0.24);
}

.d-modal-title {
  color: #0f172a;
}

.d-modal-sub {
  color: #64748b;
}

.d-modal-input {
  min-height: 54px;
  border-radius: 8px;
  color: #0f172a;
  background: #f8fafc;
  border: 1px solid rgba(15,23,42,0.16);
}

.d-btn {
  min-height: 48px;
  border-radius: 8px;
}

.d-btn-ghost {
  background: #f8fafc;
  color: #334155;
  border: 1px solid rgba(15,23,42,0.14);
}

.d-btn-primary {
  background: #0f766e;
  color: #fff;
}

@media (max-width: 920px) {
  .d-header {
    grid-template-columns: 1fr;
  }

  .d-brand {
    min-width: 0;
    width: 100%;
  }

  .d-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .d-root {
    padding: 18px 14px 32px;
  }

  .d-header {
    min-height: 0;
    padding: 24px 18px;
  }

  .d-stats,
  .d-grid {
    grid-template-columns: 1fr;
  }

  .d-card,
  .d-card.kitchen {
    grid-template-columns: 54px minmax(0, 1fr) 28px;
    min-height: 118px;
    padding: 18px;
  }
}
`;

export default function DailyMonitorDashboard() {
  const navigate = useNavigate();
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const fmt = () =>
      setDateStr(
        new Date().toLocaleString("en-AE", {
          timeZone: "Asia/Dubai", weekday: "long",
          month: "long", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      );
    fmt();
    const t = setInterval(fmt, 30_000);
    return () => clearInterval(t);
  }, []);

  /* ── Named-account branch access control (per-icon: Daily Monitor) ── */
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
  })();
  const isNamedAccount = currentUser.type === "named";

  /* allowedBranches may be:
     - { daily: [...], admin: [...] }   ← new per-icon format
     - [...]                            ← legacy flat array (applies to both)
     - undefined                        ← no restriction */
  const ab = currentUser.allowedBranches;
  const dailyAllowed = Array.isArray(ab)
    ? ab                                    // legacy
    : (ab && Array.isArray(ab.daily) ? ab.daily : []);

  /* Filter branch cards for restricted accounts */
  const visibleBranches = (isNamedAccount && dailyAllowed.length > 0)
    ? branches.filter(b => dailyAllowed.includes(b.id))
    : branches;

  /* Dynamic stats based on visible branches */
  const stats = [
    { icon: "🏢", val: visibleBranches.length,                                  label: "Total Branches" },
    { icon: "🏪", val: visibleBranches.filter(b => b.type === "pos").length,    label: "POS Branches" },
    { icon: "🚚", val: visibleBranches.filter(b => b.type === "ftr").length,    label: "FTR Branches" },
    { icon: "👨‍🍳", val: visibleBranches.filter(b => b.type === "kitchen").length, label: "Kitchen" },
  ];

  const goBranch = (id) => {
    if (id === "FTR 2") navigate("/monitor/ftr2");
    else if (id === "FTR 1") navigate("/monitor/ftr1");
    else navigate(`/monitor/${toSlug(id)}`);
  };

  /* Authentication happens at login — open branch directly */
  const open = (branch) => goBranch(branch.id);

  return (
    <>
      <style>{CSS}</style>
      <div className="d-blob d-blob-1" />
      <div className="d-blob d-blob-2" />

      <div className="d-root">

        {/* Header */}
        <header className="d-header">
          <div>
            <div className="d-pulse-row">
              <div className="d-pulse-dot" />
              <span className="d-pulse-label">Live Monitoring System</span>
            </div>
            <div className="d-h-title">Daily Reports Hub</div>
            <div className="d-h-date">{dateStr}</div>
          </div>
          <div className="d-brand">
            <div className="d-brand-name">AL MAWASHI</div>
            <div className="d-brand-sub">Trans Emirates Livestock Trading L.L.C.</div>
          </div>
        </header>

        {/* Stats */}
        <div className="d-stats">
          {stats.map(s => (
            <div className="d-stat" key={s.label}>
              <div className="d-stat-icon">{s.icon}</div>
              <div>
                <div className="d-stat-val">{s.val}</div>
                <div className="d-stat-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Section label */}
        <div className="d-section">
          {isNamedAccount && dailyAllowed.length > 0
            ? `Your assigned branches (${visibleBranches.length})`
            : "Select a branch to view reports"}
        </div>

        {/* Cards */}
        <div className="d-grid">
          {visibleBranches.map(branch => {
            const meta = META[branch.type];
            const showId = branch.label !== branch.id && branch.type !== "qcs" && branch.type !== "prod";
            return (
              <div
                key={branch.id}
                className={`d-card ${branch.type}`}
                role="button" tabIndex={0}
                aria-label={`Open ${branch.label}`}
                style={{ "--cc": meta.color, "--cd": meta.dark }}
                onClick={() => open(branch)}
                onKeyDown={e => (e.key === "Enter" || e.key === " ") && open(branch)}
              >
                <div className="d-icon">{meta.icon}</div>
                <div className="d-card-body">
                  <div className="d-card-name">{branch.label}</div>
                  <span className="d-card-tag">
                    {showId ? `${branch.id} · ` : ""}{meta.badge}
                  </span>
                </div>
                <svg className="d-arrow" width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            );
          })}

          {/* Empty state when all branches are restricted away */}
          {visibleBranches.length === 0 && (
            <div style={{
              gridColumn: "1/-1", textAlign: "center",
              color: "#2d3f55", padding: "48px 0",
              fontWeight: 700, fontSize: 15,
            }}>
              🔒 No branches assigned to your account — contact your administrator
            </div>
          )}
        </div>

      </div>
    </>
  );
}
