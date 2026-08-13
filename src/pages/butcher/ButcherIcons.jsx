// src/pages/butcher/ButcherIcons.jsx
//
// رسمات صفحة الجزار — SVG مرسومة بدل الإيموجي.
// سببان: (1) الإيموجي كان يكرّر نفس الشكل لأكثر من قطعة،
//        (2) globals.css فيه `#root * { font-size:14px !important }` فيدهس
//            حجم أي إيموجي inline ويخليه صغير — الـ SVG ما بيتأثر أبداً.
//
// كل رسمة viewBox 0 0 100 100 وتملأ الحاوية (width/height = 100%).

import React from "react";

const C = {
  meat: "#d1566a",
  meatDark: "#a83c50",
  fat: "#f8e3e5",
  bone: "#faf6ec",
  boneEdge: "#cfc3a8",
  marrow: "#ecdfc4",
  liver: "#8e3a4a",
  liverHi: "#a8485a",
  hide: "#e9e0d3",
  hideDark: "#cbbdaa",
  eye: "#4a4038",
  wool: "#f7f3ea",
  woolEdge: "#e2dacb",
  sheepSkin: "#6b6259",
  sheepSkinDark: "#544c44",
  cow: "#9a6a44",
  cowDark: "#7a5436",
  cowPatch: "#f2e9dd",
  camel: "#c99a5b",
  camelDark: "#a97a41",
  pack: "#e7eff7",
  packEdge: "#c3d4e6",
};

/* ══════════════════ الذبائح ══════════════════ */

/* خروف — صوف كثيف ورأس داكن */
const Sheep = () => (
  <>
    <rect x="32" y="62" width="9" height="26" rx="4.5" fill={C.sheepSkinDark} />
    <rect x="46" y="62" width="9" height="26" rx="4.5" fill={C.sheepSkin} />
    <rect x="60" y="62" width="9" height="26" rx="4.5" fill={C.sheepSkinDark} />
    <rect x="72" y="62" width="9" height="26" rx="4.5" fill={C.sheepSkin} />
    {/* حدّ الصوف */}
    <g fill={C.woolEdge}>
      <circle cx="42" cy="44" r="18" />
      <circle cx="60" cy="38" r="20" />
      <circle cx="78" cy="46" r="16" />
      <circle cx="50" cy="58" r="18" />
      <circle cx="68" cy="60" r="16" />
    </g>
    <g fill={C.wool}>
      <circle cx="42" cy="45" r="15.5" />
      <circle cx="60" cy="39" r="17.5" />
      <circle cx="78" cy="47" r="13.5" />
      <circle cx="50" cy="58" r="15.5" />
      <circle cx="68" cy="60" r="13.5" />
    </g>
    {/* الرأس */}
    <ellipse cx="24" cy="44" rx="13" ry="15" fill={C.sheepSkin} />
    <ellipse cx="19" cy="54" rx="8.5" ry="7" fill={C.sheepSkinDark} />
    <ellipse cx="33" cy="32" rx="8" ry="5" fill={C.sheepSkinDark} transform="rotate(-25 33 32)" />
    <circle cx="20" cy="42" r="3" fill={C.wool} />
    <circle cx="20" cy="42" r="1.4" fill={C.eye} />
  </>
);

/* عجل — جسم بنّي ببقع فاتحة */
const Calf = () => (
  <>
    <rect x="34" y="62" width="10" height="26" rx="5" fill={C.cowDark} />
    <rect x="48" y="62" width="10" height="26" rx="5" fill={C.cow} />
    <rect x="62" y="62" width="10" height="26" rx="5" fill={C.cowDark} />
    <rect x="74" y="62" width="10" height="26" rx="5" fill={C.cow} />
    <path d="M88 36c6 5 7 14 3 20" stroke={C.cowDark} strokeWidth="5" fill="none" strokeLinecap="round" />
    <rect x="28" y="30" width="60" height="38" rx="19" fill={C.cow} />
    <ellipse cx="52" cy="44" rx="12" ry="9" fill={C.cowPatch} />
    <ellipse cx="74" cy="56" rx="8" ry="6.5" fill={C.cowPatch} />
    {/* الرأس */}
    <ellipse cx="22" cy="36" rx="15" ry="13" fill={C.cow} />
    <ellipse cx="15" cy="44" rx="9" ry="7" fill={C.cowPatch} />
    <circle cx="12" cy="43" r="1.8" fill={C.eye} />
    <circle cx="18" cy="45" r="1.8" fill={C.eye} />
    <circle cx="19" cy="31" r="3" fill={C.eye} />
    <ellipse cx="32" cy="26" rx="7" ry="4.5" fill={C.cowDark} transform="rotate(-20 32 26)" />
    <path d="M26 22c1-4 5-6 8-5" stroke={C.cowPatch} strokeWidth="4" fill="none" strokeLinecap="round" />
  </>
);

/* جمل — سنام ورقبة طويلة */
const Camel = () => (
  <>
    <rect x="38" y="62" width="9" height="28" rx="4.5" fill={C.camelDark} />
    <rect x="50" y="62" width="9" height="28" rx="4.5" fill={C.camel} />
    <rect x="64" y="62" width="9" height="28" rx="4.5" fill={C.camelDark} />
    <rect x="76" y="62" width="9" height="28" rx="4.5" fill={C.camel} />
    <path d="M88 50c5 4 6 11 3 16" stroke={C.camelDark} strokeWidth="4" fill="none" strokeLinecap="round" />
    <ellipse cx="60" cy="52" rx="30" ry="17" fill={C.camel} />
    <path d="M44 44c3-16 11-23 20-23s16 8 18 23z" fill={C.camel} />
    <path d="M34 52C24 46 20 32 24 20c2-6 10-7 12-1 2 7 1 18 6 25z" fill={C.camel} />
    <ellipse cx="24" cy="17" rx="11" ry="7.5" fill={C.camel} transform="rotate(-18 24 17)" />
    <circle cx="21" cy="14" r="2.6" fill={C.eye} />
    <ellipse cx="31" cy="9" rx="4.5" ry="3" fill={C.camelDark} />
    <path d="M14 19c-3 1-4 3-3 5" stroke={C.camelDark} strokeWidth="3" fill="none" strokeLinecap="round" />
  </>
);

/* فايكوم — لحم مغلّف بالفاكيوم */
const Vacuum = () => (
  <>
    <rect x="14" y="14" width="72" height="72" rx="12" fill={C.pack} stroke={C.packEdge} strokeWidth="3" />
    <rect x="24" y="30" width="52" height="42" rx="14" fill={C.meat} />
    <path d="M32 42c10-5 22-3 31 4" stroke={C.meatDark} strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M34 58c9-4 20-3 28 2" stroke={C.meatDark} strokeWidth="4" fill="none" strokeLinecap="round" />
    <rect x="14" y="14" width="72" height="12" rx="6" fill={C.packEdge} />
    <rect x="14" y="74" width="72" height="12" rx="6" fill={C.packEdge} />
    <rect x="56" y="76" width="22" height="8" rx="4" fill="#fbfdff" />
  </>
);

/* ══════════════════ القطع ══════════════════ */

/* كتفين — قطعة كتف دائرية مع مقطع العظم */
const Shoulders = () => (
  <>
    <path d="M22 56c-3-21 11-38 31-38 19 0 32 13 32 30 0 21-15 34-32 34-15 0-28-8-31-26z" fill={C.fat} />
    <path d="M29 56c-3-17 9-31 24-31 15 0 26 11 26 24 0 17-13 28-26 28-12 0-21-7-24-21z" fill={C.meat} />
    <circle cx="63" cy="45" r="11" fill={C.bone} stroke={C.boneEdge} strokeWidth="2.5" />
    <circle cx="63" cy="45" r="4.5" fill={C.marrow} />
  </>
);

/* فخذين — فخذ بعظم بارز من الأعلى */
const Legs = () => (
  <>
    <rect x="43" y="14" width="14" height="34" rx="7" fill={C.bone} stroke={C.boneEdge} strokeWidth="2.5" />
    <circle cx="43" cy="16" r="6.5" fill={C.bone} stroke={C.boneEdge} strokeWidth="2.5" />
    <circle cx="57" cy="16" r="6.5" fill={C.bone} stroke={C.boneEdge} strokeWidth="2.5" />
    <path d="M50 38c-20 0-33 15-33 29 0 13 13 21 33 21s33-8 33-21c0-14-13-29-33-29z" fill={C.fat} />
    <path d="M50 45c-16 0-26 12-26 23 0 10 10 16 26 16s26-6 26-16c0-11-10-23-26-23z" fill={C.meat} />
  </>
);

/* ظهر — سرج بعينَي لحم */
const Back = () => (
  <>
    <rect x="10" y="32" width="80" height="38" rx="19" fill={C.fat} />
    <rect x="15" y="38" width="70" height="26" rx="13" fill={C.meat} />
    <ellipse cx="34" cy="51" rx="9.5" ry="8.5" fill={C.meatDark} />
    <ellipse cx="66" cy="51" rx="9.5" ry="8.5" fill={C.meatDark} />
  </>
);

/* رقبة — شرائح رقبة مكدّسة */
const Neck = () => (
  <>
    {[28, 50, 72].map((cy, i) => (
      <g key={cy}>
        <ellipse cx="50" cy={cy} rx={i === 1 ? 30 : 26} ry="13" fill={C.fat} />
        <ellipse cx="50" cy={cy} rx={i === 1 ? 25 : 21} ry="9" fill={C.meat} />
        <circle cx="50" cy={cy} r="4.5" fill={C.bone} stroke={C.boneEdge} strokeWidth="1.8" />
      </g>
    ))}
  </>
);

/* أضلاع — ريّش بعظام بارزة */
const Ribs = () => (
  <>
    {[22, 39, 56, 73].map((x) => (
      <rect key={x} x={x} y="12" width="9" height="42" rx="4.5"
        fill={C.bone} stroke={C.boneEdge} strokeWidth="2.5" />
    ))}
    <path d="M14 50h72c7 0 12 7 12 15s-5 15-12 15H14C7 80 2 73 2 65s5-15 12-15z" fill={C.fat} />
    <path d="M16 56h68c4 0 7 4 7 9s-3 9-7 9H16c-4 0-7-4-7-9s3-9 7-9z" fill={C.meat} />
  </>
);

/* راس — رأس خروف من الأمام */
const Head = () => (
  <>
    <ellipse cx="20" cy="42" rx="10" ry="6.5" fill={C.hideDark} />
    <ellipse cx="80" cy="42" rx="10" ry="6.5" fill={C.hideDark} />
    <ellipse cx="50" cy="45" rx="25" ry="27" fill={C.hide} />
    <ellipse cx="50" cy="72" rx="15" ry="13" fill={C.hideDark} />
    <circle cx="40" cy="40" r="4.5" fill={C.eye} />
    <circle cx="60" cy="40" r="4.5" fill={C.eye} />
    <circle cx="45" cy="73" r="2.8" fill={C.eye} />
    <circle cx="55" cy="73" r="2.8" fill={C.eye} />
  </>
);

/* كبدة — فصّان بلون داكن */
const Liver = () => (
  <>
    <path d="M14 42c9-15 32-22 50-17 15 4 24 15 21 28-3 15-18 26-35 26-15 0-26-7-33-18-4-6-6-13-3-19z" fill={C.liver} />
    <path d="M30 60c9-3 18-1 23 5 4 6 2 13-5 16-8 3-17 0-21-7-3-6-2-12 3-14z" fill={C.liverHi} />
    <path d="M58 30c9 1 15 6 17 13" stroke={C.liverHi} strokeWidth="4" strokeLinecap="round" fill="none" />
  </>
);

/* موزات — موزة بعظم ونخاع ظاهر */
const Shanks = () => (
  <>
    <rect x="44" y="10" width="12" height="30" rx="6" fill={C.bone} stroke={C.boneEdge} strokeWidth="2.5" />
    <circle cx="44" cy="13" r="6" fill={C.bone} stroke={C.boneEdge} strokeWidth="2.5" />
    <circle cx="56" cy="13" r="6" fill={C.bone} stroke={C.boneEdge} strokeWidth="2.5" />
    <path d="M50 36c-17 0-26 13-26 28s9 24 26 24 26-9 26-24-9-28-26-28z" fill={C.fat} />
    <path d="M50 43c-13 0-20 11-20 22s7 18 20 18 20-7 20-18-7-22-20-22z" fill={C.meat} />
    <circle cx="50" cy="64" r="7.5" fill={C.bone} stroke={C.boneEdge} strokeWidth="2.5" />
    <circle cx="50" cy="64" r="3" fill={C.marrow} />
  </>
);

/* خاصرة — شريحة بطن رفيعة بطبقات شحم */
const Flank = () => (
  <>
    <path d="M8 40c14-9 32-12 50-10 14 2 27 6 38 13 3 2 3 7 0 9-11 7-24 11-38 13-18 2-36-1-50-10-3-2-3-13 0-15z" fill={C.fat} />
    <path d="M16 44c12-6 27-8 42-6 12 2 23 5 32 10-9 5-20 8-32 10-15 2-30 0-42-6-3-2-3-6 0-8z" fill={C.meat} />
    <path d="M22 47c15-3 32-3 46 2" stroke={C.fat} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <path d="M26 56c13-2 28-2 40 2" stroke={C.fat} strokeWidth="3" fill="none" strokeLinecap="round" />
  </>
);

/* الهدر الكامل — سطل هدر وقصاصات */
const WasteAll = () => (
  <>
    <circle cx="34" cy="20" r="9" fill={C.meat} />
    <circle cx="52" cy="15" r="10" fill={C.meatDark} />
    <circle cx="68" cy="21" r="8" fill={C.meat} />
    <rect x="14" y="26" width="72" height="14" rx="7" fill="#b9cbdd" />
    <path d="M22 40h56l-6 42c-1 6-6 10-12 10H40c-6 0-11-4-12-10z" fill="#dbe7f2" />
    <path d="M40 50v34M55 50v34M70 50v30" stroke="#b9cbdd" strokeWidth="4" strokeLinecap="round" />
  </>
);

/* العضم الكامل — كومة عظام */
const BonePiece = ({ x, y, rot }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <g fill={C.boneEdge}>
      <rect x="-22" y="-7.5" width="44" height="15" rx="7.5" />
      <circle cx="-22" cy="-7" r="8.5" /><circle cx="-22" cy="7" r="8.5" />
      <circle cx="22" cy="-7" r="8.5" /><circle cx="22" cy="7" r="8.5" />
    </g>
    <g fill={C.bone}>
      <rect x="-21" y="-5.5" width="42" height="11" rx="5.5" />
      <circle cx="-21" cy="-6" r="6.5" /><circle cx="-21" cy="6" r="6.5" />
      <circle cx="21" cy="-6" r="6.5" /><circle cx="21" cy="6" r="6.5" />
    </g>
  </g>
);

const BoneAll = () => (
  <>
    <BonePiece x={50} y={74} rot={-8} />
    <BonePiece x={47} y={50} rot={17} />
    <BonePiece x={53} y={26} rot={-20} />
  </>
);

const SHAPES = {
  // ذبائح
  sheep: Sheep,
  veal: Calf,
  camel: Camel,
  vacuum: Vacuum,
  // قطع
  shoulders: Shoulders,
  legs: Legs,
  back: Back,
  neck: Neck,
  ribs: Ribs,
  head: Head,
  liver: Liver,
  shanks: Shanks,
  flank: Flank,
  // مجاميع
  waste_total: WasteAll,
  bone_total: BoneAll,
};

/** كل الرسمات المتاحة — تُستعمل في لوحة الإعدادات لاختيار رسمة أي عنصر. */
export const ART_IDS = Object.keys(SHAPES);

/** رسمة تملأ حاويتها — <ButcherArt id="ribs" /> */
export default function ButcherArt({ id }) {
  const Shape = SHAPES[id];
  if (!Shape) return null;
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      role="img"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <Shape />
    </svg>
  );
}
