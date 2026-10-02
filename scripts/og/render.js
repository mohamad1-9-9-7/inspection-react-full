// Renders the link-preview images (Open Graph, 1200×630) into public/og/.
//
//   node scripts/og/render.js
//
// Uses the Edge/Chrome already on the machine in headless mode to screenshot
// scripts/og/card.html for each page × language, then sharp turns the PNG into
// a small JPEG (WhatsApp skips previews whose image is too heavy).
// After changing the images, bump OG_VERSION in netlify/edge-functions/seo.js
// so WhatsApp / LinkedIn fetch the new picture instead of their cached one.
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const sharp = require("sharp");

const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];
const browser = process.env.OG_BROWSER || BROWSERS.find((p) => fs.existsSync(p));
if (!browser) throw new Error("No Edge/Chrome found — set OG_BROWSER to its path.");

const VARIANTS = [
  ["demo", "en"], ["demo", "ar"],
  ["readiness", "en"], ["readiness", "ar"],
];

const card = pathToFileURL(path.join(__dirname, "card.html")).href;
const outDir = path.join(__dirname, "..", "..", "public", "og");
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  for (const [page, lang] of VARIANTS) {
    const png = path.join(os.tmpdir(), `og-${page}-${lang}.png`);
    execFileSync(browser, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
      `--user-data-dir=${path.join(os.tmpdir(), "og-render-profile")}`, // never touch the real profile
      "--window-size=1200,630", "--virtual-time-budget=10000", `--screenshot=${png}`,
      `${card}?page=${page}&lang=${lang}`,
    ], { stdio: "ignore" });
    const out = path.join(outDir, `${page}-${lang}.jpg`);
    await sharp(png).resize(1200, 630).jpeg({ quality: 86, mozjpeg: true }).toFile(out);
    fs.unlinkSync(png);
    console.log(`${path.relative(process.cwd(), out)}  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
