// src/industries/_kit/guideKit.js
// Building blocks of the report guides (_kit/guides.js + <industry>/guides.js):
// the bilingual line t(en, ar), the limit row L(...), and the steps every
// log sheet shares. Kept apart from guides.js so the industry files can
// import them without a circular import.

export const t = (en, ar) => ({ en, ar });
export const L = (param, allowed, critical, action) => ({ param, allowed, critical, action });

/* Steps every sheet shares — first, the "copy" step of daily lists, last. */
export const START = t(
  "Pick the date. There is one sheet per day — if the day already has one, you continue it.",
  "اختر التاريخ. لكل يوم ورقة واحدة — إن وُجدت ورقة لذلك اليوم فأنت تكمل عليها.",
);
export const COPY = t(
  "Press «Copy from last sheet» to bring in the list you check every day, then fill today's readings.",
  "اضغط «نسخ من آخر ورقة» لجلب القائمة التي تفحصها كل يوم، ثم عبّئ قراءات اليوم.",
);
export const ACTION = t(
  "The Status column checks each row as you type. For every ✕ write the corrective action.",
  "عمود الحالة يفحص كل سطر أثناء الكتابة. لكل ✕ اكتب الإجراء التصحيحي.",
);
export const END = t(
  "Fill Shift, Checked By and Verified By, then Save. Without a connection the sheet is kept on the device and sent automatically later.",
  "عبّئ الوردية والفاحص والمعتمِد ثم احفظ. بدون اتصال تُحفظ الورقة على الجهاز وتُرسل تلقائياً لاحقاً.",
);
