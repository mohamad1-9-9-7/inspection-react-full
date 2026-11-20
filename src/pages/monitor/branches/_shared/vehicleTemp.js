// src/pages/monitor/branches/_shared/vehicleTemp.js
// The vehicle temperature belongs to the delivery (one truck), not to each
// line, so the receiving-log views show it once above the table instead of as
// a column. Sheets saved before carry it on every row; those collapse to the
// same single value here.

const clean = (v) => String(v ?? "").trim();

/**
 * One line of text for the "Vehicle Temp (°C)" box above the report.
 *   one value            → "3"
 *   several deliveries   → "Al Ain Farms: 3 · Siniora: 4"
 *   legacy rows, mixed   → "3 / 4"
 */
export function vehicleTempSummary(payload = {}, rows = null) {
  const deliveries = Array.isArray(payload?.deliveries) ? payload.deliveries : [];
  const withTemp = deliveries.filter((d) => clean(d?.vehicleTemp));
  const distinct = (list) => [...new Set(list.map(clean).filter(Boolean))];

  if (withTemp.length) {
    const temps = distinct(withTemp.map((d) => d.vehicleTemp));
    if (temps.length === 1) return temps[0];
    return withTemp
      .map((d) => (clean(d.supplier) ? `${clean(d.supplier)}: ${clean(d.vehicleTemp)}` : clean(d.vehicleTemp)))
      .join(" · ");
  }

  const list = Array.isArray(rows) ? rows : Array.isArray(payload?.entries) ? payload.entries : [];
  const fromRows = distinct(list.map((r) => r?.vehicleTemp));
  if (fromRows.length) return fromRows.join(" / ");
  return clean(payload?.vehicleTemp);
}

/** The value to pre-fill the single edit box with (first one found). */
export function vehicleTempValue(payload = {}, rows = null) {
  const deliveries = Array.isArray(payload?.deliveries) ? payload.deliveries : [];
  const d = deliveries.find((x) => clean(x?.vehicleTemp));
  if (d) return clean(d.vehicleTemp);
  const list = Array.isArray(rows) ? rows : Array.isArray(payload?.entries) ? payload.entries : [];
  const r = list.find((x) => clean(x?.vehicleTemp));
  return r ? clean(r.vehicleTemp) : clean(payload?.vehicleTemp);
}

/**
 * Write one vehicle temperature onto every row (and every delivery block) so
 * every older reader — exporters, Mock Recall, KPIs — keeps finding it.
 */
export function applyVehicleTemp(payload = {}, value) {
  const v = clean(value);
  const out = { ...payload, vehicleTemp: v };
  if (Array.isArray(payload.entries)) out.entries = payload.entries.map((r) => ({ ...r, vehicleTemp: v }));
  if (Array.isArray(payload.deliveries)) out.deliveries = payload.deliveries.map((d) => ({ ...d, vehicleTemp: v }));
  return out;
}

export const applyVehicleTempToRows = (rows, value) =>
  (Array.isArray(rows) ? rows : []).map((r) => ({ ...r, vehicleTemp: clean(value) }));
