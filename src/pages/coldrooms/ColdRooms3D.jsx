// src/pages/coldrooms/ColdRooms3D.jsx
//
// 🧊 Cold Rooms 3D — eight rooms, four facing four across a corridor, in a
// real 3D scene (three.js, ColdRoomsScene.jsx).
//
//   • each room: name · kind (chiller / dry store / freezer / general store)
//     · the allowed band — all set here by the user (coldRoomsConfig.js)
//   • linked to a unit of a temperature log → today's latest reading
//   • linked to the calibration log → the calibration in force for that unit
//
// Two views (the choice is remembered on the device; a phone starts simple):
//   🧊 3D      orbit with the mouse, click a room to fly to it, its door
//              opens and its card opens as a drawer
//   ▦ simple  the store as a plan of cards (5-8 · corridor · 1-4); a card
//              opens the room as a sheet (from the bottom on a phone)
// Every card shows the temperature, the products inside and the nearest
// expiry. Data refreshes every 5 minutes while the tab is visible.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLangState, hideSectionLangToggle } from "../../utils/appLang";
import { canEdit, getCurrentUser } from "../../utils/perms";
import { localDate, timeLabel } from "../monitor/branches/qcs/coolerQuick";
import {
  CALIB_LOGS,
  branchLabel,
  calibrationForUnit,
  expiryStatus,
  fmtDay,
  loadLogUnits,
} from "../haccp and iso/Calibration/calibrationLink";
import CalibrationExpiryBadge, { useCalibrations } from "../haccp and iso/Calibration/CalibrationExpiryBadge";
import {
  ROOM_KINDS,
  fetchRooms,
  kindOf,
  loadCache,
  loadLive,
  normalizeRoom,
  saveRooms,
  seedFromQcs,
  verdict,
} from "./coldRoomsConfig";
import ColdRoomsScene from "./ColdRoomsScene";
import StockPanel from "./StockPanel";
import { fetchStock, totalQty } from "./coldRoomsStock";

/* ══════════════════════════════════════ Text */
const TX = {
  en: {
    title: "Cold Rooms 3D", sub: "Eight rooms · live temperature from the log · calibration status",
    back: "Dashboard", refresh: "Refresh", updated: "Updated", corridor: "CORRIDOR",
    ok: "In range", warn: "Near limit", out: "Out of range", none: "No reading today",
    calibExpired: "Calibration expired", allowed: "Allowed", latest: "Latest reading",
    today: "Today's readings", noLink: "Not linked to a temperature log", link: "Temperature log",
    unit: "Unit", calib: "Calibration", equipment: "Equipment", lastCal: "Last calibration",
    nextDue: "Next due", result: "Result", notRecorded: "No calibration record for this unit",
    openSheet: "Open temperature sheet", openCalib: "Open calibration log", edit: "Edit room",
    name: "Room name", kind: "Kind", min: "Min °C", max: "Max °C", none_: "— none —",
    save: "Save", cancel: "Cancel", saving: "Saving…", saved: "Saved", loadErr: "Could not read the log",
    pick: "Click a room to see its details", reset: "Reset view", top: "Top view", tilt: "Tilt",
    by: "by", daysAgo: (n) => `${n} day(s) ago`, daysLeft: (n) => `in ${n} day(s)`, recheck: "recheck", loadingUnits: "Loading units…", firstRun: "Rooms seeded from the QCS cooler setup — save to keep them.",
    drag: "Drag to rotate · wheel to zoom · right-drag to pan", noWebgl: "This device cannot show 3D (WebGL is off).", unlinked: "Not linked", tabInfo: "Details", tabStock: "Products",
    view3d: "🧊 3D", viewSimple: "▦ Simple", products: "Products", qtyTotal: "Total quantity", nearestExp: "Nearest expiry", noProducts: "No products", seeProducts: "See the products", expired: "expired", expToday: "today", expIn: (n) => `in ${n} d`, tapRoom: "Tap a room to see its details", close: "Close",
  },
  ar: {
    title: "غرف التبريد 3D", sub: "ثماني غرف · الحرارة الحالية من السجل · حالة المعايرة",
    back: "الرئيسية", refresh: "تحديث", updated: "آخر تحديث", corridor: "الممر",
    ok: "ضمن الحد", warn: "قريب من الحد", out: "خارج الحد", none: "لا توجد قراءة اليوم",
    calibExpired: "معايرة منتهية", allowed: "المسموح", latest: "آخر قراءة",
    today: "قراءات اليوم", noLink: "غير مربوطة بسجل الحرارة", link: "سجل الحرارة",
    unit: "الوحدة", calib: "المعايرة", equipment: "الجهاز", lastCal: "آخر معايرة",
    nextDue: "المعايرة القادمة", result: "النتيجة", notRecorded: "لا يوجد سجل معايرة لهذه الوحدة",
    openSheet: "فتح سجل الحرارة", openCalib: "فتح سجل المعايرة", edit: "تعديل الغرفة",
    name: "اسم الغرفة", kind: "النوع", min: "الحد الأدنى °C", max: "الحد الأعلى °C", none_: "— بدون —",
    save: "حفظ", cancel: "إلغاء", saving: "جارٍ الحفظ…", saved: "تم الحفظ", loadErr: "تعذّر قراءة السجل",
    pick: "اضغط على غرفة لعرض تفاصيلها", reset: "إعادة العرض", top: "منظر علوي", tilt: "الميل",
    by: "بواسطة", daysAgo: (n) => `منذ ${n} يوم`, daysLeft: (n) => `بعد ${n} يوم`, recheck: "إعادة فحص", loadingUnits: "تحميل الوحدات…", firstRun: "تمت تعبئة الغرف من إعداد مبردات QCS — اضغط حفظ لتثبيتها.",
    drag: "اسحب للتدوير · العجلة للتقريب · زر يمين للتحريك", noWebgl: "هذا الجهاز لا يدعم العرض ثلاثي الأبعاد (WebGL متوقف).", unlinked: "غير مربوطة", tabInfo: "التفاصيل", tabStock: "المنتجات",
    view3d: "🧊 ثلاثي الأبعاد", viewSimple: "▦ عرض بسيط", products: "المنتجات", qtyTotal: "إجمالي الكمية", nearestExp: "أقرب انتهاء", noProducts: "لا توجد منتجات", seeProducts: "عرض المنتجات", expired: "منتهي", expToday: "اليوم", expIn: (n) => `بعد ${n} يوم`, tapRoom: "اضغط على غرفة لعرض تفاصيلها", close: "إغلاق",
  },
};


const STATUS = {
  ok:   { color: "#16a34a", bg: "#dcfce7", icon: "✅" },
  warn: { color: "#d97706", bg: "#fef3c7", icon: "⚠️" },
  out:  { color: "#dc2626", bg: "#fee2e2", icon: "⛔" },
  none: { color: "#94a3b8", bg: "#f1f5f9", icon: "•" },
};
const CAL_ICON = { ok: "🎯", soon: "⏳", expired: "⛔", none: "" };

const hexA = (hex, a) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
};

/* globals.css forces every font size with !important; the doubled class wins. */
const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
.cr3.cr3 { min-height:100vh; background:#eef6fc; color:#0f172a; padding:12px 14px 28px; box-sizing:border-box; }
.cr3.cr3 .cr-bar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; background:#fff; border:1px solid #dbeafe; border-radius:16px; padding:10px 14px; box-shadow:0 4px 18px rgba(14,116,144,.07); }
.cr3.cr3 .cr-h1 { font-size:${fs(22)}; font-weight:900; margin:0; line-height:1.2; }
.cr3.cr3 .cr-sub { font-size:${fs(13)}; color:#64748b; margin:0; }
.cr3.cr3 .cr-btn { font-size:${fs(14)}; font-weight:800; border:1px solid #cfe3f3; background:#fff; color:#0c4a6e; border-radius:10px; padding:7px 13px; cursor:pointer; font-family:inherit; }
.cr3.cr3 .cr-btn:hover { background:#f0f9ff; }
.cr3.cr3 .cr-btn.pri { background:#0284c7; color:#fff; border-color:#0284c7; }
.cr3.cr3 .cr-btn.pri:hover { background:#0369a1; }
.cr3.cr3 .cr-btn:disabled { opacity:.55; cursor:default; }
.cr3.cr3 .cr-seg { display:inline-flex; border:1px solid #cfe3f3; border-radius:12px; overflow:hidden; background:#fff; }
.cr3.cr3 .cr-seg button { border:0; border-radius:0; }
.cr3.cr3 .cr-chip { font-size:${fs(13)}; font-weight:800; border-radius:999px; padding:4px 11px; display:inline-flex; gap:6px; align-items:center; border:1px solid transparent; white-space:nowrap; }
.cr3.cr3 .cr-small { font-size:${fs(12.5)}; color:#64748b; }
.cr3.cr3 .cr-lbl { font-size:${fs(12)}; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:.3px; }
.cr3.cr3 .cr-val { font-size:${fs(15)}; font-weight:800; }
.cr3.cr3 .cr-big { font-size:${fs(40)}; font-weight:900; line-height:1.05; font-variant-numeric:tabular-nums; }
.cr3.cr3 .cr-ptitle { font-size:${fs(20)}; font-weight:900; }
.cr3.cr3 .cr-input { font-size:${fs(15)}; font-weight:700; padding:8px 10px; border-radius:9px; border:1px solid #cbd5e1; background:#fff; color:#0f172a; width:100%; box-sizing:border-box; font-family:inherit; }
.cr3.cr3 .cr-kind { font-size:${fs(14)}; font-weight:800; border-radius:10px; padding:8px 6px; cursor:pointer; border:2px solid #e2e8f0; background:#fff; font-family:inherit; }
.cr3.cr3 .cr-stage { position:relative; margin-top:12px; height:calc(100vh - 118px); min-height:520px; border-radius:20px; overflow:hidden; border:1px solid #dbeafe; box-shadow:0 12px 34px rgba(14,116,144,.12); background:#e8f3fb; }
.cr3.cr3 .cr-stage.simple { height:auto; min-height:0; overflow:visible; background:transparent; border:0; box-shadow:none; }
.cr3.cr3 .cr-glass { background:rgba(255,255,255,.94); backdrop-filter:blur(8px); border:1px solid rgba(219,234,254,.9); border-radius:16px; box-shadow:0 8px 26px rgba(15,23,42,.10); }
.cr3.cr3 .cr-drawer { position:absolute; top:12px; left:12px; width:400px; max-width:calc(100% - 24px); max-height:calc(100% - 84px); overflow:auto; z-index:5; padding:16px; box-sizing:border-box; }
.cr3.cr3 .cr-drawer.wide { width:min(1840px, calc(100% - 24px)); }
/* the simple view opens the details as a sheet over the page */
.cr3.cr3 .cr-sheet-bg { position:fixed; inset:0; background:rgba(15,23,42,.35); z-index:900; }
.cr3.cr3 .cr-sheet { position:fixed; z-index:901; left:50%; top:50%; transform:translate(-50%,-50%); width:min(560px, calc(100vw - 24px)); max-height:calc(100vh - 40px); overflow:auto; padding:16px; box-sizing:border-box; }
.cr3.cr3 .cr-sheet.wide { width:min(1600px, calc(100vw - 24px)); }
.cr3.cr3 .cr-tools { position:absolute; right:12px; bottom:12px; display:flex; gap:6px; z-index:4; padding:6px; }
.cr3.cr3 .cr-legend { position:absolute; right:12px; top:12px; display:flex; flex-direction:column; gap:5px; z-index:4; padding:8px 10px; }
.cr3.cr3 .cr-hint { position:absolute; left:50%; transform:translateX(-50%); bottom:14px; font-size:${fs(12.5)}; color:#0369a1; font-weight:800; padding:5px 12px; z-index:3; pointer-events:none; white-space:nowrap; }
/* the rooms as cards — as in the store: 5-8 on the left, 1-4 on the right */
.cr3.cr3 .cr-strip { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:12px; }
.cr3.cr3 .cr-strip.store { grid-template-columns:1fr 56px 1fr; gap:12px; margin-top:0; }
.cr3.cr3 .cr-corr { display:flex; align-items:center; justify-content:center; writing-mode:vertical-rl; background:repeating-linear-gradient(180deg,#cfd8e1 0 18px,#dfe6ed 18px 36px); border-radius:12px; color:#475569; font-weight:900; letter-spacing:4px; font-size:${fs(12)}; }
.cr3.cr3 .cr-side { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; align-content:start; }
.cr3.cr3 .cr-strip.store .cr-side { grid-template-columns:1fr; }
.cr3.cr3 .cr-room { text-align:start; background:#fff; border:2px solid #e2e8f0; border-radius:16px; padding:12px 14px; cursor:pointer; font-family:inherit; display:grid; gap:4px; color:#0f172a; }
.cr3.cr3 .cr-room:hover { box-shadow:0 6px 18px rgba(14,116,144,.12); }
.cr3.cr3 .cr-rname { font-size:${fs(16)}; font-weight:900; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cr3.cr3 .cr-rtemp { font-size:${fs(28)}; font-weight:900; font-variant-numeric:tabular-nums; }
.cr3.cr3 .cr-rmeta { display:flex; flex-wrap:wrap; gap:6px; }
.cr3.cr3 .cr-sum { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
.cr3.cr3 .cr-sum > div { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:8px 10px; }
.cr3.cr3 .cr-sum b { display:block; font-size:${fs(18)}; font-weight:900; font-variant-numeric:tabular-nums; }
.cr3.cr3 .cr-nogl { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:${fs(16)}; font-weight:800; color:#475569; padding:20px; text-align:center; }
@media (max-width: 900px) {
  .cr3.cr3 .cr-strip { grid-template-columns:1fr; }
  .cr3.cr3 .cr-stage { height:62vh; min-height:380px; }
  .cr3.cr3 .cr-drawer { left:8px; right:8px; top:auto; bottom:8px; width:auto; max-height:72%; }
  .cr3.cr3 .cr-legend, .cr3.cr3 .cr-hint { display:none; }
}
/* phones: bigger touch targets, sheets from the bottom, one card per row */
@media (max-width: 640px) {
  .cr3.cr3 { padding:8px 8px 24px; }
  .cr3.cr3 .cr-bar { padding:8px 10px; gap:8px; }
  .cr3.cr3 .cr-h1 { font-size:${fs(19)}; }
  .cr3.cr3 .cr-sub { display:none; }
  .cr3.cr3 .cr-btn { font-size:${fs(15)}; padding:10px 14px; border-radius:12px; }
  .cr3.cr3 .cr-strip.store { grid-template-columns:1fr; }
  .cr3.cr3 .cr-corr { display:none; }
  .cr3.cr3 .cr-sheet, .cr3.cr3 .cr-sheet.wide { left:0; right:0; top:auto; bottom:0; transform:none; width:auto; max-height:88vh; border-radius:20px 20px 0 0; }
  .cr3.cr3 .cr-sum { grid-template-columns:1fr 1fr; }
}
`;

/* ══════════════════════════════════════ Room editor */
function RoomEditor({ room, t, ar, onCancel, onSave, saving }) {
  const [d, setD] = useState(() => ({ ...room, link: room.link ? { ...room.link } : null }));
  const [units, setUnits] = useState(null);
  const branch = d.link?.branch || "";

  useEffect(() => {
    if (!branch) { setUnits([]); return undefined; }
    let alive = true;
    setUnits(null);
    loadLogUnits(branch).then((u) => { if (alive) setUnits(u); }).catch(() => { if (alive) setUnits([]); });
    return () => { alive = false; };
  }, [branch]);

  const set = (patch) => setD((p) => ({ ...p, ...patch }));
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 4 }}>
        <span className="cr-lbl">{t.name}</span>
        <input className="cr-input" value={d.name} onChange={(e) => set({ name: e.target.value })} />
      </label>
      <div style={{ display: "grid", gap: 4 }}>
        <span className="cr-lbl">{t.kind}</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {ROOM_KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              className="cr-kind"
              style={d.kind === k.key ? { borderColor: k.color, background: hexA(k.color, 0.1), color: k.color } : undefined}
              // A new kind brings its usual band; the user can tune it after.
              onClick={() => set({ kind: k.key, min: k.min, max: k.max })}
            >
              {k.emoji} {ar ? k.ar : k.en}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span className="cr-lbl">{t.min}</span>
          <input className="cr-input" type="number" step="0.5" value={d.min} onChange={(e) => set({ min: e.target.value })} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span className="cr-lbl">{t.max}</span>
          <input className="cr-input" type="number" step="0.5" value={d.max} onChange={(e) => set({ max: e.target.value })} />
        </label>
      </div>
      <label style={{ display: "grid", gap: 4 }}>
        <span className="cr-lbl">{t.link}</span>
        <select
          className="cr-input"
          value={branch}
          onChange={(e) => set({ link: e.target.value ? { branch: e.target.value, key: "", label: "" } : null })}
        >
          <option value="">{t.none_}</option>
          {Object.keys(CALIB_LOGS).map((b) => <option key={b} value={b}>{branchLabel(b)}</option>)}
        </select>
      </label>
      {branch ? (
        <label style={{ display: "grid", gap: 4 }}>
          <span className="cr-lbl">{t.unit}</span>
          {units === null ? <span className="cr-small">{t.loadingUnits}</span> : (
            <select
              className="cr-input"
              value={d.link?.key || ""}
              onChange={(e) => {
                const u = units.find((x) => x.key === e.target.value);
                set({ link: { branch, key: e.target.value, label: u?.label || e.target.value } });
              }}
            >
              <option value="">{t.none_}</option>
              {units.map((u) => <option key={u.key} value={u.key}>{u.emoji} {u.label}</option>)}
            </select>
          )}
        </label>
      ) : null}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="cr-btn" onClick={onCancel} disabled={saving}>{t.cancel}</button>
        <button
          type="button"
          className="cr-btn pri"
          disabled={saving}
          onClick={() => onSave({ ...d, link: d.link?.key ? d.link : null })}
        >
          {saving ? t.saving : t.save}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════ Products summary of one room */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const daysTo = (iso) => {
  if (!ISO_DAY.test(iso || "")) return null;
  const t0 = Date.parse(`${new Date(Date.now() + 4 * 3600000).toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - t0) / 86400000);
};
const expColor = (n) => (n == null ? "#64748b" : n < 0 ? "#dc2626" : n <= 3 ? "#d97706" : "#16a34a");
const dmy = (iso) => (ISO_DAY.test(iso || "") ? iso.split("-").reverse().join("/") : "");
function summaryOf(stockRoom) {
  const items = stockRoom?.items || [];
  const dated = items.map((it) => it.expDate).filter((d) => ISO_DAY.test(d || "")).sort();
  const nearest = dated[0] || "";
  return { count: items.length, total: totalQty(items), nearest, days: daysTo(nearest) };
}
const expText = (sum, t) => (!sum.nearest ? "" : sum.days < 0 ? `${dmy(sum.nearest)} · ${t.expired}` : sum.days === 0 ? `${dmy(sum.nearest)} · ${t.expToday}` : `${dmy(sum.nearest)} · ${t.expIn(sum.days)}`);

/* the 3D view needs WebGL and room on the screen; a phone starts on the simple view */
const VIEW_KEY = "cold_rooms_view_v1";
const firstView = (gl) => {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === "3d" && gl) return "3d";
    if (v === "simple") return "simple";
  } catch { /* no saved choice */ }
  return gl && window.innerWidth >= 700 ? "3d" : "simple";
};

/* ══════════════════════════════════════ Page */
export default function ColdRooms3D() {
  const navigate = useNavigate();
  const [lang, setLang] = useLangState("ar");
  const ar = lang === "ar";
  const t = TX[ar ? "ar" : "en"];
  const editable = canEdit("coldRooms");
  const [gl] = useState(hasWebGL);
  const [view, setViewRaw] = useState(() => firstView(hasWebGL()));
  const setView = (v) => {
    setViewRaw(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* convenience only */ }
  };

  const [rooms, setRooms] = useState(() => loadCache());
  const [seeded, setSeeded] = useState(false);
  const [live, setLive] = useState([]);
  const [stamp, setStamp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [viewCmd, setViewCmd] = useState(null);
  const [stock, setStock] = useState({});
  const [tab, setTab] = useState("info");

  const loadStock = useCallback(() => {
    const ctrl = new AbortController();
    fetchStock(ctrl.signal).then((st) => { if (!ctrl.signal.aborted) setStock(st); });
    return ctrl;
  }, []);
  useEffect(() => { const c = loadStock(); return () => c.abort(); }, [loadStock]);
  const calibs = useCalibrations();

  /* rooms config */
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      const got = await fetchRooms(ctrl.signal);
      if (ctrl.signal.aborted) return;
      if (got) { setRooms(got.rooms); setSeeded(false); return; }
      if (!loadCache()) {
        const seed = await seedFromQcs();
        if (ctrl.signal.aborted) return;
        setRooms(seed);
        if (canEdit("coldRooms")) {
          const u = getCurrentUser();
          saveRooms(seed, u.username || u.name || "").then(() => setSeeded(false)).catch(() => setSeeded(true));
        } else setSeeded(true);
      }
    })();
    return () => ctrl.abort();
  }, []);

  /* live readings */
  const refresh = useCallback(async () => {
    if (!rooms) return;
    setBusy(true);
    try {
      setLive(await loadLive(rooms, localDate()));
      setStamp(new Date());
    } finally {
      setBusy(false);
    }
  }, [rooms]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) { refresh(); loadStock(); } }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [refresh, loadStock]);

  const calOf = useCallback((room) => {
    if (!calibs || !room?.link) return null;
    const L = CALIB_LOGS[room.link.branch];
    if (!L) return null;
    const rec = calibrationForUnit(calibs, { branch: room.link.branch, log: L.log, unitKey: room.link.key, label: room.link.label });
    return { rec, ...expiryStatus(rec) };
  }, [calibs]);

  const cals = useMemo(() => (rooms || []).map(calOf), [rooms, calOf]);
  const sums = useMemo(() => (rooms || []).map((_, i) => summaryOf(stock[String(i)])), [rooms, stock]);

  const counts = useMemo(() => {
    const c = { ok: 0, warn: 0, out: 0, none: 0, cal: 0 };
    (rooms || []).forEach((r, i) => {
      const v = live[i]?.value;
      c[v != null ? verdict(r, v) : "none"] += 1;
      if (cals[i]?.state === "expired") c.cal += 1;
    });
    return c;
  }, [rooms, live, cals]);

  const choose = useCallback((i, which = "info") => {
    setPick(i);
    setTab(which);
    setEditing(false);
    setMsg("");
  }, []);

  // A click on empty floor closes the card — but never an editor mid-way.
  // A click on a door opens the room's products.
  const onScenePick = useCallback((i, info) => {
    if (i != null) choose(i, info?.door ? "stock" : "info");
    else if (!editing) setPick(null);
  }, [choose, editing]);

  const saveRoom = async (i, next) => {
    setSaving(true);
    setMsg("");
    try {
      const list = rooms.map((r, j) => (j === i ? normalizeRoom(next, i) : r));
      const u = getCurrentUser();
      setRooms(await saveRooms(list, u.username || u.name || ""));
      setSeeded(false);
      setEditing(false);
      setMsg(t.saved);
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const sel = pick != null && rooms ? rooms[pick] : null;
  const is3d = view === "3d" && gl;

  /* the room's details: tabs + info / products / editor (drawer in 3D, sheet in the simple view) */
  const details = sel ? (
    <>
      {!editing ? (
        <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className={`cr-btn${tab === "info" ? " pri" : ""}`} onClick={() => setTab("info")}>ℹ️ {t.tabInfo}</button>
          <button type="button" className={`cr-btn${tab === "stock" ? " pri" : ""}`} onClick={() => setTab("stock")}>
            📦 {t.tabStock} ({sums[pick]?.count || 0})
          </button>
          <span style={{ flex: 1 }} />
          <button type="button" className="cr-btn" onClick={() => setPick(null)} aria-label={t.close}>✕</button>
        </div>
      ) : null}
      {!editing && tab === "stock" ? (
        <StockPanel index={pick} room={sel} live={live[pick]} stock={stock[String(pick)]} ar={ar} />
      ) : editing ? (
        <>
          <div className="cr-ptitle" style={{ marginBottom: 10 }}>✏️ {pick + 1}. {sel.name}</div>
          <RoomEditor key={pick} room={sel} t={t} ar={ar} saving={saving}
            onCancel={() => setEditing(false)} onSave={(next) => saveRoom(pick, next)} />
          {msg ? <div className="cr-small" style={{ marginTop: 8, fontWeight: 800 }}>{msg}</div> : null}
        </>
      ) : (
        <RoomDetails
          i={pick} room={sel} live={live[pick]} cal={cals[pick]} sum={sums[pick]} t={t} ar={ar} calibs={calibs}
          editable={editable} msg={msg}
          onEdit={() => { setEditing(true); setMsg(""); }}
          onProducts={() => setTab("stock")}
          onOpen={(path) => navigate(path)}
        />
      )}
    </>
  ) : null;

  const card = (i) => {
    const r = rooms?.[i];
    if (!r) return null;
    return (
      <RoomCard key={i} i={i} room={r} live={live[i]} cal={cals[i]} sum={sums[i]} on={pick === i} t={t} ar={ar}
        onClick={() => choose(i)} />
    );
  };

  return (
    <div className="cr3 cr3" dir={ar ? "rtl" : "ltr"}>
      <style>{CSS}</style>

      {/* top bar */}
      <div className="cr-bar">
        <button type="button" className="cr-btn" onClick={() => navigate("/named-dashboard")}>{ar ? "→" : "←"} {t.back}</button>
        <div style={{ minWidth: 160 }}>
          <h1 className="cr-h1">🧊 {t.title}</h1>
          <p className="cr-sub">{t.sub}</p>
        </div>
        <span style={{ flex: 1 }} />
        {["ok", "warn", "out", "none"].map((s) => (
          <span key={s} className="cr-chip" style={{ background: STATUS[s].bg, color: STATUS[s].color, borderColor: hexA(STATUS[s].color, 0.3) }}>
            {STATUS[s].icon} {t[s]}: {counts[s]}
          </span>
        ))}
        {counts.cal ? (
          <span className="cr-chip" style={{ background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" }}>⛔ {t.calibExpired}: {counts.cal}</span>
        ) : null}
        {stamp ? <span className="cr-small">{t.updated}: {timeLabel(stamp.toISOString())}</span> : null}
        {gl ? (
          <span className="cr-seg">
            <button type="button" className={`cr-btn${is3d ? " pri" : ""}`} onClick={() => setView("3d")}>{t.view3d}</button>
            <button type="button" className={`cr-btn${!is3d ? " pri" : ""}`} onClick={() => setView("simple")}>{t.viewSimple}</button>
          </span>
        ) : null}
        {!hideSectionLangToggle() ? (
          <button type="button" className="cr-btn" onClick={() => setLang(ar ? "en" : "ar")}>{ar ? "EN" : "ع"}</button>
        ) : null}
        <button type="button" className="cr-btn pri" onClick={() => { refresh(); loadStock(); }} disabled={busy}>⟳ {t.refresh}</button>
      </div>
      {seeded ? <div className="cr-small" style={{ marginTop: 8, color: "#b45309", fontWeight: 800 }}>ℹ️ {t.firstRun}</div> : null}

      {is3d ? (
        <>
          {/* 3D scene */}
          <div className="cr-stage" dir="ltr">
            <ColdRoomsScene rooms={rooms} live={live} cals={cals} pick={pick} onPick={onScenePick} lang={lang} t={t}
              viewCmd={viewCmd} stock={stock} />

            <div className="cr-glass cr-legend" dir={ar ? "rtl" : "ltr"}>
              {ROOM_KINDS.map((k) => (
                <span key={k.key} className="cr-chip" style={{ background: hexA(k.color, 0.1), color: k.color, justifyContent: "flex-start" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: k.color, display: "inline-block" }} />
                  {k.emoji} {ar ? k.ar : k.en}
                </span>
              ))}
            </div>

            <div className="cr-glass cr-tools">
              <button type="button" className="cr-btn" onClick={() => { setPick(null); setViewCmd({ kind: "reset", n: Date.now() }); }}>🏠 {t.reset}</button>
              <button type="button" className="cr-btn" onClick={() => { setPick(null); setViewCmd({ kind: "top", n: Date.now() }); }}>⬇ {t.top}</button>
            </div>

            {!sel ? <span className="cr-glass cr-hint" dir={ar ? "rtl" : "ltr"}>🖐 {t.drag}</span> : null}

            {sel ? (
              <div className={`cr-glass cr-drawer${tab === "stock" && !editing ? " wide" : ""}`} dir={ar ? "rtl" : "ltr"}>
                {details}
              </div>
            ) : null}
          </div>

          {/* the eight rooms as cards under the scene */}
          <div className="cr-strip" dir="ltr">
            {[[4, 5, 6, 7], [0, 1, 2, 3]].map((side) => (
              <div key={side[0]} className="cr-side" dir={ar ? "rtl" : "ltr"}>{side.map(card)}</div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* simple view: the store as a plan — 5-8 on the left, the corridor, 1-4 on the right */}
          <div className="cr-stage simple">
            {!sel ? <div className="cr-small" style={{ fontWeight: 800, margin: "4px 2px 10px" }}>👆 {t.tapRoom}</div> : null}
            <div className="cr-strip store" dir="ltr">
              <div className="cr-side" dir={ar ? "rtl" : "ltr"}>{[4, 5, 6, 7].map(card)}</div>
              <div className="cr-corr">{t.corridor}</div>
              <div className="cr-side" dir={ar ? "rtl" : "ltr"}>{[0, 1, 2, 3].map(card)}</div>
            </div>
          </div>
          {sel ? (
            <>
              <div className="cr-sheet-bg" onClick={() => { if (!editing) setPick(null); }} />
              <div className={`cr-glass cr-sheet${tab === "stock" && !editing ? " wide" : ""}`} dir={ar ? "rtl" : "ltr"} role="dialog">
                {details}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

/* One room as a card: number + name, temperature, products and nearest expiry. */
function RoomCard({ i, room, live, cal, sum, on, t, ar, onClick }) {
  const k = kindOf(room.kind);
  const v = live?.value;
  const st = STATUS[v != null ? verdict(room, v) : "none"];
  return (
    <button type="button" className="cr-room" onClick={onClick}
      style={{ borderColor: on ? "#0ea5e9" : hexA(st.color, 0.45), boxShadow: on ? "0 0 0 3px rgba(14,165,233,.25)" : undefined }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <span className="cr-chip" style={{ background: k.color, color: "#fff", padding: "1px 9px" }}>{i + 1}</span>
        <span className="cr-rname">{room.name}</span>
        <span style={{ flex: 1 }} />
        {cal && CAL_ICON[cal.state] ? <span title={t.calib}>{CAL_ICON[cal.state]}</span> : null}
      </span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="cr-rtemp" style={{ color: st.color }}>{v != null ? `${v}°C` : "—"}</span>
        <span className="cr-small">{st.icon} {t[v != null ? verdict(room, v) : "none"]}</span>
      </span>
      <span className="cr-small">{k.emoji} {ar ? k.ar : k.en} · {room.min}…{room.max}°C</span>
      <span className="cr-rmeta">
        <span className="cr-chip" style={{ background: "#f1f5f9", color: "#334155" }}>
          📦 {sum?.count ? `${sum.count} · ${sum.total.toLocaleString()}` : t.noProducts}
        </span>
        {sum?.nearest ? (
          <span className="cr-chip" style={{ background: hexA(expColor(sum.days), 0.1), color: expColor(sum.days) }}>
            ⏳ {expText(sum, t)}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function RoomDetails({ i, room, live, cal, sum, t, ar, calibs, editable, msg, onEdit, onProducts, onOpen }) {
  const k = kindOf(room.kind);
  const st = live?.value != null ? verdict(room, live.value) : "none";
  const S = STATUS[st];
  const p = cal?.rec?.payload || {};
  const L = room.link ? CALIB_LOGS[room.link.branch] : null;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="cr-chip" style={{ background: hexA(k.color, 0.12), color: k.color }}>{k.emoji} {ar ? k.ar : k.en}</span>
        {cal && CAL_ICON[cal.state] ? <span className="cr-chip" style={{ background: "#f8fafc", color: "#334155" }}>{CAL_ICON[cal.state]} {t.calib}</span> : null}
      </div>
      <div className="cr-ptitle">{i + 1}. {room.name}</div>

      <div style={{ borderRadius: 14, padding: 14, background: S.bg, border: `2px solid ${hexA(S.color, 0.45)}` }}>
        <div className="cr-lbl">{t.latest}</div>
        <div className="cr-big" style={{ color: S.color }}>{live?.value != null ? `${live.value}°C` : "—"}</div>
        <div className="cr-val" style={{ color: S.color }}>{S.icon} {live?.error ? t.loadErr : t[st]}</div>
        {live?.value != null ? (
          <div className="cr-small" style={{ marginTop: 2 }}>
            {live.slot}{live.at ? ` · ${timeLabel(live.at)}` : ""}{live.kind === "recheck" ? ` · ${t.recheck}` : ""}{live.by ? ` · ${t.by} ${live.by}` : ""}
          </div>
        ) : null}
        <div className="cr-small" style={{ marginTop: 6 }}>{t.allowed}: <b>{room.min}°C … {room.max}°C</b></div>
      </div>

      {/* what is inside, at a glance */}
      <div className="cr-sum">
        <div><span className="cr-lbl">📦 {t.products}</span><b>{sum?.count || 0}</b></div>
        <div><span className="cr-lbl">{t.qtyTotal}</span><b>{(sum?.total || 0).toLocaleString()}</b></div>
        <div>
          <span className="cr-lbl">⏳ {t.nearestExp}</span>
          <b style={{ color: expColor(sum?.days), fontSize: "inherit" }}>{sum?.nearest ? expText(sum, t) : "—"}</b>
        </div>
      </div>
      {sum?.count ? <button type="button" className="cr-btn pri" onClick={onProducts}>📦 {t.seeProducts}</button> : null}

      <div>
        <div className="cr-lbl">{t.link}</div>
        {room.link ? (
          <div className="cr-val">{L ? branchLabel(room.link.branch) : room.link.branch} · {room.link.label}</div>
        ) : <div className="cr-small">🔗 {t.noLink}</div>}
      </div>

      {live?.readings?.length ? (
        <div>
          <div className="cr-lbl" style={{ marginBottom: 4 }}>{t.today}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {live.readings.map((r) => {
              const s = STATUS[verdict(room, r.value)];
              return (
                <span key={r.slot} className="cr-chip" style={{ background: s.bg, color: s.color, borderColor: hexA(s.color, 0.3) }}>
                  {r.label}: {r.value}°
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {room.link ? (
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10, display: "grid", gap: 6 }}>
          <div className="cr-lbl">🎯 {t.calib}</div>
          <CalibrationExpiryBadge records={calibs} branch={room.link.branch} log={L?.log}
            unitKey={room.link.key} label={room.link.label} lang={ar ? "ar" : "en"} />
          {cal?.rec ? (
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 10px" }} className="cr-small">
              <span>{t.equipment}</span><b>{p.equipmentName || "—"}</b>
              <span>{t.lastCal}</span><b>{fmtDay(p.lastCalibrationDate)}</b>
              <span>{t.nextDue}</span><b>{fmtDay(p.nextDueDate)}{cal.days != null ? ` · ${cal.days < 0 ? t.daysAgo(-cal.days) : t.daysLeft(cal.days)}` : ""}</b>
              <span>{t.result}</span><b style={{ color: p.result === "FAIL" ? "#b91c1c" : "#047857" }}>{p.result || "—"}</b>
            </div>
          ) : calibs ? <div className="cr-small">{t.notRecorded}</div> : null}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {live?.sheetPath ? <button type="button" className="cr-btn" onClick={() => onOpen(live.sheetPath)}>🌡️ {t.openSheet}</button> : null}
        {room.link ? <button type="button" className="cr-btn" onClick={() => onOpen("/haccp-iso/calibration/view")}>🎯 {t.openCalib}</button> : null}
        {editable ? <button type="button" className="cr-btn" onClick={onEdit}>✏️ {t.edit}</button> : null}
      </div>
      {msg ? <div className="cr-small" style={{ fontWeight: 800 }}>{msg}</div> : null}
    </div>
  );
}
