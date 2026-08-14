// src/pages/mrp/MrpReports.jsx
//
// 5️⃣ شاشة التقارير والتحليلات.
// 1) مقارنة التكلفة: المخطّطة من الـ BOM مقابل الفعلية بعد التصنيع.
// 2) تقرير «أين يُستعمل» + أثر تغيّر سعر مادة على تكلفة المنتجات.
// 3) توفّر المواد وحد إعادة الطلب.

import React, { useMemo, useState } from "react";
import {
  MOVE_TYPE, WO_TYPE, activeOnly, bomCost, itemById, money, nameOf, num, onHand,
  priceImpact, reorderAlerts, unitCost, useMrpConfig, useRecords, whereUsed,
  woCost, woPlannedCost,
} from "./mrpApi";
import {
  Badge, Card, EmptyBox, Field, ItemPicker, Kpi, MrpNoAccess, MrpShell, NumInput,
  S, Select, canOpenMrp,
} from "./mrpUi";
import { useSettingsLang } from "../settings/_shared/settingsI18n";

const PAGE = "mrp.reports";

const TABS = [
  { id: "variance", icon: "📉", ar: "التكلفة المخطّطة مقابل الفعلية", en: "Planned vs actual cost" },
  { id: "whereused", icon: "🔗", ar: "أين يُستعمل وأثر السعر", en: "Where-used & price impact" },
  { id: "stock", icon: "📦", ar: "توفّر المواد", en: "Material availability" },
];

export default function MrpReports() {
  const { t, isAr } = useSettingsLang();
  const { cfg } = useMrpConfig();
  const { rows: orders } = useRecords(WO_TYPE);
  const { rows: moves } = useRecords(MOVE_TYPE);

  const [tab, setTab] = useState("variance");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [itemId, setItemId] = useState("");
  const [newCost, setNewCost] = useState("");

  const done = useMemo(
    () =>
      orders
        .filter((w) => w.status === "done")
        .filter((w) => (!from || (w.date || "") >= from) && (!to || (w.date || "") <= to))
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))),
    [orders, from, to]
  );

  const variance = useMemo(
    () =>
      done.map((w) => {
        const actual = woCost(w);
        const planned = woPlannedCost(cfg, w);
        const diff = actual.total - planned.total;
        return {
          wo: w,
          product: itemById(cfg, w.productId),
          actual,
          planned,
          diff,
          pct: planned.total > 0 ? (diff / planned.total) * 100 : 0,
        };
      }),
    [done, cfg]
  );

  const totals = useMemo(() => {
    const plan = variance.reduce((s, v) => s + v.planned.total, 0);
    const act = variance.reduce((s, v) => s + v.actual.total, 0);
    return { plan, act, diff: act - plan, pct: plan > 0 ? ((act - plan) / plan) * 100 : 0 };
  }, [variance]);

  const used = useMemo(() => (itemId ? whereUsed(cfg, itemId) : []), [cfg, itemId]);
  const impact = useMemo(
    () => (itemId && newCost !== "" ? priceImpact(cfg, itemId, newCost) : []),
    [cfg, itemId, newCost]
  );
  const alerts = useMemo(() => reorderAlerts(cfg, orders, moves), [cfg, orders, moves]);

  if (!canOpenMrp(PAGE)) return <MrpNoAccess page={PAGE} />;

  return (
    <MrpShell
      pageId={PAGE}
      icon="📊"
      title={t({ en: "Reports & analytics", ar: "التقارير والتحليلات" })}
      sub={t({ en: "Cost control and material availability", ar: "مراقبة التكاليف وتوفّر المواد" })}
    >
      <div style={S.chipRow}>
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            style={{
              ...S.btn,
              ...(tab === x.id ? S.btnPrimary : null),
            }}
            onClick={() => setTab(x.id)}
          >
            {x.icon} {isAr ? x.ar : x.en}
          </button>
        ))}
      </div>

      {/* ═══ 1) المخطّط مقابل الفعلي ═══ */}
      {tab === "variance" && (
        <>
          <div style={S.kpiRow}>
            <Kpi label={t({ en: "Finished orders", ar: "أوامر منتهية" })} value={variance.length} />
            <Kpi label={t({ en: "Planned cost", ar: "التكلفة المخطّطة" })} value={money(totals.plan, 0)} foot="AED" />
            <Kpi label={t({ en: "Actual cost", ar: "التكلفة الفعلية" })} value={money(totals.act, 0)} foot="AED" />
            <Kpi
              label={t({ en: "Variance", ar: "الفرق" })}
              value={`${totals.diff >= 0 ? "+" : ""}${money(totals.diff, 0)}`}
              foot={`${totals.pct.toFixed(1)}%`}
              color={totals.diff > 0 ? "#a12626" : "#047857"}
            />
          </div>

          <Card
            icon="📉"
            title={t({ en: "Planned vs actual", ar: "المخطّط مقابل الفعلي" })}
            sub={t({
              en: "Planned comes from the BOM at the order quantity; actual from what was really consumed.",
              ar: "المخطّط من قائمة المواد بكمية الأمر، والفعلي من المستهلَك فعلاً.",
            })}
            right={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input type="date" style={{ ...S.input, width: 165 }} value={from}
                  onChange={(e) => setFrom(e.target.value)} />
                <input type="date" style={{ ...S.input, width: 165 }} value={to}
                  onChange={(e) => setTo(e.target.value)} />
              </div>
            }
          >
            {variance.length === 0 ? (
              <EmptyBox>{t({ en: "No finished work order in this range.", ar: "لا يوجد أمر منتهٍ بهذه الفترة." })}</EmptyBox>
            ) : (
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>{t({ en: "Order", ar: "الأمر" })}</th>
                      <th style={S.th}>{t({ en: "Date", ar: "التاريخ" })}</th>
                      <th style={{ ...S.th, minWidth: 190 }}>{t({ en: "Product", ar: "المنتج" })}</th>
                      <th style={S.th}>{t({ en: "Produced", ar: "المنتَج" })}</th>
                      <th style={S.th}>{t({ en: "Planned", ar: "المخطّط" })}</th>
                      <th style={S.th}>{t({ en: "Actual", ar: "الفعلي" })}</th>
                      <th style={S.th}>{t({ en: "Variance", ar: "الفرق" })}</th>
                      <th style={S.th}>%</th>
                      <th style={S.th}>{t({ en: "Unit cost", ar: "تكلفة الوحدة" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variance.map((v) => (
                      <tr key={v.wo._rid || v.wo.no}>
                        <td style={{ ...S.td, fontWeight: 900 }}>{v.wo.no}</td>
                        <td style={S.td}>{v.wo.date || "—"}</td>
                        <td style={{ ...S.td, ...S.tdStart }}>{nameOf(v.product || {}, isAr) || "—"}</td>
                        <td style={S.td}>{money(v.wo.qtyProduced, 2)}</td>
                        <td style={S.td}>{money(v.planned.total)}</td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{money(v.actual.total)}</td>
                        <td style={{
                          ...S.td, fontWeight: 900,
                          color: v.diff > 0 ? "#a12626" : v.diff < 0 ? "#047857" : "#6b8299",
                        }}>
                          {v.diff >= 0 ? "+" : ""}{money(v.diff)}
                        </td>
                        <td style={S.td}>{v.pct.toFixed(1)}%</td>
                        <td style={S.td}>{money(v.actual.unit)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style={{ ...S.td, fontWeight: 900 }} colSpan={4}>
                        {t({ en: "Total", ar: "الإجمالي" })}
                      </td>
                      <td style={{ ...S.td, fontWeight: 900 }}>{money(totals.plan)}</td>
                      <td style={{ ...S.td, fontWeight: 900 }}>{money(totals.act)}</td>
                      <td style={{
                        ...S.td, fontWeight: 900,
                        color: totals.diff > 0 ? "#a12626" : "#047857",
                      }}>
                        {totals.diff >= 0 ? "+" : ""}{money(totals.diff)}
                      </td>
                      <td style={{ ...S.td, fontWeight: 900 }}>{totals.pct.toFixed(1)}%</td>
                      <td style={S.td}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ═══ 2) أين يُستعمل + أثر السعر ═══ */}
      {tab === "whereused" && (
        <>
          <Card
            icon="🔗"
            title={t({ en: "Where-used", ar: "أين يُستعمل" })}
            sub={t({
              en: "Pick a material to see which products use it and what a price change would do.",
              ar: "اختر مادة لتشوف أي منتجات بتستعملها وشو بيصير لو تغيّر سعرها.",
            })}
          >
            <div style={S.grid}>
              <Field label={t({ en: "Material", ar: "المادة" })}>
                <ItemPicker cfg={cfg} value={itemId} onPick={setItemId} isAr={isAr} t={t} />
              </Field>
              <Field label={t({ en: "Current cost", ar: "التكلفة الحالية" })}>
                <input style={S.input} disabled value={itemId ? money(unitCost(cfg, itemId)) : ""} />
              </Field>
              <Field label={t({ en: "Simulated new cost", ar: "سعر جديد افتراضي" })}>
                <NumInput value={newCost} onChange={setNewCost} placeholder="—" />
              </Field>
            </div>

            {!itemId ? (
              <EmptyBox>{t({ en: "Pick a material.", ar: "اختر مادة." })}</EmptyBox>
            ) : used.length === 0 ? (
              <EmptyBox>{t({ en: "This material is not used in any BOM.", ar: "هذه المادة غير مستعملة بأي قائمة مواد." })}</EmptyBox>
            ) : (
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>{t({ en: "BOM", ar: "القائمة" })}</th>
                      <th style={{ ...S.th, minWidth: 200 }}>{t({ en: "Product", ar: "المنتج" })}</th>
                      <th style={S.th}>{t({ en: "Qty per unit", ar: "الكمية للوحدة" })}</th>
                      <th style={S.th}>{t({ en: "Share of cost", ar: "حصّة من التكلفة" })}</th>
                      <th style={S.th}>{t({ en: "Unit cost now", ar: "تكلفة الوحدة الآن" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {used.map((u) => (
                      <tr key={u.bom.id}>
                        <td style={{ ...S.td, fontWeight: 900 }}>{u.bom.ref}</td>
                        <td style={{ ...S.td, ...S.tdStart }}>{nameOf(u.product || {}, isAr) || "—"}</td>
                        <td style={S.td}>{money(u.qtyPerUnit, 4)}</td>
                        <td style={S.td}>{u.share.toFixed(1)}%</td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{money(bomCost(cfg, u.bom).unit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {impact.length > 0 && (
            <Card
              icon="⚡"
              title={t({ en: "Price change impact", ar: "أثر تغيّر السعر" })}
              sub={t({
                en: "Products whose cost moves — including through sub-assemblies.",
                ar: "المنتجات اللي بتتأثر تكلفتها — حتى عبر المكوّنات شبه المصنّعة.",
              })}
            >
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>{t({ en: "BOM", ar: "القائمة" })}</th>
                      <th style={{ ...S.th, minWidth: 200 }}>{t({ en: "Product", ar: "المنتج" })}</th>
                      <th style={S.th}>{t({ en: "Before", ar: "قبل" })}</th>
                      <th style={S.th}>{t({ en: "After", ar: "بعد" })}</th>
                      <th style={S.th}>{t({ en: "Change", ar: "التغيّر" })}</th>
                      <th style={S.th}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impact.map((r) => (
                      <tr key={r.bom.id}>
                        <td style={{ ...S.td, fontWeight: 900 }}>{r.bom.ref}</td>
                        <td style={{ ...S.td, ...S.tdStart }}>{nameOf(r.product || {}, isAr) || "—"}</td>
                        <td style={S.td}>{money(r.before)}</td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{money(r.after)}</td>
                        <td style={{
                          ...S.td, fontWeight: 900,
                          color: r.diff > 0 ? "#a12626" : r.diff < 0 ? "#047857" : "#6b8299",
                        }}>
                          {r.diff >= 0 ? "+" : ""}{money(r.diff)}
                        </td>
                        <td style={S.td}>
                          <Badge
                            color={r.pct > 0 ? "#a12626" : "#047857"}
                            bg={r.pct > 0 ? "#fff1f1" : "#ecfdf5"}
                          >
                            {r.pct >= 0 ? "+" : ""}{r.pct.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ═══ 3) توفّر المواد ═══ */}
      {tab === "stock" && (
        <>
          <div style={S.kpiRow}>
            <Kpi label={t({ en: "Items", ar: "الأصناف" })} value={activeOnly(cfg.items).length} />
            <Kpi
              label={t({ en: "Below reorder", ar: "تحت حد الطلب" })}
              value={alerts.length}
              color={alerts.length ? "#a12626" : "#047857"}
            />
            <Kpi
              label={t({ en: "Stock value", ar: "قيمة المخزون" })}
              value={money(
                activeOnly(cfg.items).reduce(
                  (s, i) => s + onHand(cfg, i.id, orders, moves) * unitCost(cfg, i.id), 0
                ), 0
              )}
              foot="AED"
            />
          </div>

          <Card
            icon="📦"
            title={t({ en: "Material availability", ar: "توفّر المواد" })}
            sub={t({
              en: "On-hand quantity against the reorder level of every active item.",
              ar: "الرصيد الحالي مقابل حد إعادة الطلب لكل صنف مفعّل.",
            })}
          >
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{t({ en: "SKU", ar: "الكود" })}</th>
                    <th style={{ ...S.th, minWidth: 200 }}>{t({ en: "Item", ar: "الصنف" })}</th>
                    <th style={S.th}>{t({ en: "On hand", ar: "الرصيد" })}</th>
                    <th style={S.th}>{t({ en: "Reorder", ar: "حد الطلب" })}</th>
                    <th style={S.th}>{t({ en: "Status", ar: "الحالة" })}</th>
                    <th style={S.th}>{t({ en: "Unit cost", ar: "تكلفة الوحدة" })}</th>
                    <th style={S.th}>{t({ en: "Value", ar: "القيمة" })}</th>
                    <th style={S.th}>{t({ en: "Used in", ar: "مستعمل في" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOnly(cfg.items).map((it) => {
                    const qty = onHand(cfg, it.id, orders, moves);
                    const reorder = num(it.reorderLevel);
                    const low = reorder > 0 && qty <= reorder;
                    const uc = unitCost(cfg, it.id);
                    return (
                      <tr key={it.id}>
                        <td style={{ ...S.td, fontWeight: 900 }}>{it.sku || "—"}</td>
                        <td style={{ ...S.td, ...S.tdStart }}>{nameOf(it, isAr) || it.id}</td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{money(qty, 2)} {it.uom}</td>
                        <td style={S.td}>{reorder ? money(reorder, 2) : "—"}</td>
                        <td style={S.td}>
                          {qty < 0 ? (
                            <Badge color="#a12626" bg="#fff1f1">{t({ en: "negative", ar: "سالب" })}</Badge>
                          ) : low ? (
                            <Badge color="#b45309" bg="#fffbeb">{t({ en: "reorder", ar: "أعد الطلب" })}</Badge>
                          ) : (
                            <Badge color="#047857" bg="#ecfdf5">{t({ en: "ok", ar: "متوفّر" })}</Badge>
                          )}
                        </td>
                        <td style={S.td}>{money(uc)}</td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{money(qty * uc)}</td>
                        <td style={S.td}>{whereUsed(cfg, it.id).length || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {activeOnly(cfg.items).length === 0 && (
              <EmptyBox>{t({ en: "No items yet.", ar: "لا توجد أصناف بعد." })}</EmptyBox>
            )}
          </Card>
        </>
      )}
    </MrpShell>
  );
}
