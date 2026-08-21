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
  Badge, Card, CatalogCodeInput, EmptyBox, Field, Kpi, Modal, MrpNoAccess, MrpShell, S,
  SearchBox, Select, Switch, TextInput, Toast, UomSelect, canEditMrp, canOpenMrp,
} from "./mrpUi";
import { useSettingsLang } from "../settings/_shared/settingsI18n";

const PAGE = "mrp.items";

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

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);        // { text, bad }
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");     // "" | "active" | "off"
  const [sort, setSort] = useState({ key: "sku", dir: "asc" });
  const [itemForm, setItemForm] = useState(null);  // { mode: "new"|"edit", data }
  const [catForm, setCatForm] = useState(null);    // { mode: "new"|"edit", data }

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

  /* ما في حذف للأصناف (لا فردي ولا شامل) — الكود مفتاح ماستر وقوائم المواد
     وسجلات التقطيع بتشير عليه. البديل: تعطيل الصنف من نموذج الصنف، فيختفي من
     قوائم الاختيار وبيضل التاريخ مقروء. */

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

  /** تفعيل/تعطيل فئة بدل حذفها — الأصناف المربوطة فيها ما بتنفكّ. */
  const toggleCat = (c, v) =>
    commit((n) => {
      const x = (n.categories || []).find((y) => y.id === c.id);
      if (x) x.active = v;
    }, v
      ? t({ en: "Category activated.", ar: "تم تفعيل الفئة." })
      : t({ en: "Category deactivated.", ar: "تم تعطيل الفئة." }));

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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (cfg.items || [])
      .map((it) => ({
        it,
        cat: categoryLabel(cfg, it, isAr),
        display: displayNameOf(it),
        usedIn: usageCount(cfg, it.id),
        hasBom: !!disassemblyForInput(cfg, it.id),
        dup: validation.dup.has(it.id),
        noCode: validation.blank.has(it.id),
      }))
      .filter((r) => {
        if (typeFilter && !hasRole(r.it, typeFilter)) return false;
        if (catFilter && (r.it.categoryId || "") !== catFilter) return false;
        if (statusFilter === "active" && r.it.active === false) return false;
        if (statusFilter === "off" && r.it.active !== false) return false;
        if (!needle) return true;
        return [r.it.sku, r.it.ar, r.it.en, r.cat, r.display]
          .some((v) => String(v || "").toLowerCase().includes(needle));
      });
  }, [cfg, q, typeFilter, catFilter, statusFilter, isAr, validation]);

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

  const anyFilter = q || typeFilter || catFilter || statusFilter;
  const resetView = () => {
    setQ(""); setTypeFilter(""); setCatFilter(""); setStatusFilter("");
    setSort({ key: "sku", dir: "asc" });
  };

  const totals = useMemo(() => {
    const items = cfg.items || [];
    const off = items.filter((i) => i.active === false).length;
    return {
      count: items.length,
      off,
      active: items.length - off,
      categories: (cfg.categories || []).length,
      issues: validation.dup.size + validation.blank.size,
    };
  }, [cfg.items, cfg.categories, validation]);

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
          <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={openNewItem}>
            ＋ {t({ en: "New item", ar: "صنف جديد" })}
          </button>
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
            {anyFilter && (
              <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={resetView}
                title={t({ en: "Clear filters & sort", ar: "مسح الفلاتر والفرز" })}>
                ✕ {t({ en: "Reset", ar: "مسح" })}
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
                    en: "No items yet. Add each product by hand — code, names, role, unit and category.",
                    ar: "ما في أصناف بعد. ضيف كل منتج بإيدك — الكود والأسماء والدور والوحدة والفئة.",
                  })}
                </div>
                {canEdit && (
                  <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={openNewItem}>
                    ＋ {t({ en: "New item", ar: "صنف جديد" })}
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
        onAdd={openNewCat} onEdit={openCat} onToggle={toggleCat}
      />

      {/* ── نموذج الصنف (ما بينضاف قبل الحفظ) ── */}
      {itemForm && (
        <ItemFormModal
          t={t} isAr={isAr} cfg={cfg} canEdit={canEdit} busy={busy}
          form={itemForm}
          allItems={cfg.items || []}
          onChange={(p) => setItemForm((f) => ({ ...f, data: { ...f.data, ...p } }))}
          onClose={() => setItemForm(null)}
          onSave={saveItemForm}
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
  t, isAr, cfg, canEdit, busy, form, allItems, onChange, onClose, onSave,
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
          {/* بدل الحذف: مفتاح التفعيل/التعطيل داخل النموذج (تحت «الاسم المعروض») */}
          {!isNew && canEdit && (
            <span style={{ ...S.hint, marginInlineEnd: "auto" }}>
              {d.active === false
                ? `⛔ ${t({ en: "Inactive — hidden from pickers", ar: "معطّل — مخفي من قوائم الاختيار" })}`
                : `✓ ${t({ en: "Active", ar: "مفعّل" })}`}
            </span>
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
            {/* الكود بيتسحب من كتالوج المنتجات — واختيار كود بيعبّي الاسم الإنجليزي تلقائياً */}
            <CatalogCodeInput
              value={d.sku || ""}
              disabled={!canEdit}
              onChange={(v, match) => {
                const patch = { sku: v };
                // تعبئة تلقائية بس إذا خانة الاسم الإنجليزي فاضية — ما بندهس كتابة المستخدم
                if (match && !String(d.en || "").trim()) patch.en = match.description;
                onChange(patch);
              }}
              onPick={(it) => onChange({ sku: it.item_code, en: it.description })}
              placeholder={t({
                en: "Search the catalog — code or product name",
                ar: "دوّر بالكتالوج — كود أو اسم منتج",
              })}
              style={dup || (isNew && miss.sku) ? { borderColor: "#e59a9a", background: "#fff7f7" } : null}
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

function CategoriesCard({ t, isAr, cfg, canEdit, busy, onAdd, onEdit, onToggle }) {
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
                    {/* تفعيل/تعطيل بدل الحذف — الأصناف المربوطة بالفئة ما بتنفكّ */}
                    <td style={S.td}>
                      {canEdit ? (
                        <Switch
                          checked={c.active !== false}
                          disabled={busy}
                          onChange={(v) => onToggle(c, v)}
                        />
                      ) : c.active === false
                        ? <Badge color="#a12626" bg="#fff1f1">{t({ en: "off", ar: "معطّلة" })}</Badge>
                        : <Badge color="#047857" bg="#ecfdf5">{t({ en: "on", ar: "مفعّلة" })}</Badge>}
                    </td>
                    <td style={S.td}>
                      {canEdit && (
                        <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={() => onEdit(c)}>
                          ✎ {t({ en: "Edit", ar: "تعديل" })}
                        </button>
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

