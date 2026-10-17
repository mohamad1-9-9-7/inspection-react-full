// src/pages/coldrooms/ColdRooms3D.jsx
//
// 🧊 Cold Rooms 3D — eight rooms, four facing four across a corridor, drawn
// in CSS 3D (no WebGL library: the labels stay real text, Arabic included).
//
//   • each room: name · kind (chiller / dry store / freezer / general store)
//     · the allowed band — all set here by the user (coldRoomsConfig.js)
//   • linked to a unit of a temperature log → today's latest reading
//   • linked to the calibration log → the calibration in force for that unit
//
// Drag the scene to turn it, the slider tilts it, a click on a room opens
// its card. Data refreshes every 5 minutes while the tab is visible.

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
    by: "by", recheck: "recheck", loadingUnits: "Loading units…", firstRun: "Rooms seeded from the QCS cooler setup — save to keep them.",
    drag: "Drag to rotate", unlinked: "Not linked",
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
    by: "بواسطة", recheck: "إعادة فحص", loadingUnits: "تحميل الوحدات…", firstRun: "تمت تعبئة الغرف من إعداد مبردات QCS — اضغط حفظ لتثبيتها.",
    drag: "اسحب للتدوير", unlinked: "غير مربوطة",
  },
};

const STATUS = {
  ok:   { color: "#16a34a", bg: "#dcfce7", icon: "✅" },
  warn: { color: "#d97706", bg: "#fef3c7", icon: "⚠️" },
  out:  { color: "#dc2626", bg: "#fee2e2", icon: "⛔" },
  none: { color: "#94a3b8", bg: "#f1f5f9", icon: "•" },
};
const CAL_ICON = { ok: "🎯", soon: "⏳", expired: "⛔", none: "" };

/* ══════════════════════════════════════ Scene geometry (px on the floor) */
const W = 200, D = 165, H = 105, GAP = 12, CORR = 96, PAD = 18;
const FLOOR_W = PAD * 2 + W * 4 + GAP * 3;
const FLOOR_D = PAD * 2 + D * 2 + CORR;
const VIEW0 = { spin: -10, tilt: 52, zoom: 1 };

const roomPos = (i) => {
  const col = i % 4;
  const rowB = i >= 4;
  return { x: PAD + col * (W + GAP), y: rowB ? PAD + D + CORR : PAD, rowB };
};

const hexA = (hex, a) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/* globals.css forces every font size with !important; the doubled class wins. */
const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
.cr3.cr3 { min-height:100vh; background:linear-gradient(180deg,#f0f9ff 0%,#e0f2fe 45%,#f8fafc 100%); color:#0f172a; padding:18px 16px 40px; box-sizing:border-box; }
.cr3.cr3 .cr-h1 { font-size:${fs(26)}; font-weight:900; margin:0; }
.cr3.cr3 .cr-sub { font-size:${fs(14)}; color:#475569; margin:2px 0 0; }
.cr3.cr3 .cr-btn { font-size:${fs(14)}; font-weight:800; border:1px solid #bae6fd; background:#fff; color:#0c4a6e; border-radius:10px; padding:7px 13px; cursor:pointer; font-family:inherit; }
.cr3.cr3 .cr-btn:hover { background:#f0f9ff; }
.cr3.cr3 .cr-btn.pri { background:linear-gradient(135deg,#0284c7,#1e3a8a); color:#fff; border:none; }
.cr3.cr3 .cr-btn:disabled { opacity:.55; cursor:default; }
.cr3.cr3 .cr-chip { font-size:${fs(13.5)}; font-weight:800; border-radius:999px; padding:5px 12px; display:inline-flex; gap:6px; align-items:center; border:1px solid transparent; }
.cr3.cr3 .cr-small { font-size:${fs(12.5)}; color:#64748b; }
.cr3.cr3 .cr-lbl { font-size:${fs(12)}; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:.3px; }
.cr3.cr3 .cr-val { font-size:${fs(15)}; font-weight:800; }
.cr3.cr3 .cr-big { font-size:${fs(40)}; font-weight:900; line-height:1.05; font-variant-numeric:tabular-nums; }
.cr3.cr3 .cr-ptitle { font-size:${fs(20)}; font-weight:900; }
.cr3.cr3 .cr-input { font-size:${fs(15)}; font-weight:700; padding:8px 10px; border-radius:9px; border:1px solid #cbd5e1; background:#fff; color:#0f172a; width:100%; box-sizing:border-box; font-family:inherit; }
.cr3.cr3 .cr-kind { font-size:${fs(14)}; font-weight:800; border-radius:10px; padding:8px 6px; cursor:pointer; border:2px solid #e2e8f0; background:#fff; font-family:inherit; }
.cr3.cr3 .cr-layout { position:relative; margin-top:12px; }
.cr3.cr3 .cr-drawer { position:absolute; top:12px; left:12px; width:360px; max-width:calc(100% - 24px); max-height:calc(100% - 24px); overflow:auto; z-index:5; }
.cr3.cr3 .cr-list { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-top:12px; }
@media (max-width: 900px) { .cr3.cr3 .cr-list { grid-template-columns:repeat(2,minmax(0,1fr)); } .cr3.cr3 .cr-drawer { position:static; width:auto; max-height:none; margin-top:12px; } }
.cr3.cr3 .cr-card { background:rgba(255,255,255,.88); border:1px solid #e0f2fe; border-radius:18px; box-shadow:0 10px 30px rgba(14,116,144,.10); }
.cr3.cr3 .cr-stage { position:relative; height:calc(100vh - 150px); min-height:540px; perspective:1700px; perspective-origin:50% 35%; overflow:hidden; cursor:grab; touch-action:none; user-select:none; border-radius:18px;
  background:radial-gradient(ellipse at 50% 30%,#ffffff 0%,#e0f2fe 55%,#bae6fd 100%); }
.cr3.cr3 .cr-stage.drag { cursor:grabbing; }
.cr3.cr3 .cr-floor { position:absolute; left:50%; top:50%; transform-style:preserve-3d; transition:transform .25s ease-out; }
.cr3.cr3 .cr-stage.drag .cr-floor { transition:none; }
.cr3.cr3 .cr-box { position:absolute; transform-style:preserve-3d; cursor:pointer; }
.cr3.cr3 .cr-face { position:absolute; box-sizing:border-box; backface-visibility:visible; }
.cr3.cr3 .cr-top { border-radius:4px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; color:#fff; text-shadow:0 1px 2px rgba(0,0,0,.35); }
.cr3.cr3 .cr-tname { font-size:19px !important; font-weight:900; max-width:186px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cr3.cr3 .cr-ttemp { font-size:48px !important; font-weight:900; font-variant-numeric:tabular-nums; line-height:1.05; }
.cr3.cr3 .cr-tmeta { font-size:15px !important; font-weight:800; opacity:.95; white-space:nowrap; }
.cr3.cr3 .cr-num { font-size:16px !important; font-weight:900; background:rgba(255,255,255,.92); color:#0f172a; border-radius:999px; padding:0 10px; text-shadow:none; }
.cr3.cr3 .cr-plate { font-size:16px !important; font-weight:900; color:#0f172a; background:rgba(255,255,255,.9); border-radius:6px; padding:1px 8px; white-space:nowrap; max-width:185px; overflow:hidden; text-overflow:ellipsis; }
.cr3.cr3 .cr-corr { font-size:26px !important; font-weight:900; letter-spacing:6px; color:rgba(12,74,110,.35); }
.cr3.cr3 .cr-hint { font-size:${fs(12.5)}; position:absolute; bottom:10px; left:12px; color:#0369a1; font-weight:800; background:rgba(255,255,255,.75); padding:3px 10px; border-radius:999px; pointer-events:none; }
.cr3.cr3 .cr-ctrl { position:absolute; top:10px; right:10px; display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; align-items:center; background:rgba(255,255,255,.8); padding:6px 8px; border-radius:12px; }
@keyframes crPulse { 0%,100% { box-shadow:0 0 0 3px rgba(220,38,38,.9), 0 0 18px rgba(220,38,38,.6); } 50% { box-shadow:0 0 0 3px rgba(220,38,38,.4), 0 0 34px rgba(220,38,38,.95); } }
.cr3.cr3 .cr-alarm { animation:crPulse 1.4s ease-in-out infinite; }
@media (max-width: 700px) { .cr3.cr3 .cr-stage { height:460px; min-height:0; } }
`;

/* ══════════════════════════════════════ One room box */
function RoomBox({ i, room, live, cal, selected, onPick, t }) {
  const { x, y, rowB } = roomPos(i);
  const k = kindOf(room.kind);
  const st = live?.value != null ? verdict(room, live.value) : "none";
  const S = STATUS[st];
  const wall = {
    background: `linear-gradient(180deg, ${hexA(k.color, 0.38)}, ${hexA(k.color, 0.18)})`,
    border: `1.5px solid ${hexA("#ffffff", 0.85)}`,
  };
  const sel = selected ? `0 0 0 4px #0f172a, 0 0 26px ${hexA(k.color, 0.9)}` : `0 0 0 3px ${S.color}`;
  return (
    <div
      className="cr-box"
      style={{ left: x, top: y, width: W, height: D, transform: rowB ? "rotateZ(180deg)" : "none" }}
      onClick={(e) => { e.stopPropagation(); onPick(i); }}
      title={room.name}
    >
      {/* floor shadow */}
      <div className="cr-face" style={{ inset: -6, background: "rgba(15,23,42,.16)", filter: "blur(6px)", borderRadius: 8 }} />
      {/* back */}
      <div className="cr-face" style={{ left: 0, top: -H, width: W, height: H, transformOrigin: "50% 100%", transform: "rotateX(-90deg)", ...wall }} />
      {/* left / right */}
      <div className="cr-face" style={{ left: -H, top: 0, width: H, height: D, transformOrigin: "100% 50%", transform: "rotateY(90deg)", ...wall }} />
      <div className="cr-face" style={{ left: W, top: 0, width: H, height: D, transformOrigin: "0 50%", transform: "rotateY(-90deg)", ...wall }} />
      {/* front — the door, facing the corridor */}
      <div
        className="cr-face"
        style={{
          left: 0, top: D - H, width: W, height: H, transformOrigin: "50% 100%", transform: "rotateX(-90deg)", ...wall,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 6, gap: 4,
        }}
      >
        <span className="cr-plate">{i + 1} · {room.name}</span>
        <div style={{
          width: 72, height: H - 36, marginTop: "auto", borderRadius: "5px 5px 0 0",
          background: "linear-gradient(180deg,#e2e8f0,#94a3b8)", border: "2px solid #fff", position: "relative",
        }}>
          <span style={{ position: "absolute", right: 6, top: "45%", width: 4, height: 12, borderRadius: 2, background: "#334155" }} />
        </div>
        <span style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: S.color }} />
      </div>
      {/* top — the live reading */}
      <div
        className={`cr-face cr-top${st === "out" ? " cr-alarm" : ""}`}
        style={{
          left: 0, top: 0, width: W, height: D, transform: `translateZ(${H}px)`,
          background: `linear-gradient(145deg, ${hexA(k.color, 0.95)}, ${hexA(k.color, 0.7)})`,
          boxShadow: sel,
        }}
      >
        <div style={{ transform: rowB ? "rotate(180deg)" : "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span className="cr-num">{i + 1} {k.emoji}</span>
          <span className="cr-tname">{room.name}</span>
          <span className="cr-ttemp">{live?.value != null ? `${live.value}°` : "—"}</span>
          <span className="cr-tmeta">
            {S.icon} {room.min}…{room.max}°C {cal && CAL_ICON[cal.state] ? ` ${CAL_ICON[cal.state]}` : ""}
          </span>
          {!room.link ? <span className="cr-tmeta">🔗 {t.unlinked}</span> : null}
        </div>
      </div>
    </div>
  );
}

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

  const [rooms, setRooms] = useState(() => loadCache());
  const [seeded, setSeeded] = useState(false);
  const [live, setLive] = useState([]);
  const [stamp, setStamp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const calibs = useCalibrations();

  const [view, setView] = useState(VIEW0);
  const [box, setBox] = useState({ w: 1000, h: 600 });
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  /* rooms config */
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      const got = await fetchRooms(ctrl.signal);
      if (ctrl.signal.aborted) return;
      if (got) { setRooms(got.rooms); setSeeded(false); return; }
      if (!loadCache()) { setRooms(await seedFromQcs()); setSeeded(true); }
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

  /* fit the floor to the stage width */
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* drag to rotate / tilt */
  const onDown = (e) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    dragRef.current = { x: e.clientX, y: e.clientY, v: view, moved: false };
  };
  const onMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    if (!d.moved) { d.moved = true; setDragging(true); try { stageRef.current?.setPointerCapture(e.pointerId); } catch { /* ignore */ } }
    setView({ ...d.v, spin: d.v.spin + dx * 0.4, tilt: Math.max(0, Math.min(80, d.v.tilt - dy * 0.3)) });
  };
  const onUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.moved) setTimeout(() => setDragging(false), 0);
  };

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

  // The rooms fill the stage: fit the turned, tilted floor to its width and height.
  const scale = useMemo(() => {
    const a = (view.spin * Math.PI) / 180;
    const tl = (view.tilt * Math.PI) / 180;
    const fw = Math.abs(FLOOR_W * Math.cos(a)) + Math.abs(FLOOR_D * Math.sin(a));
    const fd = Math.abs(FLOOR_W * Math.sin(a)) + Math.abs(FLOOR_D * Math.cos(a));
    const fh = fd * Math.cos(tl) + H * Math.sin(tl) + 40;
    return Math.max(0.3, Math.min((box.w - 24) / fw, (box.h - 70) / fh));
  }, [box, view.spin, view.tilt]);
  const floorTf = `translate(-50%,-50%) scale(${scale * view.zoom}) rotateX(${view.tilt}deg) rotateZ(${view.spin}deg)`;
  const sel = pick != null && rooms ? rooms[pick] : null;
  const selLive = pick != null ? live[pick] : null;
  const selCal = pick != null ? cals[pick] : null;

  return (
    <div className="cr3 cr3" dir={ar ? "rtl" : "ltr"}>
      <style>{CSS}</style>

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" className="cr-btn" onClick={() => navigate("/named-dashboard")}>{ar ? "→" : "←"} {t.back}</button>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 className="cr-h1">🧊 {t.title}</h1>
          <p className="cr-sub">{t.sub}</p>
        </div>
        {!hideSectionLangToggle() ? (
          <button type="button" className="cr-btn" onClick={() => setLang(ar ? "en" : "ar")}>{ar ? "EN" : "ع"}</button>
        ) : null}
        <button type="button" className="cr-btn pri" onClick={refresh} disabled={busy}>⟳ {t.refresh}</button>
      </div>

      {/* summary */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        {["ok", "warn", "out", "none"].map((s) => (
          <span key={s} className="cr-chip" style={{ background: STATUS[s].bg, color: STATUS[s].color, borderColor: hexA(STATUS[s].color, 0.35) }}>
            {STATUS[s].icon} {t[s]}: {counts[s]}
          </span>
        ))}
        {counts.cal ? (
          <span className="cr-chip" style={{ background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" }}>⛔ {t.calibExpired}: {counts.cal}</span>
        ) : null}
        <span style={{ flex: 1 }} />
        {ROOM_KINDS.map((k) => (
          <span key={k.key} className="cr-chip" style={{ background: hexA(k.color, 0.1), color: k.color }}>{k.emoji} {ar ? k.ar : k.en}</span>
        ))}
        {stamp ? <span className="cr-small">{t.updated}: {timeLabel(stamp.toISOString())}</span> : null}
      </div>
      {seeded ? <div className="cr-small" style={{ marginTop: 8, color: "#b45309", fontWeight: 800 }}>ℹ️ {t.firstRun}</div> : null}

      <div className="cr-layout">
        {/* 3D scene — geometry stays LTR whatever the language */}
        <div className="cr-card" style={{ padding: 0 }}>
          <div
            ref={stageRef}
            dir="ltr"
            className={`cr-stage${dragging ? " drag" : ""}`}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onClickCapture={(e) => { if (dragging) e.stopPropagation(); }}
            onClick={() => { if (!dragging) { setPick(null); setEditing(false); } }}
          >
            <div className="cr-floor" style={{ width: FLOOR_W, height: FLOOR_D, transform: floorTf }}>
              {/* the floor slab */}
              <div className="cr-face" style={{
                inset: 0, borderRadius: 14,
                background: "repeating-linear-gradient(0deg, #e2e8f0 0 1px, transparent 1px 32px), repeating-linear-gradient(90deg, #e2e8f0 0 1px, transparent 1px 32px), linear-gradient(135deg,#f8fafc,#cbd5e1)",
                boxShadow: "0 30px 60px rgba(15,23,42,.25), inset 0 0 0 3px #fff",
              }} />
              {/* corridor */}
              <div className="cr-face" style={{
                left: PAD - 8, right: PAD - 8, top: PAD + D + 10, height: CORR - 20, borderRadius: 10,
                background: "linear-gradient(90deg, rgba(14,165,233,.10), rgba(14,165,233,.22), rgba(14,165,233,.10))",
                border: "2px dashed rgba(3,105,161,.35)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span className="cr-corr">◀ {t.corridor} ▶</span>
              </div>
              {(rooms || []).map((room, i) => (
                <RoomBox key={i} i={i} room={room} live={live[i]} cal={cals[i]} selected={pick === i} t={t}
                  onPick={(n) => { if (!dragging) { setPick(n); setEditing(false); setMsg(""); } }} />
              ))}
            </div>

            <div className="cr-ctrl" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
              <button type="button" className="cr-btn" onClick={() => setView((v) => ({ ...v, spin: v.spin - 45 }))}>⟲</button>
              <button type="button" className="cr-btn" onClick={() => setView((v) => ({ ...v, spin: v.spin + 45 }))}>⟳</button>
              <button type="button" className="cr-btn" onClick={() => setView((v) => ({ ...v, zoom: Math.max(0.6, +(v.zoom - 0.1).toFixed(2)) }))}>−</button>
              <button type="button" className="cr-btn" onClick={() => setView((v) => ({ ...v, zoom: Math.min(1.6, +(v.zoom + 0.1).toFixed(2)) }))}>+</button>
              <button type="button" className="cr-btn" onClick={() => setView((v) => ({ ...v, tilt: 0, spin: 0 }))}>{t.top}</button>
              <button type="button" className="cr-btn" onClick={() => setView(VIEW0)}>{t.reset}</button>
              <label className="cr-small" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 800 }}>
                {t.tilt}
                <input type="range" min="0" max="80" value={view.tilt} onChange={(e) => setView((v) => ({ ...v, tilt: Number(e.target.value) }))} />
              </label>
            </div>
            <span className="cr-hint">🖐 {t.drag}</span>
          </div>
        </div>

        {/* details — a drawer over the scene, so the rooms keep the whole width */}
        {sel ? (
        <div className="cr-card cr-drawer" style={{ padding: 16 }}>
          {editing ? (
            <>
              <div className="cr-ptitle" style={{ marginBottom: 10 }}>✏️ {pick + 1}. {sel.name}</div>
              <RoomEditor key={pick} room={sel} t={t} ar={ar} saving={saving}
                onCancel={() => setEditing(false)} onSave={(next) => saveRoom(pick, next)} />
              {msg ? <div className="cr-small" style={{ marginTop: 8, fontWeight: 800 }}>{msg}</div> : null}
            </>
          ) : (
            <RoomDetails
              i={pick} room={sel} live={selLive} cal={selCal} t={t} ar={ar} calibs={calibs}
              editable={editable} msg={msg}
              onEdit={() => { setEditing(true); setMsg(""); }}
              onClose={() => setPick(null)}
              onOpen={(path) => navigate(path)}
            />
          )}
        </div>
        ) : null}
      </div>

      {/* quick list under the scene */}
      <div className="cr-list">
        {(rooms || []).map((r, i) => {
          const v = live[i]?.value;
          const st = STATUS[v != null ? verdict(r, v) : "none"];
          return (
            <button key={i} type="button" className="cr-btn" onClick={() => { setPick(i); setEditing(false); setMsg(""); }}
              style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "start", borderColor: hexA(st.color, 0.5), background: pick === i ? st.bg : undefined }}>
              <span>{i + 1}. {kindOf(r.kind).emoji} {r.name}</span>
              <span style={{ flex: 1 }} />
              <span style={{ color: st.color }}>{v != null ? `${v}°C` : "—"}</span>
              {cals[i] && CAL_ICON[cals[i].state] ? <span>{CAL_ICON[cals[i].state]}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RoomDetails({ i, room, live, cal, t, ar, calibs, editable, msg, onEdit, onClose, onOpen }) {
  const k = kindOf(room.kind);
  const st = live?.value != null ? verdict(room, live.value) : "none";
  const S = STATUS[st];
  const p = cal?.rec?.payload || {};
  const L = room.link ? CALIB_LOGS[room.link.branch] : null;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="cr-chip" style={{ background: hexA(k.color, 0.12), color: k.color }}>{k.emoji} {ar ? k.ar : k.en}</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="cr-btn" onClick={onClose}>✕</button>
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
              <span>{t.nextDue}</span><b>{fmtDay(p.nextDueDate)}{cal.days != null ? ` (${cal.days})` : ""}</b>
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
