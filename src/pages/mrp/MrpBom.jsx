// src/pages/mrp/MrpBom.jsx
//
// 2️⃣ شاشة بناء وتعديل قائمة المواد (BOM Builder).
// Parent product + component lines (qty · scrap %) + operations + live cost + versions.

import React, { useMemo, useState } from "react";
import {
  CONSUMPTION_POLICIES, activeOnly, bomCost, freshId, isBomEffective, itemById,
  money, nameOf, num, opById, saveConfig, unitCost, useMrpConfig, userName,
} from "./mrpApi";
import {
  Badge, Card, EmptyBox, Field, ItemPicker, Kpi, Modal, MrpNoAccess, MrpShell,
  NumInput, S, SaveDock, SearchBox, Select, Switch, TextInput, UomSelect,
  canEditMrp, canOpenMrp,
} from "./mrpUi";
import { useSettingsLang } from "../settings/_shared/settingsI18n";

const PAGE = "mrp.bom";

/** رقم قائمة مواد جديد — BOM-0001 */
function nextRef(boms) {
  const max = (boms || []).reduce((m, b) => {
    const n = parseInt(String(b.ref || "").replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `BOM-${String(max + 1).padStart(4, "0")}`;
}

export default function MrpBom() {
  const { t, isAr } = useSettingsLang();
  const { cfg, setCfg, loading } = useMrpConfig();

  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState("");
  const [historyFor, setHistoryFor] = useState("");

  const canEdit = canEditMrp();
  const model = draft || cfg;
  const dirty = !!draft;

  const edit = (fn) => {
    setMsg("");
    setDraft((prev) => {
      const next = JSON.parse(JSON.stringify(prev || cfg));
      if (!Array.isArray(next.boms)) next.boms = [];
      if (!Array.isArray(next.operations)) next.operations = [];
      fn(next);
      return next;
    });
  };

  const patchBom = (id, p) =>
    edit((n) => {
      const b = n.boms.find((x) => x.id === id);
      if (b) Object.assign(b, p);
    });

  const addBom = () => {
    const id = freshId("bom");
    edit((n) => {
      n.boms.push({
        id, ref: nextRef(n.boms), productId: "", qty: 1, uom: "KG",
        version: 1, active: true, overheadPct: "", notes: "",
        bomType: "manufacture",             // manufacture | kit
        consumptionPolicy: "warn",          // flexible | warn | strict
        effectiveFrom: "", effectiveTo: "",
        lines: [], byproducts: [], ops: [], history: [],
        createdAt: new Date().toISOString(), createdBy: userName(),
      });
    });
    setOpenId(id);
  };

  const duplicateBom = (id) => {
    const src = (model.boms || []).find((x) => x.id === id);
    if (!src) return;
    const copy = {
      ...JSON.parse(JSON.stringify(src)),
      id: freshId("bom"),
      ref: nextRef(model.boms),
      version: 1,
      history: [],
      active: false,
      createdAt: new Date().toISOString(),
      createdBy: userName(),
    };
    edit((n) => { n.boms.push(copy); });
    setOpenId(copy.id);
  };

  const removeBom = (id) => {
    const b = (model.boms || []).find((x) => x.id === id);
    if (!window.confirm(t({
      en: `Delete ${b?.ref || "this BOM"}? Work orders already created keep their own snapshot.`,
      ar: `حذف ${b?.ref || "هذه القائمة"}؟ أوامر التصنيع المفتوحة سابقاً بتحتفظ بنسختها.`,
    }))) return;
    edit((n) => { n.boms = n.boms.filter((x) => x.id !== id); });
    setOpenId("");
  };

  /* ── الأسطر ── */
  const addLine = (bomId) =>
    edit((n) => {
      const b = n.boms.find((x) => x.id === bomId);
      if (b) b.lines = [...(b.lines || []), { id: freshId("ln"), itemId: "", qty: "", scrapPct: "" }];
    });
  const patchLine = (bomId, lineId, p) =>
    edit((n) => {
      const b = n.boms.find((x) => x.id === bomId);
      const l = (b?.lines || []).find((x) => x.id === lineId);
      if (l) Object.assign(l, p);
    });
  const removeLine = (bomId, lineId) =>
    edit((n) => {
      const b = n.boms.find((x) => x.id === bomId);
      if (b) b.lines = (b.lines || []).filter((x) => x.id !== lineId);
    });

  /* ── المنتجات الثانوية ── */
  const addByproduct = (bomId) =>
    edit((n) => {
      const b = n.boms.find((x) => x.id === bomId);
      if (b) b.byproducts = [...(b.byproducts || []), { id: freshId("bp"), itemId: "", qty: "" }];
    });
  const patchByproduct = (bomId, bpId, p) =>
    edit((n) => {
      const b = n.boms.find((x) => x.id === bomId);
      const bp = (b?.byproducts || []).find((x) => x.id === bpId);
      if (bp) Object.assign(bp, p);
    });
  const removeByproduct = (bomId, bpId) =>
    edit((n) => {
      const b = n.boms.find((x) => x.id === bomId);
      if (b) b.byproducts = (b.byproducts || []).filter((x) => x.id !== bpId);
    });

  /* ── العمليات ── */
  const addOp = (bomId) =>
    edit((n) => {
      const b = n.boms.find((x) => x.id === bomId);
      if (b) b.ops = [...(b.ops || []), { id: freshId("op"), opId: "", minutes: "", instructions: "", checks: [] }];
    });
  const patchOp = (bomId, opRowId, p) =>
    edit((n) => {
      const b = n.boms.find((x) => x.id === bomId);
      const o = (b?.ops || []).find((x) => x.id === opRowId);
      if (o) Object.assign(o, p);
    });
  const removeOp = (bomId, opRowId) =>
    edit((n) => {
      const b = n.boms.find((x) => x.id === bomId);
      if (b) b.ops = (b.ops || []).filter((x) => x.id !== opRowId);
    });

  /** حفظ إصدار جديد — لقطة من الحالة الحالية داخل السجل ثم رفع الرقم. */
  const bumpVersion = (bomId, note) =>
    edit((n) => {
      const b = n.boms.find((x) => x.id === bomId);
      if (!b) return;
      b.history = [
        ...(b.history || []).slice(-49),
        {
          version: num(b.version, 1),
          at: new Date().toISOString(),
          by: userName(),
          note: note || "",
          qty: b.qty,
          overheadPct: b.overheadPct,
          lines: JSON.parse(JSON.stringify(b.lines || [])),
          ops: JSON.parse(JSON.stringify(b.ops || [])),
        },
      ];
      b.version = num(b.version, 1) + 1;
      b.updatedAt = new Date().toISOString();
      b.updatedBy = userName();
    });

  const restoreVersion = (bomId, snapshot) => {
    if (!window.confirm(t({
      en: `Restore version ${snapshot.version}? The current one is kept in the history.`,
      ar: `استرجاع الإصدار ${snapshot.version}؟ الحالي بينحفظ بالسجل.`,
    }))) return;
    bumpVersion(bomId, t({ en: "before restore", ar: "قبل الاسترجاع" }));
    edit((n) => {
      const b = n.boms.find((x) => x.id === bomId);
      if (!b) return;
      b.qty = snapshot.qty;
      b.overheadPct = snapshot.overheadPct;
      b.lines = JSON.parse(JSON.stringify(snapshot.lines || []));
      b.ops = JSON.parse(JSON.stringify(snapshot.ops || []));
    });
    setHistoryFor("");
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

  /* منتج بقائمتين مفعّلتين = خطأ يمنع الحفظ */
  const blocker = useMemo(() => {
    const seen = new Map();
    for (const b of activeOnly(model.boms)) {
      if (!b.productId) continue;
      if (seen.has(b.productId)) {
        const p = itemById(model, b.productId);
        return t({
          en: `Two active BOMs for ${nameOf(p, false) || b.productId} — deactivate one.`,
          ar: `في قائمتَي مواد مفعّلتين لـ${nameOf(p, true) || b.productId} — عطّل وحدة.`,
        });
      }
      seen.set(b.productId, b.id);
    }
    return "";
  }, [model, t]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (model.boms || [])
      .map((b) => ({ b, product: itemById(model, b.productId), cost: bomCost(model, b) }))
      .filter(({ b, product }) => {
        if (!needle) return true;
        return [b.ref, product?.sku, product?.ar, product?.en]
          .some((v) => String(v || "").toLowerCase().includes(needle));
      });
  }, [model, q]);

  if (!canOpenMrp(PAGE)) return <MrpNoAccess page={PAGE} />;

  const current = openId ? (model.boms || []).find((x) => x.id === openId) : null;
  const histBom = historyFor ? (model.boms || []).find((x) => x.id === historyFor) : null;

  return (
    <MrpShell
      pageId={PAGE}
      icon="🧾"
      title={t({ en: "Bills of materials", ar: "قوائم المواد" })}
      sub={t({
        en: "Build the finished product from its components",
        ar: "تركيب المنتج النهائي من مكوّناته",
      })}
      actions={
        canEdit && !current && (
          <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={addBom}>
            ＋ {t({ en: "New BOM", ar: "قائمة مواد جديدة" })}
          </button>
        )
      }
    >
      {msg && <div style={S.ok}>{msg}</div>}
      {blocker && <div style={S.err}>⚠️ {blocker}</div>}

      {!current ? (
        <>
          <Card
            icon="🧾"
            title={t({ en: "All bills of materials", ar: "كل قوائم المواد" })}
            sub={t({
              en: "One active BOM per product. Cost is recalculated live from the item master.",
              ar: "قائمة مفعّلة وحدة لكل منتج. التكلفة بتتحسب مباشرة من سجل الأصناف.",
            })}
            right={
              <SearchBox value={q} onChange={setQ}
                placeholder={t({ en: "Search BOM or product…", ar: "بحث برقم القائمة أو المنتج…" })} />
            }
          >
            {loading && !rows.length ? (
              <EmptyBox>{t({ en: "Loading…", ar: "جارٍ التحميل…" })}</EmptyBox>
            ) : rows.length === 0 ? (
              <EmptyBox>
                {t({
                  en: "No BOM yet — press “New BOM” to build your first product.",
                  ar: "لا توجد قوائم بعد — اضغط «قائمة مواد جديدة» لتركيب أول منتج.",
                })}
              </EmptyBox>
            ) : (
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>{t({ en: "BOM no.", ar: "رقم القائمة" })}</th>
                      <th style={S.th}>{t({ en: "Finished product", ar: "المنتج النهائي" })}</th>
                      <th style={S.th}>{t({ en: "Produces", ar: "ينتج" })}</th>
                      <th style={S.th}>{t({ en: "Components", ar: "المكوّنات" })}</th>
                      <th style={S.th}>{t({ en: "Material", ar: "المواد" })}</th>
                      <th style={S.th}>{t({ en: "Labor", ar: "التشغيل" })}</th>
                      <th style={S.th}>{t({ en: "Cost / unit", ar: "التكلفة/وحدة" })}</th>
                      <th style={S.th}>{t({ en: "Version", ar: "الإصدار" })}</th>
                      <th style={S.th}>{t({ en: "Active", ar: "مفعّلة" })}</th>
                      <th style={S.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ b, product, cost }) => (
                      <tr key={b.id}>
                        <td style={{ ...S.td, fontWeight: 900 }}>{b.ref}</td>
                        <td style={{ ...S.td, ...S.tdStart }}>
                          {product
                            ? `${product.sku ? `[${product.sku}] ` : ""}${nameOf(product, isAr) || product.id}`
                            : <span style={{ color: "#a12626" }}>⚠️ {t({ en: "no product", ar: "بلا منتج" })}</span>}
                        </td>
                        <td style={S.td}>{money(b.qty, 2)} {b.uom || product?.uom || ""}</td>
                        <td style={S.td}>{(b.lines || []).length}</td>
                        <td style={S.td}>{money(cost.material)}</td>
                        <td style={S.td}>{money(cost.labor)}</td>
                        <td style={{ ...S.td, fontWeight: 900, color: "#0f766e" }}>{money(cost.unit)}</td>
                        <td style={S.td}>
                          <Badge color="#14507f" bg="#eef4fb">v{num(b.version, 1)}</Badge>
                        </td>
                        <td style={S.td}>
                          <Switch
                            checked={b.active !== false}
                            disabled={!canEdit}
                            onChange={(v) => patchBom(b.id, { active: v })}
                          />
                        </td>
                        <td style={S.td}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                            <button type="button" style={{ ...S.btn, ...S.btnSm }}
                              onClick={() => setOpenId(b.id)}>
                              {t({ en: "Open", ar: "فتح" })}
                            </button>
                            {canEdit && (
                              <button type="button" style={{ ...S.btn, ...S.btnSm }}
                                onClick={() => duplicateBom(b.id)}>
                                ⧉
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
          </Card>

          <OperationsCard
            t={t} isAr={isAr} model={model} canEdit={canEdit}
            onAdd={() => edit((n) => {
              n.operations.push({
                id: freshId("wc"), ar: "", en: "", costPerHour: "", active: true,
              });
            })}
            onPatch={(id, p) => edit((n) => {
              const o = n.operations.find((x) => x.id === id);
              if (o) Object.assign(o, p);
            })}
            onRemove={(id) => edit((n) => {
              n.operations = n.operations.filter((x) => x.id !== id);
            })}
          />
        </>
      ) : (
        <BomBuilder
          t={t} isAr={isAr} model={model} bom={current} canEdit={canEdit}
          onBack={() => setOpenId("")}
          patchBom={patchBom}
          addLine={addLine} patchLine={patchLine} removeLine={removeLine}
          addByproduct={addByproduct} patchByproduct={patchByproduct} removeByproduct={removeByproduct}
          addOp={addOp} patchOp={patchOp} removeOp={removeOp}
          onDelete={() => removeBom(current.id)}
          onDuplicate={() => duplicateBom(current.id)}
          onBump={() => bumpVersion(current.id, "")}
          onHistory={() => setHistoryFor(current.id)}
        />
      )}

      {histBom && (
        <Modal
          wide
          icon="🕓"
          title={`${t({ en: "Version history", ar: "سجل الإصدارات" })} — ${histBom.ref}`}
          onClose={() => setHistoryFor("")}
        >
          {(histBom.history || []).length === 0 ? (
            <EmptyBox>{t({ en: "No previous version yet.", ar: "لا يوجد إصدار سابق بعد." })}</EmptyBox>
          ) : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{t({ en: "Version", ar: "الإصدار" })}</th>
                    <th style={S.th}>{t({ en: "Saved at", ar: "الوقت" })}</th>
                    <th style={S.th}>{t({ en: "By", ar: "بواسطة" })}</th>
                    <th style={S.th}>{t({ en: "Components", ar: "مكوّنات" })}</th>
                    <th style={S.th}>{t({ en: "Note", ar: "ملاحظة" })}</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {[...(histBom.history || [])].reverse().map((h, i) => (
                    <tr key={`${h.version}-${i}`}>
                      <td style={{ ...S.td, fontWeight: 900 }}>v{h.version}</td>
                      <td style={S.td}>
                        {new Date(h.at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td style={S.td}>{h.by || "—"}</td>
                      <td style={S.td}>{(h.lines || []).length}</td>
                      <td style={S.td}>{h.note || "—"}</td>
                      <td style={S.td}>
                        {canEdit && (
                          <button type="button" style={{ ...S.btn, ...S.btnSm }}
                            onClick={() => restoreVersion(histBom.id, h)}>
                            ↺ {t({ en: "Restore", ar: "استرجاع" })}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      <SaveDock
        dirty={dirty}
        saving={saving}
        blocker={blocker}
        onSave={save}
        onDiscard={() => { setDraft(null); setMsg(""); }}
        t={t}
      />
    </MrpShell>
  );
}

/* ══════════════ الباني ══════════════ */

function BomBuilder({
  t, isAr, model, bom, canEdit, onBack, patchBom,
  addLine, patchLine, removeLine,
  addByproduct, patchByproduct, removeByproduct,
  addOp, patchOp, removeOp,
  onDelete, onDuplicate, onBump, onHistory,
}) {
  const cost = bomCost(model, bom);
  const product = itemById(model, bom.productId);
  const ro = !canEdit;
  const [worksheetOp, setWorksheetOp] = React.useState("");
  const isKit = bom.bomType === "kit";
  const effective = isBomEffective(bom);

  return (
    <>
      <Card
        icon="🧾"
        title={`${bom.ref} — ${product ? nameOf(product, isAr) || product.id : t({ en: "pick a product", ar: "اختر منتجاً" })}`}
        sub={t({
          en: "Components, by-products and operations. Cost updates as you type.",
          ar: "المكوّنات والمنتجات الثانوية والعمليات. التكلفة بتتحدّث وأنت عم تكتب.",
        })}
        right={
          <>
            <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={onBack}>
              ← {t({ en: "All BOMs", ar: "كل القوائم" })}
            </button>
            <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={onHistory}>
              🕓 v{num(bom.version, 1)}
            </button>
            {canEdit && (
              <>
                <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={onBump}>
                  ＋ {t({ en: "New version", ar: "إصدار جديد" })}
                </button>
                <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={onDuplicate}>
                  ⧉ {t({ en: "Duplicate", ar: "نسخ" })}
                </button>
                <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnDanger }} onClick={onDelete}>
                  🗑
                </button>
              </>
            )}
          </>
        }
      >
        <fieldset disabled={ro} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <div style={S.grid}>
            <Field label={t({ en: "Finished product", ar: "المنتج النهائي" })}>
              <ItemPicker
                cfg={model}
                value={bom.productId}
                onPick={(id) => {
                  const it = itemById(model, id);
                  patchBom(bom.id, { productId: id, uom: bom.uom || it?.uom || "KG" });
                }}
                isAr={isAr}
                t={t}
                filter={(i) => (i.type || "raw") !== "raw"}
              />
            </Field>
            <Field label={t({ en: "BOM type", ar: "نوع القائمة" })}>
              <Select
                value={bom.bomType || "manufacture"}
                onChange={(v) => patchBom(bom.id, { bomType: v })}
                options={[
                  { id: "manufacture", label: t({ en: "Manufacture this product", ar: "تصنيع هذا المنتج" }) },
                  { id: "kit", label: t({ en: "Kit (explodes, not built)", ar: "مجموعة (تتفكّك بلا تصنيع)" }) },
                ]}
              />
            </Field>
            <Field label={t({ en: "Produces quantity", ar: "الكمية المنتَجة" })}>
              <NumInput value={bom.qty} onChange={(v) => patchBom(bom.id, { qty: v })} />
            </Field>
            <Field label={t({ en: "Unit", ar: "الوحدة" })}>
              <UomSelect value={bom.uom} onChange={(v) => patchBom(bom.id, { uom: v })} isAr={isAr} />
            </Field>
            <Field label={t({ en: "Overhead %", ar: "تكاليف غير مباشرة ٪" })}>
              <NumInput value={bom.overheadPct} onChange={(v) => patchBom(bom.id, { overheadPct: v })} />
            </Field>
            <Field label={t({ en: "Consumption policy", ar: "سياسة الاستهلاك" })}>
              <Select
                value={bom.consumptionPolicy || "warn"}
                onChange={(v) => patchBom(bom.id, { consumptionPolicy: v })}
                options={CONSUMPTION_POLICIES.map((p) => ({
                  id: p.id, label: `${nameOf(p, isAr)} — ${isAr ? p.arSub : p.enSub}`,
                }))}
              />
            </Field>
            <Field label={t({ en: "Effective from", ar: "ساري من" })}>
              <input type="date" style={S.input} value={bom.effectiveFrom || ""}
                onChange={(e) => patchBom(bom.id, { effectiveFrom: e.target.value })} />
            </Field>
            <Field label={t({ en: "Effective to", ar: "ساري حتى" })}>
              <input type="date" style={S.input} value={bom.effectiveTo || ""}
                onChange={(e) => patchBom(bom.id, { effectiveTo: e.target.value })} />
            </Field>
          </div>

          <div style={{ ...S.chipRow, marginTop: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800 }}>
              <Switch checked={bom.active !== false} onChange={(v) => patchBom(bom.id, { active: v })} />
              {t({ en: "Active BOM", ar: "قائمة مفعّلة" })}
            </label>
            {!effective && (
              <Badge color="#b45309" bg="#fffbeb">
                {t({ en: "Out of effectivity today", ar: "خارج فترة السريان اليوم" })}
              </Badge>
            )}
            {isKit && (
              <Badge color="#0f766e" bg="#e7f5f3">
                {t({ en: "Kit — no work order needed", ar: "مجموعة — بلا أمر تصنيع" })}
              </Badge>
            )}
            <span style={S.hint}>
              {isKit
                ? t({
                    en: "A kit is delivered as its components — it is not produced by a work order.",
                    ar: "المجموعة بتتسلّم كمكوّناتها — ما بتنتصنع بأمر تصنيع.",
                  })
                : t({
                    en: "Only the active BOM (within its effectivity dates) is used by work orders.",
                    ar: "القائمة المفعّلة (ضمن تواريخ سريانها) وحدها بتُستعمل بأوامر التصنيع.",
                  })}
            </span>
          </div>
        </fieldset>
      </Card>

      {/* ── المكوّنات ── */}
      <Card
        icon="🧩"
        title={t({ en: "Components", ar: "المكوّنات" })}
        sub={t({
          en: "Quantity is per the produced quantity above. Scrap % is added on top.",
          ar: "الكمية مقابل الكمية المنتَجة فوق. نسبة الهدر بتنضاف فوقها.",
        })}
        right={
          canEdit && (
            <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnPrimary }}
              onClick={() => addLine(bom.id)}>
              ＋ {t({ en: "Add component", ar: "إضافة مكوّن" })}
            </button>
          )
        }
      >
        {(bom.lines || []).length === 0 ? (
          <EmptyBox>{t({ en: "No components yet.", ar: "لا توجد مكوّنات بعد." })}</EmptyBox>
        ) : (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, minWidth: 260 }}>{t({ en: "Component", ar: "المكوّن" })}</th>
                  <th style={S.th}>{t({ en: "Qty", ar: "الكمية" })}</th>
                  <th style={S.th}>{t({ en: "UoM", ar: "الوحدة" })}</th>
                  <th style={S.th}>{t({ en: "Scrap %", ar: "هدر ٪" })}</th>
                  <th style={S.th}>{t({ en: "Net qty", ar: "الكمية الصافية" })}</th>
                  <th style={S.th}>{t({ en: "Unit cost", ar: "تكلفة الوحدة" })}</th>
                  <th style={S.th}>{t({ en: "Line cost", ar: "تكلفة السطر" })}</th>
                  <th style={S.th}>%</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {(bom.lines || []).map((l) => {
                  const it = itemById(model, l.itemId);
                  const net = num(l.qty) * (1 + num(l.scrapPct) / 100);
                  const uc = unitCost(model, l.itemId);
                  const lineCost = net * uc;
                  const share = cost.total > 0 ? (lineCost / cost.total) * 100 : 0;
                  return (
                    <tr key={l.id}>
                      <td style={{ ...S.td, ...S.tdStart, minWidth: 260 }}>
                        {canEdit ? (
                          <ItemPicker
                            cfg={model}
                            value={l.itemId}
                            onPick={(id) => patchLine(bom.id, l.id, { itemId: id })}
                            isAr={isAr}
                            t={t}
                            filter={(i) => i.id !== bom.productId}
                          />
                        ) : (
                          <span style={{ fontWeight: 800 }}>{nameOf(it, isAr) || "—"}</span>
                        )}
                      </td>
                      <td style={S.td}>
                        <input
                          style={S.inputSm}
                          disabled={!canEdit}
                          value={l.qty ?? ""}
                          inputMode="decimal"
                          onChange={(e) => patchLine(bom.id, l.id, { qty: e.target.value })}
                        />
                      </td>
                      <td style={S.td}>{it?.uom || "—"}</td>
                      <td style={S.td}>
                        <input
                          style={S.inputSm}
                          disabled={!canEdit}
                          value={l.scrapPct ?? ""}
                          inputMode="decimal"
                          placeholder="0"
                          onChange={(e) => patchLine(bom.id, l.id, { scrapPct: e.target.value })}
                        />
                      </td>
                      <td style={{ ...S.td, fontWeight: 800 }}>{money(net, 3)}</td>
                      <td style={S.td}>{money(uc)}</td>
                      <td style={{ ...S.td, fontWeight: 900 }}>{money(lineCost)}</td>
                      <td style={S.td}>{share.toFixed(1)}%</td>
                      <td style={S.td}>
                        {canEdit && (
                          <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnDanger }}
                            onClick={() => removeLine(bom.id, l.id)}>
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── المنتجات الثانوية ── */}
      <Card
        icon="🔀"
        title={t({ en: "By-products", ar: "المنتجات الثانوية" })}
        sub={t({
          en: "Extra outputs produced in the same run — e.g. a carcass yields meat, bones and fat together.",
          ar: "مخرجات إضافية بنفس الدفعة — مثلاً الذبيحة بتعطي لحم وعظم ودهن مع بعض.",
        })}
        right={
          canEdit && (
            <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnPrimary }}
              onClick={() => addByproduct(bom.id)}>
              ＋ {t({ en: "Add by-product", ar: "إضافة منتج ثانوي" })}
            </button>
          )
        }
      >
        {(bom.byproducts || []).length === 0 ? (
          <EmptyBox>
            {t({
              en: "No by-products — the run yields only the main product.",
              ar: "لا منتجات ثانوية — الدفعة بتعطي المنتج الرئيسي فقط.",
            })}
          </EmptyBox>
        ) : (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, minWidth: 260 }}>{t({ en: "By-product", ar: "المنتج الثانوي" })}</th>
                  <th style={S.th}>{t({ en: "Qty per batch", ar: "الكمية لكل دفعة" })}</th>
                  <th style={S.th}>{t({ en: "UoM", ar: "الوحدة" })}</th>
                  <th style={S.th}>{t({ en: "Std cost", ar: "التكلفة المعيارية" })}</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {(bom.byproducts || []).map((bp) => {
                  const it = itemById(model, bp.itemId);
                  return (
                    <tr key={bp.id}>
                      <td style={{ ...S.td, ...S.tdStart, minWidth: 260 }}>
                        {canEdit ? (
                          <ItemPicker
                            cfg={model}
                            value={bp.itemId}
                            onPick={(id) => patchByproduct(bom.id, bp.id, { itemId: id })}
                            isAr={isAr}
                            t={t}
                            filter={(i) => i.id !== bom.productId}
                          />
                        ) : (
                          <span style={{ fontWeight: 800 }}>{nameOf(it, isAr) || "—"}</span>
                        )}
                      </td>
                      <td style={S.td}>
                        <input
                          style={S.inputSm}
                          disabled={!canEdit}
                          value={bp.qty ?? ""}
                          inputMode="decimal"
                          onChange={(e) => patchByproduct(bom.id, bp.id, { qty: e.target.value })}
                        />
                      </td>
                      <td style={S.td}>{it?.uom || "—"}</td>
                      <td style={S.td}>{money(unitCost(model, bp.itemId))}</td>
                      <td style={S.td}>
                        {canEdit && (
                          <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnDanger }}
                            onClick={() => removeByproduct(bom.id, bp.id)}>
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={S.note}>
          {t({
            en: "By-products are added to stock when the work order is closed. Their cost is their own standard cost (no cost split, as agreed).",
            ar: "المنتجات الثانوية بتدخل المخزون عند إقفال أمر التصنيع. تكلفتها هي تكلفتها المعيارية (بلا توزيع تكلفة، متل ما اتفقنا).",
          })}
        </div>
      </Card>

      {/* ── العمليات ── */}
      <Card
        icon="⚙️"
        title={t({ en: "Operations (routing)", ar: "العمليات والتشغيل" })}
        sub={t({
          en: "Time, worksheet instructions and quality checks for each step.",
          ar: "الوقت وتعليمات ورقة العمل وفحوصات الجودة لكل خطوة.",
        })}
        right={
          canEdit && (
            <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnPrimary }}
              onClick={() => addOp(bom.id)}>
              ＋ {t({ en: "Add operation", ar: "إضافة عملية" })}
            </button>
          )
        }
      >
        {(bom.ops || []).length === 0 ? (
          <EmptyBox>{t({ en: "No operations — material cost only.", ar: "لا عمليات — تكلفة المواد فقط." })}</EmptyBox>
        ) : (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>{t({ en: "Work centre", ar: "مركز العمل" })}</th>
                  <th style={S.th}>{t({ en: "Minutes", ar: "الدقائق" })}</th>
                  <th style={S.th}>{t({ en: "Cost / hour", ar: "التكلفة/ساعة" })}</th>
                  <th style={S.th}>{t({ en: "Cost", ar: "التكلفة" })}</th>
                  <th style={S.th}>{t({ en: "Worksheet", ar: "ورقة العمل" })}</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {(bom.ops || []).map((o) => {
                  const wc = opById(model, o.opId);
                  const rate = num(o.costPerHour ?? wc?.costPerHour);
                  return (
                    <tr key={o.id}>
                      <td style={{ ...S.td, ...S.tdStart }}>
                        <Select
                          value={o.opId}
                          onChange={(v) => patchOp(bom.id, o.id, { opId: v })}
                          options={activeOnly(model.operations)}
                          isAr={isAr}
                          disabled={!canEdit}
                          placeholder={t({ en: "Select…", ar: "اختر…" })}
                        />
                      </td>
                      <td style={S.td}>
                        <input
                          style={S.inputSm}
                          disabled={!canEdit}
                          value={o.minutes ?? ""}
                          inputMode="decimal"
                          onChange={(e) => patchOp(bom.id, o.id, { minutes: e.target.value })}
                        />
                      </td>
                      <td style={S.td}>
                        <input
                          style={S.inputSm}
                          disabled={!canEdit}
                          value={o.costPerHour ?? ""}
                          inputMode="decimal"
                          placeholder={String(num(wc?.costPerHour) || 0)}
                          onChange={(e) => patchOp(bom.id, o.id, { costPerHour: e.target.value })}
                        />
                      </td>
                      <td style={{ ...S.td, fontWeight: 900 }}>
                        {money((num(o.minutes) / 60) * rate)}
                      </td>
                      <td style={S.td}>
                        <button type="button" style={{ ...S.btn, ...S.btnSm }}
                          onClick={() => setWorksheetOp(o.id)}>
                          📋 {(o.instructions ? 1 : 0) + (o.checks || []).length || t({ en: "Edit", ar: "تحرير" })}
                        </button>
                      </td>
                      <td style={S.td}>
                        {canEdit && (
                          <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnDanger }}
                            onClick={() => removeOp(bom.id, o.id)}>
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── ورقة عمل العملية ── */}
      {worksheetOp && (
        <OpWorksheetModal
          t={t} isAr={isAr} canEdit={canEdit}
          op={(bom.ops || []).find((x) => x.id === worksheetOp)}
          wc={opById(model, (bom.ops || []).find((x) => x.id === worksheetOp)?.opId)}
          onClose={() => setWorksheetOp("")}
          onPatch={(p) => patchOp(bom.id, worksheetOp, p)}
        />
      )}

      {/* ── ملخّص التكلفة ── */}
      <div style={S.kpiRow}>
        <Kpi label={t({ en: "Material", ar: "المواد" })} value={money(cost.material)} foot="AED" />
        <Kpi label={t({ en: "Labor", ar: "التشغيل" })} value={money(cost.labor)} foot="AED" />
        <Kpi label={t({ en: "Overhead", ar: "غير مباشرة" })} value={money(cost.overhead)} foot="AED" />
        <Kpi label={t({ en: "Total batch", ar: "إجمالي الدفعة" })} value={money(cost.total)} foot="AED" />
        <Kpi
          label={t({ en: "Cost per unit", ar: "التكلفة للوحدة" })}
          value={money(cost.unit)}
          foot={`AED / ${bom.uom || ""}`}
          color="#0f766e"
        />
      </div>

      <Card icon="📝" title={t({ en: "Notes", ar: "ملاحظات" })}>
        <textarea
          style={{ ...S.input, resize: "vertical" }}
          rows={3}
          disabled={ro}
          value={bom.notes || ""}
          onChange={(e) => patchBom(bom.id, { notes: e.target.value })}
        />
      </Card>
    </>
  );
}

/* ══════════════ ورقة عمل العملية ══════════════ */

function OpWorksheetModal({ t, isAr, canEdit, op, wc, onClose, onPatch }) {
  if (!op) return null;
  const checks = op.checks || [];

  const setCheck = (id, text) =>
    onPatch({ checks: checks.map((c) => (c.id === id ? { ...c, text } : c)) });
  const addCheck = () =>
    onPatch({ checks: [...checks, { id: freshId("chk"), text: "" }] });
  const removeCheck = (id) =>
    onPatch({ checks: checks.filter((c) => c.id !== id) });

  return (
    <Modal
      icon="📋"
      title={`${t({ en: "Worksheet", ar: "ورقة العمل" })} — ${nameOf(wc || {}, isAr) || t({ en: "operation", ar: "عملية" })}`}
      onClose={onClose}
      footer={
        <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={onClose}>
          {t({ en: "Done", ar: "تم" })}
        </button>
      }
    >
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <Field label={t({ en: "Instructions for the operator", ar: "تعليمات للعامل" })}>
          <textarea
            style={{ ...S.input, resize: "vertical" }}
            rows={5}
            value={op.instructions || ""}
            placeholder={t({
              en: "Step-by-step notes shown on the work order…",
              ar: "خطوات بتظهر على أمر التصنيع…",
            })}
            onChange={(e) => onPatch({ instructions: e.target.value })}
          />
        </Field>

        <div style={{ ...S.cardHead, marginTop: 16 }}>
          <span style={S.cardIcon}>✔️</span>
          <div style={{ minWidth: 0 }}>
            <h2 className="mrp-sec" style={S.cardTitle}>
              {t({ en: "Quality checks", ar: "فحوصات الجودة" })}
            </h2>
            <div className="mrp-sub" style={S.cardSub}>
              {t({
                en: "The operator marks each one pass / fail on the work order.",
                ar: "العامل بيحدّد لكل فحص ناجح / راسب على أمر التصنيع.",
              })}
            </div>
          </div>
          {canEdit && (
            <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnPrimary, marginInlineStart: "auto" }}
              onClick={addCheck}>
              ＋ {t({ en: "Add check", ar: "إضافة فحص" })}
            </button>
          )}
        </div>

        {checks.length === 0 ? (
          <EmptyBox>{t({ en: "No quality check.", ar: "لا فحوصات جودة." })}</EmptyBox>
        ) : (
          checks.map((c, i) => (
            <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <span style={{ ...S.badge, background: "#eef4fb", color: "#6b8299" }}>{i + 1}</span>
              <input
                style={S.input}
                value={c.text || ""}
                placeholder={t({ en: "e.g. Core temperature ≤ 4°C", ar: "مثلاً: حرارة القلب ≤ ٤°م" })}
                onChange={(e) => setCheck(c.id, e.target.value)}
              />
              {canEdit && (
                <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnDanger }}
                  onClick={() => removeCheck(c.id)}>
                  ✕
                </button>
              )}
            </div>
          ))
        )}
      </fieldset>
    </Modal>
  );
}

/* ══════════════ مراكز العمل ══════════════ */

function OperationsCard({ t, isAr, model, canEdit, onAdd, onPatch, onRemove }) {
  const list = model.operations || [];
  return (
    <Card
      icon="⚙️"
      title={t({ en: "Work centres", ar: "مراكز العمل" })}
      sub={t({
        en: "Labor and machine rates used by the operations of every BOM.",
        ar: "أجور العمالة والماكينات المستعملة بعمليات كل قائمة مواد.",
      })}
      right={
        canEdit && (
          <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnPrimary }} onClick={onAdd}>
            ＋ {t({ en: "Add", ar: "إضافة" })}
          </button>
        )
      }
    >
      {list.length === 0 ? (
        <EmptyBox>{t({ en: "No work centre yet.", ar: "لا يوجد مركز عمل بعد." })}</EmptyBox>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>{t({ en: "Arabic name", ar: "الاسم بالعربي" })}</th>
                <th style={S.th}>{t({ en: "English name", ar: "الاسم بالإنجليزي" })}</th>
                <th style={S.th}>{t({ en: "Cost / hour", ar: "التكلفة/ساعة" })}</th>
                <th style={S.th}>{t({ en: "Active", ar: "مفعّل" })}</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td style={S.td}>
                    <TextInput value={o.ar} onChange={(v) => onPatch(o.id, { ar: v })} disabled={!canEdit} />
                  </td>
                  <td style={S.td}>
                    <TextInput value={o.en} onChange={(v) => onPatch(o.id, { en: v })} disabled={!canEdit} />
                  </td>
                  <td style={S.td}>
                    <NumInput
                      value={o.costPerHour}
                      onChange={(v) => onPatch(o.id, { costPerHour: v })}
                      disabled={!canEdit}
                      style={{ maxWidth: 130, margin: "0 auto" }}
                    />
                  </td>
                  <td style={S.td}>
                    <Switch
                      checked={o.active !== false}
                      disabled={!canEdit}
                      onChange={(v) => onPatch(o.id, { active: v })}
                    />
                  </td>
                  <td style={S.td}>
                    {canEdit && (
                      <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnDanger }}
                        onClick={() => onRemove(o.id)}>
                        {t({ en: "Delete", ar: "حذف" })}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
