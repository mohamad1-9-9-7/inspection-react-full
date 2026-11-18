/* Builds the source images @capacitor/assets turns into every Android
   launcher-icon / splash size. Run, then generate:
     node scripts/android-assets.cjs
     npx @capacitor/assets generate --android
   Source of truth = public/brand/inspect-pro/mark-white.svg (brand navy bg). */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const NAVY = "#0B1E3F";
const root = path.join(__dirname, "..");
const out = path.join(root, "assets");
const mark = fs.readFileSync(path.join(root, "public/brand/inspect-pro/mark-white.svg"));

fs.mkdirSync(out, { recursive: true });

async function markPng(size) {
  return sharp(mark, { density: 1200 }).resize(size, size).png().toBuffer();
}

async function canvas(size, bg, markSize, file) {
  const img = sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  });
  const m = await markPng(markSize);
  const off = Math.round((size - markSize) / 2);
  await img.composite([{ input: m, top: off, left: off }]).png().toFile(path.join(out, file));
  console.log("wrote", file);
}

(async () => {
  const clear = { r: 0, g: 0, b: 0, alpha: 0 };
  // Adaptive icon: Android masks to ~66% of the layer, keep the mark inside it.
  await canvas(1024, clear, 560, "icon-foreground.png");
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: NAVY } })
    .png().toFile(path.join(out, "icon-background.png"));
  console.log("wrote icon-background.png");
  // Legacy square icon (pre-Android 8) + Play Store 512 listing icon.
  await canvas(1024, NAVY, 700, "icon-only.png");
  await canvas(2732, NAVY, 640, "splash.png");
  await canvas(2732, NAVY, 640, "splash-dark.png");
})();
