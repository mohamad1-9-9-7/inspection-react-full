// src/companies/exaltis/ohc/upload/ohcLists.js
// OHC upload — pick lists.
// (Split out of OHCUpload.jsx — the code is unchanged.)

/* The certificate used to be stored inside the payload as base64 — one record
   ran ~87 KB, of which 99.4% was the image, and reading the list cost 12.9 MB.
   It now goes to Cloudinary via uploadImage(), which resizes to 1280px at
   quality 80 server-side, so the local canvas pass here is gone. */

/* ========= UI ========= */

// Nationality dropdown (English) including requested + all African countries + Philippines
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
/* Employee Name → name, Place Of Work → branch, JOB TITLE → job */
export const EMPLOYEES = {
};
