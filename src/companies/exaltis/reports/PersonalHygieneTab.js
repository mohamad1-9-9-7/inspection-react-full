// src/companies/exaltis/reports/PersonalHygieneTab.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../config/api";
import {
  getLatestReport,
  getReportRowByDate,
  reportId,
} from "../../../pages/monitor/branches/_shared/reportApi";
import { useSweetsStaff, normalizeEmpNo, normalizeName } from "./sweetsStaff";
import SweetsStaffManager from "./SweetsStaffManager";
import { Bi, bi } from "./bilingual";
import { IS_SAME_ORIGIN, MIN_ROWS_FALLBACK, todayDubaiISO, defaultPHHeader, defaultPHFooter, COLUMNS, makeEmptyRow, isBlankRow, makeRowsFromStaff, adoptRows, PH_TYPE } from "./personalHygiene/phModel";
import { th, td, inp, sel } from "./personalHygiene/phStyles";
import { PHEntryHeader, PHEntryFooter, PHHeaderEditor } from "./personalHygiene/PHHeader";

/* ================================================================== */
/*                        PersonalHygieneTab                           */
/* ================================================================== */
export default function PersonalHygieneTab(props) {
  const {
    reportDate,
    personalHygiene,
    setPersonalHygiene,
    phHeader,
    setPhHeader,
    phFooter,
    setPhFooter,
    minRows = MIN_ROWS_FALLBACK,
    logoUrl,
    onSave,
    saving = false,
  } = props || {};

  const [date, setDate] = useState(() => reportDate || todayDubaiISO());

  const useExternalRows = Array.isArray(personalHygiene) && typeof setPersonalHygiene === "function";
  const [localRows, setLocalRows] = useState(() => makeRowsFromStaff([], minRows));
  const rows = useExternalRows ? personalHygiene : localRows;
  const setRows = useExternalRows ? setPersonalHygiene : setLocalRows;

  const useExternalHeader = phHeader && typeof setPhHeader === "function";
  const [localHeader, setLocalHeader] = useState(defaultPHHeader);
  const header = useExternalHeader ? phHeader : localHeader;
  const setHeader = useExternalHeader ? setPhHeader : setLocalHeader;

  const useExternalFooter = phFooter && typeof setPhFooter === "function";
  const [localFooter, setLocalFooter] = useState(defaultPHFooter);
  const footer = useExternalFooter ? phFooter : localFooter;
  const setFooter = useExternalFooter ? setPhFooter : setLocalFooter;

  const [savingLocal, setSavingLocal] = useState(false);
  const [loadingLast, setLoadingLast] = useState(false);
  const [note, setNote] = useState("");

  /* ===== Staff list (this company only — sweetsStaff.js) =====
     `roster` = active people, one sheet row each. `all` also backs the
     lookups, so a name typed for an inactive person still finds the number. */
  const { roster: staff, staff: allStaff, loading: staffLoading, byNo, byName } = useSweetsStaff();
  const [staffOpen, setStaffOpen] = useState(false);

  /* Seed the table from the directory once it arrives — but only while the
     user has not typed anything, so a reload never wipes work in progress. */
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || staffLoading || !staff.length) return;
    const untouched = (Array.isArray(rows) ? rows : []).every(isBlankRow);
    if (!untouched) {
      seededRef.current = true;
      return;
    }
    seededRef.current = true;
    setRows(makeRowsFromStaff(staff, minRows));
    // `rows`/`setRows` deliberately omitted: this must run on directory load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, staffLoading, minRows]);

  const empNoOptions = useMemo(() => allStaff.map((s) => s.empNo), [allStaff]);
  const nameOptions = useMemo(() => allStaff.map((s) => s.name), [allStaff]);

  /* ===== Save ===== */
  async function savePHToServer() {
    if (!date) {
      setNote("⚠️ Pick a report date first. · اختر تاريخ التقرير أولاً.");
      return;
    }
    try {
      setSavingLocal(true);
      setNote("");

      // Targeted lookup — the old version downloaded every PH report ever
      // saved just to find out whether this one date already existed.
      const existing = await getReportRowByDate(PH_TYPE, date);
      const existingId = existing ? reportId(existing) : "";

      const payload = {
        reportDate: date,
        personalHygiene: rows,
        headers: {
          phHeader: header,
          phFooter: footer,
        },
      };

      const body = { reporter: "sweets", type: PH_TYPE, payload };

      const url = existingId
        ? `${API_BASE}/api/reports/${encodeURIComponent(existingId)}`
        : `${API_BASE}/api/reports`;

      const res = await fetch(url, {
        method: existingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: IS_SAME_ORIGIN ? "include" : "omit",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error((await res.text().catch(() => "")) || `Save failed (${res.status})`);
      }

      setNote(`✅ Personal Hygiene saved for ${date}. · تم حفظ النظافة الشخصية.`);
    } catch (e) {
      setNote(`❌ Failed to save · فشل الحفظ: ${e.message || e}`);
    } finally {
      setSavingLocal(false);
    }
  }

  /* ===== Load from the last saved report =====
     Brings back the employee list and the checks from the most recent record
     and clears the date, so the user picks the day they are filling in. */
  async function loadFromLast() {
    try {
      setLoadingLast(true);
      setNote("⏳ Loading the last report… · جارٍ تحميل آخر تقرير…");
      const hit = await getLatestReport(PH_TYPE);
      if (!hit) {
        setNote("ℹ️ No previous Personal Hygiene report found. · لا يوجد تقرير سابق.");
        return;
      }
      const p = hit.payload || {};
      setRows(adoptRows(p.personalHygiene, minRows));
      if (p.headers?.phHeader) setHeader({ ...defaultPHHeader, ...p.headers.phHeader });
      if (p.headers?.phFooter) {
        const { checkedBy, verifiedBy } = p.headers.phFooter;
        setFooter({
          checkedBy: checkedBy || defaultPHFooter.checkedBy,
          verifiedBy: verifiedBy || defaultPHFooter.verifiedBy,
        });
      }
      setDate(""); // the day must be chosen deliberately
      seededRef.current = true;
      setNote(`✅ Loaded from ${hit.reportDate}. Pick the date for today's record. · تم التحميل — اختر تاريخ سجل اليوم.`);
    } catch (e) {
      setNote(`❌ Could not load the last report · تعذّر تحميل آخر تقرير: ${e.message || e}`);
    } finally {
      setLoadingLast(false);
    }
  }

  const addRow = () => setRows((prev) => ([...(Array.isArray(prev) ? prev : []), makeEmptyRow("", "", false)]));
  const removeRow = (i) => setRows((prev) => (Array.isArray(prev) ? prev.filter((_, idx) => idx !== i) : prev));

  /** Repopulate the table from the staff directory. */
  const fillFromDirectory = () => {
    if (!staff.length) {
      setNote(
        allStaff.length
          ? "ℹ️ Nobody on the staff list is active — open 👥 Staff list to activate people. · لا يوجد موظف نشط — افتح قائمة الموظفين."
          : "ℹ️ The staff list is empty — open 👥 Staff list to add your employees. · قائمة الموظفين فارغة — افتحها لإضافة الموظفين."
      );
      return;
    }
    setRows(makeRowsFromStaff(staff, minRows));
    setNote(`✅ Loaded ${staff.length} employees from the directory. · تم تحميل ${staff.length} موظف.`);
  };

  const ensureMin = () => {
    setRows((prev) => {
      const base = Array.isArray(prev) ? [...prev] : [];
      while (base.length < (minRows || MIN_ROWS_FALLBACK)) base.push(makeEmptyRow("", "", false));
      return base;
    });
  };

  /** Sets one check column to the same value down the whole active table. */
  const fillColumn = (key, value) => {
    setRows((prev) =>
      (Array.isArray(prev) ? prev : []).map((r) =>
        String(r?.employName || "").trim() || String(r?.employeeNo || "").trim()
          ? { ...r, [key]: value }
          : r
      )
    );
  };

  const fillAllConform = () => {
    setRows((prev) =>
      (Array.isArray(prev) ? prev : []).map((r) => {
        if (!String(r?.employName || "").trim() && !String(r?.employeeNo || "").trim()) return r;
        const next = { ...r };
        COLUMNS.forEach((c) => { next[c.key] = "C"; });
        return next;
      })
    );
  };

  /* Employee number ⇄ name stay matched: filling either side looks the other
     up in the directory, so a number is never paired with the wrong person. */
  const onCellChange = (rowIdx, key, value) => {
    setRows((prev) => {
      const base = Array.isArray(prev) ? [...prev] : [];
      const r = base[rowIdx] || makeEmptyRow("", "", false);

      if (key === "employeeNo") {
        const nextNo = String(value || "");
        const match = byNo.get(normalizeEmpNo(nextNo));
        const next = { ...r, employeeNo: nextNo };
        if (match) next.employName = match.name;
        if (nextNo.trim() || String(next.employName || "").trim()) {
          COLUMNS.forEach((c) => {
            if (!String(next[c.key] || "").trim()) next[c.key] = "C";
          });
        }
        base[rowIdx] = next;
        return base;
      }

      if (key === "employName") {
        const nextName = String(value || "");
        const match = byName.get(normalizeName(nextName));
        const next = { ...r, employName: nextName };
        if (match) next.employeeNo = match.empNo;
        if (nextName.trim()) {
          COLUMNS.forEach((c) => {
            if (!String(next[c.key] || "").trim()) next[c.key] = "C";
          });
        }
        base[rowIdx] = next;
        return base;
      }

      base[rowIdx] = { ...r, [key]: value };
      return base;
    });
  };

  const toolbar = {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 12,
  };
  const btnBase = {
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 700,
  };
  const btnPrimary = { ...btnBase, background: "#059669", color: "#fff", border: "1px solid transparent" };
  const card = {
    background: "#fff",
    padding: "1rem",
    marginBottom: "1rem",
    borderRadius: 12,
    boxShadow: "0 0 8px rgba(0,0,0,.10)",
  };

  const noteTone = note.startsWith("❌")
    ? { bg: "#fee2e2", fg: "#991b1b" }
    : note.startsWith("✅")
      ? { bg: "#dcfce7", fg: "#166534" }
      : { bg: "#e0f2fe", fg: "#075985" };

  return (
    <div>
      {/* عنوان صغير + تاريخ إدخال داخل التبويب */}
      <div
        style={{
          ...card,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0 }}>🧼 <Bi en="Personal Hygiene" /></h3>
        <label style={{ fontWeight: 700 }}>
          <Bi en="Date:" />{" "}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: date ? "1px solid #cbd5e1" : "2px solid #f59e0b",
            }}
          />
        </label>
      </div>

      <SweetsStaffManager open={staffOpen} onClose={() => setStaffOpen(false)} />
      <PHEntryHeader header={header} date={date} logoUrl={logoUrl} />
      <PHHeaderEditor header={header} setHeader={setHeader} footer={footer} setFooter={setFooter} />

      <div style={toolbar}>
        <button onClick={loadFromLast} disabled={loadingLast} style={btnBase}>
          {loadingLast ? <>⏳ <Bi en="Loading…" /></> : <>📋 <Bi en="Load from last report" ar="تحميل من آخر تقرير" /></>}
        </button>
        <button
          onClick={fillFromDirectory}
          style={btnBase}
          title={bi("Every active person on the staff list", "كل موظف نشط في القائمة")}
        >
          👥 <Bi en={`Load roster${staff.length ? ` (${staff.length})` : ""}`} ar="تحميل الموظفين" />
        </button>
        <button onClick={() => setStaffOpen(true)} style={btnBase} title={bi("Add / edit the company's employees", "إضافة / تعديل موظفي الشركة")}>
          ✏️ <Bi en="Staff list" ar="قائمة الموظفين" />
        </button>
        <button onClick={fillAllConform} style={btnBase}>
          ✅ <Bi en="Mark all C" ar="الكل مطابق" />
        </button>
        <button onClick={ensureMin} style={btnBase}>
          <Bi en={`Autofill to ${minRows || MIN_ROWS_FALLBACK} rows`} ar={`تعبئة حتى ${minRows || MIN_ROWS_FALLBACK} سطر`} />
        </button>
        <button onClick={addRow} style={btnBase}>
          ➕ <Bi en="Add Row" />
        </button>
      </div>

      {note ? (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 8,
            fontWeight: 800,
            fontSize: 13,
            background: noteTone.bg,
            color: noteTone.fg,
          }}
        >
          {note}
        </div>
      ) : null}

      {/* Directory-backed suggestions for both employee columns */}
      <datalist id="ph-empno-options">
        {empNoOptions.map((n) => {
          const rec = byNo.get(normalizeEmpNo(n));
          return <option key={n} value={n}>{rec?.name || ""}</option>;
        })}
      </datalist>
      <datalist id="ph-empname-options">
        {nameOptions.map((n) => {
          const rec = byName.get(normalizeName(n));
          return <option key={n} value={n}>{rec?.empNo || ""}</option>;
        })}
      </datalist>

      {/* جدول */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ background: "#2980b9", color: "#fff" }}>
            <th style={th(50)}><Bi en="S.No" ar="م" stack center /></th>
            <th style={th(110)}><Bi en="Employee No" stack center /></th>
            <th style={th(180)}><Bi en="Employee Name" stack center /></th>
            {COLUMNS.map((c, i) => (
              <th key={i} style={th(150)}>
                <Bi en={c.label} stack center />
                <div style={{ marginTop: 4, display: "flex", gap: 4, justifyContent: "center" }}>
                  <button
                    type="button"
                    title={`Set every employee to C for "${c.label}"`}
                    onClick={() => fillColumn(c.key, "C")}
                    style={{
                      padding: "1px 7px",
                      fontSize: 11,
                      fontWeight: 800,
                      borderRadius: 6,
                      border: "1px solid #ffffff66",
                      background: "#ffffff22",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    C
                  </button>
                  <button
                    type="button"
                    title={`Clear the "${c.label}" column`}
                    onClick={() => fillColumn(c.key, "")}
                    style={{
                      padding: "1px 7px",
                      fontSize: 11,
                      fontWeight: 800,
                      borderRadius: 6,
                      border: "1px solid #ffffff66",
                      background: "#ffffff22",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    ✖
                  </button>
                </div>
              </th>
            ))}
            <th style={th(240)}><Bi en="Remarks and Corrective Actions" ar="الملاحظات والإجراءات التصحيحية" stack center /></th>
            <th style={th(70)}><Bi en="Actions" stack center /></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const noVal = String(r?.employeeNo || "");
            const nameVal = String(r?.employName || "");
            const known =
              (noVal.trim() && byNo.has(normalizeEmpNo(noVal))) ||
              (nameVal.trim() && byName.has(normalizeName(nameVal)));
            const unknown = (noVal.trim() || nameVal.trim()) && !known && allStaff.length > 0;

            return (
              <tr key={i}>
                <td style={td()}>{i + 1}</td>

                <td style={td()}>
                  <input
                    list="ph-empno-options"
                    value={noVal}
                    onChange={(e) => onCellChange(i, "employeeNo", e.target.value)}
                    style={{
                      ...inp(110),
                      borderColor: unknown ? "#f59e0b" : "#cbd5e1",
                    }}
                    placeholder="No. · رقم"
                  />
                </td>

                <td style={td()}>
                  <input
                    list="ph-empname-options"
                    value={nameVal}
                    onChange={(e) => onCellChange(i, "employName", e.target.value)}
                    style={{
                      ...inp(180),
                      borderColor: unknown ? "#f59e0b" : "#cbd5e1",
                    }}
                    title={unknown ? "Not in the staff directory · غير موجود في قائمة الموظفين" : ""}
                  />
                </td>

                {/* All other hygiene columns are dropdowns: C / N\C */}
                {COLUMNS.map((c, idx) => (
                  <td key={idx} style={td()}>
                    <select value={r?.[c.key] || ""} onChange={(e) => onCellChange(i, c.key, e.target.value)} style={sel(140)}>
                      <option value=""></option>
                      <option value="C">C</option>
                      <option value={"N\\C"}>N\C</option>
                    </select>
                  </td>
                ))}

                <td style={td()}>
                  <input value={r?.remarks || ""} onChange={(e) => onCellChange(i, "remarks", e.target.value)} style={inp(240)} />
                </td>

                <td style={{ ...td(), textAlign: "center" }}>
                  <button
                    onClick={() => removeRow(i)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #ef4444",
                      color: "#ef4444",
                      background: "#fff",
                    }}>
                    ✖
                  </button>
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length + 5} style={{ ...td(), textAlign: "center", color: "#6b7280" }}>
                <Bi en="No rows yet. Use “Load roster” or “Add Row”." ar="لا توجد أسطر — استخدم «تحميل الموظفين» أو «إضافة سطر»." />
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <PHEntryFooter footer={footer} />

      {/* زر الحفظ — إذا الأب مرّر onSave سنستعمله، وإلا نستعمل الحفظ المحلي للسيرفر الخارجي */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
        <button
          onClick={typeof onSave === "function" ? onSave : savePHToServer}
          disabled={saving || savingLocal}
          style={btnPrimary}
        >
          {saving || savingLocal ? <>⏳ <Bi en="Saving..." /></> : <>💾 <Bi en="Save Personal Hygiene" ar="حفظ النظافة الشخصية" /></>}
        </button>
      </div>
    </div>
  );
}
