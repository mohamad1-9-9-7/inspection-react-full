// src/pages/mrp/MrpBom.jsx
//
// 2️⃣ قوائم التفكيك والتقطيع (Disassembly / Cutting BOM).
// One input product → many output products + waste, all from the Item Master.
//
// طبيعة الشغل: ذبيحة/منتج واحد داخل → مجموعة قطع ناتجة + هدر (عظم، دهن، فقد).
// كل الأطراف (الداخل · الناتج · الهدر) بتنسحب من سجل الأصناف بالكود الماستر.
//
// 💾 الحفظ: كل قائمة بتنحفظ لحالها بزر «حفظ القائمة» بترويسة الباني —
// ما في شريط حفظ أسفل الصفحة. عمليات الجدول (تفعيل/نسخ/حذف) بتنحفظ فوراً.

import React, { useMemo, useRef, useState } from "react";
import {
  ITEM_TYPES, activeOnly, categoryById, freshId, hasRole, itemById, money,
  mutateConfig, nameOf, num, useMrpConfig, userName,
} from "./mrpApi";
import {
  Badge, Card, EmptyBox, Field, ItemPicker, Kpi, Modal, MrpNoAccess, MrpShell,
  NumInput, S, SearchBox, Select, Switch, Toast, canEditMrp, canOpenMrp,
} from "./mrpUi";
import { useSettingsLang } from "../settings/_shared/settingsI18n";

const PAGE = "mrp.bom";

/** رقم قائمة تقطيع جديد — CUT-0001 حسب الموجود. */
function nextRef(boms) {
  const max = (boms || []).reduce((m, b) => {
    const n = parseInt(String(b.ref || "").replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `CUT-${String(max + 1).padStart(4, "0")}`;
}

const blankBom = (boms) => ({
  id: freshId("bom"),
  ref: nextRef(boms),
  bomType: "disassembly",
  categoryId: "",
  inputId: "",
  inputQty: 100,
  outputs: [],
  wastes: [],
  notes: "",
  active: true,
  version: 1,
  history: [],
  createdAt: new Date().toISOString(),
  createdBy: userName(),
});

/** تجميع أرقام القائمة — الداخل، الناتج، الهدر، الفاقد غير المسجّل، والعائد. */
function bomMath(bom) {
  const input = num(bom?.inputQty);
  const out = (bom?.outputs || []).reduce((s, l) => s + num(l.qty), 0);
  const waste = (bom?.wastes || []).reduce((s, l) => s + num(l.qty), 0);
  const loss = input - out - waste;               // فاقد غير مسجّل (تبخّر/انكماش…)
  const yieldPct = input > 0 ? (out / input) * 100 : 0;
  const wastePct = input > 0 ? (waste / input) * 100 : 0;
  const over = loss < -1e-6;                      // موزّع أكثر من الداخل = خطأ
  return { input, out, waste, loss, yieldPct, wastePct, over };
}

export default function MrpBom() {
  const { t, isAr } = useSettingsLang();
  const { cfg, setCfg, loading } = useMrpConfig();

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [draft, setDraft] = useState(null);   // { mode: "new"|"edit", bom, dirty }
  const [historyFor, setHistoryFor] = useState("");

  const canEdit = canEditMrp();
  const toastTimer = useRef(null);

  const flash = (text, bad) => {
    setToast({ text, bad: !!bad });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3600);
  };

  /**
   * تعديل + حفظ فوري مستقل — اقرأ أحدث نسخة من السيرفر ثم عدّل ثم احفظ،
   * حتى ما تندهس قائمة عدّلها جهاز تاني بنفس الوقت.
   */
  const commit = async (fn, okMsg) => {
    if (busy) return false;
    setBusy(true);
    try {
      const saved = await mutateConfig((next) => {
        if (!Array.isArray(next.boms)) next.boms = [];
        fn(next);
      });
      setCfg(saved);
      if (okMsg) flash(okMsg);
      return true;
    } catch (e) {
      flash(`${t({ en: "Save failed", ar: "فشل الحفظ" })}: ${e?.message || e}`, true);
      return false;
    } finally {
      setBusy(false);
    }
  };

  /* ── فتح/إنشاء ── */
  const openNew = () => setDraft({ mode: "new", bom: blankBom(cfg.boms), dirty: false });

  const openBom = (b) => {
    const legacy = b.bomType !== "disassembly" && (b.lines || []).length > 0;
    // قائمة تصنيع قديمة: التحويل بيشيلها من أوامر التصنيع — لازم قرار صريح
    if (legacy && !window.confirm(t({
      en: `${b.ref} is an old manufacturing BOM.\nOpening it here converts it to a cutting BOM when you save, and work orders will stop using it.\n\nContinue?`,
      ar: `${b.ref} قائمة تصنيع قديمة.\nفتحها هون بيحوّلها لقائمة تقطيع وقت ما تحفظ، وأوامر التصنيع بتوقف تستعملها.\n\nمتابعة؟`,
    }))) return;
    setDraft({
      mode: "edit",
      // نضمن حقول التفكيك حتى للسجلات القديمة — بلا دهس باقي الحقول
      bom: {
        outputs: [], wastes: [], inputId: "", inputQty: "",
        ...JSON.parse(JSON.stringify(b)),
        bomType: "disassembly",
      },
      dirty: false,
    });
  };

  const closeBuilder = () => {
    if (draft?.dirty && !window.confirm(t({
      en: "Discard unsaved changes to this BOM?",
      ar: "تجاهل التعديلات غير المحفوظة على هذه القائمة؟",
    }))) return;
    setDraft(null);
  };

  const patch = (p) => setDraft((d) => ({ ...d, dirty: true, bom: { ...d.bom, ...p } }));
  const patchList = (list, id, p) =>
    setDraft((d) => ({
      ...d, dirty: true,
      bom: { ...d.bom, [list]: (d.bom[list] || []).map((l) => (l.id === id ? { ...l, ...p } : l)) },
    }));
  const addTo = (list) =>
    setDraft((d) => ({
      ...d, dirty: true,
      bom: { ...d.bom, [list]: [...(d.bom[list] || []), { id: freshId("ln"), itemId: "", qty: "" }] },
    }));
  const dropFrom = (list, id) =>
    setDraft((d) => ({
      ...d, dirty: true,
      bom: { ...d.bom, [list]: (d.bom[list] || []).filter((l) => l.id !== id) },
    }));

  /* ── تحقق قبل الحفظ ── */
  const validate = (bom) => {
    if (!bom.inputId) {
      return t({ en: "Pick the input product first.", ar: "اختر المنتج الداخل أولاً." });
    }
    const inItem = itemById(cfg, bom.inputId);
    if (inItem && (hasRole(inItem, "finished") || hasRole(inItem, "waste"))) {
      return t({
        en: `"${nameOf(inItem, false) || bom.inputId}" is a finished/waste item — the input must be a raw material or a component.`,
        ar: `«${nameOf(inItem, true) || bom.inputId}» منتج نهائي/هدر — الداخل لازم يكون مادة خام أو مكوّن.`,
      });
    }
    if (!(num(bom.inputQty) > 0)) {
      return t({ en: "Input quantity must be more than zero.", ar: "كمية الداخل لازم تكون أكبر من صفر." });
    }
    if ((bom.outputs || []).length === 0) {
      return t({ en: "A cutting BOM needs at least one output.", ar: "قائمة التقطيع بدها ناتج واحد على الأقل." });
    }
    const all = [...(bom.outputs || []), ...(bom.wastes || [])];
    if (all.some((l) => !l.itemId)) {
      return t({ en: "Every line must pick an item from the master list.", ar: "كل سطر لازم يختار صنف من السجل." });
    }
    // الكميات اختيارية — بتقدر تحفظ الهيكل وتعبّي الأوزان لاحقاً
    const inItemName = nameOf(inItem, isAr) || bom.inputId;
    if (all.some((l) => l.itemId === bom.inputId)) {
      return t({
        en: `Duplicate: "${inItemName}" is the input product — it cannot also be listed as an output or waste. Remove that line.`,
        ar: `مكرّر: «${inItemName}» هو المنتج الداخل — ما بيصير ينضاف كناتج أو هدر كمان. احذف هالسطر.`,
      });
    }
    const seen = new Set();
    for (const l of all) {
      if (seen.has(l.itemId)) {
        const it = itemById(cfg, l.itemId);
        return t({
          en: `Duplicate: "${nameOf(it, false) || l.itemId}" is listed twice — each item may appear only once. Merge its lines.`,
          ar: `مكرّر: «${nameOf(it, true) || l.itemId}» موجود بسطرين — كل صنف بيجي مرة وحدة بس. ادمجهم.`,
        });
      }
      seen.add(l.itemId);
    }
    if (bomMath(bom).over) {
      return t({
        en: "Outputs + waste exceed the input quantity — fix the mass balance.",
        ar: "الناتج + الهدر أكثر من كمية الداخل — صحّح الميزان.",
      });
    }
    return "";
  };

  const saveBom = async () => {
    const bom = { ...draft.bom, updatedAt: new Date().toISOString(), updatedBy: userName() };
    const err = validate(bom);
    if (err) { flash(err, true); return; }
    const isNew = draft.mode === "new";
    const ok = await commit(
      (n) => {
        const i = n.boms.findIndex((x) => x.id === bom.id);
        if (i >= 0) n.boms[i] = bom; else n.boms.push(bom);
      },
      t({ en: `${bom.ref} saved.`, ar: `تم حفظ ${bom.ref}.` })
    );
    if (ok) setDraft({ mode: "edit", bom, dirty: false });
    return ok;
  };

  /** إصدار جديد — لقطة من النسخة المحفوظة ثم رفع الرقم (بينحفظ فوراً). */
  const bumpVersion = async () => {
    if (draft.dirty) {
      flash(t({ en: "Save the BOM first, then take a version.", ar: "احفظ القائمة أولاً وبعدين خُد إصدار." }), true);
      return;
    }
    const b = draft.bom;
    const snapshot = {
      version: num(b.version, 1),
      at: new Date().toISOString(),
      by: userName(),
      inputId: b.inputId, inputQty: b.inputQty,
      outputs: JSON.parse(JSON.stringify(b.outputs || [])),
      wastes: JSON.parse(JSON.stringify(b.wastes || [])),
    };
    const bumped = {
      ...b,
      history: [...(b.history || []).slice(-49), snapshot],
      version: num(b.version, 1) + 1,
    };
    const ok = await commit(
      (n) => {
        const i = n.boms.findIndex((x) => x.id === b.id);
        if (i >= 0) n.boms[i] = bumped;
      },
      t({ en: `Version v${bumped.version} opened.`, ar: `تم فتح الإصدار v${bumped.version}.` })
    );
    if (ok) setDraft({ mode: "edit", bom: bumped, dirty: false });
  };

  const restoreVersion = async (snapshot) => {
    if (!window.confirm(t({
      en: `Restore version ${snapshot.version}? The current one stays in the history.`,
      ar: `استرجاع الإصدار ${snapshot.version}؟ الحالي بيضل بالسجل.`,
    }))) return;
    const b = draft.bom;
    const snap = {
      version: num(b.version, 1), at: new Date().toISOString(), by: userName(),
      inputId: b.inputId, inputQty: b.inputQty,
      outputs: JSON.parse(JSON.stringify(b.outputs || [])),
      wastes: JSON.parse(JSON.stringify(b.wastes || [])),
    };
    const restored = {
      ...b,
      history: [...(b.history || []).slice(-49), snap],
      version: num(b.version, 1) + 1,
      inputId: snapshot.inputId,
      inputQty: snapshot.inputQty,
      outputs: JSON.parse(JSON.stringify(snapshot.outputs || [])),
      wastes: JSON.parse(JSON.stringify(snapshot.wastes || [])),
    };
    const ok = await commit(
      (n) => {
        const i = n.boms.findIndex((x) => x.id === b.id);
        if (i >= 0) n.boms[i] = restored;
      },
      t({ en: `Version ${snapshot.version} restored.`, ar: `تم استرجاع الإصدار ${snapshot.version}.` })
    );
    if (ok) {
      setDraft({ mode: "edit", bom: restored, dirty: false });
      setHistoryFor("");
    }
  };

  /* ── عمليات القائمة (حفظ فوري) ── */
  const toggleActive = (b, v) =>
    commit((n) => {
      const x = n.boms.find((y) => y.id === b.id);
      if (x) x.active = v;
    }, v
      ? t({ en: `${b.ref} activated.`, ar: `تم تفعيل ${b.ref}.` })
      : t({ en: `${b.ref} deactivated.`, ar: `تم تعطيل ${b.ref}.` }));

  const duplicateBom = async (b) => {
    const copy = {
      ...JSON.parse(JSON.stringify(b)),
      id: freshId("bom"),
      ref: nextRef(cfg.boms),
      version: 1,
      history: [],
      active: false,
      createdAt: new Date().toISOString(),
      createdBy: userName(),
    };
    const ok = await commit(
      (n) => { n.boms.push(copy); },
      t({ en: `Copied to ${copy.ref} (inactive).`, ar: `تم النسخ إلى ${copy.ref} (معطّلة).` })
    );
    if (ok) setDraft({ mode: "edit", bom: copy, dirty: false });
  };

  const removeBom = async (b) => {
    if (!window.confirm(t({
      en: `Delete ${b.ref}? This is saved immediately.`,
      ar: `حذف ${b.ref}؟ الحذف بينحفظ فوراً.`,
    }))) return;
    const ok = await commit(
      (n) => { n.boms = n.boms.filter((x) => x.id !== b.id); },
      t({ en: `${b.ref} deleted.`, ar: `تم حذف ${b.ref}.` })
    );
    if (ok && draft?.bom?.id === b.id) setDraft(null);
  };

  /* ── جدول القوائم ── */
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (cfg.boms || [])
      .map((b) => ({
        b,
        input: itemById(cfg, b.inputId),
        math: bomMath(b),
        cat: nameOf(categoryById(cfg, b.categoryId) || {}, isAr),
        legacy: b.bomType !== "disassembly" && (b.lines || []).length > 0,
      }))
      .filter(({ b, input, cat }) => {
        if (catFilter && (b.categoryId || "") !== catFilter) return false;
        if (!needle) return true;
        return [b.ref, input?.sku, input?.ar, input?.en, cat]
          .some((v) => String(v || "").toLowerCase().includes(needle));
      });
  }, [cfg, q, catFilter, isAr]);

  if (!canOpenMrp(PAGE)) return <MrpNoAccess page={PAGE} />;

  const histBom = historyFor && draft ? draft.bom : null;

  return (
    <MrpShell
      pageId={PAGE}
      icon="🔪"
      title={t({ en: "Cutting BOMs", ar: "قوائم التفكيك والتقطيع" })}
      sub={t({
        en: "One input product → output cuts + waste, straight from the item master",
        ar: "منتج واحد داخل → قطع ناتجة + هدر، كله من سجل الأصناف",
      })}
      actions={
        canEdit && !draft && (
          <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={openNew}>
            ＋ {t({ en: "New cutting BOM", ar: "قائمة تقطيع جديدة" })}
          </button>
        )
      }
    >
      <Toast toast={toast} busy={busy} t={t} />

      {!draft ? (
        <Card
          icon="🔪"
          title={t({ en: "All cutting BOMs", ar: "كل قوائم التقطيع" })}
          sub={t({
            en: "Yield % = outputs ÷ input. Activate one BOM per input product.",
            ar: "العائد ٪ = الناتج ÷ الداخل. فعّل قائمة وحدة لكل منتج داخل.",
          })}
          right={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <SearchBox value={q} onChange={setQ}
                placeholder={t({ en: "Search ref, input or category…", ar: "بحث بالرقم أو الداخل أو الفئة…" })} />
              <select
                style={{
                  ...S.input, width: 175,
                  ...(catFilter ? { borderColor: "#1f6fd0", background: "#f7fbff" } : null),
                }}
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
              >
                <option value="">{t({ en: "All categories", ar: "كل الفئات" })}</option>
                {activeOnly(cfg.categories).map((c) => (
                  <option key={c.id} value={c.id}>{nameOf(c, isAr) || c.id}</option>
                ))}
              </select>
            </div>
          }
        >
          {loading && !rows.length ? (
            <EmptyBox>{t({ en: "Loading…", ar: "جارٍ التحميل…" })}</EmptyBox>
          ) : rows.length === 0 ? (
            <EmptyBox>
              {t({
                en: "No cutting BOM yet — press “New cutting BOM” to define your first breakdown.",
                ar: "لا توجد قوائم بعد — اضغط «قائمة تقطيع جديدة» لتعريف أول تفكيك.",
              })}
            </EmptyBox>
          ) : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{t({ en: "Ref", ar: "الرقم" })}</th>
                    <th style={S.th}>{t({ en: "Category", ar: "الفئة" })}</th>
                    <th style={S.th}>{t({ en: "Input product", ar: "المنتج الداخل" })}</th>
                    <th style={S.th}>{t({ en: "Input qty", ar: "كمية الداخل" })}</th>
                    <th style={S.th}>{t({ en: "Outputs", ar: "النواتج" })}</th>
                    <th style={S.th}>{t({ en: "Waste", ar: "الهدر" })}</th>
                    <th style={S.th}>{t({ en: "Yield", ar: "العائد" })}</th>
                    <th style={S.th}>{t({ en: "Version", ar: "الإصدار" })}</th>
                    <th style={S.th}>{t({ en: "Active", ar: "مفعّلة" })}</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ b, input, math, cat, legacy }) => (
                    <tr key={b.id}>
                      <td style={{ ...S.td, fontWeight: 900 }}>
                        {b.ref}
                        {legacy && (
                          <div><Badge color="#b45309" bg="#fffbeb">{t({ en: "legacy", ar: "قديمة" })}</Badge></div>
                        )}
                      </td>
                      <td style={S.td}>
                        {cat
                          ? <Badge color="#1f6fd0" bg="#eaf2fc">{cat}</Badge>
                          : <span style={{ color: "#8aa3b8" }}>—</span>}
                      </td>
                      <td style={{ ...S.td, ...S.tdStart }}>
                        {input
                          ? `${input.sku ? `[${input.sku}] ` : ""}${nameOf(input, isAr) || input.id}`
                          : <span style={{ color: "#a12626" }}>⚠️ {t({ en: "no input", ar: "بلا داخل" })}</span>}
                      </td>
                      <td style={S.td}>{math.input ? `${money(math.input, 2)} ${input?.uom || ""}` : "—"}</td>
                      <td style={S.td}>
                        {(b.outputs || []).length}
                        <span style={S.hint}> · {money(math.out, 1)}</span>
                      </td>
                      <td style={S.td}>
                        {(b.wastes || []).length}
                        <span style={S.hint}> · {money(math.waste, 1)}</span>
                      </td>
                      <td style={{
                        ...S.td, fontWeight: 900,
                        color: math.yieldPct >= 60 ? "#047857" : math.yieldPct > 0 ? "#b45309" : "#6b8299",
                      }}>
                        {math.input ? `${math.yieldPct.toFixed(1)}%` : "—"}
                      </td>
                      <td style={S.td}>
                        <Badge color="#14507f" bg="#eef4fb">v{num(b.version, 1)}</Badge>
                      </td>
                      <td style={S.td}>
                        <Switch
                          checked={b.active !== false}
                          disabled={!canEdit || busy}
                          onChange={(v) => toggleActive(b, v)}
                        />
                      </td>
                      <td style={S.td}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                          <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={() => openBom(b)}>
                            {canEdit ? `✎ ${t({ en: "Open", ar: "فتح" })}` : t({ en: "View", ar: "عرض" })}
                          </button>
                          {canEdit && (
                            <>
                              <button type="button" style={{ ...S.btn, ...S.btnSm, ...(busy ? S.btnOff : null) }}
                                disabled={busy} onClick={() => duplicateBom(b)}
                                title={t({ en: "Duplicate", ar: "نسخ" })}>
                                ⧉
                              </button>
                              <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnDanger, ...(busy ? S.btnOff : null) }}
                                disabled={busy} onClick={() => removeBom(b)}>
                                🗑
                              </button>
                            </>
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
      ) : (
        <CutBuilder
          t={t} isAr={isAr} cfg={cfg} draft={draft} canEdit={canEdit} busy={busy}
          notify={flash}
          onBack={closeBuilder}
          onSave={saveBom}
          onDelete={() => removeBom(draft.bom)}
          onBump={bumpVersion}
          onHistory={() => setHistoryFor(draft.bom.id)}
          patch={patch} patchList={patchList} addTo={addTo} dropFrom={dropFrom}
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
                    <th style={S.th}>{t({ en: "Outputs", ar: "نواتج" })}</th>
                    <th style={S.th}>{t({ en: "Waste", ar: "هدر" })}</th>
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
                      <td style={S.td}>{(h.outputs || []).length}</td>
                      <td style={S.td}>{(h.wastes || []).length}</td>
                      <td style={S.td}>
                        {canEdit && (
                          <button type="button" style={{ ...S.btn, ...S.btnSm, ...(busy ? S.btnOff : null) }}
                            disabled={busy} onClick={() => restoreVersion(h)}>
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
    </MrpShell>
  );
}

/* ══════════════ باني قائمة التقطيع ══════════════ */

function CutBuilder({
  t, isAr, cfg, draft, canEdit, busy, notify,
  onBack, onSave, onDelete, onBump, onHistory,
  patch, patchList, addTo, dropFrom,
}) {
  const bom = draft.bom;
  const isNew = draft.mode === "new";
  const input = itemById(cfg, bom.inputId);
  const math = bomMath(bom);
  const uom = input?.uom || "";

  // كل الأصناف المستعملة بالقائمة (نواتج + هدر) — لمنع التكرار عبر السطور
  const usedIds = useMemo(
    () => [...(bom.outputs || []), ...(bom.wastes || [])].map((l) => l.itemId).filter(Boolean),
    [bom.outputs, bom.wastes]
  );

  /** سبب منع صنف بجداول الناتج/الهدر — بيظهر بالقائمة بس ما بينضاف. */
  const lineDisabledFor = (curItemId) => (i) => {
    if (i.id === bom.inputId) {
      return t({ en: "same as input", ar: "هو الداخل" });
    }
    if (i.id !== curItemId && usedIds.includes(i.id)) {
      return t({ en: "already added", ar: "مضاف مسبقاً" });
    }
    return "";
  };
  const onLineBlocked = (i, reason) => {
    const nm = nameOf(i, isAr) || i.sku || i.id;
    if (reason === t({ en: "same as input", ar: "هو الداخل" })) {
      notify?.(t({
        en: `Duplicate: "${nm}" is the input product — it can't also be an output or waste.`,
        ar: `مكرّر: «${nm}» هو المنتج الداخل — ما بيصير يكون ناتج أو هدر كمان.`,
      }), true);
    } else {
      notify?.(t({
        en: `Duplicate: "${nm}" is already added in this BOM.`,
        ar: `مكرّر: «${nm}» مضاف مسبقاً بهالقائمة.`,
      }), true);
    }
  };

  return (
    <>
      <Card
        icon="🔪"
        title={
          <span style={{ display: "inline-flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {bom.ref} — {input ? nameOf(input, isAr) || input.id : t({ en: "pick the input", ar: "اختر الداخل" })}
            {draft.dirty && (
              <Badge color="#b45309" bg="#fffbeb">● {t({ en: "unsaved", ar: "غير محفوظ" })}</Badge>
            )}
            {isNew && (
              <Badge color="#1f6fd0" bg="#eef4fb">{t({ en: "new — not saved yet", ar: "جديدة — لسا ما انحفظت" })}</Badge>
            )}
          </span>
        }
        sub={t({
          en: "Define how one input breaks into cuts and waste. Nothing is stored until you press Save.",
          ar: "عرّف كيف الداخل بيتفكّك لقطع وهدر. ما بينحفظ إشي قبل ما تضغط حفظ.",
        })}
        right={
          <>
            <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={onBack}>
              ← {t({ en: "All BOMs", ar: "كل القوائم" })}
            </button>
            {!isNew && (
              <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={onHistory}>
                🕓 v{num(bom.version, 1)}
              </button>
            )}
            {canEdit && !isNew && (
              <>
                <button type="button" style={{ ...S.btn, ...S.btnSm, ...(busy ? S.btnOff : null) }}
                  disabled={busy} onClick={onBump}>
                  ＋ {t({ en: "New version", ar: "إصدار جديد" })}
                </button>
                <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnDanger, ...(busy ? S.btnOff : null) }}
                  disabled={busy} onClick={onDelete}>
                  🗑
                </button>
              </>
            )}
            {canEdit && (
              <button
                type="button"
                style={{ ...S.btn, ...S.btnSm, ...S.btnPrimary, ...(busy || !draft.dirty ? S.btnOff : null) }}
                disabled={busy || !draft.dirty}
                onClick={onSave}
              >
                {busy
                  ? t({ en: "Saving…", ar: "جارٍ الحفظ…" })
                  : `💾 ${t({ en: "Save BOM", ar: "حفظ القائمة" })}`}
              </button>
            )}
          </>
        }
      >
        <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <div style={S.grid}>
            <Field label={t({ en: "Input product (from item master)", ar: "المنتج الداخل (من سجل الأصناف)" })}>
              <ItemPicker
                cfg={cfg}
                value={bom.inputId}
                onPick={(id) => patch({ inputId: id })}
                isAr={isAr}
                t={t}
                prefer={["raw", "component"]}
                // بيظهروا بالقائمة بس ما بينضافوا — المنتج النهائي والهدر ما بيصيروا مدخلات
                disabledFor={(i) =>
                  (hasRole(i, "finished") || hasRole(i, "waste"))
                    ? t({ en: "finished/waste — not an input", ar: "نهائي/هدر — مش مدخل" })
                    : ""}
                onBlocked={(i) => notify?.(t({
                  en: `"${nameOf(i, false) || i.sku || i.id}" is a finished/waste item — the input must be a raw material or a component.`,
                  ar: `«${nameOf(i, true) || i.sku || i.id}» منتج نهائي/هدر — الداخل لازم يكون مادة خام أو مكوّن.`,
                }), true)}
                placeholder={t({ en: "carcass / primal…", ar: "ذبيحة / قطعة أساسية…" })}
              />
            </Field>
            <Field label={`${t({ en: "Input quantity", ar: "كمية الداخل" })}${uom ? ` (${uom})` : ""}`}>
              <NumInput
                value={bom.inputQty}
                onChange={(v) => patch({ inputQty: v })}
                // يتنسّق لرقمين بعد الفاصلة عند مغادرة الحقل
                onBlur={() => {
                  const v = num(bom.inputQty);
                  if (String(bom.inputQty ?? "").trim() !== "") patch({ inputQty: v.toFixed(2) });
                }}
              />
              <span style={{ ...S.hint, marginTop: 4 }}>
                {num(bom.inputQty) > 0
                  ? `${money(num(bom.inputQty), 2)} ${uom || ""}`
                  : t({ en: "optional — you can fill it later", ar: "اختياري — فيك تعبّيها لاحقاً" })}
              </span>
            </Field>
            <Field label={t({ en: "Category", ar: "الفئة" })}>
              <Select
                value={bom.categoryId}
                onChange={(v) => patch({ categoryId: v })}
                options={activeOnly(cfg.categories)}
                isAr={isAr}
                placeholder={t({ en: "— none —", ar: "— بلا —" })}
              />
            </Field>
            <Field label={t({ en: "Notes", ar: "ملاحظات" })}>
              <TextInputLike value={bom.notes} onChange={(v) => patch({ notes: v })} />
            </Field>
          </div>
          <div style={{ ...S.chipRow, marginTop: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800 }}>
              <Switch checked={bom.active !== false} onChange={(v) => patch({ active: v })} />
              {t({ en: "Active BOM", ar: "قائمة مفعّلة" })}
            </label>
            <span style={S.hint}>
              {t({
                en: "Tip: 100 KG input makes every line read directly as a percentage.",
                ar: "نصيحة: داخل ١٠٠ كجم بيخلي كل سطر ينقرأ كنسبة مئوية مباشرة.",
              })}
            </span>
          </div>
        </fieldset>
      </Card>

      {/* ── ميزان الكتلة ── */}
      <MassBalance t={t} math={math} uom={uom} />

      {/* ── النواتج ── */}
      <CutLines
        t={t} isAr={isAr} cfg={cfg} canEdit={canEdit}
        icon="🥩"
        title={t({ en: "Output products", ar: "المنتجات الناتجة" })}
        sub={t({
          en: "The cuts this input yields — picked from the item master.",
          ar: "القطع اللي بيعطيها الداخل — من سجل الأصناف.",
        })}
        addLabel={t({ en: "Add output", ar: "إضافة ناتج" })}
        lines={bom.outputs || []}
        inputQty={math.input}
        preferRoles={["finished", "component"]}
        accent="#047857"
        disabledFor={lineDisabledFor}
        onBlocked={onLineBlocked}
        onAdd={() => addTo("outputs")}
        onPatch={(id, p) => patchList("outputs", id, p)}
        onDrop={(id) => dropFrom("outputs", id)}
      />

      {/* ── الهدر ── */}
      <CutLines
        t={t} isAr={isAr} cfg={cfg} canEdit={canEdit}
        icon="🦴"
        title={t({ en: "Waste / scrap", ar: "الهدر والمخلّفات" })}
        sub={t({
          en: "Bones, fat, trimmings… items whose role is “Waste” in the master list.",
          ar: "عظم، دهن، تشذيب… أصناف دورها «هدر» بسجل الأصناف.",
        })}
        addLabel={t({ en: "Add waste line", ar: "إضافة سطر هدر" })}
        lines={bom.wastes || []}
        inputQty={math.input}
        preferRoles={["waste"]}
        accent="#b45309"
        disabledFor={lineDisabledFor}
        onBlocked={onLineBlocked}
        onAdd={() => addTo("wastes")}
        onPatch={(id, p) => patchList("wastes", id, p)}
        onDrop={(id) => dropFrom("wastes", id)}
      />
    </>
  );
}

/* حقل نص بسيط بنمط الوحدة */
function TextInputLike({ value, onChange }) {
  return (
    <input style={S.input} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
  );
}

/* ══════════════ ميزان الكتلة ══════════════ */

function MassBalance({ t, math, uom }) {
  const { input, out, waste, loss, yieldPct, wastePct, over } = math;
  const pct = (v) => (input > 0 ? Math.max(0, Math.min(100, (v / input) * 100)) : 0);

  return (
    <Card
      icon="⚖️"
      title={t({ en: "Mass balance", ar: "ميزان الكتلة" })}
      sub={t({
        en: "Input = outputs + waste + unrecorded loss. Going over the input blocks saving.",
        ar: "الداخل = الناتج + الهدر + فاقد غير مسجّل. التجاوز عن الداخل بيمنع الحفظ.",
      })}
    >
      <div style={S.kpiRow}>
        <Kpi label={t({ en: "Input", ar: "الداخل" })} value={money(input, 2)} foot={uom} />
        <Kpi label={t({ en: "Outputs", ar: "الناتج" })} value={money(out, 2)}
          foot={`${yieldPct.toFixed(1)}% ${t({ en: "yield", ar: "عائد" })}`} color="#047857" />
        <Kpi label={t({ en: "Waste", ar: "الهدر" })} value={money(waste, 2)}
          foot={`${wastePct.toFixed(1)}%`} color="#b45309" />
        <Kpi
          label={over
            ? t({ en: "Over-allocated!", ar: "موزّع زيادة!" })
            : t({ en: "Unrecorded loss", ar: "فاقد غير مسجّل" })}
          value={money(Math.abs(loss), 2)}
          foot={input > 0 ? `${((Math.abs(loss) / input) * 100).toFixed(1)}%` : ""}
          color={over ? "#a12626" : "#6b8299"}
        />
      </div>

      {/* شريط التوزيع */}
      <div style={{
        display: "flex", height: 26, borderRadius: 999, overflow: "hidden",
        border: over ? "2px solid #a12626" : "1px solid #dbe6f2", background: "#f2f7fc",
      }}>
        <div style={{ width: `${pct(out)}%`, background: "#0f9d7a", transition: "width .25s ease" }}
          title={t({ en: "Outputs", ar: "الناتج" })} />
        <div style={{ width: `${pct(waste)}%`, background: "#e5a53f", transition: "width .25s ease" }}
          title={t({ en: "Waste", ar: "الهدر" })} />
      </div>
      <div style={{ ...S.hint, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span>🟩 {t({ en: "Outputs", ar: "الناتج" })}</span>
        <span>🟧 {t({ en: "Waste", ar: "الهدر" })}</span>
        <span>⬜ {t({ en: "Unrecorded loss", ar: "فاقد غير مسجّل" })}</span>
        {over && (
          <b style={{ color: "#a12626" }}>
            ⚠️ {t({ en: "Total exceeds the input quantity.", ar: "المجموع أكثر من كمية الداخل." })}
          </b>
        )}
      </div>
    </Card>
  );
}

/* ══════════════ أسطر (نواتج / هدر) ══════════════ */

function CutLines({
  t, isAr, cfg, canEdit, icon, title, sub, addLabel, lines, inputQty,
  preferRoles, accent, onAdd, onPatch, onDrop, disabledFor, onBlocked,
}) {
  const roleNames = preferRoles
    .map((r) => nameOf(ITEM_TYPES.find((x) => x.id === r) || {}, isAr))
    .filter(Boolean)
    .join(" / ");

  return (
    <Card
      icon={icon}
      title={title}
      sub={sub}
      right={
        canEdit && (
          <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnPrimary }} onClick={onAdd}>
            ＋ {addLabel}
          </button>
        )
      }
    >
      {lines.length === 0 ? (
        <EmptyBox>
          {t({ en: "No lines yet — add one from the item master.", ar: "لا أسطر بعد — ضيف من سجل الأصناف." })}
          <div style={{ ...S.hint, marginTop: 6 }}>
            {t({ en: "Suggested role", ar: "الدور المقترح" })}: {roleNames}
          </div>
        </EmptyBox>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 46 }}>#</th>
                <th style={S.th}>{t({ en: "Code", ar: "الكود" })}</th>
                <th style={{ ...S.th, minWidth: 280 }}>{t({ en: "Item (from master)", ar: "الصنف (من السجل)" })}</th>
                <th style={S.th}>{t({ en: "Qty", ar: "الكمية" })}</th>
                <th style={S.th}>{t({ en: "UoM", ar: "الوحدة" })}</th>
                <th style={S.th}>{t({ en: "% of input", ar: "٪ من الداخل" })}</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => {
                const it = itemById(cfg, l.itemId);
                const share = inputQty > 0 ? (num(l.qty) / inputQty) * 100 : 0;
                return (
                  <tr key={l.id}>
                    <td style={{ ...S.td, fontWeight: 900, color: "#8aa3b8" }}>{idx + 1}</td>
                    <td style={{ ...S.td, fontWeight: 900, color: "#14507f", whiteSpace: "nowrap" }}>
                      {it?.sku || (l.itemId ? "—" : "")}
                    </td>
                    <td style={{ ...S.td, ...S.tdStart, minWidth: 280 }}>
                      {canEdit ? (
                        <ItemPicker
                          cfg={cfg}
                          value={l.itemId}
                          onPick={(id) => onPatch(l.id, { itemId: id })}
                          isAr={isAr}
                          t={t}
                          prefer={preferRoles}
                          disabledFor={disabledFor ? disabledFor(l.itemId) : undefined}
                          onBlocked={onBlocked}
                        />
                      ) : (
                        <span style={{ fontWeight: 800 }}>{nameOf(it, isAr) || "—"}</span>
                      )}
                    </td>
                    <td style={S.td}>
                      <NumInput
                        style={S.inputSm}
                        disabled={!canEdit}
                        value={l.qty}
                        onChange={(v) => onPatch(l.id, { qty: v })}
                      />
                    </td>
                    <td style={S.td}>{it?.uom || "—"}</td>
                    <td style={{ ...S.td, fontWeight: 900, color: accent }}>
                      {inputQty > 0 && num(l.qty) > 0 ? `${share.toFixed(1)}%` : "—"}
                    </td>
                    <td style={S.td}>
                      {canEdit && (
                        <button type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnDanger }}
                          onClick={() => onDrop(l.id)}>
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
  );
}
