// src/pages/monitor/branches/_shared/receivingGuidance.js
//
// The guidance panel shown above every branch receiving log. The rules are the
// same wherever goods arrive — temperature limits, shelf life, packaging,
// traceability — so they live here once instead of being retyped per branch.
//
//   kind: "warn" — a rule that fails an audit or spoils product if ignored
//   kind: "tip"  — how to fill the sheet so it is actually usable later

export const RECEIVING_GUIDANCE = [
  { kind: "warn",
    en: "Reject chilled meat arriving above 5 °C and frozen meat above −18 °C. Record the reading you actually measured, not the one you expected.",
    ar: "ارفض اللحم المبرّد إذا وصل فوق ٥°م، والمجمّد إذا وصل فوق −١٨°م. سجّل القراءة اللي قِستها فعلاً، مو اللي متوقّعها." },
  { kind: "tip",
    en: "Probe the product itself with a clean thermometer, sanitized between readings — the vehicle's own gauge is not the product temperature.",
    ar: "قِس المنتج نفسه بمجس نظيف ومعقّم بين كل قياس والتاني — مؤشّر السيارة مو حرارة المنتج." },
  { kind: "warn",
    en: "Expiry must be later than the production date, and a delivery whose remaining shelf life is under the agreed minimum is rejected even if it is still in date.",
    ar: "تاريخ الصلاحية لازم يكون بعد تاريخ الإنتاج، والشحنة اللي عمرها المتبقي أقل من المتفق عليه تُرفض حتى لو لسا سارية." },
  { kind: "warn",
    en: "Torn, wet, or pest-marked packaging is an immediate rejection — photograph it and write the reason in the remarks.",
    ar: "العبوة الممزّقة أو المبلّلة أو عليها أثر قوارض/حشرات = رفض فوري — صوّرها واكتب السبب بالملاحظات." },
  { kind: "tip",
    en: "Record the invoice number and country of origin for every item. Traceability is rebuilt from these two fields when something is recalled.",
    ar: "سجّل رقم الفاتورة وبلد المنشأ لكل صنف. التتبّع بينبنى من هالحقلين لما يصير سحب منتج." },
  { kind: "tip",
    en: "Move accepted goods into chilled or frozen storage within 30 minutes of receipt.",
    ar: "البضاعة المقبولة تدخل التبريد أو التجميد خلال ٣٠ دقيقة من الاستلام." },
];

export default RECEIVING_GUIDANCE;
