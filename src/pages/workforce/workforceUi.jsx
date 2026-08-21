// src/pages/workforce/workforceUi.jsx
//
// 🎨 نظام تصميم وحدة القوى العاملة.
// المبدأ: أقل حدود ممكنة. الهيكل بيبان من **المسافات والخلفيات**، مش من
// صناديق جوّا صناديق. كل قياس من سلّم واحد (4/8/12/16/24) — هيك بتصير
// الشاشة مرتّبة لحالها بلا ما تظبّط كل عنصر على حدة.

import React from "react";

export const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

export const C = {
  bg: "#eef4fb",
  card: "#ffffff",
  band: "#f6faff",      // خلفية شريط داخلي — بديل الحدود
  line: "#e3edf7",
  lineSoft: "#f0f6fc",
  ink: "#0f2740",
  mute: "#64809a",
  faint: "#95acc0",
  blue: "#1f6fd0",
  green: "#059669",
  amber: "#d97706",
  red: "#dc2626",
  violet: "#7c3aed",
};

/* ألوان المشرفين — الترتيب ثابت، فكل مشرف بيحمل لونه بكل الشاشة:
   شارته بالشريط العلوي ولون مجموعته تحت. هيك بتربط عينك المشرف بجزارينه. */
export const SUP_COLORS = [
  { solid: "#7c3aed", soft: "#f5f3ff", line: "#ddd6fe", ink: "#5b21b6" },
  { solid: "#0891b2", soft: "#ecfeff", line: "#a5f3fc", ink: "#155e75" },
  { solid: "#d97706", soft: "#fffbeb", line: "#fde68a", ink: "#92400e" },
  { solid: "#e11d48", soft: "#fff1f2", line: "#fecdd3", ink: "#9f1239" },
  { solid: "#059669", soft: "#ecfdf5", line: "#a7f3d0", ink: "#065f46" },
  { solid: "#2563eb", soft: "#eff6ff", line: "#bfdbfe", ink: "#1e40af" },
];
export const supColor = (i) => SUP_COLORS[i % SUP_COLORS.length];

/* أرقام عربية للشارات — أوضح للمستخدم العربي من 1/2/3 */
export const AR_NUM = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];

/* أحجام الخط — تتغلّب على `#root *{font-size:14px!important}` بكلاس أخصّ */
export const WF_CSS = `
#root .wf, #root .wf * { font-size: 15px !important; }
#root .wf-title  { font-size: 27px !important; }
#root .wf-h      { font-size: 19px !important; }
#root .wf-h2     { font-size: 16px !important; }
#root .wf-sub    { font-size: 13.5px !important; }
#root .wf-lbl    { font-size: 12.5px !important; }
#root .wf-kpi    { font-size: 27px !important; }
#root .wf-chip   { font-size: 12.5px !important; }
#root .wf-name   { font-size: 15.5px !important; }

#root .wf-press  { transition: transform .13s ease, box-shadow .18s ease, border-color .18s ease; }
#root .wf-press:hover  { transform: translateY(-2px); box-shadow: 0 16px 34px rgba(15,39,64,.10); }
#root .wf-press:active { transform: translateY(0); }
#root .wf-row    { transition: background .13s ease, border-color .13s ease; }
#root .wf-row:hover { background: #f6faff; border-color: #cfe0f0; }

@keyframes wfRise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
#root .wf-rise { animation: wfRise .22s ease both; }

@media (max-width: 860px) {
  #root .wf, #root .wf * { font-size: 14.5px !important; }
  #root .wf-title { font-size: 22px !important; }
  #root .wf-kpi   { font-size: 22px !important; }
  #root .wf-h     { font-size: 17px !important; }
  #root .wf-hidesm { display: none !important; }
}
`;

/* ══════════════════════════════════════════════ الذرّات */

export function Btn({ tone = "ghost", size = "md", children, style, ...rest }) {
  const tones = {
    primary: { background: C.blue,   color: "#fff",    border: `1px solid ${C.blue}`,   boxShadow: "0 6px 16px rgba(31,111,208,.24)" },
    violet:  { background: C.violet, color: "#fff",    border: `1px solid ${C.violet}`, boxShadow: "0 6px 16px rgba(124,58,237,.22)" },
    ok:      { background: "#ecfdf5", color: C.green,  border: "1px solid #a7f3d0" },
    warn:    { background: "#fffbeb", color: C.amber,  border: "1px solid #fde68a" },
    danger:  { background: "#fef2f2", color: C.red,    border: "1px solid #fecaca" },
    ghost:   { background: "#fff",    color: "#3c5a75", border: `1px solid #d7e5f3` },
    quiet:   { background: "transparent", color: C.mute, border: "1px solid transparent" },
  };
  const sizes = {
    sm: { padding: "6px 10px", borderRadius: 9 },
    md: { padding: "9px 15px", borderRadius: 11 },
    lg: { padding: "12px 20px", borderRadius: 13 },
  };
  return (
    <button
      type="button"
      style={{
        fontWeight: 800, fontFamily: FONT, whiteSpace: "nowrap", lineHeight: 1.4,
        cursor: rest.disabled ? "not-allowed" : "pointer",
        opacity: rest.disabled ? 0.45 : 1,
        display: "inline-flex", alignItems: "center", gap: 6,
        ...sizes[size], ...tones[tone], ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children, span }) {
  return (
    <label style={{ display: "grid", gap: 6, minWidth: 0, gridColumn: span ? `span ${span}` : undefined }}>
      <span className="wf-lbl" style={{ fontWeight: 800, color: C.mute }}>{label}</span>
      {children}
      {hint && <span className="wf-lbl" style={{ color: C.faint, fontWeight: 600, lineHeight: 1.6 }}>{hint}</span>}
    </label>
  );
}

export const inputStyle = {
  border: `1px solid #d7e5f3`, borderRadius: 11, padding: "10px 13px",
  fontFamily: FONT, fontWeight: 700, color: C.ink, background: "#fff",
  width: "100%", boxSizing: "border-box", outline: "none",
};

export const Input = (props) => <input {...props} style={{ ...inputStyle, ...props.style }} />;

export const Select = (props) => (
  <select {...props} style={{ ...inputStyle, cursor: "pointer", ...props.style }} />
);

export function Chip({ children, bg = C.band, fg = C.mute, bd = "transparent", style }) {
  return (
    <span
      className="wf-chip"
      style={{
        background: bg, color: fg, border: `1px solid ${bd}`, borderRadius: 999,
        padding: "3px 11px", fontWeight: 900, whiteSpace: "nowrap",
        display: "inline-flex", alignItems: "center", gap: 5, ...style,
      }}
    >
      {children}
    </span>
  );
}

/** دائرة الحرف الأول — بتخلّي القوائم أسرع بالقراءة من الأيقونات المكرّرة. */
export function Avatar({ name, color = C.blue, soft = "#eff6ff", size = 36, icon }) {
  const letter = String(name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      style={{
        width: size, height: size, borderRadius: size / 3, flexShrink: 0,
        display: "grid", placeItems: "center", background: soft, color,
        fontWeight: 900, fontSize: size * 0.42, border: `1px solid ${color}22`,
      }}
    >
      {icon || letter}
    </span>
  );
}

export function Card({ children, style, className = "", pad = 18 }) {
  return (
    <div
      className={className}
      style={{
        background: C.card, border: `1px solid ${C.line}`, borderRadius: 16,
        padding: pad, boxShadow: "0 6px 18px rgba(15,39,64,.045)", ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionHead({ icon, title, sub, right }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      gap: 16, flexWrap: "wrap",
    }}>
      <div style={{ minWidth: 0, flex: "1 1 280px" }}>
        <div className="wf-h" style={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}>
          <span>{icon}</span><span>{title}</span>
        </div>
        {sub && (
          <div className="wf-sub" style={{ color: C.mute, fontWeight: 600, marginTop: 4, lineHeight: 1.65, maxWidth: 620 }}>
            {sub}
          </div>
        )}
      </div>
      {right && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{right}</div>}
    </div>
  );
}

export function Empty({ icon = "📭", title, sub, action }) {
  return (
    <div style={{
      background: C.card, border: `1px dashed #cfe0f0`, borderRadius: 16,
      padding: "40px 24px", textAlign: "center", display: "grid", gap: 10, justifyItems: "center",
    }}>
      <div style={{ fontSize: 40, lineHeight: 1, opacity: 0.75 }}>{icon}</div>
      <div className="wf-h2" style={{ fontWeight: 900, color: C.ink }}>{title}</div>
      {sub && (
        <div className="wf-sub" style={{ color: C.mute, fontWeight: 600, maxWidth: 460, lineHeight: 1.7 }}>
          {sub}
        </div>
      )}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}

export function Banner({ tone = "info", children, onClose }) {
  const tones = {
    info:   { bg: "#eff6ff", fg: "#1e40af", bd: "#bfdbfe", icon: "ℹ️" },
    ok:     { bg: "#ecfdf5", fg: "#065f46", bd: "#a7f3d0", icon: "✅" },
    warn:   { bg: "#fffbeb", fg: "#92400e", bd: "#fde68a", icon: "⚠️" },
    danger: { bg: "#fef2f2", fg: "#991b1b", bd: "#fecaca", icon: "⛔" },
  }[tone];
  return (
    <div style={{
      background: tones.bg, color: tones.fg, border: `1px solid ${tones.bd}`,
      borderRadius: 12, padding: "11px 14px", fontWeight: 700, lineHeight: 1.7,
      display: "flex", alignItems: "flex-start", gap: 9,
    }}>
      <span aria-hidden="true" style={{ flexShrink: 0 }}>{tones.icon}</span>
      <div className="wf-sub" style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {onClose && (
        <button
          type="button" onClick={onClose}
          style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", fontWeight: 900, flexShrink: 0 }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

/** نافذة منبثقة موحّدة — تُغلق بالخلفية أو بزر الإلغاء. */
export function Modal({ title, icon, dir, wide, onClose, children, footer, z = 1000 }) {
  return (
    <div
      dir={dir}
      // stopPropagation ضروري: نافذة جوّا نافذة (منتقي الموظف) — بلاها الضغط
      // على خلفية الداخلية بيوصل للخارجية وبيسكّر التنتين مع بعض.
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(9,25,43,.5)", zIndex: z,
        display: "grid", placeItems: "center", padding: 14, fontFamily: FONT,
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        className="wf wf-rise"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, width: wide ? "min(820px,100%)" : "min(560px,100%)",
          maxHeight: "92vh", overflow: "auto", color: C.ink,
          boxShadow: "0 32px 72px rgba(9,25,43,.32)",
        }}
      >
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${C.lineSoft}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          position: "sticky", top: 0, background: "#fff", zIndex: 1, borderRadius: "20px 20px 0 0",
        }}>
          <div className="wf-h" style={{ fontWeight: 900, display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <span>{icon}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
          </div>
          <button
            type="button" onClick={onClose}
            style={{
              border: `1px solid ${C.line}`, background: "#fff", borderRadius: 9,
              width: 32, height: 32, cursor: "pointer", fontWeight: 900, color: C.mute, flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 20, display: "grid", gap: 16 }}>{children}</div>

        {footer && (
          <div style={{
            padding: "13px 20px", borderTop: `1px solid ${C.lineSoft}`,
            display: "flex", gap: 9, justifyContent: "flex-end", flexWrap: "wrap",
            position: "sticky", bottom: 0, background: "#fff", borderRadius: "0 0 20px 20px",
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** شبكة حقول متجاوبة. */
export const grid2 = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(210px,100%),1fr))", gap: 14,
};
