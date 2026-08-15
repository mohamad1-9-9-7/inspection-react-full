// src/pages/mrp/MrpItems.jsx
//
// 1️⃣ سجل الأصناف والمواد — ماستر خفيف لبناء قوائم التفكيك/التقطيع (BOM).
// Lightweight item master: unique code · names · display name · role · UoM · category.
//
// كل صنف: كود فريد (ماستر) · اسم عربي/إنجليزي · اسم معروض (كود+اسم+وحدة)
// · دور داخل الـBOM (خام/مكوّن/منتج نهائي/هدر) · وحدة قياس · فئة.
// لا تكلفة ولا رصيد افتتاحي — هيدا سجل تعريفي فقط.
//
// 💾 الحفظ مستقل لكل عملية: ما في شريط حفظ عائم. أي إضافة أو تعديل أو حذف
// بينحفظ على السيرفر لحاله لحظة ما تضغط الزر، والصنف الجديد ما بينضاف
// للقائمة قبل ما تضغط «حفظ» بالنموذج.

import React, { useMemo, useRef, useState } from "react";
import {
  ITEM_TYPES, activeOnly, categoryLabel, disassemblyForInput, displayNameOf,
  freshId, hasRole, mutateConfig, nameOf, rolesOf, useMrpConfig, usageCount,
} from "./mrpApi";
import {
  Badge, Card, EmptyBox, Field, Kpi, Modal, MrpNoAccess, MrpShell, S,
  SearchBox, Select, Switch, TextInput, Toast, UomSelect, canEditMrp, canOpenMrp,
} from "./mrpUi";
import { useSettingsLang } from "../settings/_shared/settingsI18n";

const PAGE = "mrp.items";

/* قائمة المنتجات — مصدرها ملف Product.xlsx بعد تحويله لـ mrp_products.json.
   الشكل: { item_code, description(اسم نظيف), uom, category }. */
let catalogCache = null;
function useCatalog() {
  const [items, setItems] = useState(catalogCache || []);
  React.useEffect(() => {
    if (catalogCache) return;
    const pub = process.env.PUBLIC_URL || "";
    fetch(`${pub}/data/mrp_products.json`, { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no catalog"))))
      .then((d) => { catalogCache = Array.isArray(d) ? d : []; setItems(catalogCache); })
      .catch(() => { catalogCache = []; });
  }, []);
  return items;
}

/* توحيد الوحدات — لو انكتبت بصيغة مختلفة بالملف. */
const UOM_HINTS = {
  KG: "KG", KGS: "KG", G: "G", GM: "G", GRAM: "G",
  PCS: "PCS", PC: "PCS", PIECE: "PCS", NOS: "PCS", NO: "PCS",
  BOX: "BOX", BX: "BOX", CTN: "BOX", CARTON: "BOX", PACK: "BOX", PKT: "BOX",
  L: "L", LTR: "L", LITER: "L", LITRE: "L",
  M: "M", MTR: "M", METER: "M", METRE: "M",
};
const normUom = (v) =>
  UOM_HINTS[String(v || "").trim().toUpperCase()] || String(v || "").trim().toUpperCase() || "KG";

/** كود + اسم نظيف + وحدة + فئة من سطر الملف (مع رجوع لتخمين الوحدة من آخر "- KG"). */
function parseCatalog(row) {
  const code = String(row?.item_code || "").trim();
  let name = String(row?.description || "").trim();
  let uom = row?.uom ? normUom(row.uom) : "";
  if (!uom) {
    const m = name.match(/^(.*)\s-\s*([A-Za-z]*)\s*$/); // آخر "- وحدة"
    if (m && UOM_HINTS[m[2].trim().toUpperCase()]) {
      name = m[1].trim();
      uom = UOM_HINTS[m[2].trim().toUpperCase()];
    }
  }
  return { code, name: name || code, uom: uom || "KG", category: String(row?.category || "").trim() };
}

/** مفتاح مقارنة الكود — بلا مسافات وبأحرف كبيرة كي يكون الكود ماستر فريد. */
const skuKey = (v) => String(v || "").trim().toUpperCase();

const blankItem = () => ({
  id: freshId("item"), sku: "", ar: "", en: "", uom: "KG",
  type: "raw", roles: ["raw"], categoryId: "", notes: "", active: true,
});

/** يبقّي `type` = أول دور، ويضمن دوراً واحداً على الأقل. */
const normalizeRoles = (roles) => {
  const clean = (Array.isArray(roles) ? roles : []).filter(Boolean);
  const list = clean.length ? clean : ["raw"];
  return { roles: list, type: list[0] };
};

export default function MrpItems() {
  const { t, isAr } = useSettingsLang();
  const { cfg, setCfg, loading } = useMrpConfig();
  const catalog = useCatalog();

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);        // { text, bad }
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");     // "" | "active" | "off"
  const [srcFilter, setSrcFilter] = useState("");           // "" | "file" | "manual"
  const [sort, setSort] = useState({ key: "sku", dir: "asc" });
  const [itemForm, setItemForm] = useState(null);  // { mode: "new"|"edit", data }
  const [catForm, setCatForm] = useState(null);    // { mode: "new"|"edit", data }
  const [importing, setImporting] = useState(false);

  const canEdit = canEditMrp();
  const toastTimer = useRef(null);

  const flash = (text, bad) => {
    setToast({ text, bad: !!bad });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3600);
  };

  /**
   * تعديل + حفظ فوري مستقل — اقرأ آخر نسخة من السيرفر ثم عدّل ثم احفظ،
   * حتى ما يندهس صنف أضافه جهاز تاني بنفس الوقت.
   */
  const commit = async (fn, okMsg) => {
    if (busy) return false;
    setBusy(true);
    try {
      const saved = await mutateConfig((next) => {
        if (!Array.isArray(next.items)) next.items = [];
        if (!Array.isArray(next.categories)) next.categories = [];
        fn(next);
      });
      setCfg(saved);
      if (okMsg) flash(okMsg);
      return true;
    } catch (e) {
      flash(e?.userMessage || `${t({ en: "Save failed", ar: "فشل الحفظ" })}: ${e?.message || e}`, true);
      return false;
    } finally {
      setBusy(false);
    }
  };

  /* ── الأصناف ── */
  const openNewItem = () => setItemForm({ mode: "new", data: blankItem() });
  const openItem = (it) => setItemForm({ mode: "edit", data: { ...it } });

  const saveItemForm = async () => {
    const d = itemForm.data;
    const code = String(d.sku || "").trim();
    const isNew = itemForm.mode === "new";
    const { roles, type } = normalizeRoles(d.roles);

    // كل الخانات إلزامية عند الإضافة
    if (isNew) {
      const missing = [];
      if (!code) missing.push(t({ en: "code", ar: "الكود" }));
      if (!String(d.ar || "").trim()) missing.push(t({ en: "Arabic name", ar: "الاسم بالعربي" }));
      if (!String(d.en || "").trim()) missing.push(t({ en: "English name", ar: "الاسم بالإنجليزي" }));
      if (!(d.roles || []).filter(Boolean).length) missing.push(t({ en: "role", ar: "الدور" }));
      if (!String(d.uom || "").trim()) missing.push(t({ en: "UoM", ar: "الوحدة" }));
      if (!d.categoryId) missing.push(t({ en: "category", ar: "الفئة" }));
      if (missing.length) {
        flash(`${t({ en: "Required", ar: "إلزامي" })}: ${missing.join("، ")}`, true);
        return;
      }
    } else if (!code) {
      flash(t({ en: "A master code is required.", ar: "لازم كود ماستر." }), true);
      return;
    }

    const clean = { ...d, sku: code, roles, type };
    const ok = await commit(
      (n) => {
        // فحص التكرار على أحدث نسخة من السيرفر (مش النسخة القديمة بالذاكرة)
        const clash = (n.items || []).some((i) => i.id !== clean.id && skuKey(i.sku) === skuKey(code));
        if (clash) {
          const err = new Error("DUPLICATE_SKU");
          err.userMessage = t({
            en: `Code ${code} already exists (maybe added on another device) — the code is a master key and cannot repeat.`,
            ar: `الكود ${code} موجود مسبقاً (يمكن أُضيف من جهاز تاني) — الكود مفتاح ماستر وما بيتكرّر.`,
          });
          throw err;
        }
        if (isNew) n.items.push(clean);
        else {
          const it = n.items.find((x) => x.id === clean.id);
          if (it) Object.assign(it, clean);
        }
      },
      isNew
        ? t({ en: `Item ${code} added.`, ar: `تمت إضافة الصنف ${code}.` })
        : t({ en: `Item ${code} saved.`, ar: `تم حفظ الصنف ${code}.` })
    );
    if (ok) setItemForm(null);
  };

  const removeItem = async (it) => {
    const used = usageCount(cfg, it.id);
    if (!window.confirm(
      `${t({
        en: `Delete "${nameOf(it, isAr) || it.sku || it.id}"? This is saved immediately.`,
        ar: `حذف «${nameOf(it, isAr) || it.sku || it.id}»؟ الحذف بينحفظ فوراً.`,
      })}${used ? `\n${t({ en: "Used in", ar: "مستعمل في" })}: ${used} BOM` : ""}`
    )) return;
    const ok = await commit(
      (n) => { n.items = n.items.filter((x) => x.id !== it.id); },
      t({ en: "Item deleted.", ar: "تم حذف الصنف." })
    );
    if (ok) setItemForm(null);
  };

  /** حذف شامل — عملية فورية لا رجعة فيها، لذلك بتطلب تأكيد مكتوب. */
  const removeAll = async () => {
    const count = (cfg.items || []).length;
    if (!count) return;
    const typed = window.prompt(t({
      en: `Delete ALL ${count} items permanently?\nBOM lines that point at them will be left orphaned.\n\nType DELETE to confirm:`,
      ar: `حذف كل الأصناف (${count}) نهائياً؟\nأسطر قوائم المواد المرتبطة فيهم رح تصير معلّقة.\n\nاكتب DELETE للتأكيد:`,
    }));
    if (String(typed || "").trim().toUpperCase() !== "DELETE") return;
    await commit(
      (n) => { n.items = []; },
      t({ en: `All ${count} items deleted.`, ar: `تم حذف كل الأصناف (${count}).` })
    );
    setItemForm(null);
  };

  /* ── الفئات ── */
  const openNewCat = () =>
    setCatForm({ mode: "new", data: { id: freshId("cat"), ar: "", en: "", active: true } });
  const openCat = (c) => setCatForm({ mode: "edit", data: { ...c } });

  const saveCatForm = async () => {
    const d = catForm.data;
    if (!String(d.en || "").trim() && !String(d.ar || "").trim()) {
      flash(t({ en: "Enter a category name.", ar: "أدخل اسم الفئة." }), true);
      return;
    }
    const isNew = catForm.mode === "new";
    const ok = await commit(
      (n) => {
        if (isNew) n.categories.push(d);
        else {
          const c = n.categories.find((x) => x.id === d.id);
          if (c) Object.assign(c, d);
        }
      },
      isNew
        ? t({ en: "Category added.", ar: "تمت إضافة الفئة." })
        : t({ en: "Category saved.", ar: "تم حفظ الفئة." })
    );
    if (ok) setCatForm(null);
  };

  const removeCat = async (c) => {
    const used = (cfg.items || []).filter((i) => i.categoryId === c.id).length;
    if (!window.confirm(t({
      en: `Delete category "${nameOf(c, isAr) || c.id}"?${used ? `\n${used} item(s) will be left with no category.` : ""}`,
      ar: `حذف الفئة «${nameOf(c, isAr) || c.id}»؟${used ? `\n${used} صنف رح يضلّوا بلا فئة.` : ""}`,
    }))) return;
    const ok = await commit(
      (n) => {
        n.categories = n.categories.filter((x) => x.id !== c.id);
        (n.items || []).forEach((it) => { if (it.categoryId === c.id) it.categoryId = ""; });
      },
      t({ en: "Category deleted.", ar: "تم حذف الفئة." })
    );
    if (ok) setCatForm(null);
  };

  /** استيراد من قائمة المنتجات — بلا تكرار كود، مع إنشاء/ربط الفئة من عمود Type. */
  const importCatalog = async (catalogRows, defType = "raw") => {
    let added = 0;
    const ok = await commit((n) => {
      const have = new Set((n.items || []).map((i) => skuKey(i.sku)).filter(Boolean));
      const catKey = (s) => String(s || "").trim().toLowerCase();
      const catIndex = new Map();
      n.categories.forEach((c) => {
        if (c.en) catIndex.set(catKey(c.en), c.id);
        if (c.ar) catIndex.set(catKey(c.ar), c.id);
      });
      const ensureCategory = (label) => {
        const k = catKey(label);
        if (!k) return "";
        if (catIndex.has(k)) return catIndex.get(k);
        const id = freshId("cat");
        n.categories.push({ id, ar: "", en: label, active: true });
        catIndex.set(k, id);
        return id;
      };
      catalogRows.forEach((row) => {
        const { code, name, uom, category } = parseCatalog(row);
        if (!code || have.has(skuKey(code))) return;
        have.add(skuKey(code));
        added += 1;
        n.items.push({
          ...blankItem(),
          id: freshId("item"),
          sku: code, en: name, uom, type: defType, roles: [defType],
          categoryId: ensureCategory(category),
          catalogCode: code, source: "catalog", // الربط الذكي بالملف
        });
      });
    }, null);

    if (ok) {
      flash(added
        ? t({ en: `Imported & saved ${added} item(s).`, ar: `تم استيراد وحفظ ${added} صنف.` })
        : t({ en: "Everything is already imported.", ar: "كل شي مستورد أصلاً." }));
      setImporting(false);
    }
  };

  /** إعادة مزامنة الأسماء والوحدات من الملف (بلا دهس الاسم العربي اليدوي). */
  const resyncNames = async () => {
    const byCode = new Map(catalog.map((r) => [skuKey(r.item_code), r]));
    let n = 0;
    await commit((next) => {
      (next.items || []).forEach((it) => {
        const row = byCode.get(skuKey(it.catalogCode || it.sku));
        if (!row) return;
        const { name, uom } = parseCatalog(row);
        if (name && name !== it.en) { it.en = name; n += 1; }
        if (uom && uom !== it.uom) it.uom = uom;
      });
    }, null);
    flash(t({ en: `Refreshed ${n} name(s) from the product list.`, ar: `تم تحديث ${n} اسم من قائمة المنتجات.` }));
  };

  /* ── صحة الأكواد (بيانات قديمة قد تحوي تكراراً) ── */
  const validation = useMemo(() => {
    const byKey = new Map();
    const blank = new Set();
    (cfg.items || []).forEach((it) => {
      const k = skuKey(it.sku);
      if (!k) { blank.add(it.id); return; }
      byKey.set(k, [...(byKey.get(k) || []), it.id]);
    });
    const dup = new Set();
    byKey.forEach((ids) => { if (ids.length > 1) ids.forEach((id) => dup.add(id)); });
    return { dup, blank };
  }, [cfg.items]);

  const catalogCodes = useMemo(
    () => new Set(catalog.map((r) => skuKey(r.item_code))),
    [catalog]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (cfg.items || [])
      .map((it) => ({
        it,
        cat: categoryLabel(cfg, it, isAr),
        display: displayNameOf(it),
        usedIn: usageCount(cfg, it.id),
        hasBom: !!disassemblyForInput(cfg, it.id),
        fromFile: catalogCodes.has(skuKey(it.sku)),
        dup: validation.dup.has(it.id),
        noCode: validation.blank.has(it.id),
      }))
      .filter((r) => {
        if (typeFilter && !hasRole(r.it, typeFilter)) return false;
        if (catFilter && (r.it.categoryId || "") !== catFilter) return false;
        if (statusFilter === "active" && r.it.active === false) return false;
        if (statusFilter === "off" && r.it.active !== false) return false;
        if (srcFilter === "file" && !r.fromFile) return false;
        if (srcFilter === "manual" && r.fromFile) return false;
        if (!needle) return true;
        return [r.it.sku, r.it.ar, r.it.en, r.cat, r.display]
          .some((v) => String(v || "").toLowerCase().includes(needle));
      });
  }, [cfg, q, typeFilter, catFilter, statusFilter, srcFilter, isAr, validation, catalogCodes]);

  const rows = useMemo(() => {
    if (!sort.key) return filtered;
    const dir = sort.dir === "desc" ? -1 : 1;
    const val = (r) => {
      switch (sort.key) {
        case "sku": return r.it.sku || "";
        case "name": return nameOf(r.it, isAr) || r.it.id || "";
        case "role": return nameOf(ITEM_TYPES.find((x) => x.id === rolesOf(r.it)[0]) || {}, isAr) || "";
        case "uom": return r.it.uom || "";
        case "cat": return r.cat || "";
        case "used": return r.usedIn || 0;
        case "status": return r.it.active === false ? 1 : 0;
        default: return "";
      }
    };
    return [...filtered].sort((a, b) => {
      const va = val(a); const vb = val(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" }) * dir;
    });
  }, [filtered, sort, isAr]);

  const toggleSort = (key) =>
    setSort((s) => {
      if (s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return { key: "", dir: "asc" };                 // النقرة الثالثة تلغي الفرز
    });

  const anyFilter = q || typeFilter || catFilter || statusFilter || srcFilter;
  const resetView = () => {
    setQ(""); setTypeFilter(""); setCatFilter(""); setStatusFilter(""); setSrcFilter("");
    setSort({ key: "sku", dir: "asc" });
  };

  const totals = useMemo(() => {
    const items = cfg.items || [];
    const haveCodes = new Set(items.map((i) => skuKey(i.sku)).filter(Boolean));
    const catalogCodes = new Set(catalog.map((r) => skuKey(r.item_code)));
    const notImported = catalog.filter((r) => !haveCodes.has(skuKey(r.item_code))).length;
    const off = items.filter((i) => i.active === false).length;
    // من الملف = كودُه موجود بقائمة المنتجات ؛ يدوي = مضاف بإيدك (مثل 22160)
    const fromFile = items.filter((i) => catalogCodes.has(skuKey(i.sku))).length;
    return {
      count: items.length,
      off,
      active: items.length - off,
      categories: (cfg.categories || []).length,
      catalog: catalog.length,
      fromFile,
      manual: items.length - fromFile,
      notImported,
      issues: validation.dup.size + validation.blank.size,
    };
  }, [cfg.items, cfg.categories, catalog, validation]);

  if (!canOpenMrp(PAGE)) return <MrpNoAccess page={PAGE} />;

  return (
    <MrpShell
      pageId={PAGE}
      icon="📦"
      title={t({ en: "Items & materials", ar: "الأصناف والمواد" })}
      sub={t({
        en: "Master item list — unique codes for building BOMs",
        ar: "سجل الأصناف — أكواد فريدة لبناء قوائم المواد",
      })}
      actions={
        canEdit && (
          <>
            {totals.count > 0 && (
              <button type="button" style={{ ...S.btn, ...S.btnDanger, ...(busy ? S.btnOff : null) }}
                disabled={busy} onClick={removeAll}>
                🗑 {t({ en: "Delete all", ar: "حذف الكل" })}
              </button>
            )}
            <button type="button" style={{ ...S.btn, ...S.btnBlue }} onClick={() => setImporting(true)}>
              📥 {t({ en: "Import from product list", ar: "استيراد من قائمة المنتجات" })}
            </button>
            <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={openNewItem}>
              ＋ {t({ en: "New item", ar: "صنف جديد" })}
            </button>
          </>
        )
      }
    >
      <Toast toast={toast} busy={busy} t={t} />

      <div style={S.kpiRow}>
        <Kpi
          label={t({ en: "Items", ar: "الأصناف" })}
          value={totals.count}
          foot={totals.off
            ? t({
                en: `${totals.active} active · ${totals.off} inactive`,
                ar: `${totals.active} مفعّل · ${totals.off} معطّل`,
              })
            : t({ en: "all active", ar: "الكل مفعّل" })}
        />
        <Kpi label={t({ en: "Categories", ar: "الفئات" })} value={totals.categories} />
        <Kpi
          label={t({ en: "From product file", ar: "من ملف المنتجات" })}
          value={`${totals.fromFile} / ${totals.catalog}`}
          foot={[
            totals.manual
              ? t({ en: `${totals.manual} added manually`, ar: `${totals.manual} مضاف يدوياً` })
              : "",
            totals.notImported
              ? t({ en: `${totals.notImported} not imported`, ar: `${totals.notImported} غير مستورد` })
              : "",
          ].filter(Boolean).join(" · ") || t({ en: "all imported", ar: "الكل مستورد" })}
          color={totals.notImported ? "#b45309" : "#047857"}
        />
        <Kpi
          label={t({ en: "Code issues", ar: "مشاكل الأكواد" })}
          value={totals.issues}
          foot={totals.issues
            ? t({ en: "duplicate / missing", ar: "مكرّر / ناقص" })
            : t({ en: "all unique", ar: "الكل فريد" })}
          color={totals.issues ? "#a12626" : "#047857"}
        />
      </div>

      <Card
        icon="📦"
        title={t({ en: "Item master", ar: "سجل الأصناف" })}
        sub={t({
          en: "Each code is a master key — it cannot repeat. Every change is saved on its own.",
          ar: "كل كود مفتاح ماستر — ما بيتكرّر. كل تعديل بينحفظ لحاله.",
        })}
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder={t({ en: "Search code or name…", ar: "بحث بالكود أو الاسم…" })}
            />
            <select
              style={{ ...S.input, width: 165 }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">{t({ en: "All roles", ar: "كل الأدوار" })}</option>
              {ITEM_TYPES.map((x) => (
                <option key={x.id} value={x.id}>{nameOf(x, isAr)}</option>
              ))}
            </select>
            <select
              style={{ ...S.input, width: 165 }}
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
            >
              <option value="">{t({ en: "All categories", ar: "كل الفئات" })}</option>
              {activeOnly(cfg.categories).map((c) => (
                <option key={c.id} value={c.id}>{nameOf(c, isAr) || c.id}</option>
              ))}
            </select>
            <select
              style={{
                ...S.input, width: 165,
                ...(statusFilter ? { borderColor: "#1f6fd0", background: "#f7fbff" } : null),
              }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{t({ en: "Active & inactive", ar: "المفعّل والمعطّل" })}</option>
              <option value="active">{t({ en: "✓ Active only", ar: "✓ المفعّل فقط" })}</option>
              <option value="off">{t({ en: "⛔ Inactive only", ar: "⛔ المعطّل فقط" })}</option>
            </select>
            <select
              style={{
                ...S.input, width: 165,
                ...(srcFilter ? { borderColor: "#1f6fd0", background: "#f7fbff" } : null),
              }}
              value={srcFilter}
              onChange={(e) => setSrcFilter(e.target.value)}
            >
              <option value="">{t({ en: "All sources", ar: "كل المصادر" })}</option>
              <option value="file">{t({ en: "🔗 From product file", ar: "🔗 من ملف المنتجات" })}</option>
              <option value="manual">{t({ en: "✎ Manual only", ar: "✎ اليدوي فقط" })}</option>
            </select>
            {anyFilter && (
              <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={resetView}
                title={t({ en: "Clear filters & sort", ar: "مسح الفلاتر والفرز" })}>
                ✕ {t({ en: "Reset", ar: "مسح" })}
              </button>
            )}
            {canEdit && (cfg.items || []).some((i) => i.catalogCode) && (
              <button type="button" style={{ ...S.btn, ...S.btnSm, ...(busy ? S.btnOff : null) }}
                disabled={busy} onClick={resyncNames}
                title={t({ en: "Refresh linked names from the product list", ar: "تحديث أسماء المرتبطين من قائمة المنتجات" })}>
                🔄 {t({ en: "Sync names", ar: "تحديث الأسماء" })}
              </button>
            )}
          </div>
        }
      >
        {anyFilter && (
          <div style={{ ...S.hint, fontWeight: 800 }}>
            {t({
              en: `Showing ${rows.length} of ${totals.count} items`,
              ar: `عرض ${rows.length} من ${totals.count} صنف`,
            })}
          </div>
        )}
        {loading && !rows.length ? (
          <EmptyBox>{t({ en: "Loading…", ar: "جارٍ التحميل…" })}</EmptyBox>
        ) : rows.length === 0 ? (
          <EmptyBox>
            {totals.count === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
                <div>
                  {t({
                    en: `Your product list has ${totals.catalog} items. Bring them all in as an editable copy.`,
                    ar: `قائمة منتجاتك فيها ${totals.catalog} صنف. جيبهم كلهم كنسخة قابلة للتعديل.`,
                  })}
                </div>
                {canEdit && (
                  <button type="button" style={{ ...S.btn, ...S.btnBlue }} onClick={() => setImporting(true)}>
                    📥 {t({ en: "Import from product list", ar: "استيراد من قائمة المنتجات" })}
                  </button>
                )}
              </div>
            ) : (
              t({ en: "No item matches the filter.", ar: "لا يوجد صنف مطابق للفلتر." })
            )}
          </EmptyBox>
        ) : (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <SortTh col="sku" label={t({ en: "Code", ar: "الكود" })} sort={sort} onSort={toggleSort} />
                  <SortTh col="name" label={t({ en: "Item", ar: "الصنف" })} sort={sort} onSort={toggleSort} />
                  <SortTh col="role" label={t({ en: "Role", ar: "الدور" })} sort={sort} onSort={toggleSort} />
                  <SortTh col="uom" label={t({ en: "UoM", ar: "الوحدة" })} sort={sort} onSort={toggleSort} />
                  <SortTh col="cat" label={t({ en: "Category", ar: "الفئة" })} sort={sort} onSort={toggleSort} />
                  <SortTh col="used" label={t({ en: "Used in", ar: "مستعمل في" })} sort={sort} onSort={toggleSort} />
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ it, cat, display, usedIn, hasBom, dup, noCode }) => (
                  <tr key={it.id} style={it.active === false ? { opacity: 0.6 } : null}>
                    <td style={{ ...S.td, fontWeight: 900 }}>
                      {it.sku || <span style={{ color: "#a12626" }}>—</span>}
                      {dup && <div><Badge color="#a12626" bg="#fff1f1">⚠ {t({ en: "duplicate", ar: "مكرّر" })}</Badge></div>}
                      {noCode && <div><Badge color="#a12626" bg="#fff1f1">⚠ {t({ en: "no code", ar: "بلا كود" })}</Badge></div>}
                    </td>
                    <td style={{ ...S.td, ...S.tdStart }}>
                      <div style={{ fontWeight: 800, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        {nameOf(it, isAr) || it.id}
                        {it.catalogCode && (
                          <Badge color="#1f6fd0" bg="#eef4fb">🔗 {t({ en: "linked", ar: "مرتبط" })}</Badge>
                        )}
                        {it.active === false && (
                          <Badge color="#a12626" bg="#fff1f1">⛔ {t({ en: "inactive", ar: "معطّل" })}</Badge>
                        )}
                      </div>
                      {/* الاسم بالطرف الآخر — كي يظهر العربي دائماً حتى بواجهة إنجليزية والعكس */}
                      {(isAr ? it.en : it.ar) && (
                        <div style={{ ...S.hint, fontWeight: 800, color: "#3c5a75", direction: isAr ? "ltr" : "rtl" }}>
                          {isAr ? it.en : it.ar}
                        </div>
                      )}
                      {display && <div style={{ ...S.hint, direction: "ltr" }}>{display}</div>}
                    </td>
                    <td style={S.td}>
                      <RoleBadges item={it} isAr={isAr} />
                      {hasBom && (
                        <div><Badge color="#0f766e" bg="#e7f5f3">BOM</Badge></div>
                      )}
                    </td>
                    <td style={S.td}>{it.uom || "—"}</td>
                    <td style={S.td}>{cat || "—"}</td>
                    <td style={S.td}>{usedIn || "—"}</td>
                    <td style={S.td}>
                      <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={() => openItem(it)}>
                        {canEdit ? `✎ ${t({ en: "Edit", ar: "تعديل" })}` : t({ en: "View", ar: "عرض" })}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── الفئات ── */}
      <CategoriesCard
        t={t} isAr={isAr} cfg={cfg} canEdit={canEdit} busy={busy}
        onAdd={openNewCat} onEdit={openCat} onRemove={removeCat}
      />

      {/* ── نموذج الصنف (ما بينضاف قبل الحفظ) ── */}
      {itemForm && (
        <ItemFormModal
          t={t} isAr={isAr} cfg={cfg} catalog={catalog} canEdit={canEdit} busy={busy}
          form={itemForm}
          allItems={cfg.items || []}
          onChange={(p) => setItemForm((f) => ({ ...f, data: { ...f.data, ...p } }))}
          onClose={() => setItemForm(null)}
          onSave={saveItemForm}
          onDelete={() => removeItem(itemForm.data)}
        />
      )}

      {/* ── نموذج الفئة ── */}
      {catForm && (
        <CategoryFormModal
          t={t} busy={busy} form={catForm}
          onChange={(p) => setCatForm((f) => ({ ...f, data: { ...f.data, ...p } }))}
          onClose={() => setCatForm(null)}
          onSave={saveCatForm}
        />
      )}

      {/* ── استيراد من قائمة المنتجات ── */}
      {importing && (
        <CatalogImportModal
          t={t} isAr={isAr} catalog={catalog} busy={busy}
          existing={new Set((cfg.items || []).map((i) => skuKey(i.sku)).filter(Boolean))}
          onClose={() => setImporting(false)}
          onImport={importCatalog}
        />
      )}
    </MrpShell>
  );
}

const ROLE_TONE = {
  raw: { color: "#14507f", bg: "#eef4fb" },
  component: { color: "#1f6fd0", bg: "#eaf2fc" },
  finished: { color: "#047857", bg: "#ecfdf5" },
  waste: { color: "#b45309", bg: "#fffbeb" },
};

/** ترويسة عمود قابلة للفرز — سهم مزدوج، وبالنقر تصاعدي ↑ ثم تنازلي ↓ ثم إلغاء. */
function SortTh({ col, label, sort, onSort }) {
  const active = sort.key === col;
  const arrow = !active ? "⇅" : sort.dir === "asc" ? "▲" : "▼";
  return (
    <th style={{ ...S.th, cursor: "pointer", userSelect: "none" }} onClick={() => onSort(col)}
      title={label}>
      <span style={{
        display: "inline-flex", gap: 6, alignItems: "center", justifyContent: "center",
        color: active ? "#1f6fd0" : "#14507f",
      }}>
        {label}
        <span style={{ fontSize: 11, opacity: active ? 1 : 0.35 }}>{arrow}</span>
      </span>
    </th>
  );
}

function RoleBadges({ item, isAr }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
      {rolesOf(item).map((rid) => {
        const role = ITEM_TYPES.find((x) => x.id === rid);
        if (!role) return null;
        const tone = ROLE_TONE[rid] || { color: "#6b8299", bg: "#f5f9fd" };
        return <Badge key={rid} color={tone.color} bg={tone.bg}>{nameOf(role, isAr)}</Badge>;
      })}
    </div>
  );
}

/** وسم حقل إلزامي — نجمة حمراء عند الإضافة. */
function Req({ isNew, children }) {
  return (
    <span>
      {children}
      {isNew && <span style={{ color: "#a12626", fontWeight: 900 }}> *</span>}
    </span>
  );
}

/** اختيار متعدّد لأدوار الصنف داخل الـBOM — خلية داخل الشبكة. */
function RolesField({ t, isAr, isNew, selected, invalid, onToggle }) {
  const set = new Set((selected || []).filter(Boolean));
  return (
    <div style={S.field}>
      <span style={S.label}>
        <Req isNew={isNew}>{t({ en: "Role(s) in BOM", ar: "الدور/الأدوار في الـBOM" })}</Req>
        <span style={{ ...S.hint, fontWeight: 700 }}> · {t({ en: "one or more", ar: "واحد أو أكثر" })}</span>
      </span>
      <div style={{
        display: "flex", gap: 6, flexWrap: "wrap",
        padding: 6, borderRadius: 10,
        border: `1.5px solid ${invalid ? "#e59a9a" : "#cfe0f0"}`,
        background: invalid ? "#fff7f7" : "#fff",
      }}>
        {ITEM_TYPES.map((r) => {
          const on = set.has(r.id);
          const tone = ROLE_TONE[r.id] || { color: "#6b8299", bg: "#f5f9fd" };
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onToggle(r.id)}
              title={nameOf(r, isAr)}
              style={{
                ...S.btn, padding: "6px 10px", borderRadius: 9,
                display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800,
                ...(on
                  ? { background: tone.bg, borderColor: tone.color, color: tone.color }
                  : { color: "#8aa3b8" }),
              }}
            >
              <span style={{
                width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                display: "grid", placeItems: "center", fontSize: 11, color: "#fff",
                border: `1.5px solid ${on ? tone.color : "#cfe0f0"}`,
                background: on ? tone.color : "#fff",
              }}>{on ? "✓" : ""}</span>
              {nameOf(r, isAr)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════ نموذج الصنف ══════════════ */

function ItemFormModal({
  t, isAr, cfg, catalog, canEdit, busy, form, allItems, onChange, onClose, onSave, onDelete,
}) {
  const d = form.data;
  const isNew = form.mode === "new";
  const code = String(d.sku || "").trim();
  const dup = !!code && allItems.some((i) => i.id !== d.id && skuKey(i.sku) === skuKey(code));

  // كل الخانات إلزامية عند الإضافة
  const miss = {
    sku: !code,
    ar: !String(d.ar || "").trim(),
    en: !String(d.en || "").trim(),
    roles: !(d.roles || []).filter(Boolean).length,
    uom: !String(d.uom || "").trim(),
    categoryId: !d.categoryId,
  };
  const missingCount = Object.values(miss).filter(Boolean).length;
  // الإلزام الكامل عند الإضافة؛ بالتعديل يكفي كود فريد (كي لا نعطّل تعديل بيانات قديمة)
  const invalid = dup || (isNew ? missingCount > 0 : !code);
  const rq = (bad) => (isNew && bad ? { borderColor: "#e59a9a", background: "#fff7f7" } : null);

  return (
    <Modal
      icon="📦"
      title={isNew
        ? t({ en: "New item", ar: "صنف جديد" })
        : `${code ? `[${code}] ` : ""}${nameOf(d, isAr) || t({ en: "Item", ar: "صنف" })}`}
      onClose={onClose}
      footer={
        <>
          {!isNew && canEdit && (
            <button type="button" style={{ ...S.btn, ...S.btnDanger, ...(busy ? S.btnOff : null) }}
              disabled={busy} onClick={onDelete}>
              🗑 {t({ en: "Delete", ar: "حذف" })}
            </button>
          )}
          <button type="button" style={S.btn} onClick={onClose}>
            {t({ en: "Cancel", ar: "إلغاء" })}
          </button>
          {canEdit && (
            <button
              type="button"
              style={{ ...S.btn, ...S.btnPrimary, ...(invalid || busy ? S.btnOff : null) }}
              disabled={invalid || busy}
              onClick={onSave}
            >
              {busy
                ? t({ en: "Saving…", ar: "جارٍ الحفظ…" })
                : `💾 ${isNew ? t({ en: "Add & save", ar: "إضافة وحفظ" }) : t({ en: "Save changes", ar: "حفظ التعديلات" })}`}
            </button>
          )}
        </>
      }
    >
      {dup && (
        <div style={S.err}>
          {t({
            en: `Code ${code} already exists — the code is a master key and cannot repeat.`,
            ar: `الكود ${code} موجود مسبقاً — الكود مفتاح ماستر وما بيتكرّر.`,
          })}
        </div>
      )}
      {isNew && (
        <div style={missingCount ? S.note : S.ok}>
          {missingCount
            ? t({
                en: `Fill every field — ${missingCount} still required. Nothing is added until you press “Add & save”.`,
                ar: `عبّي كل الخانات — باقي ${missingCount} إلزامية. ما بينضاف إشي قبل ما تضغط «إضافة وحفظ».`,
              })
            : t({ en: "All set — press “Add & save”.", ar: "تمام — اضغط «إضافة وحفظ»." })}
        </div>
      )}

      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div style={S.grid}>
          <Field label={<Req isNew={isNew}>{t({ en: "Code (master)", ar: "الكود (ماستر)" })}</Req>}>
            <SkuField
              value={d.sku || ""}
              invalid={dup || (isNew && miss.sku)}
              catalog={catalog}
              t={t}
              onType={(v) => onChange({ sku: v })}
              onPick={(row) => {
                const p = parseCatalog(row);
                onChange({
                  sku: p.code,
                  en: d.en || p.name,
                  uom: p.uom || d.uom,
                  catalogCode: p.code,
                });
              }}
            />
          </Field>
          <Field label={<Req isNew={isNew}>{t({ en: "Arabic name", ar: "الاسم بالعربي" })}</Req>}>
            <TextInput value={d.ar} onChange={(v) => onChange({ ar: v })} style={{ ...S.input, ...rq(miss.ar) }} />
          </Field>
          <Field label={<Req isNew={isNew}>{t({ en: "English name", ar: "الاسم بالإنجليزي" })}</Req>}>
            <TextInput value={d.en} onChange={(v) => onChange({ en: v })} style={{ ...S.input, ...rq(miss.en) }} />
          </Field>
          <RolesField
            t={t} isAr={isAr} isNew={isNew}
            selected={d.roles || []}
            invalid={isNew && miss.roles}
            onToggle={(rid) => {
              const cur = new Set((d.roles || []).filter(Boolean));
              if (cur.has(rid)) cur.delete(rid); else cur.add(rid);
              const list = [...cur];
              onChange({ roles: list, type: list[0] || "" });
            }}
          />
          <Field label={<Req isNew={isNew}>{t({ en: "Unit of measure", ar: "وحدة القياس" })}</Req>}>
            <UomSelect value={d.uom} onChange={(v) => onChange({ uom: v })} isAr={isAr} />
          </Field>
          <Field label={<Req isNew={isNew}>{t({ en: "Category", ar: "الفئة" })}</Req>}>
            <Select
              value={d.categoryId}
              onChange={(v) => onChange({ categoryId: v })}
              options={activeOnly(cfg.categories)}
              isAr={isAr}
              placeholder={t({ en: "— choose —", ar: "— اختر —" })}
              style={rq(miss.categoryId)}
            />
          </Field>
        </div>

        {/* الاسم المعروض — يُبنى تلقائياً: كود + اسم إنجليزي + وحدة */}
        <Field label={t({ en: "Display name (auto)", ar: "الاسم المعروض (تلقائي)" })} style={{ marginTop: 14 }}>
          <div style={{ ...S.input, background: "#f7fbff", fontWeight: 900, color: "#14507f" }}>
            {displayNameOf(d) || t({ en: "— fill code, English name & UoM —", ar: "— عبّي الكود والاسم الإنجليزي والوحدة —" })}
          </div>
          <span style={{ ...S.hint, marginTop: 4 }}>
            {t({
              en: "Links code + English name + UoM — used across BOMs.",
              ar: "بيربط الكود + الاسم الإنجليزي + الوحدة — بيُستعمل بكل الـBOM.",
            })}
          </span>
        </Field>

        <div style={{ ...S.chipRow, marginTop: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800 }}>
            <Switch checked={d.active !== false} onChange={(v) => onChange({ active: v })} />
            {t({ en: "Active", ar: "مفعّل" })}
          </label>
        </div>

        <Field label={t({ en: "Notes", ar: "ملاحظات" })} style={{ marginTop: 14 }}>
          <textarea
            style={{ ...S.input, resize: "vertical" }}
            rows={3}
            value={d.notes || ""}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </Field>
      </fieldset>
    </Modal>
  );
}

/* ══════════════ الفئات ══════════════ */

function CategoriesCard({ t, isAr, cfg, canEdit, busy, onAdd, onEdit, onRemove }) {
  const [open, setOpen] = useState(false);
  const list = cfg.categories || [];
  const countFor = (id) => (cfg.items || []).filter((i) => i.categoryId === id).length;

  return (
    <Card
      icon="🏷️"
      title={t({ en: "Categories", ar: "الفئات" })}
      sub={t({
        en: "Group items — each item links to one category.",
        ar: "تجميع الأصناف — كل صنف بيرتبط بفئة واحدة.",
      })}
      right={
        <>
          <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={() => setOpen((v) => !v)}>
            {open ? t({ en: "Hide", ar: "إخفاء" }) : `${list.length} · ${t({ en: "Show", ar: "عرض" })}`}
          </button>
          {canEdit && (
            <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnPrimary }}
              onClick={() => { onAdd(); setOpen(true); }}>
              ＋ {t({ en: "Add category", ar: "إضافة فئة" })}
            </button>
          )}
        </>
      }
    >
      {open && (
        list.length === 0 ? (
          <EmptyBox>{t({ en: "No categories yet.", ar: "لا توجد فئات بعد." })}</EmptyBox>
        ) : (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>{t({ en: "Arabic name", ar: "الاسم بالعربي" })}</th>
                  <th style={S.th}>{t({ en: "English name", ar: "الاسم بالإنجليزي" })}</th>
                  <th style={S.th}>{t({ en: "Items", ar: "الأصناف" })}</th>
                  <th style={S.th}>{t({ en: "Active", ar: "مفعّل" })}</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id}>
                    <td style={{ ...S.td, ...S.tdStart, fontWeight: 800 }}>{c.ar || "—"}</td>
                    <td style={{ ...S.td, ...S.tdStart, fontWeight: 800 }}>{c.en || "—"}</td>
                    <td style={{ ...S.td, fontWeight: 800 }}>{countFor(c.id) || "—"}</td>
                    <td style={S.td}>
                      {c.active === false
                        ? <Badge color="#a12626" bg="#fff1f1">{t({ en: "off", ar: "معطّلة" })}</Badge>
                        : <Badge color="#047857" bg="#ecfdf5">{t({ en: "on", ar: "مفعّلة" })}</Badge>}
                    </td>
                    <td style={S.td}>
                      {canEdit && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                          <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={() => onEdit(c)}>
                            ✎ {t({ en: "Edit", ar: "تعديل" })}
                          </button>
                          <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnDanger, ...(busy ? S.btnOff : null) }}
                            disabled={busy} onClick={() => onRemove(c)}>
                            🗑
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </Card>
  );
}

function CategoryFormModal({ t, busy, form, onChange, onClose, onSave }) {
  const d = form.data;
  const isNew = form.mode === "new";
  const empty = !String(d.en || "").trim() && !String(d.ar || "").trim();

  return (
    <Modal
      icon="🏷️"
      title={isNew ? t({ en: "New category", ar: "فئة جديدة" }) : t({ en: "Edit category", ar: "تعديل الفئة" })}
      onClose={onClose}
      footer={
        <>
          <button type="button" style={S.btn} onClick={onClose}>
            {t({ en: "Cancel", ar: "إلغاء" })}
          </button>
          <button
            type="button"
            style={{ ...S.btn, ...S.btnPrimary, ...(empty || busy ? S.btnOff : null) }}
            disabled={empty || busy}
            onClick={onSave}
          >
            {busy ? t({ en: "Saving…", ar: "جارٍ الحفظ…" }) : `💾 ${t({ en: "Save", ar: "حفظ" })}`}
          </button>
        </>
      }
    >
      <div style={S.grid}>
        <Field label={t({ en: "Arabic name", ar: "الاسم بالعربي" })}>
          <TextInput value={d.ar} onChange={(v) => onChange({ ar: v })} />
        </Field>
        <Field label={t({ en: "English name", ar: "الاسم بالإنجليزي" })}>
          <TextInput value={d.en} onChange={(v) => onChange({ en: v })} />
        </Field>
      </div>
      <div style={{ ...S.chipRow, marginTop: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800 }}>
          <Switch checked={d.active !== false} onChange={(v) => onChange({ active: v })} />
          {t({ en: "Active", ar: "مفعّلة" })}
        </label>
      </div>
    </Modal>
  );
}

/* ══════════════ استيراد قائمة المنتجات ══════════════ */

function CatalogImportModal({ t, isAr, catalog, existing, busy, onClose, onImport }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(() => new Set());
  const [hideImported, setHideImported] = useState(true);
  const [defType, setDefType] = useState("raw");

  const has = (code) => existing.has(skuKey(code));

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalog.filter((r) => {
      if (hideImported && has(r.item_code)) return false;
      if (!needle) return true;
      return [r.item_code, r.description, r.category]
        .some((v) => String(v || "").toLowerCase().includes(needle));
    });
  }, [catalog, q, existing, hideImported]);

  const selectable = rows.filter((r) => !has(r.item_code));
  const allShownPicked = selectable.length > 0 && selectable.every((r) => picked.has(r.item_code));

  const toggle = (code) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  const toggleAllShown = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (allShownPicked) selectable.forEach((r) => next.delete(r.item_code));
      else selectable.forEach((r) => next.add(r.item_code));
      return next;
    });

  const importPicked = () => onImport(catalog.filter((r) => picked.has(r.item_code)), defType);
  const importAllShown = () => onImport(selectable, defType);

  return (
    <Modal
      wide
      icon="📥"
      title={t({ en: "Import from product list", ar: "استيراد من قائمة المنتجات" })}
      onClose={onClose}
      footer={
        <>
          <button type="button" style={S.btn} onClick={onClose}>
            {t({ en: "Cancel", ar: "إلغاء" })}
          </button>
          <button
            type="button"
            style={{ ...S.btn, ...(selectable.length && !busy ? S.btnBlue : S.btnOff) }}
            disabled={!selectable.length || busy}
            onClick={importAllShown}
          >
            📥 {t({ en: `Import all shown (${selectable.length})`, ar: `استيراد كل الظاهر (${selectable.length})` })}
          </button>
          <button
            type="button"
            style={{ ...S.btn, ...S.btnPrimary, ...(picked.size && !busy ? null : S.btnOff) }}
            disabled={!picked.size || busy}
            onClick={importPicked}
          >
            ✔ {t({ en: `Import selected (${picked.size})`, ar: `استيراد المحدّد (${picked.size})` })}
          </button>
        </>
      }
    >
      <div style={S.note}>
        {t({
          en: "Products come from Product.xlsx. Importing copies them into your item master and saves immediately — codes already imported are skipped.",
          ar: "المنتجات مصدرها ملف Product.xlsx. الاستيراد بينسخهم لسجل أصنافك وبيحفظ فوراً — والأكواد المستوردة بتُتجاهَل.",
        })}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBox value={q} onChange={setQ}
          placeholder={t({ en: "Search code, name or category…", ar: "بحث بالكود أو الاسم أو الفئة…" })} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
          <Switch checked={hideImported} onChange={setHideImported} />
          {t({ en: "Hide imported", ar: "إخفاء المستورد" })}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
          {t({ en: "Import as", ar: "استيراد كدور" })}:
          <select style={{ ...S.input, width: 175 }} value={defType} onChange={(e) => setDefType(e.target.value)}>
            {ITEM_TYPES.map((x) => (
              <option key={x.id} value={x.id}>{nameOf(x, isAr)}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ ...S.hint, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <span>{t({ en: "Showing", ar: "المعروض" })}: <b>{rows.length}</b></span>
        <span>{t({ en: "Selectable", ar: "قابل للاستيراد" })}: <b>{selectable.length}</b></span>
        <span>{t({ en: "Selected", ar: "محدّد" })}: <b>{picked.size}</b></span>
      </div>

      <div style={{ ...S.tableWrap, maxHeight: "52vh" }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: 44 }}>
                <input type="checkbox" checked={allShownPicked} onChange={toggleAllShown} />
              </th>
              <th style={S.th}>{t({ en: "Code", ar: "الكود" })}</th>
              <th style={{ ...S.th, minWidth: 260 }}>{t({ en: "Name", ar: "الاسم" })}</th>
              <th style={S.th}>{t({ en: "UoM", ar: "الوحدة" })}</th>
              <th style={S.th}>{t({ en: "Category", ar: "الفئة" })}</th>
              <th style={S.th}>{t({ en: "Status", ar: "الحالة" })}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td style={S.td} colSpan={6}>{t({ en: "Nothing to show.", ar: "لا شيء للعرض." })}</td></tr>
            )}
            {rows.slice(0, 400).map((r) => {
              const already = has(r.item_code);
              const p = parseCatalog(r);
              return (
                <tr key={r.item_code}
                  style={already ? { opacity: 0.55 } : { cursor: "pointer" }}
                  onClick={() => !already && toggle(r.item_code)}>
                  <td style={S.td}>
                    <input
                      type="checkbox"
                      disabled={already}
                      checked={picked.has(r.item_code)}
                      onChange={() => toggle(r.item_code)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td style={{ ...S.td, fontWeight: 900 }}>{r.item_code}</td>
                  <td style={{ ...S.td, ...S.tdStart }}>{p.name}</td>
                  <td style={S.td}>{p.uom}</td>
                  <td style={S.td}>{p.category || "—"}</td>
                  <td style={S.td}>
                    {already
                      ? <Badge color="#047857" bg="#ecfdf5">{t({ en: "imported", ar: "مستورد" })}</Badge>
                      : <Badge color="#6b8299" bg="#eef4fb">{t({ en: "new", ar: "جديد" })}</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > 400 && (
        <div style={S.hint}>
          {t({
            en: "Showing the first 400 — narrow the search, or use “Import all shown”.",
            ar: "عرض أول ٤٠٠ — ضيّق البحث، أو استعمل «استيراد كل الظاهر».",
          })}
        </div>
      )}
    </Modal>
  );
}

/* حقل الكود مع بحث في قائمة المنتجات */
function SkuField({ value, onPick, onType, catalog, t, invalid }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const s = q.trim().toUpperCase();
    if (!s) return [];
    return catalog
      .filter(
        (i) =>
          String(i.item_code).toUpperCase().includes(s) ||
          String(i.description || "").toUpperCase().includes(s)
      )
      .slice(0, 12);
  }, [catalog, q]);

  return (
    <span style={{ position: "relative", display: "block" }}>
      <input
        style={{
          ...S.input,
          ...(invalid ? { borderColor: "#e59a9a", background: "#fff7f7" } : null),
        }}
        value={value}
        placeholder={t({ en: "code or name…", ar: "كود أو اسم…" })}
        onChange={(e) => { onType(e.target.value); setQ(e.target.value); setOpen(true); }}
        onFocus={() => { setQ(value || ""); setOpen(true); }}
        onBlur={() => window.setTimeout(() => setOpen(false), 180)}
      />
      {open && results.length > 0 && (
        <span style={S.pickList}>
          {results.map((i) => (
            <button
              key={i.item_code}
              type="button"
              style={S.pickOpt}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onPick(i); setOpen(false); }}
            >
              <b>{i.item_code}</b> — {i.description}
              <span style={{ color: "#8aa3b8" }}> · {i.uom || ""}{i.category ? ` · ${i.category}` : ""}</span>
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
