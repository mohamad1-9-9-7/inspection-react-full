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

/* ── Structured data (JSON-LD) for Google ─────────────────────────────
   Must match what the page shows: prices as on the /demo pricing section
   (src/pages/DemoValue.jsx), FAQ as on /demo (src/pages/DemoRequest.jsx). */
const SITE = "https://inspectpro-ae.netlify.app";
const ORG = {
  "@type": "Organization",
  "@id": `${SITE}/#org`,
  name: "INSPECT PRO",
  url: SITE,
  logo: `${SITE}/brand/inspect-pro/app-icon-512.png`,
  slogan: "Food safety · Quality · Compliance",
  areaServed: ["AE", "SA", "QA", "KW", "BH", "OM"],
  address: { "@type": "PostalAddress", addressCountry: "AE" },
};
const plan = (name, price) => ({
  "@type": "Offer",
  name,
  price: String(price),
  priceCurrency: "AED",
  priceSpecification: { "@type": "UnitPriceSpecification", price, priceCurrency: "AED", unitText: "branch / month" },
});
const FAQ = {
  en: [
    ["Does it work in Arabic?", "Yes. Every screen works in Arabic and English, and each user works in their own language."],
    ["Do we need our own server or IT team?", "No. InspectPro runs in the cloud and opens in any browser — on a phone at the branch or a computer at head office."],
    ["Can our current forms be kept?", "Yes. Your paper forms are turned into digital checklists that follow the same layout, and reports print in that layout too."],
    ["How is it priced?", "Per branch: Essential AED 249 a month (1–2 branches), Professional AED 399 a month (3 or more), about two months less when billed annually. Factories and large chains get a custom quote."],
  ],
  ar: [
    ["هل يعمل النظام باللغة العربية؟", "نعم. جميع الشاشات تعمل بالعربية والإنجليزية، ويعمل كل مستخدم بلغته."],
    ["هل نحتاج إلى خادم خاص أو فريق تقنية معلومات؟", "لا. يعمل InspectPro سحابيًا ويُفتح من أي متصفح — من الجوال في الفرع أو من الحاسوب في الإدارة."],
    ["هل يمكن الإبقاء على نماذجنا الحالية؟", "نعم. تتحول نماذجكم الورقية إلى قوائم فحص رقمية بالتصميم نفسه، وتُطبع التقارير بذلك التصميم أيضًا."],
    ["كيف يُحتسب السعر؟", "لكل فرع: الأساسية 249 درهمًا شهريًا (فرع أو فرعان)، والاحترافية 399 درهمًا شهريًا (3 فروع فأكثر)، وبخصم نحو شهرين عند الدفع السنوي. المصانع والسلاسل الكبيرة تحصل على عرض سعر خاص."],
  ],
};

export function jsonLd(path, m) {
  const graph = [ORG];
  if (path === "/demo") {
    graph.push({
      "@type": "SoftwareApplication",
      name: "InspectPro",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Food safety & quality management (HACCP, ISO 22000)",
      operatingSystem: "Web browser (phone, tablet, computer)",
      inLanguage: ["en", "ar"],
      url: m.canonical,
      description: m.description,
      image: m.image,
      publisher: { "@id": `${SITE}/#org` },
      offers: [plan("Essential", 249), plan("Professional", 399)],
    });
    graph.push({
      "@type": "FAQPage",
      inLanguage: m.lang,
      mainEntity: FAQ[m.lang].map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    });
  } else if (path === "/readiness") {
    graph.push({
      "@type": "WebApplication",
      name: m.lang === "ar" ? "فحص جاهزية سلامة الغذاء" : "Food-safety inspection readiness check",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web browser",
      isAccessibleForFree: true,
      inLanguage: m.lang,
      url: m.canonical,
      description: m.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "AED" },
      publisher: { "@id": `${SITE}/#org` },
    });
  } else {
    graph.push({ "@type": "WebSite", name: "InspectPro", url: `${SITE}/`, inLanguage: ["en", "ar"], publisher: { "@id": `${SITE}/#org` } });
  }
  // "<" escaped so nothing inside can close the script tag.
  return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>`;
}

/* A plain-text twin for crawlers and link readers that do not run JavaScript.
   People never see it (the app replaces nothing inside <noscript>). */
function noscriptBlock(m) {
  const ar = m.lang === "ar";
  const links = ar
    ? `<a href="/demo?lang=ar">احجز عرضًا مجانيًا</a> · <a href="/readiness?lang=ar">فحص الجاهزية المجاني</a>`
    : `<a href="/demo">Book a free demo</a> · <a href="/readiness">Free readiness check</a>`;
  return `<noscript><main dir="${ar ? "rtl" : "ltr"}" style="font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;line-height:1.6">`
    + `<h1>${esc(m.title)}</h1><p>${esc(m.description)}</p><p>${links}</p></main></noscript>`;
}

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
    path,
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

/* Drop the defaults from index.html, then add this page's set before </head>.
   `country` (2 letters, from Netlify's geo lookup) is left for the page's own
   visitor stats (src/utils/siteStats.js) — it never leaves our site. */
export function rewriteHtml(html, m, country = "") {
  const cc = /^[A-Z]{2}$/.test(String(country)) ? `<meta name="x-country" content="${country}">` : "";
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\b[^>]*\b(?:name|property)=["']?(?:description|og:[^"'\s>]+|twitter:[^"'\s>]+)["']?[^>]*>/gi, "")
    .replace(/<link\b[^>]*\brel=["']?(?:canonical|alternate)["']?[^>]*>/gi, "")
    .replace(/<html\b([^>]*)\blang=["']?[^"'\s>]*["']?/i, `<html$1lang="${m.lang}"`)
    .replace(/<\/head>/i, () => `${headTags(m)}${jsonLd(m.path, m)}${cc}</head>`)
    .replace(/<div id=["']?root["']?>/i, (root) => `${noscriptBlock(m)}${root}`);
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
  try { out = rewriteHtml(html, meta, context.geo?.country?.code || ""); } catch { /* never break the page over a preview */ }
  return new Response(out, { status: res.status, headers });
};

export const config = { path: ["/", "/demo", "/demo/", "/readiness", "/readiness/"] };
