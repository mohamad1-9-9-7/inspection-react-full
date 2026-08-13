// src/pages/butcher/ButcherCharts.jsx
//
// رسوم بيانية بسيطة داخل تقارير الجزار — SVG خالص بلا أي مكتبة خارجية.
// Dependency-free SVG charts (line + bars) for the butcher reports.
//
// كلها viewBox متجاوبة، وتُطبع كما تظهر.

import React from "react";

const C = {
  ink: "#0f2740",
  muted: "#8aa3b8",
  grid: "#e6eef7",
  blue: "#1f6fd0",
  teal: "#0f766e",
  amber: "#a16207",
  band: "#dcfce7",
};

const fmt = (n, d = 1) => (Number(n) || 0).toFixed(d);

/** منحنى قيمة عبر الزمن (مثلاً نسبة التصافي اليومية). */
export function LineChart({
  data = [], height = 190, unit = "%", color = C.teal, band = null, label = "",
}) {
  if (!data.length) return null;

  const W = 1000;
  const H = height;
  const padL = 54, padR = 14, padT = 14, padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const values = data.map((d) => Number(d.value) || 0);
  const rawMin = Math.min(...values, band ? band.min : Infinity);
  const rawMax = Math.max(...values, band ? band.max : -Infinity);
  const pad = Math.max((rawMax - rawMin) * 0.15, 1);
  const min = Math.max(0, rawMin - pad);
  const max = rawMax + pad;
  const span = max - min || 1;

  const x = (i) => padL + (data.length === 1 ? innerW / 2 : (i * innerW) / (data.length - 1));
  const y = (v) => padT + innerH - ((v - min) / span) * innerH;

  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(Number(d.value) || 0)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${padT + innerH} L${x(0)},${padT + innerH} Z`;
  const ticks = [min, min + span / 2, max];
  const step = Math.ceil(data.length / 12); // لا نزحم محور التواريخ

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={label}>
      {/* نطاق مرجعي */}
      {band && (
        <rect x={padL} y={y(band.max)} width={innerW} height={Math.max(y(band.min) - y(band.max), 1)}
          fill={C.band} opacity="0.7" />
      )}
      {ticks.map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={C.grid} strokeWidth="2" />
          <text x={padL - 8} y={y(v) + 5} textAnchor="end" fontSize="20" fill={C.muted}>
            {fmt(v, 0)}{unit}
          </text>
        </g>
      ))}

      <path d={area} fill={color} opacity="0.10" />
      <path d={line} fill="none" stroke={color} strokeWidth="4"
        strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={d.label + i} cx={x(i)} cy={y(Number(d.value) || 0)} r="5" fill={color} />
      ))}

      {data.map((d, i) =>
        i % step === 0 || i === data.length - 1 ? (
          <text key={`t${d.label}${i}`} x={x(i)} y={H - 12} textAnchor="middle"
            fontSize="19" fill={C.muted}>
            {String(d.label).slice(5)}
          </text>
        ) : null
      )}
    </svg>
  );
}

/** أعمدة أفقية — مناسبة للأسماء العربية الطويلة (قطع/مناشئ/جزارين). */
export function BarChart({
  data = [], unit = "", color = C.blue, valueDigits = 2, label = "",
}) {
  if (!data.length) return null;

  const rowH = 34;
  const W = 1000;
  const H = data.length * rowH + 12;
  const labelW = 220;
  const valueW = 140;
  const trackW = W - labelW - valueW - 20;
  const max = Math.max(...data.map((d) => Number(d.value) || 0), 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={label}>
      {data.map((d, i) => {
        const v = Number(d.value) || 0;
        const w = Math.max((v / max) * trackW, 2);
        const y = i * rowH + 6;
        return (
          <g key={d.label + i}>
            <text x={labelW - 10} y={y + 21} textAnchor="end" fontSize="21"
              fill={C.ink} fontWeight="700">
              {d.label}
            </text>
            <rect x={labelW} y={y + 6} width={trackW} height={20} rx="10" fill={C.grid} />
            <rect x={labelW} y={y + 6} width={w} height={20} rx="10" fill={d.color || color} />
            <text x={labelW + trackW + 12} y={y + 22} fontSize="21" fill={C.muted} fontWeight="700">
              {fmt(v, valueDigits)}{unit}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** خط اتجاه مصغّر داخل بطاقة مؤشر — بلا محاور ولا أرقام. */
export function Sparkline({ data = [], color = C.blue, height = 30 }) {
  if (data.length < 2) return null;

  const W = 120;
  const H = height;
  const values = data.map((d) => Number(d) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i) => (i * W) / (values.length - 1);
  const y = (v) => H - 3 - ((v - min) / span) * (H - 6);

  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const last = values[values.length - 1];
  const up = last >= values[0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} aria-hidden="true"
      style={{ display: "block", marginTop: 4 }}>
      <path d={area} fill={up ? C.teal : C.amber} opacity="0.12" />
      <path d={line} fill="none" stroke={up ? C.teal : C.amber} strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={W} cy={y(last)} r="3" fill={up ? C.teal : C.amber} />
    </svg>
  );
}

export const CHART_COLORS = C;
