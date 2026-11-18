// Android app (Capacitor) only: make every "download" in the app work.
//
// The WebView inside the APK silently ignores blob:/data: downloads, which is
// how every Excel / PDF / ZIP export here saves (file-saver, jsPDF.save,
// <a download>). Instead of touching ~90 call sites, we catch the click on a
// download link (and window.open(blob:…)), write the file to the app's cache
// and open Android's share sheet: Save to Files / Drive / WhatsApp / e-mail.
// On the website this module does nothing.
import { Capacitor } from "@capacitor/core";

const isNative = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

function isLocalFileUrl(href) {
  return /^(blob:|data:)/i.test(String(href || ""));
}

function guessName(mime) {
  const ext = {
    "application/pdf": "pdf",
    "application/zip": "zip",
    "text/csv": "csv",
    "application/json": "json",
    "image/png": "png",
    "image/jpeg": "jpg",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  }[String(mime || "").split(";")[0]] || "bin";
  return `InspectPro-${Date.now()}.${ext}`;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function saveFileNative(href, name) {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const blob = await (await fetch(href)).blob();
  const fileName = String(name || guessName(blob.type)).replace(/[\\/:*?"<>|]+/g, "_");
  const data = await blobToBase64(blob);
  const { uri } = await Filesystem.writeFile({
    path: `downloads/${fileName}`,
    data,
    directory: Directory.Cache,
    recursive: true,
  });
  await Share.share({ title: fileName, files: [uri], dialogTitle: fileName });
}

function handle(a) {
  const href = a.getAttribute("href") || a.href;
  if (!a.hasAttribute("download") || !isLocalFileUrl(href)) return false;
  saveFileNative(href, a.getAttribute("download")).catch((e) => {
    // Share sheet dismissed is not an error worth showing.
    if (!/cancel/i.test(String(e && e.message))) alert("Could not save the file: " + (e?.message || e));
  });
  return true;
}

export function installNativeDownloads() {
  if (!isNative() || window.__nativeDownloadsInstalled) return;
  window.__nativeDownloadsInstalled = true;

  const proto = HTMLAnchorElement.prototype;
  const origClick = proto.click;
  proto.click = function () {
    if (handle(this)) return;
    return origClick.call(this);
  };

  // file-saver and jsPDF dispatch a synthetic click on a detached <a>.
  const origDispatch = proto.dispatchEvent;
  proto.dispatchEvent = function (ev) {
    if (ev && ev.type === "click" && handle(this)) return false;
    return origDispatch.call(this, ev);
  };

  // A real <a download href="blob:…"> clicked by the user.
  document.addEventListener("click", (ev) => {
    const a = ev.target && ev.target.closest && ev.target.closest("a[download]");
    if (a && handle(a)) ev.preventDefault();
  }, true);

  // "Open PDF in new tab" style previews.
  const origOpen = window.open;
  window.open = function (url, ...rest) {
    if (isLocalFileUrl(url)) {
      saveFileNative(url).catch(() => {});
      return null;
    }
    return origOpen.call(window, url, ...rest);
  };
}
