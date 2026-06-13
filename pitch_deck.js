const pptxgen = require("C:/Users/moham/AppData/Roaming/npm/node_modules/pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "InspectPro QMS";
pres.title = "InspectPro QMS - SaaS Pitch Deck 2025";

const C = {
  navy:    "0A1628",
  navyMid: "152744",
  blue:    "1B4F8C",
  teal:    "00C2CB",
  tealDim: "009BA3",
  gold:    "FFB400",
  white:   "FFFFFF",
  off:     "F8FAFD",
  light:   "E8F4F8",
  gray:    "8899AA",
  mid:     "64748B",
  dark:    "1E293B",
  green:   "0EA472",
  red:     "E84B4B",
  border:  "CBD5E1",
};

const W = 10, H = 5.625;
const ms = () => ({ type: "outer", blur: 10, offset: 3, angle: 135, color: "000000", opacity: 0.10 });

function hdr(slide, title, pg) {
  slide.background = { color: C.off };
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.78, fill: { color: C.navy } });
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0.78, w: W, h: 0.05, fill: { color: C.teal } });
  slide.addText(title, { x: 0.45, y: 0, w: 8.8, h: 0.78, fontSize: 22, bold: true, color: C.white, fontFace: "Calibri", margin: 0, valign: "middle" });
  if (pg) slide.addText(pg + " / 11", { x: 9.1, y: 0, w: 0.7, h: 0.78, fontSize: 10, color: C.gray, fontFace: "Calibri", margin: 0, valign: "middle", align: "center" });
}

function card(slide, x, y, w, h, col) {
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: col || C.white }, shadow: ms() });
}

function accent(slide, x, y, h, col) {
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.07, h, fill: { color: col || C.teal } });
}

function dot(slide, x, y, r, col) {
  slide.addShape(pres.shapes.OVAL, { x: x - r, y: y - r, w: r * 2, h: r * 2, fill: { color: col } });
}

// ─── SLIDE 1: COVER ───────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.navy };

  // Decorative circles
  s.addShape(pres.shapes.OVAL, { x: -1.2, y: 3.2, w: 4, h: 4, fill: { color: C.teal, transparency: 88 } });
  s.addShape(pres.shapes.OVAL, { x: 6.5, y: -1.5, w: 5.5, h: 5.5, fill: { color: C.blue, transparency: 80 } });
  s.addShape(pres.shapes.OVAL, { x: 8.2, y: 4.0, w: 2.5, h: 2.5, fill: { color: C.teal, transparency: 85 } });

  // Left panel
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 4.1, h: H, fill: { color: C.navyMid, transparency: 30 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 4.1, y: 0, w: 0.05, h: H, fill: { color: C.teal } });

  // Top teal bar
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.055, fill: { color: C.teal } });

  // Product name
  s.addText("Inspect", { x: 0.35, y: 1.1, w: 3.6, h: 0.85, fontSize: 54, bold: true, color: C.white, fontFace: "Calibri", margin: 0 });
  s.addText("Pro", { x: 0.35, y: 1.9, w: 3.6, h: 0.85, fontSize: 54, bold: true, color: C.teal, fontFace: "Calibri", margin: 0 });
  s.addText("Q M S", { x: 0.38, y: 2.73, w: 3.6, h: 0.5, fontSize: 20, bold: false, color: C.gray, fontFace: "Calibri", margin: 0, charSpacing: 8 });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.38, y: 3.4, w: 1.4, h: 0.04, fill: { color: C.gold } });
  s.addText("نظام إدارة الجودة", { x: 0.38, y: 3.52, w: 3.5, h: 0.42, fontSize: 15, color: C.gray, fontFace: "Calibri", margin: 0 });

  // SaaS pill
  s.addShape(pres.shapes.RECTANGLE, { x: 0.38, y: 4.85, w: 1.1, h: 0.32, fill: { color: C.teal } });
  s.addText("SaaS", { x: 0.38, y: 4.85, w: 1.1, h: 0.32, fontSize: 12, bold: true, color: C.white, fontFace: "Calibri", margin: 0, align: "center", valign: "middle" });
  s.addText("2025", { x: 1.6, y: 4.88, w: 1.0, h: 0.28, fontSize: 12, color: C.gray, fontFace: "Calibri", margin: 0, valign: "middle" });

  // Right content
  s.addText("Quality Management,\nRedefined.", { x: 4.45, y: 0.9, w: 5.3, h: 1.6, fontSize: 38, bold: true, color: C.white, fontFace: "Calibri", margin: 0 });
  s.addText("The all-in-one inspection & compliance platform\nbuilt natively for the MENA region — Arabic-first,\nAI-powered, cloud-native.", { x: 4.45, y: 2.65, w: 5.2, h: 1.1, fontSize: 15, color: C.gray, fontFace: "Calibri", margin: 0 });

  // 3 stat boxes
  const stats = [["14+","Modules"],["AI","Powered"],["AR/EN","Bilingual"]];
  stats.forEach(([v, l], i) => {
    const bx = 4.45 + i * 1.75;
    s.addShape(pres.shapes.RECTANGLE, { x: bx, y: 4.05, w: 1.55, h: 1.1, fill: { color: C.blue } });
    s.addText(v, { x: bx, y: 4.08, w: 1.55, h: 0.65, fontSize: 28, bold: true, color: C.teal, align: "center", fontFace: "Calibri", margin: 0 });
    s.addText(l, { x: bx, y: 4.73, w: 1.55, h: 0.3, fontSize: 11, color: C.gray, align: "center", fontFace: "Calibri", margin: 0 });
  });

  s.addText("Confidential Pitch Deck · 2025", { x: 0, y: H - 0.18, w: W, h: 0.18, fontSize: 8.5, color: C.gray, align: "center", fontFace: "Calibri", margin: 0 });
}

// ─── SLIDE 2: THE PROBLEM ────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  hdr(s, "The Problem  —  Food Safety Management Is Broken", "02");

  s.addText("Every day, food businesses across the region face these challenges:", { x: 0.45, y: 0.95, w: 9, h: 0.4, fontSize: 14, color: C.mid, fontFace: "Calibri", margin: 0 });

  const problems = [
    { num: "01", title: "Paper-Based & Scattered", body: "Inspections done on paper forms, spread across emails and WhatsApp groups. No single source of truth.", col: C.teal },
    { num: "02", title: "Zero Real-Time Visibility", body: "Managers can't see what's happening across branches. Issues are discovered after the damage is done.", col: C.gold },
    { num: "03", title: "Compliance Gaps & Fines", body: "Regulatory audits (SFDA, Dubai Municipality, MOMRA) catch violations that could have been prevented digitally.", col: C.red },
  ];

  problems.forEach(({ num, title, body, col }, i) => {
    const x = 0.45 + i * 3.1;
    card(s, x, 1.52, 2.9, 3.65, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.52, w: 2.9, h: 0.07, fill: { color: col } });
    s.addText(num, { x: x + 0.2, y: 1.72, w: 0.8, h: 0.65, fontSize: 38, bold: true, color: col, fontFace: "Calibri", margin: 0 });
    s.addText(title, { x: x + 0.2, y: 2.42, w: 2.55, h: 0.52, fontSize: 15, bold: true, color: C.dark, fontFace: "Calibri", margin: 0 });
    s.addText(body, { x: x + 0.2, y: 3.02, w: 2.55, h: 1.8, fontSize: 13, color: C.mid, fontFace: "Calibri", margin: 0 });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.18, w: W, h: 0.18, fill: { color: C.navy } });
}

// ─── SLIDE 3: OUR SOLUTION ───────────────────────────────────────────────────
{
  const s = pres.addSlide();
  hdr(s, "Meet InspectPro QMS  —  One Platform, Full Control", "03");

  // Left: description
  card(s, 0.35, 1.0, 4.5, 4.2, C.white);
  accent(s, 0.35, 1.0, 4.2);
  s.addText("The Complete QMS Solution", { x: 0.6, y: 1.1, w: 4.1, h: 0.45, fontSize: 17, bold: true, color: C.navy, fontFace: "Calibri", margin: 0 });
  s.addText("InspectPro QMS replaces every clipboard, spreadsheet, and WhatsApp message with a unified, intelligent digital platform.", { x: 0.6, y: 1.65, w: 4.1, h: 0.85, fontSize: 13, color: C.mid, fontFace: "Calibri", margin: 0 });

  const feats = [
    "14 specialized inspection & quality modules",
    "Live multi-branch monitoring dashboard",
    "AI-powered anomaly detection & alerts",
    "Arabic & English — built in, not bolted on",
    "Cloud-native SaaS — zero IT overhead",
    "One-click audit-ready PDF reports",
  ];
  feats.forEach((f, i) => {
    dot(s, 0.72, 2.7 + i * 0.37, 0.09, C.teal);
    s.addText(f, { x: 0.9, y: 2.57 + i * 0.37, w: 3.8, h: 0.35, fontSize: 13, color: C.dark, fontFace: "Calibri", margin: 0 });
  });

  // Right: visual panel
  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 1.0, w: 4.5, h: 4.2, fill: { color: C.navy } });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 1.0, w: 4.5, h: 0.06, fill: { color: C.teal } });
  s.addText("🖥", { x: 5.1, y: 1.3, w: 4.5, h: 1.2, fontSize: 60, align: "center", fontFace: "Segoe UI Emoji", margin: 0 });
  s.addText("InspectPro Dashboard", { x: 5.1, y: 2.55, w: 4.5, h: 0.4, fontSize: 14, bold: true, color: C.teal, align: "center", fontFace: "Calibri", margin: 0 });

  const kpis = [["98%","Compliance Score"],["< 2min","Incident Response"],["100%","Audit Ready"]];
  kpis.forEach(([v, l], i) => {
    const kx = 5.25 + i * 1.45;
    s.addShape(pres.shapes.RECTANGLE, { x: kx, y: 3.15, w: 1.3, h: 0.95, fill: { color: C.blue } });
    s.addText(v, { x: kx, y: 3.18, w: 1.3, h: 0.52, fontSize: 18, bold: true, color: C.teal, align: "center", fontFace: "Calibri", margin: 0 });
    s.addText(l, { x: kx, y: 3.7, w: 1.3, h: 0.35, fontSize: 9.5, color: C.gray, align: "center", fontFace: "Calibri", margin: 0 });
  });

  s.addText("From daily cleaning logs to full audit trails — InspectPro handles it all.", { x: 5.1, y: 4.25, w: 4.5, h: 0.6, fontSize: 12, color: C.gray, align: "center", fontFace: "Calibri", margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.18, w: W, h: 0.18, fill: { color: C.navy } });
}

// ─── SLIDE 4: PLATFORM PILLARS ───────────────────────────────────────────────
{
  const s = pres.addSlide();
  hdr(s, "Platform Pillars  —  14 Modules, One Ecosystem", "04");

  s.addText("Six core pillars covering every dimension of food safety & quality management:", { x: 0.45, y: 0.92, w: 9, h: 0.35, fontSize: 13, color: C.mid, fontFace: "Calibri", margin: 0 });

  const pillars = [
    { icon: "📊", title: "Branch Dashboards", body: "Real-time KPIs across all locations in one view" },
    { icon: "🌡", title: "Temperature & HACCP", body: "Automated logs, alerts & corrective action flows" },
    { icon: "🧹", title: "Sanitation & Hygiene", body: "Daily cleaning & personal hygiene inspection forms" },
    { icon: "🐛", title: "Pest Control", body: "Scheduled visits, findings & eradication tracking" },
    { icon: "📦", title: "Receiving & Traceability", body: "Supplier logs, batch tracking & recall readiness" },
    { icon: "🎓", title: "Training & LMS", body: "Module-based staff training with compliance scoring" },
  ];

  const cols = 3, rows = 2;
  const cw = 2.9, ch = 1.8, gx = 0.45, gy = 1.38, px = 0.15, py = 0.12;

  pillars.forEach(({ icon, title, body }, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = gx + col * (cw + px), y = gy + row * (ch + py);
    card(s, x, y, cw, ch, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: cw, h: 0.055, fill: { color: C.teal } });
    s.addText(icon, { x: x + 0.15, y: y + 0.12, w: 0.65, h: 0.6, fontSize: 26, fontFace: "Segoe UI Emoji", margin: 0 });
    s.addText(title, { x: x + 0.82, y: y + 0.14, w: 2.0, h: 0.45, fontSize: 13, bold: true, color: C.navy, fontFace: "Calibri", margin: 0 });
    s.addText(body, { x: x + 0.15, y: y + 0.72, w: 2.65, h: 0.9, fontSize: 11.5, color: C.mid, fontFace: "Calibri", margin: 0 });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.18, w: W, h: 0.18, fill: { color: C.navy } });
  s.addText("+ 8 more modules: NCR, CAPA, Document Control, Audit Management, Supplier Portal, Analytics & more", { x: 0, y: H - 0.17, w: W, h: 0.17, fontSize: 8.5, color: C.gray, align: "center", fontFace: "Calibri", margin: 0 });
}

// ─── SLIDE 5: WHO WE SERVE ───────────────────────────────────────────────────
{
  const s = pres.addSlide();
  hdr(s, "Who We Serve  —  Built for Food & Hospitality Businesses", "05");

  s.addText("InspectPro QMS serves any multi-branch operation that needs to manage food safety & quality compliance:", { x: 0.45, y: 0.92, w: 9, h: 0.38, fontSize: 13, color: C.mid, fontFace: "Calibri", margin: 0 });

  const segments = [
    { icon: "🍔", title: "Restaurant & QSR Chains", body: "From 5 to 500+ outlets — standardize quality across every branch.", stat: "50K+\nbusinesses in GCC" },
    { icon: "🏭", title: "Food Production & FMCG", body: "HACCP, traceability, supplier management & regulatory compliance.", stat: "SFDA & MOMRA\ncompliance built-in" },
    { icon: "🏨", title: "Hotels & Hospitality", body: "Kitchen hygiene, receiving logs & audit prep for 5-star standards.", stat: "ISO 22000\nready" },
    { icon: "🍽", title: "Catering & Cloud Kitchens", body: "Flexible SaaS model scales with seasonal volume & multiple concepts.", stat: "< 24hr\nonboarding" },
  ];

  segments.forEach(({ icon, title, body, stat }, i) => {
    const x = 0.35 + i * 2.37;
    card(s, x, 1.42, 2.25, 3.75, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.42, w: 2.25, h: 0.055, fill: { color: i === 0 ? C.teal : i === 1 ? C.gold : i === 2 ? C.blue : C.green } });
    s.addText(icon, { x, y: 1.55, w: 2.25, h: 0.7, fontSize: 32, align: "center", fontFace: "Segoe UI Emoji", margin: 0 });
    s.addText(title, { x: x + 0.15, y: 2.32, w: 1.95, h: 0.52, fontSize: 12.5, bold: true, color: C.navy, fontFace: "Calibri", margin: 0, align: "center" });
    s.addText(body, { x: x + 0.12, y: 2.9, w: 2.0, h: 1.1, fontSize: 11, color: C.mid, fontFace: "Calibri", margin: 0, align: "center" });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.15, y: 4.05, w: 1.95, h: 0.75, fill: { color: C.light } });
    s.addText(stat, { x: x + 0.15, y: 4.05, w: 1.95, h: 0.75, fontSize: 11, bold: true, color: C.teal, fontFace: "Calibri", margin: 0, align: "center", valign: "middle" });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.18, w: W, h: 0.18, fill: { color: C.navy } });
}

// ─── SLIDE 6: MARKET OPPORTUNITY ─────────────────────────────────────────────
{
  const s = pres.addSlide();
  hdr(s, "Market Opportunity  —  A Multi-Billion Dollar Gap", "06");

  // Left stats
  const stats = [
    { val: "$4.2B", label: "MENA food safety market by 2028", col: C.teal },
    { val: "14%",   label: "Annual market growth (CAGR)", col: C.gold },
    { val: "180K+", label: "Food businesses in GCC region", col: C.blue },
    { val: "< 5%",  label: "Digitized today — the gap is massive", col: C.green },
  ];

  stats.forEach(({ val, label, col }, i) => {
    const y = 1.08 + i * 1.05;
    card(s, 0.35, y, 4.3, 0.88, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x: 0.35, y, w: 0.07, h: 0.88, fill: { color: col } });
    s.addText(val, { x: 0.6, y: y + 0.04, w: 1.5, h: 0.8, fontSize: 28, bold: true, color: col, fontFace: "Calibri", margin: 0, valign: "middle" });
    s.addText(label, { x: 2.15, y: y + 0.04, w: 2.35, h: 0.8, fontSize: 12.5, color: C.dark, fontFace: "Calibri", margin: 0, valign: "middle" });
  });

  // Right: bar chart visual (manual)
  card(s, 5.0, 1.0, 4.6, 4.2, C.white);
  s.addText("GCC Market Digitization Gap", { x: 5.1, y: 1.1, w: 4.4, h: 0.38, fontSize: 13, bold: true, color: C.navy, fontFace: "Calibri", margin: 0, align: "center" });

  const bars = [
    { label: "Digitized", pct: 5,  col: C.teal },
    { label: "Paper-based", pct: 95, col: C.border },
  ];
  s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.6, w: 0.9, h: 2.7, fill: { color: C.teal } });
  s.addText("5%\nDigitized", { x: 5.2, y: 2.1, w: 0.9, h: 0.8, fontSize: 11, bold: true, color: C.white, align: "center", fontFace: "Calibri", margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 6.4, y: 1.465, w: 0.9, h: 2.835, fill: { color: C.border } });
  s.addText("95%\nUntapped\n(Our Market)", { x: 6.4, y: 2.0, w: 0.9, h: 1.0, fontSize: 11, bold: true, color: C.dark, align: "center", fontFace: "Calibri", margin: 0 });
  s.addText("Digitized", { x: 5.2, y: 4.33, w: 0.9, h: 0.28, fontSize: 10, color: C.mid, align: "center", fontFace: "Calibri", margin: 0 });
  s.addText("Paper-based", { x: 6.4, y: 4.33, w: 0.9, h: 0.28, fontSize: 10, color: C.mid, align: "center", fontFace: "Calibri", margin: 0 });

  // Opportunity box
  s.addShape(pres.shapes.RECTANGLE, { x: 7.55, y: 1.6, w: 1.85, h: 2.7, fill: { color: C.navy } });
  s.addText("The\nOpportunity", { x: 7.55, y: 1.72, w: 1.85, h: 0.72, fontSize: 12, bold: true, color: C.teal, align: "center", fontFace: "Calibri", margin: 0 });
  s.addText("Be the\nfirst real\nArabic-native\nQMS SaaS\nin the region", { x: 7.6, y: 2.52, w: 1.75, h: 1.6, fontSize: 11.5, color: C.white, align: "center", fontFace: "Calibri", margin: 0 });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.18, w: W, h: 0.18, fill: { color: C.navy } });
}

// ─── SLIDE 7: COMPETITIVE ADVANTAGE ──────────────────────────────────────────
{
  const s = pres.addSlide();
  hdr(s, "Competitive Landscape  —  Why InspectPro Wins", "07");

  const rowH = 0.56, startY = 1.15;
  const cols = [
    { label: "Feature", w: 2.6, x: 0.25 },
    { label: "InspectPro", w: 2.05, x: 2.88, hl: true },
    { label: "MasterControl", w: 2.0, x: 4.96 },
    { label: "Veeva / ETQ", w: 2.0, x: 6.99 },
  ];

  // Header row
  cols.forEach(({ label, w, x, hl }) => {
    s.addShape(pres.shapes.RECTANGLE, { x, y: startY, w, h: rowH, fill: { color: hl ? C.teal : C.navy } });
    s.addText(label, { x, y: startY, w, h: rowH, fontSize: hl ? 14 : 12, bold: true, color: C.white, align: "center", fontFace: "Calibri", margin: 0, valign: "middle" });
  });

  const rows = [
    ["Arabic-Native UI",         "✔ Full RTL",          "✘ English Only",    "✘ English Only"],
    ["MENA Regulatory Modules",  "✔ SFDA, MOMRA, DM",   "✘ Western focused", "✘ Western focused"],
    ["Starting Price",           "From $99/mo",          "$2,000+/mo",        "$3,000+/mo"],
    ["Deployment Time",          "< 24 hours",           "3–6 months",        "6–12 months"],
    ["AI-Powered Insights",      "✔ Built-in",           "Limited",           "Limited"],
    ["Food Safety Focus",        "✔ Purpose-built",      "Generic QMS",       "Generic QMS"],
    ["Offline / Mobile Support", "✔ Mobile-first",       "Desktop focus",     "Desktop focus"],
  ];

  rows.forEach((row, ri) => {
    const y = startY + rowH + ri * rowH;
    const bg = ri % 2 === 0 ? C.off : C.white;
    cols.forEach(({ w, x, hl }, ci) => {
      s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: rowH, fill: { color: hl && ci === 1 ? C.light : bg } });
      const txt = row[ci];
      const isGood = txt.startsWith("✔");
      const isBad = txt.startsWith("✘");
      s.addText(txt, {
        x: x + 0.1, y, w: w - 0.2, h: rowH,
        fontSize: 11.5,
        bold: ci === 1,
        color: isGood ? C.green : isBad ? C.red : C.dark,
        fontFace: "Calibri", margin: 0, valign: "middle",
        align: ci === 0 ? "left" : "center"
      });
    });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.18, w: W, h: 0.18, fill: { color: C.navy } });
}

// ─── SLIDE 8: BUILT FOR MENA ─────────────────────────────────────────────────
{
  const s = pres.addSlide();
  hdr(s, "Built for the MENA Region  —  Not Translated, Native", "08");

  const pillars = [
    { icon: "🌍", title: "Arabic-First Design",     body: "Full right-to-left UI, Arabic typography, and Arabic-language reports — not an afterthought." },
    { icon: "⚖",  title: "Regional Compliance",     body: "Modules aligned with SFDA (KSA), Dubai Municipality, MOMRA, and Gulf food safety codes." },
    { icon: "🤖", title: "AI-Powered Insights",     body: "Smart anomaly detection, predictive alerts, and auto-generated corrective action suggestions." },
    { icon: "☁",  title: "Cloud-Native SaaS",       body: "No servers to manage. Scales from 1 to 1,000 branches. 99.9% uptime SLA." },
    { icon: "📱", title: "Mobile-First Inspections", body: "Inspectors complete checklists on any device, online or offline, with photo evidence capture." },
    { icon: "🔒", title: "Enterprise Security",      body: "SOC 2 compliant, data residency in the Gulf, role-based access, full audit logs." },
  ];

  pillars.forEach(({ icon, title, body }, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.35 + col * 4.8, y = 1.05 + row * 1.45;
    card(s, x, y, 4.55, 1.28, C.white);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.07, h: 1.28, fill: { color: i % 3 === 0 ? C.teal : i % 3 === 1 ? C.gold : C.blue } });
    s.addText(icon, { x: x + 0.2, y: y + 0.28, w: 0.6, h: 0.6, fontSize: 24, fontFace: "Segoe UI Emoji", margin: 0 });
    s.addText(title, { x: x + 0.9, y: y + 0.1, w: 3.5, h: 0.42, fontSize: 14, bold: true, color: C.navy, fontFace: "Calibri", margin: 0 });
    s.addText(body, { x: x + 0.9, y: y + 0.56, w: 3.5, h: 0.65, fontSize: 11.5, color: C.mid, fontFace: "Calibri", margin: 0 });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.18, w: W, h: 0.18, fill: { color: C.navy } });
}

// ─── SLIDE 9: PRICING ─────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  hdr(s, "Pricing  —  SaaS Plans for Every Stage of Growth", "09");

  s.addText("Transparent pricing. No surprise costs. Cancel anytime.", { x: 0.45, y: 0.9, w: 9, h: 0.36, fontSize: 13, color: C.mid, fontFace: "Calibri", margin: 0 });

  const plans = [
    {
      name: "Starter", price: "$99", per: "/month",
      sub: "1 branch · Up to 10 users",
      feats: ["5 core inspection modules","Digital reports & logs","Email support","Basic analytics"],
      col: C.teal, highlight: false,
    },
    {
      name: "Professional", price: "$299", per: "/month",
      sub: "Up to 5 branches · 50 users",
      feats: ["All 14 modules","AI anomaly detection","Priority support & onboarding","Advanced analytics & export","Custom report templates"],
      col: C.gold, highlight: true,
    },
    {
      name: "Enterprise", price: "Custom", per: "",
      sub: "Unlimited branches & users",
      feats: ["White-label option","Custom integrations","Dedicated account manager","On-site training","SLA 99.9% + data residency"],
      col: C.blue, highlight: false,
    },
  ];

  plans.forEach(({ name, price, per, sub, feats, col, highlight }, i) => {
    const x = 0.35 + i * 3.1;
    const bg = highlight ? C.navy : C.white;
    const tx = highlight ? C.white : C.dark;

    card(s, x, 1.38, 2.92, 3.82, bg);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.38, w: 2.92, h: 0.07, fill: { color: col } });

    if (highlight) {
      s.addShape(pres.shapes.RECTANGLE, { x: x + 0.7, y: 1.16, w: 1.52, h: 0.3, fill: { color: col } });
      s.addText("MOST POPULAR", { x: x + 0.7, y: 1.16, w: 1.52, h: 0.3, fontSize: 9.5, bold: true, color: C.navy, align: "center", fontFace: "Calibri", margin: 0, valign: "middle" });
    }

    s.addText(name, { x: x + 0.18, y: 1.52, w: 2.6, h: 0.42, fontSize: 18, bold: true, color: col, fontFace: "Calibri", margin: 0 });
    const priceFontSize = price.startsWith("$") ? 38 : 28;
    s.addText(price, { x: x + 0.18, y: 1.95, w: 2.55, h: 0.65, fontSize: priceFontSize, bold: true, color: tx, fontFace: "Calibri", margin: 0 });
    s.addText(per, { x: x + 1.2, y: 2.22, w: 1.4, h: 0.35, fontSize: 13, color: highlight ? C.gray : C.mid, fontFace: "Calibri", margin: 0, valign: "middle" });
    s.addText(sub, { x: x + 0.15, y: 2.65, w: 2.65, h: 0.32, fontSize: 11, color: highlight ? C.gray : C.mid, fontFace: "Calibri", margin: 0 });
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.15, y: 3.0, w: 2.65, h: 0.03, fill: { color: highlight ? C.blue : C.border } });
    feats.forEach((f, fi) => {
      dot(s, x + 0.3, 3.2 + fi * 0.36, 0.07, col);
      s.addText(f, { x: x + 0.45, y: 3.1 + fi * 0.36, w: 2.35, h: 0.33, fontSize: 11, color: tx, fontFace: "Calibri", margin: 0 });
    });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.18, w: W, h: 0.18, fill: { color: C.navy } });
  s.addText("All plans include: free setup, data migration support, and a 14-day free trial.", { x: 0, y: H - 0.17, w: W, h: 0.17, fontSize: 8.5, color: C.gray, align: "center", fontFace: "Calibri", margin: 0 });
}

// ─── SLIDE 10: ROADMAP ────────────────────────────────────────────────────────
{
  const s = pres.addSlide();
  hdr(s, "Go-to-Market Roadmap  —  12-Month Launch Plan", "10");

  const phases = [
    { q: "Q3 2025", label: "Launch", col: C.teal,
      items: ["Public SaaS launch","First 20 paying customers","KSA & UAE focus","Starter & Pro plans live"] },
    { q: "Q4 2025", label: "Scale", col: C.gold,
      items: ["50 customers target","Partner channel program","Enterprise tier launch","Bahrain & Kuwait expansion"] },
    { q: "Q1 2026", label: "Grow", col: C.blue,
      items: ["100 customers","AI features v2","Marketplace integrations","Jordan & Egypt markets"] },
    { q: "Q2 2026", label: "Expand", col: C.green,
      items: ["250 customers","White-label partner","Series A fundraise","Pan-MENA coverage"] },
  ];

  // Timeline bar
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 2.6, w: 8.9, h: 0.06, fill: { color: C.border } });
  phases.forEach(({ q, label, col, items }, i) => {
    const cx = 0.85 + i * 2.25;
    dot(s, cx, 2.63, 0.18, col);
    s.addText(q, { x: cx - 0.75, y: 1.08, w: 1.5, h: 0.32, fontSize: 11, bold: true, color: col, align: "center", fontFace: "Calibri", margin: 0 });
    s.addText(label, { x: cx - 0.75, y: 1.42, w: 1.5, h: 0.32, fontSize: 13, bold: true, color: C.dark, align: "center", fontFace: "Calibri", margin: 0 });
    items.forEach((item, ii) => {
      s.addText("· " + item, { x: cx - 0.8, y: 2.95 + ii * 0.46, w: 1.7, h: 0.42, fontSize: 11, color: C.mid, fontFace: "Calibri", margin: 0, align: "center" });
    });
    if (i < 3) {
      s.addShape(pres.shapes.RECTANGLE, { x: cx + 0.18, y: 2.6, w: 2.07, h: 0.06, fill: { color: col, transparency: 40 } });
    }
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.18, w: W, h: 0.18, fill: { color: C.navy } });
}

// ─── SLIDE 11: CALL TO ACTION ─────────────────────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.navy };

  s.addShape(pres.shapes.OVAL, { x: -2, y: 2.5, w: 6, h: 6, fill: { color: C.teal, transparency: 88 } });
  s.addShape(pres.shapes.OVAL, { x: 7.0, y: -2, w: 6, h: 6, fill: { color: C.blue, transparency: 82 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.055, fill: { color: C.teal } });

  s.addText("Ready to Digitize Your\nQuality Management?", { x: 0.7, y: 0.7, w: 8.6, h: 1.7, fontSize: 40, bold: true, color: C.white, fontFace: "Calibri", margin: 0, align: "center" });
  s.addText("Join the MENA region's quality revolution.\nBook a free demo and see InspectPro QMS in action today.", { x: 1.0, y: 2.5, w: 8.0, h: 0.85, fontSize: 16, color: C.gray, fontFace: "Calibri", margin: 0, align: "center" });

  // CTA buttons
  s.addShape(pres.shapes.RECTANGLE, { x: 2.5, y: 3.55, w: 2.2, h: 0.55, fill: { color: C.teal } });
  s.addText("Book a Free Demo", { x: 2.5, y: 3.55, w: 2.2, h: 0.55, fontSize: 13, bold: true, color: C.white, align: "center", fontFace: "Calibri", margin: 0, valign: "middle" });

  s.addShape(pres.shapes.RECTANGLE, { x: 5.0, y: 3.55, w: 2.2, h: 0.55, fill: { color: C.navyMid } });
  s.addText("Start Free Trial", { x: 5.0, y: 3.55, w: 2.2, h: 0.55, fontSize: 13, bold: true, color: C.teal, align: "center", fontFace: "Calibri", margin: 0, valign: "middle" });

  // Contact
  const contacts = ["🌐  www.inspectpro.io", "📧  hello@inspectpro.io", "📞  +966 5X XXX XXXX"];
  contacts.forEach((c, i) => {
    s.addText(c, { x: 1.5 + i * 2.7, y: 4.45, w: 2.5, h: 0.38, fontSize: 12, color: C.gray, fontFace: "Calibri", margin: 0, align: "center" });
  });

  s.addText("© 2025 InspectPro QMS · All rights reserved", { x: 0, y: H - 0.22, w: W, h: 0.22, fontSize: 9, color: C.gray, align: "center", fontFace: "Calibri", margin: 0 });
}

// ─── WRITE FILE ───────────────────────────────────────────────────────────────
pres.writeFile({ fileName: "D:/inspection-react-full/InspectPro_QMS_Pitch_v2.pptx" })
  .then(() => console.log("✅ Saved: InspectPro_QMS_Pitch.pptx"))
  .catch(e => { console.error("❌", e); process.exit(1); });
