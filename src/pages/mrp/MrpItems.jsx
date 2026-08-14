// src/pages/mrp/MrpItems.jsx
//
// 1️⃣ شاشة إدارة المكونات والمواد الخام.
// Item / component management: SKU, UoM, cost, supplier, reorder level, stock.
//
// كل صنف: كود · اسم · وحدة قياس · تكلفة · مورد افتراضي · حد إعادة الطلب
// · رصيد افتتاحي، مع الرصيد الحالي محسوباً من الحركات وأوامر التصنيع.

import React, { useMemo, useState } from "react";
import {
  MOVE_TYPE, WO_TYPE, ITEM_TYPES, activeOnly, bomForProduct, freshId, itemById,
  money, nameOf, num, onHand, saveConfig, saveRecord, supplierById, todayIso,
  unitCost, useMrpConfig, useRecords, whereUsed,
} from "./mrpApi";
import {
  Badge, Card, EmptyBox, Field, Kpi, Modal, MrpNoAccess, MrpShell, NumInput, S,
  SaveDock, SearchBox, Select, Switch, TextInput, UomSelect, canEditMrp, canOpenMrp,
} from "./mrpUi";
import { useSettingsLang } from "../settings/_shared/settingsI18n";

const PAGE = "mrp.items";

/* قائمة أصناف الشركة (items.json) — لتعبئة الكود والاسم بضغطة */
let catalogCache = null;
function useCatalog() {
  const [items, setItems] = useState(catalogCache || []);
  React.useEffect(() => {
    if (catalogCache) return;
    const pub = process.env.PUBLIC_URL || "";
    fetch(`${pub}/data/items.json`, { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no catalog"))))
      .then((d) => { catalogCache = Array.isArray(d) ? d : []; setItems(catalogCache); })
      .catch(() => { catalogCache = []; });
  }, []);
  return items;
}

/* أوصاف الكتالوج تنتهي عادةً بـ "- KG" / "- BOX" — نفصل الوحدة عن الاسم. */
const UOM_HINTS = {
  KG: "KG", KGS: "KG", G: "G", GM: "G", GRAM: "G",
  PCS: "PCS", PC: "PCS", PIECE: "PCS", NOS: "PCS", NO: "PCS",
  BOX: "BOX", BX: "BOX", CTN: "BOX", CARTON: "BOX", PACK: "BOX", PKT: "BOX",
  L: "L", LTR: "L", LITER: "L", LITRE: "L",
  M: "M", MTR: "M", METER: "M", METRE: "M",
};

/** كود + اسم نظيف + وحدة مُخمّنة من سطر الكتالوج. */
function parseCatalog(row) {
  const raw = String(row?.description || "").trim();
  const code = String(row?.item_code || "").trim();
  let name = raw;
  let uom = "KG";
  const m = raw.match(/^(.*)\s-\s*([A-Za-z]*)\s*$/); // آخر "- وحدة"
  if (m) {
    name = m[1].trim();
    const hint = m[2].trim().toUpperCase();
    if (UOM_HINTS[hint]) uom = UOM_HINTS[hint];
  }
  return { code, name: name || raw || code, uom };
}

export default function MrpItems() {
  const { t, isAr } = useSettingsLang();
  const { cfg, setCfg, loading } = useMrpConfig();
  const { rows: workOrders } = useRecords(WO_TYPE);
  const { rows: moves, setRows: setMoves } = useRecords(MOVE_TYPE);
  const catalog = useCatalog();

  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [editId, setEditId] = useState("");       // صنف مفتوح بالنموذج
  const [moveFor, setMoveFor] = useState(null);   // حركة مخزون لصنف
  const [importing, setImporting] = useState(false); // نافذة استيراد الكتالوج

  const canEdit = canEditMrp();
  const model = draft || cfg;
  const dirty = !!draft;

  const edit = (fn) => {
    setMsg("");
    setDraft((prev) => {
      const next = JSON.parse(JSON.stringify(prev || cfg));
      if (!Array.isArray(next.items)) next.items = [];
      if (!Array.isArray(next.suppliers)) next.suppliers = [];
      fn(next);
      return next;
    });
  };

  const patchItem = (id, p) =>
    edit((n) => {
      const it = n.items.find((x) => x.id === id);
      if (it) Object.assign(it, p);
    });

  const addItem = () => {
    const id = freshId("item");
    edit((n) => {
      n.items.push({
        id, sku: "", ar: "", en: "", uom: "KG", type: "raw",
        cost: "", supplierId: "", reorderLevel: "", openingQty: "",
        category: "", notes: "", active: true,
      });
    });
    setEditId(id);
  };

  const removeItem = (id) => {
    const used = whereUsed(model, id);
    const label = itemById(model, id);
    if (!window.confirm(
      `${t({
        en: `Delete "${nameOf(label, isAr) || id}"?`,
        ar: `حذف «${nameOf(label, isAr) || id}»؟`,
      })}${used.length ? `\n${t({ en: "Used in", ar: "مستعمل في" })}: ${used.length} BOM` : ""}`
    )) return;
    edit((n) => { n.items = n.items.filter((x) => x.id !== id); });
    setEditId("");
  };

  const addSupplier = () => {
    const id = freshId("sup");
    edit((n) => { n.suppliers.push({ id, ar: "", en: "", contact: "", phone: "", active: true }); });
    return id;
  };

  /** استيراد أصناف من كتالوج الشركة كنسخة قابلة للتعديل — بلا تكرار الكود. */
  const importCatalog = (catalogRows, defType = "raw") => {
    let added = 0;
    edit((n) => {
      const have = new Set(
        (n.items || []).map((i) => String(i.sku || "").trim()).filter(Boolean)
      );
      catalogRows.forEach((row) => {
        const { code, name, uom } = parseCatalog(row);
        if (!code || have.has(code)) return;
        have.add(code);
        added += 1;
        n.items.push({
          id: freshId("item"),
          sku: code, ar: "", en: name, uom, type: defType,
          cost: "", supplierId: "", reorderLevel: "", openingQty: "",
          category: "", notes: "", active: true,
          catalogCode: code, source: "catalog", // الربط الذكي بالكتالوج
        });
      });
    });
    setMsg(
      added
        ? t({ en: `Imported ${added} item(s) — press Save.`, ar: `تم استيراد ${added} صنف — اضغط حفظ.` })
        : t({ en: "Everything is already imported.", ar: "كل شي مستورد أصلاً." })
    );
    setImporting(false);
  };

  /** إعادة مزامنة أسماء الأصناف المرتبطة من الكتالوج (بلا دهس تعديل يدوي على العربي). */
  const resyncNames = () => {
    const byCode = new Map(catalog.map((r) => [String(r.item_code), r]));
    let n = 0;
    edit((next) => {
      (next.items || []).forEach((it) => {
        const row = byCode.get(String(it.catalogCode || it.sku || ""));
        if (!row) return;
        const { name, uom } = parseCatalog(row);
        if (name && name !== it.en) { it.en = name; n += 1; }
        if (!it.uom) it.uom = uom;
      });
    });
    setMsg(t({ en: `Refreshed ${n} name(s) from the catalog.`, ar: `تم تحديث ${n} اسم من الكتالوج.` }));
  };

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const saved = await saveConfig(draft);
      setCfg(saved);
      setDraft(null);
      setMsg(t({ en: "Saved.", ar: "تم الحفظ." }));
    } catch (e) {
      setMsg(`${t({ en: "Save failed", ar: "فشل الحفظ" })}: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  /* حركة مخزون يدوية — سجل مستقل على السيرفر */
  const postMove = async (itemId, qty, reason, note) => {
    const rec = {
      // reportDate = مفتاح فريد (فهرس السيرفر الفريد)، والتاريخ الحقيقي بـ date
      reportDate: freshId("mv"),
      date: todayIso(),
      itemId, qty: num(qty), reason, note,
      at: new Date().toISOString(),
    };
    const saved = await saveRecord(MOVE_TYPE, rec);
    setMoves((prev) => [...prev, saved]);
  };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (model.items || [])
      .map((it) => {
        const qty = onHand(model, it.id, workOrders, moves);
        const reorder = num(it.reorderLevel);
        return {
          it,
          qty,
          low: reorder > 0 && qty <= reorder,
          value: qty * unitCost(model, it.id),
          usedIn: whereUsed(model, it.id).length,
          hasBom: !!bomForProduct(model, it.id),
        };
      })
      .filter((r) => {
        if (typeFilter && (r.it.type || "raw") !== typeFilter) return false;
        if (lowOnly && !r.low) return false;
        if (!needle) return true;
        return [r.it.sku, r.it.ar, r.it.en, r.it.category]
          .some((v) => String(v || "").toLowerCase().includes(needle));
      });
  }, [model, q, typeFilter, lowOnly, workOrders, moves]);

  const totals = useMemo(() => {
    const haveCodes = new Set(
      (model.items || []).map((i) => String(i.sku || "").trim()).filter(Boolean)
    );
    const notImported = catalog.filter((r) => !haveCodes.has(String(r.item_code))).length;
    return {
      count: (model.items || []).length,
      low: rows.filter((r) => r.low).length,
      value: rows.reduce((s, r) => s + r.value, 0),
      catalog: catalog.length,
      notImported,
    };
  }, [model.items, rows, catalog]);

  if (!canOpenMrp(PAGE)) return <MrpNoAccess page={PAGE} />;

  const current = editId ? (model.items || []).find((x) => x.id === editId) : null;

  return (
    <MrpShell
      pageId={PAGE}
      icon="📦"
      title={t({ en: "Items & materials", ar: "الأصناف والمواد" })}
      sub={t({
        en: "Every component that goes into manufacturing",
        ar: "كل مادة أو مكوّن بيدخل بالتصنيع",
      })}
      actions={
        canEdit && (
          <>
            <button type="button" style={{ ...S.btn, ...S.btnBlue }} onClick={() => setImporting(true)}>
              📥 {t({ en: "Import from product list", ar: "استيراد من قائمة المنتجات" })}
            </button>
            <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={addItem}>
              ＋ {t({ en: "New item", ar: "صنف جديد" })}
            </button>
          </>
        )
      }
    >
      {msg && <div style={msg.includes("✔") || msg.includes("Saved") || msg.includes("تم") ? S.ok : S.note}>{msg}</div>}

      <div style={S.kpiRow}>
        <Kpi label={t({ en: "Items", ar: "الأصناف" })} value={totals.count} />
        <Kpi
          label={t({ en: "In product list", ar: "بقائمة المنتجات" })}
          value={totals.catalog}
          foot={
            totals.notImported
              ? t({ en: `${totals.notImported} not imported`, ar: `${totals.notImported} غير مستورد` })
              : t({ en: "all imported", ar: "الكل مستورد" })
          }
          color={totals.notImported ? "#b45309" : "#047857"}
        />
        <Kpi
          label={t({ en: "Below reorder level", ar: "تحت حد الطلب" })}
          value={totals.low}
          color={totals.low ? "#a12626" : "#047857"}
        />
        <Kpi
          label={t({ en: "Stock value", ar: "قيمة المخزون" })}
          value={money(totals.value, 0)}
          foot="AED"
        />
      </div>

      <Card
        icon="📦"
        title={t({ en: "Item master", ar: "سجل الأصناف" })}
        sub={t({
          en: "Cost and unit of measure feed every BOM automatically.",
          ar: "التكلفة ووحدة القياس بتغذّي كل قوائم المواد تلقائياً.",
        })}
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder={t({ en: "Search SKU or name…", ar: "بحث بالكود أو الاسم…" })}
            />
            <select
              style={{ ...S.input, width: 170 }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">{t({ en: "All types", ar: "كل الأنواع" })}</option>
              {ITEM_TYPES.map((x) => (
                <option key={x.id} value={x.id}>{nameOf(x, isAr)}</option>
              ))}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
              <Switch checked={lowOnly} onChange={setLowOnly} />
              {t({ en: "Low stock only", ar: "الناقص فقط" })}
            </label>
            {canEdit && (model.items || []).some((i) => i.catalogCode) && (
              <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={resyncNames}
                title={t({ en: "Refresh linked names from the product list", ar: "تحديث أسماء المرتبطين من قائمة المنتجات" })}>
                🔄 {t({ en: "Sync names", ar: "تحديث الأسماء" })}
              </button>
            )}
          </div>
        }
      >
        {loading && !rows.length ? (
          <EmptyBox>{t({ en: "Loading…", ar: "جارٍ التحميل…" })}</EmptyBox>
        ) : rows.length === 0 ? (
          <EmptyBox>
            {(model.items || []).length === 0 ? (
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
                  <th style={S.th}>{t({ en: "SKU", ar: "الكود" })}</th>
                  <th style={S.th}>{t({ en: "Item", ar: "الصنف" })}</th>
                  <th style={S.th}>{t({ en: "Type", ar: "النوع" })}</th>
                  <th style={S.th}>{t({ en: "UoM", ar: "الوحدة" })}</th>
                  <th style={S.th}>{t({ en: "Unit cost", ar: "تكلفة الوحدة" })}</th>
                  <th style={S.th}>{t({ en: "On hand", ar: "الرصيد" })}</th>
                  <th style={S.th}>{t({ en: "Reorder", ar: "حد الطلب" })}</th>
                  <th style={S.th}>{t({ en: "Supplier", ar: "المورّد" })}</th>
                  <th style={S.th}>{t({ en: "Used in", ar: "مستعمل في" })}</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ it, qty, low, usedIn, hasBom }) => (
                  <tr key={it.id}>
                    <td style={{ ...S.td, fontWeight: 900 }}>{it.sku || "—"}</td>
                    <td style={{ ...S.td, ...S.tdStart }}>
                      <div style={{ fontWeight: 800, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        {nameOf(it, isAr) || it.id}
                        {it.catalogCode && (
                          <Badge color="#1f6fd0" bg="#eef4fb">🔗 {t({ en: "linked", ar: "مرتبط" })}</Badge>
                        )}
                        {it.active === false && <span style={{ color: "#a12626" }}> ⛔</span>}
                      </div>
                      {it.category && <div style={S.hint}>{it.category}</div>}
                    </td>
                    <td style={S.td}>
                      {nameOf(ITEM_TYPES.find((x) => x.id === (it.type || "raw")) || {}, isAr)}
                      {hasBom && (
                        <div>
                          <Badge color="#0f766e" bg="#e7f5f3">BOM</Badge>
                        </div>
                      )}
                    </td>
                    <td style={S.td}>{it.uom || "—"}</td>
                    <td style={{ ...S.td, fontWeight: 800 }}>{money(unitCost(model, it.id))}</td>
                    <td style={{
                      ...S.td, fontWeight: 900,
                      color: low ? "#a12626" : qty > 0 ? "#047857" : "#6b8299",
                    }}>
                      {money(qty, 2)}
                    </td>
                    <td style={S.td}>{it.reorderLevel === "" || it.reorderLevel == null ? "—" : money(it.reorderLevel, 2)}</td>
                    <td style={S.td}>{nameOf(supplierById(model, it.supplierId) || {}, isAr) || "—"}</td>
                    <td style={S.td}>{usedIn || "—"}</td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          style={{ ...S.btn, ...S.btnSm }}
                          onClick={() => setEditId(it.id)}
                        >
                          {canEdit ? t({ en: "Open", ar: "فتح" }) : t({ en: "View", ar: "عرض" })}
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            style={{ ...S.btn, ...S.btnSm }}
                            onClick={() => setMoveFor(it)}
                          >
                            ± {t({ en: "Stock", ar: "مخزون" })}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={S.note}>
          {t({
            en: "On hand = opening quantity + manual moves + finished work orders (production in, components out).",
            ar: "الرصيد = الرصيد الافتتاحي + الحركات اليدوية + أوامر التصنيع المنتهية (إنتاج داخل، مكوّنات خارج).",
          })}
        </div>
      </Card>

      {/* ── سجل الموردين ── */}
      <SuppliersCard
        t={t} isAr={isAr} model={model} canEdit={canEdit}
        onAdd={addSupplier}
        onPatch={(id, p) => edit((n) => {
          const s = n.suppliers.find((x) => x.id === id);
          if (s) Object.assign(s, p);
        })}
        onRemove={(id) => edit((n) => { n.suppliers = n.suppliers.filter((x) => x.id !== id); })}
      />

      {/* ── نموذج الصنف ── */}
      {current && (
        <Modal
          icon="📦"
          title={`${current.sku ? `[${current.sku}] ` : ""}${nameOf(current, isAr) || t({ en: "New item", ar: "صنف جديد" })}`}
          onClose={() => setEditId("")}
          footer={
            <>
              {canEdit && (
                <button type="button" style={{ ...S.btn, ...S.btnDanger }}
                  onClick={() => removeItem(current.id)}>
                  🗑 {t({ en: "Delete", ar: "حذف" })}
                </button>
              )}
              <button type="button" style={S.btn} onClick={() => setEditId("")}>
                {t({ en: "Close", ar: "إغلاق" })}
              </button>
            </>
          }
        >
          <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div style={S.grid}>
              <Field label={t({ en: "SKU / code", ar: "الكود" })}>
                <SkuField
                  value={current.sku || ""}
                  catalog={catalog}
                  t={t}
                  onType={(v) => patchItem(current.id, { sku: v })}
                  onPick={(row) => patchItem(current.id, {
                    sku: String(row.item_code),
                    en: current.en || row.description || "",
                    ar: current.ar || row.description || "",
                  })}
                />
              </Field>
              <Field label={t({ en: "Arabic name", ar: "الاسم بالعربي" })}>
                <TextInput value={current.ar} onChange={(v) => patchItem(current.id, { ar: v })} />
              </Field>
              <Field label={t({ en: "English name", ar: "الاسم بالإنجليزي" })}>
                <TextInput value={current.en} onChange={(v) => patchItem(current.id, { en: v })} />
              </Field>
              <Field label={t({ en: "Type", ar: "النوع" })}>
                <Select
                  value={current.type || "raw"}
                  onChange={(v) => patchItem(current.id, { type: v })}
                  options={ITEM_TYPES}
                  isAr={isAr}
                />
              </Field>
              <Field label={t({ en: "Unit of measure", ar: "وحدة القياس" })}>
                <UomSelect value={current.uom} onChange={(v) => patchItem(current.id, { uom: v })} isAr={isAr} />
              </Field>
              <Field label={t({ en: "Standard cost (AED)", ar: "التكلفة المعيارية (درهم)" })}>
                <NumInput value={current.cost} onChange={(v) => patchItem(current.id, { cost: v })} />
              </Field>
              <Field label={t({ en: "Default supplier", ar: "المورّد الافتراضي" })}>
                <Select
                  value={current.supplierId}
                  onChange={(v) => patchItem(current.id, { supplierId: v })}
                  options={activeOnly(model.suppliers)}
                  isAr={isAr}
                  placeholder={t({ en: "None", ar: "بلا" })}
                />
              </Field>
              <Field label={t({ en: "Reorder level", ar: "حد إعادة الطلب" })}>
                <NumInput
                  value={current.reorderLevel}
                  onChange={(v) => patchItem(current.id, { reorderLevel: v })}
                />
              </Field>
              <Field label={t({ en: "Opening quantity", ar: "الرصيد الافتتاحي" })}>
                <NumInput
                  value={current.openingQty}
                  onChange={(v) => patchItem(current.id, { openingQty: v })}
                />
              </Field>
              <Field label={t({ en: "Category", ar: "الفئة" })}>
                <TextInput value={current.category} onChange={(v) => patchItem(current.id, { category: v })} />
              </Field>
            </div>

            <div style={{ ...S.chipRow, marginTop: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800 }}>
                <Switch
                  checked={current.active !== false}
                  onChange={(v) => patchItem(current.id, { active: v })}
                />
                {t({ en: "Active", ar: "مفعّل" })}
              </label>
              {bomForProduct(model, current.id) && (
                <label style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800 }}>
                  <Switch
                    checked={current.costFromBom !== false}
                    onChange={(v) => patchItem(current.id, { costFromBom: v })}
                  />
                  {t({ en: "Cost from its BOM", ar: "التكلفة من قائمة موادّه" })}
                </label>
              )}
            </div>

            <Field label={t({ en: "Notes", ar: "ملاحظات" })} style={{ marginTop: 14 }}>
              <textarea
                style={{ ...S.input, resize: "vertical" }}
                rows={3}
                value={current.notes || ""}
                onChange={(e) => patchItem(current.id, { notes: e.target.value })}
              />
            </Field>
          </fieldset>

          <div style={S.note}>
            {t({ en: "Current stock", ar: "الرصيد الحالي" })}:{" "}
            <b>{money(onHand(model, current.id, workOrders, moves), 2)} {current.uom}</b>
            {" · "}
            {t({ en: "Unit cost", ar: "تكلفة الوحدة" })}: <b>{money(unitCost(model, current.id))} AED</b>
          </div>
        </Modal>
      )}

      {/* ── حركة مخزون ── */}
      {moveFor && (
        <StockMoveModal
          t={t} isAr={isAr} item={moveFor} cfg={model}
          onClose={() => setMoveFor(null)}
          onSubmit={async (qty, reason, note) => {
            await postMove(moveFor.id, qty, reason, note);
            setMoveFor(null);
          }}
          current={onHand(model, moveFor.id, workOrders, moves)}
        />
      )}

      {/* ── استيراد من قائمة المنتجات ── */}
      {importing && (
        <CatalogImportModal
          t={t} isAr={isAr} catalog={catalog}
          existing={new Set((model.items || []).map((i) => String(i.sku || "").trim()).filter(Boolean))}
          onClose={() => setImporting(false)}
          onImport={importCatalog}
        />
      )}

      <SaveDock
        dirty={dirty}
        saving={saving}
        onSave={save}
        onDiscard={() => { setDraft(null); setMsg(""); }}
        t={t}
      />
    </MrpShell>
  );
}

/* ══════════════ الموردون ══════════════ */

function SuppliersCard({ t, isAr, model, canEdit, onAdd, onPatch, onRemove }) {
  const [open, setOpen] = useState(false);
  const list = model.suppliers || [];

  return (
    <Card
      icon="🚚"
      title={t({ en: "Suppliers", ar: "الموردون" })}
      sub={t({
        en: "Default source for each purchased material.",
        ar: "المصدر الافتراضي لكل مادة مشتراة.",
      })}
      right={
        <>
          <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={() => setOpen((v) => !v)}>
            {open ? t({ en: "Hide", ar: "إخفاء" }) : `${list.length} · ${t({ en: "Show", ar: "عرض" })}`}
          </button>
          {canEdit && (
            <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnPrimary }}
              onClick={() => { onAdd(); setOpen(true); }}>
              ＋ {t({ en: "Add", ar: "إضافة" })}
            </button>
          )}
        </>
      }
    >
      {open && (
        list.length === 0 ? (
          <EmptyBox>{t({ en: "No suppliers yet.", ar: "لا يوجد موردون بعد." })}</EmptyBox>
        ) : (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>{t({ en: "Arabic name", ar: "الاسم بالعربي" })}</th>
                  <th style={S.th}>{t({ en: "English name", ar: "الاسم بالإنجليزي" })}</th>
                  <th style={S.th}>{t({ en: "Contact", ar: "المسؤول" })}</th>
                  <th style={S.th}>{t({ en: "Phone", ar: "الهاتف" })}</th>
                  <th style={S.th}>{t({ en: "Active", ar: "مفعّل" })}</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id}>
                    <td style={S.td}>
                      <input style={S.input} value={s.ar || ""} disabled={!canEdit}
                        onChange={(e) => onPatch(s.id, { ar: e.target.value })} />
                    </td>
                    <td style={S.td}>
                      <input style={S.input} value={s.en || ""} disabled={!canEdit}
                        onChange={(e) => onPatch(s.id, { en: e.target.value })} />
                    </td>
                    <td style={S.td}>
                      <input style={S.input} value={s.contact || ""} disabled={!canEdit}
                        onChange={(e) => onPatch(s.id, { contact: e.target.value })} />
                    </td>
                    <td style={S.td}>
                      <input style={S.input} value={s.phone || ""} disabled={!canEdit}
                        onChange={(e) => onPatch(s.id, { phone: e.target.value })} />
                    </td>
                    <td style={S.td}>
                      <Switch
                        checked={s.active !== false}
                        disabled={!canEdit}
                        onChange={(v) => onPatch(s.id, { active: v })}
                      />
                    </td>
                    <td style={S.td}>
                      {canEdit && (
                        <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnDanger }}
                          onClick={() => onRemove(s.id)}>
                          {t({ en: "Delete", ar: "حذف" })}
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

/* ══════════════ حركة مخزون ══════════════ */

function StockMoveModal({ t, isAr, item, onClose, onSubmit, current }) {
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("receipt");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const signed = reason === "receipt" ? Math.abs(num(qty)) : -Math.abs(num(qty));

  const submit = async () => {
    if (!num(qty)) { setErr(t({ en: "Enter a quantity.", ar: "أدخل كمية." })); return; }
    setBusy(true);
    setErr("");
    try {
      await onSubmit(signed, reason, note);
    } catch (e) {
      setErr(e?.message || "failed");
      setBusy(false);
    }
  };

  return (
    <Modal
      icon="±"
      title={`${t({ en: "Stock move", ar: "حركة مخزون" })} — ${nameOf(item, isAr) || item.sku}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" style={S.btn} onClick={onClose}>
            {t({ en: "Cancel", ar: "إلغاء" })}
          </button>
          <button
            type="button"
            style={{ ...S.btn, ...S.btnPrimary, ...(busy ? S.btnOff : null) }}
            onClick={submit}
            disabled={busy}
          >
            {busy ? t({ en: "Saving…", ar: "جارٍ الحفظ…" }) : t({ en: "Post move", ar: "تسجيل الحركة" })}
          </button>
        </>
      }
    >
      {err && <div style={S.err}>{err}</div>}
      <div style={S.grid}>
        <Field label={t({ en: "Move type", ar: "نوع الحركة" })}>
          <select style={S.input} value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="receipt">{t({ en: "Receipt (+)", ar: "استلام (+)" })}</option>
            <option value="issue">{t({ en: "Issue (−)", ar: "صرف (−)" })}</option>
            <option value="adjust">{t({ en: "Adjustment (−)", ar: "تسوية (−)" })}</option>
          </select>
        </Field>
        <Field label={`${t({ en: "Quantity", ar: "الكمية" })} (${item.uom || ""})`}>
          <NumInput value={qty} onChange={setQty} />
        </Field>
        <Field label={t({ en: "Note", ar: "ملاحظة" })}>
          <TextInput value={note} onChange={setNote} />
        </Field>
      </div>
      <div style={S.note}>
        {t({ en: "Current", ar: "الرصيد الحالي" })}: <b>{money(current, 2)}</b>
        {" → "}
        {t({ en: "after this move", ar: "بعد الحركة" })}: <b>{money(current + signed, 2)}</b>
      </div>
    </Modal>
  );
}

/* ══════════════ استيراد الكتالوج ══════════════ */

function CatalogImportModal({ t, isAr, catalog, existing, onClose, onImport }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(() => new Set());
  const [hideImported, setHideImported] = useState(true);
  const [defType, setDefType] = useState("raw");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalog.filter((r) => {
      const already = existing.has(String(r.item_code));
      if (hideImported && already) return false;
      if (!needle) return true;
      return [r.item_code, r.description]
        .some((v) => String(v || "").toLowerCase().includes(needle));
    });
  }, [catalog, q, existing, hideImported]);

  const selectable = rows.filter((r) => !existing.has(String(r.item_code)));
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

  const importPicked = () =>
    onImport(catalog.filter((r) => picked.has(r.item_code)), defType);
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
            style={{ ...S.btn, ...(selectable.length ? S.btnBlue : S.btnOff) }}
            disabled={!selectable.length}
            onClick={importAllShown}
          >
            📥 {t({ en: `Import all shown (${selectable.length})`, ar: `استيراد كل الظاهر (${selectable.length})` })}
          </button>
          <button
            type="button"
            style={{ ...S.btn, ...S.btnPrimary, ...(picked.size ? null : S.btnOff) }}
            disabled={!picked.size}
            onClick={importPicked}
          >
            ✔ {t({ en: `Import selected (${picked.size})`, ar: `استيراد المحدّد (${picked.size})` })}
          </button>
        </>
      }
    >
      <div style={S.note}>
        {t({
          en: "This copies products into your editable item master (saved on the server). Codes already imported are skipped, so you can run it again after the product list grows.",
          ar: "هذا بينسخ المنتجات لسجل أصنافك القابل للتعديل (محفوظ على السيرفر). الأكواد المستوردة بتُتجاهَل، فتقدر تعيدها كل ما تكبر القائمة.",
        })}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBox value={q} onChange={setQ}
          placeholder={t({ en: "Search code or name…", ar: "بحث بالكود أو الاسم…" })} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
          <Switch checked={hideImported} onChange={setHideImported} />
          {t({ en: "Hide imported", ar: "إخفاء المستورد" })}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
          {t({ en: "Import as", ar: "استيراد كنوع" })}:
          <select style={{ ...S.input, width: 160 }} value={defType} onChange={(e) => setDefType(e.target.value)}>
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
              <th style={S.th}>{t({ en: "Status", ar: "الحالة" })}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td style={S.td} colSpan={5}>{t({ en: "Nothing to show.", ar: "لا شيء للعرض." })}</td></tr>
            )}
            {rows.slice(0, 400).map((r) => {
              const already = existing.has(String(r.item_code));
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

/* حقل الكود مع بحث في قائمة أصناف الشركة */
function SkuField({ value, onPick, onType, catalog, t }) {
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
        style={S.input}
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
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
