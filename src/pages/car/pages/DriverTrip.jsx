// src/pages/car/pages/DriverTrip.jsx
//
// 🚚 The driver's phone page.
//
//   1. Scan the QR sticker on the truck (or pick the plate) → /car/driver/<plate>
//   2. Loading: time, truck temperature, photos of the thermometer, one or more
//      destinations, and "📍 my location".
//   3. At every destination: arrival time + temperature + photo + location,
//      and the products the branch hands back (returns).
//
// One record per trip (DRIVER_TRIP_TYPE). The loading reports page shows the
// trips beside the outbound checklist; /car/driver-returns lists the returns.
// Opening the same truck again the same day resumes its open trip.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BarcodeScanner from "../../../components/BarcodeScanner";
import { uploadImage, thumbUrl } from "../../../utils/imageUpload";
import { keepPhotoOrUpload } from "../../../utils/offlineOutbox";
import { queuedMessage } from "../../../utils/reportOutbox";
import { useLangState, hideSectionLangToggle } from "../../../utils/appLang";
import { parseBarcode } from "../../../utils/gs1Barcode";
import { fetchBarcodeMap, findBarcode } from "../../../utils/barcodeMap";
import { listReports, payloadOf } from "../../monitor/branches/_shared/reportApi";
import { loadCatalog } from "../../coldrooms/coldRoomsStock";
import {
  COMPANY_DIRECTORY, lookupByEmpNo, normalizeEmpNo, useStaffDirectory,
} from "../../monitor/branches/_shared/staffRegistry";
import {
  DESTINATIONS, DRIVER_PATH, LOOKUP_VEHICLES_TYPE,
  RETURN_REASONS, mapsLink, vehicleFromScan,
} from "../carConstants";
import {
  currentUserName, listTrips, locateMe, normPlate, nowHHMM, saveTrip, todayISO, uid,
} from "../driverTripApi";

const T = {
  ar: {
    title: "رحلة السائق", sub: "امسح باركود السيارة وسجّل الحرارة عند التحميل وعند كل وصول",
    scanTruck: "📷 امسح باركود السيارة", orPick: "أو اختر رقم السيارة", go: "متابعة", vehicle: "السيارة",
    change: "تغيير السيارة", stickers: "🏷️ ملصقات QR للسيارات", back: "رجوع",
    loading: "التحميل", driver: "اسم السائق", date: "التاريخ", time: "الوقت", temp: "حرارة السيارة °C",
    stampHint: "يُسجَّل تلقائياً عند الضغط على 📍 تحديد موقعي", nStamp: "اضغط 📍 تحديد موقعي لتسجيل الوقت",
    startLoad: "بداية التحميل", endLoad: "انتهاء التحميل", setEnd: "حفظ وقت الانتهاء", endBefore: "وقت الانتهاء قبل وقت البداية",
    photos: "صور الحرارة", addPhoto: "📸 صورة", uploading: "عم يرفع…", dests: "إلى أين؟ (يمكن اختيار أكثر من وجهة)",
    myLoc: "📍 تحديد موقعي", locating: "عم يحدد الموقع…", locOk: "✅ تم تحديد الموقع", locFail: "تعذّر تحديد الموقع — اسمح للموقع من إعدادات المتصفح",
    notes: "ملاحظات", startTrip: "🚚 حفظ وبدء الرحلة", saving: "عم يحفظ…", saved: "✅ تم الحفظ",
    empNo: "الرقم الوظيفي للسائق", noEmp: "رقم غير موجود بقائمة الموظفين",
    need: "أكمل: ", nDriver: "رقم وظيفي صحيح", nTime: "الوقت", nTemp: "الحرارة", nDest: "وجهة واحدة على الأقل",
    stops: "الوجهات", arrived: "وصل", pending: "لم يصل بعد", arrival: "الوصول", saveStop: "💾 حفظ الوصول",
    returns: "المرتجعات من الفرع", addReturn: "+ إضافة منتج مرتجع", code: "كود المنتج", product: "اسم المنتج",
    qty: "الكمية", uom: "الوحدة", reason: "السبب", remark: "ملاحظة", scanItem: "📷", noReturns: "لا يوجد مرتجعات",
    remove: "حذف", addStop: "+ إضافة وجهة", endTrip: "🏁 إنهاء الرحلة", ended: "الرحلة منتهية",
    reopen: "إعادة فتح", newTrip: "+ رحلة جديدة", otherTrips: "رحلات اليوم لهذه السيارة", open: "مفتوحة",
    highTemp: "⚠ الحرارة أعلى من 5°C", notProduct: "الباركود غير معروف — اكتب الكود أو الاسم يدوياً",
    retNeed: "كل منتج مرتجع يحتاج اسم وكمية", loadErr: "تعذّر تحميل البيانات من السيرفر",
    unknownVeh: "السيارة غير موجودة في القائمة — تأكد من الرقم", tripOf: "رحلة",
  },
  en: {
    title: "Driver Trip", sub: "Scan the truck, record the temperature at loading and at every arrival",
    scanTruck: "📷 Scan truck barcode", orPick: "or pick the vehicle", go: "Continue", vehicle: "Vehicle",
    change: "Change vehicle", stickers: "🏷️ Truck QR stickers", back: "Back",
    loading: "Loading", driver: "Driver name", date: "Date", time: "Time", temp: "Truck temp °C",
    stampHint: "Set automatically by 📍 My location", nStamp: "press 📍 My location to record the time",
    startLoad: "Loading start", endLoad: "Loading end", setEnd: "Save end time", endBefore: "End time is before the start time",
    photos: "Temperature photos", addPhoto: "📸 Photo", uploading: "Uploading…", dests: "Where to? (one or more)",
    myLoc: "📍 My location", locating: "Locating…", locOk: "✅ Location set", locFail: "Could not get the location — allow it in the browser settings",
    notes: "Notes", startTrip: "🚚 Save & start trip", saving: "Saving…", saved: "✅ Saved",
    empNo: "Driver employee no.", noEmp: "Not in the employee list",
    need: "Complete: ", nDriver: "a valid employee no.", nTime: "time", nTemp: "temperature", nDest: "at least one destination",
    stops: "Destinations", arrived: "Arrived", pending: "Not arrived yet", arrival: "Arrival", saveStop: "💾 Save arrival",
    returns: "Returns from the branch", addReturn: "+ Add returned product", code: "Item code", product: "Product",
    qty: "Qty", uom: "Unit", reason: "Reason", remark: "Remark", scanItem: "📷", noReturns: "No returns",
    remove: "Remove", addStop: "+ Add destination", endTrip: "🏁 End trip", ended: "Trip ended",
    reopen: "Reopen", newTrip: "+ New trip", otherTrips: "Today's trips for this vehicle", open: "open",
    highTemp: "⚠ Above 5°C", notProduct: "Unknown barcode — type the code or name",
    retNeed: "Every returned product needs a name and a quantity", loadErr: "Could not load from the server",
    unknownVeh: "This vehicle is not in the list — check the number", tripOf: "Trip",
  },
};

const UOMS = ["KG", "PCS", "CTN", "BOX", "PKT"];

const newReturn = () => ({ id: uid(), code: "", name: "", qty: "", uom: "KG", reason: "expired", remark: "" });
const newStop = (name) => ({ id: uid(), name, arrival: null, returns: [] });

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
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={go} disabled={state === "busy"} style={st.btn(value ? "okGhost" : "ghost")}>
        {state === "busy" ? t.locating : t.myLoc}
      </button>
      {value && (
        <a href={link} target="_blank" rel="noreferrer" style={st.locLink}>
          {t.locOk} · {value.lat}, {value.lng}{value.accuracy ? ` (±${value.accuracy}m)` : ""}
        </a>
      )}
      {state === "fail" && <span style={{ color: "#b91c1c", fontWeight: 700 }}>{t.locFail}</span>}
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
      <span style={st.label}>{label}</span>
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

/* ───────────────────────── returns ───────────────────────── */

function ReturnsEditor({ rows, onChange, t, lang, resolveScan }) {
  const [scanFor, setScanFor] = useState(null);
  const [note, setNote] = useState("");
  const set = (i, k, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  const onScan = async (text) => {
    const i = scanFor;
    setScanFor(null);
    const hit = await resolveScan(text);
    if (!hit) { setNote(t.notProduct); return; }
    setNote("");
    onChange(rows.map((r, j) => (j === i ? { ...r, code: hit.code, name: hit.name || r.name, uom: hit.uom || r.uom, ...(hit.qty ? { qty: String(hit.qty) } : {}) } : r)));
  };

  const onCodeBlur = async (i) => {
    const r = rows[i];
    if (!r.code || r.name) return;
    const hit = await resolveScan(r.code);
    if (hit) onChange(rows.map((x, j) => (j === i ? { ...x, name: hit.name, uom: hit.uom || x.uom } : x)));
  };

  return (
    <div style={st.returnsBox}>
      <div style={{ ...st.label, fontSize: 14, color: "#9a3412" }}>↩️ {t.returns}</div>
      {rows.length === 0 && <div style={{ color: "#64748b", marginBottom: 8 }}>{t.noReturns}</div>}
      {rows.map((r, i) => (
        <div key={r.id} style={st.returnRow}>
          <div style={st.grid2}>
            <Field label={t.code}>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={r.code} onChange={(e) => set(i, "code", e.target.value)} onBlur={() => onCodeBlur(i)} style={st.input} />
                <button type="button" onClick={() => setScanFor(i)} style={{ ...st.btn("ghost"), padding: "0 12px" }}>{t.scanItem}</button>
              </div>
            </Field>
            <Field label={t.product}>
              <input value={r.name} onChange={(e) => set(i, "name", e.target.value)} style={st.input} />
            </Field>
          </div>
          <div style={st.grid3}>
            <Field label={t.qty}>
              <input type="number" inputMode="decimal" step="0.01" value={r.qty} onChange={(e) => set(i, "qty", e.target.value)} onWheel={(e) => e.currentTarget.blur()} style={st.input} />
            </Field>
            <Field label={t.uom}>
              <select value={r.uom} onChange={(e) => set(i, "uom", e.target.value)} style={st.input}>
                {[...new Set([r.uom, ...UOMS].filter(Boolean))].map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label={t.reason}>
              <select value={r.reason} onChange={(e) => set(i, "reason", e.target.value)} style={st.input}>
                {RETURN_REASONS.map((x) => <option key={x.id} value={x.id}>{x[lang] || x.en}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <Field label={t.remark}>
                <input value={r.remark} onChange={(e) => set(i, "remark", e.target.value)} style={st.input} />
              </Field>
            </div>
            <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} style={st.btn("danger")}>
              {t.remove}
            </button>
          </div>
        </div>
      ))}
      {note && <div style={{ color: "#b91c1c", fontWeight: 700, margin: "6px 0" }}>{note}</div>}
      <button type="button" onClick={() => onChange([...rows, newReturn()])} style={{ ...st.btn("warn"), width: "100%" }}>
        {t.addReturn}
      </button>
      <BarcodeScanner open={scanFor != null} lang={lang} onResult={onScan} onClose={() => setScanFor(null)} />
    </div>
  );
}

/* ───────────────────────── one destination ───────────────────────── */

function StopCard({ stop, open, onToggle, onSave, t, lang, resolveScan, disabled }) {
  const [draft, setDraft] = useState(() => ({
    time: stop.arrival?.time || "",
    date: stop.arrival?.date || "",
    temp: stop.arrival?.temp ?? "",
    photos: stop.arrival?.photos || [],
    location: stop.arrival?.location || null,
    note: stop.arrival?.note || "",
    returns: stop.returns || [],
  }));
  const [err, setErr] = useState("");
  const done = !!stop.arrival;

  const save = () => {
    const miss = [];
    if (!draft.time) miss.push(t.nStamp);
    if (draft.temp === "" || draft.temp == null) miss.push(t.nTemp);
    if (miss.length) { setErr(t.need + miss.join("، ")); return; }
    const returns = draft.returns.filter((r) => r.code || r.name || r.qty);
    if (returns.some((r) => !(r.name || r.code) || !(Number(r.qty) > 0))) { setErr(t.retNeed); return; }
    setErr("");
    onSave({
      ...stop,
      arrival: { time: draft.time, date: draft.date, temp: draft.temp, photos: draft.photos, location: draft.location, note: draft.note, savedAt: Date.now() },
      returns,
    });
  };

  return (
    <div style={st.stop(done)}>
      <button type="button" onClick={onToggle} style={st.stopHead}>
        <span style={st.stopDot(done)}>{done ? "✓" : "•"}</span>
        <span style={{ flex: 1, fontWeight: 900, textAlign: "start" }}>{stop.name}</span>
        <span style={{ fontWeight: 800, color: done ? "#166534" : "#64748b" }}>
          {done ? `${t.arrived} ${stop.arrival.time} · ${stop.arrival.temp}°C` : t.pending}
          {stop.returns?.length ? ` · ↩️ ${stop.returns.length}` : ""}
        </span>
        <span style={{ fontWeight: 900 }}>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div style={{ padding: "4px 12px 12px" }}>
          <div style={st.grid2}>
            <Field label={`${t.arrival} — ${t.time}`}>
              <StampedTime value={draft.time ? `${draft.time}${draft.date ? ` · ${draft.date}` : ""}` : ""} t={t} />
            </Field>
            <Field label={t.temp}>
              <TempInput value={draft.temp} onChange={(v) => setDraft({ ...draft, temp: v })} t={t} />
            </Field>
          </div>
          <div style={st.block}>
            <span style={st.label}>{t.photos}</span>
            <PhotoStrip photos={draft.photos} onChange={(photos) => setDraft({ ...draft, photos })} t={t} />
          </div>
          <div style={st.block}>
            <LocationButton
              value={draft.location}
              onStamp={(time, date) => setDraft((d) => ({ ...d, time, date }))}
              onChange={(location) => setDraft((d) => ({ ...d, location }))}
              t={t}
            />
          </div>
          <ReturnsEditor
            rows={draft.returns}
            onChange={(returns) => setDraft({ ...draft, returns })}
            t={t}
            lang={lang}
            resolveScan={resolveScan}
          />
          <div style={st.block}>
            <Field label={t.notes}>
              <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} style={st.input} />
            </Field>
          </div>
          {err && <div style={st.err}>{err}</div>}
          <button type="button" onClick={save} disabled={disabled} style={{ ...st.btn("primary"), width: "100%", padding: 14 }}>
            {t.saveStop}
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

  /* product lookup for returns: our labels (item code in GS1 240), catalogue
     barcodes (barcode_map), or a typed item code */
  const resolveScan = useCallback(async (text) => {
    const cat = await loadCatalog();
    const byCode = (code) => {
      const c = cat.get(String(code || "").trim());
      return c ? { code: String(code).trim(), name: c.product, uom: c.uom } : null;
    };
    const r = parseBarcode(text);
    if (r.itemCode) return { ...(byCode(r.itemCode) || { code: r.itemCode, name: "" }), qty: r.weightKg || "" };
    const map = await fetchBarcodeMap();
    const hit = findBarcode(map, r.gtin || text).hit;
    if (hit?.code) return { ...(byCode(hit.code) || { code: hit.code, name: hit.product || "" }), qty: r.weightKg || "" };
    return byCode(text);
  }, []);

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

  const setStatus = (status) => persist({ ...trip, status, ...(status === "closed" ? { closedAt: Date.now() } : {}) });

  const remainingDests = useMemo(
    () => DESTINATIONS.filter((d) => !(trip?.destinations || []).some((x) => x.name === d)),
    [trip]
  );

  /* ───────── render ───────── */
  return (
    <main dir={dir} style={st.shell}>
      <div style={st.wrap}>
        <header style={st.header}>
          <div style={st.brandIcon}>🚚</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 1000, fontSize: 17 }}>{t.title}</div>
            <div style={{ color: "#64748b", fontWeight: 700, fontSize: 12 }}>{t.sub}</div>
          </div>
          {!hideSectionLangToggle() && (
            <button type="button" style={st.btn("ghost")} onClick={() => {
              const n = lang === "ar" ? "en" : "ar";
              setLang(n);
              try { localStorage.setItem("cars_hub_lang", n); } catch {}
            }}>
              {lang === "ar" ? "EN" : "ع"}
            </button>
          )}
          <button type="button" style={st.btn("ghost")} onClick={() => navigate("/cars")}>{t.back}</button>
        </header>

        {msg && <div style={st.msg(msg.kind)}>{msg.text}</div>}

        {/* ── 1. no vehicle yet ── */}
        {!vehicle && (
          <section style={st.card}>
            <button type="button" onClick={() => setScanOpen(true)} style={st.bigScan}>
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
            <span style={st.plate}>{vehicle}</span>
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
            <div style={st.band}>🧊 {t.loading}</div>
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
                  return (
                    <input
                      readOnly
                      tabIndex={-1}
                      value={emp ? emp.name : typed ? t.noEmp : ""}
                      style={{
                        ...st.input, background: "#f1f5f9", fontWeight: 800, cursor: "not-allowed",
                        color: emp ? "#0f172a" : "#b91c1c",
                      }}
                    />
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
              <span style={st.label}>{t.photos}</span>
              <PhotoStrip photos={form.photos} onChange={(photos) => setForm({ ...form, photos })} t={t} />
            </div>

            <div style={st.block}>
              <span style={st.label}>{t.dests}</span>
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
              <LocationButton
                value={form.location}
                onStamp={(time, reportDate) => setForm((f) => ({ ...f, time, reportDate }))}
                onChange={(location) => setForm((f) => ({ ...f, location }))}
                t={t}
              />
            </div>

            <div style={st.block}>
              <Field label={t.notes}>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={st.input} />
              </Field>
            </div>

            <button type="button" disabled={busy} onClick={submitForm} style={{ ...st.btn("primary"), width: "100%", padding: 15, fontSize: 16 }}>
              {busy ? t.saving : t.startTrip}
            </button>
          </section>
        )}

        {/* ── 3. the trip ── */}
        {vehicle && trip && !form && (
          <>
            <section style={st.card}>
              <div style={st.band}>🧊 {t.loading}</div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontWeight: 800 }}>
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
              <div style={st.band}>📍 {t.stops}</div>
              {trip.destinations.map((d) => (
                <StopCard
                  key={d.id + (d.arrival?.savedAt || "")}
                  stop={d}
                  open={openStop === d.id}
                  onToggle={() => setOpenStop(openStop === d.id ? null : d.id)}
                  onSave={saveStop}
                  t={t}
                  lang={lang}
                  resolveScan={resolveScan}
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

            <section style={{ ...st.card, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {trip.status === "closed" ? (
                <button type="button" disabled={busy} onClick={() => setStatus("open")} style={st.btn("ghost")}>{t.reopen}</button>
              ) : (
                <button type="button" disabled={busy} onClick={() => setStatus("closed")} style={st.btn("dark")}>{t.endTrip}</button>
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

/* ───────────────────────── styles (Soft Sky) ───────────────────────── */
const st = {
  shell: {
    minHeight: "100vh",
    background: "linear-gradient(180deg,#f0f9ff 0%,#eef2ff 100%)",
    fontFamily: 'Cairo, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial',
    color: "#0f172a",
    padding: "12px 12px 40px",
  },
  wrap: { maxWidth: 760, margin: "0 auto" },
  header: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 12,
    background: "rgba(255,255,255,.9)", border: "1px solid #e2e8f0", borderRadius: 16,
    boxShadow: "0 10px 26px rgba(2,132,199,.08)",
  },
  brandIcon: {
    width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", fontSize: 22,
    background: "linear-gradient(135deg,#0ea5e9,#2563eb)", color: "#fff", flexShrink: 0,
  },
  card: {
    background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14, marginBottom: 12,
    boxShadow: "0 8px 22px rgba(2,132,199,.07)",
  },
  band: {
    fontWeight: 1000, color: "#0c4a6e", background: "#e0f2fe", borderRadius: 10,
    padding: "8px 12px", marginBottom: 12,
  },
  label: { display: "block", fontWeight: 800, color: "#0c4a6e", marginBottom: 5, fontSize: 12 },
  input: {
    width: "100%", minHeight: 46, padding: "10px 12px", border: "1.5px solid #cbd5e1", borderRadius: 12,
    background: "#fff", color: "#0f172a", boxSizing: "border-box", fontFamily: "inherit", fontSize: 16,
  },
  inputWarn: { borderColor: "#f59e0b", background: "#fffbeb" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, marginBottom: 10 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8, marginBottom: 8 },
  block: { marginBottom: 12 },
  bigScan: {
    width: "100%", padding: "26px 14px", borderRadius: 18, border: "none", cursor: "pointer",
    background: "linear-gradient(135deg,#0ea5e9,#2563eb)", color: "#fff", fontWeight: 1000, fontSize: 20,
    boxShadow: "0 16px 30px rgba(37,99,235,.28)", fontFamily: "inherit",
  },
  plate: {
    fontWeight: 1000, fontSize: 18, letterSpacing: ".5px", padding: "6px 14px", borderRadius: 10,
    background: "#fefce8", border: "2px solid #0f172a",
  },
  pill: (c) => ({ padding: "4px 10px", borderRadius: 999, background: `${c}18`, color: c, fontWeight: 900, border: `1px solid ${c}55` }),
  chip: (on) => ({
    padding: "10px 14px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontFamily: "inherit",
    border: on ? "1.5px solid #0284c7" : "1.5px solid #cbd5e1",
    background: on ? "linear-gradient(180deg,#0ea5e9,#0284c7)" : "#fff",
    color: on ? "#fff" : "#334155",
  }),
  btn: (kind) => {
    const k = {
      primary: { background: "linear-gradient(180deg,#22c55e,#16a34a)", color: "#fff", border: "1px solid #16a34a" },
      ghost: { background: "#fff", color: "#0f172a", border: "1.5px solid #cbd5e1" },
      okGhost: { background: "#f0fdf4", color: "#166534", border: "1.5px solid #86efac" },
      warn: { background: "#fff7ed", color: "#9a3412", border: "1.5px dashed #fdba74" },
      danger: { background: "#fef2f2", color: "#b91c1c", border: "1.5px solid #fecaca" },
      dark: { background: "#0f172a", color: "#fff", border: "1px solid #0f172a" },
    }[kind] || {};
    return {
      minHeight: 44, padding: "8px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 900,
      fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, ...k,
    };
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
  returnsBox: { background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: 10, marginBottom: 12 },
  returnRow: { background: "#fff", border: "1px solid #fde2c4", borderRadius: 10, padding: 10, marginBottom: 8 },
  err: { color: "#b91c1c", fontWeight: 800, margin: "6px 0 10px" },
  msg: (kind) => ({
    position: "sticky", top: 8, zIndex: 50, padding: "10px 14px", borderRadius: 12, marginBottom: 12, fontWeight: 800,
    background: kind === "ok" ? "#dcfce7" : kind === "warn" ? "#fef3c7" : "#fee2e2",
    color: kind === "ok" ? "#166534" : kind === "warn" ? "#92400e" : "#991b1b",
    border: `1px solid ${kind === "ok" ? "#86efac" : kind === "warn" ? "#fcd34d" : "#fecaca"}`,
  }),
};
