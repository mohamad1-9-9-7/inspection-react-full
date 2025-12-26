import React, { useEffect, useMemo, useState } from "react";

/* ========= API (same style as your project) ========= */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" &&
      (process.env?.REACT_APP_API_URL ||
        process.env?.VITE_API_URL ||
        process.env?.RENDER_EXTERNAL_URL)) ||
    "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* Server report type */
const TYPE = "enoc_returns";

/* ========= Helpers ========= */
const safeArr = (v) => (Array.isArray(v) ? v : []);
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;

function norm(s) {
  return String(s ?? "").trim();
}

function parseISODate(iso) {
  const m = norm(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function todayDubaiISO() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

function daysBetween(a, b) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.floor((b.getTime() - a.getTime()) / ms);
}

/* ✅ number helpers */
function toNumber(v) {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isNaN(n) ? 0 : n;
}
function fmtQty(n) {
  const v = Number(n || 0);
  if (Number.isNaN(v)) return "0";
  const r = Math.round(v);
  return Math.abs(v - r) < 1e-9 ? String(r) : v.toFixed(2);
}

/* ===== Parse productName like: "[97101] FATTOUSH..." ===== */
function splitProduct(productName) {
  const s = norm(productName);
  const m = s.match(/^\[(\d+)\]\s*(.*)$/);
  if (!m) return { itemCode: "", product: s };
  return { itemCode: m[1], product: m[2] || "" };
}

/* ========= Extract rows robustly (matches ENOCReturnsInput payload) ========= */
function extractRowsFromReport(report) {
  const p = report?.payload || {};
  const reportDate = norm(p.reportDate || p.date || p.createdDate || "");

  const candidates =
    safeArr(p.items).length
      ? p.items
      : safeArr(p.entries).length
      ? p.entries
      : safeArr(p.rows).length
      ? p.rows
      : safeArr(p.data).length
      ? p.data
      : [];

  const rows = candidates.length ? candidates : Array.isArray(p) ? p : [];

  return safeArr(rows).map((row, idx) => {
    const r = row || {};

    const rawProductName = norm(
      r.productName || r.product || r.itemName || r.name || r.description || ""
    );
    const { itemCode, product } = splitProduct(rawProductName);

    const boxCode = norm(
      r.boxCode || r.boxNo || r.box || r.boxNumber || r.box_id || ""
    );
    const boxName = norm(r.boxName || r.box_label || r.boxTitle || "");
    const boxQty = r.boxQty ?? r.boxQTY ?? r.box_quantity ?? "";

    const location =
      norm(r.customButchery || "") ||
      norm(r.butchery || "") ||
      norm(r.pos || r.branch || r.location || p.branch || p.pos || "");

    const qtyType =
      norm(r.qtyType || r.unit || r.uom || r.quantityType || "") === "Other"
        ? norm(r.customQtyType || "")
        : norm(r.qtyType || r.unit || r.uom || r.quantityType || "");

    const action =
      norm(r.action || r.disposition || r.status || r.result || "") ===
      "Other..."
        ? norm(r.customAction || "")
        : norm(r.action || r.disposition || r.status || r.result || "");

    const images = Array.isArray(r.images)
      ? r.images.filter(Boolean)
      : Array.isArray(r.imgs)
      ? r.imgs.filter(Boolean)
      : [];

    // ✅ group key to keep items grouped per box (even if boxGroupId missing)
    const parts = [boxCode, boxName, String(boxQty ?? ""), location].map(norm);
    const fallbackKey = parts.some(Boolean) ? parts.join("||") : "";
    const groupKey = norm(r.boxGroupId || "") || fallbackKey;

    return {
      _id: `${getId(report) || "rep"}_${idx}`,
      reportId: getId(report) || "",
      reportDate,
      _idxInReport: idx,
      boxGroupId: norm(r.boxGroupId || ""),
      _groupKey: groupKey, // ✅ used for grouping in UI
      boxCode,
      boxName,
      boxQty,
      location,
      itemCode,
      productName: product || rawProductName,
      qty: r.quantity ?? r.qty ?? r.QTY ?? r.amount ?? "",
      qtyType,
      expiry: norm(
        r.expiry ||
          r.expiryDate ||
          r.expDate ||
          r.exp ||
          r.expiry_date ||
          ""
      ),
      remarks: norm(r.remarks || r.remark || r.comment || ""),
      action,
      imagesCount: images.length,
      images,
      raw: r,
    };
  });
}

/* ========= KPI helpers ========= */
function isExpired(expISO, todayISO) {
  const exp = parseISODate(expISO);
  const today = parseISODate(todayISO);
  if (!exp || !today) return false;
  return exp.getTime() < today.getTime();
}

function isNearExpiry(expISO, todayISO, days = 3) {
  const exp = parseISODate(expISO);
  const today = parseISODate(todayISO);
  if (!exp || !today) return false;
  const diff = daysBetween(today, exp);
  return diff >= 0 && diff <= days;
}

function sumQty(rows) {
  let s = 0;
  for (const r of rows) {
    const n = Number(String(r.qty ?? "").replace(/,/g, ""));
    if (!Number.isNaN(n)) s += n;
  }
  return s;
}

function matchText(row, q) {
  if (!q) return true;
  const hay = [
    row.reportDate,
    row.boxCode,
    row.boxName,
    row.boxQty,
    row.location,
    row.itemCode,
    row.productName,
    row.qty,
    row.qtyType,
    row.expiry,
    row.remarks,
    row.action,
  ]
    .map((x) => String(x ?? ""))
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

/* ========= Grouping by _groupKey in filtered list ========= */
function computeBoxGroups(rows) {
  const meta = Array(rows.length)
    .fill(null)
    .map(() => ({ span: 1, isStart: true, isEnd: true, groupNo: 0, gid: "" }));

  let groupNo = 0;
  let i = 0;

  while (i < rows.length) {
    const gid = String(
      rows?.[i]?._groupKey || rows?.[i]?.boxGroupId || ""
    ).trim();

    if (!gid) {
      groupNo += 1;
      meta[i] = { span: 1, isStart: true, isEnd: true, groupNo, gid: "" };
      i += 1;
      continue;
    }

    groupNo += 1;
    let j = i + 1;
    while (
      j < rows.length &&
      String(rows?.[j]?._groupKey || rows?.[j]?.boxGroupId || "").trim() === gid
    )
      j++;

    const span = j - i;
    meta[i] = { span, isStart: true, isEnd: span === 1, groupNo, gid };
    for (let k = i + 1; k < j; k++) {
      meta[k] = { span: 0, isStart: false, isEnd: k === j - 1, groupNo, gid };
    }
    i = j;
  }

  return meta;
}

/* ========= UI bits ========= */
function Ring({ valuePct = 0, tone = "green" }) {
  const pct = Math.max(0, Math.min(100, Number(valuePct) || 0));
  const colors =
    tone === "red"
      ? { a: "rgba(239,68,68,.95)", b: "rgba(239,68,68,.18)" }
      : tone === "amber"
      ? { a: "rgba(245,158,11,.95)", b: "rgba(245,158,11,.18)" }
      : { a: "rgba(34,197,94,.95)", b: "rgba(34,197,94,.18)" };

  return (
    <div
      className="ring"
      style={{
        background: `conic-gradient(${colors.a} ${pct}%, ${colors.b} ${pct}% 100%)`,
      }}
      aria-label={`Progress ${pct}%`}
      title={`${pct}%`}
    >
      <div className="ring__inner">{pct}%</div>
    </div>
  );
}

function KpiCard({ label, value, pct, tone }) {
  return (
    <div className="kpi">
      <Ring valuePct={pct} tone={tone} />
      <div className="kpi__meta">
        <div className="kpi__value">{value}</div>
        <div className="kpi__label">{label}</div>
      </div>
    </div>
  );
}

/* ========= Images Modal (View only) ========= */
function ImagesModal({ open, title, images, onClose }) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!open) return;
    const list = Array.isArray(images) ? images.filter(Boolean) : [];
    setPreview(list[0] || "");
  }, [open, images]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;
  const list = Array.isArray(images) ? images.filter(Boolean) : [];

  return (
    <div className="imgBack" onClick={onClose}>
      <div className="imgCard" onClick={(e) => e.stopPropagation()}>
        <div className="imgTop">
          <div className="imgTitle">
            🖼️ {title || "Images"}{" "}
            <span className="imgCount">({list.length})</span>
          </div>
          <button className="imgClose" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {preview ? (
          <div className="imgPreviewWrap">
            <img className="imgPreview" src={preview} alt="preview" />
          </div>
        ) : (
          <div className="muted" style={{ padding: 10 }}>
            No images.
          </div>
        )}

        <div className="imgThumbs">
          {list.map((src, i) => (
            <button
              key={`${src}_${i}`}
              className={`imgThumbBtn ${preview === src ? "active" : ""}`}
              onClick={() => setPreview(src)}
              title={`Image ${i + 1}`}
            >
              <img className="imgThumb" src={src} alt={`img-${i}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ENOCReturnsBrowseMenuView() {
  const todayISO = useMemo(() => todayDubaiISO(), []);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [reports, setReports] = useState([]);

  // filters
  const [selectedDate, setSelectedDate] = useState("");
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("ALL");
  const [action, setAction] = useState("ALL");
  const [quickDays, setQuickDays] = useState("ALL"); // ALL | 7 | 30

  // ✅ collapse/expand per box group
  const [openGroups, setOpenGroups] = useState(() => new Set());

  const groupKeyOf = (m) =>
    m?.gid ? `gid:${m.gid}` : `gn:${m?.groupNo || 0}`;

  const toggleGroup = (m) => {
    const key = groupKeyOf(m);
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // images modal
  const [imgOpen, setImgOpen] = useState(false);
  const [imgTitle, setImgTitle] = useState("");
  const [imgList, setImgList] = useState([]);

  const openImages = (row) => {
    const title =
      (row?.itemCode ? `[${row.itemCode}] ` : "") +
      (row?.productName || "Item");
    setImgTitle(title);
    setImgList(Array.isArray(row?.images) ? row.images : []);
    setImgOpen(true);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const sp = new URLSearchParams({ type: TYPE });
        const res = await fetch(`${API_BASE}/api/reports?${sp.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.data ?? [];
        setReports(list);
      } catch (e) {
        console.error(e);
        setErr("Failed to load ENOC returns.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const allRows = useMemo(() => {
    const out = [];
    for (const rep of safeArr(reports)) out.push(...extractRowsFromReport(rep));

    // ✅ sort to keep items grouped by box
    out.sort((a, b) => {
      const d = (b.reportDate || "").localeCompare(a.reportDate || "");
      if (d) return d;

      const rid = String(a.reportId || "").localeCompare(
        String(b.reportId || "")
      );
      if (rid) return rid;

      const g = String(a._groupKey || "").localeCompare(String(b._groupKey || ""));
      if (g) return g;

      return (a._idxInReport ?? 0) - (b._idxInReport ?? 0);
    });

    return out;
  }, [reports]);

  // dropdown values
  const locationList = useMemo(() => {
    const s = new Set();
    allRows.forEach((r) => r.location && s.add(r.location));
    return ["ALL", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [allRows]);

  const actionList = useMemo(() => {
    const s = new Set();
    allRows.forEach((r) => r.action && s.add(r.action));
    return ["ALL", ...Array.from(s).sort((a, b) => a.localeCompare(b))];
  }, [allRows]);

  // ✅ date tree (now includes BOX QTY sum per date without double-counting)
  const dateStats = useMemo(() => {
    const map = new Map(); // date -> {date, count(items), boxQtySum, boxCount, _seen:Set}

    for (const r of allRows) {
      const d = r.reportDate;
      if (!d) continue;

      if (!map.has(d)) {
        map.set(d, { date: d, count: 0, boxQtySum: 0, boxCount: 0, _seen: new Set() });
      }
      const rec = map.get(d);

      rec.count += 1;

      const gid = String(r._groupKey || r.boxGroupId || "").trim();
      if (gid && !rec._seen.has(gid)) {
        rec._seen.add(gid);
        rec.boxCount += 1;
        rec.boxQtySum += toNumber(r.boxQty);
      }
    }

    const dates = Array.from(map.values())
      .map(({ _seen, ...x }) => x)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (quickDays === "7" || quickDays === "30") {
      const days = Number(quickDays);
      const today = parseISODate(todayISO);
      return dates.filter((x) => {
        const d = parseISODate(x.date);
        if (!today || !d) return true;
        const diff = daysBetween(d, today);
        return diff >= 0 && diff <= days;
      });
    }

    return dates;
  }, [allRows, todayISO, quickDays]);

  const tree = useMemo(() => {
    const byYear = new Map();
    for (const { date, count, boxQtySum, boxCount } of dateStats) {
      const [y, m] = date.split("-");
      if (!y || !m) continue;
      if (!byYear.has(y)) byYear.set(y, new Map());
      const byMonth = byYear.get(y);
      if (!byMonth.has(m)) byMonth.set(m, []);
      byMonth.get(m).push({ date, count, boxQtySum, boxCount });
    }

    const years = Array.from(byYear.keys()).sort((a, b) => b.localeCompare(a));

    return years.map((y) => {
      const monthsMap = byYear.get(y);
      const months = Array.from(monthsMap.keys()).sort((a, b) => b.localeCompare(a));

      const monthsArr = months.map((m) => {
        const days = monthsMap.get(m).sort((a, b) => b.date.localeCompare(a.date));
        const countSum = days.reduce((s, x) => s + (x.count || 0), 0);
        const boxQtySumSum = days.reduce((s, x) => s + (x.boxQtySum || 0), 0);
        const boxCountSum = days.reduce((s, x) => s + (x.boxCount || 0), 0);

        return {
          m,
          days,
          count: countSum,
          boxQtySum: boxQtySumSum,
          boxCount: boxCountSum,
        };
      });

      const yearCount = monthsArr.reduce((s, x) => s + (x.count || 0), 0);
      const yearBoxQty = monthsArr.reduce((s, x) => s + (x.boxQtySum || 0), 0);
      const yearBoxCount = monthsArr.reduce((s, x) => s + (x.boxCount || 0), 0);

      return {
        y,
        months: monthsArr,
        count: yearCount,
        boxQtySum: yearBoxQty,
        boxCount: yearBoxCount,
      };
    });
  }, [dateStats]);

  // filtered rows
  const filteredRows = useMemo(() => {
    let rows = allRows;

    if (quickDays === "7" || quickDays === "30") {
      const days = Number(quickDays);
      const today = parseISODate(todayISO);
      rows = rows.filter((r) => {
        const d = parseISODate(r.reportDate);
        if (!today || !d) return true;
        const diff = daysBetween(d, today);
        return diff >= 0 && diff <= days;
      });
    }

    if (selectedDate) rows = rows.filter((r) => r.reportDate === selectedDate);
    if (location !== "ALL") rows = rows.filter((r) => r.location === location);
    if (action !== "ALL") rows = rows.filter((r) => r.action === action);
    if (q) rows = rows.filter((r) => matchText(r, q));

    return rows;
  }, [allRows, selectedDate, location, action, q, quickDays, todayISO]);

  const groupMeta = useMemo(() => computeBoxGroups(filteredRows), [filteredRows]);

  // ✅ Build groups [start, span, meta, rows] so we can collapse/expand by box
  const groups = useMemo(() => {
    const out = [];
    let i = 0;

    while (i < filteredRows.length) {
      const m = groupMeta[i] || {
        span: 1,
        isStart: true,
        isEnd: true,
        groupNo: i + 1,
        gid: "",
      };

      const span = m.span > 0 ? m.span : 1;
      out.push({
        start: i,
        span,
        meta: m,
        rows: filteredRows.slice(i, i + span),
      });

      i += span;
    }

    return out;
  }, [filteredRows, groupMeta]);

  // ✅ expand/collapse all buttons support
  const allGroupKeys = useMemo(() => {
    const s = new Set();
    for (const g of groups) {
      const m0 = g.meta || { span: 1, groupNo: g.start + 1, gid: "" };
      s.add(groupKeyOf(m0));
    }
    return Array.from(s);
  }, [groups]);

  const expandAllBoxes = () => setOpenGroups(new Set(allGroupKeys));
  const collapseAllBoxes = () => setOpenGroups(new Set());

  // ✅ Limit visible rows to avoid perf issues (same 800 as before)
  const MAX_ROWS = 800;
  const view = useMemo(() => {
    const list = [];
    let shown = 0;

    for (const g of groups) {
      const m0 = g.meta || { span: 1, groupNo: g.start + 1, gid: "" };
      const key = groupKeyOf(m0);
      const isOpen = openGroups.has(key);

      const wantRows = isOpen ? g.rows : g.rows.slice(0, 1);
      const remain = MAX_ROWS - shown;
      if (remain <= 0) break;

      const vis = wantRows.slice(0, remain);

      list.push({
        ...g,
        _m0: m0,
        _key: key,
        _isOpen: isOpen,
        _vis: vis,
      });

      shown += vis.length;
      if (shown >= MAX_ROWS) break;
    }

    return { list, shown };
  }, [groups, openGroups]); // eslint-disable-line react-hooks/exhaustive-deps

  // KPIs (based on filtered set)
  const kpis = useMemo(() => {
    const rows = filteredRows;
    const total = rows.length;

    const expired = rows.filter((r) => isExpired(r.expiry, todayISO)).length;
    const near = rows.filter((r) => isNearExpiry(r.expiry, todayISO, 3)).length;

    const low = (s) => String(s || "").toLowerCase();
    const condemnation = rows.filter((r) =>
      low(r.action).includes("condemn")
    ).length;
    const production = rows.filter((r) =>
      low(r.action).includes("production")
    ).length;

    const qtySum = sumQty(rows);
    const pct = (x) => (total ? Math.round((x / total) * 100) : 0);

    return {
      total,
      expired,
      near,
      condemnation,
      production,
      qtySum,
      pctExpired: pct(expired),
      pctNear: pct(near),
      pctCond: pct(condemnation),
      pctProd: pct(production),
    };
  }, [filteredRows, todayISO]);

  const HARD_BORDER = "3px solid rgba(2,6,23,.70)";

  const rowBorderStyle = (idx) => {
    const m = groupMeta[idx] || { isStart: true, isEnd: true };
    return {
      borderTop: m.isStart ? HARD_BORDER : "1px solid rgba(2,6,23,.08)",
      borderBottom: m.isEnd ? HARD_BORDER : "1px solid rgba(2,6,23,.08)",
    };
  };

  return (
    <div className="enoc-page" dir="ltr">
      <style>{`
        .enoc-page{
          min-height:100vh;
          padding:16px 16px 28px;
          font-family: Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          color:#0f172a;
          overflow-x:hidden;
          background:
            radial-gradient(900px 520px at 0% -10%, rgba(34,197,94,.22), transparent 60%),
            radial-gradient(900px 520px at 100% 0%, rgba(239,68,68,.22), transparent 60%),
            linear-gradient(135deg, #14532d 0%, #166534 25%, #991b1b 70%, #7f1d1d 100%);
        }
        .wrap{ width:100%; max-width:100%; margin:0 auto; }

        .topbar{
          display:flex; align-items:center; justify-content:space-between;
          gap:12px;
          padding:10px 12px;
          border-radius:14px;
          background: rgba(255,255,255,.12);
          backdrop-filter: blur(6px);
          box-shadow: 0 18px 45px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.18);
          color:#fff;
        }
        .title{display:flex; flex-direction:column; gap:2px;}
        .title h1{font-size:15px; margin:0; font-weight:900; letter-spacing:.3px; display:flex; align-items:center; gap:8px;}
        .title p{margin:0; font-size:11px; opacity:.92;}
        .brand{text-align:right; font-weight:900; letter-spacing:.5px; line-height:1.1;}
        .brand small{display:block; font-weight:700; opacity:.9; font-size:10px;}

        .kpi-row{
          margin-top:12px;
          display:grid;
          grid-template-columns: repeat(6, minmax(180px, 1fr));
          gap:10px;
        }
        @media (max-width: 1280px){ .kpi-row{ grid-template-columns: repeat(3, minmax(180px, 1fr)); } }
        @media (max-width: 760px){ .kpi-row{ grid-template-columns: repeat(2, minmax(160px, 1fr)); } }

        .kpi{
          display:flex; align-items:center; gap:10px;
          padding:10px 12px;
          border-radius:14px;
          background: rgba(255,255,255,.92);
          box-shadow: 0 12px 30px rgba(0,0,0,.18), inset 0 0 0 1px rgba(2,6,23,.06);
        }
        .ring{width:48px; height:48px; border-radius:999px; display:grid; place-items:center;}
        .ring__inner{
          width:36px; height:36px; border-radius:999px;
          display:grid; place-items:center;
          background: rgba(255,255,255,.92);
          font-weight:900; font-size:11px; color:#0f172a;
          box-shadow: inset 0 0 0 1px rgba(2,6,23,.08);
        }
        .kpi__meta{display:flex; flex-direction:column; gap:2px;}
        .kpi__value{font-weight:900; font-size:16px; color:#0f172a;}
        .kpi__label{font-weight:800; font-size:11px; color:#334155;}

        .filters{
          margin-top:12px;
          display:flex; flex-wrap:wrap; gap:10px;
          padding:10px 12px;
          border-radius:14px;
          background: rgba(255,255,255,.14);
          backdrop-filter: blur(6px);
          box-shadow: 0 18px 45px rgba(0,0,0,.18), inset 0 0 0 1px rgba(255,255,255,.18);
          color:#fff;
        }
        .chip{
          border:0; cursor:pointer;
          padding:7px 10px;
          border-radius:999px;
          font-weight:900;
          font-size:11px;
          background: rgba(255,255,255,.14);
          color:#fff;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.22);
        }
        .chip.active{
          background: linear-gradient(90deg, rgba(34,197,94,.35), rgba(239,68,68,.35));
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.35);
        }
        .field{display:flex; flex-direction:column; gap:5px; min-width:170px;}
        .field label{font-size:10px; font-weight:900; opacity:.92;}
        .field input, .field select{
          padding:9px 10px;
          border-radius:10px;
          border: 1px solid rgba(255,255,255,.25);
          background: rgba(255,255,255,.92);
          color:#0f172a;
          outline:none;
          font-weight:800;
          font-size:12px;
        }

        .grid{
          margin-top:12px;
          display:grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap:12px;
          width:100%;
          align-items:start;
        }
        @media (max-width: 1100px){ .grid{ grid-template-columns: 1fr; } }

        .panel{
          border-radius:16px;
          background: rgba(255,255,255,.92);
          box-shadow: 0 18px 45px rgba(0,0,0,.18), inset 0 0 0 1px rgba(2,6,23,.06);
          overflow:hidden;
          min-width:0;
        }

        .tree{padding:10px; max-height:560px; overflow:auto;}
        .tree h3{margin:4px 0 10px; font-size:12px; font-weight:900; color:#0f172a; display:flex; align-items:center; gap:8px;}
        .nodeY{margin-bottom:8px; border-radius:12px; overflow:hidden; border:1px solid rgba(2,6,23,.08);}
        .nodeY__head{
          padding:9px 10px;
          display:flex; align-items:center; justify-content:space-between;
          background: linear-gradient(90deg, rgba(34,197,94,.12), rgba(239,68,68,.12));
          font-weight:900;
          color:#0f172a;
          font-size:12px;
        }
        .nodeM{padding:8px 10px; border-top:1px dashed rgba(2,6,23,.10);}
        .nodeM__head{display:flex; align-items:center; justify-content:space-between; font-weight:900; color:#334155; font-size:11px; margin-bottom:6px;}
        .day{display:flex; align-items:center; justify-content:space-between; gap:8px; padding:7px 8px; border-radius:10px; cursor:pointer; font-weight:900; font-size:11px; color:#0f172a;}
        .day:hover{ background: rgba(2,6,23,.04); }
        .day.active{ background: linear-gradient(90deg, rgba(34,197,94,.14), rgba(239,68,68,.14)); box-shadow: inset 0 0 0 1px rgba(2,6,23,.10); }
        .badge{font-size:10px; padding:2px 8px; border-radius:999px; background: rgba(2,6,23,.06); color:#0f172a;}
        .badges{display:flex; gap:6px; align-items:center;}
        .badgeBox{background: rgba(37,99,235,.10);}

        .tableWrap{padding:10px; width:100%; min-width:0; overflow-x:hidden;}
        .tableTitle{
          display:flex; align-items:center; justify-content:space-between;
          gap:10px; margin-bottom:8px;
          flex-wrap:wrap;
          padding-right:16px;
          box-sizing:border-box;
        }
        .tableTitle h3{margin:0; font-size:12px; font-weight:900; color:#0f172a;}
        .tableTitle small{
          font-size:11px; font-weight:900; color:#475569;
          margin-left:auto;
          text-align:right;
          margin-right:12px;
          white-space:nowrap;
        }

        /* ✅ expand/collapse all buttons */
        .tableBtns{ display:flex; gap:8px; align-items:center; }
        .tbBtn{
          border:0;
          cursor:pointer;
          padding:6px 10px;
          border-radius:999px;
          font-weight:900;
          font-size:11px;
          background: rgba(2,6,23,.06);
          color:#0f172a;
          box-shadow: inset 0 0 0 1px rgba(2,6,23,.10);
        }
        .tbBtn:hover{ background: rgba(2,6,23,.10); }
        .tbBtn:disabled{ opacity:.45; cursor:not-allowed; }

        table{
          width:100%;
          max-width:100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 11px;
        }

        th{
          border: 1px solid rgba(2,6,23,.08);
          padding: 7px 8px;
          text-align:left;
          color:#0f172a;
          font-weight:900;
          font-size:11px;
          background: linear-gradient(90deg, rgba(34,197,94,.12), rgba(239,68,68,.12));
          white-space: normal;
          overflow: visible;
          text-overflow: clip;
          line-height: 1.1;
        }

        td{
          border: 1px solid rgba(2,6,23,.08);
          padding: 7px 8px;
          vertical-align: top;
          text-align:left;
          color:#0f172a;
          overflow:hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        td.wrap{ white-space: normal; word-break: break-word; line-height:1.25; }
        td.dateCell{ overflow: visible; }

        .pill{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          padding:3px 8px;
          border-radius:999px;
          font-weight:900;
          font-size:10px;
          border:1px solid rgba(2,6,23,.10);
          background: rgba(255,255,255,.9);
          color:#0f172a;
          max-width: 100%;
        }
        .pill--red{ background: rgba(239,68,68,.10); border-color: rgba(239,68,68,.20); }
        .pill--green{ background: rgba(34,197,94,.10); border-color: rgba(34,197,94,.20); }
        .pill--amber{ background: rgba(245,158,11,.10); border-color: rgba(245,158,11,.20); }

        .muted{color:#64748b; font-weight:900;}
        .loading{
          margin-top:12px;
          padding:10px 12px;
          border-radius:14px;
          background: rgba(255,255,255,.92);
          font-weight:900;
        }
        .error{
          margin-top:12px;
          padding:10px 12px;
          border-radius:14px;
          background: rgba(239,68,68,.12);
          border: 1px solid rgba(239,68,68,.25);
          color:#7f1d1d;
          font-weight:900;
        }

        /* Expand/Collapse button */
        .expBtn{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          border:0;
          cursor:pointer;
          padding:2px 8px;
          border-radius:10px;
          font-weight:900;
          font-size:12px;
          margin-right:6px;
          background: rgba(2,6,23,.06);
          color:#0f172a;
          box-shadow: inset 0 0 0 1px rgba(2,6,23,.10);
        }
        .expBtn:hover{ background: rgba(2,6,23,.10); }
        .moreHint{ display:block; margin-top:4px; font-size:10px; color:#64748b; font-weight:900; }

        /* Image button */
        .imgBtn{
          width:100%;
          border:0;
          cursor:pointer;
          padding:6px 8px;
          border-radius:10px;
          font-weight:900;
          font-size:11px;
          background: rgba(37,99,235,.10);
          color:#1d4ed8;
          box-shadow: inset 0 0 0 1px rgba(37,99,235,.18);
        }
        .imgBtn:hover{ background: rgba(37,99,235,.14); }

        /* Modal */
        .imgBack{
          position:fixed;
          inset:0;
          background: rgba(2,6,23,.55);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:9999;
          padding:16px;
        }
        .imgCard{
          width: min(1100px, 96vw);
          max-height: 86vh;
          overflow:auto;
          background:#fff;
          border-radius:16px;
          box-shadow: 0 20px 60px rgba(0,0,0,.35);
          border: 1px solid rgba(2,6,23,.12);
          padding: 12px 12px 14px;
        }
        .imgTop{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          padding: 6px 6px 10px;
          border-bottom: 1px solid rgba(2,6,23,.08);
        }
        .imgTitle{font-weight:900; color:#0f172a;}
        .imgCount{color:#64748b; font-weight:900;}
        .imgClose{
          border:0;
          background: transparent;
          cursor:pointer;
          font-weight:900;
          font-size:18px;
          color:#0f172a;
        }
        .imgPreviewWrap{
          margin-top:12px;
          display:flex;
          justify-content:center;
        }
        .imgPreview{
          max-width:100%;
          max-height:55vh;
          border-radius:14px;
          box-shadow: 0 10px 30px rgba(0,0,0,.18);
        }
        .imgThumbs{
          margin-top:12px;
          display:grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap:10px;
        }
        .imgThumbBtn{
          border:1px solid rgba(2,6,23,.10);
          background:#f8fafc;
          border-radius:12px;
          overflow:hidden;
          cursor:pointer;
          padding:0;
        }
        .imgThumbBtn.active{
          outline: 3px solid rgba(37,99,235,.35);
          border-color: rgba(37,99,235,.35);
        }
        .imgThumb{
          width:100%;
          height:140px;
          object-fit:cover;
          display:block;
        }
      `}</style>

      <div className="wrap">
        <div className="topbar">
          <div className="title">
            <h1>⛽ ENOC Returns — Browse (View Only)</h1>
            <p>
              Search + filter + date tree. Items are grouped by box (click ▸ to
              expand).
            </p>
          </div>
          <div className="brand">
            AL MAWASHI
            <small>Trans Emirates Livestock Trading L.L.C.</small>
          </div>
        </div>

        {loading && <div className="loading">Loading ENOC returns…</div>}
        {err && <div className="error">{err}</div>}

        <div className="kpi-row">
          <KpiCard label="Total items" value={kpis.total} pct={100} tone="green" />
          <KpiCard label="Expired" value={kpis.expired} pct={kpis.pctExpired} tone="red" />
          <KpiCard label="Near expiry (3d)" value={kpis.near} pct={kpis.pctNear} tone="amber" />
          <KpiCard label="Condemnation" value={kpis.condemnation} pct={kpis.pctCond} tone="red" />
          <KpiCard label="Use in production" value={kpis.production} pct={kpis.pctProd} tone="green" />
          <KpiCard label="Qty (sum)" value={Number(kpis.qtySum || 0).toFixed(2)} pct={100} tone="green" />
        </div>

        <div className="filters">
          <button
            type="button"
            className={`chip ${quickDays === "ALL" ? "active" : ""}`}
            onClick={() => setQuickDays("ALL")}
          >
            All dates
          </button>
          <button
            type="button"
            className={`chip ${quickDays === "7" ? "active" : ""}`}
            onClick={() => setQuickDays("7")}
          >
            Last 7 days
          </button>
          <button
            type="button"
            className={`chip ${quickDays === "30" ? "active" : ""}`}
            onClick={() => setQuickDays("30")}
          >
            Last 30 days
          </button>

          <div className="field" style={{ minWidth: 240 }}>
            <label>Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search (box, location, code, product, expiry, remarks, action...)"
              spellCheck={false}
            />
          </div>

          <div className="field">
            <label>Location</label>
            <select value={location} onChange={(e) => setLocation(e.target.value)}>
              {locationList.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              {actionList.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ minWidth: 190 }}>
            <label>Selected date</label>
            <input
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              placeholder="YYYY-MM-DD (optional)"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="grid">
          <div className="panel">
            <div className="tree">
              <h3>📅 Date Tree</h3>

              {!tree.length && (
                <div className="muted" style={{ fontSize: 12 }}>
                  No data loaded yet.
                </div>
              )}

              {tree.map((y) => (
                <div className="nodeY" key={y.y}>
                  <div className="nodeY__head">
                    <span>Year {y.y}</span>
                    <div className="badges">
                      <span className="badge" title="Items">{y.count}</span>
                      <span className="badge badgeBox" title="BOX QTY (sum)">BQ {fmtQty(y.boxQtySum)}</span>
                    </div>
                  </div>

                  {y.months.map((m) => (
                    <div className="nodeM" key={`${y.y}-${m.m}`}>
                      <div className="nodeM__head">
                        <span>Month {m.m}</span>
                        <div className="badges">
                          <span className="badge" title="Items">{m.count}</span>
                          <span className="badge badgeBox" title="BOX QTY (sum)">BQ {fmtQty(m.boxQtySum)}</span>
                        </div>
                      </div>

                      {m.days.map((d) => (
                        <div
                          key={d.date}
                          className={`day ${selectedDate === d.date ? "active" : ""}`}
                          onClick={() => setSelectedDate(d.date)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") setSelectedDate(d.date);
                          }}
                          title="Click to filter by this date"
                        >
                          <span>{d.date}</span>
                          <div className="badges">
                            <span className="badge" title="Items">{d.count}</span>
                            <span className="badge badgeBox" title="BOX QTY (sum)">BQ {fmtQty(d.boxQtySum)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="tableWrap">
              <div className="tableTitle">
                <h3>ENOC Returns Details</h3>

                <div className="tableBtns">
                  <button
                    type="button"
                    className="tbBtn"
                    onClick={expandAllBoxes}
                    disabled={!groups.length}
                    title="Expand all boxes in current results"
                  >
                    Expand all boxes
                  </button>
                  <button
                    type="button"
                    className="tbBtn"
                    onClick={collapseAllBoxes}
                    disabled={!openGroups.size}
                    title="Collapse all boxes"
                  >
                    Collapse all boxes
                  </button>
                </div>

                <small>
                  Showing <b>{filteredRows.length}</b> items
                  {selectedDate ? (
                    <>
                      {" "}
                      • Date: <b>{selectedDate}</b>
                    </>
                  ) : null}
                </small>
              </div>

              <table>
                <colgroup>
                  <col style={{ width: "4%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "6%" }} />
                  <col style={{ width: "5%" }} />
                </colgroup>

                <thead>
                  <tr>
                    <th>BOX</th>
                    <th>BOX CODE</th>
                    <th>BOX NAME</th>
                    <th>BOX QTY</th>
                    <th>LOCATION</th>
                    <th>ITEM CODE</th>
                    <th>PRODUCT</th>
                    <th>QTY</th>
                    <th>QTY TYPE</th>
                    <th>EXPIRY</th>
                    <th>REMARKS</th>
                    <th>ACTION</th>
                    <th>IMAGES</th>
                  </tr>
                </thead>

                <tbody>
                  {view.list.flatMap((g) => {
                    const m0 = g._m0 || { span: 1, groupNo: g.start + 1, gid: "" };
                    const isOpen = !!g._isOpen;

                    const vis = Array.isArray(g._vis) ? g._vis : [];
                    if (!vis.length) return [];

                    const rowSpan = vis.length;

                    const startIdx = g.start;
                    const displayedEndIdx = g.start + vis.length - 1;

                    const startBorders = rowBorderStyle(startIdx);
                    const endBorders = rowBorderStyle(displayedEndIdx);

                    const truncatedInThisGroup = isOpen && vis.length < g.span;
                    const mergedBorders = {
                      borderTop: startBorders.borderTop,
                      borderBottom: truncatedInThisGroup ? HARD_BORDER : endBorders.borderBottom,
                    };

                    return vis.map((r, ri) => {
                      const globalIdx = g.start + ri;

                      const baseBorders = rowBorderStyle(globalIdx);

                      const forceEnd =
                        (!isOpen && g.span > 1 && ri === vis.length - 1) ||
                        (truncatedInThisGroup && ri === vis.length - 1);

                      const borders = forceEnd
                        ? { ...baseBorders, borderBottom: HARD_BORDER }
                        : baseBorders;

                      const exp = r.expiry;
                      const expired = isExpired(exp, todayISO);
                      const near = !expired && isNearExpiry(exp, todayISO, 3);

                      return (
                        <tr key={`${r._id}_${ri}`}>
                          {ri === 0 && (
                            <td style={{ ...mergedBorders, fontWeight: 900 }} rowSpan={rowSpan}>
                              <button
                                type="button"
                                className="expBtn"
                                onClick={() => toggleGroup(m0)}
                                title={isOpen ? "Collapse box" : "Expand box"}
                              >
                                {isOpen ? "▾" : "▸"}
                              </button>
                              {m0.groupNo}
                              {!isOpen && g.span > 1 ? (
                                <span className="moreHint">+{g.span - 1} more</span>
                              ) : null}
                            </td>
                          )}

                          {ri === 0 && (
                            <td style={{ ...mergedBorders, fontWeight: 900 }} rowSpan={rowSpan}>
                              {r.boxCode || "-"}
                            </td>
                          )}

                          {ri === 0 && (
                            <td
                              style={{ ...mergedBorders }}
                              className="wrap"
                              rowSpan={rowSpan}
                              title={r.boxName || ""}
                            >
                              {r.boxName || "-"}
                            </td>
                          )}

                          {ri === 0 && (
                            <td style={{ ...mergedBorders, fontWeight: 900 }} rowSpan={rowSpan}>
                              {String(r.boxQty ?? "-")}
                            </td>
                          )}

                          {ri === 0 && (
                            <td
                              style={{ ...mergedBorders }}
                              className="wrap"
                              rowSpan={rowSpan}
                              title={r.location || ""}
                            >
                              {r.location || "-"}
                            </td>
                          )}

                          <td style={{ ...borders, fontWeight: 900 }}>{r.itemCode || "-"}</td>

                          <td style={{ ...borders }} className="wrap" title={r.productName || ""}>
                            {r.productName || "-"}
                          </td>

                          <td style={{ ...borders, fontWeight: 900 }}>{String(r.qty ?? "-")}</td>
                          <td style={{ ...borders }}>{r.qtyType || "-"}</td>

                          <td style={{ ...borders }} className="dateCell">
                            <span
                              className={`pill ${
                                expired ? "pill--red" : near ? "pill--amber" : "pill--green"
                              }`}
                              title={expired ? "Expired" : near ? "Near expiry" : "OK"}
                            >
                              {exp || "-"}
                            </span>
                          </td>

                          <td style={{ ...borders }} className="wrap" title={r.remarks || ""}>
                            {r.remarks || "-"}
                          </td>

                          <td style={{ ...borders }} className="wrap" title={r.action || ""}>
                            {r.action || "-"}
                          </td>

                          <td style={{ ...borders }}>
                            {r.imagesCount > 0 ? (
                              <button className="imgBtn" onClick={() => openImages(r)}>
                                View ({r.imagesCount})
                              </button>
                            ) : (
                              <span className="muted">0</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })}

                  {!filteredRows.length && (
                    <tr>
                      <td colSpan={13} className="muted" style={{ textAlign: "center", padding: 16 }}>
                        No results.
                      </td>
                    </tr>
                  )}

                  {filteredRows.length > MAX_ROWS && (
                    <tr>
                      <td colSpan={13} className="muted" style={{ textAlign: "center", padding: 12 }}>
                        Showing first {MAX_ROWS} rows only (performance safety).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="muted" style={{ marginTop: 8, fontSize: 11 }}>
                * Click the arrow (▸/▾) in the BOX column to expand/collapse the box items.
              </div>
            </div>
          </div>
        </div>
      </div>

      <ImagesModal
        open={imgOpen}
        title={imgTitle}
        images={imgList}
        onClose={() => setImgOpen(false)}
      />
    </div>
  );
}
