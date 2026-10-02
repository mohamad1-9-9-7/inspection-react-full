// Browser-tab titles.
//
// Public sales pages (/, /demo, /readiness) carry a marketing title in the
// page's own language and follow the language switch. Everything inside the
// app is just "InspectPro" — pages that need more (an urgent count, a print
// file name) still set document.title themselves and win, because
// <RouteTitle/> only runs when the route changes.
//
// Keep the public titles in step with netlify/edge-functions/seo.js, which
// writes the same titles into the HTML for link previews and Google (the edge
// function cannot import from src/).
import { useEffect } from "react";

export const APP_TITLE = "InspectPro";

export const PUBLIC_TITLES = {
  "/": {
    en: "InspectPro — Food Safety, Quality & Compliance Platform",
    ar: "InspectPro — منصة سلامة الغذاء والجودة والامتثال",
  },
  "/demo": {
    en: "InspectPro — Food Safety & HACCP Software | Book a Free Demo",
    ar: "InspectPro — نظام سلامة الغذاء و HACCP | احجز عرضًا مجانيًا",
  },
  "/readiness": {
    en: "How Inspection-Ready Is Your Food Business? Free 2-Minute Check | InspectPro",
    ar: "ما مدى جاهزية شركتك لتفتيش سلامة الغذاء؟ فحص مجاني في دقيقتين | InspectPro",
  },
};

export const isPublicPath = (pathname) => Object.prototype.hasOwnProperty.call(PUBLIC_TITLES, pathname);

/** Public pages: title + <html lang> follow the page's language switch. */
export function usePublicTitle(path, lang) {
  useEffect(() => {
    const t = PUBLIC_TITLES[path];
    if (!t) return;
    const l = lang === "ar" ? "ar" : "en";
    document.title = t[l];
    document.documentElement.lang = l;
  }, [path, lang]);
}
