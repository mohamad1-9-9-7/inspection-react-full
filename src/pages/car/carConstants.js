// src/pages/car/carConstants.js
// Shared by the loading checklist, the driver trip page and the reports.

/* Destinations a truck leaves for (الوجهة). */
export const DESTINATIONS = [
  "ABU DHABI BUTCHERY",
  "AL AIN BUTCHERY",
  "AL BARSHA BUTCHERY",
  "JUBAIL MARKET BUTCHERY",
  "THE MARKET",
  "DUBAI",
  "SHARJAH",
  "AJMAN",
  "RAS AL KHAIMAH",
  "FUJAIRAH",
  "UMM AL QUWAIN",
  "HOME DELIVERY",
];

export const LOOKUP_VEHICLES_TYPE = "cars_loading_lookup_vehicle_numbers";
export const LOOKUP_DRIVERS_TYPE = "cars_loading_lookup_driver_names";

/* One record per trip: the driver scans the truck's sticker, records the
   loading temperature, then an arrival (temperature, photos, location and a
   photo of the transfer note) at every destination. Read by
   /car/loading-reports. */
export const DRIVER_TRIP_TYPE = "cars_driver_trip";

/* Only for trips saved before the transfer-note photo replaced the returns
   list — their stops still carry `returns`, shown in the vehicle popup. */
export const RETURN_REASONS = [
  { id: "expired", ar: "منتهي الصلاحية", en: "Expired" },
  { id: "near_expiry", ar: "قريب الانتهاء", en: "Near expiry" },
  { id: "damaged", ar: "تالف / تغليف مفتوح", en: "Damaged / open pack" },
  { id: "temperature", ar: "حرارة غير مطابقة", en: "Temperature abuse" },
  { id: "quality", ar: "جودة (لون / رائحة)", en: "Quality (colour / odour)" },
  { id: "overstock", ar: "فائض / غير مطلوب", en: "Overstock / not ordered" },
  { id: "other", ar: "أخرى", en: "Other" },
];

export const reasonLabel = (id, lang = "en") => {
  const r = RETURN_REASONS.find((x) => x.id === id);
  return r ? r[lang] || r.en : id || "—";
};

/* The QR sticker on a truck carries this page's link with the plate in the
   path, so a phone camera opens the trip directly; a scanned plain text is
   taken as the plate itself. */
export const DRIVER_PATH = "/car/driver";

export function vehicleFromScan(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    const path = u.hash.startsWith("#/") ? u.hash.slice(1) : u.pathname;
    const i = path.indexOf(`${DRIVER_PATH}/`);
    if (i >= 0) return decodeURIComponent(path.slice(i + DRIVER_PATH.length + 1).split(/[/?#]/)[0] || "");
    return "";
  } catch {
    return raw;
  }
}

export const mapsLink = (loc) =>
  loc && loc.lat != null && loc.lng != null
    ? `https://www.google.com/maps?q=${loc.lat},${loc.lng}`
    : "";
