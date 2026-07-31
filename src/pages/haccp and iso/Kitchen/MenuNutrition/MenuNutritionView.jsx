// src/pages/haccp and iso/Kitchen/MenuNutrition/MenuNutritionView.jsx
// Menu outputs — item register (edit / delete / export), printable bilingual
// menu, nutrient booklet, QR code and compliance status. ADG 10/2026.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import mawashiLogo from "../../../../assets/almawashi-logo.jpg";
import { can } from "../../../../utils/perms";
import { HaccpLangToggle } from "../../_shared/haccpI18n";
import { useKitchenLang } from "../kitchenI18n";
import {
  Btn,
  Chip,
  BASE_FONT_PX,
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
} from "../kitchenUI";
import { DAYS, SECTIONS, parseWeight } from "./menuData";
import { computePortion, fmt, itemStatus, recalcMessage } from "./nutritionCalc";
import { deleteItem, loadItems } from "./menuStore";
import NutritionBooklet, { DailyIntakeStatement, groupForMenu } from "./NutritionBooklet";
import exportMenuExcel from "./exportMenuExcel";

const TABS = [
  { id: "register", labelKey: "tabRegister", icon: "🗂️" },
  { id: "menu", labelKey: "tabMenu", icon: "📃" },
  { id: "booklet", labelKey: "tabBooklet", icon: "📖" },
  { id: "qr", labelKey: "tabQr", icon: "🔗" },
  { id: "compliance", labelKey: "tabCompliance", icon: "✅" },
];

export const PUBLIC_BOOKLET_PATH = "/menu-nutrition";

const STATUS_TONE = { complete: "good", partial: "warn", empty: "neutral" };

/** Problems first, so the rows that need work float to the top. */
const STATUS_RANK = (s) => {
  if (s.invalid) return 0;
  if (s.missingWeight) return 1;
  if (s.status === "empty") return 2;
  if (s.status === "partial") return 3;
  if (s.needsRecalc) return 4;
  return 5;
};

const SORTS = [
  { id: "section", labelKey: "sortSection" },
  { id: "status", labelKey: "sortStatus" },
  { id: "nameEn", labelKey: "sortNameEn" },
  { id: "nameAr", labelKey: "sortNameAr" },
  { id: "kcal", labelKey: "sortKcal" },
  { id: "weight", labelKey: "sortWeight" },
];

const STATUS_FILTERS = [
  { id: "all", labelKey: "allStatuses" },
  { id: "complete", labelKey: "statusComplete" },
  { id: "partial", labelKey: "statusPartial" },
  { id: "empty", labelKey: "statusEmpty" },
  { id: "invalid", labelKey: "statusInvalid" },
  { id: "recalc", labelKey: "statusRecalc" },
  { id: "noweight", labelKey: "cmpNoWeight" },
];

export default function MenuNutritionView() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { t, lang, toggle, isAr, dir } = useKitchenLang();

  const mayEdit = can("iso", "edit") || can("iso", "write");
  const mayDelete = can("iso", "delete");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState("");
  const [exporting, setExporting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // register controls
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("section");
  const [grouped, setGrouped] = useState(true);

  const tab = TABS.some((x) => x.id === params.get("tab")) ? params.get("tab") : "register";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await loadItems());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const say = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 2800);
  };

  /* ── decorated rows: item + its status, computed once ── */
  const rows = useMemo(
    () =>
      items.map((it) => {
        const s = itemStatus(it);
        const p = computePortion(it.per100, s.weight);
        return { it, s, kcal: p.calories };
      }),
    [items]
  );

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter(({ it, s }) => {
      if (sectionFilter !== "all" && it.section !== sectionFilter) return false;
      if (statusFilter === "invalid" && !s.invalid) return false;
      if (statusFilter === "recalc" && !s.needsRecalc) return false;
      if (statusFilter === "noweight" && !s.missingWeight) return false;
      if (["complete", "partial", "empty"].includes(statusFilter) && s.status !== statusFilter)
        return false;
      if (!q) return true;
      return `${it.nameEn} ${it.nameAr} ${it.day} ${it.servedWith} ${it.servedWithAr}`
        .toLowerCase()
        .includes(q);
    });

    const secIdx = (s) => Math.max(0, SECTIONS.findIndex((x) => x.id === s));
    const dayIdx = (d) => (DAYS.indexOf(d) === -1 ? 99 : DAYS.indexOf(d));

    out = [...out].sort((a, b) => {
      switch (sortBy) {
        case "status":
          return STATUS_RANK(a.s) - STATUS_RANK(b.s) || a.it.nameEn.localeCompare(b.it.nameEn);
        case "nameEn":
          return String(a.it.nameEn).localeCompare(String(b.it.nameEn));
        case "nameAr":
          return String(a.it.nameAr).localeCompare(String(b.it.nameAr), "ar");
        case "kcal":
          return (b.kcal ?? -1) - (a.kcal ?? -1);
        case "weight":
          return (b.s.weight ?? -1) - (a.s.weight ?? -1);
        default:
          return (
            secIdx(a.it.section) - secIdx(b.it.section) ||
            dayIdx(a.it.day) - dayIdx(b.it.day) ||
            (a.it.order ?? 500) - (b.it.order ?? 500)
          );
      }
    });

    return out;
  }, [rows, query, sectionFilter, statusFilter, sortBy]);

  /** Grouping only makes sense on the default section ordering. */
  const showGroups = grouped && sortBy === "section";

  const registerGroups = useMemo(() => {
    if (!showGroups) return null;
    return groupForMenu(
      filteredRows.map((r) => r.it),
      t
    ).map((g) => ({
      ...g,
      rows: g.items.map((it) => filteredRows.find((r) => r.it === it)).filter(Boolean),
    }));
  }, [filteredRows, showGroups, t]);

  const menuGroups = useMemo(() => groupForMenu(items, t), [items, t]);

  const stats = useMemo(
    () => ({
      total: items.length,
      complete: rows.filter((r) => r.s.status === "complete").length,
      missing: rows.filter((r) => r.s.status !== "complete").length,
      invalid: rows.filter((r) => r.s.invalid).length,
      recalc: rows.filter((r) => r.s.needsRecalc).length,
      noWeight: rows.filter((r) => r.s.missingWeight).length,
      problem: rows.filter((r) => r.s.status !== "complete" || r.s.needsRecalc),
    }),
    [items.length, rows]
  );

  const filtersActive =
    !!query.trim() || sectionFilter !== "all" || statusFilter !== "all" || sortBy !== "section";

  function clearFilters() {
    setQuery("");
    setSectionFilter("all");
    setStatusFilter("all");
    setSortBy("section");
  }

  function editItem(it) {
    if (!it.serverId) return;
    navigate(`/haccp-iso/kitchen/menu-nutrition/input?edit=${encodeURIComponent(it.serverId)}`);
  }

  async function removeItem(it) {
    if (!mayDelete) return alert(t("noPermission"));
    if (!it.serverId) return;
    if (busyId) return;
    if (!window.confirm(t("confirmDelete"))) return;

    setBusyId(it.serverId);
    try {
      await deleteItem(it.serverId);
      setItems((prev) => prev.filter((x) => x.serverId !== it.serverId));
      say(t("deleted"));
    } catch (e) {
      alert(`${t("deleteError")}: ${e?.message || e}`);
    } finally {
      setBusyId(null);
    }
  }

  async function doExport() {
    if (!items.length) return alert(t("nothingToExport"));
    setExporting(true);
    try {
      await exportMenuExcel(items, { t, isAr });
      say(t("exported"));
    } catch (e) {
      alert(`${t("exportError")}: ${e?.message || e}`);
    } finally {
      setExporting(false);
    }
  }

  const publicUrl = `${window.location.origin}${PUBLIC_BOOKLET_PATH}`;

  return (
    <main style={shell(dir, BASE_FONT_PX)}>
      <style>{`
        @media print {
          .kt-noprint { display: none !important; }
          body { background: #fff !important; }
          .kt-paper { box-shadow: none !important; border: none !important; padding: 0 !important; }
          .mn-panel, .mn-group { page-break-inside: avoid; }
        }
        .kt-row:hover { background: ${UI.surfaceAlt}; }
        @media (max-width: 980px) {
          .mn-hero-inner { grid-template-columns: 1fr !important; }
          .mn-hero-stats { min-width: 0 !important; }
        }
      `}</style>

      <div style={layout}>
        {/* ══ Actions (above the hero) ══ */}
        <div className="kt-noprint" style={S.controls}>
          {flash && <Chip tone="good">{flash}</Chip>}
          <HaccpLangToggle lang={lang} toggle={toggle} />
          <Btn variant="soft" onClick={doExport} disabled={exporting}>
            {exporting ? t("exporting") : t("exportExcel")}
          </Btn>
          <Btn variant="primary" onClick={() => window.print()}>
            {t("print")}
          </Btn>
          <Btn onClick={() => navigate("/haccp-iso/kitchen/menu-nutrition/input")}>
            {t("mnEntry")}
          </Btn>
          <Btn onClick={() => navigate("/haccp-iso/kitchen/menu-nutrition")}>{t("back")}</Btn>
        </div>

        {/* ══ Hero ══ */}
        <section className="kt-noprint" style={S.hero}>
          <div aria-hidden="true" style={S.heroGlow} />

          <div className="mn-hero-inner" style={S.heroInner}>
            <div style={S.brand}>
              <img src={mawashiLogo} alt="Al Mawashi" style={S.logo} />
              <div style={{ minWidth: 0 }}>
                <p style={S.eyebrow}>
                  HACCP / ISO 22000 · {t("kitchenTitle")} · ADG 10/2026
                </p>
                <h1 style={S.title}>📊 {t("mnView")}</h1>
                <p style={S.subtitle}>{t("mnSubtitle")}</p>
              </div>
            </div>

            <div className="mn-hero-stats" style={S.heroStats}>
              <div style={S.stat}>
                <div style={S.statValue}>{stats.total}</div>
                <div style={S.statLabel}>{t("cmpTotal")}</div>
              </div>
              <div style={S.stat}>
                <div style={S.statValue}>{stats.complete}</div>
                <div style={S.statLabel}>{t("cmpComplete")}</div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ Tabs ══ */}
        <div className="kt-noprint" style={S.tabBar}>
          {TABS.map((x) => (
            <button
              key={x.id}
              type="button"
              style={S.tabBtn(tab === x.id)}
              onClick={() => setParams({ tab: x.id })}
            >
              {x.icon} {t(x.labelKey)}
            </button>
          ))}
        </div>

        {loading && <div style={{ ...card, ...muted }}>{t("loading")}</div>}

        {!loading && (
          <div className="kt-paper" style={S.paper}>
            {/* ═══ Register ═══ */}
            {tab === "register" && (
              <>
                <div style={S.titleRow}>
                  <h2 style={S.h2}>{t("registerHeading")}</h2>
                  <Chip tone="info">
                    {t("resultCount", { n: filteredRows.length, total: items.length })}
                  </Chip>
                </div>
                <div style={{ ...notice("info"), marginBottom: 20 }}>{t("registerNote")}</div>

                {/* Smart filters */}
                <div className="kt-noprint" style={S.filters}>
                  <input
                    style={{ ...control(false), flex: "1 1 220px", minWidth: 180 }}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("search")}
                  />
                  <select
                    style={{ ...control(false), width: "auto", minWidth: 170 }}
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
                  <select
                    style={{ ...control(false), width: "auto", minWidth: 170 }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {STATUS_FILTERS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {t(f.labelKey)}
                      </option>
                    ))}
                  </select>
                  <select
                    style={{ ...control(false), width: "auto", minWidth: 190 }}
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    {SORTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {t("sortBy")}: {t(s.labelKey)}
                      </option>
                    ))}
                  </select>
                  <label style={S.toggle}>
                    <input
                      type="checkbox"
                      checked={grouped}
                      disabled={sortBy !== "section"}
                      onChange={(e) => setGrouped(e.target.checked)}
                    />
                    {grouped && sortBy === "section" ? t("groupByDay") : t("flatList")}
                  </label>
                  {filtersActive && <Btn onClick={clearFilters}>{t("clearFilters")}</Btn>}
                  {mayEdit && (
                    <Btn
                      variant="success"
                      onClick={() => navigate("/haccp-iso/kitchen/menu-nutrition/input")}
                    >
                      {t("addNew")}
                    </Btn>
                  )}
                </div>

                {!filteredRows.length ? (
                  <div style={muted}>{items.length ? t("noData") : t("noItems")}</div>
                ) : (
                  <div style={table.wrap}>
                    <table style={table.el}>
                      <thead>
                        <tr>
                          <th style={table.th}>{t("itemCol")}</th>
                          <th style={{ ...table.th, width: 150 }}>{t("fldSection")}</th>
                          <th style={{ ...table.th, width: 130 }}>{t("weightCol")}</th>
                          <th style={{ ...table.th, width: 130, textAlign: "end" }}>
                            {t("kcalCol")}
                          </th>
                          <th style={{ ...table.th, width: 160 }}>{t("statusCol")}</th>
                          <th style={{ ...table.th, width: 190 }} className="kt-noprint">
                            {t("actionsCol")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {showGroups
                          ? registerGroups.map((g) => (
                              <React.Fragment key={g.key}>
                                <tr>
                                  <td colSpan={6} style={S.groupRow}>
                                    {g.icon} {g.label}
                                    <span style={S.groupCount}>{g.rows.length}</span>
                                  </td>
                                </tr>
                                {g.rows.map((r) => (
                                  <RegisterRow
                                    key={r.it.serverId || r.it.code}
                                    row={r}
                                    t={t}
                                    busyId={busyId}
                                    mayEdit={mayEdit}
                                    mayDelete={mayDelete}
                                    onEdit={editItem}
                                    onDelete={removeItem}
                                  />
                                ))}
                              </React.Fragment>
                            ))
                          : filteredRows.map((r) => (
                              <RegisterRow
                                key={r.it.serverId || r.it.code}
                                row={r}
                                t={t}
                                busyId={busyId}
                                mayEdit={mayEdit}
                                mayDelete={mayDelete}
                                onEdit={editItem}
                                onDelete={removeItem}
                              />
                            ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ═══ Printable menu ═══ */}
            {tab === "menu" && (
              <>
                <h2 style={S.h2}>{t("menuHeading")}</h2>
                <DailyIntakeStatement label={t("dailyIntakeLabel")} />

                {menuGroups.map((g) => (
                  <section key={g.key} className="mn-group" style={{ marginBottom: 28 }}>
                    <h3 style={S.groupTitle}>
                      <span>
                        {g.icon} {g.label}
                      </span>
                      <span style={S.rule} />
                    </h3>
                    <div style={table.wrap}>
                      <table style={table.el}>
                        <thead>
                          <tr>
                            <th style={table.th}>{t("itemCol")}</th>
                            <th style={table.th}>{t("servedWithCol")}</th>
                            <th style={{ ...table.th, width: 120 }}>{t("weightCol")}</th>
                            <th style={{ ...table.th, textAlign: "end", width: 150 }}>
                              {t("kcalCol")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.items.map((it) => {
                            const w = parseWeight(it.weightRaw);
                            const p = computePortion(it.per100, w.total);
                            return (
                              <tr key={it.serverId || it.code} className="kt-row">
                                <td style={table.td}>
                                  <div dir="ltr" style={S.nameEn}>
                                    {it.nameEn || "—"}
                                  </div>
                                  <div dir="rtl" style={S.nameAr}>
                                    {it.nameAr || "—"}
                                  </div>
                                </td>
                                <td style={{ ...table.td, fontSize: FS.xs, color: UI.inkMuted }}>
                                  {it.servedWith || it.servedWithAr ? (
                                    <>
                                      <div dir="ltr">{it.servedWith}</div>
                                      <div dir="rtl">{it.servedWithAr}</div>
                                    </>
                                  ) : (
                                    t("noData")
                                  )}
                                </td>
                                <td style={{ ...table.td, ...table.num, textAlign: "start" }}>
                                  {w.total !== null ? `${w.total} g` : t("noData")}
                                </td>
                                <td style={S.kcalCell}>{fmt(p.calories, 0, "kcal")}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}

                {!menuGroups.length && <div style={muted}>{t("noItems")}</div>}
              </>
            )}

            {/* ═══ Booklet ═══ */}
            {tab === "booklet" && (
              <NutritionBooklet items={items} t={t} heading={t("bookletHeading")} />
            )}

            {/* ═══ QR ═══ */}
            {tab === "qr" && (
              <div style={grid.auto(300)}>
                <div style={S.qrCard}>
                  <QRCodeCanvas value={publicUrl} size={224} level="M" marginSize={4} />
                  <div style={S.qrTitleEn} dir="ltr">
                    Nutrition information
                  </div>
                  <div style={S.qrTitleAr} dir="rtl">
                    المعلومات الغذائية
                  </div>
                  <Chip tone="sky" style={{ marginTop: 12 }}>
                    {t("langBoth")}
                  </Chip>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={notice("info")}>{t("qrHint")}</div>
                  <div style={{ marginTop: 18 }}>
                    <div style={S.fieldLabel}>{t("qrUrlLabel")}</div>
                    <input
                      readOnly
                      dir="ltr"
                      style={{ ...control(false), fontFamily: UI.mono, fontSize: FS.xs }}
                      value={publicUrl}
                    />
                  </div>
                  <div style={{ marginTop: 20 }}>
                    <DailyIntakeStatement label={t("dailyIntakeLabel")} />
                  </div>
                </div>
              </div>
            )}

            {/* ═══ Compliance ═══ */}
            {tab === "compliance" && (
              <>
                <h2 style={S.h2}>{t("complianceHeading")}</h2>

                <div style={S.kpis}>
                  <Kpi label={t("cmpTotal")} value={stats.total} tone="info" />
                  <Kpi label={t("cmpComplete")} value={stats.complete} tone="good" />
                  <Kpi label={t("cmpMissing")} value={stats.missing} tone="warn" />
                  <Kpi label={t("cmpInvalid")} value={stats.invalid} tone="bad" />
                  <Kpi label={t("cmpRecalc")} value={stats.recalc} tone="warn" />
                  <Kpi label={t("cmpNoWeight")} value={stats.noWeight} tone="bad" />
                </div>

                <div style={{ ...table.wrap, marginTop: 22 }}>
                  <table style={table.el}>
                    <thead>
                      <tr>
                        <th style={table.th}>{t("itemCol")}</th>
                        <th style={{ ...table.th, width: 150 }}>{t("fldSection")}</th>
                        <th style={{ ...table.th, width: 110 }}>{t("weightCol")}</th>
                        <th style={table.th}>{t("cmpIssue")}</th>
                        <th style={{ ...table.th, width: 120 }} className="kt-noprint">
                          {t("actionsCol")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.problem.map(({ it, s }) => {
                        const issues = [];
                        if (s.missingWeight) issues.push(t("cmpNoWeight"));
                        if (s.invalid) issues.push(...s.validation.list.map((e) => t(e.code, e.vars)));
                        if (s.status !== "complete" && !s.invalid) {
                          issues.push(
                            `${t(s.status === "empty" ? "statusEmpty" : "statusPartial")} (${s.filled}/10)`
                          );
                        }
                        if (s.needsRecalc) issues.push(recalcMessage(t, it, s));
                        return (
                          <tr key={it.serverId || it.code} className="kt-row">
                            <td style={table.td}>
                              <div dir="ltr" style={S.nameEn}>
                                {it.nameEn || "—"}
                              </div>
                              <div dir="rtl" style={S.nameAr}>
                                {it.nameAr || "—"}
                              </div>
                            </td>
                            <td style={{ ...table.td, fontSize: FS.xs, color: UI.inkSoft }}>
                              {it.day ? t(it.day) : t(`sec${cap(it.section)}`)}
                            </td>
                            <td style={{ ...table.td, ...table.num, textAlign: "start" }}>
                              {it.weightRaw || t("noData")}
                            </td>
                            <td style={{ ...table.td, fontSize: FS.xs }}>
                              <ul style={S.issueList}>
                                {issues.map((msg, i) => (
                                  <li key={i} style={S.issueItem}>
                                    {msg}
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td style={table.td} className="kt-noprint">
                              {mayEdit && it.serverId && (
                                <Btn variant="soft" onClick={() => editItem(it)}>
                                  {t("edit")}
                                </Btn>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {!stats.problem.length && (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              ...table.td,
                              textAlign: "center",
                              color: UI.mintInk,
                              fontWeight: 900,
                            }}
                          >
                            ✅ {t("statusComplete")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={hint}>{t("perPortionFormula")}</div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

/* ───────── row ───────── */

function RegisterRow({ row, t, busyId, mayEdit, mayDelete, onEdit, onDelete }) {
  const { it, s, kcal } = row;
  const busy = busyId === it.serverId;
  const unsaved = !it.serverId;

  return (
    <tr className="kt-row">
      <td style={table.td}>
        <div dir="ltr" style={S.nameEn}>
          {it.nameEn || "—"}
        </div>
        <div dir="rtl" style={S.nameAr}>
          {it.nameAr || "—"}
        </div>
      </td>
      <td style={{ ...table.td, fontSize: FS.xs, color: UI.inkSoft }}>
        {it.day ? t(it.day) : t(`sec${cap(it.section)}`)}
      </td>
      <td style={{ ...table.td, ...table.num, textAlign: "start" }}>
        {s.weight !== null ? `${s.weight} g` : t("noData")}
        {it.weightRaw && String(it.weightRaw) !== String(s.weight) && (
          <span style={S.weightRaw}> ({it.weightRaw})</span>
        )}
      </td>
      <td style={S.kcalCell}>{fmt(kcal, 0, "kcal")}</td>
      <td style={table.td}>
        <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {s.invalid ? (
            <Chip tone="bad">{t("statusInvalid")}</Chip>
          ) : (
            <Chip tone={STATUS_TONE[s.status]}>{t(`status${cap2(s.status)}`)}</Chip>
          )}
          {s.needsRecalc && <Chip tone="warn">↻</Chip>}
          {s.missingWeight && <Chip tone="bad">g?</Chip>}
        </span>
      </td>
      <td style={table.td} className="kt-noprint">
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {mayEdit && !unsaved && (
            <Btn variant="soft" onClick={() => onEdit(it)} disabled={busy}>
              {t("edit")}
            </Btn>
          )}
          {mayDelete && !unsaved && (
            <Btn variant="danger" onClick={() => onDelete(it)} disabled={busy}>
              {busy ? t("deleting") : t("del")}
            </Btn>
          )}
        </span>
      </td>
    </tr>
  );
}

function Kpi({ label, value, tone }) {
  return (
    <div style={S.kpi}>
      <div style={S.kpiValue}>{value}</div>
      <div style={S.kpiLabel}>{label}</div>
      <div style={S.kpiBar(tone)} />
    </div>
  );
}

function cap(s) {
  const map = { day: "Day", salads: "Salads", cold: "Cold", hot: "Hot" };
  return map[s] || "Day";
}

function cap2(s) {
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

const TONE_BAR = {
  info: "#0f766e",
  good: UI.mint,
  warn: UI.amber,
  bad: UI.rose,
  neutral: UI.lineStrong,
};

const S = {
  controls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 14,
  },

  /* ── hero (same language as the ISO / HACCP command center) ── */
  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 8,
    padding: "28px clamp(22px, 4vw, 56px)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,118,110,0.94) 52%, rgba(8,145,178,0.92))",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.20)",
    boxShadow: "0 24px 64px rgba(15,23,42,0.22)",
  },
  heroGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(820px 260px at 12% 0%, rgba(45,212,191,0.28), transparent 62%)," +
      "radial-gradient(760px 300px at 90% 20%, rgba(125,211,252,0.22), transparent 60%)",
  },
  heroInner: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 24,
  },
  brand: { display: "flex", alignItems: "center", gap: 16, minWidth: 0 },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 8,
    objectFit: "cover",
    border: "1px solid rgba(255,255,255,0.34)",
    background: "#fff",
    boxShadow: "0 16px 30px rgba(0,0,0,0.25)",
    flexShrink: 0,
  },
  eyebrow: {
    margin: 0,
    fontSize: FS.xxs,
    fontWeight: 900,
    color: "rgba(255,255,255,0.78)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: { margin: "8px 0 0", fontSize: FS.xl, fontWeight: 1000, lineHeight: 1.05 },
  subtitle: {
    margin: "12px 0 0",
    maxWidth: 980,
    fontSize: FS.sm,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.45,
    fontWeight: 700,
  },
  heroStats: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(150px, 1fr))",
    gap: 12,
    minWidth: 340,
  },
  stat: {
    borderRadius: 8,
    padding: "16px 18px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.22)",
    backdropFilter: "blur(12px)",
  },
  statValue: { fontSize: FS.lg, fontWeight: 1000, lineHeight: 1 },
  statLabel: { marginTop: 8, fontSize: FS.xs, color: "rgba(255,255,255,0.76)", fontWeight: 800 },

  /* ── tabs styled like the hub's filter chips ── */
  tabBar: { display: "flex", flexWrap: "wrap", gap: 10, margin: "22px 0 20px" },
  tabBtn: (active) => ({
    padding: "12px 18px",
    borderRadius: 8,
    border: active ? "1px solid #0f766e" : "1px solid rgba(15,23,42,0.14)",
    background: active ? "#0f766e" : "#fff",
    color: active ? "#fff" : "#334155",
    fontSize: FS.sm,
    fontWeight: 950,
    fontFamily: "inherit",
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow: active ? "0 14px 28px rgba(15,118,110,0.22)" : "0 10px 20px rgba(15,23,42,0.07)",
  }),

  paper: {
    ...card,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.12)",
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
    padding: "clamp(18px, 2.4vw, 34px)",
    marginBottom: 0,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  h2: { margin: 0, fontSize: FS.lg, fontWeight: 900, color: UI.ink, lineHeight: 1.2 },
  groupTitle: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    margin: "0 0 14px",
    fontSize: FS.md,
    fontWeight: 900,
    color: UI.ink,
  },
  rule: { flex: 1, height: 1, background: UI.line },

  filters: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
    padding: 14,
    background: UI.surfaceAlt,
    border: `1px solid ${UI.line}`,
    borderRadius: UI.r.md,
    marginBottom: 18,
  },
  toggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: FS.xs,
    fontWeight: 800,
    color: UI.inkSoft,
    cursor: "pointer",
    userSelect: "none",
  },

  groupRow: {
    padding: "11px 16px",
    background: "#f0fdfa",
    borderBottom: "1px solid #ccfbf1",
    fontSize: FS.xs,
    fontWeight: 900,
    color: "#0f766e",
    letterSpacing: "0.04em",
  },
  groupCount: {
    marginInlineStart: 10,
    fontVariantNumeric: "tabular-nums",
    background: UI.surface,
    borderRadius: UI.r.pill,
    padding: "2px 9px",
    fontSize: FS.xxs,
    color: UI.inkSoft,
  },

  nameEn: { fontSize: FS.sm, fontWeight: 900, color: UI.ink },
  nameAr: { fontSize: FS.xs, fontWeight: 800, color: UI.inkSoft, marginTop: 3 },
  weightRaw: { fontSize: FS.xxs, fontWeight: 700, color: UI.inkMuted },
  kcalCell: { ...table.td, ...table.num, fontSize: FS.md, fontWeight: 900, color: "#0f766e" },

  kpis: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
    gap: 14,
  },
  kpi: {
    position: "relative",
    overflow: "hidden",
    background: UI.surfaceAlt,
    border: `1px solid ${UI.line}`,
    borderRadius: UI.r.md,
    padding: "18px 20px",
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

  issueList: { margin: 0, paddingInlineStart: 18, display: "grid", gap: 5 },
  issueItem: { color: UI.rose, fontWeight: 700, lineHeight: 1.55 },

  fieldLabel: { fontSize: FS.xs, fontWeight: 800, color: UI.inkSoft, marginBottom: 7 },

  qrCard: {
    textAlign: "center",
    padding: 26,
    border: `1px solid ${UI.line}`,
    borderRadius: UI.r.lg,
    background: UI.surface,
    boxShadow: UI.shadow.card,
    width: "fit-content",
  },
  qrTitleEn: { marginTop: 16, fontSize: FS.sm, fontWeight: 900, color: UI.ink },
  qrTitleAr: { fontSize: FS.sm, fontWeight: 800, color: UI.inkSoft, marginTop: 3 },
};
