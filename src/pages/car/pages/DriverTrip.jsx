// src/pages/car/pages/DriverTrip.jsx
//
// 🚚 The driver's phone page.
//
//   1. Scan the QR sticker on the truck (or pick the plate) → /car/driver/<plate>
//   2. Loading: time, truck temperature, photos of the thermometer, one or more
//      destinations, and "📍 my location".
//   3. At every destination: arrival time + temperature + photo + location,
//      and a photo of the signed transfer note (it replaced the returns list).
//
// One record per trip (DRIVER_TRIP_TYPE). The loading reports page shows the
// trips beside the outbound checklist.
// Opening the same truck again the same day resumes its open trip.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BarcodeScanner from "../../../components/BarcodeScanner";
import { uploadImage, thumbUrl } from "../../../utils/imageUpload";
import { keepPhotoOrUpload } from "../../../utils/offlineOutbox";
import { queuedMessage } from "../../../utils/reportOutbox";
import { useLangState, hideSectionLangToggle } from "../../../utils/appLang";
import { listReports, payloadOf } from "../../monitor/branches/_shared/reportApi";
import {
  COMPANY_DIRECTORY, lookupByEmpNo, normalizeEmpNo, useStaffDirectory,
} from "../../monitor/branches/_shared/staffRegistry";
import {
  DESTINATIONS, DRIVER_PATH, LOOKUP_VEHICLES_TYPE,
  mapsLink, vehicleFromScan,
} from "../carConstants";
import {
  currentUserName, listTrips, locateMe, normPlate, nowHHMM, saveTrip, todayISO, uid,
} from "../driverTripApi";

const T = {
  ar: {
    step1: "السيارة", step2: "التحميل", step3: "التوصيل",
    title: "رحلة السائق", sub: "امسح باركود السيارة وسجّل الحرارة عند التحميل وعند كل وصول",
    scanTruck: "📷 امسح باركود السيارة", orPick: "أو اختر رقم السيارة", go: "متابعة", vehicle: "السيارة",
    change: "تغيير السيارة", stickers: "🏷️ ملصقات QR للسيارات", back: "رجوع",
    loading: "التحميل", driver: "اسم السائق", date: "التاريخ", time: "الوقت", temp: "حرارة السيارة °C",
    stampHint: "يُسجَّل تلقائياً عند الضغط على 📍 تحديد موقعي", nStamp: "اضغط 📍 تحديد موقعي لتسجيل الوقت",
    startLoad: "بداية التحميل", endLoad: "انتهاء التحميل", setEnd: "حفظ وقت الانتهاء", endBefore: "وقت الانتهاء قبل وقت البداية",
    photos: "صور الحرارة", addPhoto: "📸 صورة", uploading: "عم يرفع…", dests: "إلى أين؟ (يمكن اختيار أكثر من وجهة)",
    myLoc: "📍 تحديد موقعي", myLocAgain: "تم — اضغط لإعادة التحديد", myLocHint: "يسجّل الموقع والتاريخ والوقت تلقائياً", locating: "عم يحدد الموقع…", locOk: "✅ تم تحديد الموقع", locFail: "تعذّر تحديد الموقع — اسمح للموقع من إعدادات المتصفح",
    notes: "ملاحظات", startTrip: "🚚 حفظ وبدء الرحلة", saving: "عم يحفظ…", saved: "✅ تم الحفظ",
    empNo: "الرقم الوظيفي للسائق", noEmp: "رقم غير موجود بقائمة الموظفين",
    need: "أكمل: ", nDriver: "رقم وظيفي صحيح", nTime: "الوقت", nTemp: "الحرارة", nDest: "وجهة واحدة على الأقل",
    origin: "🚩 فرع الانطلاق", nOrigin: "فرع الانطلاق", pickBranch: "اختر الفرع…",
    endPoint: "🏁 نقطة انتهاء الرحلة", endBranch: "فرع انتهاء الرحلة", saveEnd: "🏁 حفظ وإنهاء الرحلة",
    nEndBranch: "فرع انتهاء الرحلة", cancel: "إلغاء", from: "من", to: "إلى",
    stops: "الوجهات", arrived: "وصل", pending: "لم يصل بعد", arrival: "الوصول", saveStop: "💾 حفظ الوصول",
    transferNote: "صورة ورقة التحويل", addTransfer: "📸 صوّر ورقة التحويل",
    remove: "حذف", addStop: "+ إضافة وجهة", endTrip: "🏁 إنهاء الرحلة", ended: "الرحلة منتهية",
    reopen: "إعادة فتح", newTrip: "+ رحلة جديدة", otherTrips: "رحلات اليوم لهذه السيارة", open: "مفتوحة",
    highTemp: "⚠ الحرارة أعلى من 5°C", loadErr: "تعذّر تحميل البيانات من السيرفر",
    unknownVeh: "السيارة غير موجودة في القائمة — تأكد من الرقم", tripOf: "رحلة",
  },
  en: {
    step1: "Truck", step2: "Loading", step3: "Delivery",
    title: "Driver Trip", sub: "Scan the truck, record the temperature at loading and at every arrival",
    scanTruck: "📷 Scan truck barcode", orPick: "or pick the vehicle", go: "Continue", vehicle: "Vehicle",
    change: "Change vehicle", stickers: "🏷️ Truck QR stickers", back: "Back",
    loading: "Loading", driver: "Driver name", date: "Date", time: "Time", temp: "Truck temp °C",
    stampHint: "Set automatically by 📍 My location", nStamp: "press 📍 My location to record the time",
    startLoad: "Loading start", endLoad: "Loading end", setEnd: "Save end time", endBefore: "End time is before the start time",
    photos: "Temperature photos", addPhoto: "📸 Photo", uploading: "Uploading…", dests: "Where to? (one or more)",
    myLoc: "📍 My location", myLocAgain: "Done — press to update", myLocHint: "Records the location, date and time automatically", locating: "Locating…", locOk: "✅ Location set", locFail: "Could not get the location — allow it in the browser settings",
    notes: "Notes", startTrip: "🚚 Save & start trip", saving: "Saving…", saved: "✅ Saved",
    empNo: "Driver employee no.", noEmp: "Not in the employee list",
    need: "Complete: ", nDriver: "a valid employee no.", nTime: "time", nTemp: "temperature", nDest: "at least one destination",
    origin: "🚩 Start branch", nOrigin: "start branch", pickBranch: "Pick the branch…",
    endPoint: "🏁 Trip end point", endBranch: "End branch", saveEnd: "🏁 Save & end trip",
    nEndBranch: "end branch", cancel: "Cancel", from: "From", to: "To",
    stops: "Destinations", arrived: "Arrived", pending: "Not arrived yet", arrival: "Arrival", saveStop: "💾 Save arrival",
    transferNote: "Transfer note photo", addTransfer: "📸 Photo of the transfer note",
    remove: "Remove", addStop: "+ Add destination", endTrip: "🏁 End trip", ended: "Trip ended",
    reopen: "Reopen", newTrip: "+ New trip", otherTrips: "Today's trips for this vehicle", open: "open",
    highTemp: "⚠ Above 5°C", loadErr: "Could not load from the server",
    unknownVeh: "This vehicle is not in the list — check the number", tripOf: "Trip",
  },
};


const newStop = (name) => ({ id: uid(), name, arrival: null });

const isHigh = (t) => t !== "" && t != null && !isNaN(Number(t)) && Number(t) > 5;

/* ───────────────────────── small pieces ───────────────────────── */

function PhotoStrip({ photos, onChange, t }) {
  const [busy, setBusy] = useState(false);
  const add = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    try {
      const urls = [];
      for (const f of files) urls.push(await keepPhotoOrUpload(f, (x) => uploadImage(x, "driver_trip")));
      onChange([...(photos || []), ...urls]);
    } catch (err) {
      alert(err?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {(photos || []).map((src, i) => (
        <div key={src + i} style={{ position: "relative" }}>
          <a href={src} target="_blank" rel="noreferrer">
            <img src={src.startsWith("http") ? thumbUrl(src, 160) : src} alt="" style={st.thumb} />
          </a>
          <button
            type="button"
            title={t.remove}
            onClick={() => onChange(photos.filter((_, j) => j !== i))}
            style={st.thumbX}
          >
            ✕
          </button>
        </div>
      ))}
      <label style={{ ...st.btn("ghost"), opacity: busy ? 0.6 : 1 }}>
        {busy ? t.uploading : t.addPhoto}
        <input type="file" accept="image/*" capture="environment" multiple onChange={add} disabled={busy} style={{ display: "none" }} />
      </label>
    </div>
  );
}

/* Pressing it stamps the time (UAE) at that moment — loading start or arrival —
   even when the phone refuses the location, so the time never waits on GPS. */
function LocationButton({ value, onChange, onStamp, t }) {
  const [state, setState] = useState("");
  const go = async () => {
    if (onStamp) onStamp(nowHHMM(), todayISO());
    setState("busy");
    try {
      onChange(await locateMe());
      setState("");
    } catch {
      setState("fail");
    }
  };
  const link = mapsLink(value);
  const done = !!value;
  /* the first thing on the form: a wide, coloured box — blue until pressed,
     green once the location is in. Big type needs !important under #root. */
  return (
    <div
      style={{
        borderRadius: 16, padding: 10, marginBottom: 14,
        background: done ? "linear-gradient(135deg,#dcfce7,#f0fdf4)" : "linear-gradient(135deg,#dbeafe,#e0f2fe)",
        border: `2px solid ${done ? "#22c55e" : "#3b82f6"}`,
      }}
    >
      <style>{`#root .loc-big, #root .loc-big * { font-size: calc(19px * var(--app-fs, 1)) !important; }`}</style>
      <button
        type="button"
        className="loc-big"
        onClick={go}
        disabled={state === "busy"}
        style={{
          width: "100%", minHeight: 64, borderRadius: 13, border: "none", cursor: "pointer",
          fontFamily: "inherit", fontWeight: 1000, color: "#fff", letterSpacing: ".01em",
          background: done ? "linear-gradient(180deg,#22c55e,#16a34a)" : "linear-gradient(180deg,#3b82f6,#1d4ed8)",
          boxShadow: done ? "0 10px 22px rgba(22,163,74,.30)" : "0 10px 22px rgba(29,78,216,.32)",
          opacity: state === "busy" ? 0.75 : 1,
        }}
      >
        {state === "busy" ? t.locating : done ? `✅ ${t.myLocAgain}` : t.myLoc}
      </button>
      {done && (
        <a href={link} target="_blank" rel="noreferrer" style={{ ...st.locLink, display: "block", textAlign: "center", marginTop: 8, color: "#166534" }}>
          {t.locOk} · {value.lat}, {value.lng}{value.accuracy ? ` (±${value.accuracy}m)` : ""}
        </a>
      )}
      {!done && state !== "fail" && (
        <div style={{ textAlign: "center", marginTop: 6, color: "#1e40af", fontWeight: 800 }}>{t.myLocHint}</div>
      )}
      {state === "fail" && <div style={{ textAlign: "center", marginTop: 8, color: "#b91c1c", fontWeight: 800 }}>{t.locFail}</div>}
    </div>
  );
}

/* A time / date the driver cannot type: it comes from the 📍 button (UAE). */
function StampedTime({ value, t, icon = "🕐" }) {
  return (
    <div
      style={{
        ...st.input, display: "flex", alignItems: "center", gap: 8, cursor: "not-allowed",
        background: value ? "#f0fdf4" : "#f8fafc", borderColor: value ? "#86efac" : "#cbd5e1",
        fontWeight: value ? 900 : 700, color: value ? "#166534" : "#64748b",
      }}
    >
      {value ? `${icon} ${value} (UAE)` : t.stampHint}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", minWidth: 0 }}>
      <span className="dt-label" style={st.label}>{label}</span>
      {children}
    </label>
  );
}

function TempInput({ value, onChange, t }) {
  return (
    <div>
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onWheel={(e) => e.currentTarget.blur()}
        style={{ ...st.input, ...(isHigh(value) ? st.inputWarn : null), fontWeight: 900 }}
      />
      {isHigh(value) && <div style={{ color: "#b45309", fontWeight: 800, marginTop: 4 }}>{t.highTemp}</div>}
    </div>
  );
}

/* Loading end: often known only after the trip was started, so it can be set
   (or corrected) on the trip screen while the trip is open. */
function LoadingEndEditor({ start, value, busy, t, onSave, onError }) {
  const [v, setV] = useState(value || nowHHMM());
  const dirty = v !== value;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginTop: 10 }}>
      <div style={{ width: 170 }}>
        <Field label={t.endLoad}>
          <input type="time" value={v} onChange={(e) => setV(e.target.value)} style={st.input} />
        </Field>
      </div>
      <button type="button" onClick={() => setV(nowHHMM())} style={st.btn("ghost")}>🕐</button>
      <button
        type="button"
        disabled={busy || !v || !dirty}
        onClick={() => (start && v < start ? onError(t.endBefore) : onSave(v))}
        style={{ ...st.btn(dirty ? "primary" : "ghost"), opacity: busy || !v || !dirty ? 0.6 : 1 }}
      >
        {value && !dirty ? "✓ " : ""}{t.setEnd}
      </button>
    </div>
  );
}

/* ───────────────────────── one destination ───────────────────────── */

/* Also the trip's END point: same fields minus the transfer note
   (noTransfer), its own save label (saveLabel). */
function StopCard({ stop, open, onToggle, onSave, t, disabled, saveLabel, noTransfer = false }) {
  const [draft, setDraft] = useState(() => ({
    time: stop.arrival?.time || "",
    date: stop.arrival?.date || "",
    temp: stop.arrival?.temp ?? "",
    photos: stop.arrival?.photos || [],
    transferPhotos: stop.arrival?.transferPhotos || [],
    location: stop.arrival?.location || null,
    note: stop.arrival?.note || "",
  }));
  const [err, setErr] = useState("");
  const done = !!stop.arrival;

  const save = () => {
    const miss = [];
    if (!draft.time) miss.push(t.nStamp);
    if (draft.temp === "" || draft.temp == null) miss.push(t.nTemp);
    if (miss.length) { setErr(t.need + miss.join("، ")); return; }
    setErr("");
    // returns were replaced by a photo of the transfer note; a stop saved
    // before that keeps its old `returns` untouched (…stop)
    onSave({
      ...stop,
      arrival: {
        time: draft.time, date: draft.date, temp: draft.temp, photos: draft.photos,
        transferPhotos: draft.transferPhotos, location: draft.location, note: draft.note, savedAt: Date.now(),
      },
    });
  };

  return (
    <div style={st.stop(done)}>
      <button type="button" onClick={onToggle} style={st.stopHead}>
        <span style={st.stopDot(done)}>{done ? "✓" : "•"}</span>
        <span style={{ flex: 1, fontWeight: 900, textAlign: "start" }}>{stop.name}</span>
        <span style={{ fontWeight: 800, color: done ? "#166534" : "#64748b" }}>
          {done ? `${t.arrived} ${stop.arrival.time} · ${stop.arrival.temp}°C` : t.pending}
          {stop.arrival?.transferPhotos?.length ? " · 📄" : ""}
        </span>
        <span style={{ fontWeight: 900 }}>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div style={{ padding: "4px 12px 12px" }}>
          <LocationButton
            value={draft.location}
            onStamp={(time, date) => setDraft((d) => ({ ...d, time, date }))}
            onChange={(location) => setDraft((d) => ({ ...d, location }))}
            t={t}
          />
          <div style={st.grid2}>
            <Field label={`${t.arrival} — ${t.time}`}>
              <StampedTime value={draft.time ? `${draft.time}${draft.date ? ` · ${draft.date}` : ""}` : ""} t={t} />
            </Field>
            <Field label={t.temp}>
              <TempInput value={draft.temp} onChange={(v) => setDraft({ ...draft, temp: v })} t={t} />
            </Field>
          </div>
          <div style={st.block}>
            <span className="dt-label" style={st.label}>{t.photos}</span>
            <PhotoStrip photos={draft.photos} onChange={(photos) => setDraft({ ...draft, photos })} t={t} />
          </div>
          {!noTransfer && (
            <div style={st.transferBox}>
              <span className="dt-label" style={{ ...st.label, color: "#9a3412" }}>📄 {t.transferNote}</span>
              <PhotoStrip
                photos={draft.transferPhotos}
                onChange={(transferPhotos) => setDraft({ ...draft, transferPhotos })}
                t={{ ...t, addPhoto: t.addTransfer }}
              />
            </div>
          )}
          <div style={st.block}>
            <Field label={t.notes}>
              <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} style={st.input} />
            </Field>
          </div>
          {err && <div style={st.err}>{err}</div>}
          <button type="button" className="dt-big" onClick={save} disabled={disabled} style={{ ...st.btn("primary"), width: "100%", minHeight: 56 }}>
            {saveLabel || t.saveStop}
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── page ───────────────────────── */

export default function DriverTrip() {
  const navigate = useNavigate();
  const params = useParams();
  const vehicle = params.vehicle ? decodeURIComponent(params.vehicle) : "";

  const [lang, setLang] = useLangState(() => {
    try { return localStorage.getItem("cars_hub_lang") || "ar"; } catch { return "ar"; }
  });
  const t = T[lang] || T.ar;
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [vehicles, setVehicles] = useState([]);
  const [pickVeh, setPickVeh] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  const [trips, setTrips] = useState([]); // today's trips for this vehicle
  const [trip, setTrip] = useState(null); // the one on screen
  const [openStop, setOpenStop] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { kind, text }
  const [loadedFor, setLoadedFor] = useState(""); // the plate whose trips are loaded
  const [form, setForm] = useState(null); // the new-trip form, while it is open

  const flash = (kind, text, ms = 3500) => {
    setMsg({ kind, text });
    if (ms) setTimeout(() => setMsg((m) => (m && m.text === text ? null : m)), ms);
  };

  /* plates: the same list the loading checklist uses */
  useEffect(() => {
    let alive = true;
    listReports(LOOKUP_VEHICLES_TYPE).catch(() => []).then((v) => {
      if (!alive) return;
      setVehicles([...new Set(v.map((r) => String(payloadOf(r)?.value || "").trim()).filter(Boolean))].sort());
    });
    return () => { alive = false; };
  }, []);

  /* the driver is typed by employee number only; the name comes from the
     Staff Directory (Settings), else the company employee register */
  const { staff } = useStaffDirectory();
  const employeeOf = useCallback((no) => {
    if (!normalizeEmpNo(no)) return null;
    return lookupByEmpNo(staff, no) || lookupByEmpNo(COMPANY_DIRECTORY, no);
  }, [staff]);

  /* today's trips of this truck: resume the open one */
  const loadTrips = useCallback(async () => {
    if (!vehicle) return;
    try {
      const day = todayISO();
      const all = await listTrips({ from: day, to: day });
      const mine = all.filter((x) => normPlate(x.vehicleNo) === normPlate(vehicle));
      setTrips(mine);
      setTrip((cur) => {
        if (cur?.id) return mine.find((x) => x.id === cur.id) || cur;
        return mine.find((x) => x.status !== "closed") || null;
      });
    } catch {
      flash("bad", t.loadErr);
    } finally {
      setLoadedFor(vehicle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle]);

  useEffect(() => {
    setTrip(null); setTrips([]); setForm(null); setLoadedFor("");
    loadTrips();
  }, [loadTrips]);

  const goVehicle = (plate) => {
    const v = String(plate || "").trim();
    if (!v) return;
    const known = vehicles.find((x) => normPlate(x) === normPlate(v));
    navigate(`${DRIVER_PATH}/${encodeURIComponent(known || v)}`);
  };

  const onScanTruck = (text) => {
    setScanOpen(false);
    const v = vehicleFromScan(text);
    if (!v) { flash("bad", t.unknownVeh); return; }
    if (vehicles.length && !vehicles.some((x) => normPlate(x) === normPlate(v))) flash("warn", t.unknownVeh, 5000);
    goVehicle(v);
  };

  /* ── persist the whole trip ── */
  const persist = async (next, okText = t.saved) => {
    setBusy(true);
    try {
      const r = await saveTrip(next);
      const saved = { ...next, id: r.id || next.id || null };
      setTrip(saved);
      const same = (x) => (saved.id && x.id === saved.id) || (saved._outboxId && x._outboxId === saved._outboxId);
      setTrips((list) => {
        const i = list.findIndex(same);
        if (i < 0) return [saved, ...list];
        const n = list.slice();
        n[i] = saved;
        return n;
      });
      flash(r.queued ? "warn" : "ok", r.queued ? queuedMessage(lang) : okText, r.queued ? 6000 : 2500);
      return true;
    } catch (e) {
      flash("bad", e?.message || "Save failed", 6000);
      return false;
    } finally {
      setBusy(false);
    }
  };

  /* ── new trip form ── */
  const startForm = () => {
    setForm({
      driverEmpNo: trips[0]?.driverEmpNo || "",
      reportDate: "", // stamped by 📍 my location (UAE date)
      time: "", // stamped by 📍 my location
      endTime: "",
      temp: "",
      photos: [],
      location: null,
      origin: trips[0]?.end?.name || "", // a truck usually starts where its last trip ended
      dests: [],
      notes: "",
    });
    setTrip(null);
  };
  useEffect(() => {
    if (vehicle && loadedFor === vehicle && !trip && !form) startForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle, loadedFor, trip]);

  const submitForm = async () => {
    const miss = [];
    const emp = employeeOf(form.driverEmpNo);
    if (!emp) miss.push(t.nDriver);
    if (!form.origin) miss.push(t.nOrigin);
    if (!form.time) miss.push(t.nStamp);
    if (form.temp === "") miss.push(t.nTemp);
    if (!form.dests.length) miss.push(t.nDest);
    if (miss.length) { flash("bad", t.need + miss.join("، "), 5000); return; }
    if (form.endTime && form.endTime < form.time) { flash("bad", t.endBefore, 5000); return; }
    const next = {
      _outboxId: uid(),
      reportDate: form.reportDate,
      vehicleNo: vehicle,
      driverEmpNo: emp.empNo,
      driverName: emp.name,
      origin: form.origin,
      loading: { time: form.time, endTime: form.endTime, temp: form.temp, photos: form.photos, location: form.location },
      destinations: form.dests.map(newStop),
      notes: form.notes,
      status: "open",
      createdBy: currentUserName(),
      createdAt: Date.now(),
    };
    if (await persist(next)) {
      setForm(null);
      setOpenStop(next.destinations[0]?.id || null);
    }
  };

  const saveStop = async (stop) => {
    const next = { ...trip, destinations: trip.destinations.map((d) => (d.id === stop.id ? stop : d)) };
    if (await persist(next)) {
      const after = next.destinations.find((d) => !d.arrival);
      setOpenStop(after ? after.id : null);
    }
  };

  const addStop = (name) => {
    const s = newStop(name);
    persist({ ...trip, destinations: [...trip.destinations, s] }).then((ok) => ok && setOpenStop(s.id));
  };

  /* the trip ends AT a branch, recorded like any stop (📍 time/date/location,
     temperature, photos); saving it closes the trip */
  const [ending, setEnding] = useState(false);
  const [endName, setEndName] = useState("");
  const endChoice = endName || trip?.end?.name || "";
  const endStop = trip?.end && trip.end.name === endChoice
    ? trip.end
    : { id: `end-${endChoice}`, name: endChoice, arrival: null };
  // another trip on screen → its own end point, not the last one's choice
  const tripKey = trip?.id || trip?._outboxId || "";
  useEffect(() => { setEnding(false); setEndName(""); }, [tripKey]);
  const saveEnd = async (end) => {
    if (await persist({ ...trip, end, status: "closed", closedAt: Date.now() })) setEnding(false);
  };
  const reopen = () => persist({ ...trip, status: "open" });

  const remainingDests = useMemo(
    () => DESTINATIONS.filter((d) => !(trip?.destinations || []).some((x) => x.name === d)),
    [trip]
  );

  const step = !vehicle ? 0 : trip && !form ? 2 : 1;

  /* ───────── render ───────── */
  return (
    <main dir={dir} className="dt" style={st.shell}>
      <style>{DT_CSS}</style>
      <div style={st.wrap}>
        <header style={st.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={st.brandIcon}>🚚</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="dt-title">{t.title}</div>
              <div className="dt-sub" style={{ color: "#bfdbfe", fontWeight: 600 }}>{t.sub}</div>
            </div>
            {!hideSectionLangToggle() && (
              <button type="button" style={st.headBtn} onClick={() => {
                const n = lang === "ar" ? "en" : "ar";
                setLang(n);
                try { localStorage.setItem("cars_hub_lang", n); } catch {}
              }}>
                {lang === "ar" ? "EN" : "ع"}
              </button>
            )}
            <button type="button" style={st.headBtn} onClick={() => navigate("/cars")}>{t.back}</button>
          </div>

          {/* where the driver is: truck → loading → delivery */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14 }}>
            {[t.step1, t.step2, t.step3].map((label, i) => (
              <React.Fragment key={label}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <span style={st.stepDot(i < step, i === step)}>{i < step ? "✓" : i + 1}</span>
                  <span className="dt-sub" style={{ fontWeight: 800, color: i <= step ? "#fff" : "#93c5fd", whiteSpace: "nowrap" }}>{label}</span>
                </div>
                {i < 2 && <span style={{ flex: 1, height: 3, borderRadius: 3, background: i < step ? "#4ade80" : "rgba(255,255,255,.22)" }} />}
              </React.Fragment>
            ))}
          </div>
        </header>

        {msg && <div style={st.msg(msg.kind)}>{msg.text}</div>}

        {/* ── 1. no vehicle yet ── */}
        {!vehicle && (
          <section style={st.card}>
            <button type="button" onClick={() => setScanOpen(true)} className="dt-big" style={st.bigScan}>
              {t.scanTruck}
            </button>
            <div style={{ textAlign: "center", color: "#64748b", fontWeight: 800, margin: "14px 0 8px" }}>{t.orPick}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={pickVeh} onChange={(e) => setPickVeh(e.target.value)} style={{ ...st.input, flex: 1 }}>
                <option value="">—</option>
                {vehicles.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <button type="button" disabled={!pickVeh} onClick={() => goVehicle(pickVeh)} style={st.btn("primary")}>{t.go}</button>
            </div>
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <button type="button" onClick={() => navigate("/car/driver-qr")} style={st.btn("ghost")}>{t.stickers}</button>
            </div>
          </section>
        )}

        {/* ── vehicle strip ── */}
        {vehicle && (
          <section style={{ ...st.card, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="dt-plate" style={st.plate}>{vehicle}</span>
            {trip && <span style={st.pill(trip.status === "closed" ? "#64748b" : "#16a34a")}>{trip.status === "closed" ? t.ended : t.open}</span>}
            <div style={{ flex: 1 }} />
            <button type="button" onClick={() => setScanOpen(true)} style={st.btn("ghost")}>📷</button>
            <button type="button" onClick={() => navigate(DRIVER_PATH)} style={st.btn("ghost")}>{t.change}</button>
          </section>
        )}

        {vehicle && loadedFor !== vehicle &&<div style={{ textAlign: "center", padding: 20 }}>…</div>}

        {/* ── 2. loading form ── */}
        {vehicle && form && (
          <section style={st.card}>
            <div className="dt-band" style={st.band}><span style={st.bandIcon("#0ea5e9")}>🧊</span>{t.loading}</div>
            <LocationButton
              value={form.location}
              onStamp={(time, reportDate) => setForm((f) => ({ ...f, time, reportDate }))}
              onChange={(location) => setForm((f) => ({ ...f, location }))}
              t={t}
            />
            <div style={st.block}>
              <Field label={t.origin}>
                <select
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value })}
                  style={{ ...st.input, fontWeight: 900, ...(form.origin ? { borderColor: "#86efac", background: "#f0fdf4" } : null) }}
                >
                  <option value="">{t.pickBranch}</option>
                  {DESTINATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
            </div>
            <div style={st.grid2}>
              <Field label={t.empNo}>
                <input
                  inputMode="numeric"
                  value={form.driverEmpNo}
                  onChange={(e) => setForm({ ...form, driverEmpNo: e.target.value })}
                  style={{ ...st.input, fontWeight: 900 }}
                />
              </Field>
              <Field label={t.driver}>
                {(() => {
                  const emp = employeeOf(form.driverEmpNo);
                  const typed = !!normalizeEmpNo(form.driverEmpNo);
                  /* a box, not an <input>: a long name wraps instead of being cut */
                  return (
                    <div
                      aria-readonly="true"
                      style={{
                        ...st.input, height: "auto", display: "flex", alignItems: "center", gap: 8,
                        whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.35, cursor: "not-allowed",
                        background: emp ? "#f0fdf4" : "#f1f5f9", borderColor: emp ? "#86efac" : typed ? "#fecaca" : "#cbd5e1",
                        fontWeight: 800, color: emp ? "#14532d" : "#b91c1c",
                      }}
                    >
                      {emp ? <>🔒 {emp.name}</> : typed ? t.noEmp : <span style={{ color: "#94a3b8", fontWeight: 600 }}>—</span>}
                    </div>
                  );
                })()}
              </Field>
              <Field label={t.date}>
                <StampedTime value={form.reportDate} t={t} icon="📅" />
              </Field>
              <Field label={t.startLoad}>
                <StampedTime value={form.time} t={t} />
              </Field>
              <Field label={t.endLoad}>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} style={st.input} />
                  <button type="button" onClick={() => setForm({ ...form, endTime: nowHHMM() })} style={{ ...st.btn("ghost"), padding: "0 10px" }}>🕐</button>
                </div>
              </Field>
              <Field label={t.temp}>
                <TempInput value={form.temp} onChange={(v) => setForm({ ...form, temp: v })} t={t} />
              </Field>
            </div>

            <div style={st.block}>
              <span className="dt-label" style={st.label}>{t.photos}</span>
              <PhotoStrip photos={form.photos} onChange={(photos) => setForm({ ...form, photos })} t={t} />
            </div>

            <div style={st.block}>
              <span className="dt-label" style={st.label}>{t.dests}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {DESTINATIONS.map((d) => {
                  const on = form.dests.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm({ ...form, dests: on ? form.dests.filter((x) => x !== d) : [...form.dests, d] })}
                      style={st.chip(on)}
                    >
                      {on ? "✓ " : ""}{d}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={st.block}>
              <Field label={t.notes}>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={st.input} />
              </Field>
            </div>

            {/* stays in reach however long the form gets */}
            <div style={st.saveBar}>
              <button type="button" className="dt-big" disabled={busy} onClick={submitForm} style={{ ...st.btn("primary"), width: "100%", minHeight: 60 }}>
                {busy ? t.saving : t.startTrip}
              </button>
            </div>
          </section>
        )}

        {/* ── 3. the trip ── */}
        {vehicle && trip && !form && (
          <>
            <section style={st.card}>
              <div className="dt-band" style={st.band}><span style={st.bandIcon("#0ea5e9")}>🧊</span>{t.loading}</div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontWeight: 800 }}>
                {trip.origin && <span style={{ color: "#1d4ed8" }}>🚩 {t.from}: {trip.origin}</span>}
                <span>👤 {trip.driverEmpNo ? `${trip.driverEmpNo} · ` : ""}{trip.driverName}</span>
                <span>📅 {trip.reportDate}</span>
                <span>🕐 {trip.loading?.time}{trip.loading?.endTime ? ` → ${trip.loading.endTime}` : ""}</span>
                <span style={{ color: isHigh(trip.loading?.temp) ? "#b45309" : "#0369a1" }}>🌡 {trip.loading?.temp}°C</span>
                {trip.loading?.location && (
                  <a href={mapsLink(trip.loading.location)} target="_blank" rel="noreferrer" style={st.locLink}>📍</a>
                )}
              </div>
              {trip.status !== "closed" && (
                <LoadingEndEditor
                  key={trip.id || trip._outboxId}
                  start={trip.loading?.time}
                  value={trip.loading?.endTime || ""}
                  busy={busy}
                  t={t}
                  onError={(m) => flash("bad", m, 5000)}
                  onSave={(endTime) => persist({ ...trip, loading: { ...(trip.loading || {}), endTime } })}
                />
              )}
              {trip.loading?.photos?.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {trip.loading.photos.map((p) => (
                    <a key={p} href={p} target="_blank" rel="noreferrer">
                      <img src={p.startsWith("http") ? thumbUrl(p, 120) : p} alt="" style={{ ...st.thumb, width: 56, height: 56 }} />
                    </a>
                  ))}
                </div>
              )}
            </section>

            <section style={st.card}>
              <div className="dt-band" style={st.band}><span style={st.bandIcon("#16a34a")}>📍</span>{t.stops}</div>
              {trip.destinations.map((d) => (
                <StopCard
                  key={d.id + (d.arrival?.savedAt || "")}
                  stop={d}
                  open={openStop === d.id}
                  onToggle={() => setOpenStop(openStop === d.id ? null : d.id)}
                  onSave={saveStop}
                  t={t}
                  disabled={busy || trip.status === "closed"}
                />
              ))}

              {trip.status !== "closed" && remainingDests.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <select
                    value=""
                    onChange={(e) => e.target.value && addStop(e.target.value)}
                    style={{ ...st.input, borderStyle: "dashed" }}
                    disabled={busy}
                  >
                    <option value="">{t.addStop}</option>
                    {remainingDests.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
            </section>

            {/* ── end point: a branch, recorded like a stop ── */}
            {(ending || trip.end) && (
              <section style={st.card}>
                <div className="dt-band" style={st.band}><span style={st.bandIcon("#0f172a")}>🏁</span>{t.endPoint}</div>
                {trip.status !== "closed" && (
                  <div style={st.block}>
                    <Field label={t.endBranch}>
                      <select
                        value={endChoice}
                        onChange={(e) => { setEndName(e.target.value); setEnding(true); }}
                        style={{ ...st.input, fontWeight: 900, ...(endChoice ? { borderColor: "#86efac", background: "#f0fdf4" } : null) }}
                      >
                        <option value="">{t.pickBranch}</option>
                        {DESTINATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </Field>
                  </div>
                )}
                {endChoice && (
                  <StopCard
                    key={endStop.id + (endStop.arrival?.savedAt || "")}
                    stop={endStop}
                    open={trip.status !== "closed"}
                    onToggle={() => {}}
                    onSave={saveEnd}
                    t={t}
                    saveLabel={t.saveEnd}
                    noTransfer
                    disabled={busy || trip.status === "closed"}
                  />
                )}
              </section>
            )}

            <section style={{ ...st.card, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {trip.status === "closed" ? (
                <button type="button" disabled={busy} onClick={reopen} style={st.btn("ghost")}>{t.reopen}</button>
              ) : ending ? (
                <button type="button" disabled={busy} onClick={() => setEnding(false)} style={st.btn("ghost")}>{t.cancel}</button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEnding(true)}
                  style={st.btn("dark")}
                >
                  {t.endTrip}
                </button>
              )}
              <button type="button" disabled={busy} onClick={startForm} style={st.btn("ghost")}>{t.newTrip}</button>
            </section>
          </>
        )}

        {/* ── today's trips for the truck ── */}
        {vehicle && trips.length > 1 && (
          <section style={st.card}>
            <div style={{ ...st.label, marginBottom: 8 }}>{t.otherTrips}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {trips.map((x, i) => (
                <button
                  key={x.id || x._outboxId || i}
                  type="button"
                  onClick={() => { setForm(null); setTrip(x); setOpenStop(null); }}
                  style={st.chip(trip && (x.id ? x.id === trip.id : x._outboxId === trip._outboxId))}
                >
                  {t.tripOf} {trips.length - i} · {x.loading?.time} · {x.status === "closed" ? "🏁" : "🟢"}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <BarcodeScanner open={scanOpen} lang={lang} onResult={onScanTruck} onClose={() => setScanOpen(false)} />
    </main>
  );
}

/* ───────────────────────── styles ─────────────────────────
   Type scale: everything under #root is forced to 14px !important
   (globals.css); these more specific rules win and keep following the
   Aa text-size slider (--app-fs). */
const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const DT_CSS = `
#root .dt, #root .dt * { font-size: ${fs(16)}; }
#root .dt .dt-title { font-size: ${fs(21)}; font-weight: 900; color: #fff; letter-spacing: -.01em; }
#root .dt .dt-sub { font-size: ${fs(13)}; }
#root .dt .dt-band, #root .dt .dt-band * { font-size: ${fs(17)}; }
#root .dt .dt-label { font-size: ${fs(13)}; }
#root .dt .dt-plate { font-size: ${fs(24)}; }
#root .dt .dt-big, #root .dt .dt-big * { font-size: ${fs(19)}; }
.dt input:focus, .dt select:focus {
  outline: none; border-color: #2563eb !important; box-shadow: 0 0 0 4px rgba(37,99,235,.14);
}
.dt button { transition: transform .08s ease, filter .15s ease, box-shadow .15s ease; }
.dt button:active:not(:disabled) { transform: scale(.98); }
.dt button:disabled { opacity: .55; cursor: not-allowed; }
`;

const st = {
  shell: {
    minHeight: "100vh",
    background: "radial-gradient(120% 60% at 50% 0%, #e0ecff 0%, #f4f7fb 55%, #f4f7fb 100%)",
    fontFamily: 'Cairo, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial',
    color: "#0f172a",
    padding: "12px 12px 48px",
  },
  wrap: { maxWidth: 720, margin: "0 auto" },
  header: {
    padding: "16px 16px 14px", marginBottom: 14, borderRadius: 22, color: "#fff",
    background: "linear-gradient(135deg,#0b1f3a 0%,#1e3a8a 60%,#2563eb 100%)",
    boxShadow: "0 18px 36px rgba(30,58,138,.28)",
  },
  headBtn: {
    minHeight: 40, padding: "6px 12px", borderRadius: 11, cursor: "pointer", fontWeight: 900, fontFamily: "inherit",
    background: "rgba(255,255,255,.12)", color: "#fff", border: "1px solid rgba(255,255,255,.28)",
  },
  stepDot: (done, now) => ({
    width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", fontWeight: 900, flexShrink: 0,
    background: done ? "#22c55e" : now ? "#fff" : "rgba(255,255,255,.14)",
    color: done ? "#fff" : now ? "#1e3a8a" : "#93c5fd",
    boxShadow: now ? "0 0 0 4px rgba(255,255,255,.22)" : "none",
  }),
  brandIcon: {
    width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center", fontSize: 24,
    background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.25)", color: "#fff", flexShrink: 0,
  },
  card: {
    background: "#fff", border: "1px solid #e6ebf2", borderRadius: 20, padding: 16, marginBottom: 14,
    boxShadow: "0 1px 2px rgba(15,23,42,.04), 0 12px 28px rgba(15,23,42,.06)",
  },
  band: {
    display: "flex", alignItems: "center", gap: 10, fontWeight: 900, color: "#0f172a",
    padding: "0 2px 12px", marginBottom: 14, borderBottom: "1px solid #eef2f7",
  },
  bandIcon: (c) => ({
    width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", flexShrink: 0,
    background: `${c}18`, border: `1px solid ${c}40`,
  }),
  label: { display: "block", fontWeight: 800, color: "#475569", marginBottom: 6, letterSpacing: ".01em" },
  input: {
    width: "100%", minHeight: 52, padding: "11px 14px", border: "1.5px solid #d6dee8", borderRadius: 14,
    background: "#fbfcfe", color: "#0f172a", boxSizing: "border-box", fontFamily: "inherit",
  },
  inputWarn: { borderColor: "#f59e0b", background: "#fffbeb" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12, marginBottom: 14 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8, marginBottom: 8 },
  block: { marginBottom: 16 },
  bigScan: {
    width: "100%", padding: "30px 14px", borderRadius: 20, border: "none", cursor: "pointer",
    background: "linear-gradient(135deg,#2563eb,#1e3a8a)", color: "#fff", fontWeight: 1000,
    boxShadow: "0 18px 34px rgba(37,99,235,.30)", fontFamily: "inherit",
  },
  plate: {
    fontWeight: 1000, letterSpacing: ".06em", padding: "4px 16px", borderRadius: 10,
    background: "linear-gradient(180deg,#fffbea,#fef3c7)", border: "2.5px solid #0f172a",
    boxShadow: "inset 0 -2px 0 rgba(15,23,42,.08)",
  },
  pill: (c) => ({ padding: "5px 12px", borderRadius: 999, background: `${c}14`, color: c, fontWeight: 900, border: `1px solid ${c}44` }),
  chip: (on) => ({
    padding: "11px 16px", borderRadius: 14, cursor: "pointer", fontWeight: 800, fontFamily: "inherit",
    border: on ? "1.5px solid #2563eb" : "1.5px solid #d6dee8",
    background: on ? "linear-gradient(180deg,#3b82f6,#2563eb)" : "#fff",
    color: on ? "#fff" : "#334155",
    boxShadow: on ? "0 6px 14px rgba(37,99,235,.25)" : "none",
  }),
  btn: (kind) => {
    const k = {
      primary: { background: "linear-gradient(180deg,#22c55e,#15803d)", color: "#fff", border: "1px solid #15803d", boxShadow: "0 10px 22px rgba(21,128,61,.25)" },
      ghost: { background: "#fff", color: "#0f172a", border: "1.5px solid #d6dee8" },
      okGhost: { background: "#f0fdf4", color: "#166534", border: "1.5px solid #86efac" },
      warn: { background: "#fff7ed", color: "#9a3412", border: "1.5px dashed #fdba74" },
      danger: { background: "#fef2f2", color: "#b91c1c", border: "1.5px solid #fecaca" },
      dark: { background: "linear-gradient(180deg,#1e293b,#0f172a)", color: "#fff", border: "1px solid #0f172a" },
    }[kind] || {};
    return {
      minHeight: 48, padding: "8px 16px", borderRadius: 14, cursor: "pointer", fontWeight: 900,
      fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, ...k,
    };
  },
  saveBar: {
    position: "sticky", bottom: 10, zIndex: 20, marginTop: 6, padding: 8, borderRadius: 20,
    background: "rgba(255,255,255,.88)", backdropFilter: "blur(8px)", border: "1px solid #e6ebf2",
    boxShadow: "0 -8px 24px rgba(15,23,42,.08)",
  },
  thumb: { width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid #e2e8f0", display: "block" },
  thumbX: {
    position: "absolute", top: -6, insetInlineEnd: -6, width: 24, height: 24, borderRadius: 999, border: "none",
    background: "#ef4444", color: "#fff", fontWeight: 900, cursor: "pointer", lineHeight: "24px", padding: 0,
  },
  locLink: { color: "#0369a1", fontWeight: 800, textDecoration: "none" },
  stop: (done) => ({
    border: `1.5px solid ${done ? "#86efac" : "#e2e8f0"}`, borderRadius: 14, marginBottom: 10,
    background: done ? "#f0fdf4" : "#fff", overflow: "hidden",
  }),
  stopHead: {
    width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px", background: "transparent",
    border: "none", cursor: "pointer", fontFamily: "inherit", color: "#0f172a", flexWrap: "wrap",
  },
  stopDot: (done) => ({
    width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center", fontWeight: 900,
    background: done ? "#16a34a" : "#e2e8f0", color: done ? "#fff" : "#64748b", flexShrink: 0,
  }),
  transferBox: { background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 16, padding: 12, marginBottom: 16 },
  returnRow: { background: "#fff", border: "1px solid #fde2c4", borderRadius: 10, padding: 10, marginBottom: 8 },
  err: { color: "#b91c1c", fontWeight: 800, margin: "6px 0 10px" },
  msg: (kind) => ({
    position: "sticky", top: 8, zIndex: 50, padding: "10px 14px", borderRadius: 12, marginBottom: 12, fontWeight: 800,
    background: kind === "ok" ? "#dcfce7" : kind === "warn" ? "#fef3c7" : "#fee2e2",
    color: kind === "ok" ? "#166534" : kind === "warn" ? "#92400e" : "#991b1b",
    border: `1px solid ${kind === "ok" ? "#86efac" : kind === "warn" ? "#fcd34d" : "#fecaca"}`,
  }),
};
