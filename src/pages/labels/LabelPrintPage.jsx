// src/pages/labels/LabelPrintPage.jsx
//
// 🏷️ طباعة الملصقات — ملصق منتج فيه تاريخ الإنتاج والانتهاء (محسوب من مدة
// الصلاحية)، رقم الدفعة، الوزن، شروط التخزين، مسبّبات الحساسية، وباركود GS1.
// Product label printing: pick (or scan) a catalog product, the expiry follows
// the shelf-life rules, and a GS1 QR / GS1-128 code carries the dates, the lot
// and our item code — the cooler goods scanner reads it back in one scan.
//
// Route /inventory/labels, section "labels" (own permission). The label is
// drawn by labelsApi.labelHtml into an iframe, both for the preview and for
// the printer, so the app's forced font sizes never reach it.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { useProductCatalog } from "../monitor/branches/_shared/ProductPicker";
import { useShelfLife } from "../monitor/branches/_shared/shelfLife";
import { fetchProductMedia, cachedProductMedia, storageOf, allergensOf, allergenOf, STORAGE } from "../../utils/productMedia";
import { fetchBarcodeMap, findBarcode } from "../../utils/barcodeMap";
import { parseBarcode } from "../../utils/gs1Barcode";
import { getCurrentUser } from "../../utils/perms";
import { getActiveCompanyName } from "../../utils/companyContext";
import BarcodeScanner from "../../components/BarcodeScanner";
import useWedgeScanner from "../../utils/useWedgeScanner";
import { OUR_BRANCHES } from "../traceability/productTraceApi";
import {
  SIZES, sizeOf, MIN_MODULE_MM, todayISO, isISO, dmy, addDays, defaultLot, cleanLot,
  gs1Text, code128ModuleMm, labelHtml, LABEL_CSS, printDocument, printHtml,
  fetchPrintJobs, logPrintJob,
} from "./labelsApi";

const PREFS_KEY = "label_print_prefs_v1"; // per-viewer: size, symbol, toggles, site
const readPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || "null") || {}; } catch { return {}; } };
const writePrefs = (p) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* convenience only */ } };

const userName = () => {
  const u = getCurrentUser() || {};
  return String(u.displayName || u.name || u.username || "").trim();
};

const SITES = ["QCS", ...OUR_BRANCHES.map((b) => b.id)];
const SHOW_KEYS = ["company", "weight", "branch", "storage", "allergens", "packer"];

function storageText(st) {
  if (!st) return "";
  const word = { chilled: "chilled", frozen: "frozen", ambient: "at room temp." }[st.mode] || STORAGE[st.mode]?.label || "";
  const range = Number.isFinite(Number(st.min)) && Number.isFinite(Number(st.max)) ? ` ${st.min} to ${st.max} °C` : "";
  return `Keep ${word}${range}`;
}

const CSS = `
#root .lbp, #root .lbp * { font-size: 15px !important; }
#root .lbp .lbp-title { font-size: 26px !important; }
#root .lbp .lbp-h { font-size: 17px !important; }
#root .lbp .lbp-small, #root .lbp .lbp-small * { font-size: 13px !important; }
#root .lbp input, #root .lbp select { font-family: inherit; }
#root .lbp .lbp-pick:hover { background: #eef6ff; }
@media (max-width: 860px) {
  #root .lbp .lbp-grid { grid-template-columns: 1fr !important; }
  #root .lbp .lbp-title { font-size: 21px !important; }
}
`;

export default function LabelPrintPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t, dir, lang, toggle, isAr } = useSettingsLang();
  const { pickItems, allItems, loading: catLoading } = useProductCatalog();
  const { resolve: resolveShelf } = useShelfLife();

  const prefs0 = useMemo(readPrefs, []);
  const [product, setProduct] = useState(null); // { code, name, uom }
  const [q, setQ] = useState("");
  const [prodDate, setProdDate] = useState(todayISO());
  const [expDate, setExpDate] = useState("");
  const [expManual, setExpManual] = useState(false);
  const [lot, setLot] = useState(defaultLot(todayISO()));
  const [lotManual, setLotManual] = useState(false);
  const [weight, setWeight] = useState("");
  const [site, setSite] = useState(prefs0.site || "");
  const [packedBy, setPackedBy] = useState(userName());
  const [sizeId, setSizeId] = useState(prefs0.sizeId || "60x40");
  const [symbol, setSymbol] = useState(prefs0.symbol || "qr");
  const [copies, setCopies] = useState("1");
  const [show, setShow] = useState(() => ({ company: true, weight: true, branch: true, storage: true, allergens: true, packer: false, ...(prefs0.show || {}) }));
  const [media, setMedia] = useState(cachedProductMedia);
  const [scanOpen, setScanOpen] = useState(false);
  const [msg, setMsg] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [jobsErr, setJobsErr] = useState("");
  const [printing, setPrinting] = useState(false);
  const codeMapRef = useRef(null);
  const linkRef = useRef(true); // the ?code=… link is applied once

  const size = sizeOf(sizeId);
  const company = getActiveCompanyName();

  useEffect(() => { fetchProductMedia().then(setMedia); }, []);
  useEffect(() => { writePrefs({ sizeId, symbol, show, site }); }, [sizeId, symbol, show, site]);

  const loadJobs = () => {
    fetchPrintJobs().then((j) => { setJobs(j); setJobsErr(""); }).catch((e) => setJobsErr(String(e?.message || e)));
  };
  useEffect(loadJobs, []);

  /* shelf life → expiry (until the expiry is typed by hand) */
  const shelf = product ? resolveShelf({ code: product.code, name: product.name }) : null;
  useEffect(() => {
    if (expManual) return;
    setExpDate(shelf && shelf.days > 0 && isISO(prodDate) ? addDays(prodDate, shelf.days) : "");
  }, [prodDate, shelf?.days, expManual]); // eslint-disable-line react-hooks/exhaustive-deps

  /* production day → lot (until the lot is typed by hand) */
  useEffect(() => { if (!lotManual) setLot(defaultLot(prodDate)); }, [prodDate, lotManual]);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return pickItems
      .filter((it) => String(it.item_code || "").toLowerCase().includes(s) || String(it.description || "").toLowerCase().includes(s))
      .slice(0, 40);
  }, [q, pickItems]);

  const choose = (it) => {
    setProduct({ code: String(it.item_code || "").trim(), name: it.description, uom: it.uom || "" });
    setQ("");
    setExpManual(false);
    setMsg(null);
  };

  /* opened from another screen (labelLink): product, dates, lot, weight and site come filled */
  useEffect(() => {
    if (!linkRef.current || !allItems.length) return;
    linkRef.current = false;
    const code = params.get("code");
    if (!code) return;
    const it = allItems.find((x) => String(x.item_code || "").trim() === code);
    if (!it) { setMsg({ kind: "bad", text: t({ en: `No catalog product for "${code}"`, ar: `لا يوجد منتج بالكتالوج لـ «${code}»` }) }); return; }
    choose(it);
    const prod = params.get("prod");
    const exp = params.get("exp");
    const lotP = params.get("lot");
    if (isISO(prod)) setProdDate(prod);
    if (isISO(exp)) { setExpDate(exp); setExpManual(true); }
    if (lotP) { setLot(cleanLot(lotP)); setLotManual(true); }
    if (Number(params.get("kg")) > 0) setWeight(params.get("kg"));
    if (params.get("site")) setSite(params.get("site"));
  }, [allItems]); // eslint-disable-line react-hooks/exhaustive-deps

  /* a scan: our own label (item code in GS1 240), a linked world barcode, or a typed code */
  const onScan = async (text) => {
    setScanOpen(false);
    const r = parseBarcode(text);
    let code = r.itemCode;
    if (!code) {
      const map = codeMapRef.current || (await fetchBarcodeMap());
      codeMapRef.current = map;
      code = findBarcode(map, r.gtin || text).hit?.code || "";
    }
    if (!code) code = String(text || "").trim();
    const it = allItems.find((x) => String(x.item_code || "").trim() === code);
    if (!it) { setMsg({ kind: "bad", text: t({ en: `No catalog product for "${text}"`, ar: `لا يوجد منتج بالكتالوج لـ «${text}»` }) }); return; }
    choose(it);
    if (r.prodDate) setProdDate(r.prodDate);
    if (r.expDate) { setExpDate(r.expDate); setExpManual(true); }
    if (r.batch) { setLot(r.batch); setLotManual(true); }
    if (r.weightKg > 0) setWeight(String(r.weightKg));
  };
  useWedgeScanner((text) => {
    if (/^https?:\/\//i.test(text)) return false;
    onScan(text);
    return true;
  }, !scanOpen && !printing);

  const data = {
    company,
    product: product?.name || "",
    code: product?.code || "",
    prodDate,
    expDate,
    lot,
    weightKg: Number(String(weight).replace(",", ".")) || 0,
    branch: site,
    storage: product ? storageText(storageOf(media, product.code)) : "",
    allergens: product ? allergensOf(media, product.code).map((a) => allergenOf(a).label) : [],
    packedBy,
  };

  const gs1 = gs1Text(data);
  const moduleMm = code128ModuleMm(gs1, size);
  const barsOk = moduleMm >= MIN_MODULE_MM;
  const sym = symbol === "code128" && !barsOk ? "qr" : symbol;
  const one = labelHtml(data, size, { symbol: sym, show });

  /* the preview scales the real mm label into a fixed box */
  const PX_PER_MM = 3.78;
  const zoom = Math.min(420 / (size.w * PX_PER_MM), 280 / (size.h * PX_PER_MM), 2.4);
  const previewDoc = `<!doctype html><html><head><meta charset="utf-8"><style>${LABEL_CSS}
html,body{height:100%}body{display:grid;place-items:center;background:#eef3f8}
.lb{zoom:${zoom.toFixed(3)};box-shadow:0 6px 22px rgba(15,39,64,.18);outline:1px dashed #94a3b8}</style></head><body>${one}</body></html>`;

  const problems = [
    !product && t({ en: "Pick a product", ar: "اختر المنتج" }),
    !isISO(prodDate) && t({ en: "Production date", ar: "تاريخ الإنتاج" }),
    !isISO(expDate) && t({ en: "Expiry date", ar: "تاريخ الانتهاء" }),
    isISO(prodDate) && isISO(expDate) && expDate < prodDate && t({ en: "Expiry is before production", ar: "الانتهاء قبل الإنتاج" }),
    !cleanLot(lot) && t({ en: "Lot number", ar: "رقم الدفعة" }),
  ].filter(Boolean);

  const doPrint = async (override) => {
    const d = override?.data || data;
    const sz = override ? sizeOf(override.sizeId) : size;
    const n = override?.copies || Number(copies) || 1;
    const html = printDocument(override ? labelHtml(d, sz, { symbol: override.symbol, show: override.show || show }) : one, sz, n);
    printHtml(html);
    setPrinting(true);
    try {
      await logPrintJob({
        code: d.code, product: d.product, prodDate: d.prodDate, expDate: d.expDate, lot: cleanLot(d.lot),
        weightKg: d.weightKg || 0, branch: d.branch, packedBy: d.packedBy, copies: n,
        sizeId: sz.id, symbol: override?.symbol || sym, show: override?.show || show, reprint: !!override,
      }, userName());
      setMsg({ kind: "ok", text: t({ en: `Sent ${n} label(s) to the printer and logged`, ar: `أُرسل ${n} ملصق للطابعة وسُجّل` }) });
      loadJobs();
    } catch (e) {
      setMsg({ kind: "bad", text: t({ en: "Printed, but the log could not be saved: ", ar: "طُبع، لكن تعذّر حفظ السجل: " }) + String(e?.message || e) });
    } finally {
      setPrinting(false);
    }
  };

  const reprint = (j) => {
    const it = allItems.find((x) => String(x.item_code || "").trim() === j.code);
    const code = j.code || "";
    doPrint({
      sizeId: j.sizeId, symbol: j.symbol, show: j.show, copies: j.copies,
      data: {
        company, product: it?.description || j.product, code, prodDate: j.prodDate, expDate: j.expDate, lot: j.lot,
        weightKg: j.weightKg, branch: j.branch, packedBy: j.packedBy,
        storage: storageText(storageOf(media, code)),
        allergens: allergensOf(media, code).map((a) => allergenOf(a).label),
      },
    });
  };

  const showLabel = {
    company: { en: "Company name", ar: "اسم الشركة" },
    weight: { en: "Net weight", ar: "الوزن الصافي" },
    branch: { en: "Site", ar: "الموقع" },
    storage: { en: "Storage", ar: "التخزين" },
    allergens: { en: "Allergens", ar: "مسبّبات الحساسية" },
    packer: { en: "Packed by", ar: "المُعبّئ" },
  };

  return (
    <div dir={dir} className="lbp" style={S.page}>
      <style>{CSS}</style>
      <div style={S.wrap}>
        <header style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <span style={S.headIcon}>🏷️</span>
            <div style={{ minWidth: 0 }}>
              <div className="lbp-title" style={{ fontWeight: 900 }}>{t({ en: "Product Labels", ar: "ملصقات المنتجات" })}</div>
              <div className="lbp-small" style={{ color: "#6b8299", fontWeight: 700 }}>
                {t({ en: "Expiry from shelf life · GS1 code with dates, lot and item code", ar: "الانتهاء من مدة الصلاحية · كود GS1 فيه التواريخ والدفعة وكود الصنف" })}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <LangToggle lang={lang} toggle={toggle} style={S.btn} />
            <button type="button" style={S.btn} onClick={() => navigate("/inventory")}>{t({ en: "Inventory", ar: "المخزون" })}</button>
            <button type="button" style={S.btn} onClick={() => navigate("/named-dashboard")}>{t({ en: "Home", ar: "الرئيسية" })}</button>
          </div>
        </header>

        <div className="lbp-grid" style={S.grid}>
          {/* ───────── the form ───────── */}
          <section style={S.card}>
            <div className="lbp-h" style={S.h}>1 · {t({ en: "Product", ar: "المنتج" })}</div>
            {product ? (
              <div style={S.picked}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900 }}>{product.name}</div>
                  <div className="lbp-small" style={{ color: "#4b6a85" }}>
                    {t({ en: "Item", ar: "الصنف" })} {product.code}
                    {shelf ? ` · ${t({ en: "shelf life", ar: "الصلاحية" })} ${shelf.days} ${t({ en: "days", ar: "يوم" })}` : ` · ${t({ en: "no shelf-life rule", ar: "لا توجد قاعدة صلاحية" })}`}
                  </div>
                </div>
                <button type="button" style={S.btnSm} onClick={() => setProduct(null)}>{t({ en: "Change", ar: "تغيير" })}</button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...S.input, flex: 1 }}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={catLoading ? t({ en: "Loading catalog…", ar: "تحميل الكتالوج…" }) : t({ en: "Search by code or name, or scan", ar: "ابحث بالكود أو الاسم، أو امسح" })}
                    autoFocus
                  />
                  <button type="button" style={S.btn} onClick={() => setScanOpen(true)}>📷 {t({ en: "Scan", ar: "مسح" })}</button>
                </div>
                {matches.length > 0 && (
                  <div style={S.list}>
                    {matches.map((it) => (
                      <button key={`${it.item_code}|${it.description}`} type="button" className="lbp-pick" style={S.pick} onClick={() => choose(it)}>
                        <b style={{ minWidth: 64 }}>{it.item_code}</b>
                        <span style={{ flex: 1, textAlign: "start" }}>{it.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="lbp-h" style={{ ...S.h, marginTop: 18 }}>2 · {t({ en: "Dates and lot", ar: "التواريخ والدفعة" })}</div>
            <div style={S.row2}>
              <Field label={t({ en: "Production date", ar: "تاريخ الإنتاج" })}>
                <input type="date" style={S.input} value={prodDate} onChange={(e) => setProdDate(e.target.value)} />
              </Field>
              <Field
                label={t({ en: "Expiry date", ar: "تاريخ الانتهاء" })}
                hint={expManual
                  ? <button type="button" style={S.link} onClick={() => setExpManual(false)}>↻ {t({ en: "from shelf life", ar: "من الصلاحية" })}</button>
                  : shelf ? `+${shelf.days}d` : ""}
              >
                <input type="date" style={S.input} value={expDate} onChange={(e) => { setExpDate(e.target.value); setExpManual(true); }} />
              </Field>
              <Field
                label={t({ en: "Lot / batch", ar: "رقم الدفعة" })}
                hint={lotManual ? <button type="button" style={S.link} onClick={() => setLotManual(false)}>↻ {t({ en: "auto", ar: "تلقائي" })}</button> : ""}
              >
                <input style={S.input} value={lot} onChange={(e) => { setLot(cleanLot(e.target.value)); setLotManual(true); }} />
              </Field>
              <Field label={t({ en: "Net weight (kg) — optional", ar: "الوزن الصافي (كغ) — اختياري" })}>
                <input style={S.input} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </Field>
              <Field label={t({ en: "Site", ar: "الموقع" })}>
                <input style={S.input} list="lbp-sites" value={site} onChange={(e) => setSite(e.target.value)} />
                <datalist id="lbp-sites">{SITES.map((s) => <option key={s} value={s} />)}</datalist>
              </Field>
              <Field label={t({ en: "Packed by", ar: "المُعبّئ" })}>
                <input style={S.input} value={packedBy} onChange={(e) => setPackedBy(e.target.value)} />
              </Field>
            </div>

            <div className="lbp-h" style={{ ...S.h, marginTop: 18 }}>3 · {t({ en: "Label", ar: "الملصق" })}</div>
            <div style={S.row2}>
              <Field label={t({ en: "Label size", ar: "مقاس الملصق" })}>
                <select style={S.input} value={sizeId} onChange={(e) => setSizeId(e.target.value)}>
                  {SIZES.map((s) => <option key={s.id} value={s.id}>{isAr ? s.ar : s.en}</option>)}
                </select>
              </Field>
              <Field label={t({ en: "Code", ar: "الكود" })}>
                <select style={S.input} value={sym} onChange={(e) => setSymbol(e.target.value)}>
                  <option value="qr">QR (GS1)</option>
                  <option value="code128" disabled={!barsOk}>
                    {t({ en: "Barcode GS1-128", ar: "باركود GS1-128" })}{!barsOk ? t({ en: " — label too narrow", ar: " — الملصق ضيّق" }) : ""}
                  </option>
                </select>
              </Field>
              <Field label={t({ en: "Copies", ar: "عدد النسخ" })}>
                <input style={S.input} type="number" min="1" max="500" value={copies} onChange={(e) => setCopies(e.target.value)} />
              </Field>
            </div>
            <div style={S.toggles}>
              {SHOW_KEYS.map((k) => (
                <label key={k} style={S.toggle}>
                  <input type="checkbox" checked={show[k] !== false} onChange={(e) => setShow((s) => ({ ...s, [k]: e.target.checked }))} />
                  {t(showLabel[k])}
                </label>
              ))}
            </div>
          </section>

          {/* ───────── the preview ───────── */}
          <section style={{ ...S.card, display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="lbp-h" style={S.h}>{t({ en: "Preview", ar: "معاينة" })} · {size.w} × {size.h} mm</div>
            <iframe title="label-preview" srcDoc={previewDoc} style={S.preview} />
            {gs1 && <div className="lbp-small" style={S.mono} dir="ltr">{gs1}</div>}
            {problems.length > 0 && (
              <div className="lbp-small" style={S.warn}>{t({ en: "Missing: ", ar: "ناقص: " })}{problems.join(" · ")}</div>
            )}
            {msg && <div className="lbp-small" style={msg.kind === "ok" ? S.ok : S.warn}>{msg.text}</div>}
            <button type="button" style={{ ...S.primary, opacity: problems.length || printing ? 0.5 : 1 }} disabled={!!problems.length || printing} onClick={() => doPrint()}>
              🖨️ {t({ en: `Print ${Number(copies) || 1} label(s)`, ar: `طباعة ${Number(copies) || 1} ملصق` })}
            </button>
            <div className="lbp-small" style={{ color: "#6b8299" }}>
              {t({
                en: "Thermal printers: set the paper size to the label size and margins to none in the print dialog.",
                ar: "الطابعات الحرارية: اختر مقاس الورق بنفس مقاس الملصق والهوامش «بلا» في نافذة الطباعة.",
              })}
            </div>
          </section>
        </div>

        {/* ───────── today's prints ───────── */}
        <section style={{ ...S.card, marginTop: 18 }}>
          <div className="lbp-h" style={S.h}>{t({ en: "Printed today", ar: "طُبع اليوم" })} · {dmy(todayISO())}</div>
          {jobsErr && <div className="lbp-small" style={S.warn}>{jobsErr}</div>}
          {!jobsErr && jobs.length === 0 && <div className="lbp-small" style={{ color: "#6b8299" }}>{t({ en: "Nothing printed yet today.", ar: "لم يُطبع شيء اليوم بعد." })}</div>}
          {jobs.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="lbp-small" style={S.table}>
                <thead>
                  <tr>
                    {[
                      { en: "Time", ar: "الوقت" }, { en: "Product", ar: "المنتج" }, { en: "Lot", ar: "الدفعة" },
                      { en: "Prod", ar: "إنتاج" }, { en: "Exp", ar: "انتهاء" }, { en: "Copies", ar: "النسخ" },
                      { en: "Site", ar: "الموقع" }, { en: "By", ar: "بواسطة" }, { en: "", ar: "" },
                    ].map((h, i) => <th key={i} style={S.th}>{t(h)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id}>
                      <td style={S.td}>{j.at ? new Date(j.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</td>
                      <td style={S.td}><b>{j.code}</b> {j.product}{j.reprint ? ` · ${t({ en: "reprint", ar: "إعادة" })}` : ""}</td>
                      <td style={S.td}>{j.lot}</td>
                      <td style={S.td}>{dmy(j.prodDate)}</td>
                      <td style={S.td}>{dmy(j.expDate)}</td>
                      <td style={S.td}>{j.copies}</td>
                      <td style={S.td}>{j.branch}</td>
                      <td style={S.td}>{j.by}</td>
                      <td style={S.td}><button type="button" style={S.btnSm} disabled={printing} onClick={() => reprint(j)}>🖨️ {t({ en: "Reprint", ar: "إعادة طباعة" })}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <BarcodeScanner open={scanOpen} lang={lang} onResult={onScan} onClose={() => setScanOpen(false)} />
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span className="lbp-small" style={{ display: "flex", justifyContent: "space-between", gap: 8, fontWeight: 800, color: "#35536e" }}>
        <span>{label}</span>
        {hint ? <span style={{ color: "#1f6fd0" }}>{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

const FONT = "Cairo, Tajawal, system-ui, sans-serif";
const S = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg,#f2f7fc,#e8f1fa)", padding: "18px 14px 40px", fontFamily: FONT, color: "#0f2740" },
  wrap: { maxWidth: 1240, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 18 },
  headIcon: { width: 56, height: 56, borderRadius: 18, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#14b8a6,#0d9488)", color: "#fff", fontSize: 28, flex: "none" },
  grid: { display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)", gap: 18, alignItems: "start" },
  card: { background: "#fff", border: "1px solid #e3edf7", borderRadius: 20, padding: 18, boxShadow: "0 10px 26px rgba(15,39,64,.06)" },
  h: { fontWeight: 900, marginBottom: 10, color: "#0f2740" },
  row2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 12 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #cfdeec", background: "#fbfdff", color: "#0f2740", outline: "none" },
  btn: { padding: "9px 14px", borderRadius: 12, border: "1px solid #cfdeec", background: "#fff", color: "#0f2740", fontWeight: 800, cursor: "pointer", fontFamily: FONT },
  btnSm: { padding: "6px 10px", borderRadius: 10, border: "1px solid #cfdeec", background: "#fff", color: "#1f6fd0", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", fontFamily: FONT },
  link: { border: 0, background: "none", color: "#1f6fd0", fontWeight: 800, cursor: "pointer", padding: 0, fontFamily: FONT },
  primary: { padding: "13px 18px", borderRadius: 14, border: 0, background: "linear-gradient(135deg,#0d9488,#0f766e)", color: "#fff", fontWeight: 900, cursor: "pointer", fontFamily: FONT },
  picked: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, background: "#ecfdf5", border: "1px solid #a7f3d0" },
  list: { marginTop: 8, maxHeight: 280, overflowY: "auto", border: "1px solid #e3edf7", borderRadius: 14 },
  pick: { display: "flex", gap: 10, width: "100%", padding: "9px 12px", border: 0, borderBottom: "1px solid #f0f5fa", background: "#fff", cursor: "pointer", color: "#0f2740", fontFamily: FONT },
  toggles: { display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 12 },
  toggle: { display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#35536e", cursor: "pointer" },
  preview: { width: "100%", height: 320, border: "1px solid #e3edf7", borderRadius: 14, background: "#eef3f8" },
  mono: { fontFamily: "ui-monospace, Consolas, monospace", color: "#4b6a85", wordBreak: "break-all", textAlign: "left" },
  warn: { padding: "9px 12px", borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontWeight: 700 },
  ok: { padding: "9px 12px", borderRadius: 12, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontWeight: 700 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "start", padding: "8px 10px", background: "#f4f8fc", color: "#35536e", fontWeight: 800, borderBottom: "1px solid #e3edf7", whiteSpace: "nowrap" },
  td: { padding: "8px 10px", borderBottom: "1px solid #f0f5fa", whiteSpace: "nowrap" },
};
