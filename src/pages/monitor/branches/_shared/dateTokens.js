// dateTokens.js
//
// The date-in-a-text-cell rules, in one place.
//
// Several report cells hold ONE OR MORE dates inside a single string, because
// one shipment can arrive carrying two or three lots. The string stays plain
// text so every reader downstream keeps working (View pages and Excel print it
// raw, the PDF passes it through, AllReportsView scans it for dates):
//
//     "01/09/2026"                 → one date
//     "01/09/2026 , 05/09/2026"    → two dates in the same cell
//
// Used by MultiDateField (the editor) and shelfLife (the expiry calculator).

export const DATE_SEP = " , ";

/* commas (both alphabets), semicolons, pipes, newlines and a spaced dash.
   A lone "/" is never a separator — it lives inside 01/09/2026. */
export const DATE_SPLIT_RE = /\s*[,،;|\r\n]\s*|\s+[—–]\s+/;

const p2 = (n) => String(n).padStart(2, "0");

function validIso(y, m, d) {
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return "";
  return `${y}-${p2(m)}-${p2(d)}`;
}

/** "01/09/2026" | "2026-09-01" | "1-9-26" → "2026-09-01" ("" when it is not a date). */
export function tokenToIso(token) {
  const s = String(token ?? "").trim();
  if (!s) return "";

  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s);
  if (m) return validIso(+m[1], +m[2], +m[3]);

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(s);
  if (m) {
    let y = +m[3];
    if (y < 100) y += 2000;
    return validIso(y, +m[2], +m[1]); // day first — the sheets are DD/MM/YYYY
  }
  return "";
}

/** "2026-09-01" → "01/09/2026" */
export function isoToDMY(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || "");
}

/** Every piece of a cell, in order, date or not: [{ raw, iso }]. */
export function splitDateTokens(value) {
  return String(value ?? "")
    .split(DATE_SPLIT_RE)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((raw) => ({ raw, iso: tokenToIso(raw) }));
}

/** Only the real dates in a cell, as ISO. */
export function isoDatesIn(value) {
  return splitDateTokens(value).map((t) => t.iso).filter(Boolean);
}

/** ISO dates (or raw pieces) → the stored cell string. */
export function joinDateTokens(list) {
  return (list || [])
    .map((x) => (/^\d{4}-\d{2}-\d{2}$/.test(String(x)) ? isoToDMY(x) : String(x || "").trim()))
    .filter(Boolean)
    .join(DATE_SEP);
}

/** "2026-09-01" + 90 → "2026-11-30". Calendar days, no timezone drift. */
export function addDaysIso(iso, days) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  const n = Number(days);
  if (!m || !Number.isFinite(n)) return "";
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  d.setUTCDate(d.getUTCDate() + Math.round(n));
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}
