// D:\inspection-react-full\src\pages\admin\AllReportsView.jsx
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { REPORTS_URL } from "../monitor/branches/shipment_recc/qcsRawApi";

/* ===== Helpers ===== */
const pad2 = (v) => String(v || "").padStart(2, "0");
const toYMD = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x)) return "";
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};
const today = () => new Date().toISOString().slice(0, 10);

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, { headers: { Accept: "application/json" }, ...opts });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

const pick = (obj, paths, fallback = "") => {
  for (const p of paths) {
    let cur = obj;
    const parts = p.split(".");
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (cur && Object.prototype.hasOwnProperty.call(cur, part)) {
        cur = cur[part];
      } else {
        cur = undefined;
        break;
      }
    }
    if (cur !== undefined && cur !== null && cur !== "") return cur;
  }
  return fallback;
};

/* ===== Normalizers ===== */
/* يقبل:
   - YYYY-MM-DD / DD-MM-YYYY / DD/MM/YYYY
   - YYYY-MM / YYYY/MM / MM-YYYY / MM/YYYY  (شهر/سنة)
*/
const MONTH_RE_1 = /^(\d{4})[\/\-](\d{1,2})$/;     // 2025-07 أو 2025/07
const MONTH_RE_2 = /^(\d{1,2})[\/\-](\d{4})$/;     // 07-2025 أو 07/2025
const DATE_RE =
  /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})|(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2})|(\d{1,2}[\/\-]\d{4})/g;

const normDate = (v) => {
  if (!v) return "";
  const s = String(v).trim();
  // يوم/شهر/سنة أو سنة-شهر-يوم
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m1) {
    let d = +m1[1], mn = +m1[2], y = +m1[3];
    if (y < 100) y += 2000;
    return `${y}-${pad2(mn)}-${pad2(d)}`;
  }
  // شهر/سنة
  let m = s.match(MONTH_RE_1);
  if (m) {
    const y = +m[1], mn = +m[2];
    return `${y}-${pad2(mn)}`; // نُبقيها شهر/سنة
  }
  m = s.match(MONTH_RE_2);
  if (m) {
    const mn = +m[1], y = +m[2];
    return `${y}-${pad2(mn)}`;
  }
  // محاولة أخيرة
  const asYMD = toYMD(s);
  return asYMD || "";
};

function extractAllDates(value) {
  if (!value) return [];
  const s = String(value);
  const seen = new Set();
  const out = [];
  const matches = s.match(DATE_RE) || [];
  for (const raw of matches) {
    const n = normDate(raw);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  // الترتيب يعمل لكل من YYYY-MM و YYYY-MM-DD
  return out.sort();
}

function formatDateList(arr) {
  if (!arr || arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  return `${arr[0]} — ${arr[arr.length - 1]}`;
}

/* استنتاج Slaughter/Expiry من الهيدر/الجنرال/العيّنات/الصفوف (يدعم تعدد التواريخ وصيغة شهر/سنة) */
function deriveSlaughterAndExpiry(payload) {
  const header = payload?.header || payload || {};
  const gi = payload?.generalInfo || payload?.info || {};

  const sDates = [];
  const eDates = [];

  // Header + General
  extractAllDates(
    pick({ header, gi }, [
      "header.slaughterDate","header.dateOfSlaughter",
      "header.productionDate","header.manufactureDate","header.manufacturedDate",
      "header.mfgDate","header.mfd","header.prodDate","header.dateOfProduction",
      "gi.slaughterDate","gi.dateOfSlaughter","gi.productionDate",
      "gi.manufactureDate","gi.manufacturedDate","gi.mfgDate","gi.mfd","gi.prodDate"
    ], "")
  ).forEach(d => sDates.push(d));

  extractAllDates(
    pick({ header, gi }, [
      "header.expiryDate","header.expDate","header.expiry",
      "header.bestBefore","header.bestBeforeDate","header.bbd",
      "header.useBy","header.useByDate",
      "gi.expiryDate","gi.expDate","gi.expiry",
      "gi.bestBefore","gi.bestBeforeDate","gi.bbd","gi.useBy","gi.useByDate"
    ], "")
  ).forEach(d => eDates.push(d));

  // Samples
  const samples = Array.isArray(payload?.samples) ? payload.samples : [];
  for (const s of samples) {
    extractAllDates(
      pick(s, ["slaughterDate","dateOfSlaughter","productionDate","manufactureDate","manufacturedDate","mfgDate","mfd","prodDate"], "")
    ).forEach(d => sDates.push(d));
    extractAllDates(
      pick(s, ["expiryDate","expDate","expiry","bestBefore","bestBeforeDate","bbd","useBy","useByDate"], "")
    ).forEach(d => eDates.push(d));
  }

  // Rows / products
  const rows = payload?.rows || payload?.products || payload?.items || payload?.lines || payload?.details || [];
  if (Array.isArray(rows)) {
    for (const r of rows) {
      extractAllDates(
        pick(r, ["slaughterDate","dateOfSlaughter","productionDate","manufactureDate","manufacturedDate","mfgDate","mfd","prodDate"], "")
      ).forEach(d => sDates.push(d));
      extractAllDates(
        pick(r, ["expiryDate","expDate","expiry","bestBefore","bestBeforeDate","bbd","useBy","useByDate"], "")
      ).forEach(d => eDates.push(d));
    }
  }

  const uniqS = Array.from(new Set(sDates)).sort();
  const uniqE = Array.from(new Set(eDates)).sort();

  return {
    slaughterDate: formatDateList(uniqS),
    expiryDate:    formatDateList(uniqE),
  };
}

/* توحيد سجل QCS RAW */
function normalizeQcsRaw(r) {
  const payload = (r && (r.payload || r)) || {};
  const header = payload.header || payload;
  const gi = payload.generalInfo || payload.info || {};

  const createdAt = r?.createdAt || payload?.createdAt || "";
  const reportDate =
    pick(payload, ["reportDate","date","meta.reportDate","createdAt"]) ||
    createdAt || "";

  const invoice =
    pick(header, ["invoiceNo","invoice","invNo","invoiceNumber","invoice_no"]) ||
    pick(gi, ["invoiceNo","invoice","invNo","invoiceNumber","invoice_no"]) ||
    "";

  const awb =
    pick(header, [
      "airWayBillNo","airWayBill","airwayBill","airway_bill","awb","AWB","airWaybillNo","airwayBillNo"
    ]) ||
    pick(gi, [
      "airWayBillNo","airWayBill","airwayBill","airway_bill","awb","AWB","airWaybillNo","airwayBillNo"
    ]) ||
    "";

  const supplier =
    pick(header, ["supplierName","supplier","vendor","vendorName"]) ||
    pick(gi, ["supplierName","supplier","vendor","vendorName"]) ||
    pick(payload, ["supplierName","supplier","vendor"], "—");

  const shipmentType =
    pick(header, ["shipmentType","shipment","brandType","category","productGroup"], "") ||
    pick(gi, ["shipmentType","shipment"], "");

  const { slaughterDate, expiryDate } = deriveSlaughterAndExpiry(payload);

  return {
    id: r?.id || r?._id || payload?.id || payload?._id || "",
    createdAt,
    reportDate: toYMD(reportDate),
    supplier: supplier || "—",
    shipmentType,
    invoiceNo: String(invoice || "—"),
    awb: String(awb || "—"),
    status: pick(header, ["shipmentStatus","status"], "—"),
    totalQty: pick(header, ["totalQuantity","totalQty","qtyTotal","totalQuantityPcs"], ""),
    totalWeightKg: pick(header, ["totalWeight","totalWeightKg","weightKg","weight"], ""),
    slaughterDate,
    expiryDate,
  };
}

/* مفتاح تجميع لمنع التكرار */
function signatureFromRaw(doc) {
  const payload = doc?.payload || doc || {};
  const header = payload.header || payload;
  const gi = payload.generalInfo || payload.info || {};
  const date = toYMD(
    pick(payload, ["reportDate","date","meta.reportDate","createdAt"]) || doc?.createdAt || ""
  );
  const shipmentType =
    (pick(header, ["shipmentType","shipment","brandType","category","productGroup"], "") ||
     pick(gi, ["shipmentType","shipment"], "")).toString().trim().toUpperCase();
  const supplier =
    (pick(header, ["supplierName","supplier","vendor","vendorName"], "") ||
     pick(gi, ["supplierName","supplier","vendor","vendorName"], "")).toString().trim().toUpperCase();
  const invoice = (pick(header, ["invoiceNo","invoice","invNo","invoiceNumber","invoice_no"], "") ||
                   pick(gi, ["invoiceNo","invoice","invNo","invoiceNumber","invoice_no"], "")).toString().trim().toUpperCase();
  const awb = (pick(header, ["airWayBillNo","airWayBill","airwayBill","awb","AWB","airWaybillNo","airwayBillNo"], "") ||
               pick(gi, ["airWayBillNo","airWayBill","airwayBill","awb","AWB","airWaybillNo","airwayBillNo"], "")).toString().trim().toUpperCase();

  const idPart = invoice || awb || "NA";
  return [date, shipmentType, idPart, supplier].join("|");
}

/* جلب QCS RAW فقط + إزالة التكرار */
async function fetchQcsRawOnly() {
  const q = `${REPORTS_URL}?type=${encodeURIComponent("qcs_raw_material")}&limit=500`;
  const { ok, data } = await jsonFetch(q);
  const items = Array.isArray(data) ? data : (data && (data.data || data.items || data.reports)) || [];
  if (!ok) return [];

  const groups = new Map();
  for (const r of items) {
    const sig = signatureFromRaw(r);
    const prev = groups.get(sig);
    if (!prev) {
      groups.set(sig, r);
    } else {
      const a = new Date(prev?.createdAt || prev?.payload?.createdAt || 0).getTime();
      const b = new Date(r?.createdAt || r?.payload?.createdAt || 0).getTime();
      if (b >= a) groups.set(sig, r); // احتفظ بالأحدث
    }
  }
  return Array.from(groups.values());
}

/* ===== المكوّن الأساسي ===== */
export default function AllReportsView() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState(""); // عرض الكل إذا فارغ
  const [to, setTo] = useState("");     // عرض الكل إذا فارغ
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const items = await fetchQcsRawOnly();
        if (mounted) setRaw(items);
      } catch (e) {
        if (mounted) setErr(e?.message || "Fetch failed");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const rows = useMemo(() => {
    const norm = raw.map(normalizeQcsRaw);

    const inRange = norm.filter((r) => {
      if (!from && !to) return true;
      const d = r.reportDate;
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });

    const qx = String(q || "").trim().toLowerCase();
    if (!qx) return inRange;

    return inRange.filter((r) => {
      const hay =
        [
          r.supplier,
          r.shipmentType,
          r.invoiceNo,
          r.awb,
          r.status
        ]
          .join(" ")
          .toLowerCase();
      return hay.indexOf(qx) !== -1;
    });
  }, [raw, q, from, to]);

  const exportExcel = () => {
    const data = rows.map((r) => ({
      "Report Date": r.reportDate,
      "Supplier": r.supplier,
      "Shipment Type": r.shipmentType,
      "Invoice No": r.invoiceNo,
      "Air Way Bill": r.awb,
      "Status": r.status,
      "Total Qty (pcs)": r.totalQty,
      "Total Weight (kg)": r.totalWeightKg,
      "Slaughter Date": r.slaughterDate,
      "Expiry Date": r.expiryDate
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QCS RAW");
    XLSX.writeFile(wb, `QCS_RAW_Shipments_${today()}.xlsx`);
  };

  const dark = "#111827"; // أسود غامق

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Shipment Summary — QCS RAW (qcs_raw_material)</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 140px 140px 140px",
          gap: 8,
          alignItems: "center",
          marginBottom: 12
        }}
      >
        <input
          type="text"
          placeholder="بحث: Supplier / Invoice / AWB / Status ..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            padding: "10px 12px",
            border: `2px solid ${dark}`,
            borderRadius: 8
          }}
        />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          style={{ padding: "10px 12px", border: `2px solid ${dark}`, borderRadius: 8 }}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          style={{ padding: "10px 12px", border: `2px solid ${dark}`, borderRadius: 8 }}
        />
        <button
          onClick={exportExcel}
          style={{
            padding: "10px 12px",
            background: "#2563eb",
            color: "#fff",
            border: "0",
            borderRadius: 8,
            cursor: "pointer"
          }}
        >
          Export Excel
        </button>
      </div>

      <div style={{ overflow: "auto", border: `2px solid ${dark}`, borderRadius: 8 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: `2px solid ${dark}`
          }}
        >
          <thead>
            <tr>
              <Th dark={dark}>#</Th>
              <Th dark={dark}>Date</Th>
              <Th dark={dark}>Supplier</Th>
              <Th dark={dark}>Shipment</Th>
              <Th dark={dark}>Invoice</Th>
              <Th dark={dark}>AWB</Th>
              <Th dark={dark}>Status</Th>
              <Th dark={dark}>Qty (pcs)</Th>
              <Th dark={dark}>Weight (kg)</Th>
              <Th dark={dark}>Slaughter Date</Th>
              <Th dark={dark}>Expiry Date</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><Td colSpan={11} dark={dark}>Loading…</Td></tr>
            ) : err ? (
              <tr><Td colSpan={11} dark={dark}>&#9888; {err}</Td></tr>
            ) : rows.length === 0 ? (
              <tr><Td colSpan={11} dark={dark}>No data</Td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.reportDate}-${r.shipmentType}-${r.invoiceNo}-${r.awb}-${i}`}>
                  <Td dark={dark}>{i + 1}</Td>
                  <Td dark={dark}>{r.reportDate}</Td>
                  <Td dark={dark}>{r.supplier}</Td>
                  <Td dark={dark}>{r.shipmentType}</Td>
                  <Td dark={dark}>{r.invoiceNo}</Td>
                  <Td dark={dark}>{r.awb}</Td>
                  <Td dark={dark}>{r.status}</Td>
                  <Td dark={dark}>{r.totalQty}</Td>
                  <Td dark={dark}>{r.totalWeightKg}</Td>
                  <Td dark={dark}>{r.slaughterDate}</Td>
                  <Td dark={dark}>{r.expiryDate}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===== عناصر الجدول ===== */
function Th({ children, dark = "#111827" }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "10px 12px",
        fontWeight: 800,
        color: dark,
        border: `2px solid ${dark}`,
        whiteSpace: "nowrap",
        background: "#ffffff"
      }}
    >
      {children}
    </th>
  );
}
function Td({ children, colSpan, dark = "#111827" }) {
  return (
    <td
      colSpan={colSpan}
      style={{
        padding: "8px 12px",
        verticalAlign: "top",
        whiteSpace: "nowrap",
        border: `2px solid ${dark}`
      }}
    >
      {children}
    </td>
  );
}
