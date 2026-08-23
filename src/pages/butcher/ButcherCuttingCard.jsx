// src/pages/butcher/ButcherCuttingCard.jsx
//
// 🧾 بطاقة التقطيع — تقرير شغل الجزار بنفس محتوى نموذج الملحمة الورقي،
// لكن بتصميم خاص بالنظام (لوحة Soft Sky) لا نسخة مصوّرة عن الورقة.
// The butcher's cutting card: same information as the printed AL MAWASHI form
// (location · cutting date · one box per breakdown · signatures) in the app's
// own visual language.
//
// كل «صندوق» = تنفيذ وصفة واحد (مادة خام داخلة → نواتج + هدر + عظم):
// عنوان الصندوق هو المادة الخام، وأسطره هي القطع الناتجة بأوزانها ونِسبها،
// وشرائح الترويسة تحمل المنشأ/النوع/الفئة/المسار/رقم العملية.
//
// ⚠️ الطباعة تُركِّب نسخة مستقلّة خارج #root وتُخرج A4 أفقي — بلا صفحات فاضية.

import React, { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import mawashiLogo from "../../assets/almawashi-logo.jpg";
import { kg } from "./butcherReportKit";

/* أحجام الخط: globals.css يفرض `#root *{14px}` و`#root table *{12px}`، وصفحة
   «شغلي» تفرض 20px بكلاس `.mw`. نضاعف الكلاس (`.cc.cc`) لتعلو الأخصّية على
   الاثنين بلا ربط البطاقة بصفحة معيّنة. */
export const CARD_CSS = `
#root .cc.cc, #root .cc.cc *, #root .cc.cc table, #root .cc.cc table * {
  font-size: 13px !important;
}
#root .cc.cc .cc-h1    { font-size: 20px !important; }
#root .cc.cc .cc-h2    { font-size: 15px !important; }
#root .cc.cc .cc-kpiv  { font-size: 19px !important; }
#root .cc.cc .cc-rawv  { font-size: 17px !important; }
#root .cc.cc .cc-lbl   { font-size: 11px !important; }
#root .cc.cc .cc-chip  { font-size: 11.5px !important; }
#root .cc.cc .cc-share em { font-size: 10px !important; }

/* نسخة الطباعة تعيش خارج #root فلا تصلها القواعد أعلاه — نكرّرها لها بمقاس أصغر */
.cc-portal, .cc-portal * { font-size: 10.5px !important; }
.cc-portal .cc-h1    { font-size: 16px !important; }
.cc-portal .cc-h2    { font-size: 12.5px !important; }
.cc-portal .cc-kpiv  { font-size: 15px !important; }
.cc-portal .cc-rawv  { font-size: 14px !important; }
.cc-portal .cc-lbl   { font-size: 9px !important; }
.cc-portal .cc-chip  { font-size: 9.5px !important; }
.cc-portal .cc-share em { font-size: 8.5px !important; }

.cc {
  --cc-ink: #0f2740; --cc-ink2: #3c5a75; --cc-mut: #7b93a8;
  --cc-line: #e3edf7; --cc-line2: #d3e2f0; --cc-soft: #f7fbff;
  --cc-blue: #1f6fd0; --cc-teal: #0f766e; --cc-amber: #b45309; --cc-red: #c8102e;
  background: #fff; color: var(--cc-ink); border: 1px solid var(--cc-line2);
  border-radius: 18px; padding: 20px 20px 16px; overflow: hidden;
  font-family: Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  font-variant-numeric: tabular-nums;
}

/* ── الترويسة ── */
.cc-top { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.cc-logo { height: 42px; width: auto; object-fit: contain; }
.cc-titles { flex: 1 1 220px; min-width: 0; }
.cc-h1 { font-weight: 900; letter-spacing: -.2px; line-height: 1.2; }
.cc-h1 span { color: var(--cc-mut); font-weight: 800; }
.cc-lbl { font-weight: 800; color: var(--cc-mut); letter-spacing: .4px; text-transform: uppercase; }
.cc-facts { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.cc-fact {
  display: flex; flex-direction: column; gap: 1px; background: var(--cc-soft);
  border: 1px solid var(--cc-line); border-radius: 12px; padding: 7px 14px;
}
.cc-fact b { font-weight: 900; }

/* ── شريط المؤشّرات ── */
.cc-kpis {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;
  margin: 14px 0 16px;
}
.cc-kpi {
  border: 1px solid var(--cc-line); border-radius: 14px; padding: 9px 12px;
  background: linear-gradient(180deg, #fff, var(--cc-soft));
  border-top: 3px solid var(--cc-accent, var(--cc-blue));
}
.cc-kpiv { font-weight: 900; color: var(--cc-accent, var(--cc-blue)); line-height: 1.25; }
.cc-kpiv i { font-style: normal; font-weight: 800; opacity: .55; margin-inline-start: 3px; }

/* ── الصناديق: عمودان مثل الورقة ── */
.cc-grid { columns: 2; column-gap: 14px; }
.cc-box {
  break-inside: avoid; page-break-inside: avoid; display: inline-block; width: 100%;
  border: 1px solid var(--cc-line2); border-radius: 14px; overflow: hidden;
  margin: 0 0 12px; background: #fff;
}
.cc-bhead {
  display: flex; align-items: flex-start; gap: 10px; padding: 9px 12px 8px;
  background: linear-gradient(135deg, var(--cc-soft), #fff);
  border-bottom: 1px solid var(--cc-line);
  border-inline-start: 4px solid var(--cc-accent, var(--cc-blue));
}
.cc-bname { flex: 1; min-width: 0; }
.cc-h2 { font-weight: 900; line-height: 1.3; }
.cc-raw { text-align: end; white-space: nowrap; }
.cc-rawv { font-weight: 900; color: var(--cc-accent, var(--cc-blue)); }
.cc-rawv i { font-style: normal; font-weight: 800; opacity: .6; margin-inline-start: 2px; }
.cc-tags { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 4px; }
.cc-chip {
  background: #fff; border: 1px solid var(--cc-line2); color: var(--cc-ink2);
  border-radius: 999px; padding: 1px 8px; font-weight: 800; white-space: nowrap;
}
.cc-chip.ref { background: #eef2ff; border-color: #c7d2fe; color: #3730a3; }
.cc-chip.ok  { background: #dcfce7; border-color: #86efac; color: #166534; }
.cc-chip.no  { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }

/* ── جدول القطع ── */
.cc-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
.cc-tbl th {
  text-align: start; font-weight: 800; color: var(--cc-mut); background: var(--cc-soft);
  border-bottom: 1px solid var(--cc-line); padding: 5px 10px;
  text-transform: uppercase; letter-spacing: .3px;
}
.cc-tbl td { padding: 5px 10px; border-bottom: 1px solid var(--cc-line); vertical-align: middle; }
.cc-tbl tr:last-child td { border-bottom: none; }
.cc-n { color: var(--cc-mut); font-weight: 800; text-align: center; }
.cc-nm { font-weight: 800; }
.cc-nm i { font-style: normal; font-weight: 600; color: var(--cc-mut); }
.cc-nm b { color: var(--cc-amber); font-weight: 900; margin-inline-end: 4px; }
.cc-kgc { text-align: end; font-weight: 900; }
.cc-pc { text-align: center; color: var(--cc-mut); font-weight: 800; }
.cc-share { padding-inline-end: 12px !important; }
.cc-bar {
  display: block; height: 5px; border-radius: 999px; background: var(--cc-line);
  overflow: hidden;
}
.cc-bar i { display: block; height: 100%; background: var(--cc-teal); border-radius: 999px; }
.cc-share em { font-style: normal; font-weight: 800; color: var(--cc-mut); }
.cc-w td { background: #fffdf7; }
.cc-w .cc-bar i { background: var(--cc-amber); }

.cc-bfoot {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 7px 12px; background: var(--cc-soft); border-top: 1px solid var(--cc-line);
}
.cc-bfoot .cc-spacer { flex: 1; }
.cc-pill {
  border-radius: 999px; padding: 2px 10px; font-weight: 900; white-space: nowrap;
  background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;
}
.cc-pill.warn { background: #fffbeb; color: var(--cc-amber); border-color: #fcd34d; }
.cc-pill.bad  { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.cc-tot { font-weight: 900; }
.cc-tot span { color: var(--cc-mut); font-weight: 800; margin-inline-end: 4px; }

/* ── التواقيع ── */
.cc-sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 14px; }
.cc-sig { border: 1px dashed var(--cc-line2); border-radius: 12px; padding: 8px 12px 10px; }
.cc-sig b { display: block; font-weight: 900; margin-top: 8px; min-height: 17px; }
.cc-empty {
  border: 1px dashed var(--cc-line2); border-radius: 12px; padding: 26px;
  text-align: center; color: var(--cc-mut); font-weight: 800;
}

@media (max-width: 1000px) {
  .cc-grid { columns: 1; }
  .cc-kpis { grid-template-columns: repeat(2, 1fr); }
  .cc-sign { grid-template-columns: 1fr; }
  .cc-facts { justify-content: flex-start; }
}

/* ── الطباعة: نسخة البوّابة وحدها، A4 أفقي ── */
.cc-portal { display: none; }
@media print {
  @page { size: A4 landscape; margin: 9mm; }
  body.cc-printing #root { display: none !important; }
  body.cc-printing .cc-portal { display: block !important; }
  body.cc-printing .cc-portal .cc {
    border: 0 !important; border-radius: 0 !important; padding: 0 !important;
  }
  .cc-box, .cc-kpi, .cc-chip, .cc-pill, .cc-bhead, .cc-tbl th, .cc-w td, .cc-bfoot {
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
}
`;

/* لون كل مستوى — الجذر أزرق، والتفكيك الفرعي أخضر ثم بنفسجي */
const ACCENTS = ["#1f6fd0", "#0f766e", "#6d28d9", "#b45309"];

/**
 * ترتيب التنفيذات مثل الورقة: المادة الجذر (الذبيحة) أولاً، ثم كل تفكيك بعد
 * الصندوق الذي أنتج مادته الخام — SHOULDER BONE IN يجي بعد CARCASS.
 * يرجّع نسخاً من الصفوف مع `__depth` (عمق السلسلة) للتلوين.
 */
export function orderOperations(rows) {
  const list = [...rows];
  // أول تنفيذ أنتج كل صنف — به نعرف «أب» كل صندوق
  const producer = new Map();
  list.forEach((r, i) => {
    (r.cuts || []).forEach((c) => {
      if (!c.isWaste && c.itemId && !producer.has(c.itemId)) producer.set(c.itemId, i);
    });
  });
  const depth = new Array(list.length).fill(-1);
  const depthOf = (i, seen) => {
    if (depth[i] >= 0) return depth[i];
    if (seen.has(i)) return 0;              // حلقة ببيانات غريبة — نوقف الغوص
    seen.add(i);
    const p = producer.get(list[i].inputItemId);
    const d = p === undefined || p === i ? 0 : depthOf(p, seen) + 1;
    depth[i] = d;
    return d;
  };
  list.forEach((_, i) => depthOf(i, new Set()));
  return list
    .map((r, i) => ({ r, d: depth[i] }))
    .sort(
      (a, b) =>
        a.d - b.d ||
        String(a.r.time).localeCompare(String(b.r.time)) ||
        b.r.carcassKg - a.r.carcassKg
    )
    .map((x) => ({ ...x.r, __depth: x.d }));
}

/** خانة معلومة بالترويسة (الموقع/التاريخ/الجزار). */
const Fact = ({ lbl, val }) => (
  <span className="cc-fact">
    <span className="cc-lbl">{lbl}</span>
    <b>{val || "—"}</b>
  </span>
);

/** مؤشّر بالشريط العلوي. */
const Kpi = ({ lbl, val, unit, color }) => (
  <span className="cc-kpi" style={{ "--cc-accent": color }}>
    <span className="cc-lbl">{lbl}</span>
    <span className="cc-kpiv">{val}{unit ? <i>{unit}</i> : null}</span>
  </span>
);

/** صندوق واحد = تنفيذ وصفة واحد (مادة خام → قطعها). */
function OpBox({ row, isAr }) {
  const cuts = row.cuts && row.cuts.length ? row.cuts : [];
  const accent = ACCENTS[Math.min(row.__depth || 0, ACCENTS.length - 1)];
  const base = row.carcassKg > 0 ? row.carcassKg : row.cutsKg + row.wasteKg;
  const diff = Number(row.unaccountedKg) || 0;
  const yieldTone = row.yieldPct >= 75 ? "" : row.yieldPct >= 60 ? " warn" : " bad";

  return (
    <div className="cc-box" style={{ "--cc-accent": accent }}>
      <div className="cc-bhead">
        <span className="cc-bname">
          <span className="cc-lbl">{isAr ? "المادة الخام" : "Raw material"}</span>
          <span className="cc-h2" dir="auto">{row.inputName}</span>
          <span className="cc-tags">
            {row.bomOriginName ? <span className="cc-chip">🌍 {row.bomOriginName}</span> : null}
            {row.bomKindName ? <span className="cc-chip">🐑 {row.bomKindName}</span> : null}
            {row.bomCatName ? <span className="cc-chip">🏷️ {row.bomCatName}</span> : null}
            {row.pathwayCode ? <span className="cc-chip ref">🛤️ {row.pathwayCode}</span> : null}
            {row.opNo ? <span className="cc-chip ref">{row.opNo}</span> : null}
            {row.time ? <span className="cc-chip">🕒 {row.time}</span> : null}
            {row.reviewStatus === "approved" ? (
              <span className="cc-chip ok">✓ {isAr ? "معتمد" : "Approved"}</span>
            ) : null}
            {row.reviewStatus === "rejected" ? (
              <span className="cc-chip no">✕ {isAr ? "مرفوض" : "Rejected"}</span>
            ) : null}
          </span>
        </span>
        <span className="cc-raw">
          <span className="cc-lbl">{isAr ? "الوزن الداخل" : "Input weight"}</span>
          <span className="cc-rawv">{kg(row.carcassKg)}<i> {isAr ? "كجم" : "kg"}</i></span>
          {row.pieceCount !== null && row.pieceCount !== undefined ? (
            <span className="cc-lbl">{row.pieceCount} {isAr ? "قطعة" : "pc"}</span>
          ) : null}
        </span>
      </div>

      <table className="cc-tbl">
        <colgroup>
          <col style={{ width: "8%" }} />
          <col style={{ width: "42%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "23%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className="cc-n">#</th>
            <th>{isAr ? "اسم القطعة" : "Cut name"}</th>
            <th style={{ textAlign: "end" }}>{isAr ? "الوزن كجم" : "Weight kg"}</th>
            <th style={{ textAlign: "center" }}>{isAr ? "قطع" : "Pc"}</th>
            <th>{isAr ? "النسبة" : "Share"}</th>
          </tr>
        </thead>
        <tbody>
          {cuts.length === 0 ? (
            <tr><td colSpan={5} className="cc-pc">{isAr ? "بلا قطع" : "No cuts"}</td></tr>
          ) : (
            cuts.map((c, i) => {
              const share = base > 0 ? (c.weightKg / base) * 100 : 0;
              return (
                <tr key={`${c.itemId || c.name}_${i}`} className={c.isWaste ? "cc-w" : ""}>
                  <td className="cc-n">{i + 1}</td>
                  <td className="cc-nm" dir="auto">
                    {c.isWaste ? <b>◆</b> : null}
                    {c.name}
                    {c.nameAlt ? <i> · {c.nameAlt}</i> : null}
                  </td>
                  <td className="cc-kgc">{kg(c.weightKg)}</td>
                  <td className="cc-pc">—</td>
                  <td className="cc-share">
                    <span className="cc-bar"><i style={{ width: `${Math.min(share, 100)}%` }} /></span>
                    <em>{share.toFixed(1)}%</em>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div className="cc-bfoot">
        <span className={`cc-pill${yieldTone}`}>
          {isAr ? "تصافي" : "Yield"} {row.yieldPct.toFixed(1)}%
        </span>
        <span className="cc-tot">
          <span>{isAr ? "نواتج" : "Products"}</span>{kg(row.cutsKg)}
        </span>
        <span className="cc-tot">
          <span>{isAr ? "هدر" : "Waste"}</span>{kg(row.wasteKg)}
        </span>
        {Math.abs(diff) > 0.05 ? (
          <span className="cc-pill bad">{isAr ? "فرق" : "Diff"} {kg(diff)}</span>
        ) : null}
        <span className="cc-spacer" />
        <span className="cc-tot">
          <span>{isAr ? "المجموع" : "Total"}</span>{kg(row.cutsKg + row.wasteKg)}
        </span>
      </div>
    </div>
  );
}

/**
 * بطاقة يوم واحد لجزار واحد — الترويسة والمؤشّرات والصناديق والتواقيع.
 * `rows` = تنفيذات ذلك اليوم (صفوف مُطبَّعة من butcherReportKit).
 */
const CuttingCard = React.forwardRef(function CuttingCard(
  { rows = [], day, isAr = false, butcherName, employeeNo, branchName },
  ref
) {
  const ops = useMemo(() => orderOperations(rows), [rows]);
  const sum = useMemo(() => {
    // المادة الخام الحقيقية = مدخلات الصناديق الجذر فقط، فمخرجات صندوق
    // تُعاد كمدخل لصندوق آخر — جمعها كلها يضخّم الخام ويكسر نسبة التصافي.
    const raw = ops.filter((r) => (r.__depth || 0) === 0)
      .reduce((s, r) => s + (r.carcassKg || 0), 0);
    const waste = ops.reduce((s, r) => s + (r.wasteKg || 0), 0);
    // النواتج النهائية = القطع التي لم تدخل صندوقاً آخر كمادة خام (لكل قطعة
    // على حدة — قد يُفكَّك ناتج واحد من صندوق ويبقى باقي نواتجه نهائياً)
    const consumed = new Set(ops.map((o) => o.inputItemId).filter(Boolean));
    const products = ops.reduce(
      (s, r) => s + (r.cuts || []).reduce(
        (a, c) => a + (!c.isWaste && !consumed.has(c.itemId) ? c.weightKg : 0), 0
      ), 0
    );
    return { raw, waste, products, yieldPct: raw > 0 ? (products / raw) * 100 : 0 };
  }, [ops]);
  const approver = ops.find((r) => r.review?.by)?.review?.by || "";

  return (
    <div className="cc" ref={ref}>
      <div className="cc-top">
        <img className="cc-logo" src={mawashiLogo} alt="AL MAWASHI" />
        <span className="cc-titles">
          <span className="cc-h1">
            {isAr ? "بطاقة التقطيع" : "Cutting card"} <span>{isAr ? "Cutting card" : "بطاقة التقطيع"}</span>
          </span>
        </span>
        <span className="cc-facts">
          <Fact lbl={isAr ? "الموقع" : "Location"} val={branchName} />
          <Fact lbl={isAr ? "تاريخ التقطيع" : "Cutting date"} val={day} />
          <Fact
            lbl={isAr ? "الجزار" : "Butcher"}
            val={butcherName ? `${butcherName}${employeeNo ? ` · #${employeeNo}` : ""}`
              : (employeeNo ? `#${employeeNo}` : "")}
          />
        </span>
      </div>

      <div className="cc-kpis">
        <Kpi lbl={isAr ? "التنفيذات" : "Operations"} val={ops.length} color="#1f6fd0" />
        <Kpi lbl={isAr ? "المادة الخام" : "Raw material"} val={kg(sum.raw)} unit={isAr ? "كجم" : "kg"} color="#14507f" />
        <Kpi lbl={isAr ? "النواتج النهائية" : "Final products"} val={kg(sum.products)} unit={isAr ? "كجم" : "kg"} color="#0f766e" />
        <Kpi lbl={isAr ? "الهدر والعظم" : "Waste & bones"} val={kg(sum.waste)} unit={isAr ? "كجم" : "kg"} color="#b45309" />
        <Kpi lbl={isAr ? "نسبة التصافي" : "Net yield"} val={`${sum.yieldPct.toFixed(1)}%`} color="#047857" />
      </div>

      {ops.length ? (
        <div className="cc-grid">
          {ops.map((r) => <OpBox key={r.id} row={r} isAr={isAr} />)}
        </div>
      ) : (
        <div className="cc-empty">
          {isAr ? "لا تنفيذات في هذا اليوم." : "No operations on this day."}
        </div>
      )}

      <div className="cc-sign">
        <span className="cc-sig">
          <span className="cc-lbl">{isAr ? "توقيع الجزار" : "Butcher signature"}</span>
          <b dir="auto">{butcherName || ""}</b>
        </span>
        <span className="cc-sig">
          <span className="cc-lbl">{isAr ? "توقيع المشرف" : "Supervisor signature"}</span>
          <b dir="auto">{approver}</b>
        </span>
        <span className="cc-sig">
          <span className="cc-lbl">{isAr ? "أُدخلت على Odoo بواسطة" : "Posted on Odoo by"}</span>
          <b />
        </span>
      </div>
    </div>
  );
});

export default CuttingCard;

/**
 * طابعة البطاقة — تُركِّب نسخة مستقلّة في <body> (خارج #root) وتفتح نافذة
 * الطباعة ثم تُنظّف. `job` = خصائص CuttingCard، وnull = لا شيء يُطبع.
 * الفصل عن الشاشة مقصود: الورقة تطلع بمقاسها الخاص بلا أنماط الصفحة.
 */
export function CuttingCardPrint({ job, onDone }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!job) return undefined;
    document.body.classList.add("cc-printing");
    const finish = () => {
      window.removeEventListener("afterprint", finish);
      document.body.classList.remove("cc-printing");
      if (doneRef.current) doneRef.current();
    };
    window.addEventListener("afterprint", finish);
    // مهلة قصيرة حتى يرسم المتصفّح النسخة (والشعار) قبل فتح نافذة الطباعة
    const timer = setTimeout(() => window.print(), 120);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", finish);
      document.body.classList.remove("cc-printing");
    };
  }, [job]);

  if (!job || typeof document === "undefined") return null;
  return createPortal(
    <div className="cc-portal"><CuttingCard {...job} /></div>,
    document.body
  );
}
