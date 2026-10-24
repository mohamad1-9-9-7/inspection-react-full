// Renders the LinkedIn post images (portrait 1080×1350) into docs/linkedin/.
//
//   node scripts/linkedin/render.js        → all ten
//   node scripts/linkedin/render.js 3 7    → only posts 3 and 7
//
// Same approach as scripts/og/render.js: headless Edge/Chrome screenshots
// post.html?n=N, then sharp turns the PNG into a JPEG. Run it from PowerShell
// (headless Chrome silently does nothing from the Bash sandbox).
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
];
const browser = process.env.OG_BROWSER || BROWSERS.find((p) => fs.existsSync(p));
if (!browser) throw new Error("No Edge/Chrome found — set OG_BROWSER to its path.");

const W = 1080, H = 1350;
const picked = process.argv.slice(2).map(Number).filter(Boolean);
const posts = picked.length ? picked : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const page = pathToFileURL(path.join(__dirname, "post.html")).href;
const outDir = path.join(__dirname, "..", "..", "docs", "linkedin");
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  for (const n of posts) {
    const png = path.join(os.tmpdir(), `li-post-${n}.png`);
    execFileSync(browser, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
      `--user-data-dir=${path.join(os.tmpdir(), "og-render-profile")}`,
      `--window-size=${W},${H}`, "--virtual-time-budget=10000", `--screenshot=${png}`,
      `${page}?n=${n}`,
    ], { stdio: "ignore" });
    const out = path.join(outDir, `post-${String(n).padStart(2, "0")}.jpg`);
    await sharp(png).resize(W, H).jpeg({ quality: 92, mozjpeg: true }).toFile(out);
    fs.unlinkSync(png);
    console.log(`${path.relative(process.cwd(), out)}  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
