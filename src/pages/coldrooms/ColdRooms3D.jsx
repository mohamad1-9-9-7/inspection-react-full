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
// Orbit with the mouse, click a room to fly to it and open its card. Data
// refreshes every 5 minutes while the tab is visible.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { fetchStock, saveRoomStock } from "./coldRoomsStock";

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
    drag: "Drag to rotate · wheel to zoom · right-drag to pan", noWebgl: "This device cannot show 3D (WebGL is off).", unlinked: "Not linked", walk: "Click to walk", walkExit: "Exit walk", walkPause: "Stop", walkGo: "Walk", openDoor: "Open door", closeDoor: "Close door", insideHint: "You are inside — walk back out through the door", tabInfo: "Details", tabStock: "Goods", walkHint: "W/S or ↑/↓ to walk · A/D or ←/→ to turn · drag to look around",
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
    drag: "اسحب للتدوير · العجلة للتقريب · زر يمين للتحريك", noWebgl: "هذا الجهاز لا يدعم العرض ثلاثي الأبعاد (WebGL متوقف).", unlinked: "غير مربوطة", walk: "اضغط لتمشي", walkExit: "خروج من المشي", walkPause: "توقف", walkGo: "امشِ", openDoor: "افتح الباب", closeDoor: "سكّر الباب", insideHint: "أنت داخل الغرفة — ارجع من الباب لتطلع", tabInfo: "التفاصيل", tabStock: "البضاعة", walkHint: "W/S أو ↑/↓ للمشي · A/D أو ←/→ للالتفاف · اسحب للنظر حولك",
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
.cr3.cr3 .cr-chip { font-size:${fs(13)}; font-weight:800; border-radius:999px; padding:4px 11px; display:inline-flex; gap:6px; align-items:center; border:1px solid transparent; white-space:nowrap; }
.cr3.cr3 .cr-small { font-size:${fs(12.5)}; color:#64748b; }
.cr3.cr3 .cr-lbl { font-size:${fs(12)}; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:.3px; }
.cr3.cr3 .cr-val { font-size:${fs(15)}; font-weight:800; }
.cr3.cr3 .cr-big { font-size:${fs(40)}; font-weight:900; line-height:1.05; font-variant-numeric:tabular-nums; }
.cr3.cr3 .cr-ptitle { font-size:${fs(20)}; font-weight:900; }
.cr3.cr3 .cr-input { font-size:${fs(15)}; font-weight:700; padding:8px 10px; border-radius:9px; border:1px solid #cbd5e1; background:#fff; color:#0f172a; width:100%; box-sizing:border-box; font-family:inherit; }
.cr3.cr3 .cr-kind { font-size:${fs(14)}; font-weight:800; border-radius:10px; padding:8px 6px; cursor:pointer; border:2px solid #e2e8f0; background:#fff; font-family:inherit; }
.cr3.cr3 .cr-stage { position:relative; margin-top:12px; height:calc(100vh - 118px); min-height:520px; border-radius:20px; overflow:hidden; border:1px solid #dbeafe; box-shadow:0 12px 34px rgba(14,116,144,.12); background:#e8f3fb; }
.cr3.cr3 .cr-glass { background:rgba(255,255,255,.9); backdrop-filter:blur(8px); border:1px solid rgba(219,234,254,.9); border-radius:16px; box-shadow:0 8px 26px rgba(15,23,42,.10); }
.cr3.cr3 .cr-drawer { position:absolute; top:12px; left:12px; width:380px; max-width:calc(100% - 24px); max-height:calc(100% - 84px); overflow:auto; z-index:5; padding:16px; box-sizing:border-box; }
.cr3.cr3 .cr-drawer.wide { width:min(620px, calc(100% - 24px)); }
.cr3.cr3 .cr-tools { position:absolute; right:12px; bottom:12px; display:flex; gap:6px; z-index:4; padding:6px; }
.cr3.cr3 .cr-legend { position:absolute; right:12px; top:12px; display:flex; flex-direction:column; gap:5px; z-index:4; padding:8px 10px; }
.cr3.cr3 .cr-hint { position:absolute; left:50%; transform:translateX(-50%); bottom:14px; font-size:${fs(12.5)}; color:#0369a1; font-weight:800; padding:5px 12px; z-index:3; pointer-events:none; white-space:nowrap; }
.cr3.cr3 .cr-walk { position:absolute; left:50%; transform:translateX(-50%); bottom:12px; z-index:6; padding:10px 12px; display:grid; gap:8px; max-width:calc(100% - 24px); }
.cr3.cr3 .cr-pad { min-width:52px; font-size:${fs(20)}; touch-action:none; user-select:none; }
.cr3.cr3 .cr-strip { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:12px; }
.cr3.cr3 .cr-side { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; align-content:start; }
.cr3.cr3 .cr-room { text-align:start; background:#fff; border:2px solid #e2e8f0; border-radius:14px; padding:10px 12px; cursor:pointer; font-family:inherit; display:grid; gap:2px; }
.cr3.cr3 .cr-room:hover { box-shadow:0 6px 18px rgba(14,116,144,.12); }
.cr3.cr3 .cr-rname { font-size:${fs(15)}; font-weight:900; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cr3.cr3 .cr-rtemp { font-size:${fs(26)}; font-weight:900; font-variant-numeric:tabular-nums; }
.cr3.cr3 .cr-nogl { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:${fs(16)}; font-weight:800; color:#475569; padding:20px; text-align:center; }
@media (max-width: 900px) {
  .cr3.cr3 .cr-strip { grid-template-columns:1fr; }
  .cr3.cr3 .cr-stage { height:62vh; min-height:380px; }
  .cr3.cr3 .cr-drawer { left:8px; right:8px; top:auto; bottom:8px; width:auto; max-height:60%; }
  .cr3.cr3 .cr-legend, .cr3.cr3 .cr-hint { display:none; }
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

/* ══════════════════════════════════════ Page */
export default function ColdRooms3D() {
  const navigate = useNavigate();
  const [lang, setLang] = useLangState("ar");
  const ar = lang === "ar";
  const t = TX[ar ? "ar" : "en"];
  const editable = canEdit("coldRooms");
  const [gl] = useState(hasWebGL);

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
  const [walk, setWalk] = useState({ on: false, auto: false });
  const [walkCmd, setWalkCmd] = useState(null);
  const walkInput = useRef({ fwd: false, back: false, left: false, right: false });
  const [stock, setStock] = useState({});
  const [tab, setTab] = useState("info");

  useEffect(() => {
    const ctrl = new AbortController();
    fetchStock(ctrl.signal).then((st) => { if (!ctrl.signal.aborted) setStock(st); });
    return () => ctrl.abort();
  }, []);
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
    const id = setInterval(() => { if (!document.hidden) refresh(); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [refresh]);

  const calOf = useCallback((room) => {
    if (!calibs || !room?.link) return null;
    const L = CALIB_LOGS[room.link.branch];
    if (!L) return null;
    const rec = calibrationForUnit(calibs, { branch: room.link.branch, log: L.log, unitKey: room.link.key, label: room.link.label });
    return { rec, ...expiryStatus(rec) };
  }, [calibs]);

  const cals = useMemo(() => (rooms || []).map(calOf), [rooms, calOf]);

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
  // A click on a door opens the room's goods.
  const onScenePick = useCallback((i, info) => {
    if (i != null) choose(i, info?.door ? "stock" : "info");
    else if (!editing) setPick(null);
  }, [choose, editing]);

  // Stepping inside a room while walking shows what is in it.
  useEffect(() => {
    if (walk.inside != null) choose(walk.inside, "stock");
  }, [walk.inside, choose]);

  const saveStock = async (i, items) => {
    const u = getCurrentUser();
    const rec = await saveRoomStock(i, items, u.username || u.name || "");
    setStock((st) => ({ ...st, [String(i)]: rec }));
  };

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

  return (
    <div className="cr3 cr3" dir={ar ? "rtl" : "ltr"}>
      <style>{CSS}</style>

      {/* top bar */}
      <div className="cr-bar">
        <button type="button" className="cr-btn" onClick={() => navigate("/named-dashboard")}>{ar ? "→" : "←"} {t.back}</button>
        <div style={{ minWidth: 200 }}>
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
        {!hideSectionLangToggle() ? (
          <button type="button" className="cr-btn" onClick={() => setLang(ar ? "en" : "ar")}>{ar ? "EN" : "ع"}</button>
        ) : null}
        <button type="button" className="cr-btn pri" onClick={refresh} disabled={busy}>⟳ {t.refresh}</button>
      </div>
      {seeded ? <div className="cr-small" style={{ marginTop: 8, color: "#b45309", fontWeight: 800 }}>ℹ️ {t.firstRun}</div> : null}

      {/* 3D scene */}
      <div className="cr-stage" dir="ltr">
        {gl ? (
          <ColdRoomsScene rooms={rooms} live={live} cals={cals} pick={pick} onPick={onScenePick} lang={lang} t={t}
            viewCmd={viewCmd} walkCmd={walkCmd} walkInput={walkInput} onWalk={setWalk} stock={stock} />
        ) : <div className="cr-nogl">{t.noWebgl}</div>}

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

        {!sel && gl && !walk.on ? <span className="cr-glass cr-hint" dir={ar ? "rtl" : "ltr"}>🖐 {t.drag}</span> : null}

        {/* walk controls — hold an arrow to move */}
        {walk.on ? (
          <div className="cr-glass cr-walk" dir={ar ? "rtl" : "ltr"}>
            <div className="cr-small" style={{ fontWeight: 800, textAlign: "center" }}>
              {walk.inside != null ? `🚪 ${t.insideHint}` : `🚶 ${t.walkHint}`}
            </div>
            {walk.near != null && walk.inside == null ? (
              <button type="button" className="cr-btn pri" style={{ justifySelf: "center" }}
                onClick={() => setWalkCmd({ kind: "door", n: Date.now() })}>
                🚪 {walk.open ? t.closeDoor : t.openDoor} — {walk.near + 1}. {rooms?.[walk.near]?.name} (E)
              </button>
            ) : null}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }} dir="ltr">
              {[["left", "⟲"], ["fwd", "⬆"], ["back", "⬇"], ["right", "⟳"]].map(([k, icon]) => (
                <button
                  key={k}
                  type="button"
                  className="cr-btn cr-pad"
                  onPointerDown={(e) => {
                    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
                    walkInput.current[k] = true;
                    if (walk.auto && (k === "fwd" || k === "back")) setWalkCmd({ kind: "auto", value: false, n: Date.now() });
                  }}
                  onPointerUp={() => { walkInput.current[k] = false; }}
                  onPointerCancel={() => { walkInput.current[k] = false; }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {icon}
                </button>
              ))}
              <button type="button" className="cr-btn" onClick={() => setWalkCmd({ kind: "auto", value: !walk.auto, n: Date.now() })}>
                {walk.auto ? `⏸ ${t.walkPause}` : `▶ ${t.walkGo}`}
              </button>
              <button type="button" className="cr-btn pri" onClick={() => setWalkCmd({ kind: "exit", n: Date.now() })}>🚪 {t.walkExit}</button>
            </div>
          </div>
        ) : null}

        {sel ? (
          <div className={`cr-glass cr-drawer${tab === "stock" && !editing ? " wide" : ""}`} dir={ar ? "rtl" : "ltr"}>
            {!editing ? (
              <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
                <button type="button" className={`cr-btn${tab === "info" ? " pri" : ""}`} onClick={() => setTab("info")}>ℹ️ {t.tabInfo}</button>
                <button type="button" className={`cr-btn${tab === "stock" ? " pri" : ""}`} onClick={() => setTab("stock")}>
                  📦 {t.tabStock} ({stock[String(pick)]?.items?.length || 0})
                </button>
                <span style={{ flex: 1 }} />
                <button type="button" className="cr-btn" onClick={() => setPick(null)}>✕</button>
              </div>
            ) : null}
            {!editing && tab === "stock" ? (
              <StockPanel index={pick} room={sel} live={live[pick]} stock={stock[String(pick)]} editable={editable} ar={ar}
                onSave={(items) => saveStock(pick, items)} />
            ) : editing ? (
              <>
                <div className="cr-ptitle" style={{ marginBottom: 10 }}>✏️ {pick + 1}. {sel.name}</div>
                <RoomEditor key={pick} room={sel} t={t} ar={ar} saving={saving}
                  onCancel={() => setEditing(false)} onSave={(next) => saveRoom(pick, next)} />
                {msg ? <div className="cr-small" style={{ marginTop: 8, fontWeight: 800 }}>{msg}</div> : null}
              </>
            ) : (
              <RoomDetails
                i={pick} room={sel} live={live[pick]} cal={cals[pick]} t={t} ar={ar} calibs={calibs}
                editable={editable} msg={msg}
                onEdit={() => { setEditing(true); setMsg(""); }}
                onOpen={(path) => navigate(path)}
              />
            )}
          </div>
        ) : null}
      </div>

      {/* the eight rooms as cards — as in the store: 5-8 on the left, 1-4 on the right */}
      <div className="cr-strip" dir="ltr">
        {[[4, 5, 6, 7], [0, 1, 2, 3]].map((side) => (
        <div key={side[0]} className="cr-side" dir={ar ? "rtl" : "ltr"}>
        {side.map((i) => {
          const r = rooms?.[i];
          if (!r) return null;
          const k = kindOf(r.kind);
          const v = live[i]?.value;
          const st = STATUS[v != null ? verdict(r, v) : "none"];
          const on = pick === i;
          return (
            <button key={i} type="button" className="cr-room" onClick={() => choose(i)}
              style={{ borderColor: on ? "#0ea5e9" : hexA(st.color, 0.45), boxShadow: on ? "0 0 0 3px rgba(14,165,233,.25)" : undefined }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span className="cr-chip" style={{ background: k.color, color: "#fff", padding: "1px 9px" }}>{i + 1}</span>
                <span className="cr-rname">{r.name}</span>
              </span>
              <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="cr-rtemp" style={{ color: st.color }}>{v != null ? `${v}°C` : "—"}</span>
                <span style={{ flex: 1 }} />
                {cals[i] && CAL_ICON[cals[i].state] ? <span>{CAL_ICON[cals[i].state]}</span> : null}
              </span>
              <span className="cr-small">{k.emoji} {ar ? k.ar : k.en} · {r.min}…{r.max}°C</span>
            </button>
          );
        })}
        </div>
        ))}
      </div>
    </div>
  );
}

function RoomDetails({ i, room, live, cal, t, ar, calibs, editable, msg, onEdit, onOpen }) {
  const k = kindOf(room.kind);
  const st = live?.value != null ? verdict(room, live.value) : "none";
  const S = STATUS[st];
  const p = cal?.rec?.payload || {};
  const L = room.link ? CALIB_LOGS[room.link.branch] : null;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="cr-chip" style={{ background: hexA(k.color, 0.12), color: k.color }}>{k.emoji} {ar ? k.ar : k.en}</span>
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
        {editable ? <button type="button" className="cr-btn pri" onClick={onEdit}>✏️ {t.edit}</button> : null}
      </div>
      {msg ? <div className="cr-small" style={{ fontWeight: 800 }}>{msg}</div> : null}
    </div>
  );
}
