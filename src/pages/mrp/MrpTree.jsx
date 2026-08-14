// src/pages/mrp/MrpTree.jsx
//
// 3️⃣ شاشة الـ BOM المتعدّد المستويات — عرض شجري + تفكيك (Explosion).
// Multi-level tree: sub-assemblies inside the product, and the raw-material blow-up.

import React, { useMemo, useState } from "react";
import {
  MOVE_TYPE, WO_TYPE, activeOnly, bomCost, bomForProduct, explode, itemById,
  money, nameOf, num, onHand, rawRequirements, unitCost, useMrpConfig, useRecords,
} from "./mrpApi";
import {
  Badge, Card, EmptyBox, Field, Kpi, MrpNoAccess, MrpShell, NumInput, S,
  Select, canOpenMrp,
} from "./mrpUi";
import { useSettingsLang } from "../settings/_shared/settingsI18n";

const PAGE = "mrp.tree";

export default function MrpTree() {
  const { t, isAr } = useSettingsLang();
  const { cfg, loading } = useMrpConfig();
  const { rows: workOrders } = useRecords(WO_TYPE);
  const { rows: moves } = useRecords(MOVE_TYPE);

  const boms = activeOnly(cfg.boms).filter((b) => b.productId);
  const [bomId, setBomId] = useState("");
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState("tree");   // tree | raw

  const bom = bomId ? (cfg.boms || []).find((b) => b.id === bomId) : boms[0] || null;
  const product = bom ? itemById(cfg, bom.productId) : null;

  const tree = useMemo(
    () => (bom ? explode(cfg, bom, num(qty, 1)) : []),
    [cfg, bom, qty]
  );
  const raws = useMemo(
    () => (bom ? rawRequirements(cfg, bom, num(qty, 1)) : []),
    [cfg, bom, qty]
  );
  const cost = bom ? bomCost(cfg, bom) : null;

  const shortages = raws.filter(
    (r) => onHand(cfg, r.itemId, workOrders, moves) < r.qty
  );

  if (!canOpenMrp(PAGE)) return <MrpNoAccess page={PAGE} />;

  return (
    <MrpShell
      pageId={PAGE}
      icon="🌳"
      title={t({ en: "Multi-level tree", ar: "الشجرة متعدّدة المستويات" })}
      sub={t({
        en: "See how a product breaks down through its sub-assemblies",
        ar: "شوف كيف بينفكّ المنتج عبر مكوّناته شبه المصنّعة",
      })}
    >
      <Card
        icon="🌳"
        title={t({ en: "Pick a product", ar: "اختر منتجاً" })}
        sub={t({
          en: "Any component that has its own BOM is expanded one level deeper.",
          ar: "أي مكوّن إله قائمة مواد بينفتح لمستوى أعمق.",
        })}
      >
        {boms.length === 0 ? (
          <EmptyBox>
            {t({
              en: "No active BOM yet — build one first.",
              ar: "لا توجد قائمة مواد مفعّلة — ابنِ وحدة أولاً.",
            })}
          </EmptyBox>
        ) : (
          <div style={S.grid}>
            <Field label={t({ en: "Product / BOM", ar: "المنتج / القائمة" })}>
              <Select
                value={bom?.id || ""}
                onChange={setBomId}
                options={boms.map((b) => ({
                  id: b.id,
                  label: `${b.ref} — ${nameOf(itemById(cfg, b.productId) || {}, isAr) || b.productId}`,
                }))}
              />
            </Field>
            <Field label={t({ en: "Quantity to build", ar: "الكمية المطلوب تصنيعها" })}>
              <NumInput value={qty} onChange={setQty} />
            </Field>
            <Field label={t({ en: "View", ar: "طريقة العرض" })}>
              <Select
                value={mode}
                onChange={setMode}
                options={[
                  { id: "tree", label: t({ en: "Tree (levels)", ar: "شجرة (مستويات)" }) },
                  { id: "raw", label: t({ en: "Explosion (raw only)", ar: "تفكيك (مواد خام فقط)" }) },
                ]}
              />
            </Field>
          </div>
        )}
      </Card>

      {loading && !bom && <div style={S.note}>{t({ en: "Loading…", ar: "جارٍ التحميل…" })}</div>}

      {bom && (
        <>
          <div style={S.kpiRow}>
            <Kpi
              label={t({ en: "Product", ar: "المنتج" })}
              value={nameOf(product || {}, isAr) || "—"}
              foot={product?.sku || ""}
            />
            <Kpi label={t({ en: "Levels", ar: "المستويات" })}
              value={tree.length ? Math.max(...tree.map((r) => r.level)) + 1 : 0} />
            <Kpi label={t({ en: "Distinct raw materials", ar: "مواد خام مختلفة" })} value={raws.length} />
            <Kpi
              label={t({ en: "Cost for this quantity", ar: "تكلفة هذه الكمية" })}
              value={money((cost?.unit || 0) * num(qty, 1))}
              foot="AED"
              color="#0f766e"
            />
            <Kpi
              label={t({ en: "Shortages", ar: "نواقص" })}
              value={shortages.length}
              color={shortages.length ? "#a12626" : "#047857"}
            />
          </div>

          {(bom.byproducts || []).length > 0 && (
            <div style={S.ok}>
              🔀 {t({ en: "This run also yields", ar: "الدفعة بتعطي كمان" })}:{" "}
              {(bom.byproducts || [])
                .map((b) => {
                  const it = itemById(cfg, b.itemId);
                  const per = num(bom.qty, 1) || 1;
                  return `${nameOf(it || {}, isAr) || b.itemId} (${money((num(b.qty) / per) * num(qty, 1), 2)} ${it?.uom || ""})`;
                })
                .join("، ")}
            </div>
          )}

          {mode === "tree" ? (
            <Card
              icon="🧬"
              title={`${t({ en: "Structure", ar: "التركيب" })} — ${bom.ref}`}
              sub={t({
                en: "Indentation shows the manufacturing level; a chip marks a sub-assembly.",
                ar: "الإزاحة بتبيّن مستوى التصنيع، والشارة بتدل على مكوّن شبه مصنّع.",
              })}
            >
              {tree.length === 0 ? (
                <EmptyBox>{t({ en: "This BOM has no components.", ar: "هذه القائمة بلا مكوّنات." })}</EmptyBox>
              ) : (
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={{ ...S.th, minWidth: 320 }}>{t({ en: "Component", ar: "المكوّن" })}</th>
                        <th style={S.th}>{t({ en: "Level", ar: "المستوى" })}</th>
                        <th style={S.th}>{t({ en: "Qty", ar: "الكمية" })}</th>
                        <th style={S.th}>{t({ en: "UoM", ar: "الوحدة" })}</th>
                        <th style={S.th}>{t({ en: "Scrap %", ar: "هدر ٪" })}</th>
                        <th style={S.th}>{t({ en: "Unit cost", ar: "تكلفة الوحدة" })}</th>
                        <th style={S.th}>{t({ en: "Total", ar: "الإجمالي" })}</th>
                        <th style={S.th}>{t({ en: "On hand", ar: "الرصيد" })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* الجذر */}
                      <tr>
                        <td style={{ ...S.td, ...S.tdStart, fontWeight: 900 }}>
                          🏁 {product ? `${product.sku ? `[${product.sku}] ` : ""}${nameOf(product, isAr)}` : "—"}
                        </td>
                        <td style={S.td}>0</td>
                        <td style={{ ...S.td, fontWeight: 900 }}>{money(qty, 2)}</td>
                        <td style={S.td}>{bom.uom || product?.uom || "—"}</td>
                        <td style={S.td}>—</td>
                        <td style={S.td}>{money(cost?.unit || 0)}</td>
                        <td style={{ ...S.td, fontWeight: 900 }}>{money((cost?.unit || 0) * num(qty, 1))}</td>
                        <td style={S.td}>
                          {money(onHand(cfg, bom.productId, workOrders, moves), 2)}
                        </td>
                      </tr>

                      {tree.map((r, i) => {
                        const stock = onHand(cfg, r.itemId, workOrders, moves);
                        const short = !r.hasBom && stock < r.qty;
                        return (
                          <tr key={`${r.itemId}-${i}`}>
                            <td style={{ ...S.td, ...S.tdStart }}>
                              <span style={{ paddingInlineStart: r.level * 26, display: "inline-block" }}>
                                <span style={{ color: "#a9c3dd" }}>{"└─ "}</span>
                                <b>{r.item?.sku ? `[${r.item.sku}] ` : ""}</b>
                                {nameOf(r.item || {}, isAr) || r.itemId}
                                {r.hasBom && (
                                  <>
                                    {" "}
                                    <Badge color="#0f766e" bg="#e7f5f3">
                                      {t({ en: "sub-assembly", ar: "شبه مصنّع" })}
                                    </Badge>
                                  </>
                                )}
                                {r.cyclic && (
                                  <>
                                    {" "}
                                    <Badge color="#a12626" bg="#fff1f1">
                                      {t({ en: "cycle!", ar: "دوران!" })}
                                    </Badge>
                                  </>
                                )}
                              </span>
                            </td>
                            <td style={S.td}>{r.level + 1}</td>
                            <td style={{ ...S.td, fontWeight: 800 }}>{money(r.qty, 3)}</td>
                            <td style={S.td}>{r.uom || "—"}</td>
                            <td style={S.td}>{r.scrapPct ? `${r.scrapPct}%` : "—"}</td>
                            <td style={S.td}>{money(r.unitCost)}</td>
                            <td style={{ ...S.td, fontWeight: 800 }}>{money(r.qty * r.unitCost)}</td>
                            <td style={{
                              ...S.td, fontWeight: 800,
                              color: short ? "#a12626" : "#6b8299",
                            }}>
                              {money(stock, 2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : (
            <Card
              icon="💥"
              title={t({ en: "Raw material explosion", ar: "تفكيك المواد الخام" })}
              sub={t({
                en: "Everything you must have in stock at the lowest level for this quantity.",
                ar: "كل شي لازم يكون بالمخزن بأقل مستوى لهذه الكمية.",
              })}
            >
              {raws.length === 0 ? (
                <EmptyBox>{t({ en: "Nothing to explode.", ar: "لا شي للتفكيك." })}</EmptyBox>
              ) : (
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>{t({ en: "SKU", ar: "الكود" })}</th>
                        <th style={{ ...S.th, minWidth: 220 }}>{t({ en: "Raw material", ar: "المادة الخام" })}</th>
                        <th style={S.th}>{t({ en: "Required", ar: "المطلوب" })}</th>
                        <th style={S.th}>{t({ en: "UoM", ar: "الوحدة" })}</th>
                        <th style={S.th}>{t({ en: "On hand", ar: "الرصيد" })}</th>
                        <th style={S.th}>{t({ en: "Shortage", ar: "النقص" })}</th>
                        <th style={S.th}>{t({ en: "Unit cost", ar: "تكلفة الوحدة" })}</th>
                        <th style={S.th}>{t({ en: "Total", ar: "الإجمالي" })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {raws.map((r) => {
                        const stock = onHand(cfg, r.itemId, workOrders, moves);
                        const short = Math.max(0, r.qty - stock);
                        return (
                          <tr key={r.itemId}>
                            <td style={{ ...S.td, fontWeight: 900 }}>{r.item?.sku || "—"}</td>
                            <td style={{ ...S.td, ...S.tdStart }}>{nameOf(r.item || {}, isAr) || r.itemId}</td>
                            <td style={{ ...S.td, fontWeight: 800 }}>{money(r.qty, 3)}</td>
                            <td style={S.td}>{r.uom || "—"}</td>
                            <td style={S.td}>{money(stock, 2)}</td>
                            <td style={{ ...S.td, fontWeight: 900, color: short ? "#a12626" : "#047857" }}>
                              {short ? money(short, 3) : "✓"}
                            </td>
                            <td style={S.td}>{money(unitCost(cfg, r.itemId))}</td>
                            <td style={{ ...S.td, fontWeight: 800 }}>
                              {money(r.qty * unitCost(cfg, r.itemId))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ ...S.td, fontWeight: 900 }} colSpan={7}>
                          {t({ en: "Total material cost", ar: "إجمالي تكلفة المواد" })}
                        </td>
                        <td style={{ ...S.td, fontWeight: 900, color: "#0f766e" }}>
                          {money(raws.reduce((s, r) => s + r.qty * unitCost(cfg, r.itemId), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </MrpShell>
  );
}
