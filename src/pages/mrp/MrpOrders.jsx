// src/pages/mrp/MrpOrders.jsx
//
// 4️⃣ شاشة أوامر التصنيع — تحويل قائمة المواد من «وصفة» إلى إنتاج فعلي.
// Work orders: plan a quantity, backflush the components, add labor, close it.
//
// كل أمر سجل مستقل على السيرفر (type = mrp_work_order) — POST للجديد
// و PUT /api/reports/:id للتعديل، فلا يدهس أمر ثاني بنفس اليوم.
//
// دورة الحياة: مسودّة → قيد التصنيع (تُحجز الكميات) → منتهي (يُخصم فعلياً)
// الرصيد كله محسوب من الحركات، فالإقفال وحده هو ما يحرّك المخزون.

import React, { useMemo, useState } from "react";
import {
  CONSUMPTION_POLICIES, CHECK_RESULTS, MOVE_TYPE, WO_TYPE, WO_STATUS, activeOnly,
  bomById, bomCost, consumptionDeviations, failedChecks, isBomEffective, itemById,
  money, nameOf, nextWoNo, num, onHand, opById, saveRecord, deleteRecord, todayIso,
  unitCost, useMrpConfig, useRecords, woByproductsFromBom, woCost, woLinesFromBom,
  woOpsFromBom, woPlannedCost, userName,
} from "./mrpApi";
import {
  Badge, Card, EmptyBox, Field, Kpi, Modal, MrpNoAccess, MrpShell, NumInput, S,
  SearchBox, Select, TextInput, canDeleteMrp, canEditMrp, canOpenMrp,
} from "./mrpUi";
import { useSettingsLang } from "../settings/_shared/settingsI18n";

const PAGE = "mrp.orders";

const statusMeta = (id) => WO_STATUS.find((s) => s.id === id) || WO_STATUS[0];

export default function MrpOrders() {
  const { t, isAr } = useSettingsLang();
  const { cfg } = useMrpConfig();
  const { rows: orders, setRows: setOrders, loading, reload } = useRecords(WO_TYPE);
  const { rows: moves } = useRecords(MOVE_TYPE);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openId, setOpenId] = useState("");     // _rid المفتوح
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const canEdit = canEditMrp();
  const canDelete = canDeleteMrp();

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...orders]
      .sort((a, b) => String(b.no || "").localeCompare(String(a.no || "")))
      .filter((w) => {
        if (statusFilter && w.status !== statusFilter) return false;
        if (!needle) return true;
        const p = itemById(cfg, w.productId);
        return [w.no, p?.sku, p?.ar, p?.en, w.notes]
          .some((v) => String(v || "").toLowerCase().includes(needle));
      });
  }, [orders, q, statusFilter, cfg]);

  const stats = useMemo(() => {
    const done = orders.filter((w) => w.status === "done");
    const actual = done.reduce((s, w) => s + woCost(w).total, 0);
    const planned = done.reduce((s, w) => s + woPlannedCost(cfg, w).total, 0);
    return {
      open: orders.filter((w) => w.status === "confirmed").length,
      done: done.length,
      actual,
      variance: actual - planned,
    };
  }, [orders, cfg]);

  const persist = async (wo) => {
    setBusy(true);
    setErr("");
    try {
      let saved;
      try {
        saved = await saveRecord(WO_TYPE, wo);
      } catch (e) {
        // رقم الأمر محجوز (سُجّل من جهاز ثاني) — أعد التحميل وجرّب الرقم التالي
        if (e?.code !== "DUPLICATE" || wo._rid) throw e;
        const fresh = await reload();
        const no = nextWoNo(fresh);
        saved = await saveRecord(WO_TYPE, { ...wo, no, reportDate: no });
      }
      setOrders((prev) => {
        const i = prev.findIndex((x) => x._rid && x._rid === saved._rid);
        if (i < 0) return [...prev, saved];
        const next = [...prev];
        next[i] = saved;
        return next;
      });
      setMsg(t({ en: "Saved.", ar: "تم الحفظ." }));
      return saved;
    } catch (e) {
      setErr(`${t({ en: "Save failed", ar: "فشل الحفظ" })}: ${e?.message || e}`);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const removeOrder = async (wo) => {
    if (!wo._rid) return;
    if (!window.confirm(t({
      en: `Delete work order ${wo.no}? Its stock effect is removed too.`,
      ar: `حذف أمر التصنيع ${wo.no}؟ أثره على المخزون بينشال كمان.`,
    }))) return;
    setBusy(true);
    try {
      await deleteRecord(wo._rid);
      setOrders((prev) => prev.filter((x) => x._rid !== wo._rid));
      setOpenId("");
    } catch (e) {
      setErr(e?.message || "delete failed");
    } finally {
      setBusy(false);
    }
  };

  /* أمر متبقٍّ (Backorder) — يُبنى بقياس لقطة الأمر الأصلي على الكمية الباقية */
  const makeBackorder = async (wo, remaining) => {
    const factor = remaining / (num(wo.qtyPlanned) || 1);
    const fresh = await reload();
    const no = nextWoNo(fresh);
    const back = {
      no, reportDate: no, date: todayIso(),
      bomId: wo.bomId, bomRef: wo.bomRef, bomVersion: wo.bomVersion,
      productId: wo.productId,
      qtyPlanned: remaining, qtyProduced: 0, status: "draft",
      consumptionPolicy: wo.consumptionPolicy || "warn",
      lines: (wo.lines || []).map((l) => {
        const req = num(l.qtyRequired) * factor;
        return { ...l, qtyRequired: req, qtyConsumed: req };
      }),
      byproducts: (wo.byproducts || []).map((b) => {
        const ex = num(b.qtyExpected) * factor;
        return { ...b, qtyExpected: ex, qtyProduced: ex };
      }),
      ops: (wo.ops || []).map((o) => ({
        ...o,
        minutes: num(o.minutes) * factor,
        checks: (o.checks || []).map((c) => ({ ...c, result: "" })),
      })),
      extraCosts: [],
      notes: `${t({ en: "Backorder of", ar: "أمر متبقٍّ من" })} ${wo.no}`,
      backorderOf: wo.no,
      createdAt: new Date().toISOString(),
      createdBy: userName(),
    };
    await persist(back);
    setMsg(t({ en: `Backorder ${no} created.`, ar: `تم إنشاء الأمر المتبقّي ${no}.` }));
  };

  if (!canOpenMrp(PAGE)) return <MrpNoAccess page={PAGE} />;

  const current = openId ? orders.find((w) => w._rid === openId) : null;

  return (
    <MrpShell
      pageId={PAGE}
      icon="🏭"
      title={t({ en: "Work orders", ar: "أوامر التصنيع" })}
      sub={t({
        en: "Produce from a BOM and move the stock automatically",
        ar: "إنتاج من قائمة المواد مع تحريك المخزون تلقائياً",
      })}
      actions={
        canEdit && (
          <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={() => setCreating(true)}>
            ＋ {t({ en: "New work order", ar: "أمر تصنيع جديد" })}
          </button>
        )
      }
    >
      {err && <div style={S.err}>{err}</div>}
      {msg && !err && <div style={S.ok}>{msg}</div>}

      <div style={S.kpiRow}>
        <Kpi label={t({ en: "In progress", ar: "قيد التصنيع" })} value={stats.open}
          color={stats.open ? "#b45309" : undefined} />
        <Kpi label={t({ en: "Finished", ar: "منتهية" })} value={stats.done} />
        <Kpi label={t({ en: "Actual cost", ar: "التكلفة الفعلية" })} value={money(stats.actual, 0)} foot="AED" />
        <Kpi
          label={t({ en: "Variance vs plan", ar: "الفرق عن المخطّط" })}
          value={`${stats.variance >= 0 ? "+" : ""}${money(stats.variance, 0)}`}
          foot="AED"
          color={stats.variance > 0 ? "#a12626" : "#047857"}
        />
      </div>

      <Card
        icon="🏭"
        title={t({ en: "Orders", ar: "الأوامر" })}
        sub={t({
          en: "Confirm to lock the components, close to move the stock.",
          ar: "التأكيد بيثبّت المكوّنات، والإقفال بيحرّك المخزون.",
        })}
        right={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <SearchBox value={q} onChange={setQ}
              placeholder={t({ en: "Search order or product…", ar: "بحث برقم الأمر أو المنتج…" })} />
            <select style={{ ...S.input, width: 170 }} value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">{t({ en: "All statuses", ar: "كل الحالات" })}</option>
              {WO_STATUS.map((s) => (
                <option key={s.id} value={s.id}>{nameOf(s, isAr)}</option>
              ))}
            </select>
            <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={reload}>
              ↻
            </button>
          </div>
        }
      >
        {loading && !rows.length ? (
          <EmptyBox>{t({ en: "Loading…", ar: "جارٍ التحميل…" })}</EmptyBox>
        ) : rows.length === 0 ? (
          <EmptyBox>
            {t({ en: "No work order yet.", ar: "لا توجد أوامر تصنيع بعد." })}
          </EmptyBox>
        ) : (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>{t({ en: "Order", ar: "الأمر" })}</th>
                  <th style={S.th}>{t({ en: "Date", ar: "التاريخ" })}</th>
                  <th style={{ ...S.th, minWidth: 200 }}>{t({ en: "Product", ar: "المنتج" })}</th>
                  <th style={S.th}>{t({ en: "Planned", ar: "المخطّط" })}</th>
                  <th style={S.th}>{t({ en: "Produced", ar: "المنتَج" })}</th>
                  <th style={S.th}>{t({ en: "Planned cost", ar: "التكلفة المخطّطة" })}</th>
                  <th style={S.th}>{t({ en: "Actual cost", ar: "التكلفة الفعلية" })}</th>
                  <th style={S.th}>{t({ en: "Variance", ar: "الفرق" })}</th>
                  <th style={S.th}>{t({ en: "Status", ar: "الحالة" })}</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => {
                  const p = itemById(cfg, w.productId);
                  const actual = woCost(w);
                  const planned = woPlannedCost(cfg, w);
                  const variance = w.status === "done" ? actual.total - planned.total : 0;
                  const st = statusMeta(w.status);
                  return (
                    <tr key={w._rid || w.no}>
                      <td style={{ ...S.td, fontWeight: 900 }}>{w.no}</td>
                      <td style={S.td}>{w.date || "—"}</td>
                      <td style={{ ...S.td, ...S.tdStart }}>
                        {p ? `${p.sku ? `[${p.sku}] ` : ""}${nameOf(p, isAr) || p.id}` : "—"}
                      </td>
                      <td style={S.td}>{money(w.qtyPlanned, 2)}</td>
                      <td style={{ ...S.td, fontWeight: 800 }}>
                        {w.status === "done" ? money(w.qtyProduced, 2) : "—"}
                      </td>
                      <td style={S.td}>{money(planned.total)}</td>
                      <td style={{ ...S.td, fontWeight: 800 }}>
                        {w.status === "draft" ? "—" : money(actual.total)}
                      </td>
                      <td style={{
                        ...S.td, fontWeight: 900,
                        color: variance > 0 ? "#a12626" : variance < 0 ? "#047857" : "#6b8299",
                      }}>
                        {w.status === "done" ? `${variance >= 0 ? "+" : ""}${money(variance)}` : "—"}
                      </td>
                      <td style={S.td}>
                        <Badge color={st.color} bg={`${st.color}18`}>{nameOf(st, isAr)}</Badge>
                      </td>
                      <td style={S.td}>
                        <button type="button" style={{ ...S.btn, ...S.btnSm }}
                          onClick={() => setOpenId(w._rid)}>
                          {t({ en: "Open", ar: "فتح" })}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {creating && (
        <NewOrderModal
          t={t} isAr={isAr} cfg={cfg} orders={orders} moves={moves}
          busy={busy}
          onClose={() => setCreating(false)}
          onCreate={async (wo) => {
            const saved = await persist(wo);
            setCreating(false);
            if (saved) setOpenId(saved._rid);
          }}
        />
      )}

      {current && (
        <OrderModal
          t={t} isAr={isAr} cfg={cfg} wo={current} moves={moves} orders={orders}
          canEdit={canEdit} canDelete={canDelete} busy={busy}
          onClose={() => setOpenId("")}
          onSave={persist}
          onDelete={() => removeOrder(current)}
          onBackorder={makeBackorder}
        />
      )}
    </MrpShell>
  );
}

/* ══════════════ إنشاء أمر ══════════════ */

function NewOrderModal({ t, isAr, cfg, orders, moves, onClose, onCreate, busy }) {
  // المجموعات (Kit) لا تُصنَّع بأمر تصنيع — تُستثنى من القائمة
  const boms = activeOnly(cfg.boms).filter((b) => b.productId && b.bomType !== "kit");
  const [bomId, setBomId] = useState(boms[0]?.id || "");
  const [qty, setQty] = useState(1);
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState("");

  const bom = bomById(cfg, bomId);
  const effective = bom ? isBomEffective(bom, date) : true;
  const product = bom ? itemById(cfg, bom.productId) : null;
  const lines = bom ? woLinesFromBom(cfg, bom, num(qty, 0)) : [];
  const shortages = lines.filter(
    (l) => onHand(cfg, l.itemId, orders, moves) < l.qtyRequired
  );

  const create = () => {
    if (!bom || num(qty) <= 0) return;
    const no = nextWoNo(orders);
    onCreate({
      no,
      // مفتاح فريد للسجل على السيرفر (الفهرس الفريد على type+reportDate)
      reportDate: no,
      date,
      bomId: bom.id,
      bomRef: bom.ref,
      bomVersion: num(bom.version, 1),
      productId: bom.productId,
      qtyPlanned: num(qty),
      qtyProduced: 0,
      status: "draft",
      consumptionPolicy: bom.consumptionPolicy || "warn",
      lines,
      byproducts: woByproductsFromBom(cfg, bom, num(qty, 0)),
      ops: woOpsFromBom(cfg, bom, num(qty, 0)),
      extraCosts: [],
      notes,
      createdAt: new Date().toISOString(),
      createdBy: userName(),
    });
  };

  return (
    <Modal
      wide
      icon="🏭"
      title={t({ en: "New work order", ar: "أمر تصنيع جديد" })}
      onClose={onClose}
      footer={
        <>
          <button type="button" style={S.btn} onClick={onClose}>
            {t({ en: "Cancel", ar: "إلغاء" })}
          </button>
          <button
            type="button"
            style={{ ...S.btn, ...S.btnPrimary, ...(!bom || num(qty) <= 0 || busy ? S.btnOff : null) }}
            disabled={!bom || num(qty) <= 0 || busy}
            onClick={create}
          >
            {busy ? t({ en: "Saving…", ar: "جارٍ الحفظ…" }) : t({ en: "Create", ar: "إنشاء" })}
          </button>
        </>
      }
    >
      {boms.length === 0 ? (
        <EmptyBox>{t({ en: "No active BOM to produce from.", ar: "لا توجد قائمة مواد مفعّلة للإنتاج منها." })}</EmptyBox>
      ) : (
        <>
          <div style={S.grid}>
            <Field label={t({ en: "BOM / product", ar: "قائمة المواد / المنتج" })}>
              <Select
                value={bomId}
                onChange={setBomId}
                options={boms.map((b) => ({
                  id: b.id,
                  label: `${b.ref} — ${nameOf(itemById(cfg, b.productId) || {}, isAr) || b.productId}`,
                }))}
              />
            </Field>
            <Field label={t({ en: "Quantity to produce", ar: "الكمية المطلوب إنتاجها" })}>
              <NumInput value={qty} onChange={setQty} />
            </Field>
            <Field label={t({ en: "Date", ar: "التاريخ" })}>
              <input type="date" style={S.input} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label={t({ en: "Notes", ar: "ملاحظات" })}>
              <TextInput value={notes} onChange={setNotes} />
            </Field>
          </div>

          {bom && (
            <div style={S.note}>
              {t({ en: "Product", ar: "المنتج" })}: <b>{nameOf(product || {}, isAr)}</b>
              {" · "}
              {t({ en: "BOM cost per unit", ar: "تكلفة الوحدة من القائمة" })}:{" "}
              <b>{money(bomCost(cfg, bom).unit)} AED</b>
              {" · "}
              {t({ en: "Estimated total", ar: "الإجمالي التقديري" })}:{" "}
              <b>{money(bomCost(cfg, bom).unit * num(qty, 0))} AED</b>
            </div>
          )}

          {bom && !effective && (
            <div style={S.err}>
              ⚠️ {t({
                en: "This BOM is outside its effectivity dates for the chosen date.",
                ar: "قائمة المواد خارج فترة سريانها للتاريخ المختار.",
              })}
            </div>
          )}

          {bom && (bom.byproducts || []).length > 0 && (
            <div style={S.ok}>
              🔀 {t({ en: "Also produces", ar: "بتنتج كمان" })}:{" "}
              {woByproductsFromBom(cfg, bom, num(qty, 0))
                .map((b) => `${nameOf(itemById(cfg, b.itemId) || {}, isAr)} (${money(b.qtyExpected, 2)})`)
                .join("، ")}
            </div>
          )}

          {shortages.length > 0 && (
            <div style={S.err}>
              ⚠️ {t({ en: "Not enough stock for", ar: "المخزون لا يكفي لـ" })}{" "}
              {shortages.map((l) => nameOf(itemById(cfg, l.itemId) || {}, isAr)).join("، ")}
              {" — "}
              {t({ en: "you can still create the order.", ar: "بتقدر تنشئ الأمر برضو." })}
            </div>
          )}

          {lines.length > 0 && (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, minWidth: 200 }}>{t({ en: "Component", ar: "المكوّن" })}</th>
                    <th style={S.th}>{t({ en: "Required", ar: "المطلوب" })}</th>
                    <th style={S.th}>{t({ en: "On hand", ar: "الرصيد" })}</th>
                    <th style={S.th}>{t({ en: "Unit cost", ar: "تكلفة الوحدة" })}</th>
                    <th style={S.th}>{t({ en: "Cost", ar: "التكلفة" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => {
                    const it = itemById(cfg, l.itemId);
                    const stock = onHand(cfg, l.itemId, orders, moves);
                    return (
                      <tr key={l.itemId}>
                        <td style={{ ...S.td, ...S.tdStart }}>{nameOf(it || {}, isAr) || l.itemId}</td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{money(l.qtyRequired, 3)} {it?.uom}</td>
                        <td style={{ ...S.td, color: stock < l.qtyRequired ? "#a12626" : "#047857" }}>
                          {money(stock, 2)}
                        </td>
                        <td style={S.td}>{money(l.unitCost)}</td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{money(l.qtyRequired * l.unitCost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

/* ══════════════ أمر مفتوح ══════════════ */

function OrderModal({ t, isAr, cfg, wo, orders, moves, canEdit, canDelete, busy, onClose, onSave, onDelete, onBackorder }) {
  const [form, setForm] = useState(() => JSON.parse(JSON.stringify(wo)));
  const dirty = JSON.stringify(form) !== JSON.stringify(wo);
  const locked = form.status === "done" || form.status === "cancelled" || !canEdit;

  const product = itemById(cfg, form.productId);
  const cost = woCost(form);
  const planned = woPlannedCost(cfg, form);
  const st = statusMeta(form.status);
  const policy = form.consumptionPolicy || "warn";
  const policyMeta = CONSUMPTION_POLICIES.find((p) => p.id === policy) || CONSUMPTION_POLICIES[1];

  const patch = (p) => setForm((f) => ({ ...f, ...p }));
  const patchLine = (itemId, p) =>
    setForm((f) => ({
      ...f,
      lines: (f.lines || []).map((l) => (l.itemId === itemId ? { ...l, ...p } : l)),
    }));
  const patchOp = (i, p) =>
    setForm((f) => ({ ...f, ops: (f.ops || []).map((o, k) => (k === i ? { ...o, ...p } : o)) }));
  const patchCheck = (opIdx, checkId, result) =>
    setForm((f) => ({
      ...f,
      ops: (f.ops || []).map((o, k) =>
        k === opIdx
          ? { ...o, checks: (o.checks || []).map((c) => (c.id === checkId ? { ...c, result } : c)) }
          : o
      ),
    }));
  const patchByproduct = (itemId, p) =>
    setForm((f) => ({
      ...f,
      byproducts: (f.byproducts || []).map((b) => (b.itemId === itemId ? { ...b, ...p } : b)),
    }));
  const addExtra = () =>
    setForm((f) => ({ ...f, extraCosts: [...(f.extraCosts || []), { label: "", amount: "" }] }));
  const patchExtra = (i, p) =>
    setForm((f) => ({
      ...f,
      extraCosts: (f.extraCosts || []).map((x, k) => (k === i ? { ...x, ...p } : x)),
    }));
  const removeExtra = (i) =>
    setForm((f) => ({ ...f, extraCosts: (f.extraCosts || []).filter((_, k) => k !== i) }));

  const confirm = () => {
    const next = {
      ...form,
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
      confirmedBy: userName(),
    };
    setForm(next);
    onSave(next);
  };

  const close = () => {
    const produced = num(form.qtyProduced) || num(form.qtyPlanned);

    // 1) سياسة الاستهلاك — الأسطر التي المستهلَك فيها ≠ المطلوب
    const deviations = consumptionDeviations(form);
    if (deviations.length) {
      const list = deviations
        .map((l) => nameOf(itemById(cfg, l.itemId) || {}, isAr))
        .join("، ");
      if (policy === "strict") {
        window.alert(t({
          en: `Strict consumption: consumed must equal required. Fix: ${list}`,
          ar: `سياسة صارمة: المستهلَك لازم يساوي المطلوب. صحّح: ${list}`,
        }));
        return;
      }
      if (policy === "warn" && !window.confirm(t({
        en: `Consumption differs from the BOM for: ${list}. Close anyway?`,
        ar: `الاستهلاك مختلف عن قائمة المواد لـ: ${list}. إقفال برضو؟`,
      }))) return;
    }

    // 2) فحوصات جودة راسبة
    const failed = failedChecks(form);
    if (failed.length) {
      const msg = t({
        en: `${failed.length} quality check(s) failed.`,
        ar: `${failed.length} فحص جودة راسب.`,
      });
      if (policy === "strict") {
        window.alert(`${msg} ${t({ en: "Cannot close.", ar: "لا يمكن الإقفال." })}`);
        return;
      }
      if (!window.confirm(`${msg} ${t({ en: "Close anyway?", ar: "إقفال برضو؟" })}`)) return;
    }

    // 3) إنتاج جزئي → أمر متبقّي (Backorder)
    const remaining = num(form.qtyPlanned) - produced;
    let makeBackorder = false;
    if (remaining > 0.000001) {
      makeBackorder = window.confirm(t({
        en: `Produced ${produced} of ${form.qtyPlanned}. Create a backorder for the remaining ${money(remaining, 2)}?`,
        ar: `أُنتج ${produced} من ${form.qtyPlanned}. إنشاء أمر متبقٍّ للـ ${money(remaining, 2)} الباقية؟`,
      }));
    }

    if (!window.confirm(t({
      en: `Close ${form.no}? Components will be deducted and by-products added to stock.`,
      ar: `إقفال ${form.no}؟ المكوّنات رح تنخصم والمنتجات الثانوية بتنضاف للمخزون.`,
    }))) return;

    const next = {
      ...form,
      qtyProduced: produced,
      status: "done",
      doneAt: new Date().toISOString(),
      doneBy: userName(),
    };
    setForm(next);
    onSave(next);
    if (makeBackorder) onBackorder(next, remaining);
  };

  const cancel = () => {
    if (!window.confirm(t({ en: `Cancel ${form.no}?`, ar: `إلغاء ${form.no}؟` }))) return;
    const next = { ...form, status: "cancelled" };
    setForm(next);
    onSave(next);
  };

  return (
    <Modal
      wide
      icon="🏭"
      title={`${form.no} — ${nameOf(product || {}, isAr) || t({ en: "product", ar: "منتج" })}`}
      onClose={onClose}
      footer={
        <>
          {canDelete && (
            <button type="button" style={{ ...S.btn, ...S.btnDanger }} onClick={onDelete} disabled={busy}>
              🗑 {t({ en: "Delete", ar: "حذف" })}
            </button>
          )}
          {form.status === "draft" && canEdit && (
            <button type="button" style={{ ...S.btn, ...S.btnBlue }} onClick={confirm} disabled={busy}>
              ▶ {t({ en: "Confirm & start", ar: "تأكيد وبدء" })}
            </button>
          )}
          {form.status === "confirmed" && canEdit && (
            <>
              <button type="button" style={{ ...S.btn, ...S.btnDanger }} onClick={cancel} disabled={busy}>
                {t({ en: "Cancel order", ar: "إلغاء الأمر" })}
              </button>
              <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={close} disabled={busy}>
                ✔ {t({ en: "Close & deduct stock", ar: "إقفال وخصم المخزون" })}
              </button>
            </>
          )}
          {dirty && form.status !== "done" && canEdit && (
            <button type="button" style={{ ...S.btn, ...S.btnBlue }} onClick={() => onSave(form)} disabled={busy}>
              💾 {t({ en: "Save", ar: "حفظ" })}
            </button>
          )}
          <button type="button" style={S.btn} onClick={onClose}>
            {t({ en: "Close", ar: "إغلاق" })}
          </button>
        </>
      }
    >
      <div style={S.chipRow}>
        <Badge color={st.color} bg={`${st.color}18`}>{nameOf(st, isAr)}</Badge>
        <Badge color="#14507f" bg="#eef4fb">
          {t({ en: "Consumption", ar: "الاستهلاك" })}: {nameOf(policyMeta, isAr)}
        </Badge>
        <span style={S.hint}>
          {form.bomRef} · v{form.bomVersion} · {form.date}
          {form.createdBy ? ` · ${form.createdBy}` : ""}
        </span>
      </div>

      <div style={S.grid}>
        <Field label={t({ en: "Planned quantity", ar: "الكمية المخطّطة" })}>
          <NumInput value={form.qtyPlanned} onChange={(v) => patch({ qtyPlanned: v })} disabled={locked} />
        </Field>
        <Field label={t({ en: "Produced quantity", ar: "الكمية المنتَجة" })}>
          <NumInput
            value={form.qtyProduced}
            onChange={(v) => patch({ qtyProduced: v })}
            disabled={form.status === "done" || !canEdit}
            placeholder={String(form.qtyPlanned || "")}
          />
        </Field>
        <Field label={t({ en: "Date", ar: "التاريخ" })}>
          <input type="date" style={S.input} value={form.date || ""} disabled={locked}
            onChange={(e) => patch({ date: e.target.value })} />
        </Field>
        <Field label={t({ en: "Notes", ar: "ملاحظات" })}>
          <TextInput value={form.notes} onChange={(v) => patch({ notes: v })} disabled={!canEdit} />
        </Field>
      </div>

      {/* المكوّنات — الخصم الآلي */}
      <Card
        icon="🧩"
        title={t({ en: "Components (backflush)", ar: "المكوّنات (الخصم الآلي)" })}
        sub={t({
          en: "Required comes from the BOM; edit consumed to record what was really used.",
          ar: "المطلوب من قائمة المواد؛ عدّل «المستهلك» ليعكس المصروف فعلياً.",
        })}
        style={{ boxShadow: "none", border: "1px solid #eef4fb" }}
      >
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, minWidth: 200 }}>{t({ en: "Component", ar: "المكوّن" })}</th>
                <th style={S.th}>{t({ en: "Required", ar: "المطلوب" })}</th>
                <th style={S.th}>{t({ en: "Consumed", ar: "المستهلك" })}</th>
                <th style={S.th}>{t({ en: "On hand", ar: "الرصيد" })}</th>
                <th style={S.th}>{t({ en: "Unit cost", ar: "تكلفة الوحدة" })}</th>
                <th style={S.th}>{t({ en: "Cost", ar: "التكلفة" })}</th>
              </tr>
            </thead>
            <tbody>
              {(form.lines || []).map((l) => {
                const it = itemById(cfg, l.itemId);
                const stock = onHand(cfg, l.itemId, orders.filter((o) => o._rid !== form._rid), moves);
                return (
                  <tr key={l.itemId}>
                    <td style={{ ...S.td, ...S.tdStart }}>
                      {it?.sku ? `[${it.sku}] ` : ""}{nameOf(it || {}, isAr) || l.itemId}
                    </td>
                    <td style={S.td}>{money(l.qtyRequired, 3)} {it?.uom}</td>
                    <td style={S.td}>
                      <input
                        style={S.inputSm}
                        disabled={locked}
                        value={l.qtyConsumed ?? ""}
                        inputMode="decimal"
                        onChange={(e) => patchLine(l.itemId, { qtyConsumed: e.target.value })}
                      />
                    </td>
                    <td style={{ ...S.td, color: stock < num(l.qtyConsumed) ? "#a12626" : "#6b8299" }}>
                      {money(stock, 2)}
                    </td>
                    <td style={S.td}>
                      <input
                        style={S.inputSm}
                        disabled={locked}
                        value={l.unitCost ?? ""}
                        inputMode="decimal"
                        onChange={(e) => patchLine(l.itemId, { unitCost: e.target.value })}
                      />
                    </td>
                    <td style={{ ...S.td, fontWeight: 800 }}>
                      {money(num(l.qtyConsumed) * num(l.unitCost))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* المنتجات الثانوية — تدخل المخزون عند الإقفال */}
      {(form.byproducts || []).length > 0 && (
        <Card
          icon="🔀"
          title={t({ en: "By-products produced", ar: "المنتجات الثانوية المنتَجة" })}
          sub={t({
            en: "Expected comes from the BOM; edit produced to record the real output. Added to stock on close.",
            ar: "المتوقّع من قائمة المواد؛ عدّل «المنتَج» للكمية الفعلية. بتنضاف للمخزون عند الإقفال.",
          })}
          style={{ boxShadow: "none", border: "1px solid #eef4fb" }}
        >
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, minWidth: 200 }}>{t({ en: "By-product", ar: "المنتج الثانوي" })}</th>
                  <th style={S.th}>{t({ en: "Expected", ar: "المتوقّع" })}</th>
                  <th style={S.th}>{t({ en: "Produced", ar: "المنتَج" })}</th>
                  <th style={S.th}>{t({ en: "On hand now", ar: "الرصيد الآن" })}</th>
                </tr>
              </thead>
              <tbody>
                {(form.byproducts || []).map((b) => {
                  const it = itemById(cfg, b.itemId);
                  const stock = onHand(cfg, b.itemId, orders.filter((o) => o._rid !== form._rid), moves);
                  return (
                    <tr key={b.itemId}>
                      <td style={{ ...S.td, ...S.tdStart }}>
                        {it?.sku ? `[${it.sku}] ` : ""}{nameOf(it || {}, isAr) || b.itemId}
                      </td>
                      <td style={S.td}>{money(b.qtyExpected, 3)} {it?.uom}</td>
                      <td style={S.td}>
                        <input
                          style={S.inputSm}
                          disabled={form.status === "done" || !canEdit}
                          value={b.qtyProduced ?? ""}
                          inputMode="decimal"
                          onChange={(e) => patchByproduct(b.itemId, { qtyProduced: e.target.value })}
                        />
                      </td>
                      <td style={{ ...S.td, color: "#6b8299" }}>{money(stock, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ورقة العمل وفحوصات الجودة لكل عملية */}
      {(form.ops || []).some((o) => o.instructions || (o.checks || []).length) && (
        <Card
          icon="📋"
          title={t({ en: "Worksheet & quality checks", ar: "ورقة العمل وفحوصات الجودة" })}
          sub={t({
            en: "Follow the instructions and mark each check. Fails may block closing depending on the policy.",
            ar: "اتبع التعليمات وحدّد كل فحص. الرسوب قد يمنع الإقفال حسب السياسة.",
          })}
          style={{ boxShadow: "none", border: "1px solid #eef4fb" }}
        >
          {(form.ops || []).map((o, i) => {
            const wc = opById(cfg, o.opId);
            if (!o.instructions && !(o.checks || []).length) return null;
            return (
              <div key={`ws-${i}`} style={{
                border: "1px solid #eef4fb", borderRadius: 12, padding: 12,
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                <div style={{ fontWeight: 900, color: "#14507f" }}>
                  {i + 1}. {nameOf(wc || {}, isAr) || t({ en: "operation", ar: "عملية" })}
                </div>
                {o.instructions && (
                  <div style={{ ...S.note, whiteSpace: "pre-wrap" }}>{o.instructions}</div>
                )}
                {(o.checks || []).map((c) => (
                  <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ flex: 1, fontWeight: 700, minWidth: 180 }}>✔️ {c.text || "—"}</span>
                    <div style={S.chipRow}>
                      {CHECK_RESULTS.filter((r) => r.id).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          disabled={locked}
                          onClick={() => patchCheck(i, c.id, c.result === r.id ? "" : r.id)}
                          style={{
                            ...S.btn, ...S.btnSm,
                            ...(c.result === r.id
                              ? { background: r.color, color: "#fff", border: `1.5px solid ${r.color}` }
                              : null),
                          }}
                        >
                          {nameOf(r, isAr)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </Card>
      )}

      {/* العمليات + تكاليف إضافية */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(340px,100%),1fr))", gap: 14 }}>
        <Card icon="⚙️" title={t({ en: "Operations", ar: "العمليات" })}
          style={{ boxShadow: "none", border: "1px solid #eef4fb" }}>
          {(form.ops || []).length === 0 ? (
            <EmptyBox>{t({ en: "No operations.", ar: "لا عمليات." })}</EmptyBox>
          ) : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{t({ en: "Work centre", ar: "مركز العمل" })}</th>
                    <th style={S.th}>{t({ en: "Minutes", ar: "دقائق" })}</th>
                    <th style={S.th}>{t({ en: "Rate", ar: "السعر" })}</th>
                    <th style={S.th}>{t({ en: "Cost", ar: "التكلفة" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {(form.ops || []).map((o, i) => (
                    <tr key={`${o.opId}-${i}`}>
                      <td style={{ ...S.td, ...S.tdStart }}>
                        {nameOf(opById(cfg, o.opId) || {}, isAr) || "—"}
                      </td>
                      <td style={S.td}>
                        <input style={S.inputSm} disabled={locked} value={o.minutes ?? ""} inputMode="decimal"
                          onChange={(e) => patchOp(i, { minutes: e.target.value })} />
                      </td>
                      <td style={S.td}>
                        <input style={S.inputSm} disabled={locked} value={o.costPerHour ?? ""} inputMode="decimal"
                          onChange={(e) => patchOp(i, { costPerHour: e.target.value })} />
                      </td>
                      <td style={{ ...S.td, fontWeight: 800 }}>
                        {money((num(o.minutes) / 60) * num(o.costPerHour))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          icon="💸"
          title={t({ en: "Extra costs", ar: "تكاليف إضافية" })}
          style={{ boxShadow: "none", border: "1px solid #eef4fb" }}
          right={
            !locked && (
              <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={addExtra}>
                ＋
              </button>
            )
          }
        >
          {(form.extraCosts || []).length === 0 ? (
            <EmptyBox>{t({ en: "None.", ar: "لا شي." })}</EmptyBox>
          ) : (
            (form.extraCosts || []).map((x, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input style={S.input} disabled={locked} value={x.label || ""}
                  placeholder={t({ en: "Label", ar: "البند" })}
                  onChange={(e) => patchExtra(i, { label: e.target.value })} />
                <input style={S.inputSm} disabled={locked} value={x.amount ?? ""} inputMode="decimal"
                  onChange={(e) => patchExtra(i, { amount: e.target.value })} />
                {!locked && (
                  <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnDanger }}
                    onClick={() => removeExtra(i)}>
                    ✕
                  </button>
                )}
              </div>
            ))
          )}
        </Card>
      </div>

      <div style={S.kpiRow}>
        <Kpi label={t({ en: "Material", ar: "المواد" })} value={money(cost.material)} foot="AED" />
        <Kpi label={t({ en: "Labor", ar: "التشغيل" })} value={money(cost.labor)} foot="AED" />
        <Kpi label={t({ en: "Extras", ar: "إضافية" })} value={money(cost.extra)} foot="AED" />
        <Kpi label={t({ en: "Actual total", ar: "الإجمالي الفعلي" })} value={money(cost.total)} foot="AED" color="#0f766e" />
        <Kpi
          label={t({ en: "vs planned", ar: "مقابل المخطّط" })}
          value={`${cost.total - planned.total >= 0 ? "+" : ""}${money(cost.total - planned.total)}`}
          foot={`${t({ en: "planned", ar: "المخطّط" })} ${money(planned.total)}`}
          color={cost.total > planned.total ? "#a12626" : "#047857"}
        />
      </div>

      {form.status === "done" && (
        <div style={S.ok}>
          ✔ {t({ en: "Closed on", ar: "أُقفل بتاريخ" })}{" "}
          {form.doneAt ? new Date(form.doneAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "—"}
          {form.doneBy ? ` — ${form.doneBy}` : ""}
          {" · "}
          {t({ en: "unit cost", ar: "تكلفة الوحدة" })}: <b>{money(cost.unit)} AED</b>
        </div>
      )}
    </Modal>
  );
}
