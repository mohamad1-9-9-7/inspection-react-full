// src/pages/workforce/WorkforcePeople.jsx
//
// 👥 تبويب الموظفين.
//
// شكل الشاشة: كرت لكل ملحمة، وجوّاه:
//   ① شريط «مشرفو هذه الملحمة» — كل المشرفين جنب بعض بصف واحد، مرقّمين وملوّنين.
//      هيك بتشوف بضربة عين إنه هدول الثلاثة تبع نفس الملحمة.
//   ② تحته مجموعة لكل مشرف بنفس رقمه ولونه، وجواتها جزارينه ككروت مضغوطة.
// اللون والرقم هنّ الرابط البصري بين الشريط والمجموعة — مش الحدود.

import React, { useMemo, useState } from "react";
import {
  ROLES, STATUSES, activeSites, directoryEntry, newPerson, personById, personName,
  removePerson, searchDirectory, setPersonStatus, siteLabel, sitesOfPerson,
  supervisorsOfSite, transferPerson, upsertPerson, validatePerson,
} from "./workforceConfig";
import {
  AR_NUM, Avatar, Banner, Btn, C, Card, Chip, Empty, Field, Input, Modal,
  SectionHead, Select, grid2, supColor,
} from "./workforceUi";

const statusMeta = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];
const roleMeta = (id) => ROLES.find((r) => r.id === id) || ROLES[0];
const today = () => new Date().toISOString().slice(0, 10);

export default function WorkforcePeople({ scope, save, t, isAr, dir }) {
  const {
    wf, canManage, canTransfer, canDeletePerson, canSetManagerRole,
    canSeeSite, canSeePerson, username,
  } = scope;

  const [q, setQ] = useState("");
  const [fRole, setFRole] = useState("");
  const [fSite, setFSite] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [flat, setFlat] = useState(false);

  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState([]);
  const [moving, setMoving] = useState(null);
  const [statusing, setStatusing] = useState(null);
  const [history, setHistory] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [menuFor, setMenuFor] = useState(null);   // الشخص المفتوحة قائمة إجراءاته

  const sites = useMemo(
    () => activeSites(wf).filter((s) => canSeeSite(s.code)),
    [wf, canSeeSite]
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (wf.people || []).filter((p) => {
      if (!canSeePerson(p)) return false;
      if (fRole && p.role !== fRole) return false;
      if (fStatus && p.status !== fStatus) return false;
      if (fSite && !sitesOfPerson(p).includes(fSite)) return false;
      if (needle) {
        const hay = `${p.empNo} ${p.name} ${p.nameEn} ${p.username}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [wf.people, q, fRole, fSite, fStatus, canSeePerson]);

  /* الشجرة: لكل ملحمة → مشرفوها بالترتيب (رقم ولون ثابتين) + جزارو كل واحد */
  const tree = useMemo(() => {
    const inScope = sites.filter((s) => !fSite || s.code === fSite);
    return inScope.map((s) => {
      const here = visible.filter((p) => sitesOfPerson(p).includes(s.code));
      // الترتيب بالاسم حتى يبقى رقم/لون كل مشرف ثابتاً بين الرسمات
      const sups = here
        .filter((p) => p.role !== "butcher")
        .sort((a, b) => String(a.name || a.nameEn).localeCompare(String(b.name || b.nameEn)));
      const butchers = here.filter((p) => p.role === "butcher");
      const groups = sups.map((sup, i) => ({
        sup, i,
        list: butchers.filter((b) => b.supervisorId === sup.id),
      }));
      const orphans = butchers.filter(
        (b) => !b.supervisorId || !sups.some((s2) => s2.id === b.supervisorId)
      );
      return { site: s, groups, orphans, sups, butchers, total: here.length };
    });
  }, [sites, visible, fSite]);

  const homeless = useMemo(
    () => visible.filter((p) => !sitesOfPerson(p).some((c) => sites.some((s) => s.code === c))),
    [visible, sites]
  );

  /* ══════════ الإجراءات ══════════ */

  const openNew = (role, site = "", supervisorId = "") => {
    const draft = newPerson(role);
    const only = sites.length === 1 ? sites[0].code : "";
    const s = site || fSite || only || "";
    setErrors([]);
    setEditing({ ...draft, site: s, sites: s ? [s] : [], supervisorId });
  };

  const openEdit = (p) => { setErrors([]); setEditing({ ...p }); };

  const savePerson = async () => {
    const draft = { ...editing, sites: editing.site ? [editing.site] : editing.sites };
    const exists = (wf.people || []).some((p) => p.id === draft.id);
    const errs = validatePerson(wf, draft, exists ? draft.id : "");
    if (errs.length) { setErrors(errs); return; }
    await save(upsertPerson(wf, draft, username));
    setEditing(null);
  };

  const doTransfer = async () => {
    if (!moving?.toSite || moving.toSite === moving.person.site || !moving.reason?.trim()) return;
    await save(transferPerson(wf, moving.person.id, moving.toSite, {
      by: username, reason: moving.reason.trim(), effectiveFrom: moving.effectiveFrom,
    }));
    setMoving(null);
  };

  const doStatus = async () => {
    await save(setPersonStatus(wf, statusing.person.id, statusing.status, {
      by: username, reason: statusing.reason?.trim() || "",
    }));
    setStatusing(null);
  };

  const doDelete = async () => {
    await save(removePerson(wf, confirmDel.id));
    setConfirmDel(null);
  };

  /* ══════════ قطع العرض ══════════ */

  /* الإجراءات وراء زر واحد «⋯».
     خمس أزرار جنب بعض ما بتزبط بكرت عرضو ٢١٠px — بتتراكب فوق الاسم والرقم.
     زر واحد بيحلّها نهائياً، وبيعطي مساحة لأسماء واضحة بدل رموز مبهمة. */
  const Acts = ({ p }) => (
    <button
      type="button"
      title={t({ en: "Actions", ar: "إجراءات" })}
      aria-label={t({ en: "Actions", ar: "إجراءات" })}
      onClick={() => setMenuFor(p)}
      style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0, marginInlineStart: "auto",
        border: `1px solid ${C.line}`, background: "#fff", color: C.mute,
        cursor: "pointer", fontSize: 16, lineHeight: 1, fontWeight: 900,
        display: "grid", placeItems: "center", fontFamily: "inherit",
      }}
    >
      ⋯
    </button>
  );

  /** كرت المشرف داخل الشريط العلوي — الرقم واللون بيربطوه بمجموعته تحت. */
  const SupCard = ({ sup, i, count }) => {
    const c = supColor(i);
    const st = statusMeta(sup.status);
    const off = sup.status !== "active";
    return (
      <div
        className="wf-row"
        style={{
          display: "flex", alignItems: "center", gap: 9,
          background: off ? "#fff" : c.soft,
          border: `1px solid ${off ? C.line : c.line}`,
          borderRadius: 13, padding: "9px 12px", minWidth: 0, flex: "1 1 240px",
          opacity: off ? 0.72 : 1,
        }}
      >
        <span style={{ color: c.solid, fontWeight: 900, fontSize: 17, flexShrink: 0 }}>{AR_NUM[i]}</span>
        <Avatar name={personName(sup, isAr)} color={c.solid} soft="#fff" size={32} />
        <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
          <div className="wf-name" style={ELLIPSIS(900, c.ink)}>
            {personName(sup, isAr)}
          </div>
          <div className="wf-lbl" style={{ ...ELLIPSIS(800, C.faint), marginTop: 1 }}>
            #{sup.empNo} · 🔪 {count}
            {!sup.username && ` · ${t({ en: "no login", ar: "بلا حساب" })}`}
            {off && ` · ${isAr ? st.ar : st.en}`}
          </div>
        </div>
        <Acts p={sup} />
      </div>
    );
  };

  /** كرت الجزار — مضغوط، بشبكة، حتى يبيّن أكبر عدد بأقل مساحة. */
  const ButcherCard = ({ p, accent }) => {
    const st = statusMeta(p.status);
    const off = p.status !== "active";
    const future = p.effectiveFrom && p.effectiveFrom > today();
    return (
      <div
        className="wf-row"
        style={{
          display: "flex", alignItems: "center", gap: 9,
          background: off ? st.bg : "#fff",
          border: `1px solid ${off ? st.bd : C.line}`,
          borderRadius: 12, padding: "8px 11px", minWidth: 0,
        }}
      >
        <Avatar name={personName(p, isAr)} color={accent || C.blue} soft="#f6faff" size={31} />
        <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
          <div className="wf-name" style={ELLIPSIS(800, C.ink)}>
            {personName(p, isAr)}
          </div>
          <div className="wf-lbl" style={{ ...ELLIPSIS(800, C.faint), marginTop: 1 }}>
            #{p.empNo}
            {off && ` · ${isAr ? st.ar : st.en}`}
            {future && ` · ${t({ en: "from", ar: "من" })} ${p.effectiveFrom}`}
          </div>
        </div>
        <Acts p={p} />
      </div>
    );
  };

  /* ٢٤٠px = الحد اللي بيسع صورة + اسم مقروء + زر الإجراءات بلا تراكب */
  const butcherGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(min(240px,100%),1fr))",
    gap: 8,
  };

  /* ══════════ العرض ══════════ */

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <SectionHead
        icon="👥"
        title={t({ en: "People", ar: "الموظفون" })}
        sub={t({
          en: "Each site shows its supervisors side by side, then every supervisor's own butchers beneath — same number, same colour.",
          ar: "كل ملحمة بتعرض مشرفيها جنب بعض بصف واحد، وتحت كل مشرف جزارينه — نفس الرقم ونفس اللون.",
        })}
        right={
          canManage && (
            <>
              <Btn tone="violet" onClick={() => openNew("supervisor")} disabled={sites.length === 0}>
                ＋ {t({ en: "Supervisor", ar: "مشرف" })}
              </Btn>
              <Btn tone="primary" onClick={() => openNew("butcher")} disabled={sites.length === 0}>
                ＋ {t({ en: "Butcher", ar: "جزار" })}
              </Btn>
            </>
          )
        }
      />

      {sites.length === 0 && (
        <Banner tone="warn">
          {t({
            en: "Add a site first — a butcher cannot exist without a butchery to belong to.",
            ar: "أضف ملحمة أولاً — ما بيصير يكون في جزار بلا ملحمة تابع إلها.",
          })}
        </Banner>
      )}

      {/* ── شريط الفلاتر ── */}
      <Card pad={12}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t({ en: "Search name, number, username…", ar: "بحث بالاسم أو الرقم أو المستخدم…" })}
            style={{ flex: "1 1 220px", width: "auto" }}
          />
          <Select value={fRole} onChange={(e) => setFRole(e.target.value)} style={{ width: "auto" }}>
            <option value="">{t({ en: "All roles", ar: "كل الأدوار" })}</option>
            {ROLES.map((r) => <option key={r.id} value={r.id}>{r.icon} {isAr ? r.ar : r.en}</option>)}
          </Select>
          <Select value={fSite} onChange={(e) => setFSite(e.target.value)} style={{ width: "auto" }}>
            <option value="">{t({ en: "All sites", ar: "كل الملاحم" })}</option>
            {sites.map((s) => <option key={s.code} value={s.code}>{isAr ? s.ar : s.en}</option>)}
          </Select>
          <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={{ width: "auto" }}>
            <option value="">{t({ en: "All statuses", ar: "كل الحالات" })}</option>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{isAr ? s.ar : s.en}</option>)}
          </Select>
          <Btn size="sm" onClick={() => setFlat(!flat)}>
            {flat ? `🌳 ${t({ en: "Tree", ar: "شجرة" })}` : `📋 ${t({ en: "List", ar: "قائمة" })}`}
          </Btn>
          {(q || fRole || fSite || fStatus) && (
            <Btn size="sm" tone="quiet" onClick={() => { setQ(""); setFRole(""); setFSite(""); setFStatus(""); }}>
              ✕ {t({ en: "Clear", ar: "مسح" })}
            </Btn>
          )}
          <Chip style={{ marginInlineStart: "auto" }}>
            {visible.length} / {(wf.people || []).filter(canSeePerson).length}
          </Chip>
        </div>
      </Card>

      {/* ══════════ الشجرة ══════════ */}
      {!flat && tree.map(({ site, groups, orphans, sups, butchers }) => (
        <Card key={site.code} pad={0} style={{ overflow: "hidden" }}>
          {/* رأس الملحمة */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            padding: "14px 18px", borderBottom: `1px solid ${C.lineSoft}`,
          }}>
            <span style={{
              width: 42, height: 42, borderRadius: 13, flexShrink: 0,
              display: "grid", placeItems: "center", fontSize: 21,
              background: "linear-gradient(135deg,#dc2626,#991b1b)", color: "#fff",
            }}>
              {site.icon || "🥩"}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="wf-h" style={{ fontWeight: 900, lineHeight: 1.25 }}>
                {isAr ? site.ar : site.en}
              </div>
              <div className="wf-lbl" style={{ color: C.faint, fontWeight: 800, marginTop: 2 }}>
                {site.code}
              </div>
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <Chip bg="#f5f3ff" fg="#5b21b6" bd="#ddd6fe">
                🧑‍🍳 {sups.length} {t({ en: "supervisors", ar: "مشرف" })}
              </Chip>
              <Chip bg="#eff6ff" fg="#1e40af" bd="#bfdbfe">
                🔪 {butchers.length} {t({ en: "butchers", ar: "جزار" })}
              </Chip>
            </div>
          </div>

          {/* ① شريط مشرفي هذه الملحمة — كلهم بصف واحد */}
          <div style={{ background: C.band, padding: "12px 18px", borderBottom: `1px solid ${C.lineSoft}` }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 10, flexWrap: "wrap", marginBottom: sups.length ? 10 : 0,
            }}>
              <div className="wf-lbl" style={{ fontWeight: 900, color: C.mute, letterSpacing: ".01em" }}>
                {t({ en: "SUPERVISORS OF THIS SITE", ar: "مشرفو هذه الملحمة" })}
                {sups.length > 1 && (
                  <span style={{ color: C.faint, fontWeight: 800 }}>
                    {" "}— {t({ en: "all on the same site", ar: "كلهم على نفس الملحمة" })}
                  </span>
                )}
              </div>
              {canManage && (
                <Btn size="sm" tone="violet" onClick={() => openNew("supervisor", site.code)}>
                  ＋ {t({ en: "Supervisor", ar: "مشرف" })}
                </Btn>
              )}
            </div>

            {sups.length === 0 ? (
              <div className="wf-sub" style={{ color: C.faint, fontWeight: 700 }}>
                {t({ en: "No supervisor here yet.", ar: "ما في مشرف هون بعد." })}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                {groups.map(({ sup, i, list }) => (
                  <SupCard key={sup.id} sup={sup} i={i} count={list.length} />
                ))}
              </div>
            )}
          </div>

          {/* ② مجموعة كل مشرف */}
          <div style={{ padding: "6px 18px 16px" }}>
            {groups.map(({ sup, i, list }) => {
              const c = supColor(i);
              return (
                <div key={sup.id} style={{ paddingTop: 14 }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap",
                    borderInlineStart: `3px solid ${c.solid}`, paddingInlineStart: 10, marginBottom: 9,
                  }}>
                    <span style={{ color: c.solid, fontWeight: 900, flexShrink: 0 }}>{AR_NUM[i]}</span>
                    <span className="wf-h2" style={{ ...ELLIPSIS(900, c.ink), flex: "1 1 auto", minWidth: 0 }}>
                      {personName(sup, isAr)}
                    </span>
                    <Chip bg={c.soft} fg={c.ink} bd={c.line} style={{ flexShrink: 0 }}>
                      {list.length} {t({ en: "butchers", ar: "جزار" })}
                    </Chip>
                    {canManage && (
                      <Btn
                        size="sm" tone="quiet"
                        style={{ marginInlineStart: "auto", color: c.solid, flexShrink: 0 }}
                        onClick={() => openNew("butcher", site.code, sup.id)}
                      >
                        ＋ {t({ en: "Butcher", ar: "جزار" })}
                      </Btn>
                    )}
                  </div>

                  {list.length === 0 ? (
                    <div
                      className="wf-lbl"
                      style={{ color: C.faint, fontWeight: 700, paddingInlineStart: 13 }}
                    >
                      {t({ en: "No butchers under this supervisor yet.", ar: "ما في جزارين تحت هالمشرف بعد." })}
                    </div>
                  ) : (
                    <div style={{ ...butcherGrid, paddingInlineStart: 13 }}>
                      {list.map((b) => <ButcherCard key={b.id} p={b} accent={c.solid} />)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* جزارون بلا مشرف صالح */}
            {orphans.length > 0 && (
              <div style={{ paddingTop: 16 }}>
                <div style={{ marginBottom: 9 }}>
                  <Banner tone="warn">
                    {t({
                      en: "These butchers have no valid supervisor on this site — open each one and pick a supervisor.",
                      ar: "هالجزارين بلا مشرف صالح بهالملحمة — افتح كل واحد وعيّنلو مشرف.",
                    })}
                  </Banner>
                </div>
                <div style={butcherGrid}>
                  {orphans.map((b) => <ButcherCard key={b.id} p={b} accent={C.amber} />)}
                </div>
              </div>
            )}

            {sups.length === 0 && orphans.length === 0 && butchers.length === 0 && (
              <div className="wf-sub" style={{ color: C.faint, fontWeight: 700, padding: "14px 0 4px" }}>
                {t({ en: "Nobody assigned to this site yet.", ar: "ما في حدا مربوط بهالملحمة بعد." })}
              </div>
            )}
          </div>
        </Card>
      ))}

      {/* ══════════ القائمة المسطّحة ══════════ */}
      {flat && (
        visible.length === 0 ? (
          <Empty
            icon="🔍"
            title={t({ en: "Nothing matches", ar: "ما في نتائج" })}
            sub={t({ en: "Try clearing the filters.", ar: "جرّب تمسح الفلاتر." })}
          />
        ) : (
          <Card pad={12}>
            <div style={{ display: "grid", gap: 7 }}>
              {visible.map((p) => {
                const sup = p.supervisorId ? personById(wf, p.supervisorId) : null;
                return (
                  <div
                    key={p.id}
                    className="wf-row"
                    style={{
                      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                      border: `1px solid ${C.lineSoft}`, borderRadius: 12, padding: "9px 12px",
                    }}
                  >
                    <Avatar
                      name={personName(p, isAr)}
                      color={p.role === "butcher" ? C.blue : C.violet}
                      soft={p.role === "butcher" ? "#eff6ff" : "#f5f3ff"}
                      size={33}
                    />
                    <div style={{ minWidth: 0, flex: "1 1 150px", overflow: "hidden" }}>
                      <div className="wf-name" style={ELLIPSIS(900, C.ink)}>{personName(p, isAr)}</div>
                      <div className="wf-lbl" style={{ ...ELLIPSIS(800, C.faint), marginTop: 1 }}>
                        {roleMeta(p.role).icon} #{p.empNo}
                      </div>
                    </div>
                    <Chip>{sitesOfPerson(p).map((c) => siteLabel(wf, c, isAr)).join(" · ") || "—"}</Chip>
                    {sup && <Chip bg="#f5f3ff" fg="#5b21b6" bd="#ddd6fe">🧑‍🍳 {personName(sup, isAr)}</Chip>}
                    {p.status !== "active" && (
                      <Chip bg={statusMeta(p.status).bg} fg={statusMeta(p.status).fg} bd={statusMeta(p.status).bd}>
                        {isAr ? statusMeta(p.status).ar : statusMeta(p.status).en}
                      </Chip>
                    )}
                    <Acts p={p} />
                  </div>
                );
              })}
            </div>
          </Card>
        )
      )}

      {/* بلا ملحمة فعّالة */}
      {!flat && homeless.length > 0 && (
        <Card pad={14} style={{ borderColor: "#fde68a" }}>
          <div className="wf-h2" style={{ fontWeight: 900, marginBottom: 10 }}>
            ⚠️ {t({ en: "Unplaced — their site is missing or disabled", ar: "بلا ملحمة فعّالة — ملحمتهم محذوفة أو معطّلة" })}
          </div>
          <div style={butcherGrid}>
            {homeless.map((p) => <ButcherCard key={p.id} p={p} accent={C.amber} />)}
          </div>
        </Card>
      )}

      {/* ══════════ قائمة إجراءات شخص ══════════ */}
      {menuFor && (
        <Modal
          dir={dir}
          icon={roleMeta(menuFor.role).icon}
          title={personName(menuFor, isAr)}
          onClose={() => setMenuFor(null)}
        >
          <div style={{
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            background: C.band, borderRadius: 12, padding: "10px 12px",
          }}>
            <Chip>#{menuFor.empNo}</Chip>
            <Chip>{siteLabel(wf, menuFor.site, isAr)}</Chip>
            <Chip
              bg={statusMeta(menuFor.status).bg}
              fg={statusMeta(menuFor.status).fg}
              bd={statusMeta(menuFor.status).bd}
            >
              {isAr ? statusMeta(menuFor.status).ar : statusMeta(menuFor.status).en}
            </Chip>
          </div>

          <div style={{ display: "grid", gap: 7 }}>
            <ActionRow
              icon="🕰️"
              label={t({ en: "History", ar: "السجل" })}
              hint={t({ en: "Transfers and status changes", ar: "النقل وتغييرات الحالة" })}
              onClick={() => { setHistory(menuFor); setMenuFor(null); }}
            />
            {canManage && (
              <ActionRow
                icon="✏️"
                label={t({ en: "Edit", ar: "تعديل" })}
                hint={t({ en: "Name, site, supervisor, status", ar: "الاسم والملحمة والمشرف والحالة" })}
                onClick={() => { openEdit(menuFor); setMenuFor(null); }}
              />
            )}
            {canTransfer && (
              <ActionRow
                icon="🔀"
                label={t({ en: "Transfer to another site", ar: "نقل لملحمة ثانية" })}
                hint={t({ en: "Needs a reason — old records are untouched", ar: "بيتطلّب سبب — السجلات القديمة ما بتتغيّر" })}
                onClick={() => {
                  setMoving({ person: menuFor, toSite: "", reason: "", effectiveFrom: "" });
                  setMenuFor(null);
                }}
              />
            )}
            {canManage && (
              <ActionRow
                icon={menuFor.status === "active" ? "⏸️" : "▶️"}
                label={menuFor.status === "active"
                  ? t({ en: "Suspend", ar: "إيقاف" })
                  : t({ en: "Activate", ar: "تفعيل" })}
                hint={menuFor.status === "active"
                  ? t({ en: "Blocked at the kiosk gate", ar: "بينحجب عند بوابة الكشك" })
                  : t({ en: "Can record cuts again", ar: "بيرجع يقدر يسجّل تقطيع" })}
                onClick={() => {
                  setStatusing({
                    person: menuFor,
                    status: menuFor.status === "active" ? "suspended" : "active",
                    reason: "",
                  });
                  setMenuFor(null);
                }}
              />
            )}
            {canDeletePerson(menuFor) && (
              <ActionRow
                icon="🗑️"
                label={t({ en: "Delete", ar: "حذف" })}
                hint={menuFor.role === "butcher"
                  ? t({ en: "Past cut records are kept", ar: "سجلات التقطيع القديمة بتضل محفوظة" })
                  : t({ en: "Unlinks all their butchers", ar: "بيفكّ الربط عن كل جزارينه" })}
                danger
                onClick={() => { setConfirmDel(menuFor); setMenuFor(null); }}
              />
            )}
          </div>
        </Modal>
      )}

      {/* ══════════ النوافذ ══════════ */}
      {editing && (
        <PersonEditor
          wf={wf} sites={sites} draft={editing} setDraft={setEditing}
          errors={errors} onSave={savePerson} onClose={() => setEditing(null)}
          canSetManagerRole={canSetManagerRole}
          t={t} isAr={isAr} dir={dir}
        />
      )}

      {moving && (
        <Modal
          dir={dir} icon="🔀"
          title={t({ en: "Transfer employee", ar: "نقل موظف" })}
          onClose={() => setMoving(null)}
          footer={
            <>
              <Btn onClick={() => setMoving(null)}>{t({ en: "Cancel", ar: "إلغاء" })}</Btn>
              <Btn
                tone="violet"
                disabled={!moving.toSite || moving.toSite === moving.person.site || !moving.reason?.trim()}
                onClick={doTransfer}
              >
                {t({ en: "Transfer", ar: "نقل" })}
              </Btn>
            </>
          }
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <Chip bg={C.band} fg={C.ink}>{personName(moving.person, isAr)} · #{moving.person.empNo}</Chip>
            <Chip bg="#fef2f2" fg={C.red} bd="#fecaca">{siteLabel(wf, moving.person.site, isAr)}</Chip>
            <span style={{ fontWeight: 900, color: C.faint }}>→</span>
            <Chip bg="#ecfdf5" fg={C.green} bd="#a7f3d0">
              {moving.toSite ? siteLabel(wf, moving.toSite, isAr) : t({ en: "choose…", ar: "اختر…" })}
            </Chip>
          </div>

          <Banner tone="info">
            {t({
              en: "Past cut records stay on the old site — they are never rewritten. Only new entries follow the new site.",
              ar: "سجلات التقطيع القديمة بتضل على الملحمة القديمة — ما منعيد كتابتها أبداً. التسجيلات الجديدة بس بتتبع الملحمة الجديدة.",
            })}
          </Banner>

          <div style={grid2}>
            <Field label={t({ en: "New site", ar: "الملحمة الجديدة" })}>
              <Select value={moving.toSite} onChange={(e) => setMoving({ ...moving, toSite: e.target.value })}>
                <option value="">{t({ en: "— choose —", ar: "— اختر —" })}</option>
                {sites.filter((s) => s.code !== moving.person.site).map((s) => (
                  <option key={s.code} value={s.code}>{isAr ? s.ar : s.en}</option>
                ))}
              </Select>
            </Field>
            <Field
              label={t({ en: "Effective from", ar: "يسري من تاريخ" })}
              hint={t({ en: "Leave empty for today", ar: "اتركه فارغاً = اليوم" })}
            >
              <Input
                type="date" value={moving.effectiveFrom || ""}
                onChange={(e) => setMoving({ ...moving, effectiveFrom: e.target.value })}
              />
            </Field>
          </div>

          <Field
            label={t({ en: "Reason (required)", ar: "السبب (إلزامي)" })}
            hint={t({ en: "Written into the permanent movement log", ar: "بينكتب بسجل الحركة الدائم" })}
          >
            <Input
              value={moving.reason}
              onChange={(e) => setMoving({ ...moving, reason: e.target.value })}
              placeholder={t({ en: "e.g. covering Eid load at Al Barsha", ar: "مثال: تغطية ضغط العيد بالبرشا" })}
            />
          </Field>

          {moving.person.role === "butcher" && (
            <Banner tone="warn">
              {t({
                en: "The supervisor link is cleared on transfer — pick a supervisor at the new site right after.",
                ar: "ربط المشرف بينفكّ مع النقل — عيّنلو مشرف بالملحمة الجديدة بعد النقل مباشرة.",
              })}
            </Banner>
          )}
        </Modal>
      )}

      {statusing && (
        <Modal
          dir={dir} icon={statusing.status === "active" ? "▶️" : "⏸️"}
          title={t({ en: "Change status", ar: "تغيير الحالة" })}
          onClose={() => setStatusing(null)}
          footer={
            <>
              <Btn onClick={() => setStatusing(null)}>{t({ en: "Cancel", ar: "إلغاء" })}</Btn>
              <Btn
                tone={statusing.status === "active" ? "ok" : "warn"}
                disabled={statusing.status !== "active" && !statusing.reason?.trim()}
                onClick={doStatus}
              >
                {t({ en: "Apply", ar: "تطبيق" })}
              </Btn>
            </>
          }
        >
          <Chip bg={C.band} fg={C.ink}>{personName(statusing.person, isAr)} · #{statusing.person.empNo}</Chip>

          <Field label={t({ en: "New status", ar: "الحالة الجديدة" })}>
            <Select value={statusing.status} onChange={(e) => setStatusing({ ...statusing, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s.id} value={s.id}>{isAr ? s.ar : s.en}</option>)}
            </Select>
          </Field>

          {statusing.status !== "active" && (
            <Field label={t({ en: "Reason (required)", ar: "السبب (إلزامي)" })}>
              <Input value={statusing.reason} onChange={(e) => setStatusing({ ...statusing, reason: e.target.value })} />
            </Field>
          )}

          <Banner tone={statusing.status === "active" ? "ok" : "warn"}>
            {statusing.status === "active"
              ? t({ en: "This employee will be able to record cuts again.", ar: "هالموظف رح يرجع يقدر يسجّل تقطيع." })
              : t({
                  en: "This employee is blocked at the kiosk gate until reactivated.",
                  ar: "هالموظف بينحجب عند بوابة الكشك لحتى يترجّع تفعيلو.",
                })}
          </Banner>
        </Modal>
      )}

      {history && (
        <Modal
          dir={dir} icon="🕰️" wide
          title={`${t({ en: "History", ar: "السجل" })} — ${personName(history, isAr)}`}
          onClose={() => setHistory(null)}
          footer={<Btn onClick={() => setHistory(null)}>{t({ en: "Close", ar: "إغلاق" })}</Btn>}
        >
          {(history.history || []).length === 0 ? (
            <Empty icon="🕰️" title={t({ en: "No history yet", ar: "ما في سجل بعد" })} />
          ) : (
            <div style={{ display: "grid", gap: 7 }}>
              {[...history.history].reverse().map((h, i) => (
                <div key={i} style={{
                  border: `1px solid ${C.lineSoft}`, borderRadius: 11, padding: "9px 12px",
                  display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap",
                }}>
                  <Chip>{KIND_LABEL[h.kind]?.[isAr ? "ar" : "en"] || h.kind}</Chip>
                  {h.from && <span style={{ fontWeight: 800 }}>{siteLabel(wf, h.from, isAr)}</span>}
                  {h.from && h.to && <span style={{ color: C.faint }}>→</span>}
                  {h.to && <span style={{ fontWeight: 900 }}>{siteLabel(wf, h.to, isAr)}</span>}
                  {h.reason && <span className="wf-sub" style={{ color: C.mute, fontWeight: 700 }}>« {h.reason} »</span>}
                  <span className="wf-lbl" style={{ marginInlineStart: "auto", color: C.faint, fontWeight: 800 }}>
                    {String(h.at).slice(0, 16).replace("T", " ")} · {h.by}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {confirmDel && (
        <Modal
          dir={dir} icon="🗑️"
          title={t({ en: "Delete employee", ar: "حذف موظف" })}
          onClose={() => setConfirmDel(null)}
          footer={
            <>
              <Btn onClick={() => setConfirmDel(null)}>{t({ en: "Cancel", ar: "إلغاء" })}</Btn>
              <Btn tone="danger" onClick={doDelete}>{t({ en: "Delete", ar: "حذف" })}</Btn>
            </>
          }
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={personName(confirmDel, isAr)} color={C.red} soft="#fef2f2" size={40} />
            <div>
              <div className="wf-h2" style={{ fontWeight: 900 }}>{personName(confirmDel, isAr)}</div>
              <div className="wf-lbl" style={{ color: C.faint, fontWeight: 800 }}>
                {roleMeta(confirmDel.role).icon} #{confirmDel.empNo} · {siteLabel(wf, confirmDel.site, isAr)}
              </div>
            </div>
          </div>

          <Banner tone="warn">
            {t({
              en: "Deleting removes them from the registry and from this site's tree. Their past cut records are separate and are NOT deleted — but they will show as an unregistered number.",
              ar: "الحذف بيشيلو من السجل ومن شجرة الملحمة. سجلات تقطيعو القديمة منفصلة و**ما بتنحذف** — بس رح تظهر باسم رقم غير مسجّل.",
            })}
          </Banner>

          {(confirmDel.history || []).length > 1 && (
            <Banner tone="danger">
              {t({
                en: "This employee already has movement history. If they actually worked here, set the status to “Left” instead — that keeps the trail.",
                ar: "هالموظف عندو سجل حركة. إذا اشتغل فعلاً، الأفضل تحطّو «مغادر» بدل ما تحذفو — هيك بيضل الأثر محفوظ.",
              })}
            </Banner>
          )}

          {confirmDel.role !== "butcher" && (
            <Banner tone="danger">
              {t({
                en: "Deleting a supervisor unlinks every butcher under them — they become “no supervisor” until you reassign.",
                ar: "حذف المشرف بيفكّ الربط عن كل جزارينه — بيصيروا «بلا مشرف» لحتى تعيّن غيرو.",
              })}
            </Banner>
          )}
        </Modal>
      )}
    </div>
  );
}

/* سطر واحد لا يلتفّ ولا يزيح جاره — الاسم الطويل بينقصّ بثلاث نقاط. */
const ELLIPSIS = (weight, color) => ({
  fontWeight: weight, color,
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
});

/* ── صف إجراء داخل قائمة «⋯» ── */
function ActionRow({ icon, label, hint, danger, onClick }) {
  return (
    <button
      type="button"
      className="wf-row"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 11, textAlign: "start", width: "100%",
        border: `1px solid ${danger ? "#fecaca" : C.lineSoft}`,
        background: danger ? "#fef2f2" : "#fff",
        borderRadius: 12, padding: "11px 13px", cursor: "pointer",
        fontFamily: "inherit", color: danger ? C.red : C.ink,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ fontWeight: 900, display: "block" }}>{label}</span>
        {hint && (
          <span className="wf-lbl" style={{ color: danger ? "#b91c1c" : C.faint, fontWeight: 700 }}>
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

const KIND_LABEL = {
  created:  { ar: "إضافة", en: "Created" },
  transfer: { ar: "نقل",   en: "Transfer" },
  status:   { ar: "حالة",  en: "Status" },
  edit:     { ar: "تعديل", en: "Edit" },
};

/* ═══════════════════════════════════════════════ محرّر الموظف
 *
 * النافذة مقسومة لثلاث خطوات مرقّمة بدل كومة حقول:
 *   ① مين  — الدور + اختيار الموظف من سجل الموظفين (لا كتابة يدوية)
 *   ② وين  — الملحمة + المشرف (أو حساب الدخول للمشرف)
 *   ③ متى  — الحالة وتاريخ السريان
 * الترقيم بيخلّي المستخدم يعرف وين واقف، والحقل المطلوب ما بيضيع بالزحمة.
 */
function PersonEditor({
  wf, sites, draft, setDraft, errors, onSave, onClose, canSetManagerRole, t, isAr, dir,
}) {
  const isNew = !(wf.people || []).some((p) => p.id === draft.id);
  const isButcher = draft.role === "butcher";
  const set = (k, v) => setDraft({ ...draft, [k]: v });

  const [picking, setPicking] = useState(false);

  const roleChoices = ROLES.filter(
    (r) => r.id !== "manager" || canSetManagerRole || draft.role === "manager"
  );

  /* المشرفون على الملحمة المختارة فقط — لا يظهر مشرف من ملحمة ثانية */
  const supers = useMemo(
    () => (draft.site ? supervisorsOfSite(wf, draft.site).filter((s) => s.status === "active") : []),
    [wf, draft.site]
  );

  const dirRec = directoryEntry(draft.empNo);

  const setSite = (code) => {
    const keep = draft.supervisorId
      ? supervisorsOfSite(wf, code).some((s) => s.id === draft.supervisorId)
      : false;
    setDraft({ ...draft, site: code, sites: code ? [code] : [], supervisorId: keep ? draft.supervisorId : "" });
  };

  /* اختيار موظف من الدليل — الرقم والاسم وبس.
     ما منقترح ملحمة من الدليل: حقل الفرع هناك قديم وما بينتحدّث مع النقل،
     فاقتراح مبني عليه بيحطّ الموظف بملحمة غلط. الملحمة بتنختار يدوياً بالخطوة ②. */
  const pickEmployee = (d) => {
    setDraft({ ...draft, empNo: d.empNo, nameEn: d.name || draft.nameEn });
    setPicking(false);
  };

  const stepBox = {
    display: "grid", gap: 13,
    background: C.band, borderRadius: 14, padding: "14px 15px",
  };

  const StepHead = ({ n, title }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        width: 21, height: 21, borderRadius: 7, background: C.blue, color: "#fff",
        display: "grid", placeItems: "center", fontWeight: 900, fontSize: 12, flexShrink: 0,
      }}>
        {n}
      </span>
      <span className="wf-h2" style={{ fontWeight: 900 }}>{title}</span>
    </div>
  );

  return (
    <Modal
      dir={dir} wide
      icon={roleMeta(draft.role).icon}
      title={isNew ? t({ en: "Add employee", ar: "إضافة موظف" }) : t({ en: "Edit employee", ar: "تعديل موظف" })}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>{t({ en: "Cancel", ar: "إلغاء" })}</Btn>
          <Btn tone="primary" onClick={onSave} disabled={!draft.empNo}>
            {t({ en: "Save", ar: "حفظ" })}
          </Btn>
        </>
      }
    >
      {errors.length > 0 && (
        <Banner tone="danger">
          <ul style={{ margin: 0, paddingInlineStart: 18, display: "grid", gap: 3 }}>
            {errors.map((e, i) => <li key={i}>{isAr ? e.ar : e.en}</li>)}
          </ul>
        </Banner>
      )}

      {/* ① مين */}
      <div style={stepBox}>
        <StepHead n="1" title={t({ en: "Who", ar: "مين" })} />

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {roleChoices.map((r) => (
            <Btn
              key={r.id}
              tone={draft.role === r.id ? "primary" : "ghost"}
              onClick={() => setDraft({
                ...draft, role: r.id,
                supervisorId: r.id === "butcher" ? draft.supervisorId : "",
              })}
            >
              {r.icon} {isAr ? r.ar : r.en}
            </Btn>
          ))}
        </div>

        {draft.empNo ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap",
            background: "#fff", border: `1px solid ${C.line}`, borderRadius: 13, padding: "11px 13px",
          }}>
            <Avatar name={dirRec?.name || draft.name || draft.empNo} color={C.blue} soft="#eff6ff" size={38} />
            <div style={{ minWidth: 0, flex: "1 1 180px", overflow: "hidden" }}>
              <div className="wf-name" style={ELLIPSIS(900, C.ink)}>
                {dirRec?.name || draft.nameEn || draft.name || "—"}
              </div>
              <div className="wf-lbl" style={{ ...ELLIPSIS(800, C.faint), marginTop: 2 }}>
                #{draft.empNo}
              </div>
            </div>
            {!dirRec && (
              <Chip bg="#fffbeb" fg={C.amber} bd="#fde68a">
                ⚠️ {t({ en: "not in directory", ar: "مش بسجل الموظفين" })}
              </Chip>
            )}
            <Btn size="sm" onClick={() => setPicking(true)} style={{ marginInlineStart: "auto" }}>
              {t({ en: "Change", ar: "تغيير" })}
            </Btn>
          </div>
        ) : (
          <Btn tone="primary" size="lg" onClick={() => setPicking(true)} style={{ justifyContent: "center" }}>
            🔍 {t({ en: "Pick employee from the staff directory", ar: "اختر الموظف من سجل الموظفين" })}
          </Btn>
        )}

        <div className="wf-lbl" style={{ color: C.faint, fontWeight: 700, lineHeight: 1.6 }}>
          {t({
            en: "The number comes from the same staff directory the butcher entry screen reads — it is never typed by hand.",
            ar: "الرقم بيتاخد من نفس سجل الموظفين اللي بتقرأ منه شاشة تسجيل الجزار — ما بينكتب بالإيد.",
          })}
        </div>

        <Field
          label={t({ en: "Arabic name (optional)", ar: "الاسم بالعربي (اختياري)" })}
          hint={t({ en: "The directory carries English names only", ar: "سجل الموظفين بيحمل الأسماء بالإنجليزي بس" })}
        >
          <Input value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
      </div>

      {/* ② وين */}
      <div style={stepBox}>
        <StepHead n="2" title={t({ en: "Where", ar: "وين" })} />

        <div style={grid2}>
          <Field label={t({ en: "Site", ar: "الملحمة" })}>
            <Select value={draft.site} onChange={(e) => setSite(e.target.value)}>
              <option value="">{t({ en: "— choose —", ar: "— اختر —" })}</option>
              {sites.map((s) => <option key={s.code} value={s.code}>{isAr ? s.ar : s.en}</option>)}
            </Select>
          </Field>

          {isButcher ? (
            <Field
              label={t({ en: "Supervisor", ar: "المشرف" })}
              hint={t({
                en: "Only supervisors of the chosen site are listed",
                ar: "بتظهر مشرفو الملحمة المختارة فقط",
              })}
            >
              <Select
                value={draft.supervisorId}
                onChange={(e) => set("supervisorId", e.target.value)}
                disabled={!draft.site}
              >
                <option value="">{t({ en: "— choose —", ar: "— اختر —" })}</option>
                {supers.map((s) => (
                  <option key={s.id} value={s.id}>{personName(s, isAr)} · #{s.empNo}</option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field
              label={t({ en: "Login username (optional)", ar: "اسم مستخدم الدخول (اختياري)" })}
              hint={t({
                en: "Links this supervisor to their account. Without it they show in the tree but see nothing when they log in.",
                ar: "بيربط المشرف بحسابو. بدونه بيضل ظاهر بالشجرة بس ما بيشوف شي لما يسجّل دخول.",
              })}
            >
              <Input value={draft.username} onChange={(e) => set("username", e.target.value)} />
            </Field>
          )}
        </div>

        {isButcher && draft.site && supers.length === 0 && (
          <Banner tone="warn">
            {t({
              en: "No active supervisor on this site yet — add a supervisor first.",
              ar: "ما في مشرف نشط بهالملحمة — ضيف مشرف أولاً.",
            })}
          </Banner>
        )}
      </div>

      {/* ③ متى */}
      <div style={stepBox}>
        <StepHead n="3" title={t({ en: "When", ar: "متى" })} />
        <div style={grid2}>
          <Field label={t({ en: "Status", ar: "الحالة" })}>
            <Select value={draft.status} onChange={(e) => set("status", e.target.value)}>
              {STATUSES.map((s) => <option key={s.id} value={s.id}>{isAr ? s.ar : s.en}</option>)}
            </Select>
          </Field>
          <Field label={t({ en: "Effective from", ar: "يسري من" })}>
            <Input type="date" value={draft.effectiveFrom || ""} onChange={(e) => set("effectiveFrom", e.target.value)} />
          </Field>
          {wf.rules?.requirePin && isButcher && (
            <Field label={t({ en: "PIN (4 digits)", ar: "الرمز السرّي (٤ أرقام)" })}>
              <Input
                value={draft.pin} inputMode="numeric" maxLength={4}
                onChange={(e) => set("pin", e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </Field>
          )}
        </div>
        <Field label={t({ en: "Note", ar: "ملاحظة" })}>
          <Input value={draft.note} onChange={(e) => set("note", e.target.value)} />
        </Field>
      </div>

      {picking && (
        <EmployeePicker
          wf={wf} dir={dir} currentId={draft.id}
          onPick={pickEmployee} onClose={() => setPicking(false)}
          t={t} isAr={isAr}
        />
      )}
    </Modal>
  );
}

/* ═══════════════════════════════════════════════ منتقي الموظف
   بيقرأ من `DIRECTORY` — نفس سجل الموظفين اللي بتستعملو شاشة الجزار. */

function EmployeePicker({ wf, dir, currentId, onPick, onClose, t, isAr }) {
  const [q, setQ] = useState("");

  /* الأرقام المسجّلة مسبقاً — بتظهر معلّمة، ما بتنشال من القائمة، حتى يعرف
     المستخدم إنه لقى الشخص الصحيح بس مضاف من قبل. */
  const taken = useMemo(() => {
    const s = new Set();
    (wf.people || []).forEach((p) => { if (p.id !== currentId && p.empNo) s.add(String(p.empNo)); });
    return s;
  }, [wf.people, currentId]);

  const results = useMemo(() => searchDirectory(q, { taken, limit: 60 }), [q, taken]);

  return (
    <Modal
      dir={dir} wide icon="🔍" z={1100}
      title={t({ en: "Staff directory", ar: "سجل الموظفين" })}
      onClose={onClose}
      footer={<Btn onClick={onClose}>{t({ en: "Close", ar: "إغلاق" })}</Btn>}
    >
      <Input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t({ en: "Search by number or name…", ar: "بحث بالرقم أو الاسم…" })}
        style={{ fontSize: 16, padding: "12px 14px" }}
      />

      <div className="wf-lbl" style={{ color: C.faint, fontWeight: 800, marginTop: -8 }}>
        {results.length >= 60
          ? t({ en: "First 60 shown — narrow your search", ar: "أول ٦٠ نتيجة — ضيّق البحث" })
          : `${results.length} ${t({ en: "results", ar: "نتيجة" })}`}
      </div>

      {results.length === 0 ? (
        <Empty
          icon="🔍"
          title={t({ en: "No match in the directory", ar: "ما في تطابق بسجل الموظفين" })}
          sub={t({
            en: "This module only registers people who already exist in the company staff directory.",
            ar: "هالوحدة بتسجّل بس الموظفين الموجودين أصلاً بسجل موظفي الشركة.",
          })}
        />
      ) : (
        <div style={{ display: "grid", gap: 6, maxHeight: "48vh", overflow: "auto", paddingInlineEnd: 2 }}>
          {results.map((d) => (
            <button
              key={d.empNo}
              type="button"
              className="wf-row"
              disabled={d.taken}
              onClick={() => onPick(d)}
              style={{
                display: "flex", alignItems: "center", gap: 11, textAlign: "start",
                border: `1px solid ${C.lineSoft}`, borderRadius: 12, padding: "9px 12px",
                background: d.taken ? "#f8fafc" : "#fff", fontFamily: "inherit",
                cursor: d.taken ? "not-allowed" : "pointer", opacity: d.taken ? 0.6 : 1,
                color: C.ink, width: "100%",
              }}
            >
              <Avatar
                name={d.name}
                color={d.taken ? "#94a3b8" : C.blue}
                soft={d.taken ? "#f1f5f9" : "#eff6ff"}
                size={36}
              />
              <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                <div className="wf-name" style={ELLIPSIS(900, "inherit")}>{d.name}</div>
                <div className="wf-lbl" style={{ ...ELLIPSIS(800, C.faint), marginTop: 2 }}>
                  #{d.empNo}
                </div>
              </div>
              {d.taken && (
                <Chip bg="#f1f5f9" fg="#64748b" bd="#e2e8f0" style={{ flexShrink: 0 }}>
                  {t({ en: "already added", ar: "مضاف مسبقاً" })}
                </Chip>
              )}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

