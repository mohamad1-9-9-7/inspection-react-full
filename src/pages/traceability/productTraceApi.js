// src/pages/traceability/productTraceApi.js
//
// منظومة تتبع المنتج — محرّك البحث بالكود
// The Product Traceability engine: give it one catalog item code and it walks
// every report family that touches a product, so a single code answers
// "where did it come in, what was it turned into, and where did it go?".
//
// Sources, in the order a product moves through the business:
//   1. qcs_raw_material          — the incoming shipment inspected at QCS
//   2. *_receiving_log_butchery  — the same product received at a branch
//   3. *_traceability_log        — the batch that consumed it / produced it
//   4. finished_products_report  — the dispatch to a customer
//
// Matching: a row matches when its stored item code equals the searched code,
// OR — for the years of records written before codes existed — when its
// product name resolves to the same catalog entry. Every hit records which of
// the two matched, so the UI can show that a row was matched by name.

import API_BASE from "../../config/api";
import { normalizeCode } from "../monitor/branches/_shared/ProductPicker";
import { normalizeName } from "../monitor/branches/_shared/CodedProductField";

/* ===== Report families ===== */

export const SHIPMENT_TYPE = "qcs_raw_material";

export const RECEIVING_SOURCES = [
  { type: "pos6_receiving_log_butchery", branch: "POS 6" },
  { type: "pos10_receiving_log_butchery", branch: "POS 10" },
  { type: "pos11_receiving_log_butchery", branch: "POS 11" },
  { type: "pos15_receiving_log_butchery", branch: "POS 15" },
  { type: "pos19_receiving_log_butchery", branch: "POS 19" },
  { type: "ftr1_receiving_log_butchery", branch: "FTR 1" },
  { type: "ftr2_receiving_log_butchery", branch: "FTR 2" },
];

export const TRACE_SOURCES = [
  { type: "pos10_traceability_log", branch: "POS 10" },
  { type: "pos11_traceability_log", branch: "POS 11" },
  { type: "pos15_traceability_log", branch: "POS 15" },
  { type: "pos19_traceability_log", branch: "POS 19" },
  { type: "prd_traceability_log", branch: "PRODUCTION" },
];

export const DISPATCH_TYPE = "finished_products_report";

/* The daily meat-condition register — تقرير حالة اللحم اليومية.
   It records no movement: it is the log of somebody LOOKING at stock that is
   already sitting in a branch and writing down what state it is in (near
   expiry, expired, colour change, smell). In the flow it belongs between the
   branch receiving log and the returns — the branch took it in, flagged its
   condition, and only then sent some of it back. */
export const CONDITION_TYPE = "meat_daily";

/* Two channels come back, not one. A branch return names one of OUR sites; a
   customer return names an outside buyer and therefore resolves to NO branch
   at all. Tagging the channel at the source is what stops the screen's
   "show me one branch" filter from silently deleting every customer return —
   which it did, because a blank branch matches no branch. */
export const RETURN_SOURCES = [
  { type: "returns", channel: "branch", label: "Branch returns", labelAr: "مرتجعات الفروع" },
  {
    type: "returns_customers",
    channel: "customer",
    label: "Customer returns",
    labelAr: "مرتجعات الزبائن",
  },
  { type: "enoc_returns", channel: "branch", label: "ENOC returns", labelAr: "مرتجعات إينوك" },
];

/* ===== Our own branches =====
   The finished-product sheet dispatches to hundreds of outside customers, but
   a traceability question is about OUR sites: where did our own stock go, and
   which branch has to be visited if something is wrong. Everything else is
   deliberately grouped as "external" and never listed by name. */
export const OUR_BRANCHES = [
  { id: "POS 10", label: "POS 10", labelAr: "POS 10", test: /pos[\s._-]*0*10(?![0-9])/i },
  { id: "POS 11", label: "POS 11", labelAr: "POS 11", test: /pos[\s._-]*0*11(?![0-9])/i },
  // POS 14 is the Al Ain Market shop (see inspectionBranches.js). The finished
  // product sheet names it either way, so both spellings resolve to us instead
  // of being counted as an outside customer.
  { id: "POS 14", label: "POS 14", labelAr: "POS 14", test: /pos[\s._-]*0*14(?![0-9])|al[\s._-]*ain[\s._-]*market|سوق العين/i },
  { id: "POS 15", label: "POS 15", labelAr: "POS 15", test: /pos[\s._-]*0*15(?![0-9])/i },
  { id: "POS 47", label: "POS 47", labelAr: "POS 47", test: /pos[\s._-]*0*47(?![0-9])/i },
  { id: "POS 48", label: "POS 48", labelAr: "POS 48", test: /pos[\s._-]*0*48(?![0-9])/i },
  {
    id: "POS 19",
    label: "Al Warqa Kitchen",
    labelAr: "مطبخ الورقاء",
    test: /pos[\s._-]*0*19(?![0-9])|warqa|الورقاء/i,
  },
  { id: "PROD", label: "Production", labelAr: "الإنتاج", test: /\bprod\b|production|الإنتاج|الانتاج/i },
];

/** Which of our branches a free-text destination names, or null when it is an
 *  outside customer. */
export function resolveOurBranch(text) {
  const t = s(text);
  if (!t) return null;
  return OUR_BRANCHES.find((b) => b.test.test(t)) || null;
}

/* ===== Small helpers ===== */

const s = (v) => String(v ?? "").trim();

const isYMD = (v) => /^\d{4}-\d{2}-\d{2}$/.test(s(v));

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Every family writes dates its own way and they must agree or nothing lines
 * up: the Final Product sheet stores "31/07/2026", the QCS shipment samples
 * are free text and get typed as "19-08-2026", and the branch receiving logs
 * use a real date input and store "2026-08-17". Left alone, the same lot gets
 * three different keys and the distribution comes out empty.
 *
 * Everything is normalised to YYYY-MM-DD here, on the way in. Day-first is
 * assumed (UAE forms), with a swap when the first number cannot be a day.
 */
export function normDate(v) {
  const t = s(v);
  if (!t) return "";
  if (isYMD(t)) return t;

  // Arabic-Indic digits → ASCII, then any separator → "/"
  const ascii = t
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .trim();

  // YYYY/MM/DD or YYYY-MM-DD with single digits
  let m = ascii.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (m) return `${m[1]}-${pad2(+m[2])}-${pad2(+m[3])}`;

  m = ascii.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    let d = +m[1];
    let mo = +m[2];
    let y = +m[3];
    if (y < 100) y += 2000;
    // A first number over 12 is unambiguously the day; a second one over 12
    // means the writer used month-first.
    if (d <= 12 && mo > 12) [d, mo] = [mo, d];
    if (d < 1 || d > 31 || mo < 1 || mo > 12) return "";
    return `${y}-${pad2(mo)}-${pad2(d)}`;
  }
  return "";
}

/** normDate, but keeps the original text when it cannot be parsed — used for
 *  display-only fields where losing the value would be worse than a stray
 *  format. */
const dateOrRaw = (v) => normDate(v) || s(v);

/** Best available business date for a report row. */
function rowDate(row) {
  const p = row?.payload || {};
  const candidates = [
    row?.reportDate,
    p.reportDate,
    p.createdDate,
    p.date,
    p.cutDate,
    p?.header?.reportDate,
    p?.generalInfo?.inspectionDate,
    p?.generalInfo?.receivedOn,
  ];
  for (const c of candidates) {
    const v = normDate(s(c).slice(0, 10));
    if (v) return v;
  }
  const created = s(row?.created_at || row?.createdAt);
  return created ? created.slice(0, 10) : "";
}

/* ===== Codes carried inside the product name =====
   Several screens have no code column of their own and instead write the code
   into the product name: the Final Product report files rows as
   "[22160] BONES - KG", and our own coded cells read "22160 · BONES - KG".
   Both are a real, usable item code — parsing them is what lets those
   families join the trace without adding a column to them. */

const BRACKET_CODE = /^\s*[[(]\s*([A-Za-z0-9][A-Za-z0-9._/-]{0,19})\s*[\])]\s*(.*)$/;
const DOT_CODE = /^\s*([0-9][0-9A-Za-z._/-]{1,19})\s*[·|]\s*(.*)$/;

/** Split "[22160] BONES - KG" (or "22160 · BONES - KG") into code + name.
 *  Text that carries no code comes back as { code: "", name: <text> }. */
export function splitCodedName(text) {
  const t = s(text);
  if (!t) return { code: "", name: "" };
  const m = t.match(BRACKET_CODE) || t.match(DOT_CODE);
  if (!m) return { code: "", name: t };
  const rest = s(m[2]);
  // A bracket with nothing after it is a name, not a code.
  if (!rest) return { code: "", name: t };
  return { code: s(m[1]), name: rest };
}

/** The { code, name } a row really carries: an explicit code column wins, and
 *  when there is none the code embedded in the name is used. The name is
 *  always returned without its code prefix, so it can match the catalog. */
export function readProduct(codeValue, nameValue) {
  const split = splitCodedName(nameValue);
  return {
    code: s(codeValue) || split.code,
    name: split.name,
  };
}

/** First non-empty value among several spellings of the same cell.
 *  These families grew over years and carry the same number under `qty`,
 *  `quantity`, `pcs`… — reading only one spelling silently reports zero. */
function pick(obj, ...keys) {
  for (const k of keys) {
    const v = s(obj?.[k]);
    if (v) return v;
  }
  return "";
}

/** The first of a list of hits that actually carries one of these date cells. */
function firstDate(hits, ...keys) {
  for (const h of hits || []) {
    const v = pick(h?.x, ...keys);
    if (v) return v;
  }
  return "";
}

/** Numeric value out of "12.5 KG" / "١٢" / 12.5 — 0 when there is no number. */
export function toNum(v) {
  const n = Number(
    s(v)
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(",", ".")
      .replace(/[^\d.\-]/g, "")
  );
  return Number.isFinite(n) ? n : 0;
}

/**
 * Read one report family.
 *
 * Returns `{ rows, failed }`. A failed read is NOT the same as an empty one:
 * when the network drops, every family comes back empty and a traceability
 * screen that cannot tell the two apart will state, in writing, that a product
 * was never shipped anywhere — which is the worst thing this system can say.
 * The failure is carried up so the UI can say "لم أستطع القراءة" instead.
 */
async function fetchType(type, { from, to, signal } = {}) {
  const qs = new URLSearchParams({ type, limit: "5000" });
  if (isYMD(from)) qs.set("from", from);
  if (isYMD(to)) qs.set("to", to);
  try {
    const res = await fetch(`${API_BASE}/api/reports?${qs.toString()}`, {
      signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.error(`trace: ${type} read failed — HTTP ${res.status}`);
      return { rows: [], failed: true };
    }
    const json = await res.json().catch(() => null);
    const list = Array.isArray(json)
      ? json
      : json?.data || json?.items || json?.reports || json?.rows || [];
    return { rows: Array.isArray(list) ? list : [], failed: false };
  } catch (e) {
    if (e?.name === "AbortError") return { rows: [], failed: false };
    console.error(`trace: ${type} read failed`, e);
    return { rows: [], failed: true };
  }
}

/* ===== Matching ===== */

/**
 * Build a matcher for one catalog item. `aliases` are the extra names the same
 * code has been written under (from the catalog entry itself).
 * Returns null when there is nothing to match on.
 */
export function buildMatcher({ code, name }) {
  const wantCode = normalizeCode(code);
  const wantName = normalizeName(name);
  if (!wantCode && !wantName) return null;

  return function match(rowCode, rowName) {
    const c = normalizeCode(rowCode);
    if (wantCode && c && c === wantCode) return "code";
    // A row carrying a DIFFERENT code is a different product, even if a stale
    // name happens to collide — the code is the authority once it is present.
    if (c && wantCode && c !== wantCode) return null;
    const n = normalizeName(rowName);
    if (wantName && n && n === wantName) return "name";
    return null;
  };
}

/* ===== Per-family extraction ===== */

function fromShipments(rows, match) {
  const out = [];
  rows.forEach((row) => {
    const p = row?.payload || row || {};
    const gi = p.generalInfo || {};
    const date = rowDate(row);
    const samples = Array.isArray(p.samples) ? p.samples : [];
    const lines = Array.isArray(p.productLines) ? p.productLines : [];

    const hitSamples = samples
      .map((x, i) => {
        const prod = readProduct(x?.productCode || x?.itemCode, x?.productName);
        return { x, i, prod, via: match(prod.code, prod.name) };
      })
      .filter((h) => h.via);
    const hitLines = lines
      .map((x, i) => {
        const prod = readProduct(
          pick(x, "code", "itemCode", "item_code"),
          pick(x, "name", "productName")
        );
        return { x, i, prod, via: match(prod.code, prod.name) };
      })
      .filter((h) => h.via);

    if (!hitSamples.length && !hitLines.length) return;

    const via = hitSamples[0]?.via || hitLines[0]?.via;

    /* The shipment form splits one product across two tables: the SAMPLE rows
       carry the slaughter / expiry dates, the PRODUCT LINE rows carry the
       pieces and the kilos, and the two are bound only by the item code.
       Reading each half in isolation is why a shipment could show "0 kg" (it
       matched a sample but no line) or vanish from a lot (it matched a line,
       which carries no date). Each side now falls back to the other. */
    const qty =
      hitLines.reduce((a, h) => a + toNum(pick(h.x, "qty", "quantity", "pcs", "pieces")), 0) ||
      hitSamples.reduce((a, h) => a + toNum(pick(h.x, "qty", "quantity", "pcs", "pieces")), 0);
    const weight =
      hitLines.reduce(
        (a, h) => a + toNum(pick(h.x, "weight", "wt", "kg", "kgs", "weightKg", "netWeight")),
        0
      ) ||
      hitSamples.reduce(
        (a, h) => a + toNum(pick(h.x, "weight", "wt", "kg", "kgs", "weightKg", "netWeight")),
        0
      );
    const rawProd =
      firstDate(hitSamples, "slaughterDate", "productionDate", "prodDate") ||
      firstDate(hitLines, "slaughterDate", "productionDate", "prodDate");
    const rawExp =
      firstDate(hitSamples, "expiryDate", "expiry", "bestBefore") ||
      firstDate(hitLines, "expiryDate", "expiry", "bestBefore");
    out.push({
      kind: "shipment",
      id: row?.id || row?._id || `${date}-${out.length}`,
      date,
      via,
      matchedName: hitSamples[0]?.prod.name || hitLines[0]?.prod.name || "",
      matchedCode: hitSamples[0]?.prod.code || hitLines[0]?.prod.code || "",
      shipmentType: s(p.shipmentType),
      status: s(p.status),
      invoiceNo: s(gi.invoiceNo),
      supplier: s(gi.supplierName || gi.supplier),
      origin: s(gi.origin),
      brand: s(gi.brand),
      // "وين استلمها" — the receiving address on the shipment.
      location: s(gi.receivingAddress) || "QCS",
      qty,
      weight,
      prodDate: normDate(rawProd),
      expiryDate: normDate(rawExp),
      // The shipment's date cells are free text, so a value that will not
      // parse must still be shown rather than silently becoming a dash.
      prodDateRaw: dateOrRaw(rawProd),
      expiryDateRaw: dateOrRaw(rawExp),
      temperature: s(hitSamples[0]?.x?.temperature),
      inspectedBy: s(p.inspectedBy),
      refNo: s(p.refNo),
    });
  });
  return out;
}

function fromReceiving(rows, match, branch) {
  const out = [];
  rows.forEach((row) => {
    const p = row?.payload || row || {};
    const date = rowDate(row);
    const entries = Array.isArray(p.entries) ? p.entries : [];
    entries.forEach((e, i) => {
      const prod = readProduct(e?.itemCode, e?.foodItem);
      const via = match(prod.code, prod.name);
      if (!via) return;
      out.push({
        kind: "receiving",
        id: `${row?.id || date}-${i}`,
        date: normDate(e?.date) || date,
        via,
        branch: s(p.branch) || branch,
        matchedName: prod.name,
        matchedCode: prod.code,
        supplier: s(e?.supplier),
        // Receiving logs spell the amount differently per branch: POS 15 has a
        // netWeight column, POS 10 a free-text quantity, POS 11 a weightKg.
        // `amount` is the one number to compare against what we sent — reading
        // only `weight` made a POS 10 line look like zero.
        qty: toNum(e?.quantity),
        weight: toNum(e?.netWeight ?? e?.weightKg ?? e?.weight),
        amount: toNum(e?.netWeight ?? e?.weightKg ?? e?.weight ?? e?.quantity),
        rawQty: s(e?.quantity) || s(e?.netWeight) || s(e?.weightKg),
        prodDate: normDate(e?.productionDate),
        expiryDate: normDate(e?.expiryDate),
        origin: s(e?.countryOfOrigin),
        foodTemp: s(e?.foodTemp),
        invoiceNo: s(e?.invoiceNo) || s(p.invoiceNo),
        receivedBy: s(e?.receivedBy) || s(p.receivedBy),
        remarks: s(e?.remarks),
      });
    });
  });
  return out;
}

function fromTraceability(rows, match, branch) {
  const out = [];
  rows.forEach((row) => {
    const p = row?.payload || row || {};
    const date = rowDate(row);
    const entries = Array.isArray(p.entries) ? p.entries : [];
    entries.forEach((e, i) => {
      const rawProd = readProduct(e?.rawCode, e?.rawName);
      const finalProd = readProduct(e?.finalCode, e?.finalName);
      const asRaw = match(rawProd.code, rawProd.name);
      const asFinal = match(finalProd.code, finalProd.name);
      if (!asRaw && !asFinal) return;
      out.push({
        kind: "batch",
        // role says whether the searched product went INTO this batch or came
        // OUT of it — that is the direction of the trace.
        role: asRaw && asFinal ? "both" : asRaw ? "input" : "output",
        id: `${row?.id || date}-${i}`,
        date,
        via: asRaw || asFinal,
        branch: s(p.branch) || branch,
        section: s(p.section),
        batchId: s(e?.batchId),
        rawCode: rawProd.code,
        rawName: rawProd.name,
        rawWeight: toNum(e?.rawWeight),
        origProdDate: normDate(e?.origProdDate),
        origExpDate: normDate(e?.origExpDate),
        openedDate: normDate(e?.openedDate),
        bestBefore: normDate(e?.bestBefore),
        finalCode: finalProd.code,
        finalName: finalProd.name,
        finalWeight: toNum(e?.finalWeight),
        finalProdDate: normDate(e?.finalProdDate),
        finalExpDate: normDate(e?.finalExpDate),
      });
    });
  });
  return out;
}

function fromDispatch(rows, match) {
  const out = [];
  rows.forEach((row) => {
    const p = row?.payload || row || {};
    const date = rowDate(row);
    const products = Array.isArray(p.products) ? p.products : [];
    products.forEach((x, i) => {
      // The finished-product sheet has no code column: it files rows as
      // "[22160] BONES - KG", so the code is read straight out of the name.
      const prod = readProduct(x?.itemCode || x?.code, x?.product || x?.productName);
      const via = match(prod.code, prod.name);
      if (!via) return;
      out.push({
        kind: "dispatch",
        id: `${row?.id || date}-${i}`,
        date,
        via,
        matchedName: prod.name,
        matchedCode: prod.code,
        // "لوين راح" — the customer / stock location it was sent to.
        customer: s(x?.customer),
        orderNo: s(x?.orderNo),
        time: s(x?.time),
        qty: toNum(x?.quantity),
        unit: s(x?.unitOfMeasure) || "KG",
        prodDate: normDate(x?.slaughterDate),
        expiryDate: normDate(x?.expiryDate),
        temp: s(x?.temp),
        condition: s(x?.overallCondition),
        remarks: s(x?.remarks),
      });
    });
  });
  return out;
}

function fromCondition(rows, match) {
  const out = [];
  rows.forEach((row) => {
    const p = row?.payload || row || {};
    const date = rowDate(row);
    const items = Array.isArray(p.items) ? p.items : [];
    items.forEach((x, i) => {
      const prod = readProduct(x?.itemCode, x?.productName);
      const via = match(prod.code, prod.name);
      if (!via) return;
      // The register has no branch column of its own: the site is written into
      // the remarks as "POS 15", which is what the Browse screen reads too.
      const remarks = s(x?.remarks);
      out.push({
        kind: "condition",
        id: `${row?.id || date}-${i}`,
        date,
        via,
        matchedName: prod.name,
        matchedCode: prod.code,
        status: s(x?.status),
        qty: toNum(x?.quantity),
        qtyType: s(x?.qtyType) || "KG",
        expiryDate: normDate(x?.expiry),
        expiryRaw: dateOrRaw(x?.expiry),
        branch: resolveOurBranch(remarks)?.id || "",
        remarks,
        images: Array.isArray(x?.images) ? x.images.length : 0,
      });
    });
  });
  return out;
}

/** Is this condition line a problem, or just a routine "OK"? */
export function isConditionIssue(status) {
  const v = s(status).toLowerCase();
  if (!v) return false;
  return v !== "ok" && !v.includes("سليم");
}

function fromReturns(rows, match, source) {
  const out = [];
  rows.forEach((row) => {
    const p = row?.payload || row || {};
    const date = rowDate(row);
    const items = Array.isArray(p.items) ? p.items : [];
    items.forEach((x, i) => {
      const prod = readProduct(x?.itemCode, x?.productName);
      const via = match(prod.code, prod.name);
      if (!via) return;
      // A return names where it came back FROM: a branch on the branch/ENOC
      // sheets, a customer on the customer-returns sheet.
      const place = s(x?.customButchery) || s(x?.butchery) || s(x?.customerName);
      out.push({
        kind: "return",
        id: `${row?.id || date}-${i}`,
        date,
        via,
        source: source.type,
        sourceLabel: source.label,
        sourceLabelAr: source.labelAr,
        channel: source.channel || "branch",
        matchedName: prod.name,
        matchedCode: prod.code,
        place,
        branch: resolveOurBranch(place)?.id || "",
        qty: toNum(x?.quantity),
        qtyType: s(x?.qtyType) || s(x?.customQtyType),
        expiryDate: normDate(x?.expiry),
        origin: s(x?.origin),
        action: s(x?.customAction) || s(x?.action),
        remarks: s(x?.remarks),
        // Who physically brought it back. Only the customer-returns sheet has
        // these, and they are the whole audit trail for a customer return.
        customerName: s(x?.customerName),
        carNumber: s(x?.carNumber),
        driverName: s(x?.driverName),
        images: Array.isArray(x?.images) ? x.images.length : 0,
        refNo: s(p.refNo),
      });
    });
  });
  return out;
}

/* ===== The trace ===== */

const byDateDesc = (a, b) => String(b.date || "").localeCompare(String(a.date || ""));

/**
 * Run a full trace for one catalog item.
 * @param {{code:string, name:string, from?:string, to?:string, signal?:AbortSignal,
 *          onProgress?:(done:number,total:number)=>void}} opts
 */
const EMPTY_TRACE = {
  shipments: [],
  receiving: [],
  batches: [],
  dispatch: [],
  conditions: [],
  returns: [],
  scanned: 0,
  // Families that could not be read at all (network down, server error). An
  // empty trace with failures is "unknown", not "nothing happened".
  failed: [],
};

/** Read one set of report families and sort the hits into the four buckets. */
async function runFamilies(jobs, { code, name, from, to, signal, onProgress }) {
  // Accept a search term pasted in the "[22160] BONES - KG" form too.
  const match = buildMatcher(readProduct(code, name));
  if (!match) return { ...EMPTY_TRACE };

  let done = 0;
  const results = await Promise.all(
    jobs.map(async (job) => {
      const { rows, failed } = await fetchType(job.type, { from, to, signal });
      done += 1;
      if (typeof onProgress === "function") onProgress(done, jobs.length);
      return { job, rows, failed };
    })
  );

  const shipments = [];
  const receiving = [];
  const batches = [];
  const dispatch = [];
  const conditions = [];
  const returns = [];
  let scanned = 0;
  const failed = [];

  results.forEach(({ job, rows, failed: bad }) => {
    if (bad) failed.push(job.type);
    scanned += rows.length;
    if (job.key === "shipment") shipments.push(...fromShipments(rows, match));
    else if (job.key === "receiving") receiving.push(...fromReceiving(rows, match, job.branch));
    else if (job.key === "batch") batches.push(...fromTraceability(rows, match, job.branch));
    else if (job.key === "dispatch") dispatch.push(...fromDispatch(rows, match));
    else if (job.key === "condition") conditions.push(...fromCondition(rows, match));
    else if (job.key === "return") returns.push(...fromReturns(rows, match, job.source));
  });

  shipments.sort(byDateDesc);
  receiving.sort(byDateDesc);
  batches.sort(byDateDesc);
  dispatch.sort(byDateDesc);
  conditions.sort(byDateDesc);
  returns.sort(byDateDesc);

  return { shipments, receiving, batches, dispatch, conditions, returns, scanned, failed };
}

const ARRIVAL_JOBS = [
  { key: "shipment", type: SHIPMENT_TYPE, branch: "QCS" },
  ...RECEIVING_SOURCES.map((x) => ({ key: "receiving", ...x })),
];

const DOWNSTREAM_JOBS = [
  ...TRACE_SOURCES.map((x) => ({ key: "batch", ...x })),
  { key: "dispatch", type: DISPATCH_TYPE, branch: "" },
  { key: "condition", type: CONDITION_TYPE, branch: "" },
  ...RETURN_SOURCES.map((x) => ({ key: "return", type: x.type, source: x })),
];

/**
 * Step 1 of a trace — the ARRIVAL side only: the QCS shipment and the branch
 * receiving logs. This is the half that declares which production / expiry
 * dates a code actually came in on, and it is a handful of records rather
 * than the thousands of dispatch lines downstream. The screen asks the user
 * to pick a lot from this before spending a read on everything else.
 */
export async function traceArrivals(opts) {
  return runFamilies(ARRIVAL_JOBS, opts);
}

/** Step 2 — where the product went: batches and customer dispatch. */
export async function traceDownstream(opts) {
  return runFamilies(DOWNSTREAM_JOBS, opts);
}

/** The whole trace in one sweep. */
export async function traceProduct(opts) {
  return runFamilies([...ARRIVAL_JOBS, ...DOWNSTREAM_JOBS], opts);
}

/** Merge an arrivals result with a downstream one. */
export function mergeTrace(a, b) {
  return {
    shipments: [...(a?.shipments || []), ...(b?.shipments || [])],
    receiving: [...(a?.receiving || []), ...(b?.receiving || [])],
    batches: [...(a?.batches || []), ...(b?.batches || [])],
    dispatch: [...(a?.dispatch || []), ...(b?.dispatch || [])],
    conditions: [...(a?.conditions || []), ...(b?.conditions || [])],
    returns: [...(a?.returns || []), ...(b?.returns || [])],
    scanned: (a?.scanned || 0) + (b?.scanned || 0),
    failed: [...(a?.failed || []), ...(b?.failed || [])],
  };
}

/* ===== Distribution to our own branches =====
   Step 2 of the flow: of everything dispatched, how much went to each of our
   sites. Outside customers are counted in one "external" bucket and never
   listed by name — the question being answered is "which of OUR branches has
   this product", not "who bought it". */
export function distributionByBranch(dispatch) {
  const byId = new Map(
    OUR_BRANCHES.map((b) => [b.id, { ...b, qty: 0, rows: [], lastDate: "" }])
  );
  const external = { qty: 0, count: 0, customers: new Set() };

  (dispatch || []).forEach((d) => {
    const branch = resolveOurBranch(d.customer);
    if (!branch) {
      external.qty += d.qty;
      external.count += 1;
      if (d.customer) external.customers.add(d.customer);
      return;
    }
    const bucket = byId.get(branch.id);
    bucket.qty += d.qty;
    bucket.rows.push(d);
    if (!bucket.lastDate || String(d.date) > bucket.lastDate) bucket.lastDate = d.date;
  });

  return {
    branches: Array.from(byId.values()),
    external: { ...external, customers: external.customers.size },
    ourQty: Array.from(byId.values()).reduce((a, b) => a + b.qty, 0),
  };
}

/* ===== Date lots =====
   The same item code arrives over and over on different production / expiry
   dates. Everything below lets the screen list the dates that actually exist
   for a code, and then narrow the whole trace down to one of them. */

/** The production / expiry pair a hit carries, whatever family it came from.
 *  For a batch it depends on the direction: the raw side carries the original
 *  dates, the final side the dates of what was produced. */
export function datesOf(hit) {
  if (!hit) return { prodDate: "", expiryDate: "" };
  if (hit.kind === "batch") {
    if (hit.role === "output") {
      return { prodDate: s(hit.finalProdDate), expiryDate: s(hit.finalExpDate) };
    }
    // "input" and "both" are keyed on the raw material that went in, falling
    // back to the produced dates when the raw side was left blank.
    return {
      prodDate: s(hit.origProdDate) || s(hit.finalProdDate),
      expiryDate: s(hit.origExpDate) || s(hit.finalExpDate),
    };
  }
  return { prodDate: s(hit.prodDate), expiryDate: s(hit.expiryDate) };
}

export const lotKey = (prodDate, expiryDate) => `${s(prodDate)}|${s(expiryDate)}`;

const FAMILY_OF = {
  shipment: "shipments",
  receiving: "receiving",
  batch: "batches",
  dispatch: "dispatch",
  condition: "conditions",
  return: "returns",
};

/**
 * Every distinct production/expiry pair this code was seen under, newest first,
 * with a per-family count so it is obvious where each lot came from.
 */
export function collectLots(result) {
  // Returns are deliberately NOT in this list: a return slip carries only an
  // expiry date, so letting it define a lot invents a half-empty one that is
  // really the same lot seen from the other end. They are folded in below.
  const all = [
    ...(result?.shipments || []),
    ...(result?.receiving || []),
    ...(result?.batches || []),
    ...(result?.dispatch || []),
  ];
  const map = new Map();
  all.forEach((hit) => {
    const { prodDate, expiryDate } = datesOf(hit);
    if (!prodDate && !expiryDate) return; // nothing to search on
    const key = lotKey(prodDate, expiryDate);
    if (!map.has(key)) {
      map.set(key, {
        key,
        prodDate,
        expiryDate,
        counts: { shipments: 0, receiving: 0, batches: 0, dispatch: 0, conditions: 0, returns: 0 },
        total: 0,
        branches: new Set(),
        issues: 0,
        firstSeen: "",
        lastSeen: "",
      });
    }
    const lot = map.get(key);
    lot.counts[FAMILY_OF[hit.kind]] += 1;
    lot.total += 1;
    // Where the lot was seen: the branch, the shipment's receiving address, or
    // — for a dispatch — whoever it was sent to.
    if (hit.branch) lot.branches.add(hit.branch);
    else if (hit.kind === "shipment") lot.branches.add(hit.location || "QCS");
    else if (hit.kind === "dispatch" && hit.customer) {
      // Only our own sites are named; outside customers stay anonymous.
      const b = resolveOurBranch(hit.customer);
      if (b) lot.branches.add(b.id);
    } else if (hit.kind === "return" && hit.place) lot.branches.add(hit.place);
    const d = s(hit.date);
    if (isYMD(d)) {
      if (!lot.firstSeen || d < lot.firstSeen) lot.firstSeen = d;
      if (!lot.lastSeen || d > lot.lastSeen) lot.lastSeen = d;
    }
  });

  // Fold returns into whichever lot shares their expiry date. A return that
  // matches no known lot is still worth counting, so it gets a lot of its own
  // keyed on the expiry alone.
  // One index over the lots built above, so folding N returns into M lots is
  // a lookup each instead of a scan each (a busy code has 250+ lots).
  const byExpiry = new Map();
  map.forEach((l) => {
    if (l.expiryDate && !byExpiry.has(l.expiryDate)) byExpiry.set(l.expiryDate, l);
  });
  // Returns and daily condition checks both carry an expiry and never a
  // production date, so neither may define a lot of its own while a matching
  // one exists — that would split one real lot into two half-empty ones.
  const foldByExpiry = (hit, bucket) => {
    const exp = s(hit.expiryDate);
    if (!exp) return;
    let lot = byExpiry.get(exp);
    if (!lot) {
      const key = lotKey("", exp);
      if (!map.has(key)) {
        map.set(key, {
          key,
          prodDate: "",
          expiryDate: exp,
          counts: { shipments: 0, receiving: 0, batches: 0, dispatch: 0, conditions: 0, returns: 0 },
          total: 0,
          branches: new Set(),
          issues: 0,
          firstSeen: "",
          lastSeen: "",
        });
      }
      lot = map.get(key);
      byExpiry.set(exp, lot);
    }
    lot.counts[bucket] += 1;
    lot.total += 1;
    const where = s(hit.place) || s(hit.branch);
    if (where) lot.branches.add(where);
    const d = s(hit.date);
    if (isYMD(d)) {
      if (!lot.firstSeen || d < lot.firstSeen) lot.firstSeen = d;
      if (!lot.lastSeen || d > lot.lastSeen) lot.lastSeen = d;
    }
    return lot;
  };

  (result?.returns || []).forEach((hit) => foldByExpiry(hit, "returns"));
  (result?.conditions || []).forEach((hit) => {
    const lot = foldByExpiry(hit, "conditions");
    // A lot with a flagged condition line is the one worth looking at first,
    // so the picker can surface it instead of burying it in date order.
    if (lot && isConditionIssue(hit.status)) lot.issues += 1;
  });

  return Array.from(map.values())
    .map((l) => ({ ...l, branches: Array.from(l.branches).sort() }))
    .sort((a, b) => {
      // Newest production date first; lots with no production date go last.
      const ap = a.prodDate || "0000-00-00";
      const bp = b.prodDate || "0000-00-00";
      if (ap !== bp) return bp.localeCompare(ap);
      return String(b.expiryDate).localeCompare(String(a.expiryDate));
    });
}

/** The distinct production dates / expiry dates available, newest first. */
export function lotDateOptions(lots) {
  const prod = new Set();
  const exp = new Set();
  (lots || []).forEach((l) => {
    if (l.prodDate) prod.add(l.prodDate);
    if (l.expiryDate) exp.add(l.expiryDate);
  });
  const desc = (a, b) => String(b).localeCompare(String(a));
  return {
    prodDates: Array.from(prod).sort(desc),
    expiryDates: Array.from(exp).sort(desc),
  };
}

/* ===== Coded-only =====
   Every hit records HOW it matched: "code" when the row carried the item code
   itself, "name" when the row predates codes and was resolved through the
   catalog on its product name. A name match is a good guess, not a fact — two
   products can share a description, and a stale name outlives a re-coded item.
   When someone is building a recall list they need the rows the DATA proves,
   not the rows we inferred, and these two let the screen say which is which. */

const FAMILIES = ["shipments", "receiving", "batches", "dispatch", "conditions", "returns"];

/** Keep only the hits that matched on a real item code. */
export function filterCodedOnly(result) {
  if (!result) return result;
  const out = { ...result };
  FAMILIES.forEach((f) => {
    out[f] = (result[f] || []).filter((h) => h.via === "code");
  });
  return out;
}

/** How many hits across the whole trace were resolved by name, not by code. */
export function countByName(result) {
  if (!result) return 0;
  return FAMILIES.reduce(
    (a, f) => a + (result[f] || []).filter((h) => h.via === "name").length,
    0
  );
}

/** Match modes for the date filter. */
export const DATE_MODES = ["any", "prod", "expiry", "both", "loose"];

/**
 * Narrow a whole trace to one lot.
 *
 * "both" is the strict reading: a row must carry BOTH dates and both must be
 * equal. That is what the screen used to do, and it is why steps came out
 * empty on lots that plainly exist — no two report families fill the same two
 * date cells. A branch receiving log has a production date but often no
 * expiry, a return slip has an expiry and never a production date, the
 * shipment's dates live on the sample row. Under "both" every one of those is
 * a non-match, so the lot looked empty while the records sat right there.
 *
 * "loose" is the honest reading and the one the screen now uses: a row is in
 * the lot when it AGREES on every date it actually carries and agrees on at
 * least one. A blank cell is unknown, not a contradiction — but a row with no
 * date at all still cannot claim membership, so nothing is over-counted.
 */
export function filterByDates(result, { mode = "any", prodDate = "", expiryDate = "" } = {}) {
  const wantProd = s(prodDate);
  const wantExp = s(expiryDate);

  if (mode === "loose") {
    if (!wantProd && !wantExp) return result;
    const keep = (hit) => {
      const d = datesOf(hit);
      if (wantProd && d.prodDate && d.prodDate !== wantProd) return false; // contradicts
      if (wantExp && d.expiryDate && d.expiryDate !== wantExp) return false; // contradicts
      const agreesProd = !!wantProd && d.prodDate === wantProd;
      const agreesExp = !!wantExp && d.expiryDate === wantExp;
      return agreesProd || agreesExp;
    };
    return {
      ...result,
      shipments: (result.shipments || []).filter(keep),
      receiving: (result.receiving || []).filter(keep),
      batches: (result.batches || []).filter(keep),
      dispatch: (result.dispatch || []).filter(keep),
      conditions: (result.conditions || []).filter(keep),
      returns: (result.returns || []).filter(keep),
    };
  }

  const useProd = (mode === "prod" || mode === "both") && !!wantProd;
  const useExp = (mode === "expiry" || mode === "both") && !!wantExp;
  if (!useProd && !useExp) return result;

  const keep = (hit) => {
    const d = datesOf(hit);
    if (useProd && d.prodDate !== wantProd) return false;
    if (useExp && d.expiryDate !== wantExp) return false;
    return true;
  };
  // A return slip records only the expiry date, never the production date, so
  // matching it on production would silently drop every return of the lot.
  const keepReturn = (hit) => (useExp ? s(hit.expiryDate) === wantExp : true);

  return {
    ...result,
    shipments: (result.shipments || []).filter(keep),
    receiving: (result.receiving || []).filter(keep),
    batches: (result.batches || []).filter(keep),
    dispatch: (result.dispatch || []).filter(keep),
    conditions: (result.conditions || []).filter(keepReturn),
    returns: (result.returns || []).filter(keepReturn),
  };
}

/** Headline numbers for the summary strip. */
/** Did this return come back from an outside customer rather than our own site? */
export const isCustomerReturn = (r) => (r?.channel || "branch") === "customer";

export function summarize({ shipments, receiving, batches, dispatch, conditions = [], returns = [] }) {
  const branches = new Set();
  receiving.forEach((r) => r.branch && branches.add(r.branch));
  batches.forEach((b) => b.branch && branches.add(b.branch));

  const customers = new Set();
  dispatch.forEach((d) => d.customer && customers.add(d.customer));

  conditions.forEach((c) => c.branch && branches.add(c.branch));

  const dates = [...shipments, ...receiving, ...batches, ...dispatch, ...conditions, ...returns]
    .map((x) => x.date)
    .filter(isYMD)
    .sort();

  return {
    shipmentCount: shipments.length,
    shipmentWeight: shipments.reduce((a, x) => a + x.weight, 0),
    shipmentQty: shipments.reduce((a, x) => a + x.qty, 0),
    receivingCount: receiving.length,
    receivingWeight: receiving.reduce((a, x) => a + x.weight, 0),
    branches: Array.from(branches).sort(),
    batchCount: batches.length,
    consumedWeight: batches
      .filter((b) => b.role === "input" || b.role === "both")
      .reduce((a, x) => a + x.rawWeight, 0),
    producedWeight: batches
      .filter((b) => b.role === "output" || b.role === "both")
      .reduce((a, x) => a + x.finalWeight, 0),
    dispatchCount: dispatch.length,
    dispatchQty: dispatch.reduce((a, x) => a + x.qty, 0),
    customers: Array.from(customers).sort(),
    conditionCount: conditions.length,
    conditionIssues: conditions.filter((c) => isConditionIssue(c.status)).length,
    conditionQty: conditions.reduce((a, x) => a + x.qty, 0),
    returnCount: returns.length,
    returnQty: returns.reduce((a, x) => a + x.qty, 0),
    customerReturnCount: returns.filter(isCustomerReturn).length,
    customerReturnQty: returns.filter(isCustomerReturn).reduce((a, x) => a + x.qty, 0),
    firstSeen: dates[0] || "",
    lastSeen: dates[dates.length - 1] || "",
    totalHits:
      shipments.length +
      receiving.length +
      batches.length +
      dispatch.length +
      conditions.length +
      returns.length,
  };
}

/** YYYY-MM-DD → DD/MM/YYYY, blank stays blank. */
export function fmtDMY(v) {
  const t = s(v).slice(0, 10);
  if (!isYMD(t)) return s(v);
  const [y, m, d] = t.split("-");
  return `${d}/${m}/${y}`;
}

/** Today and "n months ago", in the Dubai business day. */
export function todayYMD() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }
}

export function monthsAgoYMD(months) {
  const t = todayYMD();
  const [y, m, d] = t.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 - months, d));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dt.getUTCDate()
  ).padStart(2, "0")}`;
}
