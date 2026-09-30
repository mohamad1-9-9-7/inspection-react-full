// src/companies/exaltis/certs/upload/certUploadModel.js
// Certificate upload — types, lists, expiry and image compression.
// (Split out of CertUpload.jsx — the code is unchanged.)

/* ========= API ========= */


/* Server report type */
export const TYPE = "sweets_training_certificate";

/* ========= Helpers ========= */
export async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...opts,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

// Compress image to File (1280px / 0.8 quality) — for Cloudinary upload
export async function compressToFile(file, { maxDim = 1280, quality = 0.8 } = {}) {
  const dataURL = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataURL;
  });
  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error("Canvas toBlob failed")); return; }
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
      },
      "image/jpeg",
      quality
    );
  });
}

/* ========= Nationalities (dropdown like OHC) ========= */
export const NATIONALITIES = [
  "Syria",
  "Lebanon",
  "Egypt",
  "India",
  "Pakistan",
  "Afghanistan",
  "Sudan",
  "Palestine",
  "Nepal",
  "Ghana",
  "Morocco",
  "Philippines",
  "Algeria",
  "Angola",
  "Benin",
  "Botswana",
  "Burkina Faso",
  "Burundi",
  "Cabo Verde",
  "Cameroon",
  "Central African Republic",
  "Chad",
  "Comoros",
  "Democratic Republic of the Congo",
  "Republic of the Congo",
  "Djibouti",
  "Equatorial Guinea",
  "Eritrea",
  "Eswatini",
  "Ethiopia",
  "Gabon",
  "Gambia",
  "Guinea",
  "Guinea-Bissau",
  "Ivory Coast",
  "Kenya",
  "Lesotho",
  "Liberia",
  "Libya",
  "Madagascar",
  "Malawi",
  "Mali",
  "Mauritania",
  "Mauritius",
  "Mozambique",
  "Namibia",
  "Niger",
  "Nigeria",
  "Rwanda",
  "Sao Tome and Principe",
  "Senegal",
  "Seychelles",
  "Sierra Leone",
  "Somalia",
  "South Africa",
  "South Sudan",
  "Tanzania",
  "Togo",
  "Tunisia",
  "Uganda",
  "Zambia",
  "Zimbabwe",
  "Other",
];

/* ====== Employees mapping (ID → Name / Branch / Job) ====== */
/* Sweets company roster — intentionally empty (no data from any other company). */
export const EMPLOYEES = {};

/* ====== Course types + مدد الشهادة ====== */
export const COURSE_TYPES = [
  { value: "", label: "-- Select Course Type -- · -- اختر نوع الدورة --" },
  { value: "BFS", label: "Basic Food Safety (BFS) · سلامة الغذاء الأساسية" },
  { value: "PIC", label: "Person In Charge (PIC) · الشخص المسؤول" },
  { value: "EFST", label: "EFST" },
  { value: "HACCP", label: "HACCP · الهاسب" },
  { value: "HALAL", label: "Halal Certificate · شهادة الحلال" },
  { value: "FIRST_AID", label: "First Aid · الإسعافات الأولية" },
  { value: "EMERGENCY", label: "Emergency · الطوارئ" },
  { value: "ISO22000_AUDIT", label: "ISO 22000 Internal Audit · التدقيق الداخلي ايزو 22000" },
  { value: "OTHER", label: "Other / Custom (manual) · أخرى / مخصص (يدوي)" },
];

export const COURSE_DURATION_YEARS = {
  BFS: 2, // مدة شهادة ال BFS 2 سنة
  PIC: 5, // مدة شهادة ال PIC 5 سنوات
  EFST: 5, // مدة شهادة ال EFST 5 سنوات
  // HACCP: لا يوجد انتهاء
};

export function computeExpiry(courseType, issueDateStr) {
  if (!issueDateStr) return "";
  const years = COURSE_DURATION_YEARS[courseType];
  if (!years) return "";
  const [y, m, d] = issueDateStr.split("-").map((v) => parseInt(v, 10));
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCFullYear(dt.getUTCFullYear() + years);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/* إنشاء شهادة فارغة */
export function makeEmptyCert() {
  return {
    courseType: "",
    customCourseName: "",
    issueDate: "",
    expiryDate: "",
    imageUrl: "",       // Cloudinary URL (لا base64)
    imageName: "",
  };
}
