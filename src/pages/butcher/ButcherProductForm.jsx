// src/pages/butcher/ButcherProductForm.jsx
//
// 🗂️ الماستر ليست — الصفحة الوحيدة لإدخال شجرة الجزار كاملة.
// Butcher master list: one page for every level of the tree.
//
// الشجرة:  الذبائح → المناشئ → الدرجات → القطع/الأجزاء → المنتجات النهائية
// كلهم يُضافون ويُعدَّلون ويُحذفون من هنا — ما عاد في تبويبات منفصلة بالإعدادات.
//
// المسار:
//   /butcher/master                 ← القائمة بلا سجل مختار
//   /butcher/product/:listKey/:id   ← سجل محدّد (نفس الرابط القديم)
//   listKey = animals | origins | grades | cuts | pieces | products
//
// الشاشة بأسلوب Odoo: قائمة الماستر على الجنب + ورقة السجل بكل خصائصه
// (معلومات عامة · نسب التقطيع · النِّسب المرجعية · الصورة).

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IMAGE_API_BASE } from "../../config/api";
import {
  artOf, cfgFind, enabledOnly, imageOf, mergeConfig, originsForAnimal,
  saveConfig, sortByOrder, useButcherConfig,
} from "./butcherConfig";
import { ITEM_KINDS, itemKind, nameOf } from "./butcherOptions";
import ButcherArt, { ART_IDS } from "./ButcherIcons";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { canOpenButcherPage, NoAccess } from "./ButcherAccess";
import { can } from "../../utils/perms";

const CSS = `
#root .pf, #root .pf * { font-size: 18px !important; }
#root .pf-title   { font-size: 40px !important; }
#root .pf-eyebrow { font-size: 15px !important; }
#root .pf-tab     { font-size: 18px !important; }
#root .pf-sec     { font-size: 17px !important; }
#root .pf-stat    { font-size: 30px !important; }
#root .pf-statlbl { font-size: 15px !important; }
#root .pf-small   { font-size: 15px !important; }
#root .pf table, #root .pf table * { font-size: 17px !important; }
#root .pf-side, #root .pf-side * { font-size: 16px !important; }
#root .pf-side .pf-grp { font-size: 15px !important; }

/* حقول Odoo: سطر سفلي فقط، وبيتلوّن عند التركيز */
#root .pf-in {
  border: 0 !important; border-bottom: 1.5px solid #d5e2ef !important;
  border-radius: 0 !important; background: transparent !important;
  padding: 7px 2px !important; width: 100%; outline: none;
  font-weight: 700; color: #0f2740; font-family: inherit;
}
#root .pf-in:focus { border-bottom-color: #1f6fd0 !important; box-shadow: 0 1px 0 0 #1f6fd0; }
#root .pf-in:disabled { color: #0f2740; opacity: 1; border-bottom-color: transparent !important; }
#root .pf-stat-btn { transition: background .15s ease, transform .12s ease; }
#root .pf-stat-btn:hover:not(:disabled) { background: #f2f8ff; transform: translateY(-2px); }
#root .pf table tbody tr:nth-child(even) { background: #fafcff; }
#root .pf-rec:hover { background: #f2f8ff; }

/* التخطيط: قائمة الماستر + الورقة */
#root .pf-layout {
  display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 18px;
  align-items: start;
}
#root .pf-sidetoggle { display: none; }
@media (max-width: 1180px) {
  #root .pf-layout { grid-template-columns: 1fr; }
  #root .pf-side { display: none; }
  #root .pf-side.open { display: block; }
  #root .pf-sidetoggle { display: inline-flex; }
}
@media (max-width: 1100px) {
  #root .pf, #root .pf * { font-size: 16px !important; }
  #root .pf-title { font-size: 30px !important; }
  #root .pf-stat  { font-size: 25px !important; }
}
@media (max-width: 820px) {
  #root .pf, #root .pf * { font-size: 15px !important; }
  #root .pf-title { font-size: 25px !important; }
}
`;

/* ── مستويات الشجرة — ترتيبها هو ترتيب القائمة ── */
const LISTS = [
  { key: "animals",  icon: "🐑", ar: "الذبائح",           en: "Animals",        oneAr: "ذبيحة",       oneEn: "animal" },
  { key: "origins",  icon: "🌍", ar: "المناشئ",           en: "Origins",        oneAr: "منشأ",        oneEn: "origin" },
  { key: "grades",   icon: "🏅", ar: "الدرجات",           en: "Grades",         oneAr: "درجة",        oneEn: "grade" },
  { key: "cuts",     icon: "🥩", ar: "القطع",             en: "Cuts",           oneAr: "قطعة",        oneEn: "cut" },
  { key: "pieces",   icon: "🍖", ar: "الأجزاء",           en: "Pieces",         oneAr: "جزء",         oneEn: "piece" },
  { key: "products", icon: "📦", ar: "المنتجات النهائية", en: "Final products", oneAr: "منتج نهائي",  oneEn: "final product" },
];

const LIST_KEYS = LISTS.map((l) => l.key);
const META = (key) => LISTS.find((l) => l.key === key) || LISTS[0];

/** القطع والأجزاء والمنتجات — لها كود ونِسب وصورة وتصنيف. */
const isItemList = (key) => key === "cuts" || key === "pieces" || key === "products";

/** رسمة مدمجة موجودة فعلاً (ButcherArt بترجع فاضي لأي معرّف غير معروف). */
const drawingOf = (item) => {
  const a = artOf(item);
  return ART_IDS.includes(a) ? a : "";
};

const numOr = (v, fallback) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
}

const freshId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** سجل فارغ حسب المستوى — بلا أي قيمة مُدخلة مسبقاً، المستخدم بيعبّي كل شي. */
function blankRecord(listKey, model, extra) {
  const base = { ar: "", en: "", enabled: true, custom: true, notes: "" };
  if (listKey === "animals") {
    return { ...base, id: freshId("animal"), min: "", max: "", origins: [], ...extra };
  }
  if (listKey === "origins") {
    return { ...base, id: freshId("origin"), ...extra };
  }
  if (listKey === "grades") {
    return { ...base, id: freshId("grade"), animal: "", origin: "", ...extra };
  }
  const item = {
    ...base,
    code: "", codes: {}, refs: {},
    kind: "product", weightOnly: false, uom: "KG",
    order: (model[listKey] || []).length,
  };
  if (listKey === "cuts") return { ...item, id: freshId("cut"), ...extra };
  if (listKey === "pieces") return { ...item, id: freshId("piece"), art: "", whole: false, ...extra };
  return { ...item, id: freshId("prod"), parentId: "", animalId: "", ...extra };
}

/* قائمة الأصناف — تُحمَّل مرة وتُشارَك */
let catalogCache = null;
function useItemCatalog() {
  const [items, setItems] = useState(catalogCache || []);
  useEffect(() => {
    if (catalogCache) return;
    const pub = process.env.PUBLIC_URL || "";
    fetch(`${pub}/data/items.json`, { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no catalog"))))
      .then((d) => { catalogCache = Array.isArray(d) ? d : []; setItems(catalogCache); })
      .catch(() => { catalogCache = []; });
  }, []);
  return items;
}

/* ============================ الصفحة ============================ */

export default function ButcherProductForm() {
  const navigate = useNavigate();
  const { listKey, id } = useParams();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  const { cfg } = useButcherConfig();
  const catalog = useItemCatalog();

  const [draft, setDraft] = useState(null);   // نسخة الإعدادات المعدّلة
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("general");
  const [q, setQ] = useState("");             // بحث الماستر ليست
  const [showOff, setShowOff] = useState(true); // إظهار المعطّل بالقائمة
  const [sideOpen, setSideOpen] = useState(false);

  const canEdit = can("butcher", "edit") || can("butcher", "write");
  const model = draft || cfg;
  const dirty = !!draft;

  const safeList = LIST_KEYS.includes(listKey) ? listKey : "";
  const item = useMemo(
    () => (safeList && id ? (model[safeList] || []).find((x) => x.id === id) || null : null),
    [model, safeList, id]
  );

  /* التبويب يرجع للأول كلما تبدّل السجل */
  useEffect(() => { setTab("general"); }, [safeList, id]);

  /* ── تعديل نسخة الإعدادات ── */
  const edit = (fn) => {
    setMsg("");
    setDraft((prev) => {
      const next = JSON.parse(JSON.stringify(prev || cfg));
      LIST_KEYS.forEach((k) => { if (!Array.isArray(next[k])) next[k] = []; });
      fn(next);
      return next;
    });
  };

  const patch = (p) =>
    edit((n) => {
      const it = (n[safeList] || []).find((x) => x.id === id);
      if (it) Object.assign(it, p);
    });

  const patchRef = (animalId, key, value) =>
    edit((n) => {
      const it = (n[safeList] || []).find((x) => x.id === id);
      if (!it) return;
      const refs = { ...(it.refs || {}) };
      refs[animalId] = { ...(refs[animalId] || {}), [key]: numOr(value, 0) };
      it.refs = refs;
    });

  /** ذبيحة كاملة واحدة فقط — العلامة تُلغى عن باقي الأجزاء. */
  const setWhole = () =>
    edit((n) => {
      n[safeList] = (n[safeList] || []).map((x) =>
        x.id === id
          ? { ...x, whole: true, kind: "product", weightOnly: false }
          : { ...x, whole: false }
      );
    });

  /* ── إضافة سجل جديد بأي مستوى ثم فتحه فوراً ── */
  const addRecord = (key, extra) => {
    if (!canEdit) return;
    const rec = blankRecord(key, model, extra);
    edit((n) => { n[key] = [...(n[key] || []), rec]; });
    setEditing(true);
    setSideOpen(false);
    navigate(`/butcher/product/${key}/${rec.id}`);
  };

  /** نسخ السجل الحالي بكل خصائصه. */
  const duplicate = () => {
    if (!item || !canEdit) return;
    const copy = {
      ...JSON.parse(JSON.stringify(item)),
      id: freshId(safeList.slice(0, 4)),
      whole: false,
      custom: true,
      ar: item.ar ? `${item.ar} (${t({ en: "copy", ar: "نسخة" })})` : "",
      en: item.en ? `${item.en} (copy)` : "",
    };
    edit((n) => { n[safeList] = [...(n[safeList] || []), copy]; });
    setEditing(true);
    navigate(`/butcher/product/${safeList}/${copy.id}`);
  };

  /** حذف السجل + تنظيف الإشارات إليه. */
  const removeRecord = () => {
    if (!item || !canEdit) return;
    const label = nameOf(item, isAr) || item.id;
    const uses = usageOf(model, safeList, item.id, t);
    const warn = uses.length
      ? `\n${t({ en: "Still referenced by", ar: "ما زال مستعملاً في" })}: ${uses.join("، ")}`
      : "";
    const ok = window.confirm(
      `${t({
        en: `Delete “${label}”? Saved reports keep their old values; this only changes the lists.`,
        ar: `حذف «${label}»؟ التقارير المحفوظة بتحتفظ بقيمها القديمة، هذا بيغيّر القوائم فقط.`,
      })}${warn}`
    );
    if (!ok) return;

    edit((n) => {
      n[safeList] = (n[safeList] || []).filter((x) => x.id !== item.id);
      if (safeList === "origins") {
        n.animals = (n.animals || []).map((a) => ({
          ...a,
          origins: Array.isArray(a.origins) ? a.origins.filter((x) => x !== item.id) : a.origins,
        }));
        n.grades = (n.grades || []).map((g) =>
          g.origin === item.id ? { ...g, origin: "" } : g
        );
      }
      if (safeList === "animals") {
        n.grades = (n.grades || []).map((g) =>
          g.animal === item.id ? { ...g, animal: "" } : g
        );
      }
      if (safeList === "cuts" || safeList === "pieces") {
        n.products = (n.products || []).map((p) =>
          p.parentId === item.id ? { ...p, parentId: "" } : p
        );
      }
    });
    navigate("/butcher/master");
  };

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setMsg("");
    try {
      await saveConfig(mergeConfig(draft), currentUser().username || "");
      setDraft(null);
      setEditing(false);
      setMsg(t({ en: "Saved.", ar: "تم الحفظ." }));
    } catch (e) {
      setMsg(`${t({ en: "Save failed", ar: "فشل الحفظ" })}: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const discard = () => { setDraft(null); setEditing(false); setMsg(""); };

  /* ── أرقام أزرار الحالة (stat buttons) ── */
  const children = useMemo(
    () => sortByOrder((model.products || []).filter((p) => p.parentId === id)),
    [model.products, id]
  );
  const usedIn = useMemo(
    () => (model.templates || []).filter((tpl) =>
      (tpl.lines || []).some((l) => l.itemId === id)
    ),
    [model.templates, id]
  );
  const animalsOn = useMemo(() => enabledOnly(model.animals), [model.animals]);
  const parent = item?.parentId ? cfgFind(model, item.parentId) : null;
  const catalogRow = useMemo(
    () => catalog.find((c) => String(c.item_code) === String(item?.code || "")) || null,
    [catalog, item]
  );

  if (!canOpenButcherPage("butcher.settings")) return <NoAccess page="butcher.settings" />;

  const ro = !editing || !canEdit;
  const meta = safeList ? META(safeList) : null;
  const kind = item ? itemKind(item) : "product";
  const kindLabel = nameOf(ITEM_KINDS.find((k) => k.id === kind) || {}, isAr);

  const TABS = [
    { id: "general", ar: "معلومات عامة", en: "General Information" },
    ...(isItemList(safeList) && safeList !== "products"
      ? [{ id: "breakup", ar: "تفاصيل نسب التقطيع", en: "Breakup percentage details" }]
      : []),
    ...(isItemList(safeList)
      ? [{ id: "ratios", ar: "النِّسب المرجعية", en: "Target ratios" }]
      : []),
    ...(safeList === "animals" || safeList === "origins"
      ? [{ id: "tree", ar: "الشجرة", en: "Tree" }]
      : []),
    { id: "picture", ar: "الصورة", en: "Picture" },
  ];
  const activeTab = TABS.some((x) => x.id === tab) ? tab : "general";

  /* ══ الشريط العلوي — مشترك بين شاشة السجل وشاشة "اختر سجلاً" ══ */
  const controlPanel = (
    <div style={S.controlPanel}>
      <div style={S.breadcrumb}>
        <button type="button" style={S.crumbLink} onClick={() => navigate("/butcher/master")}>
          🗂️ {t({ en: "Master list", ar: "الماستر ليست" })}
        </button>
        {meta && (
          <>
            <span style={S.crumbSep}>/</span>
            <span style={S.crumbNow}>{meta.icon} {t(meta)}</span>
          </>
        )}
        {item && (
          <>
            <span style={S.crumbSep}>/</span>
            <span style={S.crumbNow}>
              {item.code ? `[${item.code}] ` : ""}{nameOf(item, isAr) || item.id}
            </span>
          </>
        )}
      </div>

      <div style={S.actions}>
        <button
          type="button"
          className="pf-sidetoggle"
          style={{ ...S.btn, ...S.btnGhost }}
          onClick={() => setSideOpen((v) => !v)}
        >
          ☰ {t({ en: "List", ar: "القائمة" })}
        </button>
        <LangToggle lang={lang} toggle={toggle} style={S.langBtn} />
        {dirty && (
          <span style={S.dirtyDot}>
            ● {t({ en: "Unsaved", ar: "غير محفوظ" })}
          </span>
        )}
        {ro ? (
          <>
            {canEdit && item && (
              <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={() => setEditing(true)}>
                {t({ en: "Edit", ar: "تعديل" })}
              </button>
            )}
            {dirty && (
              <button
                type="button"
                style={{ ...S.btn, ...S.btnPrimary, ...(saving ? S.btnOff : null) }}
                onClick={save}
                disabled={saving}
              >
                {saving ? t({ en: "Saving…", ar: "جارٍ الحفظ…" }) : t({ en: "Save", ar: "حفظ" })}
              </button>
            )}
            <button type="button" style={S.btn} onClick={() => navigate("/butcher/settings")}>
              {t({ en: "Settings", ar: "الإعدادات" })}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              style={{ ...S.btn, ...S.btnPrimary, ...(dirty && !saving ? null : S.btnOff) }}
              onClick={save}
              disabled={!dirty || saving}
            >
              {saving ? t({ en: "Saving…", ar: "جارٍ الحفظ…" }) : t({ en: "Save", ar: "حفظ" })}
            </button>
            <button type="button" style={S.btn} onClick={discard}>
              {t({ en: "Discard", ar: "تجاهل" })}
            </button>
          </>
        )}
      </div>
    </div>
  );

  const sidebar = (
    <MasterList
      t={t} isAr={isAr} model={model} q={q} setQ={setQ}
      showOff={showOff} setShowOff={setShowOff}
      activeList={safeList} activeId={id}
      canEdit={canEdit}
      open={sideOpen}
      onOpen={(k, rid) => { setSideOpen(false); navigate(`/butcher/product/${k}/${rid}`); }}
      onAdd={(k) => addRecord(k)}
    />
  );

  return (
    <div dir={dir} className="pf" style={S.page}>
      <style>{CSS}</style>
      {controlPanel}
      {msg && <div style={S.msgBar}>{msg}</div>}

      <div style={S.sheetWrap}>
        <div className="pf-layout">
          {sidebar}

          {/* ══ الورقة ══ */}
          {!item ? (
            <WelcomePanel t={t} isAr={isAr} model={model} canEdit={canEdit}
              onAdd={(k) => addRecord(k)}
              onOpen={(k, rid) => navigate(`/butcher/product/${k}/${rid}`)}
              missing={!!(safeList && id)} />
          ) : (
            <div style={S.sheet}>
              {/* أزرار الحالة أعلى اليمين */}
              <div style={S.statBox}>
                {isItemList(safeList) ? (
                  <>
                    {safeList !== "products" && (
                      <StatButton
                        icon="🧪"
                        value={children.length}
                        label={t({ en: "Bill of Materials", ar: "مكوّنات التقطيع" })}
                        onClick={() => setTab("breakup")}
                      />
                    )}
                    <StatButton
                      icon="↥"
                      value={usedIn.length}
                      label={t({ en: "Used In", ar: "مستعمل في" })}
                      onClick={() => setTab(safeList === "products" ? "ratios" : "breakup")}
                    />
                    <StatButton icon="⚖️" value={item.uom || "KG"}
                      label={t({ en: "Unit of Measure", ar: "وحدة القياس" })} />
                    <StatButton icon="🏷️" value={item.code || "—"}
                      label={t({ en: "Internal Reference", ar: "الكود الداخلي" })} />
                  </>
                ) : (
                  <TypeStats t={t} isAr={isAr} model={model} listKey={safeList} item={item}
                    onTree={() => setTab("tree")} />
                )}
              </div>

              {/* العنوان */}
              <div style={S.titleBlock}>
                <div className="pf-eyebrow" style={S.eyebrow}>
                  {meta.icon} {t(meta)} — {t({ en: "record name", ar: "اسم السجل" })}
                </div>
                <input
                  className="pf-in pf-title"
                  style={S.titleInput}
                  value={(isAr ? item.ar : item.en) || ""}
                  disabled={ro}
                  placeholder={t({
                    en: `New ${meta.oneEn}…`,
                    ar: `${meta.oneAr} جديد…`,
                  })}
                  onChange={(e) => patch(isAr ? { ar: e.target.value } : { en: e.target.value })}
                />
                <div style={S.badges}>
                  {isItemList(safeList) && <span style={S.badge}>{kindLabel}</span>}
                  {item.whole && (
                    <span style={S.badgeAlt}>{t({ en: "Whole carcass", ar: "ذبيحة كاملة" })}</span>
                  )}
                  {parent && (
                    <span style={S.badgeAlt}>
                      {t({ en: "Parent", ar: "الأم" })}: {nameOf(parent, isAr)}
                    </span>
                  )}
                  <span style={{ ...S.badge, ...(item.enabled === false ? S.badgeOff : S.badgeOn) }}>
                    {item.enabled === false
                      ? t({ en: "Archived", ar: "معطّل" })
                      : t({ en: "Active", ar: "مفعّل" })}
                  </span>
                  <span style={S.badgeId}>{item.id}</span>
                </div>

                <div style={S.checkRow}>
                  <Check
                    label={t({ en: "Active in entry screens", ar: "يظهر في شاشات الإدخال" })}
                    checked={item.enabled !== false}
                    disabled={ro}
                    onChange={(v) => patch({ enabled: v })}
                  />
                  {isItemList(safeList) && (
                    <>
                      <Check
                        label={t({ en: "Include breakup percentage", ar: "احتساب نسب التقطيع" })}
                        checked={!!item.includeBreakup}
                        disabled={ro}
                        onChange={(v) => patch({ includeBreakup: v })}
                      />
                      <Check
                        label={t({ en: "Trimming product", ar: "صنف تنظيف/تشذيب" })}
                        checked={!!item.trimmingProduct}
                        disabled={ro}
                        onChange={(v) => patch({ trimmingProduct: v })}
                      />
                    </>
                  )}
                  {canEdit && (
                    <span style={S.rowTools}>
                      <button type="button" style={S.toolBtn} onClick={duplicate}>
                        ⧉ {t({ en: "Duplicate", ar: "نسخ" })}
                      </button>
                      <button type="button" style={S.toolDanger} onClick={removeRecord}>
                        🗑 {t({ en: "Delete", ar: "حذف" })}
                      </button>
                    </span>
                  )}
                </div>
              </div>

              {/* التبويبات */}
              <div style={S.notebook}>
                {TABS.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    className="pf-tab"
                    onClick={() => setTab(x.id)}
                    style={{ ...S.tab, ...(activeTab === x.id ? S.tabOn : null) }}
                  >
                    {t(x)}
                    {x.id === "breakup" && children.length > 0 && (
                      <span style={S.tabCount}>{children.length}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* ═══ معلومات عامة ═══ */}
              {activeTab === "general" && (
                <div style={S.groups}>
                  {safeList === "animals" && (
                    <AnimalFields
                      t={t} isAr={isAr} ro={ro} item={item} model={model}
                      patch={patch} onAddOrigin={() => addRecord("origins")}
                    />
                  )}
                  {safeList === "origins" && (
                    <OriginFields
                      t={t} isAr={isAr} ro={ro} item={item} model={model}
                      patch={patch} edit={edit}
                    />
                  )}
                  {safeList === "grades" && (
                    <GradeFields
                      t={t} isAr={isAr} ro={ro} item={item} model={model} patch={patch}
                    />
                  )}
                  {isItemList(safeList) && (
                    <ItemFields
                      t={t} isAr={isAr} ro={ro} item={item} model={model} listKey={safeList}
                      catalog={catalog} catalogRow={catalogRow}
                      patch={patch} setWhole={setWhole} kind={kind}
                    />
                  )}

                  <Group title={t({ en: "Internal Notes", ar: "ملاحظات داخلية" })} wide>
                    <textarea
                      className="pf-in"
                      disabled={ro}
                      rows={4}
                      value={item.notes || ""}
                      style={{ resize: "vertical" }}
                      onChange={(e) => patch({ notes: e.target.value })}
                    />
                  </Group>
                </div>
              )}

              {/* ═══ تفاصيل نسب التقطيع — الـ BOM ═══ */}
              {activeTab === "breakup" && (
                <BreakupTab
                  t={t} isAr={isAr} ro={ro} canEdit={canEdit}
                  item={item} components={children} usedIn={usedIn}
                  navigate={navigate}
                  onAddProduct={() =>
                    addRecord("products", { parentId: item.id, animalId: animalsOn[0]?.id || "" })
                  }
                />
              )}

              {/* ═══ النِّسب المرجعية ═══ */}
              {activeTab === "ratios" && (
                <RatiosTab
                  t={t} isAr={isAr} ro={ro} item={item} animals={animalsOn}
                  patchRef={patchRef} onAddAnimal={() => addRecord("animals")}
                  canEdit={canEdit}
                />
              )}

              {/* ═══ الشجرة (للذبائح والمناشئ) ═══ */}
              {activeTab === "tree" && (
                <TreeTab
                  t={t} isAr={isAr} model={model} listKey={safeList} item={item}
                  canEdit={canEdit} navigate={navigate}
                  onAddGrade={(extra) => addRecord("grades", extra)}
                  onAddOrigin={() => addRecord("origins")}
                />
              )}

              {/* ═══ الصورة ═══ */}
              {activeTab === "picture" && (
                <PictureTab t={t} ro={ro} item={item} patch={patch} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================ قائمة الماستر ============================ */

function MasterList({
  t, isAr, model, q, setQ, showOff, setShowOff,
  activeList, activeId, canEdit, onOpen, onAdd, open,
}) {
  const needle = q.trim().toLowerCase();

  const rows = (key) => {
    const list = key === "animals" || key === "origins" || key === "grades"
      ? (model[key] || [])
      : sortByOrder(model[key] || []);
    return list.filter((x) => {
      if (!showOff && x.enabled === false) return false;
      if (!needle) return true;
      return [x.ar, x.en, x.code, x.id]
        .some((v) => String(v || "").toLowerCase().includes(needle));
    });
  };

  const total = LIST_KEYS.reduce((s, k) => s + (model[k] || []).length, 0);

  return (
    <aside className={`pf-side${open ? " open" : ""}`} style={S.side}>
      <div style={S.sideHead}>
        <span style={S.sideTitle}>🗂️ {t({ en: "Master list", ar: "الماستر ليست" })}</span>
        <span style={S.sideCount}>{total}</span>
      </div>

      <input
        style={S.search}
        value={q}
        placeholder={t({ en: "Search name, code or id…", ar: "بحث بالاسم أو الكود أو المعرّف…" })}
        onChange={(e) => setQ(e.target.value)}
      />

      <label style={S.sideCheck}>
        <input type="checkbox" checked={showOff} style={S.checkBox}
          onChange={(e) => setShowOff(e.target.checked)} />
        <span>{t({ en: "Show archived", ar: "إظهار المعطّل" })}</span>
      </label>

      <div style={S.sideScroll}>
        {LISTS.map((l) => {
          const items = rows(l.key);
          return (
            <div key={l.key} style={S.grpBox}>
              <div className="pf-grp" style={S.grpHead}>
                <span style={S.grpName}>
                  {l.icon} {t(l)}
                  <span style={S.grpCount}>{items.length}</span>
                </span>
                {canEdit && (
                  <button
                    type="button"
                    style={S.grpAdd}
                    title={t({ en: `New ${l.oneEn}`, ar: `${l.oneAr} جديد` })}
                    onClick={() => onAdd(l.key)}
                  >
                    ＋
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <div style={S.grpEmpty}>
                  {needle
                    ? t({ en: "No match", ar: "لا نتائج" })
                    : t({ en: "Empty — press ＋", ar: "فارغ — اضغط ＋" })}
                </div>
              ) : (
                items.map((x) => {
                  const on = activeList === l.key && activeId === x.id;
                  return (
                    <button
                      key={x.id}
                      type="button"
                      className="pf-rec"
                      style={{ ...S.rec, ...(on ? S.recOn : null) }}
                      onClick={() => onOpen(l.key, x.id)}
                    >
                      <span style={S.recThumb}>
                        {imageOf(x) ? (
                          <img src={imageOf(x)} alt="" style={S.recImg} />
                        ) : drawingOf(x) ? (
                          <ButcherArt id={drawingOf(x)} />
                        ) : (
                          <span style={S.recDot}>{l.icon}</span>
                        )}
                      </span>
                      <span style={S.recBody}>
                        <span style={S.recName}>
                          {nameOf(x, isAr) || x.id}
                          {x.enabled === false && <span style={S.recOff}> ⛔</span>}
                        </span>
                        <span style={S.recSub}>{subtitleOf(model, l.key, x, isAr, t)}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/** سطر ثانوي تحت اسم السجل بالقائمة — يختلف حسب المستوى. */
function subtitleOf(model, key, x, isAr, t) {
  if (key === "animals") {
    const n = Array.isArray(x.origins) ? x.origins.length : 0;
    return `${x.min ?? "—"}–${x.max ?? "—"} kg · ${n} ${t({ en: "origins", ar: "منشأ" })}`;
  }
  if (key === "origins") {
    const users = (model.animals || []).filter(
      (a) => !Array.isArray(a.origins) || a.origins.includes(x.id)
    );
    return users.map((a) => nameOf(a, isAr)).join(" · ") || t({ en: "unused", ar: "غير مستعمل" });
  }
  if (key === "grades") {
    const a = (model.animals || []).find((z) => z.id === x.animal);
    const o = (model.origins || []).find((z) => z.id === x.origin);
    return [nameOf(a || {}, isAr), nameOf(o || {}, isAr)].filter(Boolean).join(" · ") || "—";
  }
  if (key === "products") {
    const p = cfgFind(model, x.parentId);
    return `${x.code || "—"} · ${p ? nameOf(p, isAr) : `⚠️ ${t({ en: "no parent", ar: "بلا أم" })}`}`;
  }
  const kindLbl = nameOf(ITEM_KINDS.find((k) => k.id === itemKind(x)) || {}, isAr);
  return `${x.code || "—"} · ${x.whole ? t({ en: "whole carcass", ar: "ذبيحة كاملة" }) : kindLbl}`;
}

/** أين يُستعمل هذا السجل؟ — لتحذير الحذف. */
function usageOf(model, key, recId, t) {
  const out = [];
  const add = (n, en, ar) => { if (n) out.push(`${n} ${t({ en, ar })}`); };

  if (key === "origins") {
    add((model.animals || []).filter((a) => (a.origins || []).includes(recId)).length,
      "animal(s)", "ذبيحة");
    add((model.grades || []).filter((g) => g.origin === recId).length, "grade(s)", "درجة");
  }
  if (key === "animals") {
    add((model.grades || []).filter((g) => g.animal === recId).length, "grade(s)", "درجة");
  }
  if (key === "cuts" || key === "pieces") {
    add((model.products || []).filter((p) => p.parentId === recId).length,
      "final product(s)", "منتج نهائي");
  }
  add(
    (model.templates || []).filter((tpl) =>
      (tpl.lines || []).some((l) => l.itemId === recId)
    ).length,
    "cutting template(s)", "وصفة تقطيع"
  );
  return out;
}

/* ============================ شاشة البداية ============================ */

function WelcomePanel({ t, isAr, model, canEdit, onAdd, onOpen, missing }) {
  /* آخر سجلّين من كل مستوى — الإضافة بتنحط بآخر القائمة */
  const recent = LIST_KEYS
    .flatMap((k) => (model[k] || []).slice(-2).map((x) => ({ ...x, __k: k })))
    .reverse();

  return (
    <div style={S.sheet}>
      <div style={S.welcomeHead}>
        <div style={{ fontSize: 52 }}>🗂️</div>
        <div className="pf-title" style={{ fontWeight: 900 }}>
          {t({ en: "Butcher master list", ar: "ماستر ليست الجزار" })}
        </div>
        <div style={S.hint}>
          {missing
            ? t({ en: "That record no longer exists — pick another one.", ar: "هذا السجل ما عاد موجوداً — اختر غيره." })
            : t({
                en: "Every level of the tree is entered here: animals, origins, grades, cuts, pieces and final products — each one with all of its attributes.",
                ar: "كل مستويات الشجرة بتنضاف من هون: الذبائح والمناشئ والدرجات والقطع والأجزاء والمنتجات النهائية — وكل واحد بكل خصائصه.",
              })}
        </div>
      </div>

      <div style={S.startGrid}>
        {LISTS.map((l) => (
          <div key={l.key} style={S.startCard}>
            <div style={S.startIcon}>{l.icon}</div>
            <div style={S.startName}>{t(l)}</div>
            <div style={S.startCount}>
              {(model[l.key] || []).length} {t({ en: "records", ar: "سجل" })}
            </div>
            {canEdit && (
              <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={() => onAdd(l.key)}>
                ＋ {t({ en: `New ${l.oneEn}`, ar: `${l.oneAr} جديد` })}
              </button>
            )}
          </div>
        ))}
      </div>

      {recent.length > 0 && (
        <>
          <div className="pf-sec" style={S.subHead}>
            {t({ en: "Recently added", ar: "آخر ما أُضيف" })}
          </div>
          <div style={S.recentRow}>
            {recent.map((x) => (
              <button key={`${x.__k}${x.id}`} type="button" style={S.recentChip}
                onClick={() => onOpen(x.__k, x.id)}>
                {META(x.__k).icon} {nameOf(x, isAr) || x.id}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================ حقول كل مستوى ============================ */

function AnimalFields({ t, isAr, ro, item, model, patch, onAddOrigin }) {
  const origins = model.origins || [];
  const picked = Array.isArray(item.origins) ? item.origins : [];

  return (
    <>
      <Group title={t({ en: "Identification", ar: "التعريف" })}>
        <Row label={t({ en: "Arabic name", ar: "الاسم بالعربي" })}>
          <input className="pf-in" disabled={ro} value={item.ar || ""}
            onChange={(e) => patch({ ar: e.target.value })} />
        </Row>
        <Row label={t({ en: "English name", ar: "الاسم بالإنجليزي" })}>
          <input className="pf-in" disabled={ro} value={item.en || ""}
            onChange={(e) => patch({ en: e.target.value })} />
        </Row>
        <Row label={t({ en: "ID", ar: "المعرّف" })}>
          <input className="pf-in" disabled value={item.id} />
        </Row>
      </Group>

      <Group title={t({ en: "Carcass weight range", ar: "مدى وزن الذبيحة" })}>
        <Row label={t({ en: "Minimum (kg)", ar: "أدنى وزن (كجم)" })}>
          <input className="pf-in" disabled={ro} inputMode="decimal" value={item.min ?? ""}
            onChange={(e) => patch({ min: e.target.value === "" ? "" : numOr(e.target.value, "") })} />
        </Row>
        <Row label={t({ en: "Maximum (kg)", ar: "أعلى وزن (كجم)" })}>
          <input className="pf-in" disabled={ro} inputMode="decimal" value={item.max ?? ""}
            onChange={(e) => patch({ max: e.target.value === "" ? "" : numOr(e.target.value, "") })} />
        </Row>
        <div style={S.hint}>
          {t({
            en: "Optional — leave a box empty for no limit. The entry screen only warns when a bound is set.",
            ar: "اختياري — الخانة الفارغة يعني بلا حدّ. شاشة الإدخال بتحذّر فقط إذا في حدّ محدّد.",
          })}
        </div>
      </Group>

      <Group title={t({ en: "Allowed origins", ar: "المناشئ المسموحة" })} wide>
        {origins.length === 0 ? (
          <div style={S.emptyBox}>
            {t({ en: "No origins yet.", ar: "لا توجد مناشئ بعد." })}
            {!ro && (
              <div style={{ marginTop: 12 }}>
                <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={onAddOrigin}>
                  ＋ {t({ en: "New origin", ar: "منشأ جديد" })}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={S.chipWrap}>
              {origins.map((o) => {
                const on = picked.length === 0 ? true : picked.includes(o.id);
                return (
                  <label key={o.id} style={{ ...S.chip, ...(on ? S.chipOn : null) }}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={ro}
                      style={S.checkBox}
                      onChange={(e) => {
                        const cur = picked.length === 0 ? origins.map((x) => x.id) : picked;
                        const next = e.target.checked
                          ? [...new Set([...cur, o.id])]
                          : cur.filter((x) => x !== o.id);
                        patch({ origins: next });
                      }}
                    />
                    {nameOf(o, isAr) || o.id}
                  </label>
                );
              })}
            </div>
            <div style={S.hint}>
              {t({
                en: "Leave everything ticked to allow all origins for this animal.",
                ar: "خلّي الكل محدّد إذا كل المناشئ مسموحة لهذا النوع.",
              })}
            </div>
          </>
        )}
      </Group>
    </>
  );
}

function OriginFields({ t, isAr, ro, item, model, patch, edit }) {
  const animals = model.animals || [];

  const toggleAnimal = (animalId, on) =>
    edit((n) => {
      const a = (n.animals || []).find((x) => x.id === animalId);
      if (!a) return;
      const all = (n.origins || []).map((o) => o.id);
      const cur = Array.isArray(a.origins) && a.origins.length ? a.origins : all;
      a.origins = on
        ? [...new Set([...cur, item.id])]
        : cur.filter((x) => x !== item.id);
    });

  return (
    <>
      <Group title={t({ en: "Identification", ar: "التعريف" })}>
        <Row label={t({ en: "Arabic name", ar: "الاسم بالعربي" })}>
          <input className="pf-in" disabled={ro} value={item.ar || ""}
            onChange={(e) => patch({ ar: e.target.value })} />
        </Row>
        <Row label={t({ en: "English name", ar: "الاسم بالإنجليزي" })}>
          <input className="pf-in" disabled={ro} value={item.en || ""}
            onChange={(e) => patch({ en: e.target.value })} />
        </Row>
        <Row label={t({ en: "ID", ar: "المعرّف" })}>
          <input className="pf-in" disabled value={item.id} />
        </Row>
      </Group>

      <Group title={t({ en: "Used by animals", ar: "الذبائح التي تستعمله" })}>
        {animals.length === 0 ? (
          <div style={S.emptyBox}>{t({ en: "No animals yet.", ar: "لا توجد ذبائح بعد." })}</div>
        ) : (
          <div style={S.chipWrap}>
            {animals.map((a) => {
              const on = !Array.isArray(a.origins) || a.origins.length === 0
                ? true
                : a.origins.includes(item.id);
              return (
                <label key={a.id} style={{ ...S.chip, ...(on ? S.chipOn : null) }}>
                  <input type="checkbox" checked={on} disabled={ro} style={S.checkBox}
                    onChange={(e) => toggleAnimal(a.id, e.target.checked)} />
                  {nameOf(a, isAr) || a.id}
                </label>
              );
            })}
          </div>
        )}
      </Group>
    </>
  );
}

function GradeFields({ t, isAr, ro, item, model, patch }) {
  const animals = enabledOnly(model.animals);
  const origins = originsForAnimal(model, item.animal);

  return (
    <>
      <Group title={t({ en: "Identification", ar: "التعريف" })}>
        <Row label={t({ en: "Arabic name", ar: "الاسم بالعربي" })}>
          <input className="pf-in" disabled={ro} value={item.ar || ""}
            onChange={(e) => patch({ ar: e.target.value })} />
        </Row>
        <Row label={t({ en: "English name", ar: "الاسم بالإنجليزي" })}>
          <input className="pf-in" disabled={ro} value={item.en || ""}
            onChange={(e) => patch({ en: e.target.value })} />
        </Row>
        <Row label={t({ en: "ID", ar: "المعرّف" })}>
          <input className="pf-in" disabled value={item.id} />
        </Row>
      </Group>

      <Group title={t({ en: "Applies to", ar: "تنطبق على" })}>
        <Row label={t({ en: "Animal", ar: "الذبيحة" })}>
          <select className="pf-in" disabled={ro} value={item.animal || ""}
            onChange={(e) => patch({ animal: e.target.value, origin: "" })}>
            <option value="">{t({ en: "Select…", ar: "اختر…" })}</option>
            {animals.map((a) => (
              <option key={a.id} value={a.id}>{nameOf(a, isAr) || a.id}</option>
            ))}
          </select>
        </Row>
        <Row label={t({ en: "Origin", ar: "المنشأ" })}>
          <select className="pf-in" disabled={ro} value={item.origin || ""}
            onChange={(e) => patch({ origin: e.target.value })}>
            <option value="">{t({ en: "Select…", ar: "اختر…" })}</option>
            {origins.map((o) => (
              <option key={o.id} value={o.id}>{nameOf(o, isAr) || o.id}</option>
            ))}
          </select>
        </Row>
        <div style={S.hint}>
          {t({
            en: "A grade adds one extra step in the entry screen after the origin is picked.",
            ar: "الدرجة بتضيف خطوة وحدة بشاشة الإدخال بعد اختيار المنشأ.",
          })}
        </div>
      </Group>
    </>
  );
}

function ItemFields({
  t, isAr, ro, item, model, listKey, catalog, catalogRow, patch, setWhole, kind,
}) {
  return (
    <>
      <Group title={t({ en: "Identification", ar: "التعريف" })}>
        <Row label={t({ en: "Internal Reference", ar: "الكود الداخلي" })}>
          <CodeField
            value={item.code || ""}
            disabled={ro}
            catalog={catalog}
            t={t}
            onPick={(row) =>
              patch({
                code: String(row.item_code),
                en: row.description || item.en || "",
                ar: item.ar || row.description || "",
              })
            }
            onType={(v) => patch({ code: v })}
          />
          {catalogRow && <div style={S.hint}>{catalogRow.description}</div>}
          {item.code && !catalogRow && (
            <div style={S.hintBad}>
              ⚠️ {t({ en: "Not in the item catalog", ar: "غير موجود في قائمة الأصناف" })}
            </div>
          )}
        </Row>
        <Row label={t({ en: "Arabic name", ar: "الاسم بالعربي" })}>
          <input className="pf-in" disabled={ro} value={item.ar || ""}
            onChange={(e) => patch({ ar: e.target.value })} />
        </Row>
        <Row label={t({ en: "English name", ar: "الاسم بالإنجليزي" })}>
          <input className="pf-in" disabled={ro} value={item.en || ""}
            onChange={(e) => patch({ en: e.target.value })} />
        </Row>
        <Row label={t({ en: "Barcode", ar: "الباركود" })}>
          <input className="pf-in" disabled={ro} value={item.barcode || ""}
            onChange={(e) => patch({ barcode: e.target.value })} />
        </Row>
        <Row label={t({ en: "Product Category", ar: "فئة الصنف" })}>
          <input className="pf-in" disabled={ro} value={item.category || ""}
            placeholder={t({ en: "e.g. IMPOR", ar: "مثلاً: IMPOR" })}
            onChange={(e) => patch({ category: e.target.value })} />
        </Row>
        <Row label={t({ en: "Tags", ar: "الوسوم" })}>
          <input className="pf-in" disabled={ro} value={item.tags || ""}
            placeholder={t({ en: "e.g. Lamb-AUS", ar: "مثلاً: Lamb-AUS" })}
            onChange={(e) => patch({ tags: e.target.value })} />
        </Row>
        <Row label={t({ en: "Display order", ar: "ترتيب العرض" })}>
          <input className="pf-in" disabled={ro} inputMode="numeric"
            style={{ maxWidth: 140 }}
            value={Number.isFinite(item.order) ? item.order : ""}
            onChange={(e) => patch({ order: numOr(e.target.value, 0) })} />
        </Row>
      </Group>

      <Group title={t({ en: "Classification", ar: "التصنيف" })}>
        <Row label={t({ en: "Product Type", ar: "نوع الصنف" })}>
          <select
            className="pf-in"
            disabled={ro}
            value={item.whole ? "whole" : kind}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "whole") { setWhole(); return; }
              patch({ whole: false, kind: v, weightOnly: v !== "product" });
            }}
          >
            {ITEM_KINDS.map((k) => (
              <option key={k.id} value={k.id}>{nameOf(k, isAr)}</option>
            ))}
            {listKey === "pieces" && (
              <option value="whole">{t({ en: "Whole carcass", ar: "ذبيحة كاملة" })}</option>
            )}
          </select>
        </Row>
        <Row label={t({ en: "Parent Product", ar: "الصنف الأم" })}>
          <select
            className="pf-in"
            disabled={ro || listKey !== "products"}
            value={item.parentId || ""}
            onChange={(e) => patch({ parentId: e.target.value })}
          >
            <option value="">{t({ en: "None", ar: "بلا" })}</option>
            {[...enabledOnly(model.cuts), ...enabledOnly(model.pieces)]
              .filter((c) => c.id !== item.id && !c.whole)
              .map((c) => (
                <option key={c.id} value={c.id}>{nameOf(c, isAr) || c.id}</option>
              ))}
          </select>
        </Row>
        {listKey === "products" && (
          <Row label={t({ en: "Animal", ar: "الذبيحة" })}>
            <select className="pf-in" disabled={ro} value={item.animalId || ""}
              onChange={(e) => patch({ animalId: e.target.value })}>
              <option value="">{t({ en: "All animals", ar: "كل الذبائح" })}</option>
              {enabledOnly(model.animals).map((a) => (
                <option key={a.id} value={a.id}>{nameOf(a, isAr) || a.id}</option>
              ))}
            </select>
          </Row>
        )}
        <Row label={t({ en: "Unit of Measure", ar: "وحدة القياس" })}>
          <select className="pf-in" disabled={ro} value={item.uom || "KG"}
            onChange={(e) => patch({ uom: e.target.value })}>
            <option value="KG">KG</option>
            <option value="PCS">PCS</option>
            <option value="BOX">BOX</option>
          </select>
        </Row>
        <Row label={t({ en: "Country of origin", ar: "بلد المنشأ" })}>
          <select className="pf-in" disabled={ro} value={item.originId || ""}
            onChange={(e) => patch({ originId: e.target.value })}>
            <option value="">{t({ en: "None", ar: "بلا" })}</option>
            {enabledOnly(model.origins).map((o) => (
              <option key={o.id} value={o.id}>{nameOf(o, isAr) || o.id}</option>
            ))}
          </select>
        </Row>
        <Row label={t({ en: "Cost", ar: "التكلفة" })}>
          <span style={S.inline}>
            <input className="pf-in" disabled={ro} value={item.cost ?? ""} inputMode="decimal"
              style={{ maxWidth: 140 }}
              onChange={(e) => patch({ cost: e.target.value })} />
            <span style={S.unit}>AED / {item.uom || "KG"}</span>
          </span>
        </Row>
        <Row label={t({ en: "Sales Price", ar: "سعر البيع" })}>
          <span style={S.inline}>
            <input className="pf-in" disabled={ro} value={item.price ?? ""} inputMode="decimal"
              style={{ maxWidth: 140 }}
              onChange={(e) => patch({ price: e.target.value })} />
            <span style={S.unit}>AED / {item.uom || "KG"}</span>
          </span>
        </Row>
      </Group>

      <Group title={t({ en: "Yield ratios", ar: "نِسب التصافي" })} wide>
        <div style={S.ratioGrid}>
          <MiniField
            label={t({ en: "BI ratio with bones", ar: "نسبة التصافي مع العظم" })}
            value={item.biRatioWithBones} suffix="%" disabled={ro}
            onChange={(v) => patch({ biRatioWithBones: v })}
          />
          <MiniField
            label={t({ en: "Cost ratio with bones", ar: "نسبة التكلفة مع العظم" })}
            value={item.costRatioWithBones} suffix="%" disabled={ro}
            onChange={(v) => patch({ costRatioWithBones: v })}
          />
          <MiniField
            label={t({ en: "BI ratio without bones", ar: "نسبة التصافي بدون عظم" })}
            value={item.biRatioWithoutBones} suffix="%" disabled={ro}
            onChange={(v) => patch({ biRatioWithoutBones: v })}
          />
          <MiniField
            label={t({ en: "Cost ratio without bones", ar: "نسبة التكلفة بدون عظم" })}
            value={item.costRatioWithoutBones} suffix="%" disabled={ro}
            onChange={(v) => patch({ costRatioWithoutBones: v })}
          />
        </div>
      </Group>
    </>
  );
}

/* ============================ التبويبات ============================ */

function RatiosTab({ t, isAr, ro, item, animals, patchRef, onAddAnimal, canEdit }) {
  return (
    <div style={S.tabBody}>
      <div style={S.hint}>
        {t({
          en: "Target share of the parent weight, per animal. Leave empty to hide this item from the reference panel on the entry screen.",
          ar: "الحصّة المرجعية من وزن الأم لكل نوع ذبيحة. اتركها فارغة لإخفاء الصنف من لوحة النِّسب في شاشة الإدخال.",
        })}
      </div>
      {!animals.length ? (
        <div style={S.emptyBox}>
          {t({ en: "No animals configured yet.", ar: "لا توجد ذبائح معرّفة بعد." })}
          {canEdit && (
            <div style={{ marginTop: 12 }}>
              <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={onAddAnimal}>
                ＋ {t({ en: "New animal", ar: "ذبيحة جديدة" })}
              </button>
            </div>
          )}
        </div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>{t({ en: "Animal", ar: "الذبيحة" })}</th>
              <th style={S.th}>{t({ en: "Min %", ar: "أدنى ٪" })}</th>
              <th style={S.th}>{t({ en: "Max %", ar: "أعلى ٪" })}</th>
              <th style={S.th}>{t({ en: "Midpoint", ar: "الوسط" })}</th>
            </tr>
          </thead>
          <tbody>
            {animals.map((a) => {
              const r = item.refs?.[a.id] || {};
              const mid = Number.isFinite(Number(r.min)) && Number.isFinite(Number(r.max))
                ? ((Number(r.min) + Number(r.max)) / 2).toFixed(1)
                : "—";
              return (
                <tr key={a.id}>
                  <td style={{ ...S.td, fontWeight: 900 }}>{nameOf(a, isAr) || a.id}</td>
                  <td style={S.td}>
                    <input className="pf-in" disabled={ro} inputMode="decimal"
                      style={{ textAlign: "center", maxWidth: 120, margin: "0 auto" }}
                      value={r.min ?? ""}
                      onChange={(e) => patchRef(a.id, "min", e.target.value)} />
                  </td>
                  <td style={S.td}>
                    <input className="pf-in" disabled={ro} inputMode="decimal"
                      style={{ textAlign: "center", maxWidth: 120, margin: "0 auto" }}
                      value={r.max ?? ""}
                      onChange={(e) => patchRef(a.id, "max", e.target.value)} />
                  </td>
                  <td style={{ ...S.td, color: "#6b8299", fontWeight: 800 }}>{mid}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function BreakupTab({ t, isAr, ro, canEdit, item, components, usedIn, navigate, onAddProduct }) {
  const total = components.reduce(
    (s, c) => s + (Number(c.refs?.[Object.keys(c.refs || {})[0]]?.max) || 0), 0
  );

  return (
    <div style={S.tabBody}>
      <div style={S.hint}>
        {t({
          en: "The final products this item breaks down into. Add them right here — each one opens as its own record.",
          ar: "المنتجات النهائية التي يتفرّع إليها هذا الصنف. ضيفها من هون — وكل واحد بيفتح كسجل مستقل.",
        })}
      </div>

      {canEdit && (
        <div>
          <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={onAddProduct}>
            ＋ {t({ en: "New final product here", ar: "منتج نهائي تحت هذا الصنف" })}
          </button>
        </div>
      )}

      {components.length === 0 ? (
        <div style={S.emptyBox}>
          {t({ en: "No components yet.", ar: "لا توجد مكوّنات بعد." })}
        </div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>#</th>
              <th style={S.th}>{t({ en: "Code", ar: "الكود" })}</th>
              <th style={S.th}>{t({ en: "Component", ar: "المكوّن" })}</th>
              <th style={S.th}>{t({ en: "Kind", ar: "التصنيف" })}</th>
              <th style={S.th}>{t({ en: "Target %", ar: "النسبة المرجعية" })}</th>
              <th style={S.th}></th>
            </tr>
          </thead>
          <tbody>
            {components.map((c, i) => {
              const firstAnimal = Object.keys(c.refs || {})[0];
              const r = firstAnimal ? c.refs[firstAnimal] : null;
              return (
                <tr key={c.id}>
                  <td style={{ ...S.td, color: "#8aa3b8" }}>{i + 1}</td>
                  <td style={{ ...S.td, fontWeight: 900 }}>{c.code || "—"}</td>
                  <td style={{ ...S.td, textAlign: "start" }}>{nameOf(c, isAr) || c.id}</td>
                  <td style={S.td}>
                    {nameOf(ITEM_KINDS.find((k) => k.id === itemKind(c)) || {}, isAr)}
                  </td>
                  <td style={S.td}>
                    {r ? `${r.min ?? "—"} – ${r.max ?? "—"}%` : "—"}
                  </td>
                  <td style={S.td}>
                    <button
                      type="button"
                      style={S.linkBtn}
                      onClick={() => navigate(`/butcher/product/products/${c.id}`)}
                    >
                      {t({ en: "Open", ar: "فتح" })} →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...S.td, fontWeight: 900 }} colSpan={4}>
                {t({ en: "Total (max)", ar: "المجموع (الأعلى)" })}
              </td>
              <td style={{
                ...S.td, fontWeight: 900,
                color: total > 100 ? "#a12626" : "#14507f",
              }}>
                {total.toFixed(1)}%
              </td>
              <td style={S.td}></td>
            </tr>
          </tfoot>
        </table>
      )}

      {/* مستعمل في: وصفات التقطيع */}
      <div className="pf-sec" style={S.subHead}>
        {t({ en: "Used in cutting templates", ar: "مستعمل في وصفات التقطيع" })}
      </div>
      {usedIn.length === 0 ? (
        <div style={S.emptyBox}>
          {t({ en: "Not used in any template.", ar: "غير مستعمل بأي وصفة." })}
        </div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>{t({ en: "Template no.", ar: "رقم الوصفة" })}</th>
              <th style={S.th}>{t({ en: "Name", ar: "الاسم" })}</th>
              <th style={S.th}>{t({ en: "% in template", ar: "النسبة بالوصفة" })}</th>
            </tr>
          </thead>
          <tbody>
            {usedIn.map((tpl) => {
              const line = (tpl.lines || []).find((l) => l.itemId === item.id);
              return (
                <tr key={tpl.id}>
                  <td style={{ ...S.td, fontWeight: 900 }}>{tpl.no || "—"}</td>
                  <td style={{ ...S.td, textAlign: "start" }}>{nameOf(tpl, isAr) || "—"}</td>
                  <td style={S.td}>{line?.pct ? `${line.pct}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {ro && (
        <div style={S.hint}>
          {t({ en: "Press Edit to change this record.", ar: "اضغط «تعديل» لتغيير هذا السجل." })}
        </div>
      )}
    </div>
  );
}

/** شجرة الذبيحة/المنشأ — المستوى التالي مباشرة من نفس الصفحة. */
function TreeTab({ t, isAr, model, listKey, item, canEdit, navigate, onAddGrade, onAddOrigin }) {
  if (listKey === "animals") {
    const origins = originsForAnimal(model, item.id);
    return (
      <div style={S.tabBody}>
        <div style={S.hint}>
          {t({
            en: "Origins allowed for this animal and the grades under each one.",
            ar: "المناشئ المسموحة لهذه الذبيحة والدرجات تحت كل منشأ.",
          })}
        </div>
        {origins.length === 0 && (
          <div style={S.emptyBox}>
            {t({ en: "No origins allowed yet.", ar: "لا مناشئ مسموحة بعد." })}
            {canEdit && (
              <div style={{ marginTop: 12 }}>
                <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={onAddOrigin}>
                  ＋ {t({ en: "New origin", ar: "منشأ جديد" })}
                </button>
              </div>
            )}
          </div>
        )}
        {origins.map((o) => {
          const grades = (model.grades || []).filter(
            (g) => g.animal === item.id && g.origin === o.id
          );
          return (
            <div key={o.id} style={S.treeBox}>
              <div style={S.treeHead}>
                <button type="button" style={S.linkBtn}
                  onClick={() => navigate(`/butcher/product/origins/${o.id}`)}>
                  🌍 {nameOf(o, isAr) || o.id}
                </button>
                <span style={S.treeCount}>
                  {grades.length} {t({ en: "grades", ar: "درجة" })}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    style={S.toolBtn}
                    onClick={() => onAddGrade({ animal: item.id, origin: o.id })}
                  >
                    ＋ {t({ en: "Grade", ar: "درجة" })}
                  </button>
                )}
              </div>
              {grades.length > 0 && (
                <div style={S.chipWrap}>
                  {grades.map((g) => (
                    <button key={g.id} type="button" style={S.chipBtn}
                      onClick={() => navigate(`/butcher/product/grades/${g.id}`)}>
                      🏅 {nameOf(g, isAr) || g.id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  /* المنشأ: مين بيستعمله وأي درجات تحته */
  const animals = (model.animals || []).filter(
    (a) => !Array.isArray(a.origins) || a.origins.length === 0 || a.origins.includes(item.id)
  );
  const grades = (model.grades || []).filter((g) => g.origin === item.id);

  return (
    <div style={S.tabBody}>
      <div className="pf-sec" style={S.subHead}>
        {t({ en: "Animals using this origin", ar: "الذبائح التي تستعمل هذا المنشأ" })}
      </div>
      {animals.length === 0 ? (
        <div style={S.emptyBox}>{t({ en: "None.", ar: "لا شيء." })}</div>
      ) : (
        <div style={S.chipWrap}>
          {animals.map((a) => (
            <button key={a.id} type="button" style={S.chipBtn}
              onClick={() => navigate(`/butcher/product/animals/${a.id}`)}>
              🐑 {nameOf(a, isAr) || a.id}
            </button>
          ))}
        </div>
      )}

      <div className="pf-sec" style={S.subHead}>
        {t({ en: "Grades under this origin", ar: "الدرجات تحت هذا المنشأ" })}
      </div>
      {grades.length === 0 ? (
        <div style={S.emptyBox}>
          {t({ en: "No grades yet.", ar: "لا توجد درجات بعد." })}
          {canEdit && (
            <div style={{ marginTop: 12 }}>
              <button type="button" style={{ ...S.btn, ...S.btnPrimary }}
                onClick={() => onAddGrade({ origin: item.id })}>
                ＋ {t({ en: "New grade", ar: "درجة جديدة" })}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={S.chipWrap}>
          {grades.map((g) => (
            <button key={g.id} type="button" style={S.chipBtn}
              onClick={() => navigate(`/butcher/product/grades/${g.id}`)}>
              🏅 {nameOf(g, isAr) || g.id}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PictureTab({ t, ro, item, patch }) {
  return (
    <div style={S.tabBody}>
      <div style={S.pictureRow}>
        <div style={S.pictureBox}>
          {imageOf(item) ? (
            <img src={imageOf(item)} alt="" style={S.pictureImg} />
          ) : drawingOf(item) ? (
            <ButcherArt id={drawingOf(item)} />
          ) : (
            <span style={S.pictureNone}>{t({ en: "No picture", ar: "بلا صورة" })}</span>
          )}
        </div>

        <div style={S.pictureSide}>
          <Row label={t({ en: "Built-in drawing", ar: "الرسمة المدمجة" })}>
            <select className="pf-in" disabled={ro || !!imageOf(item)} value={drawingOf(item)}
              onChange={(e) => patch({ art: e.target.value })}>
              <option value="">{t({ en: "No drawing", ar: "بلا رسمة" })}</option>
              {ART_IDS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </Row>

          {!ro && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <PictureUpload t={t} onDone={(u) => patch({ imageUrl: u })} />
              {imageOf(item) && (
                <button type="button" style={S.btnDanger} onClick={() => patch({ imageUrl: "" })}>
                  {t({ en: "Remove picture", ar: "إزالة الصورة" })}
                </button>
              )}
            </div>
          )}

          <div style={S.hint}>
            {t({
              en: "An uploaded picture replaces the built-in drawing everywhere — entry cards, reports and the supervisor board.",
              ar: "الصورة المرفوعة بتحلّ محل الرسمة المدمجة بكل مكان — كروت الإدخال والتقارير ولوحة المشرف.",
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ مكوّنات صغيرة ============================ */

/** أزرار حالة للذبيحة/المنشأ/الدرجة — بدل أزرار الأصناف. */
function TypeStats({ t, isAr, model, listKey, item, onTree }) {
  if (listKey === "animals") {
    const origins = originsForAnimal(model, item.id).length;
    const grades = (model.grades || []).filter((g) => g.animal === item.id).length;
    return (
      <>
        <StatButton icon="🌍" value={origins} label={t({ en: "Origins", ar: "المناشئ" })} onClick={onTree} />
        <StatButton icon="🏅" value={grades} label={t({ en: "Grades", ar: "الدرجات" })} onClick={onTree} />
        <StatButton icon="⚖️" value={`${item.min ?? "—"}–${item.max ?? "—"}`}
          label={t({ en: "Weight range (kg)", ar: "مدى الوزن (كجم)" })} />
      </>
    );
  }
  if (listKey === "origins") {
    const animals = (model.animals || []).filter(
      (a) => !Array.isArray(a.origins) || a.origins.length === 0 || a.origins.includes(item.id)
    ).length;
    const grades = (model.grades || []).filter((g) => g.origin === item.id).length;
    return (
      <>
        <StatButton icon="🐑" value={animals} label={t({ en: "Animals", ar: "الذبائح" })} onClick={onTree} />
        <StatButton icon="🏅" value={grades} label={t({ en: "Grades", ar: "الدرجات" })} onClick={onTree} />
      </>
    );
  }
  const a = (model.animals || []).find((x) => x.id === item.animal);
  const o = (model.origins || []).find((x) => x.id === item.origin);
  return (
    <>
      <StatButton icon="🐑" value={nameOf(a || {}, isAr) || "—"} label={t({ en: "Animal", ar: "الذبيحة" })} />
      <StatButton icon="🌍" value={nameOf(o || {}, isAr) || "—"} label={t({ en: "Origin", ar: "المنشأ" })} />
    </>
  );
}

function StatButton({ icon, value, label, onClick }) {
  return (
    <button
      type="button"
      className="pf-stat-btn"
      style={S.statBtn}
      onClick={onClick}
      disabled={!onClick}
    >
      <span style={S.statIcon}>{icon}</span>
      <span style={S.statBody}>
        <span className="pf-stat" style={S.statValue}>{value}</span>
        <span className="pf-statlbl" style={S.statLabel}>{label}</span>
      </span>
    </button>
  );
}

function Group({ title, children, wide }) {
  return (
    <section style={{ ...S.group, ...(wide ? S.groupWide : null) }}>
      <h2 className="pf-sec" style={S.groupTitle}>{title}</h2>
      <div style={S.groupBody}>{children}</div>
    </section>
  );
}

function Row({ label, children }) {
  return (
    <label style={S.row}>
      <span style={S.rowLabel}>{label}</span>
      <span style={S.rowField}>{children}</span>
    </label>
  );
}

function Check({ label, checked, onChange, disabled }) {
  return (
    <label style={S.check}>
      <input type="checkbox" checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)} style={S.checkBox} />
      <span>{label}</span>
    </label>
  );
}

function MiniField({ label, value, onChange, suffix, disabled }) {
  return (
    <label style={S.mini}>
      <span style={S.miniLabel}>{label}</span>
      <span style={S.inline}>
        <input className="pf-in" disabled={disabled} value={value ?? ""} inputMode="decimal"
          onChange={(e) => onChange(e.target.value)} />
        {suffix && <span style={S.unit}>{suffix}</span>}
      </span>
    </label>
  );
}

/** حقل الكود مع بحث في قائمة الأصناف — الاختيار يكتب الاسم كمان. */
function CodeField({ value, onPick, onType, catalog, disabled, t }) {
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
      .slice(0, 14);
  }, [catalog, q]);

  return (
    <span style={{ position: "relative", display: "block" }}>
      <input
        className="pf-in"
        disabled={disabled}
        value={value}
        placeholder={t({ en: "code or name…", ar: "كود أو اسم…" })}
        onChange={(e) => {
          const v = e.target.value.trim();
          onType(v);
          setQ(v);
          setOpen(true);
          const exact = catalog.find((i) => String(i.item_code) === v);
          if (exact) onPick(exact);
        }}
        onFocus={() => { setQ(value || ""); setOpen(true); }}
        onBlur={() => window.setTimeout(() => setOpen(false), 180)}
      />
      {open && results.length > 0 && (
        <span style={S.codeList}>
          {results.map((i) => (
            <button
              key={i.item_code}
              type="button"
              style={S.codeOpt}
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

function PictureUpload({ onDone, t }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pick = async (file) => {
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "butcher_item_image");
      fd.append("compress", "true");
      fd.append("maxDim", "800");
      fd.append("quality", "85");
      const res = await fetch(`${IMAGE_API_BASE}/api/images`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data.optimized_url || data.url)) {
        throw new Error(data?.error || `Server ${res.status}`);
      }
      onDone(data.optimized_url || data.url);
    } catch (e) {
      setErr(e?.message || "upload failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => pick(e.target.files?.[0])} />
      <button type="button" style={{ ...S.btn, ...S.btnPrimary }} disabled={busy}
        onClick={() => ref.current?.click()}>
        {busy ? t({ en: "Uploading…", ar: "جارٍ الرفع…" }) : t({ en: "Upload picture", ar: "رفع صورة" })}
      </button>
      {err && <span style={{ color: "#a12626", fontWeight: 800 }}>{err}</span>}
    </>
  );
}

/* ============================ الأنماط ============================ */

const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const S = {
  page: {
    minHeight: "100vh", background: "#eef4fb", fontFamily: FONT, color: "#0f2740",
    paddingBottom: 48, overflowX: "hidden",
  },

  /* شريط التحكّم العلوي */
  controlPanel: {
    position: "sticky", top: 0, zIndex: 30,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 16, flexWrap: "wrap",
    background: "#fff", borderBottom: "1px solid #dbe6f2",
    padding: "14px clamp(14px, 3vw, 30px)",
    boxShadow: "0 4px 14px rgba(15,39,64,.06)",
  },
  breadcrumb: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", minWidth: 0 },
  crumbLink: {
    border: "none", background: "transparent", color: "#1f6fd0",
    fontWeight: 900, fontFamily: FONT, cursor: "pointer", padding: 0,
  },
  crumbSep: { color: "#c3d4e6", fontWeight: 900 },
  crumbNow: { color: "#6b8299", fontWeight: 800 },
  actions: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  langBtn: { background: "#fff", border: "1px solid #cfe0f0", color: "#1f6fd0" },
  dirtyDot: { color: "#b45309", fontWeight: 900, whiteSpace: "nowrap" },

  btn: {
    border: "1.5px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 10, padding: "11px 22px", fontWeight: 800, fontFamily: FONT,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  btnPrimary: { background: "#1f6fd0", color: "#fff", border: "1.5px solid #1f6fd0" },
  btnGhost: { background: "#f2f8ff" },
  btnDanger: {
    border: "1.5px solid #f5c2c2", background: "#fff", color: "#a12626",
    borderRadius: 10, padding: "11px 22px", fontWeight: 800, fontFamily: FONT, cursor: "pointer",
  },
  btnOff: { opacity: 0.5, cursor: "not-allowed" },

  msgBar: {
    margin: "14px clamp(14px, 3vw, 30px) 0",
    background: "#f2f8ff", border: "1px solid #cfe0f0", color: "#14507f",
    borderRadius: 12, padding: "12px 16px", fontWeight: 800,
  },

  /* القائمة الجانبية */
  side: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 18,
    padding: 14, position: "sticky", top: 92, maxHeight: "calc(100vh - 120px)",
    display: "flex", flexDirection: "column", gap: 10, minWidth: 0,
    boxShadow: "0 10px 26px rgba(15,39,64,.06)",
  },
  sideHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sideTitle: { fontWeight: 900, color: "#14507f" },
  sideCount: {
    background: "#eef4fb", color: "#14507f", borderRadius: 999,
    padding: "2px 12px", fontWeight: 900,
  },
  search: {
    width: "100%", border: "1.5px solid #dbe6f2", borderRadius: 10,
    padding: "10px 12px", fontFamily: FONT, fontWeight: 700, color: "#0f2740", outline: "none",
  },
  sideCheck: { display: "flex", alignItems: "center", gap: 8, fontWeight: 800, color: "#6b8299" },
  sideScroll: { overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingInlineEnd: 4 },

  grpBox: { display: "flex", flexDirection: "column", gap: 4 },
  grpHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
    borderBottom: "2px solid #eef4fb", paddingBottom: 6, marginBottom: 2,
  },
  grpName: { fontWeight: 900, color: "#14507f", display: "inline-flex", alignItems: "center", gap: 8 },
  grpCount: {
    background: "#eef4fb", color: "#6b8299", borderRadius: 999,
    padding: "0 9px", fontWeight: 900,
  },
  grpAdd: {
    border: "1.5px solid #1f6fd0", background: "#1f6fd0", color: "#fff",
    borderRadius: 9, width: 30, height: 30, cursor: "pointer", fontWeight: 900,
    fontFamily: FONT, lineHeight: 1, flexShrink: 0,
  },
  grpEmpty: { color: "#a9c3dd", fontWeight: 800, padding: "6px 4px" },

  rec: {
    display: "flex", alignItems: "center", gap: 10, width: "100%",
    border: "1px solid transparent", background: "transparent", borderRadius: 12,
    padding: "8px 9px", cursor: "pointer", fontFamily: FONT, color: "#0f2740",
    textAlign: "start", minWidth: 0,
  },
  recOn: { background: "#e7f1fd", border: "1px solid #bcd9f7" },
  recThumb: {
    width: 36, height: 36, borderRadius: 10, background: "#f5f9fd", flexShrink: 0,
    display: "grid", placeItems: "center", overflow: "hidden",
  },
  recImg: { width: "100%", height: "100%", objectFit: "cover" },
  recDot: { fontSize: 18 },
  recBody: { display: "flex", flexDirection: "column", minWidth: 0 },
  recName: {
    fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  recSub: {
    color: "#8aa3b8", fontWeight: 700, whiteSpace: "nowrap",
    overflow: "hidden", textOverflow: "ellipsis",
  },
  recOff: { color: "#b91c1c" },

  /* الورقة */
  sheetWrap: { padding: "18px clamp(10px, 2.4vw, 30px) 0" },
  sheet: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 20,
    padding: "clamp(18px, 2.6vw, 34px)", minWidth: 0,
    boxShadow: "0 14px 38px rgba(15,39,64,.07)",
  },

  /* أزرار الحالة */
  statBox: {
    display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end",
    marginBottom: 18,
  },
  statBtn: {
    display: "flex", alignItems: "center", gap: 12,
    border: "1px solid #e3edf7", background: "#fff", borderRadius: 14,
    padding: "12px 18px", fontFamily: FONT, color: "#0f2740",
    cursor: "pointer", minWidth: 170,
  },
  statIcon: {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    display: "grid", placeItems: "center", background: "#eef4fb", color: "#1f6fd0",
  },
  statBody: { display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 },
  statValue: { fontWeight: 900, lineHeight: 1.05, color: "#14507f" },
  statLabel: { fontWeight: 800, color: "#6b8299", marginTop: 3, whiteSpace: "nowrap" },

  /* العنوان */
  titleBlock: { borderBottom: "1px solid #eef4fb", paddingBottom: 20, marginBottom: 20 },
  eyebrow: {
    color: "#8aa3b8", fontWeight: 900, letterSpacing: "0.08em",
    textTransform: "uppercase", marginBottom: 4,
  },
  titleInput: { fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.2 },
  badges: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, alignItems: "center" },
  badge: {
    borderRadius: 999, padding: "6px 16px", fontWeight: 900,
    background: "#eef4fb", color: "#14507f", border: "1px solid #dbe6f2",
  },
  badgeAlt: {
    borderRadius: 999, padding: "6px 16px", fontWeight: 800,
    background: "#fff", color: "#6b8299", border: "1px solid #e3edf7",
  },
  badgeOn: { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" },
  badgeOff: { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" },
  badgeId: { color: "#a9c3dd", fontWeight: 800 },
  checkRow: { display: "flex", gap: 24, flexWrap: "wrap", marginTop: 16, alignItems: "center" },
  check: { display: "inline-flex", alignItems: "center", gap: 9, fontWeight: 800, cursor: "pointer" },
  checkBox: { width: 20, height: 20, accentColor: "#1f6fd0", cursor: "pointer" },
  rowTools: { display: "inline-flex", gap: 10, marginInlineStart: "auto", flexWrap: "wrap" },
  toolBtn: {
    border: "1.5px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 10, padding: "8px 16px", fontWeight: 800, fontFamily: FONT, cursor: "pointer",
  },
  toolDanger: {
    border: "1.5px solid #f5c2c2", background: "#fff", color: "#a12626",
    borderRadius: 10, padding: "8px 16px", fontWeight: 800, fontFamily: FONT, cursor: "pointer",
  },

  /* التبويبات */
  notebook: {
    display: "flex", gap: 4, flexWrap: "wrap",
    borderBottom: "2px solid #eef4fb", marginBottom: 24,
  },
  tab: {
    border: "none", background: "transparent", color: "#6b8299",
    fontWeight: 900, fontFamily: FONT, cursor: "pointer",
    padding: "14px 22px", borderBottom: "3px solid transparent", marginBottom: -2,
    display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
  },
  tabOn: { color: "#1f6fd0", borderBottomColor: "#1f6fd0" },
  tabCount: {
    background: "#1f6fd0", color: "#fff", borderRadius: 999,
    padding: "1px 10px", fontWeight: 900,
  },

  /* مجموعات الحقول */
  groups: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(400px,100%),1fr))", gap: 34,
  },
  group: { minWidth: 0 },
  groupWide: { gridColumn: "1 / -1" },
  groupTitle: {
    margin: "0 0 14px", fontWeight: 900, color: "#14507f",
    paddingBottom: 10, borderBottom: "2px solid #eef4fb",
  },
  groupBody: { display: "flex", flexDirection: "column", gap: 4 },

  row: {
    display: "grid", gridTemplateColumns: "minmax(140px, 34%) 1fr",
    alignItems: "start", gap: 16, padding: "9px 0",
  },
  rowLabel: { color: "#6b8299", fontWeight: 800, paddingTop: 8, lineHeight: 1.4 },
  rowField: { minWidth: 0 },
  inline: { display: "flex", alignItems: "center", gap: 10 },
  unit: { color: "#8aa3b8", fontWeight: 800, whiteSpace: "nowrap" },
  hint: { color: "#8aa3b8", fontWeight: 700, marginTop: 6, lineHeight: 1.6 },
  hintBad: { color: "#a12626", fontWeight: 800, marginTop: 6 },

  chipWrap: { display: "flex", gap: 10, flexWrap: "wrap" },
  chip: {
    display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
    border: "1.5px solid #e3edf7", borderRadius: 999, padding: "7px 16px",
    fontWeight: 800, color: "#6b8299", background: "#fff",
  },
  chipOn: { borderColor: "#bcd9f7", background: "#f2f8ff", color: "#14507f" },
  chipBtn: {
    border: "1.5px solid #cfe0f0", background: "#fff", color: "#14507f",
    borderRadius: 999, padding: "8px 18px", fontWeight: 800,
    fontFamily: FONT, cursor: "pointer",
  },

  ratioGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(250px,100%),1fr))", gap: 20,
  },
  mini: { display: "flex", flexDirection: "column", gap: 4 },
  miniLabel: { color: "#6b8299", fontWeight: 800 },

  /* الجداول */
  tabBody: { display: "flex", flexDirection: "column", gap: 18 },
  table: {
    width: "100%", borderCollapse: "separate", borderSpacing: 0,
    border: "1px solid #e3edf7", borderRadius: 14, overflow: "hidden",
  },
  th: {
    background: "#dceaf8", color: "#14507f", fontWeight: 900,
    padding: "14px 12px", textAlign: "center", whiteSpace: "nowrap",
    borderBottom: "2px solid #c3daf0",
  },
  td: {
    padding: "13px 12px", borderTop: "1px solid #eef4fa",
    textAlign: "center", verticalAlign: "middle",
  },
  subHead: { fontWeight: 900, color: "#14507f", marginTop: 12 },
  linkBtn: {
    border: "none", background: "transparent", color: "#1f6fd0",
    fontWeight: 900, fontFamily: FONT, cursor: "pointer", padding: 0,
  },
  emptyBox: {
    background: "#f7fbff", border: "2px dashed #cfe0f0", borderRadius: 14,
    padding: "28px 20px", textAlign: "center", fontWeight: 800, color: "#6b8299",
  },

  treeBox: {
    border: "1px solid #e3edf7", borderRadius: 14, padding: 14,
    display: "flex", flexDirection: "column", gap: 10,
  },
  treeHead: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  treeCount: { color: "#8aa3b8", fontWeight: 800 },

  /* شاشة البداية */
  welcomeHead: { textAlign: "center", display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 },
  startGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(230px,100%),1fr))", gap: 16,
  },
  startCard: {
    border: "1px solid #e3edf7", borderRadius: 18, padding: "22px 16px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    background: "#fbfdff",
  },
  startIcon: { fontSize: 38, lineHeight: 1 },
  startName: { fontWeight: 900, color: "#14507f" },
  startCount: { color: "#8aa3b8", fontWeight: 800, marginBottom: 6 },
  recentRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  recentChip: {
    border: "1.5px solid #cfe0f0", background: "#fff", color: "#14507f",
    borderRadius: 999, padding: "8px 18px", fontWeight: 800,
    fontFamily: FONT, cursor: "pointer",
  },

  /* قائمة الأكواد */
  codeList: {
    position: "absolute", zIndex: 40, insetInlineStart: 0, top: "100%",
    display: "block", background: "#fff", border: "1px solid #cfe0f0", borderRadius: 12,
    boxShadow: "0 16px 34px rgba(15,39,64,.18)", minWidth: 380, maxHeight: 320,
    overflowY: "auto", textAlign: "start", marginTop: 4,
  },
  codeOpt: {
    display: "block", width: "100%", textAlign: "start", border: "none",
    background: "transparent", padding: "11px 13px", cursor: "pointer",
    fontFamily: FONT, color: "#0f2740", borderBottom: "1px solid #f2f7fc",
    fontWeight: 700, lineHeight: 1.45,
  },

  /* الصورة */
  pictureRow: {
    display: "grid", gridTemplateColumns: "auto minmax(280px, 1fr)", gap: 30,
    alignItems: "start", flexWrap: "wrap",
  },
  pictureBox: {
    width: "min(280px, 60vw)", aspectRatio: "1 / 1",
    border: "2px dashed #cfe0f0", borderRadius: 20, background: "#f7fbff",
    display: "grid", placeItems: "center", padding: 12, overflow: "hidden",
  },
  pictureImg: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 },
  pictureNone: { color: "#a9c3dd", fontWeight: 900 },
  pictureSide: { minWidth: 0 },
};
