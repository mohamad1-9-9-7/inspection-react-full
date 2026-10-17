// src/pages/dashboard/TodayFoodSafetyStrip.jsx
// Named dashboard strip: today's Dubai heat (with a cold-chain warning when
// it is hot) + one food-safety tip that changes every day.
//
// Weather: Open-Meteo (free, no key, CORS-enabled). Only Dubai's coordinates
// are sent — nothing about the user. Fetched once and cached for an hour in
// localStorage (a cache, never the source of truth); if the call fails the
// strip simply shows the tip on its own.
import React, { useEffect, useState } from "react";

const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=25.2048&longitude=55.2708" +
  "&current=temperature_2m&daily=temperature_2m_max&timezone=Asia%2FDubai&forecast_days=1";
const CACHE_KEY = "dash_weather_dubai_v1";
const CACHE_MS = 60 * 60 * 1000;

const TIPS = [
  "Chilled food stays at 0–5 °C. Check every chiller at the start and the end of each shift.",
  "Frozen products must stay at −18 °C or colder — reject a delivery that arrives soft.",
  "Raw meat goes on the bottom shelf, ready-to-eat food above it. Never the other way round.",
  "First Expired, First Out: move older stock to the front every time you restock.",
  "Wash hands for at least 20 seconds — before work, after breaks, after touching raw meat.",
  "A thermometer you have not calibrated is a guess. Check it in ice water (0 °C) every week.",
  "Cover every cut with a blue waterproof plaster and a glove.",
  "Anyone with vomiting, diarrhoea or fever stays away from food until 48 hours symptom-free.",
  "Clean first, then sanitize — sanitizer does not work on a dirty surface.",
  "Check sanitizer strength with a test strip, not by smell.",
  "Keep delivery doors shut. Every minute open warms the chiller and invites pests.",
  "Record the temperature at the moment you check it, not from memory later.",
  "Label everything you open or prepare: product, date, use-by.",
  "Separate boards and knives for raw and ready-to-eat food — colour codes exist for a reason.",
  "Thaw in the chiller, never on the bench at room temperature.",
  "Cook to a core of 75 °C. Probe the thickest part, and clean the probe between products.",
  "Hot food on display stays at 60 °C or above — check it every 2 hours.",
  "Cool cooked food from 60 °C to below 5 °C within 6 hours; shallow trays cool faster.",
  "Reheat only once, and to 75 °C core.",
  "No cardboard boxes inside the chiller — they carry dirt and pests in.",
  "Store food at least 15 cm off the floor so the floor can be cleaned.",
  "Chemicals live in their own locked store, never above or beside food.",
  "Spot droppings, gnaw marks or insects? Report it the same day — one sighting means more.",
  "Bins: lids closed, emptied at 75 % full, and cleaned daily.",
  "No jewellery, watches or nail polish in food areas — they fall into product.",
  "Hair nets and beard covers on before you enter the production area.",
  "Every Non-Conformance needs a corrective action and a name next to it.",
  "If in doubt, throw it out — and write down why.",
  "Check the delivery vehicle's temperature before you sign for the goods.",
  "A traceability record should answer in minutes: which supplier, which batch, which customer.",
];

/* The same tips in Arabic, in the same order (index = the day's tip). */
const TIPS_AR = [
  "الأغذية المبرّدة تبقى بين 0 و5 °م. افحص كل ثلاجة في بداية كل وردية ونهايتها.",
  "المنتجات المجمّدة يجب أن تبقى عند −18 °م أو أبرد — ارفض أي شحنة تصل ليّنة.",
  "اللحم النيء في الرف السفلي، والأغذية الجاهزة للأكل فوقه. أبدًا ليس العكس.",
  "ما ينتهي أولًا يخرج أولًا: قدّم المخزون الأقدم إلى الأمام في كل مرة تعيد التعبئة.",
  "اغسل يديك 20 ثانية على الأقل — قبل العمل، وبعد الاستراحة، وبعد لمس اللحم النيء.",
  "ميزان الحرارة غير المعايَر مجرد تخمين. افحصه في ماء مثلّج (0 °م) كل أسبوع.",
  "غطِّ أي جرح بلاصق أزرق مقاوم للماء وقفاز.",
  "من يعاني من قيء أو إسهال أو حمّى يبتعد عن الطعام حتى يمرّ 48 ساعة بلا أعراض.",
  "نظّف أولًا ثم عقّم — المعقّم لا يعمل على سطح متّسخ.",
  "افحص تركيز المعقّم بشريط الاختبار، لا بالرائحة.",
  "أبقِ أبواب الاستلام مغلقة. كل دقيقة مفتوحة تدفّئ الثلاجة وتجذب الآفات.",
  "سجّل درجة الحرارة لحظة قياسها، لا من الذاكرة لاحقًا.",
  "ضع ملصقًا على كل ما تفتحه أو تحضّره: المنتج، التاريخ، تاريخ الاستخدام.",
  "ألواح وسكاكين منفصلة للنيء وللجاهز للأكل — ترميز الألوان له سبب.",
  "أذِب التجميد داخل الثلاجة، لا على الطاولة بحرارة الغرفة.",
  "اطهُ حتى تصل حرارة القلب إلى 75 °م. اقِس أسمك جزء، ونظّف المسبار بين المنتجات.",
  "الطعام الساخن المعروض يبقى عند 60 °م أو أعلى — افحصه كل ساعتين.",
  "برّد الطعام المطهو من 60 °م إلى أقل من 5 °م خلال 6 ساعات؛ الصواني الضحلة تبرد أسرع.",
  "أعِد التسخين مرة واحدة فقط، وحتى 75 °م في القلب.",
  "لا كراتين داخل الثلاجة — فهي تُدخل الأوساخ والآفات.",
  "خزّن الطعام على ارتفاع 15 سم على الأقل عن الأرض ليسهل تنظيفها.",
  "المواد الكيميائية في مخزنها المقفل الخاص، لا فوق الطعام ولا بجانبه.",
  "رأيت فضلات أو آثار قضم أو حشرات؟ أبلغ في اليوم نفسه — مشاهدة واحدة تعني المزيد.",
  "الحاويات: أغطية مغلقة، تُفرغ عند امتلاء 75 %، وتُنظّف يوميًا.",
  "لا مجوهرات ولا ساعات ولا طلاء أظافر في مناطق الطعام — فهي تسقط في المنتج.",
  "غطاء الشعر وغطاء اللحية قبل دخول منطقة الإنتاج.",
  "كل حالة عدم مطابقة تحتاج إجراءً تصحيحيًا واسم المسؤول بجانبه.",
  "إذا شككت فتخلّص منه — واكتب السبب.",
  "افحص حرارة مركبة التوصيل قبل أن توقّع على استلام البضاعة.",
  "سجل التتبع يجب أن يجيب خلال دقائق: أي مورّد، أي دفعة، أي عميل.",
];

const tipOfToday = (lang) => {
  const d = new Date();
  const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  return (lang === "ar" ? TIPS_AR : TIPS)[day % TIPS.length];
};

/* Heat bands are about the cold chain, not comfort. */
function heatLevel(max, lang) {
  if (max == null) return null;
  if (lang === "ar") {
    if (max >= 45) return { tone: "red", icon: "🔥", label: "حرّ شديد جدًا", advice: "سلسلة التبريد في خطر: افحص حرارة المركبة عند الوصول، وأفرغ البضاعة مباشرة في الثلاجة، وأبقِ الأبواب مغلقة." };
    if (max >= 40) return { tone: "amber", icon: "☀️", label: "حارّ جدًا", advice: "انقل الشحنات بسرعة من الشاحنة إلى الثلاجة وسجّل حرارة الثلاجات في وقتها." };
    if (max >= 35) return { tone: "yellow", icon: "🌤️", label: "حارّ", advice: "أبقِ أبواب الثلاجات مغلقة وافحص ثلاجات العرض أكثر من المعتاد." };
    return { tone: "calm", icon: "🌥️", label: "معتدل", advice: "يوم مناسب لتنظيف الثلاجات وإذابة الثلج عنها." };
  }
  if (max >= 45) return { tone: "red", icon: "🔥", label: "Extreme heat", advice: "Cold chain at risk: check vehicle temperature on arrival, unload straight into the chiller, keep doors shut." };
  if (max >= 40) return { tone: "amber", icon: "☀️", label: "Very hot", advice: "Move deliveries quickly from the truck to the chiller and log chiller temperatures on time." };
  if (max >= 35) return { tone: "yellow", icon: "🌤️", label: "Hot", advice: "Keep chiller doors closed and check display fridges more often." };
  return { tone: "calm", icon: "🌥️", label: "Mild", advice: "A good day to clean and defrost chillers." };
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    return c && Date.now() - c.at < CACHE_MS ? c : null;
  } catch { return null; }
}

const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
#root .tfs.tfs { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.6fr); gap:12px; margin:0 0 16px; }
#root .tfs.tfs .tfs-box { border-radius:16px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; border:1px solid #e2e8f0; background:#fff; box-shadow:0 1px 2px rgba(15,23,42,.04); }
#root .tfs.tfs .tfs-ic { font-size:${fs(30)}; line-height:1; flex-shrink:0; }
#root .tfs.tfs .tfs-k { font-size:${fs(11.5)}; font-weight:900; letter-spacing:.08em; text-transform:uppercase; color:#64748b; }
#root .tfs.tfs .tfs-v { font-size:${fs(20)}; font-weight:900; color:#0f172a; margin-top:2px; line-height:1.2; }
#root .tfs.tfs .tfs-t { font-size:${fs(14)}; font-weight:600; color:#334155; margin-top:4px; line-height:1.5; }
#root .tfs.tfs .tfs-tip { font-size:${fs(15)}; font-weight:700; color:#0f172a; margin-top:4px; line-height:1.55; }
#root .tfs.tfs .heat-red    { background:linear-gradient(135deg,#fef2f2,#fff7ed); border-color:#fecaca; }
#root .tfs.tfs .heat-red .tfs-k { color:#b91c1c; }
#root .tfs.tfs .heat-amber  { background:linear-gradient(135deg,#fff7ed,#fffbeb); border-color:#fed7aa; }
#root .tfs.tfs .heat-amber .tfs-k { color:#c2410c; }
#root .tfs.tfs .heat-yellow { background:#fffbeb; border-color:#fde68a; }
#root .tfs.tfs .heat-yellow .tfs-k { color:#a16207; }
#root .tfs.tfs .heat-calm   { background:#f0f9ff; border-color:#bae6fd; }
#root .tfs.tfs .tip { background:linear-gradient(135deg,#f0fdfa,#f0f9ff); border-color:#99f6e4; }
#root .tfs.tfs .tip .tfs-k { color:#0f766e; }
#root .tfs.tfs[dir="rtl"] .tfs-k { letter-spacing:0; }
@media (max-width: 760px) { #root .tfs.tfs { grid-template-columns:1fr; } }
`;

export default function TodayFoodSafetyStrip({ lang = "en" }) {
  const ar = lang === "ar";
  const [wx, setWx] = useState(readCache);

  useEffect(() => {
    if (wx) return undefined;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(WEATHER_URL, { signal: ctrl.signal });
        if (!res.ok) return;
        const j = await res.json();
        const next = {
          at: Date.now(),
          now: Math.round(j?.current?.temperature_2m),
          max: Math.round(j?.daily?.temperature_2m_max?.[0]),
        };
        if (!Number.isFinite(next.max)) return;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
        setWx(next);
      } catch { /* offline / blocked — the tip still shows */ }
    })();
    return () => ctrl.abort();
  }, [wx]);

  const heat = heatLevel(wx?.max, lang);

  return (
    <section className="tfs tfs" dir={ar ? "rtl" : "ltr"} aria-label={ar ? "سلامة الغذاء اليوم" : "Today in food safety"}>
      <style>{CSS}</style>
      {heat && (
        <div className={`tfs-box heat-${heat.tone}`}>
          <span className="tfs-ic" aria-hidden="true">{heat.icon}</span>
          <div>
            <div className="tfs-k">{ar ? "دبي اليوم" : "Dubai today"} · {heat.label}</div>
            <div className="tfs-v">
              {ar ? `حتى ${wx.max} °م` : `Up to ${wx.max}°C`}
              {Number.isFinite(wx.now) ? (ar ? ` · الآن ${wx.now} °م` : ` · now ${wx.now}°C`) : ""}
            </div>
            <div className="tfs-t">{heat.advice}</div>
          </div>
        </div>
      )}
      <div className="tfs-box tip" style={heat ? undefined : { gridColumn: "1 / -1" }}>
        <span className="tfs-ic" aria-hidden="true">💡</span>
        <div>
          <div className="tfs-k">{ar ? "نصيحة اليوم لسلامة الغذاء" : "Food safety tip of the day"}</div>
          <div className="tfs-tip">{tipOfToday(lang)}</div>
        </div>
      </div>
    </section>
  );
}
