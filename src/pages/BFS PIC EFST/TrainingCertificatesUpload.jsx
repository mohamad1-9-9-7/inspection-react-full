// D:\inspection-react-full\src\pages\BFS PIC EFST\TrainingCertificatesBFS.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

/* ========= API ========= */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" &&
      (process.env?.REACT_APP_API_URL ||
        process.env?.VITE_API_URL ||
        process.env?.RENDER_EXTERNAL_URL)) ||
    "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* Server report type */
const TYPE = "training_certificate";

/* ========= Helpers ========= */
async function jsonFetch(url, opts = {}) {
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

// Compress image in-memory to ~1280px longest side, quality ≈ 0.8 (JPEG)
async function compressImage(file) {
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

  const maxSide = 1280;
  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  const out = canvas.toDataURL("image/jpeg", 0.8);
  return out;
}

/* ========= Nationalities (dropdown like OHC) ========= */
const NATIONALITIES = [
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
/* منسوخ بالكامل من OHCUpload EMPLOYEES */
const EMPLOYEES = {
  "859": { name: "MUHAMMAD ARSLAN MUHAMMAD YAR", branch: "AL QUASIS (STORE)", job: "Driver-Light Vehicle" },
  "870": { name: "REFAEY MOHAMED REFAEY MEHASSEB", branch: "MOTOR CITY (POS 19)", job: "Chef Assistant" },
  "868": { name: "MUHAMMAD ARSLAN FRAZ GULFRAZ KHAN TABASSUM", branch: "AL QUASIS (STORE)", job: "Helper" },
  "876": { name: "ABDELRAHMAN MOHAMED REDA MAHMOUD ELAGAMY ABOUSEIF", branch: "FOOD TRUCK (MUSHRIF PARK) - FTR 1", job: "Waiter" },
  "93": { name: "JAFAR SHAH LAL SAID", branch: "DUBAI SHEEP MARKET (DSM)", job: "Driver-Light Vehicle" },
  "229": { name: "MUHAMMAD ASIF NASRULLAH KHAN", branch: "AL QUASIS (PRODUCTION)", job: "Labor" },
  "245": { name: "FAKHRUDDIN SIDDIQUI RIYAZUDDIN SIDDIQ", branch: "JEBEL ALI FEEDLOT (JAF)", job: "Maintenance Supervisor" },
  "202": { name: "KABIR UDDIN ABDUL RASHID", branch: "AL QUASIS (STORE)", job: "Drivers supervisor" },
  "703": { name: "AYHAM MARWAN WALI", branch: "SILICON OASIS COOP (POS24)", job: "Waiter" },
  "880": { name: "Ahmed Fathi Abouelfotouh Ahmed", branch: "MOTOR CITY (POS 19)", job: "Kitchen Helper" },
  "606": { name: "AHMED HELMI OTHMAN MOHAMED", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Dining Hall Supervisor" },
  "907": { name: "HASSAN HELMY MOHAMED IBRAHIM ELSANAM", branch: "ALBARSHA BUTCHERY (POS 15)", job: "Butcher Assistant" },
  "1071": { name: "HAMDOUN ABED ALHAMAD", branch: "MOTOR CITY (POS 19)", job: "Chef" },
  "892": { name: "AHMED ABDELSATTAR FARAHAN MOHAMED", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Butcher Assistant" },
  "620": { name: "ZAHEER ABBAS MUHAMMAD AZAM", branch: "AL QUASIS (STORE)", job: "Driver-Light Vehicle" },
  "902": { name: "MUSTAFA KHALED AL MASRI", branch: "Al BARSHA SOUTH COOP (POS26)", job: "Chef Assistant" },
  "1075": { name: "HAGAR AHMED WASEL HASSAN", branch: "ABU DHABI - SAFEER KHALIFA A (POS 38)", job: "Branch Supervisor" },
  "1165": { name: "MOUSTAFA AHMED ELSAYED MOHAMED AMER", branch: "MOTOR CITY (POS 19)", job: "Chef Assistant" },
  "1085": { name: "MOUSTAFA AMIN MOUSTAFA HAFEZ", branch: "ABU DHABI SAFEER MUSAFAH (POS 37)", job: "Grill Chef" },
  "1090": { name: "MOHAMMAD AMAN QURESHI MUMTIAZ ALI", branch: "ABU DHABI SAFEER MUSAFAH (POS 37)", job: "Butcher" },
  "915": { name: "MOHAMED MOHAMED AHMED MOHAMED SALMAN", branch: "AL QUASIS (PRODUCTION)", job: "Butcher" },
  "913": { name: "FRANCIS OWUSU", branch: "Al BARSHA SOUTH COOP (POS26)", job: "Labor" },
  "912": { name: "AHMED AHAB ELSAID YOUSSEF", branch: "ABU DHABI BUTCHERY (POS 10)", job: "Butcher" },
  "1022": { name: "IBRAHIM FATHY ABDELAZIZMOHAMED ABOUTALB", branch: "ABU DHABI - SAFEER KHALIFA A (POS 38)", job: "Butcher Assistant" },
  "924": { name: "KWAKU ANTWI", branch: "AL QUASIS (STORE)", job: "Labor" },
  "1000": { name: "JASIR KOVVAL IBRAHIM PATTI PUTHILATH", branch: "ABU DHABI BUTCHERY (POS 10)", job: "Accountant Assistant" },
  "961": { name: "ESSAM AHMED ABDELAZIZ BEKHIT", branch: "SILICON OASIS COOP (POS24)", job: "Butcher Assistant" },
  "978": { name: "BILAL HASAN ALMESH", branch: "SILICON OASIS COOP (POS24)", job: "Breakfast Chef" },
  "981": { name: "ALY MOHAMED ELSAYED ELSAYED ELSEBAEY", branch: "ALBARSHA BUTCHERY (POS 15)", job: "Butcher Assistant" },
  "973": { name: "MOHAMED OSAMA ABDELHAMID MOHAMED ABDELAAL", branch: "INDUSTRY EMIRATES (POS 21)", job: "Butcher Assistant" },
  "1004": { name: "AHMAD OTHMAN YAHYA", branch: "SILICON OASIS COOP (POS24)", job: "Grill Chef" },
  "990": { name: "PRINCE ADDO", branch: "JEBEL ALI FEEDLOT (JAF)", job: "Labor" },
  "1001": { name: "SULEMANA MAMUDA", branch: "AL QUASIS (STORE)", job: "Labor" },
  "989": { name: "GABRIEL OWUSU", branch: "AL QUASIS (STORE)", job: "Labor" },
  "999": { name: "THEOPHILE SEVERIN WENDYAM NANA", branch: "AL QUASIS (STORE)", job: "Labor" },
  "1013": { name: "AMMAR HASAN HOURIEH", branch: "Al BARSHA SOUTH COOP (POS26)", job: "Grill Chef" },
  "1015": { name: "HISHAM RASHAD GOMAA MAHMOUD ABOELGOUD", branch: "Al BARSHA SOUTH COOP (POS26)", job: "Butcher Assistant" },
  "1108": { name: "MOHAMMAD IBRAHIM ALHALAKI", branch: "SILICON OASIS COOP (POS24)", job: "Shawerma Chef" },
  "950": { name: "MOHAMED AMINE JRIDI", branch: "ABU DHABI - SAFEER KHALIFA A (POS 38)", job: "Butcher Assistant" },
  "1072": { name: "MOHAMED ADEL MOHAMED IBRAIM ABOURAHMA", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Butcher" },
  "941": { name: "SAHBI DHIFAOUI", branch: "SILICON OASIS COOP (POS24)", job: "Butcher" },
  "946": { name: "SAMI ABDUL MONEEM ALMOHEMED", branch: "ALBARSHA BUTCHERY (POS 15)", job: "Butcher Assistant" },
  "939": { name: "AMIN MOHAMED AMIN ABDELGHANY MOHAMED", branch: "Al BARSHA SOUTH COOP (POS26)", job: "Butcher Assistant" },
  "976": { name: "MOUSTAFA MOHAMED AHMED ZAKY ELSHAER", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Grill Chef" },
  "1005": { name: "ABDERRAHMAN ATIFI", branch: "ABU DHABI- The Fazaa (POS 44)", job: "Butcher" },
  "1093": { name: "ADIL SHAH RUSTAM SHAH.", branch: "JEBEL ALI SLAUGHTERHOUSE (JAS)", job: "Labor" },
  "1043": { name: "OSSAMA ELMOGHAZI ELSAID ABDELHAMID", branch: "ABU DHABI - SAFEER KHALIFA A (POS 38)", job: "Chef" },
  "1096": { name: "FARUKH JAWAD MIAN MUHAMMAD ANWAR.", branch: "AL QUASIS (STORE)", job: "Helper" },
  "1008": { name: "MOHAMED MOSTAFA SELIM ABOUELSAYED", branch: "SILICON OASIS COOP (POS24)", job: "Grill Chef" },
  "971": { name: "BAKR BAKR SHABANA MOHAMED ELSAYED", branch: "AL QUASIS (PRODUCTION)", job: "Butcher Assistant" },
  "977": { name: "SHERIF EID MOHAMED MAHMOUD", branch: "AL QUASIS (PRODUCTION)", job: "Butcher Assistant" },
  "1102": { name: "MOHAMED HASHEM ALI MAHMOUD.", branch: "JEBEL ALI SLAUGHTERHOUSE (JAS)", job: "Butcher" },
  "1052": { name: "AHMED KAMAL HOSNY MOHAMED", branch: "ABU DHABI SAFEER MUSAFAH (POS 37)", job: "Butcher Assistant" },
  "1062": { name: "KHALED MOHAMEDEN HAMDAN MOHAMEDEN", branch: "ABU DHABI - SAFEER KHALIFA A (POS 38)", job: "Butcher" },
  "1035": { name: "ALAA ASAAD MAAROUF", branch: "ABU DHABI - SAFEER KHALIFA A (POS 38)", job: "Butcher" },
  "1038": { name: "RUTIK RAJENDRA MATEKAR RAJENDRA ANANDA MATEKAR", branch: "AL QUASIS (STORE)", job: "Storekeeper" },
  "1032": { name: "ABDALLA SHAABAN KAMAL ABDOU ELBAIOUMI", branch: "AL QUASIS (PRODUCTION)", job: "Butcher Assistant" },
  "1063": { name: "RAMI AHMAD KHALEEL", branch: "MOTOR CITY (POS 19)", job: "Shawerma Chef" },
  "1069": { name: "ELTAHIR MOHAMED GURASHI ALI", branch: "MOTOR CITY (POS 19)", job: "Butcher" },
  "904": { name: "AMROU FETOUH MOSBAH FETOUH MOHAMED", branch: "ALBARSHA BUTCHERY (POS 15)", job: "Butcher Assistant" },
  "1028": { name: "REDA ELSAYED ABDELWAHAB SANAD HAMADA", branch: "ABU DHABI BUTCHERY (POS 10)", job: "Butcher Assistant" },
  "1111": { name: "AMAR ABDALLA OMER ABAKR", branch: "AL AIN-MARKET (POS 11)", job: "Driver-Light Vehicle" },
  "674": { name: "IRFAN RASHEED MUHAMMAD RASHEED", branch: "ALBARSHA BUTCHERY (POS 15)", job: "Driver-Motorcycle" },
  "1107": { name: "YASSER REDA SAAD HAMZA", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Driver-Motorcycle" },
  "1036": { name: "ATEF FARAHAT ABDELKAWI HASIBA", branch: "ABU DHABI - SAFEER KHALIFA A (POS 38)", job: "Butcher Assistant" },
  "467": { name: "IMRAN KHAN MAHAHMA", branch: "AL QUASIS (PRODUCTION)", job: "Butcher Assistant" },
  "1188": { name: "SALEM IBRAHIM ELMETWALLI ABDELSALAM", branch: "AL AIN BUTCHERY (POS 14)", job: "Butcher" },
  "635": { name: "NAGLAA REFKI FAHMI MOHAMED ELKOTT", branch: "MOTOR CITY (POS 19)", job: "Retail Supervisor" },
  "770": { name: "FAHAD SAEED SAEED GUL", branch: "ABU DHABI BUTCHERY (POS 10)", job: "Helper" },
  "1116": { name: "RANJITH MUDDAM SHANKAR MUDDAM", branch: "ALBARSHA BUTCHERY (POS 15)", job: "Driver-Motorcycle" },
  "1119": { name: "ELTAYEB EL TAHIR IBRAHIM MOHAMED", branch: "ABU DHABI-STORE (POS 7)", job: "Accounting Clerk" },
  "1117": { name: "ABDELMOUNAIM LASRI", branch: "FOOD TRUCK (MUSHRIF PARK) - FTR 1", job: "Waiter" },
  "1091": { name: "MOHAMED RAMADAN ALWANY ALY YOUSEF", branch: "SILICON OASIS COOP (POS24)", job: "Driver-Motorcycle" },
  "1029": { name: "MOHAMMAD MAHMOUD ALETR", branch: "AL QUASIS (PRODUCTION)", job: "Butcher Assistant" },
  "1042": { name: "ABDELRAZIK ZAKI ABDELWAHAB AHMED", branch: "ABU DHABI SAFEER MUSAFAH (POS 37)", job: "Butcher Assistant" },
  "686": { name: "MARK ASAMOAH", branch: "AL QUASIS (STORE)", job: "Cleaner" },
  "682": { name: "MUJEEB UR REHMAN HABIB UR REHMAN", branch: "Al BARSHA SOUTH COOP (POS26)", job: "Labor" },
  "710": { name: "KADIATU MARRAH", branch: "FOOD TRUCK (AL MAMZAR) - FTR 2", job: "Waiter" },
  "728": { name: "USAMA RAUF ABBASI ABDUL RAUF KHAN", branch: "MOTOR CITY (POS 19)", job: "Driver-Motorcycle" },
  "697": { name: "ABDELMAGID ABDELRAHMAN NASSAR KHALIL", branch: "MOTOR CITY (POS 19)", job: "Chef Mashawi" },
  "634": { name: "ODAI AHMAD ALHALAKI", branch: "Al BARSHA SOUTH COOP (POS26)", job: "Chef Grill" },
  "479": { name: "MOHAMED ABDELHAMID ABOUELMATY DAHAB", branch: "AL QUASIS (STORE)", job: "Driver-Light Vehicle" },
  "714": { name: "AMJAD RADWAN ALMHANA", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Chef General" },
  "727": { name: "ZEESHAN ALI LIAQAT ALI", branch: "ABU DHABI BUTCHERY (POS 10)", job: "Driver-Motorcycle" },
  "737": { name: "ZIAD MUSTAFA MACHLAH", branch: "SILICON OASIS COOP (POS24)", job: "Butcher Assistant" },
  "478": { name: "ALI HUSAIN MATLOOB HUSAIN", branch: "AL QUASIS (STORE)", job: "Driver-Light Vehicle" },
  "468": { name: "UMAIR ALI SHAH JUMA KHAN", branch: "DUBAI SLAUGHTERHOUSE-FRESH (DSHF,DSHL)", job: "Labor" },
  "731": { name: "MOHAMAD AYMAN KALIH", branch: "AL QUASIS (STORE)", job: "Logisitc Coordinator" },
  "1180": { name: "MAHMOUD ELSAYED MOUSA ELSAYED", branch: "ABU DHABI BUTCHERY (POS 10)", job: "Merchandiser: Cheese & Deli" },
  "1126": { name: "AWAB KAMAL YAGOUB MOHAGER", branch: "ABU DHABI - SAFEER KHALIFA A (POS 38)", job: "Labor" },
  "1124": { name: "SALEM ELSAYED MOHAMED SALEM RAMADAN.", branch: "ABU DHABI BUTCHERY (POS 10)", job: "Butcher" },
  "1128": { name: "REGINE MAE PERALTA CATOLICO", branch: "FOOD TRUCK (AL MAMZAR) - FTR 2", job: "Waitress" },
  "1130": { name: "MALATI LAMA", branch: "FOOD TRUCK (AL MAMZAR) - FTR 2", job: "Waitress" },
  "679": { name: "MARYAM ABDELNAEIM ALY AHMED MOUSSA", branch: "ALBARSHA BUTCHERY (POS 15)", job: "Branch Supervisor" },
  "1122": { name: "ABDULLA SAEED KHALIFA BIN GHAZI ALSUWAIDI", branch: "ABU DHABI-STORE (POS 7)", job: "Public Relation Coordinator" },
  "696": { name: "JAMAL MAJED AL RAHBAN", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Chef Assistant" },
  "457": { name: "MOHAMED ABBAS HAMODA MOHAMED ALY", branch: "MOTOR CITY (POS 19)", job: "Driver-Light Vehicle" },
  "911": { name: "MARWAN OMAR MUSHALLH", branch: "SILICON OASIS COOP (POS24)", job: "Butcher Assistant" },
  "1132": { name: "OMAR ABDELHAKIM ABOBAKR ALI", branch: "ABU DHABI FAZAA BANIYAS (POS 41)", job: "Butcher" },
  "1131": { name: "AMJAD MEHMOOD HAQ NAWAZ", branch: "AL AIN-MARKET (POS 11)", job: "Accountant Assistant" },
  "975": { name: "ALA DINDIN DELA SERNA APULI", branch: "Al BARSHA SOUTH COOP (POS26)", job: "Sales" },
  "348": { name: "SHUAIB ALI NAZAR ALI", branch: "DUBAI-MEET MARKET (POS 2)", job: "Driver & Salesman" },
  "1133": { name: "MAALY ASHRF MERGANI MADNI", branch: "FOOD TRUCK (AL MAMZAR) - FTR 2", job: "Hostess & Braai Driver" },
  "1141": { name: "MOHAMED ABDELHAMID ELSAYED ELAZAB ELASHMAWY", branch: "MOTOR CITY (POS 19)", job: "Kitchen Helper" },
  "1143": { name: "WALIELDIN GAREEBALLA MUBARAK SULIMAN", branch: "AL QUASIS (STORE)", job: "Helper" },
  "1147": { name: "NOURIDINI YERIMA", branch: "Al BARSHA SOUTH COOP (POS26)", job: "Helper" },
  "1149": { name: "YOUSIF HABEB SULIMAN MOHAMMED", branch: "AL QUASIS (STORE)", job: "Helper" },
  "1151": { name: "MOHAMED AZZAM ATEF ABOUELHODA REFAEY", branch: "AL QUASIS (STORE)", job: "Helper" },
  "1144": { name: "FOSTER KWESI AGYAPONG", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Helper" },
  "626": { name: "RAVIKUMAR KOKKIRI SAMPATHA RAO KOKKIRI", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Waiter" },
  "1153": { name: "THAMARAIKKANNAN VENKATACHALAM VENKATACHALAM", branch: "AL QUASIS (STORE)", job: "Driver-Light Vehicle" },
  "875": { name: "MOHAMAD AHMAD ABDULLAH", branch: "AL QUASIS (STORE)", job: "Quality Controller" },
  "1024": { name: "MOHAMED KHALED ALAHMAD", branch: "AL QUASIS (PRODUCTION)", job: "Shawerma Maker" },
  "1160": { name: "EMMANUEL FOSU DANKWA", branch: "AL AIN BUTCHERY (POS 14)", job: "Helper" },
  "800": { name: "LIMUEL SINANGGOTE JEROSO", branch: "MOTOR CITY (POS 19)", job: "Butcher Assistant" },
  "1156": { name: "IMTIAZ AHMED MUGHAL SULTAN AKBAR", branch: "JEBEL ALI FEEDLOT (JAF)", job: "Driver-Heavy Vehicle" },
  "1157": { name: "SHABAN ABDELHAKIM ABOUBAKR ALI", branch: "ABU DHABI SAFEER MUSAFAH (POS 37)", job: "Branch Supervisor" },
  "764": { name: "ASGHAR HUSSAIN JANAN HUSSAIN", branch: "ABU DHABI SLAUGHTERHOUSE-FRESH (ASHF)", job: "Driver-Light Vehicle" },
  "1171": { name: "MOHAMAD YOSEF HADID", branch: "AL QUASIS (STORE)", job: "Driver-Light Vehicle" },
  "1167": { name: "MOHAMED NASR MOHAMED HASSAN", branch: "AL QUASIS (PRODUCTION)", job: "Labor" },
  "1168": { name: "SALAMAT ABBASI MUHAMMAD ISHRAQ", branch: "ABU DHABI - SAFEER KHALIFA A (POS 38)", job: "Grill Chef" },
  "746": { name: "AMR ANWAR MOHAMED KAMALELDIN", branch: "AL QUASIS (PRODUCTION)", job: "Butcher" },
  "374": { name: "SAID AHMED AMIN AHMED", branch: "SILICON OASIS COOP (POS24)", job: "Butcher Assistant" },
  "742": { name: "ARSHAD ALI FEROZ SHAH", branch: "ALBARSHA BUTCHERY (POS 15)", job: "Labor" },
  "1184": { name: "ALAA ADNAN ALFIL", branch: "FOOD TRUCK (AL MAMZAR) - FTR 2", job: "Branch Supervisor" },
  "738": { name: "AMIR NAZIR GHULAM MUHAMMAD", branch: "Al BARSHA SOUTH COOP (POS26)", job: "Cleaner" },
  "766": { name: "MUHAMMAD WISAL GUL AMAN", branch: "DUBAI SHEEP MARKET (DSM)", job: "Labor" },
  "494": { name: "MUHAMMAD AFAQ MUHAMMAD SALEEM", branch: "FOOD TRUCK (MUSHRIF PARK) - FTR 1", job: "waiter" },
  "769": { name: "UZAIR SHAH SAID USMAN SHAH", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Labor" },
  "1179": { name: "FARES MOHAMED SHEHATA ABDELHAFIZ", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Grill Chef" },
  "1169": { name: "JAYABHARATHI JEGANATHA PERUMAL JEGANATHA PERUMAL", branch: "AL QUASIS (STORE)", job: "Helper" },
  "1172": { name: "MOHAMED JAHUBAR NASEER AMEER ABBAS AMEER ABBAS", branch: "AL QUASIS (STORE)", job: "Helper" },
  "1174": { name: "KARTHIK ARUMUGAM ARUMUGAM", branch: "AL QUASIS (STORE)", job: "Helper" },
  "1177": { name: "MUNIYASAMY MURUGAN MURUGAN", branch: "Al BARSHA SOUTH COOP (POS26)", job: "Helper" },
  "811": { name: "MUHAMMAD TAHA MUHAMMAD ALI", branch: "ALBARSHA BUTCHERY (POS 15)", job: "Labor" },
  "779": { name: "DOMINGA SERAPION ANTONIO", branch: "MOTOR CITY (POS 19)", job: "Sales" },
  "399": { name: "MUHAMMAD ISMAIL ISSA", branch: "AL QUASIS (STORE)", job: "Driver-Light Vehicle" },
  "411": { name: "TAYOOR HUSAIN MIR HASSAN", branch: "ABU DHABI-STORE (POS 7)", job: "Driver-Light Vehicle" },
  "771": { name: "MUHAMMAD AYAZ AZAD KHAN", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Cleaner" },
  "772": { name: "SAJID ALI ABDUL KARIM", branch: "AL QUASIS (STORE)", job: "Helper" },
  "534": { name: "NUMAN KHAN TAJ WALI KHAN", branch: "ABU DHABI-STORE (POS 7)", job: "Labor/ vehicle" },
  "1170": { name: "BHUVANESHWARAN ELANGOVAN ELANGOVAN", branch: "AL QUASIS (STORE)", job: "Labor" },
  "1173": { name: "PURUSHOTHAMAN ELANGOVAN ELANGOVAN", branch: "AL QUASIS (STORE)", job: "Labor" },
  "934": { name: "REUBEN JAMES FERNANDEZ DELOS REYES", branch: "ALBARSHA BUTCHERY (POS 15)", job: "Butcher Assistant" },
  "790": { name: "FADE AKRAM AL HALAKE", branch: "MOTOR CITY (POS 19)", job: "Chef Mashawi" },
  "844": { name: "SAIF UR REHMAN ABBASI MUHAMMAD SALEEM KHAN", branch: "MOTOR CITY (POS 19)", job: "Labor" },
  "834": { name: "EHSAN ELAHI MUHAMMAD HUSSAIN", branch: "Al BARSHA SOUTH COOP (POS26)", job: "Labor" },
  "810": { name: "MUHAMMAD YAQOOB SHAKOOR ALI", branch: "MOTOR CITY (POS 19)", job: "Kitchen Helper" },
  "842": { name: "MOHSEN HASAN HAIDAR", branch: "AL QUASIS (PRODUCTION)", job: "Butcher Assistant" },
  "823": { name: "OMAR SAMI KATLEISH", branch: "Al BARSHA SOUTH COOP (POS26)", job: "Kitchen Helper" },
  "383": { name: "EL ARBI AZAR", branch: "AL QUASIS (PRODUCTION)", job: "Butcher" },
  "860": { name: "MUHAMMAD IQBAL SARDAR MUHAMMAD", branch: "AL AIN BUTCHERY (POS 14)", job: "Driver-Motorcycle" },
  "802": { name: "ABDELNASER AHMED ALI AHMED", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Butcher Assistant" },
  "781": { name: "CHARLES ATAMBIRE", branch: "ABU DHABI SLAUGHTERHOUSE-FRESH (ASHF)", job: "Labor" },
  "852": { name: "MAHMOUD ELSAID MAHMOUD MOHAMED", branch: "ABU DHABI SAFEER MUSAFAH (POS 37)", job: "Butcher Assistant" },
  "825": { name: "JANRAY SEPTUADO IGPUARA", branch: "MOTOR CITY (POS 19)", job: "Butcher" },
  "1186": { name: "MERCEDITA PAYPA YANOC", branch: "MOTOR CITY (POS 19)", job: "Accountant Assistant" },
  "768": { name: "ZAID AHMAD SALEH SALEH", branch: "AL QUASIS (STORE)", job: "Logistic Unit Head" },
  "513": { name: "WALIELDIN ISMAIL ELSIDDIG ELTAYEB", branch: "ABU DHABI SLAUGHTERHOUSE-FRESH (ASHF)", job: "Labor" },
  "888": { name: "ANALOU MACARAEG DANAO", branch: "ALBARSHA BUTCHERY (POS 15)", job: "Cashier" },
  "933": { name: "RAJKUMAR ANSANPALLY RAJENDHAR ANSANPALLY", branch: "ALBARSHA BUTCHERY (POS 15)", job: "Driver-Motorcycle" },
  "520": { name: "MOHAMMAD ABIDUL ISLAM MOHAMMAD ABDUR RAZZAK", branch: "ABU DHABI-MUSHRIF COOP (POS 17)", job: "Butcher Assistant" },
  "595": { name: "ELSAYED ABDELRAHMAN MOHAMED ABDELRAHMAN HASSANIN", branch: "ABU DHABI SLAUGHTERHOUSE-FRESH (ASHF)", job: "Sales" },
  "396": { name: "SUHAIR THEKKUM KATTIL MOHAMMED THEKKUM KATTIL", branch: "ABU DHABI-STORE (POS 7)", job: "Junior Accountant" },
  "351": { name: "SAID EL BACHA", branch: "AL QUASIS (PRODUCTION)", job: "Production Officer" },
  "610": { name: "ROHAIL RAHMAN NOOR UR RAHMAN", branch: "FOOD TRUCK (MUSHRIF PARK) - FTR 1", job: "Helper" },
  "502": { name: "SUZAN HASSAN KHASHAN", branch: "AL AIN BUTCHERY (POS 14)", job: "Retail Supervisor" },
  "335": { name: "ATTA UR REHMAN MUHAMMAD REHAN", branch: "JEBEL ALI FEEDLOT (JAF)", job: "Labor" },
  "613": { name: "MUHAMMAD IMRAN MUHAMMAD YAR", branch: "AL QUASIS (STORE)", job: "Driver-Heavy Vehicle" },
  "605": { name: "TAREK HESHAM ALAM HASHEM SAID", branch: "FOOD TRUCK (MUSHRIF PARK) - FTR 1", job: "Branch Officer" },
  "614": { name: "MUHAMMAD SAQIB MUHAMMAD ASIF KHAN", branch: "AL QUASIS (PRODUCTION)", job: "Production Operator" },
  "648": { name: "AHMAD HASAN HENNAWI", branch: "AL AIN BUTCHERY (POS 14)", job: "Butcher Assistant" },
  "542": { name: "AIMEN GHARIB", branch: "AL QUASIS (PRODUCTION)", job: "Butcher" },
  "607": { name: "MUHAMMAD IMRAN RASHEED MUHAMMAD RASHEED", branch: "ALBARSHA BUTCHERY (POS 15)", job: "" },
  "341": { name: "ABID KHAN MUHAMMAD ZAMAN", branch: "AL QUASIS (STORE)", job: "Order Dispatcher" },
  "657": { name: "ZAKARIA ELMEKNASI", branch: "SHARJAH BUTCHERY (POS 6)", job: "Butcher" },
  "659": { name: "MAHMOUD SAAD ABDELHAMID RADWAN", branch: "ABU DHABI - FAZAA SHAMKHA (POS 43)", job: "Butcher" },
  "366": { name: "MANIRAM B K", branch: "AL QUASIS (STORE)", job: "Driver-Light Vehicle" },
  "827": { name: "IMTIAZ ALI MUHAMMAD ISHAQ", branch: "AL QUASIS (STORE)", job: "Driver-Light Vehicle" },
  "609": { name: "MUHAMMAD KAMRAN RUSTAM SHAH", branch: "AL QUASIS (STORE)", job: "Helper" },
  "584": { name: "HOSSAM AHMED TAIEB SEDDIK", branch: "MOTOR CITY (POS 19)", job: "Butcher" },
  "342": { name: "WAQAS MUNIR MUNIR AHMED", branch: "JEBEL ALI FEEDLOT (JAF)", job: "Driver-Heavy Vehicle" },
  "361": { name: "MOHAMMAD MOHAMMAD SHAREEF SIDDIQUE NAFEESH", branch: "AL AIN SLAUGHTERHOUSE-LIVE SHEEP YARD", job: "Labor" },
  "603": { name: "RAWAIZ GUL NIHAD GUL", branch: "AL QUASIS (STORE)", job: "Driver-Light Vehicle" },
  "432": { name: "MAZEN T F DAHER", branch: "ABU DHABI-STORE (POS 7)", job: "Branch Manager - Abu Dhabi" },
  "499": { name: "SHABBIR AHMAD MUHAMMAD SHARIF", branch: "ABU DHABI BUTCHERY (POS 10)", job: "Driver-Motorcycle" },
  "701": { name: "AHSAN ALI TARIQ AZIZ", branch: "SHARJAH BUTCHERY (POS 6)", job: "Driver-Motorcycle" },
  "536": { name: "MOHAMAD IBRAHIM YOUNES", branch: "ALBARSHA BUTCHERY (POS 15)", job: "Retail Officer" },
  "339": { name: "MUHAMMAD AFZAL HASSAN", branch: "MOTOR CITY (POS 19)", job: "Butcher" },
  "369": { name: "FAISEL BENOUARAB", branch: "ABU DHABI BUTCHERY (POS 10)", job: "Butcher" },
  "516": { name: "SAID DOUGNA", branch: "AL AIN BUTCHERY (POS 14)", job: "Butcher" },
  "521": { name: "ALY SAYED ALY IBRAHIM MOHAMED", branch: "ABU DHABI BUTCHERY (POS 10)", job: "Butcher Assistant" },
  "723": { name: "KAMAL MAHMOUD KAMAL NAHLA", branch: "ABU DHABI BUTCHERY (POS 10)", job: "Butcher" },
  "565": { name: "ADEL SAMIR TAHA ELGEYOUSHY", branch: "MOTOR CITY (POS 19)", job: "Butcher Assistant" },
  "662": { name: "FAHMI AWAD AL AWAD", branch: "SILICON OASIS COOP (POS24)", job: "Butchery Supervisor" },
  "615": { name: "MOHAMED AHMED MOHAMED RASHED ABDALLA", branch: "JEBEL ALI FEEDLOT (JAF)", job: "Feedlot Supervisor Assistant" },
  "783": { name: "RAGAB FOUAD RAGAB HASSNEIN", branch: "ABU DHABI-MUSHRIF COOP (POS 17)", job: "Butcher Assistant" },
  "397": { name: "AMMAR ABDULHADI HANNAWI", branch: "DUBAI-MEET MARKET (POS 2)", job: "Sales Officer" },
  "665": { name: "ABDULAZIZ MOHI EDDIN HAFIAN", branch: "AL QUASIS (STORE)", job: "Maintenance Supervisor Assistant" },
  "580": { name: "HAMZA GAFR AYOUB IBRAHIM", branch: "ABU DHABI - FAZAA SHAMKHA (POS 43)", job: "Butcher" },
  "583": { name: "ALKHATEB GAAFAR AYOUB IBRAHIM", branch: "ABU DHABI SAFEER MUSAFAH (POS 37)", job: "Butcher" },
  "592": { name: "ARIF ABDUL ABDUL RASHEED", branch: "ABU DHABI-STORE (POS 7)", job: "Driver-Light Vehicle" },
  "70": { name: "AZIZ MAHJOOB BAKRY", branch: "AL QUASIS (STORE)", job: "Feedlot Operation Officer" },
  "932": { name: "AHMED SABRY REYAD ABDELSAMAD", branch: "MOTOR CITY (POS 19)", job: "Grill Chef" },
  "938": { name: "YAZAN RAMADAN ABDULHAMID", branch: "INDUSTRY EMIRATES (POS 21)", job: "Butcher" },
  "1105": { name: "HOZAIFA ABDUL HAI ALNAJEM", branch: "MOTOR CITY (POS 19)", job: "Driver-Light Vehicle" },
  "925": { name: "MOHAMMAD ADNAN ABO HSENE", branch: "MOTOR CITY (POS 19)", job: "Chef Shawerma" },
  "1138": { name: "PEDDI RAJU MALLULA VENKATA SATYANARAYANA MALLULA", branch: "AL QUASIS (STORE)", job: "Store Keeper" },
  "1181": { name: "MOHAMMED MARIE SOSO", branch: "SHARJAH BUTCHERY (POS 6)", job: "Butcher Assistant" },
  "1065": { name: "HAISAM MOHAMAD WAHOUD", branch: "Al BARSHA SOUTH COOP (POS26)", job: "Butchery Supervisor" },
  "1017": { name: "TAMER SALEH MOHAMED ELIWA", branch: "MOTOR CITY (POS 19)", job: "Butcher" },
  "1092": { name: "AMIR IQBAL KALA KHAN.", branch: "ABU DHABI-STORE (POS 7)", job: "Labor/ vehicle" },
  "1047": { name: "ALAA EDDIN MHD ALI ALMAAD", branch: "AL QUASIS (PRODUCTION)", job: "Shawerma Maker" },
  "390": { name: "MAISAM E TAMAR NOOR HUSSAIN", branch: "ABU DHABI SLAUGHTERHOUSE-FRESH (ASHF)", job: "Driver-Light Vehicle" },
  "1134": { name: "OSAMA MUSTAFA BESHBESH", branch: "Al BARSHA SOUTH COOP (POS26)", job: "Butcher" },
  "1106": { name: "MAHMOD SALAHELDIN SAYED AHMED ABDELAAL", branch: "MOTOR CITY (POS 19)", job: "Shawerma chef" },
  "1135": { name: "GHAZI MUSTAFA BESHBESH", branch: "SILICON OASIS COOP (POS24)", job: "Butcher" },
  "233": { name: "JAOUAD MAHJOUB BAKRI", branch: "ABU DHABI SLAUGHTERHOUSE-FRESH (ASHF)", job: "Operations Coordinator" },
  "1190": { name: "MARY CHRISTINE ACLAN SO", branch: "AL AIN BUTCHERY (POS 14)", job: "Cashier & Sales" },
  "1104": { name: "BELAL SEDDIK BASHOURI", branch: "MOTOR CITY (POS 19)", job: "Driver-Light Vehicle" },
  "897": { name: "ARSLAN AHMAD ADIL SAEED", branch: "AL QUASIS (STORE)", job: "Inventory Controller" },
  "866": { name: "AMINA ABD ALFATAH ALKURDI", branch: "SILICON OASIS COOP (POS24)", job: "Sales" },
  "906": { name: "SYED USAMA GILLANI AMJID GILLANI", branch: "AL QUASIS (STORE)", job: "Driver-Light Vehicle" },
  "525": { name: "HUSAM SAID HASAN GHNEIM", branch: "AL AIN BUTCHERY (POS 14)", job: "Unit Head-ALAin" },
  "861": { name: "TANVEER SADIQ MUHAMMAD SADIQ KHAN", branch: "AL QUASIS (STORE)", job: "Driver-Light Vehicle" },
  "851": { name: "ABDUL REHMAN GULZAR AHMED KHAN", branch: "AL QUASIS (STORE)", job: "Helper" },
  "983": { name: "QOSAI HASIB HLAL", branch: "Al BARSHA SOUTH COOP (POS26)", job: "Chef" },
  "1155": { name: "AHMAD MOHAMAD KATTAN", branch: "AL QUASIS (STORE)", job: "Inventory Officer" },
  "855": { name: "AHMED ALI MOHAMED ALI ABOUSHEISHA", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Chef Mashawi" },
  "1163": { name: "MOHAB ABDELRAOUF ALI IBRAHIM ELKILANY", branch: "ALBARSHA BUTCHERY (POS 15)", job: "Merchandiser: Cheese & Deli" },
  "171": { name: "SYED REHMAN BAKHT ZAMAN KHAN", branch: "JEBEL ALI FEEDLOT (JAF)", job: "Labor Supervisor-Feedlot" },
  "796": { name: "MAMDOUH SALAH ALI REZK", branch: "AL QUASIS (PRODUCTION)", job: "Butcher" },
  "172": { name: "AQAL ZADA GUL ZADA", branch: "AL QUASIS (STORE)", job: "Driver-Light Vehicle" },
  "761": { name: "RAJA REHAN AFZAL AFZAL HUSAIN", branch: "AL QUASIS (STORE)", job: "Helper" },
  "784": { name: "HASSAN TAOUABI", branch: "AL AIN BUTCHERY (POS 14)", job: "Butcher" },
  "816": { name: "MOAAZ ABDULRAHMAN HEIS", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Chef" },
  "832": { name: "TANVEER MALIK MALIK ALLAH RAKHA", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Driver-Motorcycle" },
  "847": { name: "IMTIAZ ALI MUHAMMAD ISHAQ", branch: "AL AIN-MARKET (POS 11)", job: "Labor" },
  "1166": { name: "MOHAMMED THAMBI MOHAMMED GOWDHU MOHAMMED GOWDHU", branch: "ABU DHABI - SAFEER KHALIFA A (POS 38)", job: "Driver-Motorcycle" },
  "997": { name: "HASAN KHALED ALBSO", branch: "ABU DHABI - FAZAA SHAMKHA (POS 43)", job: "Butcher" },
  "955": { name: "OSAMA MOHAMAD AL KALTI", branch: "AL QUASIS (STORE)", job: "Store Supervisor" },
  "1098": { name: "SURESH SEKAR SEKAR.", branch: "AL QUASIS (STORE)", job: "Quality Controller Assistant" },
  "935": { name: "OBAIDA RAMEZ ZAKYE", branch: "SILICON OASIS COOP (POS24)", job: "Butcher" },
  "901": { name: "MAHMOUD AHMED FAWZY MOUSTAFA OKASHA", branch: "AFCOP-MAQTA MALL (POS 16)", job: "Driver-Motorcycle" },
  "1125": { name: "GRACE SA ONOY SIMBAJON", branch: "FOOD TRUCK (AL MAMZAR) - FTR 2", job: "Waitress" },
  "1099": { name: "WILSON FERNANDES JACOB FERNANDES.", branch: "AL QUASIS (STORE)", job: "Store Keeper" },
  "954": { name: "MAHASEN AHMAD ALTAL", branch: "MOTOR CITY (POS 19)", job: "Sales" },
  "1023": { name: "MOHAMED SAEID KOTB SOLIMAN ARKOUB", branch: "ABU DHABI FAZAA BANIYAS (POS 41)", job: "Butcher" },
  "1040": { name: "CHARLES LESTHERWIN PAGADUAN NICOLAS", branch: "FOOD TRUCK (MUSHRIF PARK) - FTR 1", job: "Cashier" },
  "1012": { name: "JASEEM PUKKUNNUMMAL MOHAMMEDALI", branch: "MOTOR CITY (POS 19)", job: "QUALITY Health Safety & Environment" },
  "611": { name: "ABDUL REHMAN MANZOOR HUSSAIN", branch: "ABU DHABI SLAUGHTERHOUSE-FRESH (ASHF)", job: "Labor" },
};

/* ====== Course types + مدد الشهادة ====== */
const COURSE_TYPES = [
  { value: "", label: "-- Select Course Type --" },
  { value: "BFS", label: "Basic Food Safety (BFS)" },
  { value: "PIC", label: "Person In Charge (PIC)" },
  { value: "EFST", label: "EFST" },
  { value: "HACCP", label: "HACCP" },
  { value: "OTHER", label: "Other / Custom (manual)" },
];

const COURSE_DURATION_YEARS = {
  BFS: 2, // مدة شهادة ال BFS 2 سنة
  PIC: 5, // مدة شهادة ال PIC 5 سنوات
  EFST: 5, // مدة شهادة ال EFST 5 سنوات
  // HACCP: لا يوجد انتهاء
};

function computeExpiry(courseType, issueDateStr) {
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
function makeEmptyCert() {
  return {
    courseType: "",
    customCourseName: "",
    issueDate: "",
    expiryDate: "",
    imageData: "",
    imageMeta: { name: "", type: "" },
  };
}

/* ========= Component ========= */
export default function TrainingCertificatesBFS() {
  const navigate = useNavigate();

  // بيانات الموظف (مشتركة لكل الشهادات في الصفحة)
  const [employee, setEmployee] = useState({
    employeeNo: "",
    name: "",
    nationality: "",
    job: "",
    branch: "",
  });

  // لستة الشهادات لهذا الموظف (أكثر من شهادة في نفس الشاشة)
  const [certs, setCerts] = useState([makeEmptyCert()]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const setEmpField = (k, v) => {
    setEmployee((p) => ({ ...p, [k]: v }));
    setMsg({ type: "", text: "" });
  };

  // تعبئة بيانات الموظف من جدول EMPLOYEES
  const handleEmployeeNumberChange = (v) => {
    setMsg({ type: "", text: "" });
    const id = String(v || "").trim();
    const emp = EMPLOYEES[id];
    setEmployee((prev) => ({
      ...prev,
      employeeNo: v,
      name: emp ? emp.name : "",
      branch: emp ? emp.branch : "",
      job: emp ? emp.job : "",
    }));
  };

  // تحديث حقل في شهادة معيّنة
  const updateCertField = (index, key, value) => {
    setCerts((prev) => {
      const next = [...prev];
      const current = { ...next[index] };

      if (key === "courseType") {
        current.courseType = value;
        if (COURSE_DURATION_YEARS[value] && current.issueDate) {
          current.expiryDate = computeExpiry(value, current.issueDate);
        } else if (value === "HACCP" || value === "OTHER" || value === "") {
          // HACCP / OTHER: لا حساب تلقائي (يدوي)
        }
      } else if (key === "issueDate") {
        current.issueDate = value;
        if (COURSE_DURATION_YEARS[current.courseType]) {
          current.expiryDate = computeExpiry(current.courseType, value);
        }
      } else {
        current[key] = value;
      }

      next[index] = current;
      return next;
    });
    setMsg({ type: "", text: "" });
  };

  // إضافة شهادة جديدة
  const addCertificateRow = () => {
    setCerts((prev) => [...prev, makeEmptyCert()]);
  };

  // حذف شهادة
  const removeCertificateRow = (index) => {
    setCerts((prev) => {
      if (prev.length === 1) {
        return [makeEmptyCert()];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const requiredEmpKeys = ["employeeNo", "name", "branch"];

  async function handleSave() {
    for (const k of requiredEmpKeys) {
      if (!String(employee[k] || "").trim()) {
        setMsg({
          type: "error",
          text: "Please complete employee details before saving.",
        });
        return;
      }
    }

    const activeCerts = certs.filter(
      (c) =>
        String(c.courseType || "").trim() &&
        String(c.issueDate || "").trim()
    );

    if (activeCerts.length === 0) {
      setMsg({
        type: "error",
        text:
          "Please add at least one certificate with course type and issue date.",
      });
      return;
    }

    setBusy(true);
    setMsg({ type: "", text: "" });

    try {
      const results = [];

      for (const cert of activeCerts) {
        const courseTypeToSave =
          cert.courseType === "OTHER"
            ? cert.customCourseName || "OTHER"
            : cert.courseType;

        const payload = {
          ...employee,
          courseType: courseTypeToSave,
          issueDate: cert.issueDate,
          expiryDate: cert.expiryDate || undefined,
          imageData: cert.imageData || undefined,
          imageName: cert.imageData ? cert.imageMeta.name : undefined,
          imageType: cert.imageData ? cert.imageMeta.type : undefined,
          savedAt: new Date().toISOString(),
        };

        const body = JSON.stringify({
          reporter: "MOHAMAD ABDULLAH",
          type: TYPE,
          payload,
        });

        const { ok, status, data } = await jsonFetch(
          `${API_BASE}/api/reports`,
          {
            method: "POST",
            body,
          }
        );

        results.push({ ok, status, data });
      }

      setBusy(false);

      const failed = results.find((r) => !r.ok);
      if (failed) {
        const serverMsg =
          failed.data?.message ||
          (failed.status >= 500
            ? "Server error. Please try again later."
            : "Failed to save some certificates. Please check and try again.");

        setMsg({
          type: "error",
          text: `Some certificates failed to save (HTTP ${failed.status}). ${serverMsg}`,
        });
        return;
      }

      setMsg({
        type: "ok",
        text: `✅ Saved ${results.length} certificate(s) successfully.`,
      });

      setEmployee({
        employeeNo: "",
        name: "",
        nationality: "",
        job: "",
        branch: "",
      });
      setCerts([makeEmptyCert()]);
    } catch (err) {
      console.error("Training save error:", err);
      setBusy(false);
      setMsg({
        type: "error",
        text:
          "Network error while contacting the server. Please check your connection and try again.",
      });
    }
  }

  async function handleCertImageSelect(index, e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/^image\//.test(file.type)) {
      setMsg({ type: "error", text: "Please select an image file." });
      e.target.value = "";
      return;
    }

    try {
      const compressed = await compressImage(file);
      setCerts((prev) => {
        const next = [...prev];
        const current = { ...next[index] };
        current.imageData = compressed;
        current.imageMeta = { name: file.name, type: "image/jpeg" };
        next[index] = current;
        return next;
      });
      setMsg({ type: "", text: "" });
    } catch {
      setMsg({
        type: "error",
        text: "Image processing failed. Try another image.",
      });
    } finally {
      e.target.value = "";
    }
  }

  function removeCertImage(index) {
    setCerts((prev) => {
      const next = [...prev];
      const current = { ...next[index] };
      current.imageData = "";
      current.imageMeta = { name: "", type: "" };
      next[index] = current;
      return next;
    });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2.5rem 1.5rem",
        background:
          "radial-gradient(circle at top left, #0f766e 0%, #0f172a 40%, #020617 80%)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        direction: "ltr",
        boxSizing: "border-box",
        fontFamily: "Inter, Tahoma, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 980,
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.94))",
          borderRadius: 24,
          padding: 2,
          boxShadow: "0 24px 60px rgba(15,23,42,0.75)",
          border: "1px solid rgba(148,163,184,0.5)",
        }}
      >
        <div
          style={{
            background:
              "radial-gradient(circle at top right, #ecfeff 0%, #f9fafb 40%, #e5e7eb 100%)",
            borderRadius: 22,
            padding: "1.75rem 1.75rem 1.5rem",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "flex-start",
              marginBottom: 18,
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "2px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  background:
                    "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(8,47,73,0.08))",
                  color: "#15803d",
                  border: "1px solid rgba(74,222,128,0.6)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "999px",
                    background:
                      "radial-gradient(circle, #22c55e 0%, #166534 60%, #052e16 100%)",
                  }}
                />
                Training Certificates
              </div>
              <h2
                style={{
                  margin: "8px 0 4px",
                  color: "#0f172a",
                  fontWeight: 800,
                  fontSize: 22,
                  letterSpacing: 0.2,
                }}
              >
                🎓 BFS / PIC / EFST / HACCP Certificates
              </h2>
              <div style={{ fontSize: 13, color: "#4b5563" }}>
                Multiple training certificates per employee, with auto expiry
                calculation for BFS / PIC / EFST, and manual options for HACCP /
                custom.
              </div>
            </div>
            <div
              style={{
                textAlign: "right",
                fontSize: 11,
                color: "#6b7280",
              }}
            >
              <div style={{ fontWeight: 600, color: "#111827" }}>
                Mode:{" "}
                <span style={{ color: "#15803d" }}>
                  Server Save Only (Multi-certificate per employee)
                </span>
              </div>
            </div>
          </div>

          {msg.text && (
            <div
              style={{
                margin: "10px 0 14px",
                padding: "10px 12px",
                borderRadius: 12,
                background:
                  msg.type === "ok"
                    ? "linear-gradient(135deg,#ecfdf5,#dcfce7)"
                    : "linear-gradient(135deg,#fef2f2,#fee2e2)",
                color: msg.type === "ok" ? "#065f46" : "#991b1b",
                border: `1px solid ${
                  msg.type === "ok" ? "#22c55e" : "#fca5a5"
                }`,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background:
                    msg.type === "ok"
                      ? "#16a34a"
                      : "rgba(220,38,38,0.9)",
                  boxShadow:
                    msg.type === "ok"
                      ? "0 0 0 4px rgba(34,197,94,0.18)"
                      : "0 0 0 4px rgba(248,113,113,0.2)",
                }}
              />
              <span>{msg.text}</span>
            </div>
          )}

          {/* Employee Section label */}
          <div
            style={{
              marginBottom: 10,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            <span
              style={{
                padding: "3px 9px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.04)",
                color: "#0f172a",
                fontWeight: 600,
              }}
            >
              Employee Details
            </span>
          </div>

          {/* Employee Form */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: 14,
              marginBottom: 18,
            }}
          >
            <Field
              label="Employee Number"
              value={employee.employeeNo}
              onChange={handleEmployeeNumberChange}
            />
            <Field
              label="Name"
              value={employee.name}
              onChange={(v) => setEmpField("name", v)}
            />
            <Field
              label="Branch"
              value={employee.branch}
              onChange={(v) => setEmpField("branch", v)}
            />
            <Field
              label="Job Title"
              value={employee.job}
              onChange={(v) => setEmpField("job", v)}
            />
            <Select
              label="Nationality"
              value={employee.nationality}
              onChange={(v) => setEmpField("nationality", v)}
              options={[
                { value: "", label: "-- Select Nationality --" },
                ...NATIONALITIES.map((n) => ({ value: n, label: n })),
              ]}
            />
          </div>

          {/* Certificates Section */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                padding: "3px 9px",
                borderRadius: 999,
                background: "rgba(8,47,73,0.04)",
                color: "#0f172a",
                fontWeight: 600,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              Training Certificates (BFS / PIC / EFST / HACCP / Custom)
            </span>
            <button
              type="button"
              onClick={addCertificateRow}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(135deg,#22c55e,#16a34a,#15803d)",
                color: "#f9fafb",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 8px 18px rgba(22,163,74,0.4)",
              }}
            >
              ➕ Add Certificate
            </button>
          </div>

          {/* Certificates List */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {certs.map((cert, index) => (
              <div
                key={index}
                style={{
                  padding: "12px 12px 14px",
                  borderRadius: 16,
                  border: "1px solid rgba(148,163,184,0.6)",
                  background:
                    "linear-gradient(135deg,rgba(249,250,251,0.96),rgba(241,245,249,0.95))",
                  boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    Certificate #{index + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCertificateRow(index)}
                    style={{
                      border: "none",
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      background:
                        certs.length === 1
                          ? "linear-gradient(135deg,#e5e7eb,#e5e7eb)"
                          : "linear-gradient(135deg,#f97373,#ef4444)",
                      color:
                        certs.length === 1 ? "#4b5563" : "#f9fafb",
                      cursor: certs.length === 1 ? "default" : "pointer",
                    }}
                    disabled={certs.length === 1}
                  >
                    {certs.length === 1
                      ? "Cannot remove last"
                      : "Remove"}
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2,minmax(0,1fr))",
                    gap: 12,
                  }}
                >
                  <Select
                    label="Course Type"
                    value={cert.courseType}
                    onChange={(v) =>
                      updateCertField(index, "courseType", v)
                    }
                    options={COURSE_TYPES}
                  />

                  {cert.courseType === "OTHER" ? (
                    <Field
                      label="Custom Course Name"
                      value={cert.customCourseName}
                      onChange={(v) =>
                        updateCertField(index, "customCourseName", v)
                      }
                    />
                  ) : (
                    <DateField
                      label="Issue Date"
                      value={cert.issueDate}
                      onChange={(v) =>
                        updateCertField(index, "issueDate", v)
                      }
                    />
                  )}

                  {COURSE_DURATION_YEARS[cert.courseType] ? (
                    <ReadOnlyField
                      label="Expiry Date (auto)"
                      value={cert.expiryDate || ""}
                    />
                  ) : (
                    <DateField
                      label={
                        cert.courseType === "HACCP"
                          ? "Expiry Date (optional / HACCP usually no expiry)"
                          : "Expiry Date (manual)"
                      }
                      value={cert.expiryDate}
                      onChange={(v) =>
                        updateCertField(index, "expiryDate", v)
                      }
                    />
                  )}

                  {cert.courseType === "OTHER" && (
                    <DateField
                      label="Issue Date"
                      value={cert.issueDate}
                      onChange={(v) =>
                        updateCertField(index, "issueDate", v)
                      }
                    />
                  )}
                </div>

                {/* Image per certificate */}
                <div style={{ marginTop: 10 }}>
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      fontWeight: 600,
                      color: "#0f172a",
                      fontSize: 13,
                    }}
                  >
                    Certificate Image (Optional)
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleCertImageSelect(index, e)
                        }
                        style={{
                          flex: 1,
                          padding: 8,
                          border:
                            "1px dashed rgba(148,163,184,0.9)",
                          borderRadius: 10,
                          background:
                            "linear-gradient(135deg,#f9fafb,#f1f5f9,#e5e7eb)",
                          fontSize: 12,
                        }}
                      />
                    </div>
                  </label>

                  {cert.imageData && (
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: 8,
                        borderRadius: 12,
                        background:
                          "linear-gradient(135deg,rgba(15,23,42,0.03),rgba(8,47,73,0.03))",
                        border:
                          "1px solid rgba(148,163,184,0.4)",
                      }}
                    >
                      <img
                        src={cert.imageData}
                        alt={`Certificate ${index + 1}`}
                        style={{
                          height: 90,
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          objectFit: "cover",
                          boxShadow:
                            "0 8px 20px rgba(15,23,42,0.28)",
                        }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => removeCertImage(index)}
                          style={{
                            padding: "8px 14px",
                            background:
                              "linear-gradient(135deg,#ef4444,#b91c1c)",
                            color: "#fff",
                            border: 0,
                            borderRadius: 999,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          Remove Image
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            {/* زر عرض الشهادات */}
            <button
              type="button"
              onClick={() => navigate("/training-certificates/view")}
              style={{
                padding: "10px 18px",
                background:
                  "linear-gradient(135deg,#0f172a,#1e293b,#020617)",
                color: "#f9fafb",
                border: 0,
                borderRadius: 999,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
                boxShadow:
                  "0 10px 24px rgba(15,23,42,0.65)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              📋 View Certificates
            </button>

            <button
              onClick={handleSave}
              disabled={busy}
              style={{
                padding: "10px 18px",
                background: busy
                  ? "linear-gradient(135deg,#22c55e,#16a34a)"
                  : "linear-gradient(135deg,#22c55e,#16a34a,#15803d)",
                color: "#f9fafb",
                border: 0,
                borderRadius: 999,
                fontWeight: 800,
                cursor: busy ? "default" : "pointer",
                fontSize: 13,
                letterSpacing: 0.4,
                boxShadow:
                  "0 14px 30px rgba(22,163,74,0.55)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: busy ? 0.9 : 1,
              }}
            >
              {busy ? "Saving..." : "💾 Save Certificates"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========= Tiny UI helpers ========= */
function Field({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        fontWeight: 600,
        color: "#0f172a",
        fontSize: 13,
      }}
    >
      <span>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid rgba(148,163,184,0.9)",
          background:
            "linear-gradient(135deg,#f9fafb,#f1f5f9,#e5e7eb)",
          fontSize: 13,
          outline: "none",
        }}
      />
    </label>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        fontWeight: 600,
        color: "#0f172a",
        fontSize: 13,
      }}
    >
      <span>{label}</span>
      <input
        type="text"
        value={value}
        readOnly
        placeholder="Auto-calculated / N/A"
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid rgba(148,163,184,0.9)",
          background:
            "linear-gradient(135deg,#e5e7eb,#e5e7eb,#e5e7eb)",
          fontSize: 13,
          outline: "none",
          color: "#374151",
        }}
      />
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        fontWeight: 600,
        color: "#0f172a",
        fontSize: 13,
      }}
    >
      <span>{label}</span>
      <input
        type="date"
        value={value}
        max="2099-12-31"
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid rgba(148,163,184,0.9)",
          background:
            "linear-gradient(135deg,#f9fafb,#f1f5f9,#e5e7eb)",
          fontSize: 13,
          outline: "none",
        }}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        fontWeight: 600,
        color: "#0f172a",
        fontSize: 13,
      }}
    >
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid rgba(148,163,184,0.9)",
          background:
            "linear-gradient(135deg,#f9fafb,#f1f5f9,#e5e7eb)",
          fontSize: 13,
          outline: "none",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
