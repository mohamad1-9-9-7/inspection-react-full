// src/pages/workforce/WorkforceSites.jsx
//
// 🏪 تبويب الملاحم — أي فرع فيه تقطيع فعلاً.
// لا نبني قائمة فروع جديدة: نختار من سجل الفروع الموحّد (inspectionBranches)
// ونعلّم أيها ملحمة تقطيع. الملحمة المخصّصة (خارج السجل) ممكنة للحالات النادرة.

import React, { useMemo, useState } from "react";
import {
  ALL_BRANCHES, peopleOfSite, personName, removeSite, siteLabel, upsertSite,
} from "./workforceConfig";
import {
  Banner, Btn, C, Card, Chip, Empty, Field, Input, Modal, SectionHead, Select,
  grid2, supColor,
} from "./workforceUi";

export default function WorkforceSites({ scope, save, t, isAr, dir }) {
  const { wf, canEditSites, canSeeSite } = scope;

  const [adding, setAdding] = useState(null);   // { code, ar, en, custom }
  const [confirm, setConfirm] = useState(null); // { site, count }

  const sites = useMemo(
    () => (wf.sites || []).filter((s) => canSeeSite(s.code)),
    [wf.sites, canSeeSite]
  );

  /* الفروع التي لم تُضَف بعد — لا نعرض المُضاف مرتين */
  const available = useMemo(
    () => ALL_BRANCHES.filter((b) => !(wf.sites || []).some((s) => s.code === b.code)),
    [wf.sites]
  );

  const info = useMemo(() => {
    const map = {};
    (wf.sites || []).forEach((s) => {
      const all = peopleOfSite(wf, s.code);
      map[s.code] = {
        total: all.length,
        sups: all.filter((p) => p.role !== "butcher"),
        butchers: all.filter((p) => p.role === "butcher").length,
        inactive: all.filter((p) => p.status !== "active").length,
      };
    });
    return map;
  }, [wf]);

  const addSite = async () => {
    if (!adding?.code?.trim()) return;
    await save(upsertSite(wf, { ...adding, code: adding.code.trim(), active: true }));
    setAdding(null);
  };

  const toggleActive = async (s) =>
    save(upsertSite(wf, { ...s, active: !(s.active !== false) }));

  const doRemove = async () => {
    await save(removeSite(wf, confirm.site.code));
    setConfirm(null);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <SectionHead
        icon="🏪"
        title={t({ en: "Butcheries (sites)", ar: "الملاحم" })}
        sub={t({
          en: "Only the branches that actually cut meat. Everything else stays hidden from the whole module.",
          ar: "الفروع اللي فيها تقطيع فعلاً فقط. الباقي بيختفي من كل قوائم الوحدة.",
        })}
        right={
          canEditSites && (
            <Btn tone="primary" onClick={() => setAdding({ code: "", ar: "", en: "", custom: false })}>
              ＋ {t({ en: "Add site", ar: "إضافة ملحمة" })}
            </Btn>
          )
        }
      />

      {sites.length === 0 ? (
        <Empty
          icon="🏪"
          title={t({ en: "No sites yet", ar: "ما في ملاحم بعد" })}
          sub={t({
            en: "Start by adding the branches where cutting happens — POS 15, POS 10, POS 11 …",
            ar: "ابدأ بإضافة الفروع اللي فيها تقطيع — POS 15، POS 10، POS 11 …",
          })}
          action={
            canEditSites && (
              <Btn tone="primary" onClick={() => setAdding({ code: "", ar: "", en: "", custom: false })}>
                ＋ {t({ en: "Add the first site", ar: "أضف أول ملحمة" })}
              </Btn>
            )
          }
        />
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(min(330px,100%),1fr))",
          gap: 14,
        }}>
          {sites.map((s) => {
            const c = info[s.code] || { total: 0, sups: [], butchers: 0, inactive: 0 };
            const off = s.active === false;
            return (
              <Card
                key={s.code}
                className="wf-press"
                pad={0}
                style={{ overflow: "hidden", opacity: off ? 0.66 : 1 }}
              >
                {/* رأس */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 16px" }}>
                  <span style={{
                    width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                    display: "grid", placeItems: "center", fontSize: 22,
                    background: off ? "#eef2f6" : "linear-gradient(135deg,#dc2626,#991b1b)",
                    color: off ? "#94a3b8" : "#fff",
                  }}>
                    {s.icon || "🥩"}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="wf-h2" style={{ fontWeight: 900, lineHeight: 1.3 }}>
                      {isAr ? s.ar : s.en}
                    </div>
                    <div className="wf-lbl" style={{ color: C.faint, fontWeight: 800, marginTop: 2 }}>
                      {s.code}{s.custom ? ` · ${t({ en: "custom", ar: "مخصّصة" })}` : ""}
                    </div>
                  </div>
                  {off && (
                    <Chip bg="#f1f5f9" fg="#64748b" bd="#e2e8f0">
                      {t({ en: "Disabled", ar: "معطّلة" })}
                    </Chip>
                  )}
                </div>

                {/* شريط الأرقام + المشرفون */}
                <div style={{ background: C.band, padding: "12px 16px", display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    <Chip bg="#fff" fg="#5b21b6" bd="#ddd6fe">
                      🧑‍🍳 {c.sups.length} {t({ en: "supervisors", ar: "مشرف" })}
                    </Chip>
                    <Chip bg="#fff" fg="#1e40af" bd="#bfdbfe">
                      🔪 {c.butchers} {t({ en: "butchers", ar: "جزار" })}
                    </Chip>
                    {c.inactive > 0 && (
                      <Chip bg="#fff" fg={C.amber} bd="#fde68a">
                        ⏸️ {c.inactive}
                      </Chip>
                    )}
                  </div>

                  {c.sups.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {c.sups.map((sup, i) => {
                        const col = supColor(i);
                        return (
                          <Chip key={sup.id} bg="#fff" fg={col.ink} bd={col.line}>
                            <span style={{ color: col.solid, fontWeight: 900 }}>●</span>
                            {personName(sup, isAr)}
                          </Chip>
                        );
                      })}
                    </div>
                  )}
                </div>

                {canEditSites && (
                  <div style={{
                    display: "flex", gap: 8, flexWrap: "wrap",
                    padding: "11px 16px", borderTop: `1px solid ${C.lineSoft}`,
                  }}>
                    <Btn size="sm" onClick={() => toggleActive(s)}>
                      {off ? t({ en: "Enable", ar: "تفعيل" }) : t({ en: "Disable", ar: "تعطيل" })}
                    </Btn>
                    <Btn
                      size="sm" tone="danger"
                      style={{ marginInlineStart: "auto" }}
                      onClick={() => setConfirm({ site: s, count: c.total })}
                    >
                      🗑️ {t({ en: "Remove", ar: "حذف" })}
                    </Btn>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── إضافة ملحمة ── */}
      {adding && (
        <Modal
          dir={dir} icon="🏪"
          title={t({ en: "Add a site", ar: "إضافة ملحمة" })}
          onClose={() => setAdding(null)}
          footer={
            <>
              <Btn onClick={() => setAdding(null)}>{t({ en: "Cancel", ar: "إلغاء" })}</Btn>
              <Btn tone="primary" disabled={!adding.code?.trim()} onClick={addSite}>
                {t({ en: "Add", ar: "إضافة" })}
              </Btn>
            </>
          }
        >
          <div style={{ display: "flex", gap: 8 }}>
            <Btn
              tone={adding.custom ? "ghost" : "primary"}
              onClick={() => setAdding({ code: "", ar: "", en: "", custom: false })}
            >
              {t({ en: "From branch list", ar: "من سجل الفروع" })}
            </Btn>
            <Btn
              tone={adding.custom ? "primary" : "ghost"}
              onClick={() => setAdding({ code: "", ar: "", en: "", custom: true })}
            >
              {t({ en: "Custom", ar: "مخصّصة" })}
            </Btn>
          </div>

          {adding.custom ? (
            <div style={grid2}>
              <Field label={t({ en: "Code", ar: "الكود" })} hint={t({ en: "e.g. POS 99", ar: "مثال: POS 99" })}>
                <Input value={adding.code} onChange={(e) => setAdding({ ...adding, code: e.target.value })} />
              </Field>
              <Field label={t({ en: "Arabic name", ar: "الاسم بالعربي" })}>
                <Input value={adding.ar} onChange={(e) => setAdding({ ...adding, ar: e.target.value })} />
              </Field>
              <Field label={t({ en: "English name", ar: "الاسم بالإنجليزي" })}>
                <Input value={adding.en} onChange={(e) => setAdding({ ...adding, en: e.target.value })} />
              </Field>
            </div>
          ) : (
            <Field
              label={t({ en: "Branch", ar: "الفرع" })}
              hint={t({
                en: "Only branches not added yet are listed.",
                ar: "القائمة بتعرض الفروع اللي لسّا ما انضافت.",
              })}
            >
              <Select value={adding.code} onChange={(e) => setAdding({ ...adding, code: e.target.value })}>
                <option value="">{t({ en: "— choose —", ar: "— اختر —" })}</option>
                {available.map((b) => (
                  <option key={b.code} value={b.code}>{b.icon} {isAr ? b.ar : b.en}</option>
                ))}
              </Select>
            </Field>
          )}

          {!adding.custom && available.length === 0 && (
            <Banner tone="warn">
              {t({ en: "All branches are already added as sites.", ar: "كل الفروع مضافة أصلاً كملاحم." })}
            </Banner>
          )}
        </Modal>
      )}

      {/* ── تأكيد الحذف ── */}
      {confirm && (
        <Modal
          dir={dir} icon="🗑️"
          title={t({ en: "Remove site", ar: "حذف ملحمة" })}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Btn onClick={() => setConfirm(null)}>{t({ en: "Cancel", ar: "إلغاء" })}</Btn>
              <Btn tone="danger" disabled={confirm.count > 0} onClick={doRemove}>
                {t({ en: "Remove", ar: "حذف" })}
              </Btn>
            </>
          }
        >
          {confirm.count > 0 ? (
            <Banner tone="danger">
              {t({
                en: `${confirm.count} employee(s) are still assigned to ${siteLabel(wf, confirm.site.code, false)}. Move them to another site first — deleting would leave them with no site.`,
                ar: `في ${confirm.count} موظف لسّا مربوطين بـ${siteLabel(wf, confirm.site.code, true)}. انقلهم لملحمة ثانية أولاً — الحذف بيخلّيهم بلا ملحمة.`,
              })}
            </Banner>
          ) : (
            <Banner tone="warn">
              {t({
                en: "This only removes the site from the workforce module. Nothing in the branch register or in past reports changes.",
                ar: "هذا بيشيل الملحمة من وحدة القوى العاملة فقط. سجل الفروع والتقارير القديمة ما بتتأثر.",
              })}
            </Banner>
          )}
        </Modal>
      )}
    </div>
  );
}
