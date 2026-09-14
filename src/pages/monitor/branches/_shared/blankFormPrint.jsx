// src/pages/monitor/branches/_shared/blankFormPrint.jsx
//
// طباعة "نموذج فارغ" — Blank form printing for every input page.
//
// Why this exists: the crew does not always fill the sheet on a screen. A truck
// arrives, the inspector is on the dock, and the form has to be filled by hand
// and typed in later. So every input page needs to be able to hand out the SAME
// sheet, empty, with a chosen number of ruled lines.
//
// How it works: each page describes its paper sheet ONCE as a small spec object
// (title, document control, columns, footer) and drops <BlankFormPrintButton />
// in its action bar. The sheet is rendered into a hidden <iframe> with its own
// document, so none of the app's global CSS reaches it — no 14px font clamp, no
// overflow rules, no page chrome to hide. What the printer receives is a clean
// black-on-white A4 form.
//
// ── Spec ────────────────────────────────────────────────────────────────────
// {
//   title:        "Visual Inspection — Outbound Checklist",
//   subtitle:     "VISUAL INSPECTION (OUTBOUND CHECKLIST)",   // band over the table
//   company:      "Trans Emirates Livestock Trading LLC — Al Mawashi",
//   dir:          "ltr" | "rtl",                              // default "ltr"
//   orientation:  "portrait" | "landscape" | "auto",          // default "auto"
//   doc:          { documentNo, revisionNo, issueDate, area, issuedBy,
//                   controllingOfficer, approvedBy },         // printed boxes
//   fields:       [{ label, value }]   // blanks at the top (value optional)
//   groups:       [{ label, span }]    // optional band above the column head
//   columns:      [{ label, width, type }]   type: text | yesno | tick | index
//   rows:         14,                  // default number of blank lines
//   sections:     [{ label, columns, rows }]   // optional extra blank tables
//   footer:       [{ label }]          // signature boxes
//   notes:        ["…"]                // printed under the sheet
// }

import React, { useEffect, useRef, useState } from "react";

/* ── small helpers ──────────────────────────────────────────────────────── */

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** column labels in the app carry "\n" for a two-line head — keep the break */
const label2html = (s) => esc(s).replace(/\n/g, "<br/>");

const isAr = (spec) => (spec?.dir || "ltr") === "rtl";

const T = {
  ltr: {
    btn: "Print blank form",
    tip: "Print an empty copy of this sheet for hand filling",
    rows: "Lines",
    orientation: "Orientation",
    portrait: "Portrait",
    landscape: "Landscape",
    print: "Print",
    cancel: "Cancel",
    date: "Date",
    docNo: "Doc No",
    rev: "Rev",
    issue: "Issue date",
    area: "Area",
    issuedBy: "Issued by",
    officer: "Controlling officer",
    approvedBy: "Approved by",
    handFilled: "Hand-filled copy — enter it into the system the same day.",
  },
  rtl: {
    btn: "طباعة نموذج فارغ",
    tip: "طباعة نسخة فارغة من هذا النموذج للتعبئة اليدوية",
    rows: "عدد الأسطر",
    orientation: "اتجاه الورقة",
    portrait: "طولي",
    landscape: "عرضي",
    print: "طباعة",
    cancel: "إلغاء",
    date: "التاريخ",
    docNo: "رقم الوثيقة",
    rev: "رقم الإصدار",
    issue: "تاريخ الإصدار",
    area: "القسم",
    issuedBy: "إعداد",
    officer: "مسؤول المتابعة",
    approvedBy: "اعتماد",
    handFilled: "نسخة يدوية — تُدخل في النظام في نفس اليوم.",
  },
};

const tr = (spec) => (isAr(spec) ? T.rtl : T.ltr);

/** wide sheets go sideways on their own */
function resolveOrientation(spec, override) {
  if (override === "portrait" || override === "landscape") return override;
  if (spec?.orientation === "portrait" || spec?.orientation === "landscape") return spec.orientation;
  const n = (spec?.columns || []).length;
  return n > 7 ? "landscape" : "portrait";
}

/* ── the printed sheet ──────────────────────────────────────────────────── */

function cellFor(type) {
  if (type === "yesno") return '<span class="bx">Y&nbsp;☐&nbsp;&nbsp;N&nbsp;☐</span>';
  if (type === "tick") return '<span class="bx">☐</span>';
  return "";
}

function tableHtml(cols, groups, rows, startAt = 1) {
  const head = [];

  if (groups && groups.length) {
    head.push(
      "<tr>" +
        groups
          .map((g) => `<th class="grp" colspan="${g.span || 1}">${label2html(g.label)}</th>`)
          .join("") +
        "</tr>"
    );
  }
  head.push(
    "<tr>" +
      cols
        .map((c) => `<th style="${c.width ? `width:${c.width}` : ""}">${label2html(c.label)}</th>`)
        .join("") +
      "</tr>"
  );

  const body = [];
  for (let i = 0; i < rows; i++) {
    body.push(
      "<tr>" +
        cols
          .map((c) => {
            if (c.type === "index") return `<td class="ix">${startAt + i}</td>`;
            const cls = c.type === "yesno" || c.type === "tick" ? "ctr" : "";
            return `<td class="${cls}">${cellFor(c.type)}</td>`;
          })
          .join("") +
        "</tr>"
    );
  }

  return `<table class="sheet"><thead>${head.join("")}</thead><tbody>${body.join("")}</tbody></table>`;
}

export function buildBlankFormHtml(spec, opts = {}) {
  const t = tr(spec);
  const dir = spec.dir || "ltr";
  const orientation = resolveOrientation(spec, opts.orientation);
  const rows = Math.max(1, Math.min(200, Number(opts.rows) || spec.rows || 14));
  const rowHeight = Number(opts.rowHeight || spec.rowHeight) || 26;
  const doc = spec.doc || {};
  const cols = spec.columns || [];

  const docBoxes = [
    [t.docNo, doc.documentNo],
    [t.rev, doc.revisionNo],
    [t.issue, doc.issueDate],
    [t.area, doc.area],
  ].filter((p) => p[1] != null && p[1] !== "");

  const signatureNames = [
    [t.issuedBy, doc.issuedBy],
    [t.officer, doc.controllingOfficer],
    [t.approvedBy, doc.approvedBy],
  ].filter((p) => p[1] != null && p[1] !== "");

  const fields = (spec.fields || []).length ? spec.fields : [{ label: t.date }];

  const extraSections = (spec.sections || [])
    .map((s) => {
      const band = s.label ? `<div class="band">${label2html(s.label)}</div>` : "";
      return band + tableHtml(s.columns || [], s.groups, Math.max(1, Number(s.rows) || 6));
    })
    .join("");

  const footerBoxes = (spec.footer || []).length
    ? spec.footer
    : dir === "rtl"
    ? [{ label: "المفتش" }, { label: "المدقق" }]
    : [{ label: "Inspected by" }, { label: "Verified by" }];

  const fontStack =
    dir === "rtl"
      ? '"Segoe UI", Tahoma, "Traditional Arabic", serif'
      : '"Times New Roman", Georgia, serif';

  return `<!doctype html>
<html dir="${dir}" lang="${dir === "rtl" ? "ar" : "en"}">
<head>
<meta charset="utf-8"/>
<title>${esc(spec.title || "Blank form")}</title>
<style>
  @page { size: A4 ${orientation}; margin: 8mm 8mm 10mm 8mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body {
    margin: 0; padding: 0; background: #fff; color: #000;
    font-family: ${fontStack};
    font-size: 9pt; line-height: 1.25;
  }

  /* ── document-control header, the way the paper sheet carries it ── */
  .hdr { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .hdr td { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }
  .hdr .co { font-size: 11pt; font-weight: 700; text-align: center; }
  .hdr .ttl { font-size: 13pt; font-weight: 800; text-align: center; letter-spacing: .3px; }
  .hdr .kv { font-size: 7.5pt; white-space: nowrap; }
  .hdr .kv b { font-weight: 700; }
  .logo { width: 90px; text-align: center; font-weight: 800; font-size: 8pt; letter-spacing: .5px; }

  /* ── blanks the inspector writes on ── */
  .fields { display: flex; flex-wrap: wrap; gap: 4px 8px; margin: 6px 0; }
  .fld { flex: 1 1 190px; border: 1px solid #000; padding: 3px 6px; min-height: 22px; font-size: 8pt; }
  .fld b { font-weight: 700; }
  .fld .ln { display: inline-block; min-width: 90px; border-bottom: 1px dotted #555; height: 11px; }

  .band {
    margin: 7px 0 3px; padding: 3px 6px; border: 1px solid #000; background: #e9e9e9;
    font-weight: 800; font-size: 9.5pt; text-align: center; letter-spacing: .4px;
  }

  /* ── the sheet ── */
  table.sheet { width: 100%; border-collapse: collapse; table-layout: fixed; page-break-inside: auto; }
  table.sheet th, table.sheet td { border: 1px solid #000; }
  table.sheet th {
    background: #ededed; font-size: 6.8pt; font-weight: 700; padding: 4px 2px;
    text-align: center; line-height: 1.15; word-wrap: break-word; hyphens: auto;
  }
  table.sheet th.grp { background: #d8d8d8; font-size: 7.5pt; letter-spacing: .4px; }
  table.sheet td { height: ${rowHeight}px; padding: 2px 3px; font-size: 8pt; }
  table.sheet td.ctr { text-align: center; }
  table.sheet td.ix { text-align: center; font-weight: 700; }
  .bx { font-size: 7pt; white-space: nowrap; letter-spacing: .5px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }

  /* ── signatures ── */
  .sig { display: flex; gap: 6px; margin-top: 8px; }
  .sigbox { flex: 1; border: 1px solid #000; min-height: 46px; padding: 3px 5px; font-size: 7.5pt; font-weight: 700; }
  .names { display: flex; gap: 6px; margin-top: 5px; font-size: 7pt; }
  .names div { flex: 1; border: 1px solid #000; padding: 2px 5px; }
  .notes { margin: 6px 0 0; padding-inline-start: 16px; font-size: 7.5pt; }
  .notes li { margin-bottom: 1px; }
  .foot { margin-top: 5px; font-size: 7pt; text-align: center; color: #333; }
</style>
</head>
<body>
  <table class="hdr">
    <tr>
      <td class="logo" rowspan="2">AL MAWASHI</td>
      <td class="co">${esc(spec.company || "Trans Emirates Livestock Trading LLC — Al Mawashi")}</td>
      <td class="kv" rowspan="2">
        ${docBoxes.map((p) => `<div><b>${esc(p[0])}:</b> ${esc(p[1])}</div>`).join("")}
      </td>
    </tr>
    <tr><td class="ttl">${esc(spec.title || "")}</td></tr>
  </table>

  <div class="fields">
    ${fields
      .map(
        (f) =>
          `<div class="fld"><b>${esc(f.label)}:</b> ${
            f.value ? esc(f.value) : '<span class="ln"></span>'
          }</div>`
      )
      .join("")}
  </div>

  ${spec.subtitle ? `<div class="band">${esc(spec.subtitle)}</div>` : ""}
  ${tableHtml(cols, spec.groups, rows)}
  ${extraSections}

  <div class="sig">
    ${footerBoxes.map((f) => `<div class="sigbox">${esc(f.label)}:</div>`).join("")}
  </div>

  ${
    signatureNames.length
      ? `<div class="names">${signatureNames
          .map((p) => `<div><b>${esc(p[0])}:</b> ${esc(p[1])}</div>`)
          .join("")}</div>`
      : ""
  }

  ${
    (spec.notes || []).length
      ? `<ul class="notes">${spec.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`
      : ""
  }

  <div class="foot">${esc(doc.documentNo || "")}${doc.documentNo ? " · " : ""}${esc(t.handFilled)}</div>
</body>
</html>`;
}

/** Render the sheet in a throw-away iframe and open the print dialog. */
export function printBlankForm(spec, opts = {}) {
  if (typeof document === "undefined") return;

  const html = buildBlankFormHtml(spec, opts);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;";
  document.body.appendChild(frame);

  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    setTimeout(() => {
      try {
        document.body.removeChild(frame);
      } catch {
        /* already gone */
      }
    }, 800);
  };

  frame.onload = () => {
    try {
      const w = frame.contentWindow;
      w.focus();
      w.onafterprint = cleanup;
      // let the browser lay the table out before it measures pages
      setTimeout(() => {
        try {
          w.print();
        } catch (e) {
          console.warn("Blank form print blocked:", e);
        }
        // Safari/Firefox do not always fire onafterprint
        setTimeout(cleanup, 60000);
      }, 150);
    } catch (e) {
      console.warn("Blank form print failed:", e);
      cleanup();
    }
  };

  const d = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
  d.open();
  d.write(html);
  d.close();
}

/* ── the button pages drop into their action bar ────────────────────────── */

const ROW_PRESETS = [8, 10, 12, 15, 20, 25, 30];

export function BlankFormPrintButton({ spec, style, className = "", compact = false }) {
  const t = tr(spec);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState((spec && spec.rows) || 14);
  const [orientation, setOrientation] = useState(resolveOrientation(spec));
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = () => {
    setOpen(false);
    printBlankForm(spec, { rows, orientation });
  };

  /* a white pill reads on the ISO top bar and on a coloured branch header
     alike; a page that needs another look passes `style` */
  const btn = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: compact ? "6px 12px" : "8px 15px",
    borderRadius: 999,
    border: "1.5px solid #7dd3fc",
    background: "#fff",
    color: "#0c4a6e",
    fontFamily: "inherit",
    fontSize: compact ? 12 : 13,
    fontWeight: 900,
    whiteSpace: "nowrap",
    cursor: "pointer",
    ...style,
  };

  const chip = (on) => ({
    padding: "5px 10px",
    borderRadius: 8,
    border: on ? "1.5px solid #0284c7" : "1.5px solid #cbd5e1",
    background: on ? "#e0f2fe" : "#fff",
    color: on ? "#0c4a6e" : "#475569",
    fontWeight: 800,
    fontSize: 11.5,
    fontFamily: "inherit",
    cursor: "pointer",
  });

  return (
    <span
      ref={boxRef}
      className={`no-print ${className}`}
      style={{ position: "relative", display: "inline-block" }}
    >
      <button type="button" style={btn} title={t.tip} onClick={() => setOpen((v) => !v)}>
        🖨 {t.btn}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            [isAr(spec) ? "right" : "left"]: 0,
            zIndex: 60,
            width: 272,
            padding: 12,
            borderRadius: 12,
            background: "#fff",
            border: "1px solid #cbd5e1",
            boxShadow: "0 18px 40px rgba(2,132,199,.18)",
            color: "#0f172a",
            textAlign: isAr(spec) ? "right" : "left",
            direction: isAr(spec) ? "rtl" : "ltr",
          }}
        >
          <div style={{ fontSize: 11.5, fontWeight: 800, color: "#0c4a6e", marginBottom: 6 }}>{t.rows}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
            {ROW_PRESETS.map((n) => (
              <button key={n} type="button" style={chip(rows === n)} onClick={() => setRows(n)}>
                {n}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={200}
              value={rows}
              onChange={(e) => setRows(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
              style={{
                width: 62,
                padding: "5px 7px",
                borderRadius: 8,
                border: "1.5px solid #cbd5e1",
                fontFamily: "inherit",
                fontSize: 12,
              }}
            />
          </div>

          <div style={{ fontSize: 11.5, fontWeight: 800, color: "#0c4a6e", marginBottom: 6 }}>
            {t.orientation}
          </div>
          <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
            <button type="button" style={chip(orientation === "portrait")} onClick={() => setOrientation("portrait")}>
              {t.portrait}
            </button>
            <button type="button" style={chip(orientation === "landscape")} onClick={() => setOrientation("landscape")}>
              {t.landscape}
            </button>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={go}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 9,
                border: "none",
                background: "linear-gradient(180deg,#0ea5e9,#0284c7)",
                color: "#fff",
                fontWeight: 800,
                fontSize: 12.5,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              🖨 {t.print}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                padding: "8px 10px",
                borderRadius: 9,
                border: "1.5px solid #cbd5e1",
                background: "#fff",
                color: "#475569",
                fontWeight: 800,
                fontSize: 12.5,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}
    </span>
  );
}

export default BlankFormPrintButton;
