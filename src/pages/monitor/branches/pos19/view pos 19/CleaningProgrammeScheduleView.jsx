// src/pages/monitor/branches/pos19/pos19_views/CleaningProgrammeScheduleView.jsx
import React, { useEffect, useMemo, useState } from "react";
import unionLogo from "../../../../../assets/unioncoop-logo.png";

/* ===== API base (aligned with inputs) ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof process !== "undefined" &&
      (process.env.REACT_APP_API_URL ||
        process.env.VITE_API_URL ||
        process.env.RENDER_EXTERNAL_URL)) ||
    "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ===== Constants ===== */
const TYPE = "pos19_cleaning_programme_schedule";
const BRANCH = "POS 19";

/* ====== Styles ====== */
const gridStyle = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  fontSize: 12,
};
const thCell = {
  border: "1px solid #1f3b70",
  padding: "8px 6px",
  textAlign: "center",
  whiteSpace: "pre-line",
  fontWeight: 800,
  background: "#e9f0ff",
  color: "#0b1f4d",
};
const tdCell = {
  border: "1px solid #1f3b70",
  padding: "8px 6px",
  verticalAlign: "top",
  whiteSpace: "pre-line",
  color: "#0b1f4d",
};
function btnStyle(bg) {
  return {
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  };
}
const btnGhost = {
  background: "#f3f4f6",
  color: "#111827",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

/* ===== Utils ===== */
function normalizeMonth(m) {
  if (!m) return "";
  if (/^\d{4}-\d{2}$/.test(m)) return m;
  try {
    const d = new Date(`${m} 1, ${new Date().getFullYear()}`);
    if (!isNaN(d)) {
      const y = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      return `${y}-${mm}`;
    }
  } catch {}
  return String(m);
}
function useQueryParam(name) {
  return useMemo(() => {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get(name) || "";
    } catch {
      return "";
    }
  }, [name]);
}
async function loadImageDataURL(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* Header line */
const HeaderLine = ({ label, children }) => (
  <div style={{ display: "contents" }}>
    <div style={{ padding: "6px 8px", fontWeight: 700 }}>{label}</div>
    <div style={{ border: "1px solid #1f3b70", padding: "6px 8px" }}>
      {children}
    </div>
  </div>
);

export default function CleaningProgrammeScheduleView() {
  const monthParam = normalizeMonth(useQueryParam("month"));
  const idParam = useQueryParam("id");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reports, setReports] = useState([]);
  const [active, setActive] = useState(null);
  const payload = active?.payload || null;

  /* ===== Months list (chronological) ===== */
  const allMonths = useMemo(() => {
    const set = new Set(
      reports.map((r) => normalizeMonth(r?.payload?.month)).filter(Boolean)
    );
    const arr = Array.from(set).filter((m) => /^\d{4}-\d{2}$/.test(m));
    arr.sort((a, b) => a.localeCompare(b)); // oldest → newest
    return arr;
  }, [reports]);

  const currentMonthIndex = useMemo(() => {
    const mon = normalizeMonth(payload?.month);
    if (!mon) return -1;
    return allMonths.findIndex((m) => m === mon);
  }, [allMonths, payload?.month]);

  function selectByMonth(m) {
    const mm = normalizeMonth(m);
    const found = reports.find(
      (r) => normalizeMonth(r?.payload?.month) === mm
    );
    if (found) setActive(found);
  }
  function gotoPrevMonth() {
    if (currentMonthIndex > 0) selectByMonth(allMonths[currentMonthIndex - 1]);
  }
  function gotoNextMonth() {
    if (
      currentMonthIndex >= 0 &&
      currentMonthIndex < allMonths.length - 1
    ) {
      selectByMonth(allMonths[currentMonthIndex + 1]);
    }
  }

  /* ===== Fetch monthly reports ===== */
  async function fetchReports() {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(
        `${API_BASE}/api/reports?${q.toString()}`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data) ? data : data?.data ?? [];

      const filtered = list.filter((r) => {
        const p = r?.payload || {};
        const br = p.branch || r.branch;
        const t = r?.type;
        const m = normalizeMonth(p.month);
        return t === TYPE && br === BRANCH && /^\d{4}-\d{2}$/.test(m);
      });

      filtered.sort((a, b) => {
        const ma = normalizeMonth(a?.payload?.month);
        const mb = normalizeMonth(b?.payload?.month);
        return mb.localeCompare(ma); // newest first
      });

      setReports(filtered);

      let selected = null;
      if (idParam)
        selected = filtered.find(
          (r) => r._id === idParam || r?.uniqueKey === idParam
        );
      if (!selected && monthParam) {
        const mm = normalizeMonth(monthParam);
        selected = filtered.find(
          (r) => normalizeMonth(r?.payload?.month) === mm
        );
      }
      if (!selected) selected = filtered[0] || null;
      setActive(selected || null);
    } catch (e) {
      setError(e?.message || "Failed to fetch reports.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line
  }, [monthParam, idParam]);

  /* ===== Toolbar actions ===== */
  function handleRefresh() {
    fetchReports();
  }
  function handlePrint() {
    window.print();
  }
  function handleCopyLink() {
    try {
      const id = active?._id || active?.uniqueKey || "";
      const url = new URL(window.location.href);
      if (id) url.searchParams.set("id", id);
      else if (payload?.month)
        url.searchParams.set("month", normalizeMonth(payload.month));
      navigator.clipboard.writeText(url.toString());
      alert("✅ تم نسخ رابط العرض إلى الحافظة.");
    } catch {
      alert("❌ لم يتم النسخ. حاول يدويًا.");
    }
  }

  /* ========= XLSX helpers: تلقائي لارتفاع الصفوف ========= */
  function estimateLines(text = "", colWidthChars = 10) {
    // colWidthChars ~ عدد الأحرف الممكنة في السطر الواحد بحسب عرض العمود
    if (!text) return 1;
    const parts = String(text).split(/\r?\n/);
    let lines = 0;
    for (const p of parts) {
      const len = p.length || 1;
      lines += Math.max(1, Math.ceil(len / Math.max(1, colWidthChars)));
    }
    return Math.max(1, lines);
  }
  function rowHeightFor(lines, fontSize = 11, lineHeight = 1.25, min = 18, max = 160) {
    // ارتفاع تقريبي بالبوينت
    return Math.max(min, Math.min(max, Math.ceil(lines * (fontSize * lineHeight))));
  }

  /* ===== XLSX Export (ExcelJS + FileSaver) with logo, header, and auto row height ===== */
  async function handleExportXLSX() {
    if (!payload) {
      alert("لا يوجد بيانات للتصدير.");
      return;
    }
    try {
      const ExcelJS =
        (await import("exceljs")).default || (await import("exceljs"));
      const FileSaver = await import("file-saver");

      const mon = normalizeMonth(payload.month) || "";
      const standard =
        payload.standard || "Free of dirt, grease, and food debris";

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Cleaning Schedule");

      // ألوان وحدود
      const borderThin = { style: "thin", color: { argb: "1F3B70" } };
      const blueHdr = "E9F0FF";
      const lightBand = "F5F8FF";

      // 12 عمود (مثل الجدول في الصفحة)
      // نحتفظ بعرض الأعمدة كوحدات Excel (تقريبًا عدد الأحرف)
      const COLS = [
        { key: "item", width: 28 }, // Item
        { key: "equip", width: 42 }, // Equipment
        { key: "method", width: 62 }, // Method
        { key: "freq", width: 26 }, // Freq
        { key: "date", width: 16 }, // Date
        { key: "cleaned", width: 20 }, // Cleaned
        { key: "monitored", width: 20 }, // Monitored
        { key: "_pad1", width: 0.1 },
        { key: "_pad2", width: 0.1 },
        { key: "_pad3", width: 0.1 },
        { key: "_pad4", width: 0.1 },
        { key: "month", width: 12 }, // Month reference
      ];
      ws.columns = COLS.map((c) => ({ width: c.width }));

      // العنوان الرئيسي
      ws.mergeCells("A1:L1");
      ws.getCell("A1").value = "UNION COOP";
      ws.getCell("A1").font = { bold: true, size: 14 };
      ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 22;

      ws.mergeCells("A2:L2");
      ws.getCell("A2").value = "CLEANING PROGRAMME SCHEDULE";
      ws.getCell("A2").font = { bold: true, size: 12 };
      ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(2).height = 20;

      // مربع اللوغو يسارًا A3:D9
      ws.mergeCells("A3:D9");
      const dataUrl = await loadImageDataURL(unionLogo);
      if (dataUrl) {
        const base64 = dataUrl.split(",")[1];
        const imgId = wb.addImage({ base64, extension: "png" });
        ws.addImage(imgId, {
          tl: { col: 0.2, row: 2.5 },
          ext: { width: 220, height: 90 },
          editAs: "oneCell",
        });
      }
      // حدود مربع اللوغو
      for (let r = 3; r <= 9; r++) {
        for (let c = 1; c <= 4; c++)
          ws.getCell(r, c).border = {
            top: borderThin,
            left: borderThin,
            bottom: borderThin,
            right: borderThin,
          };
      }

      // شبكة البيانات يمين اللوغو (E..L, rows 3..9)
      const right = (r, label, value) => {
        ws.getCell(r, 5).value = label;
        ws.getCell(r, 6).value = value;
        ws.mergeCells(r, 6, r, 12);
        for (let c = 5; c <= 12; c++) {
          const cell = ws.getCell(r, c);
          cell.border = {
            top: borderThin,
            left: borderThin,
            bottom: borderThin,
            right: borderThin,
          };
          if (c === 5) cell.font = { bold: true };
          cell.alignment = { vertical: "middle", wrapText: true };
        }
        ws.getRow(r).height = 18;
      };
      right(3, "Union Coop Form Ref. No:", payload.formRef || "UC/HACCP/BR/F13A-1");
      right(
        4,
        "Cleaning Program Schedule (Butchery) — Classification :",
        payload.classification || "Official"
      );
      right(5, "Month:", mon);
      right(6, "Page", "1 of 11");
      right(7, "Rev. Date:", payload.revDate || "");
      right(8, "Rev. No:", payload.revNo || "");
      right(9, "Location", payload.location || "BUTCHERY");

      // سطر الـ Standard (A10:L10)
      ws.mergeCells("A10:L10");
      const std = ws.getCell("A10");
      std.value = `Standard  ${standard}`;
      std.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBand } };
      std.font = { bold: true };
      std.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
      ws.getRow(10).height = 18;

      // صف فارغ فاصل
      ws.getRow(11).height = 4;

      // رؤوس الجدول (A12:G12)
      const headRow = ws.getRow(12);
      headRow.values = [
        "Item/Area to Clean",
        "Equipment / Chemical",
        "Cleaning Method",
        "Frequency & Proposed Date\nW1 • W2 • W3 • W4",
        "Date of Cleaning",
        "Cleaned By",
        "Monitored By",
      ];
      headRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: blueHdr },
        };
        cell.border = {
          top: borderThin,
          left: borderThin,
          bottom: borderThin,
          right: borderThin,
        };
      });
      headRow.height = 32;

      // بيانات الجدول مع حساب ارتفاع الصف ديناميكيًا
      let excelRowIdx = 13;
      const fontSize = 11;

      (payload.schedule || []).forEach((row) => {
        const p = row?.proposed || {};
        const freq =
          `${row.frequency || ""}\n` +
          `W1: ${p.W1 || "-"} • W2: ${p.W2 || "-"} • W3: ${p.W3 || "-"} • W4: ${p.W4 || "-"}`;

        const values = [
          row.item || "",
          row.equipment || "",
          row.method || "",
          freq,
          row.dateOfCleaning || "",
          row.cleanedBy || "",
          row.monitoredBy || "",
        ];

        ws.getRow(excelRowIdx).values = values;
        ws.getRow(excelRowIdx).eachCell((cell) => {
          cell.border = {
            top: borderThin,
            left: borderThin,
            bottom: borderThin,
            right: borderThin,
          };
          cell.alignment = { vertical: "top", wrapText: true };
        });

        // تقدير عدد الأسطر في كل عمود (اعتمادًا على عرض العمود التقريبي بالحروف)
        const linesItem = estimateLines(values[0], COLS[0].width);
        const linesEquip = estimateLines(values[1], COLS[1].width);
        const linesMethod = estimateLines(values[2], COLS[2].width);
        const linesFreq = estimateLines(values[3], COLS[3].width);
        const linesDate = estimateLines(values[4], COLS[4].width);
        const linesCleaned = estimateLines(values[5], COLS[5].width);
        const linesMon = estimateLines(values[6], COLS[6].width);

        const maxLines = Math.max(
          linesItem,
          linesEquip,
          linesMethod,
          linesFreq,
          linesDate,
          linesCleaned,
          linesMon
        );

        ws.getRow(excelRowIdx).height = rowHeightFor(maxLines, fontSize, 1.25, 20, 220);
        excelRowIdx++;
      });

      // حفظ الملف
      const buf = await wb.xlsx.writeBuffer();
      const filename = `POS19_CleaningProgramme_${mon || "month"}.xlsx`;
      const blob = new Blob([buf], {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      FileSaver.saveAs(blob, filename);
    } catch (e) {
      console.error(e);
      alert(
        "⚠️ XLSX export failed. Please ensure exceljs & file-saver are installed."
      );
    }
  }

  async function handleDelete() {
    if (!active) return;
    if (!window.confirm("سيتم حذف هذا التقرير نهائيًا. هل أنت متأكد؟")) return;
    try {
      const id = active?._id;
      let ok = false;
      if (id) {
        const res = await fetch(`${API_BASE}/api/reports/${id}`, {
          method: "DELETE",
        });
        ok = res.ok;
      }
      if (!ok && active?.uniqueKey) {
        const res = await fetch(
          `${API_BASE}/api/reports?uniqueKey=${encodeURIComponent(
            active.uniqueKey
          )}`,
          {
            method: "DELETE",
          }
        );
        ok = res.ok;
      }
      if (!ok) throw new Error("Delete failed");
      alert("✅ تم حذف التقرير.");
      fetchReports();
    } catch (e) {
      alert("❌ فشل الحذف. قد لا يدعم الخادم هذا النداء.");
    }
  }

  /* ===== Render ===== */
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #dbe3f4",
        borderRadius: 12,
        padding: 16,
        color: "#0b1f4d",
      }}
    >
      {/* شريط التحكم */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 800 }}>
          Cleaning Programme Schedule — View
        </div>

        {/* Month select + prev/next */}
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            marginInlineStart: "auto",
          }}
        >
          <button
            onClick={gotoPrevMonth}
            disabled={currentMonthIndex <= 0}
            style={{
              ...btnGhost,
              opacity: currentMonthIndex <= 0 ? 0.5 : 1,
            }}
            title="Previous month"
          >
            ◀
          </button>

          <select
            value={normalizeMonth(payload?.month) || ""}
            onChange={(e) => selectByMonth(e.target.value)}
            style={{
              border: "1px solid #c7d2fe",
              borderRadius: 8,
              padding: "6px 10px",
              minWidth: 160,
              background: "#fff",
            }}
          >
            <option value="" disabled>
              Select Month (YYYY-MM)
            </option>
            {allMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <button
            onClick={gotoNextMonth}
            disabled={
              currentMonthIndex < 0 ||
              currentMonthIndex >= allMonths.length - 1
            }
            style={{
              ...btnGhost,
              opacity:
                currentMonthIndex < 0 ||
                currentMonthIndex >= allMonths.length - 1
                  ? 0.5
                  : 1,
            }}
            title="Next month"
          >
            ▶
          </button>
        </div>

        {/* Actions (بدون Edit) */}
        <button onClick={handleRefresh} style={btnStyle("#2563eb")}>
          Refresh
        </button>
        <button onClick={handlePrint} style={btnStyle("#111827")}>
          Print
        </button>
        <button onClick={handleExportXLSX} style={btnStyle("#059669")}>
          Export XLSX
        </button>
        <button onClick={handleCopyLink} style={btnStyle("#7c3aed")}>
          Copy Link
        </button>
        <button onClick={handleDelete} style={btnStyle("#b91c1c")}>
          Delete
        </button>
      </div>

      {/* حالات التحميل / الخطأ / لا يوجد */}
      {loading && (
        <div style={{ padding: 12, fontWeight: 700 }}>⏳ Loading…</div>
      )}
      {error && !loading && (
        <div style={{ padding: 12, color: "#b91c1c", fontWeight: 700 }}>
          ❌ {error}
        </div>
      )}
      {!loading && !error && !active && (
        <div style={{ padding: 12, fontWeight: 700 }}>
          لا توجد تقارير محفوظة لهذا النموذج.
        </div>
      )}

      {/* العرض */}
      {payload && (
        <>
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(0,1fr))",
              gap: 8,
              marginBottom: 10,
              alignItems: "center",
              fontSize: 12,
            }}
          >
            <div
              style={{
                gridColumn: "span 6 / span 6",
                fontWeight: 900,
                fontSize: 16,
                textAlign: "center",
              }}
            >
              CLEANING PROGRAMME SCHEDULE
            </div>

            <HeaderLine label="Union Coop Form Ref. No:">
              {payload.formRef || "UC/HACCP/BR/F13A-1"}
            </HeaderLine>
            <HeaderLine label="Cleaning Program Schedule (Butchery)">
              Classification :{" "}
              <strong style={{ marginLeft: 6 }}>
                {payload.classification || "Official"}
              </strong>
            </HeaderLine>
            <HeaderLine label="Month:">
              {normalizeMonth(payload.month) || "-"}
            </HeaderLine>
            <HeaderLine label="Page">1 of 11</HeaderLine>
            <HeaderLine label="Rev. Date:">{payload.revDate || ""}</HeaderLine>
            <HeaderLine label="Rev. No:">{payload.revNo || ""}</HeaderLine>
            <HeaderLine label="Location">
              {payload.location || "BUTCHERY"}
            </HeaderLine>
          </div>

          {/* Standard */}
          <div
            style={{
              border: "1px solid #1f3b70",
              marginBottom: 10,
              padding: "6px 8px",
              fontSize: 12,
              fontWeight: 700,
              background: "#f5f8ff",
            }}
          >
            Standard {payload.standard || "Free of dirt, grease, and food debris"}
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={gridStyle}>
              <colgroup>
                <col style={{ width: 220 }} />
                <col style={{ width: 300 }} />
                <col style={{ width: 460 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 160 }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={thCell}>Item/Area{"\n"}to Clean</th>
                  <th style={thCell}>Equipment / Chemical</th>
                  <th style={thCell}>Cleaning Method</th>
                  <th style={thCell}>
                    Frequency &{"\n"}Proposed Date{"\n"}W1 • W2 • W3 • W4
                  </th>
                  <th style={thCell}>Date of{"\n"}Cleaning</th>
                  <th style={thCell}>Cleaned{"\n"}By</th>
                  <th style={thCell}>Monitored{"\n"}By</th>
                </tr>
              </thead>
              <tbody>
                {(payload.schedule || []).map((r, idx) => {
                  const proposed = r?.proposed || {};
                  return (
                    <tr key={idx}>
                      <td style={tdCell}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>
                          {r.item || "-"}
                        </div>
                      </td>
                      <td style={tdCell}>{r.equipment || "-"}</td>
                      <td style={tdCell}>{r.method || "-"}</td>
                      <td style={tdCell}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>
                          {r.frequency || "-"}
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "auto 1fr",
                            gap: 4,
                          }}
                        >
                          <div>W1</div>
                          <div>{proposed.W1 || "-"}</div>
                          <div>W2</div>
                          <div>{proposed.W2 || "-"}</div>
                          <div>W3</div>
                          <div>{proposed.W3 || "-"}</div>
                          <div>W4</div>
                          <div>{proposed.W4 || "-"}</div>
                        </div>
                      </td>
                      <td style={tdCell}>{r.dateOfCleaning || "-"}</td>
                      <td style={tdCell}>{r.cleanedBy || "-"}</td>
                      <td style={tdCell}>{r.monitoredBy || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 10, fontSize: 11, color: "#374151" }}>
            <div>
              <strong>Report ID:</strong>{" "}
              {active?._id || active?.uniqueKey || "-"}
            </div>
            <div>
              <strong>Saved:</strong>{" "}
              {active?.createdAt || payload?.createdAtClient || "-"}
            </div>
            <div>
              <strong>Branch:</strong> {payload?.branch || BRANCH}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
