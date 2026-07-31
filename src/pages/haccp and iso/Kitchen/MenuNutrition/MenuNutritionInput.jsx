// src/pages/haccp and iso/Kitchen/MenuNutrition/MenuNutritionInput.jsx
// Menu nutrition data entry — per-100g values in, per-portion values out,
// with consistency validation. Abu Dhabi ADG 10/2026.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { can } from "../../../../utils/perms";
import { HaccpLangToggle } from "../../_shared/haccpI18n";
import { useKitchenLang } from "../kitchenI18n";
import {
  BASE_FONT_PX,
  Btn,
  CardHead,
  Chip,
  Field,
  FS,
  UI,
  card,
  control,
  grid,
  hint,
  layout,
  muted,
  notice,
  shell,
  table,
  textarea,
} from "../kitchenUI";
import { DAYS, EMPTY_ITEM, SECTIONS, makeCode, parsePastedRows, parseWeight } from "./menuData";
import { applyMasterFields, buildSyncPlan, defaultOrphanSelection } from "./syncPlan";
import {
  NUTRIENTS,
  atwaterCheck,
  computePortion,
  fmt,
  itemStatus,
  validateNutrients,
} from "./nutritionCalc";
import { createMany, deleteItem, loadItems, saveItem } from "./menuStore";

const STATUS_TONE = { complete: "good", partial: "warn", empty: "neutral" };

/**
 * Stable identity for an item. Saved records are identified by their server id;
 * unsaved ones by a local-only id. `code` is NOT an identity — two imports of
 * the same menu could share one, which made save and delete hit the wrong row.
 */
const uidOf = (it) => (it?.serverId ? `s:${it.serverId}` : it?._localId || `c:${it?.code}`);

export default function MenuNutritionInput() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { t, lang, toggle, isAr, dir } = useKitchenLang();

  const mayWrite = can("iso", "write");
  const mayEdit = can("iso", "edit");
  const mayDelete = can("iso", "delete");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUid, setSelectedUid] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState("");
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [showImport, setShowImport] = useState(false);
  const [pasteText, setPasteText] = useState("");

  // sync-with-master-table modal
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncPlan, setSyncPlan] = useState(null);
  const [updateSel, setUpdateSel] = useState(new Set());
  const [orphanSel, setOrphanSel] = useState(new Set());
  const [syncBusy, setSyncBusy] = useState(null);

  const initialDocDate = useRef("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await loadItems();
      setItems(list);
      return list;
    } catch {
      setItems([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load, then honour ?edit=<serverId> coming from the register table.
  useEffect(() => {
    let alive = true;
    load().then((list) => {
      if (!alive) return;
      const editId = params.get("edit");
      if (!editId) return;
      const target = list.find((it) => String(it.serverId) === String(editId));
      if (target) selectItem(target);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  function selectItem(item) {
    setSelectedUid(uidOf(item));
    setDraft({ ...item, per100: { ...item.per100 }, doc: { ...item.doc } });
    initialDocDate.current = item.doc?.date || "";
  }

  function newItem() {
    const blank = {
      ...EMPTY_ITEM,
      code: makeCode("custom", "new-item"),
      _localId: `l:${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      per100: {},
      doc: { method: "", source: "", ref: "", date: "", by: "" },
      serverId: null,
    };
    setItems((prev) => [...prev, blank]);
    selectItem(blank);
    if (params.get("edit")) setParams({});
  }

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const setNutrient = (key, value) =>
    setDraft((d) => ({ ...d, per100: { ...d.per100, [key]: value } }));
  const setDoc = (key, value) => setDraft((d) => ({ ...d, doc: { ...d.doc, [key]: value } }));

  const weight = useMemo(() => parseWeight(draft?.weightRaw), [draft?.weightRaw]);
  const portion = useMemo(
    () => computePortion(draft?.per100, weight.total),
    [draft?.per100, weight.total]
  );
  const atwater = useMemo(() => atwaterCheck(draft?.per100), [draft?.per100]);
  const validation = useMemo(() => validateNutrients(draft?.per100), [draft?.per100]);
  const draftStatus = useMemo(() => (draft ? itemStatus(draft) : null), [draft]);

  /** Snapshot of what the values were calculated against. */
  const ingredientsSnapshot = (d) => `${d?.ingredients || ""}|${d?.ingredientsAr || ""}`.trim();

  /** Stamp today's date and lock the weight + recipe the calculation used. */
  function markRecalculated() {
    const today = new Date().toISOString().slice(0, 10);
    setDraft((d) => ({
      ...d,
      doc: { ...d.doc, date: today },
      weightAtCalc: parseWeight(d.weightRaw).total,
      ingredientsAtCalc: ingredientsSnapshot(d),
    }));
  }

  async function save() {
    if (!draft) return;
    if (!draft.nameEn && !draft.nameAr) {
      alert(`${t("fldNameEn")} — ${t("required")}`);
      return;
    }
    if (draft.serverId ? !mayEdit : !mayWrite) {
      alert(t("noPermission"));
      return;
    }

    setSaving(true);
    const prevUid = uidOf(draft);
    try {
      const toSave = { ...draft };
      // Capture the weight the values were calculated against, so a later
      // weight change flags the item for recalculation.
      const docDateChanged = (toSave.doc?.date || "") !== initialDocDate.current;
      if (toSave.doc?.date && (docDateChanged || toSave.weightAtCalc == null)) {
        toSave.weightAtCalc = weight.total;
      }
      if (toSave.doc?.date && (docDateChanged || toSave.ingredientsAtCalc == null)) {
        toSave.ingredientsAtCalc = ingredientsSnapshot(toSave);
      }

      const returnedId = await saveItem(toSave, toSave.doc?.by || "admin");

      if (!toSave.serverId && !returnedId) {
        // The POST succeeded but the response carried no id. Re-read from the
        // server and match on `code` (unique per item) so the next save updates
        // this record instead of creating a duplicate.
        const list = await load();
        const found = list.find((it) => it.code === toSave.code);
        if (found) {
          selectItem(found);
          setFlash(t("saved"));
          setTimeout(() => setFlash(""), 2500);
          return;
        }
      }

      const saved = {
        ...toSave,
        serverId: toSave.serverId || returnedId || null,
        _localId: toSave.serverId || returnedId ? undefined : toSave._localId,
      };
      setItems((prev) => prev.map((it) => (uidOf(it) === prevUid ? saved : it)));
      setSelectedUid(uidOf(saved));
      setDraft(saved);
      initialDocDate.current = saved.doc?.date || "";
      setFlash(t("saved"));
      setTimeout(() => setFlash(""), 2500);
    } catch (e) {
      alert(`${t("saveError")}: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!draft || deleting) return;
    if (!mayDelete) {
      alert(t("noPermission"));
      return;
    }
    if (!window.confirm(t("confirmDelete"))) return;

    const targetUid = uidOf(draft);
    setDeleting(true);
    try {
      // Unsaved drafts exist only in this list — nothing to delete server-side.
      if (draft.serverId) await deleteItem(draft.serverId);
      setItems((prev) => prev.filter((it) => uidOf(it) !== targetUid));
      setDraft(null);
      setSelectedUid(null);
      if (params.get("edit")) setParams({});
      setFlash(t("deleted"));
      setTimeout(() => setFlash(""), 2500);
    } catch (e) {
      // Keep the selection so the user can retry or copy the values out.
      alert(`${t("deleteError")}: ${e?.message || e}`);
    } finally {
      setDeleting(false);
    }
  }

  /* ── Sync with the master menu table (add / update / remove) ── */

  function openSync() {
    if (!mayWrite) return alert(t("noPermission"));
    const plan = buildSyncPlan(items);
    setSyncPlan(plan);
    setUpdateSel(new Set(plan.toUpdate.map((u) => u.item.code)));
    setOrphanSel(defaultOrphanSelection(plan.orphans));
    setSyncOpen(true);
  }

  const toggleIn = (setFn) => (code) =>
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  async function applySync() {
    if (!syncPlan) return;
    const updates = syncPlan.toUpdate.filter((u) => updateSel.has(u.item.code));
    const removals = syncPlan.orphans.filter((o) => orphanSel.has(o.item.code));
    const additions = syncPlan.toAdd;

    const total = additions.length + updates.length + removals.length;
    if (!total) return alert(t("syncNothingSelected"));

    setSyncBusy({ done: 0, total });
    let added = 0;
    let updated = 0;
    let removed = 0;
    try {
      for (const s of additions) {
        // eslint-disable-next-line no-await-in-loop
        await createMany([
          {
            ...EMPTY_ITEM,
            ...s,
            per100: {},
            doc: { method: "", source: "", ref: "", date: "", by: "" },
            weightAtCalc: null,
            ingredientsAtCalc: null,
            serverId: null,
          },
        ]);
        added += 1;
        setSyncBusy({ done: added + updated + removed, total });
      }
      for (const u of updates) {
        // eslint-disable-next-line no-await-in-loop
        await saveItem(applyMasterFields(u.item, u.seed), "sync");
        updated += 1;
        setSyncBusy({ done: added + updated + removed, total });
      }
      for (const o of removals) {
        if (o.item.serverId) {
          // eslint-disable-next-line no-await-in-loop
          await deleteItem(o.item.serverId);
        }
        removed += 1;
        setSyncBusy({ done: added + updated + removed, total });
      }

      setSyncOpen(false);
      setSyncPlan(null);
      setDraft(null);
      setSelectedUid(null);
      await load();
      setFlash(t("syncDone", { added, updated, removed }));
      setTimeout(() => setFlash(""), 5000);
    } catch (e) {
      alert(`${t("saveError")}: ${e?.message || e}`);
      await load();
    } finally {
      setSyncBusy(null);
    }
  }

  async function importPasted() {
    if (!mayWrite) return alert(t("noPermission"));
    const parsed = parsePastedRows(pasteText);
    if (!parsed.length) return;
    setSaving(true);
    try {
      const n = await createMany(parsed);
      setShowImport(false);
      setPasteText("");
      await load();
      setFlash(t("importedN", { n }));
      setTimeout(() => setFlash(""), 3000);
    } catch (e) {
      alert(`${t("saveError")}: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (sectionFilter !== "all" && it.section !== sectionFilter) return false;
      if (!q) return true;
      return `${it.nameEn} ${it.nameAr} ${it.day} ${it.servedWith}`.toLowerCase().includes(q);
    });
  }, [items, query, sectionFilter]);

  const grouped = useMemo(() => {
    const groups = [];
    for (const sec of SECTIONS) {
      const inSec = filtered.filter((i) => i.section === sec.id);
      if (!inSec.length) continue;
      if (sec.id === "day") {
        for (const day of DAYS) {
          const dayItems = inSec.filter((i) => i.day === day);
          if (dayItems.length) groups.push({ key: `day-${day}`, label: t(day), icon: "📅", items: dayItems });
        }
        const noDay = inSec.filter((i) => !DAYS.includes(i.day));
        if (noDay.length) groups.push({ key: "day-other", label: t("secDay"), icon: "📅", items: noDay });
      } else {
        groups.push({ key: sec.id, label: t(sec.labelKey), icon: sec.icon, items: inSec });
      }
    }
    return groups;
  }, [filtered, t]);

  const totals = useMemo(() => {
    const st = items.map(itemStatus);
    return {
      total: items.length,
      complete: st.filter((s) => s.status === "complete").length,
      invalid: st.filter((s) => s.invalid).length,
      recalc: st.filter((s) => s.needsRecalc).length,
      noWeight: st.filter((s) => s.missingWeight).length,
    };
  }, [items]);

  return (
    <main style={shell(dir, BASE_FONT_PX)}>
      <style>{`
        @media (max-width: 1080px) {
          .kt-split { grid-template-columns: 1fr !important; }
          .kt-aside { position: static !important; max-height: none !important; }
        }
        @media (max-width: 760px) {
          .kt-g2, .kt-g3 { grid-template-columns: 1fr !important; }
        }
        .kt-row:hover { background: ${UI.surfaceAlt}; }
      `}</style>

      <div style={layout}>
        {/* ══ Page header ══ */}
        <header style={S.header}>
          <div style={{ minWidth: 0 }}>
            <div style={S.eyebrow}>HACCP / ISO 22000 · {t("kitchenTitle")}</div>
            <h1 style={S.h1}>{t("mnTitle")}</h1>
            <p style={S.lede}>{t("mnSubtitle")}</p>
          </div>
          <div style={S.headerActions}>
            {flash && <Chip tone="good">{flash}</Chip>}
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <Btn onClick={load}>{t("refresh")}</Btn>
            <Btn variant="primary" onClick={() => navigate("/haccp-iso/kitchen/menu-nutrition/view")}>
              {t("mnView")}
            </Btn>
            <Btn onClick={() => navigate("/haccp-iso/kitchen/menu-nutrition")}>{t("back")}</Btn>
          </div>
        </header>

        {/* ══ KPI row ══ */}
        <section style={S.kpis}>
          <Kpi label={t("cmpTotal")} value={totals.total} tone="info" />
          <Kpi label={t("cmpComplete")} value={totals.complete} tone="good" />
          <Kpi label={t("cmpInvalid")} value={totals.invalid} tone="bad" />
          <Kpi label={t("cmpRecalc")} value={totals.recalc} tone="warn" />
          <Kpi label={t("cmpNoWeight")} value={totals.noWeight} tone="warn" />
        </section>

        {/* ══ Toolbar ══ */}
        <section style={S.toolbar}>
          <input
            style={{ ...control(false), flex: "1 1 240px", minWidth: 190 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
          />
          <select
            style={{ ...control(false), width: "auto", minWidth: 190 }}
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
          >
            <option value="all">{t("allSections")}</option>
            {SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {t(s.labelKey)}
              </option>
            ))}
          </select>
          {mayWrite && (
            <>
              <Btn variant="success" onClick={newItem}>
                {t("newItem")}
              </Btn>
              <Btn variant="soft" onClick={() => setShowImport(true)}>
                {t("importPaste")}
              </Btn>
              {!loading && (
                <Btn
                  variant="primary"
                  onClick={openSync}
                  disabled={saving}
                  title={t("syncBtnHint")}
                >
                  {t("syncBtn")}
                </Btn>
              )}
            </>
          )}
        </section>

        {/* ══ Split: list + editor ══ */}
        <div className="kt-split" style={S.split}>
          {/* ── Item list ── */}
          <aside className="kt-aside" style={S.aside}>
            {loading && <div style={muted}>{t("loading")}</div>}
            {!loading && !items.length && <div style={muted}>{t("noItems")}</div>}

            {grouped.map((g) => (
              <div key={g.key} style={{ marginBottom: 18 }}>
                <div style={S.groupLabel}>
                  <span>
                    {g.icon} {g.label}
                  </span>
                  <span style={S.groupCount}>{g.items.length}</span>
                </div>
                {g.items.map((it) => {
                  const st = itemStatus(it);
                  const uid = uidOf(it);
                  const active = selectedUid === uid;
                  return (
                    <button
                      key={uid}
                      type="button"
                      style={S.listItem(active)}
                      onClick={() => selectItem(it)}
                    >
                      <span style={{ minWidth: 0, flex: 1, textAlign: isAr ? "right" : "left" }}>
                        <span style={S.listName}>
                          {isAr ? it.nameAr || it.nameEn : it.nameEn || it.nameAr}
                        </span>
                        <span style={S.listMeta}>
                          {st.weight !== null ? `${st.weight} g` : t("weightCol") + " —"} ·{" "}
                          {st.filled}/{NUTRIENTS.length}
                        </span>
                      </span>
                      {st.invalid ? (
                        <Chip tone="bad">!</Chip>
                      ) : (
                        <Chip tone={STATUS_TONE[st.status]}>{t(`status${cap(st.status)}`)}</Chip>
                      )}
                      {st.needsRecalc && <Chip tone="warn">↻</Chip>}
                    </button>
                  );
                })}
              </div>
            ))}
          </aside>

          {/* ── Editor ── */}
          <section style={{ minWidth: 0 }}>
            {!draft ? (
              <div style={{ ...card, ...muted }}>{t("selectItem")}</div>
            ) : (
              <>
                {/* Item details */}
                <div style={card}>
                  <CardHead
                    eyebrow={t("fldSection")}
                    title={isAr ? draft.nameAr || draft.nameEn || "—" : draft.nameEn || draft.nameAr || "—"}
                    right={
                      draftStatus &&
                      (draftStatus.invalid ? (
                        <Chip tone="bad">{t("statusInvalid")}</Chip>
                      ) : (
                        <Chip tone={STATUS_TONE[draftStatus.status]}>
                          {t(`status${cap(draftStatus.status)}`)}
                        </Chip>
                      ))
                    }
                  />

                  <div className="kt-g2" style={{ ...grid.two, marginBottom: 16 }}>
                    <Field label={t("fldSection")}>
                      <select
                        style={control(false)}
                        value={draft.section}
                        onChange={(e) => setField("section", e.target.value)}
                      >
                        {SECTIONS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.icon} {t(s.labelKey)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={t("fldDay")}>
                      <select
                        style={control(false)}
                        value={draft.day || ""}
                        onChange={(e) => setField("day", e.target.value)}
                        disabled={draft.section !== "day"}
                      >
                        <option value="">{t("noData")}</option>
                        {DAYS.map((d) => (
                          <option key={d} value={d}>
                            {t(d)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="kt-g2" style={{ ...grid.two, marginBottom: 16 }}>
                    <Field label={t("fldNameEn")}>
                      <input
                        style={control(false)}
                        dir="ltr"
                        value={draft.nameEn}
                        onChange={(e) => setField("nameEn", e.target.value)}
                      />
                    </Field>
                    <Field label={t("fldNameAr")}>
                      <input
                        style={control(false)}
                        dir="rtl"
                        value={draft.nameAr}
                        onChange={(e) => setField("nameAr", e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="kt-g3" style={{ ...grid.three, marginBottom: 16 }}>
                    <Field label={`${t("fldServedWith")} — EN`}>
                      <input
                        style={control(false)}
                        dir="ltr"
                        value={draft.servedWith || ""}
                        onChange={(e) => setField("servedWith", e.target.value)}
                      />
                    </Field>
                    <Field label={`${t("fldServedWith")} — AR`}>
                      <input
                        style={control(false)}
                        dir="rtl"
                        value={draft.servedWithAr || ""}
                        onChange={(e) => setField("servedWithAr", e.target.value)}
                      />
                    </Field>
                    <Field label={t("fldWeight")} hint={t("fldWeightHint")}>
                      <input
                        style={control(weight.total === null && !!draft.weightRaw)}
                        dir="ltr"
                        value={draft.weightRaw || ""}
                        onChange={(e) => setField("weightRaw", e.target.value)}
                        placeholder="700 · 350/300 · 5x50"
                      />
                    </Field>
                  </div>

                  <div style={notice(weight.total === null ? "bad" : "sky")}>
                    {weight.total === null ? (
                      t("weightMissing")
                    ) : (
                      <>
                        <b style={{ fontSize: FS.base }}>
                          {t("totalPortion")}: {weight.total} g
                        </b>
                        {weight.parts.length > 1 && (
                          <span>
                            {" "}
                            — {weight.parts.join(" + ")} ({t("weightParts", { n: weight.parts.length })})
                          </span>
                        )}
                        {weight.pieces && weight.each && (
                          <span> — {t("weightPieces", { n: weight.pieces, each: weight.each })}</span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="kt-g2" style={{ ...grid.two, marginTop: 16 }}>
                    <Field label={`${t("fldIngredients")} — EN`} hint={t("fldIngredientsHint")}>
                      <textarea
                        style={textarea}
                        dir="ltr"
                        value={draft.ingredients || ""}
                        onChange={(e) => setField("ingredients", e.target.value)}
                      />
                    </Field>
                    <Field label={`${t("fldIngredients")} — AR`}>
                      <textarea
                        style={textarea}
                        dir="rtl"
                        value={draft.ingredientsAr || ""}
                        onChange={(e) => setField("ingredientsAr", e.target.value)}
                      />
                    </Field>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <Field label={t("fldNotes")}>
                      <textarea
                        style={textarea}
                        value={draft.notes || ""}
                        onChange={(e) => setField("notes", e.target.value)}
                      />
                    </Field>
                  </div>
                </div>

                {/* Nutrition table */}
                <div style={card}>
                  <CardHead eyebrow="ADG 10/2026" title={t("per100")} />
                  <div style={{ ...notice("info"), marginBottom: 18 }}>{t("per100Hint")}</div>

                  <div style={table.wrap}>
                    <table style={table.el}>
                      <thead>
                        <tr>
                          <th style={table.th}>{isAr ? "العنصر الغذائي" : "Nutrient"}</th>
                          <th style={{ ...table.th, width: 170 }}>{isAr ? "لكل 100 غ" : "Per 100 g"}</th>
                          <th
                            style={{
                              ...table.th,
                              textAlign: "end",
                              background: UI.mintSoft,
                              color: UI.mintInk,
                              width: 160,
                            }}
                          >
                            {isAr ? "لكل حصة" : "Per portion"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {NUTRIENTS.map((n) => {
                          const bad = !!validation.errors[n.key];
                          return (
                            <tr key={n.key} className="kt-row">
                              <td style={table.td}>
                                <span style={{ fontWeight: 800 }}>{isAr ? n.ar : n.en}</span>
                                <span style={S.unit}> · {n.unit}</span>
                              </td>
                              <td style={{ ...table.td, padding: "9px 16px" }}>
                                <input
                                  style={{
                                    ...control(bad),
                                    textAlign: "center",
                                    fontVariantNumeric: "tabular-nums",
                                    padding: "9px 10px",
                                  }}
                                  dir="ltr"
                                  inputMode="decimal"
                                  value={draft.per100?.[n.key] ?? ""}
                                  onChange={(e) => setNutrient(n.key, e.target.value)}
                                  placeholder="—"
                                />
                              </td>
                              <td
                                style={{
                                  ...table.td,
                                  ...table.num,
                                  background: UI.mintSoft,
                                  color: UI.mintInk,
                                  fontSize: FS.sm,
                                  fontWeight: 900,
                                }}
                              >
                                {fmt(portion[n.key], n.digits, n.unit)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={hint}>{t("perPortionFormula")}</div>
                </div>

                {/* Checks */}
                <div style={card}>
                  <CardHead
                    eyebrow={t("vTitle")}
                    title={validation.list.length ? t("vIntro") : t("vOk")}
                    right={
                      <Chip tone={validation.list.length ? "bad" : "good"}>
                        {validation.list.length || "0"}
                      </Chip>
                    }
                  />

                  {!!validation.list.length && (
                    <ul style={S.errorList}>
                      {validation.list.map((e, i) => (
                        <li key={`${e.code}-${i}`} style={S.errorItem}>
                          {t(e.code, e.vars)}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div style={{ ...S.subHead, marginTop: validation.list.length ? 22 : 0 }}>
                    🧪 {t("atwater")}
                  </div>
                  <div style={notice(atwater.status === "warn" ? "warn" : atwater.status === "ok" ? "good" : "neutral")}>
                    {atwater.status === "na" && t("atwaterNa")}
                    {atwater.status === "ok" && t("atwaterOk", { pct: atwater.deviationPct })}
                    {atwater.status === "warn" &&
                      t("atwaterWarn", { pct: atwater.deviationPct, calc: atwater.calc })}
                  </div>
                  <div style={hint}>{t("atwaterNote")}</div>
                </div>

                {/* Documentation */}
                <div style={card}>
                  <CardHead eyebrow="ISO 22000 · 7.5" title={t("docTitle")} />

                  <div className="kt-g2" style={{ ...grid.two, marginBottom: 16 }}>
                    <Field label={t("docMethod")}>
                      <select
                        style={control(false)}
                        value={draft.doc?.method || ""}
                        onChange={(e) => setDoc("method", e.target.value)}
                      >
                        <option value="">—</option>
                        <option value="lab">{t("docMethodLab")}</option>
                        <option value="software">{t("docMethodSoftware")}</option>
                      </select>
                    </Field>
                    <Field label={t("docSource")} hint={t("docSourceHint")}>
                      <input
                        style={control(false)}
                        value={draft.doc?.source || ""}
                        onChange={(e) => setDoc("source", e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="kt-g3" style={grid.three}>
                    <Field label={t("docRef")}>
                      <input
                        style={control(false)}
                        value={draft.doc?.ref || ""}
                        onChange={(e) => setDoc("ref", e.target.value)}
                      />
                    </Field>
                    <Field label={t("docDate")}>
                      <input
                        style={control(false)}
                        type="date"
                        value={draft.doc?.date || ""}
                        onChange={(e) => setDoc("date", e.target.value)}
                      />
                    </Field>
                    <Field label={t("docBy")}>
                      <input
                        style={control(false)}
                        value={draft.doc?.by || ""}
                        onChange={(e) => setDoc("by", e.target.value)}
                      />
                    </Field>
                  </div>

                  {draftStatus?.needsRecalc && (
                    <div style={{ ...notice("warn"), marginTop: 18 }}>
                      ⚠️ {t("statusRecalc")} —{" "}
                      {draftStatus.recalcReason === "weight"
                        ? t("recalcReasonWeight", { old: draft.weightAtCalc, now: weight.total })
                        : draftStatus.recalcReason === "ingredients"
                        ? t("recalcReasonIngredients")
                        : t("recalcReasonNoDate")}
                      <div style={{ marginTop: 12 }}>
                        <Btn variant="soft" onClick={markRecalculated}>
                          {isAr ? "تم إعادة الحساب اليوم" : "Recalculated today"}
                        </Btn>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky action bar */}
                <div style={S.actionBar}>
                  <Btn variant="success" onClick={save} disabled={saving || deleting}>
                    {saving ? t("saving") : t("save")}
                  </Btn>
                  {mayDelete && (
                    <Btn variant="danger" onClick={remove} disabled={saving || deleting}>
                      {deleting ? t("deleting") : t("del")}
                    </Btn>
                  )}
                  <span style={{ ...hint, marginTop: 0, marginInlineStart: "auto" }}>
                    {draft.serverId ? `#${String(draft.serverId).slice(0, 8)}` : ""}
                  </span>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* ══ Sync modal ══ */}
      {syncOpen && syncPlan && (
        <div style={S.overlay} onClick={() => !syncBusy && setSyncOpen(false)}>
          <div
            style={{ ...S.modal, "--kt-base": `${BASE_FONT_PX}px`, direction: dir }}
            onClick={(e) => e.stopPropagation()}
          >
            <CardHead
              eyebrow="MENU_ROWS"
              title={t("syncTitle")}
              right={
                <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Chip tone="neutral">
                    {t("syncMatched")}: {syncPlan.matched}
                  </Chip>
                  <Chip tone="good">+{syncPlan.toAdd.length}</Chip>
                  <Chip tone="info">↻{syncPlan.toUpdate.length}</Chip>
                  <Chip tone="warn">!{syncPlan.orphans.length}</Chip>
                </span>
              }
            />

            {syncPlan.inSync && !syncPlan.orphans.length ? (
              <div style={notice("good")}>{t("syncInSync")}</div>
            ) : (
              <div style={{ ...notice("info"), marginBottom: 18 }}>{t("syncIntro")}</div>
            )}

            {/* Additions */}
            {!!syncPlan.toAdd.length && (
              <section style={S.syncBlock}>
                <div style={S.syncHead}>
                  {t("syncToAdd")} — {syncPlan.toAdd.length}
                </div>
                <ul style={S.syncList}>
                  {syncPlan.toAdd.map((s) => (
                    <li key={s.code} style={S.syncRow}>
                      <span style={S.syncName}>
                        {s.nameEn} <span style={S.syncAr}>{s.nameAr}</span>
                      </span>
                      <span style={S.syncMeta}>
                        {s.day ? t(s.day) : t(`sec${cap(s.section)}`)} · {s.weightRaw || "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Updates */}
            {!!syncPlan.toUpdate.length && (
              <section style={S.syncBlock}>
                <div style={S.syncHead}>
                  {t("syncToUpdate")} — {updateSel.size}/{syncPlan.toUpdate.length}
                </div>
                <ul style={S.syncList}>
                  {syncPlan.toUpdate.map((u) => (
                    <li key={u.item.code} style={S.syncRow}>
                      <label style={S.syncCheck}>
                        <input
                          type="checkbox"
                          checked={updateSel.has(u.item.code)}
                          onChange={() => toggleIn(setUpdateSel)(u.item.code)}
                        />
                        <span style={S.syncName}>
                          {u.seed.nameEn} <span style={S.syncAr}>{u.seed.nameAr}</span>
                        </span>
                      </label>
                      <span style={S.syncDiffs}>
                        {u.diffs.map((d) => (
                          <span key={d.field} style={S.syncDiff}>
                            {fieldLabel(t, d.field)}: <s style={S.diffFrom}>{d.from || "—"}</s> →{" "}
                            <b style={S.diffTo}>{d.to || "—"}</b>
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Orphans */}
            {!!syncPlan.orphans.length && (
              <section style={S.syncBlock}>
                <div style={S.syncHead}>
                  {t("syncExtra")} — {orphanSel.size}/{syncPlan.orphans.length}
                </div>
                <div style={hint}>{t("syncExtraHint")}</div>
                <ul style={S.syncList}>
                  {syncPlan.orphans.map((o) => (
                    <li key={o.item.code} style={S.syncRow}>
                      <label style={S.syncCheck}>
                        <input
                          type="checkbox"
                          checked={orphanSel.has(o.item.code)}
                          onChange={() => toggleIn(setOrphanSel)(o.item.code)}
                        />
                        <span style={S.syncName}>
                          {o.item.nameEn} <span style={S.syncAr}>{o.item.nameAr}</span>
                        </span>
                      </label>
                      {o.hasData && <Chip tone="bad">{t("syncHasData")}</Chip>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div style={S.syncActions}>
              <Btn onClick={() => setSyncOpen(false)} disabled={!!syncBusy}>
                {t("cancel")}
              </Btn>
              <Btn variant="primary" onClick={applySync} disabled={!!syncBusy}>
                {syncBusy ? t("syncApplying", syncBusy) : t("syncApply")}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ══ Import modal ══ */}
      {showImport && (
        <div style={S.overlay} onClick={() => setShowImport(false)}>
          <div
            style={{ ...S.modal, "--kt-base": `${BASE_FONT_PX}px`, direction: dir }}
            onClick={(e) => e.stopPropagation()}
          >
            <CardHead eyebrow="Excel" title={t("importTitle")} />
            <div style={{ ...notice("info"), marginBottom: 14 }}>{t("importHint")}</div>
            <textarea
              style={{ ...textarea, minHeight: 220, fontFamily: UI.mono, fontSize: FS.xs }}
              dir="ltr"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"Saturday\tLamb Ouzi\tعوزي لحم\tVermicelli Rice\t350/300"}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <Btn onClick={() => setShowImport(false)}>{t("cancel")}</Btn>
              <Btn variant="primary" onClick={importPasted} disabled={saving}>
                {saving ? t("saving") : t("importDo")}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ───────── small components ───────── */

function Kpi({ label, value, tone }) {
  return (
    <div style={S.kpi}>
      <div style={S.kpiValue}>{value}</div>
      <div style={S.kpiLabel}>{label}</div>
      <div style={S.kpiBar(tone)} />
    </div>
  );
}

/** "day" → "Day", "complete" → "Complete" — used to build i18n keys. */
function cap(s) {
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

/** Translate a MASTER_FIELDS key for the sync diff list. */
function fieldLabel(t, field) {
  const map = {
    section: "fldSection",
    day: "fldDay",
    order: "fldOrder",
    nameEn: "fldNameEn",
    nameAr: "fldNameAr",
    servedWith: "fldServedWith",
    servedWithAr: "fldServedWith",
    weightRaw: "fldWeight",
  };
  const label = t(map[field] || field);
  return field === "servedWithAr" ? `${label} (AR)` : label;
}

/* ───────── page-local styles ───────── */

const TONE_BAR = {
  info: UI.accent,
  good: UI.mint,
  warn: UI.amber,
  bad: UI.rose,
  neutral: UI.lineStrong,
};

const S = {
  header: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: FS.xxs,
    fontWeight: 900,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: UI.inkMuted,
  },
  h1: { margin: "10px 0 0", fontSize: FS.xl, fontWeight: 900, lineHeight: 1.15, color: UI.ink },
  lede: { margin: "8px 0 0", fontSize: FS.sm, fontWeight: 600, color: UI.inkSoft, maxWidth: 620 },
  headerActions: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },

  kpis: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
    gap: 14,
    marginBottom: 20,
  },
  kpi: {
    position: "relative",
    overflow: "hidden",
    background: UI.surface,
    border: `1px solid ${UI.line}`,
    borderRadius: UI.r.md,
    padding: "18px 20px",
    boxShadow: UI.shadow.card,
  },
  kpiValue: {
    fontSize: FS.lg,
    fontWeight: 900,
    lineHeight: 1,
    color: UI.ink,
    fontVariantNumeric: "tabular-nums",
  },
  kpiLabel: { marginTop: 8, fontSize: FS.xs, fontWeight: 700, color: UI.inkMuted },
  kpiBar: (tone) => ({
    position: "absolute",
    insetInlineStart: 0,
    top: 0,
    bottom: 0,
    width: 4,
    background: TONE_BAR[tone] || UI.lineStrong,
  }),

  toolbar: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
    background: UI.surface,
    border: `1px solid ${UI.line}`,
    borderRadius: UI.r.md,
    padding: 14,
    marginBottom: 20,
    boxShadow: UI.shadow.card,
  },

  split: { display: "grid", gridTemplateColumns: "minmax(300px, 380px) minmax(0, 1fr)", gap: 20 },
  aside: {
    position: "sticky",
    top: 20,
    alignSelf: "start",
    maxHeight: "calc(100vh - 40px)",
    overflowY: "auto",
    background: UI.surface,
    border: `1px solid ${UI.line}`,
    borderRadius: UI.r.lg,
    padding: 16,
    boxShadow: UI.shadow.card,
  },
  groupLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    fontSize: FS.xxs,
    fontWeight: 900,
    color: UI.inkMuted,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    padding: "8px 6px",
    borderBottom: `1px solid ${UI.line}`,
    marginBottom: 8,
  },
  groupCount: {
    fontVariantNumeric: "tabular-nums",
    background: UI.surfaceAlt,
    borderRadius: UI.r.pill,
    padding: "2px 8px",
    color: UI.inkSoft,
  },
  listItem: (active) => ({
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 12px",
    marginBottom: 6,
    borderRadius: UI.r.sm,
    border: `1px solid ${active ? UI.accent : "transparent"}`,
    background: active ? UI.accentSoft : "transparent",
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "start",
  }),
  listName: {
    display: "block",
    fontSize: FS.sm,
    fontWeight: 800,
    color: UI.ink,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  listMeta: {
    display: "block",
    fontSize: FS.xxs,
    fontWeight: 700,
    color: UI.inkMuted,
    marginTop: 3,
    fontVariantNumeric: "tabular-nums",
  },

  unit: { fontSize: FS.xxs, color: UI.inkMuted, fontWeight: 700 },
  subHead: {
    fontSize: FS.sm,
    fontWeight: 900,
    color: UI.inkSoft,
    marginBottom: 10,
  },
  errorList: { margin: 0, paddingInlineStart: 0, listStyle: "none", display: "grid", gap: 10 },
  errorItem: {
    ...notice("bad"),
    display: "flex",
    gap: 10,
  },

  actionBar: {
    position: "sticky",
    bottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(10px)",
    border: `1px solid ${UI.line}`,
    borderRadius: UI.r.pill,
    padding: "12px 18px",
    marginBottom: 8,
    boxShadow: UI.shadow.raised,
  },

  syncBlock: {
    marginBottom: 18,
    padding: 16,
    borderRadius: UI.r.md,
    background: UI.surfaceAlt,
    border: `1px solid ${UI.line}`,
  },
  syncHead: {
    fontSize: FS.sm,
    fontWeight: 900,
    color: UI.ink,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: `1px solid ${UI.line}`,
  },
  syncList: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "grid",
    gap: 8,
    maxHeight: 260,
    overflowY: "auto",
  },
  syncRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    padding: "8px 10px",
    borderRadius: UI.r.sm,
    background: UI.surface,
    border: `1px solid ${UI.line}`,
  },
  syncCheck: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    minWidth: 0,
  },
  syncName: { fontSize: FS.xs, fontWeight: 800, color: UI.ink },
  syncAr: { fontWeight: 700, color: UI.inkSoft },
  syncMeta: { fontSize: FS.xxs, fontWeight: 700, color: UI.inkMuted },
  syncDiffs: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },
  syncDiff: {
    fontSize: FS.xxs,
    fontWeight: 700,
    color: UI.inkSoft,
    background: UI.surfaceAlt,
    borderRadius: UI.r.pill,
    padding: "3px 10px",
  },
  diffFrom: { color: UI.inkMuted },
  diffTo: { color: UI.accentInk },
  syncActions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 18,
    paddingTop: 16,
    borderTop: `1px solid ${UI.line}`,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(30,41,59,0.42)",
    backdropFilter: "blur(3px)",
    display: "grid",
    placeItems: "center",
    padding: 18,
    zIndex: 60,
  },
  modal: {
    width: "min(820px, 100%)",
    background: UI.surface,
    borderRadius: UI.r.lg,
    padding: 26,
    border: `1px solid ${UI.line}`,
    boxShadow: UI.shadow.raised,
    maxHeight: "90vh",
    overflowY: "auto",
    fontFamily: UI.font,
    fontSize: FS.base,
    color: UI.ink,
  },
};
