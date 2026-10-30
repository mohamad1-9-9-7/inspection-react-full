// src/pages/car/driverTripApi.js
// Reads and saves the driver trip records (DRIVER_TRIP_TYPE).

import { listReports, payloadOf, reportId, REPORTS_MAX_LIMIT } from "../monitor/branches/_shared/reportApi";
import { saveReport } from "../../utils/reportOutbox";
import { DRIVER_TRIP_TYPE } from "./carConstants";

const pad = (n) => String(n).padStart(2, "0");
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const nowHHMM = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const normPlate = (s) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

export function currentUserName() {
  try {
    const u = JSON.parse(localStorage.getItem("currentUser") || "{}");
    return String(u.displayName || u.name || u.username || "").trim();
  } catch {
    return "";
  }
}

/** Trips whose business date falls in [from, to] (YYYY-MM-DD), newest first. */
export async function listTrips({ from, to } = {}) {
  const rows = await listReports(DRIVER_TRIP_TYPE, {
    limit: REPORTS_MAX_LIMIT,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });
  return rows
    .map((r) => {
      const p = payloadOf(r);
      return { id: reportId(r), ...p, reportDate: p.date || p.reportDate || "" };
    })
    .sort((a, b) => String(b.reportDate || "").localeCompare(String(a.reportDate || "")) ||
      (b.createdAt || 0) - (a.createdAt || 0));
}

/** Create (no id) or overwrite (id) one trip. Returns { id, queued }.
    The day is stored as `date`, never `reportDate`: the server keeps a unique
    index on (company, type, payload.reportDate), which allowed only ONE trip
    per day — the second driver's save came back DUPLICATE_REPORT_FOR_DATE.
    `date` is read by the server's business-date filter all the same. */
export async function saveTrip(trip) {
  const { id, reportDate, ...rest } = trip;
  const payload = { ...rest, date: reportDate || rest.date || todayISO(), updatedAt: Date.now() };
  const body = {
    reporter: payload.driverName || currentUserName() || "driver",
    type: DRIVER_TRIP_TYPE,
    payload,
  };
  const r = await saveReport({ body, id: id || null, label: `Trip ${payload.vehicleNo || ""}` });
  return { id: id || (r.report ? reportId(r.report) : null), queued: r.queued };
}

/** One row per returned product, with the trip and stop it came from. */
export function flattenReturns(trips) {
  const out = [];
  (trips || []).forEach((t) => {
    (t.destinations || []).forEach((d) => {
      (d.returns || []).forEach((it) => {
        out.push({
          ...it,
          tripId: t.id,
          reportDate: t.reportDate,
          vehicleNo: t.vehicleNo,
          driverName: t.driverName,
          branch: d.name,
          arrivalTime: d.arrival?.time || "",
          location: d.arrival?.location || null,
        });
      });
    });
  });
  return out;
}

/** Location once, with a readable error. */
export function locateMe() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("no-geo"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        lat: +p.coords.latitude.toFixed(6),
        lng: +p.coords.longitude.toFixed(6),
        accuracy: Math.round(p.coords.accuracy || 0),
        at: Date.now(),
      }),
      (e) => reject(e),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 }
    );
  });
}
