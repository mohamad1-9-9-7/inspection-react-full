// Netlify Edge Function — link previews (Open Graph / Twitter) per page + language.
//
// WhatsApp, LinkedIn, Facebook, X and Google read the raw HTML and never run
// our React code, so a tag set from JavaScript is invisible to them. This runs
// on Netlify's edge in front of the SPA: it takes the built index.html and
// swaps in the title, description, canonical URL and preview image for the
// public sales pages, in English or Arabic (?lang=ar), before it is sent.
// Every other route is untouched (config.path below) and keeps the
// brand-level defaults written in public/index.html.
//
// Images: public/og/*.jpg (1200×630), made by `node scripts/og/render.js`.
// Changed an image? Bump OG_VERSION — the platforms cache by image URL.

const OG_VERSION = "1";

const PAGES = {
  "/demo": {
    image: "demo",
    en: {
      title: "InspectPro — Food Safety & HACCP Software | Book a Free Demo",
      description: "Replace paper logs with one live platform for HACCP, ISO 22000, internal audits, traceability and suppliers. Every branch, every record — inspection-ready, always.",
      alt: "InspectPro dashboard: readiness 94%, all branches reporting, cooler within limit, NCR closed with evidence.",
    },
    ar: {
      title: "InspectPro — نظام سلامة الغذاء و HACCP | احجز عرضًا مجانيًا",
      description: "منصة واحدة مباشرة بدل السجلات الورقية: HACCP و ISO 22000 والتدقيق الداخلي والتتبّع والموردون. كل فرع وكل سجل جاهز للتفتيش دائمًا.",
      alt: "لوحة تحكم InspectPro: جاهزية 94%، كل الفروع سجّلت، الثلاجة ضمن الحد، وحالة عدم مطابقة أُغلقت بالدليل.",
    },
  },
  "/readiness": {
    image: "readiness",
    en: {
      title: "How Inspection-Ready Is Your Food Business? Free 2-Minute Check | InspectPro",
      description: "10 quick questions, about 2 minutes. Get a score out of 100 and the gaps a food-safety inspector would find first — free, no sign-up.",
      alt: "Food-safety readiness check: a score out of 100 covering temperature logs, traceability, suppliers and training.",
    },
    ar: {
      title: "ما مدى جاهزية شركتك لتفتيش سلامة الغذاء؟ فحص مجاني في دقيقتين | InspectPro",
      description: "عشرة أسئلة سريعة في دقيقتين تقريبًا. تحصل على درجة من 100 وعلى الثغرات التي سيلاحظها المفتش أولًا — مجانًا ودون تسجيل.",
      alt: "فحص جاهزية سلامة الغذاء: درجة من 100 تشمل سجلات الحرارة والتتبّع والموردين والتدريب.",
    },
  },
  "/": {
    image: "demo",
    en: {
      title: "InspectPro — Food Safety, Quality & Compliance Platform",
      description: "HACCP, ISO 22000, internal audits, traceability and supplier control for multi-branch food businesses — in Arabic and English.",
      alt: "InspectPro dashboard: readiness 94%, all branches reporting, cooler within limit, NCR closed with evidence.",
    },
    ar: {
      title: "InspectPro — منصة سلامة الغذاء والجودة والامتثال",
      description: "HACCP و ISO 22000 والتدقيق الداخلي والتتبّع ورقابة الموردين للشركات الغذائية متعددة الفروع — بالعربية والإنجليزية.",
      alt: "لوحة تحكم InspectPro: جاهزية 94%، كل الفروع سجّلت، الثلاجة ضمن الحد، وحالة عدم مطابقة أُغلقت بالدليل.",
    },
  },
};

const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The page's tags for one URL, or null when the route is not a public page. */
export function pageMeta(url) {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const page = PAGES[path];
  if (!page) return null;
  const lang = url.searchParams.get("lang") === "ar" ? "ar" : "en";
  const t = page[lang];
  const pageUrl = (l) => `${url.origin}${path === "/" ? "/" : path}${l === "ar" ? "?lang=ar" : ""}`;
  return {
    lang,
    title: t.title,
    description: t.description,
    canonical: pageUrl(lang),
    alternates: { en: pageUrl("en"), ar: pageUrl("ar") },
    image: `${url.origin}/og/${page.image}-${lang}.jpg?v=${OG_VERSION}`,
    imageAlt: t.alt,
  };
}

export function headTags(m) {
  const locale = m.lang === "ar" ? "ar_AE" : "en_US";
  const other = m.lang === "ar" ? "en_US" : "ar_AE";
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}">`,
    `<link rel="canonical" href="${esc(m.canonical)}">`,
    `<link rel="alternate" hreflang="en" href="${esc(m.alternates.en)}">`,
    `<link rel="alternate" hreflang="ar" href="${esc(m.alternates.ar)}">`,
    `<link rel="alternate" hreflang="x-default" href="${esc(m.alternates.en)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="InspectPro">`,
    `<meta property="og:locale" content="${locale}">`,
    `<meta property="og:locale:alternate" content="${other}">`,
    `<meta property="og:url" content="${esc(m.canonical)}">`,
    `<meta property="og:title" content="${esc(m.title)}">`,
    `<meta property="og:description" content="${esc(m.description)}">`,
    `<meta property="og:image" content="${esc(m.image)}">`,
    `<meta property="og:image:secure_url" content="${esc(m.image)}">`,
    `<meta property="og:image:type" content="image/jpeg">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(m.imageAlt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(m.title)}">`,
    `<meta name="twitter:description" content="${esc(m.description)}">`,
    `<meta name="twitter:image" content="${esc(m.image)}">`,
    `<meta name="twitter:image:alt" content="${esc(m.imageAlt)}">`,
  ].join("");
}

/* Drop the defaults from index.html, then add this page's set before </head>. */
export function rewriteHtml(html, m) {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\b[^>]*\b(?:name|property)=["']?(?:description|og:[^"'\s>]+|twitter:[^"'\s>]+)["']?[^>]*>/gi, "")
    .replace(/<link\b[^>]*\brel=["']?(?:canonical|alternate)["']?[^>]*>/gi, "")
    .replace(/<html\b([^>]*)\blang=["']?[^"'\s>]*["']?/i, `<html$1lang="${m.lang}"`)
    .replace(/<\/head>/i, `${headTags(m)}</head>`);
}

export default async (request, context) => {
  const meta = pageMeta(new URL(request.url));
  if (!meta) return; // not a public page — serve as usual

  const res = await context.next();
  if (!(res.headers.get("content-type") || "").includes("text/html")) return res;

  const headers = new Headers(res.headers);
  headers.delete("content-length");
  const html = await res.text();
  let out = html;
  try { out = rewriteHtml(html, meta); } catch { /* never break the page over a preview */ }
  return new Response(out, { status: res.status, headers });
};

export const config = { path: ["/", "/demo", "/demo/", "/readiness", "/readiness/"] };
