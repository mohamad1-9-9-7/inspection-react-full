// src/pages/workforce/WorkforceAccountLink.jsx
//
// 🔑 ربط الموظف بحساب دخوله.
//
// الفكرة: الحساب بينعمل بـ«مركز إضافة الحسابات» (اسم مستخدم + كلمة سر +
// صلاحيات) وبس. هون منقول بس: هالحساب لأي موظف. الرقم الوظيفي والملحمة
// بينتحدّدوا بالقوى العاملة — مش جوّا الحساب.
//
// ما في كتابة يدوية لاسم المستخدم أبداً: بس بحث واختيار من الحسابات
// الموجودة فعلاً. اسم مستخدم مكتوب غلط بيعني موظف ما بيتعرّف عليه النظام
// وقت الدخول، وما في شي بالشاشة بيكشف الغلطة — فالبحث هو الضمانة.
//
// النتيجة العملية: لما الجزار يفتح شاشة تسجيل الأوزان، النظام بيعرف مين هوّ
// فوراً، فبتطلع بطاقته (اسمه · رقمه الوظيفي · ملحمته) مقفولة بلا ما يكتب شي.

import React, { useMemo, useState } from "react";
import { accountLinks, personName } from "./workforceConfig";
import { accountKey, searchAccounts, useAccounts } from "./workforceAccounts";
import {
  Avatar, Banner, Btn, C, Chip, ELLIPSIS, Empty, Input, Modal,
} from "./workforceUi";

/* ═══════════════════════════════════════════════ البطاقة داخل محرّر الموظف */

export default function AccountLink({ draft, setDraft, wf, isButcher, t, isAr, dir }) {
  const { accounts, loading, error, reload } = useAccounts();
  const [picking, setPicking] = useState(false);

  const linked = useMemo(() => {
    const key = accountKey(draft.username);
    if (!key) return null;
    return (accounts || []).find((a) => accountKey(a.username) === key) || null;
  }, [accounts, draft.username]);

  const pick = (a) => {
    setDraft({ ...draft, username: a.username, accountName: a.displayName });
    setPicking(false);
  };

  const unlink = () => setDraft({ ...draft, username: "", accountName: "" });

  /* اسم مستخدم محفوظ ما عاد إله حساب: الحساب انحذف أو انتغيّر اسمه.
     منعرضه كتحذير صريح بدل ما نمسحه بصمت — القرار للمستخدم. */
  const orphan = !!draft.username && !loading && !error && !linked;

  return (
    <>
      {draft.username ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap",
          background: "#fff",
          border: `1px solid ${orphan ? "#fecaca" : C.line}`,
          borderRadius: 13, padding: "11px 13px",
        }}>
          <Avatar
            name={linked?.displayName || draft.accountName || draft.username}
            color={orphan ? C.red : C.violet}
            soft={orphan ? "#fef2f2" : "#f5f3ff"}
            size={38}
            icon={orphan ? "⚠️" : "🔑"}
          />
          <div style={{ minWidth: 0, flex: "1 1 170px", overflow: "hidden" }}>
            <div className="wf-name" style={ELLIPSIS(900, C.ink)}>
              {linked?.displayName || draft.accountName || draft.username}
            </div>
            <div className="wf-lbl" style={{ ...ELLIPSIS(800, C.faint), marginTop: 2 }}>
              @{draft.username}
            </div>
          </div>

          {orphan && (
            <Chip bg="#fef2f2" fg="#b91c1c" bd="#fecaca">
              ⚠️ {t({ en: "no such account", ar: "ما في حساب بهالاسم" })}
            </Chip>
          )}
          {linked && !linked.isActive && (
            <Chip bg="#fffbeb" fg={C.amber} bd="#fde68a">
              {t({ en: "account disabled", ar: "الحساب موقوف" })}
            </Chip>
          )}

          <div style={{ display: "flex", gap: 6, marginInlineStart: "auto" }}>
            <Btn size="sm" onClick={() => setPicking(true)}>
              {t({ en: "Change", ar: "تغيير" })}
            </Btn>
            <Btn size="sm" tone="danger" onClick={unlink}>
              {t({ en: "Unlink", ar: "فكّ الربط" })}
            </Btn>
          </div>
        </div>
      ) : (
        <Btn
          tone="violet" size="lg"
          onClick={() => setPicking(true)}
          style={{ justifyContent: "center" }}
        >
          🔑 {t({ en: "Search the accounts and pick one", ar: "ابحث بالحسابات واختر واحد" })}
        </Btn>
      )}

      {!draft.username && isButcher && (
        <Banner tone="warn">
          {t({
            en: "Without an account this butcher keeps typing his employee number on the entry screen, and his name will not appear when he logs in.",
            ar: "بلا حساب، الجزار بيضل يكتب رقمه الوظيفي بشاشة التسجيل، واسمه ما بيطلع لما يسجّل دخول.",
          })}
        </Banner>
      )}

      {error === "accounts_endpoint_missing" ? (
        <Banner tone="danger">
          {t({
            en: "The accounts service is not available on this server yet.",
            ar: "خدمة الحسابات مش متوفّرة على هذا السيرفر بعد.",
          })}
        </Banner>
      ) : error ? (
        <Banner tone="danger">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {t({ en: "Could not load the accounts.", ar: "ما قدرنا نجيب الحسابات." })}
            <Btn size="sm" onClick={() => reload(true)}>{t({ en: "Retry", ar: "إعادة المحاولة" })}</Btn>
          </span>
        </Banner>
      ) : null}

      <div className="wf-lbl" style={{ color: C.faint, fontWeight: 700, lineHeight: 1.6 }}>
        {t({
          en: "Accounts are created in the Accounts Control Center. Here you only say which employee an account belongs to — the employee number and the site are set in the steps above, never inside the account.",
          ar: "الحسابات بتنعمل بمركز إضافة الحسابات. هون منقول بس هالحساب لأي موظف — الرقم الوظيفي والملحمة بينتحدّدوا بالخطوات فوق، مش جوّا الحساب.",
        })}
      </div>

      {picking && (
        <AccountPicker
          wf={wf} accounts={accounts} loading={loading}
          currentId={draft.id}
          onPick={pick} onClose={() => setPicking(false)}
          t={t} isAr={isAr} dir={dir}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════ منتقي الحساب
   بيقرأ من `/api/app-users` — نفس مصدر «مركز إضافة الحسابات» بالضبط،
   فما في قائمة حسابات ثانية ممكن تصير قديمة. */

function AccountPicker({ wf, accounts, loading, currentId, onPick, onClose, t, isAr, dir }) {
  const [q, setQ] = useState("");

  /* الحسابات المربوطة أصلاً بموظف آخر: بتظهر معلّمة باسم صاحبها ولا بتنشال
     من القائمة — حتى يعرف المستخدم إنه لقى الحساب الصحيح بس مربوط من قبل.
     (نفس سلوك سجل الموظفين بالضبط.) */
  const taken = useMemo(() => accountLinks(wf, currentId), [wf, currentId]);

  const results = useMemo(
    () => searchAccounts(accounts, q, { taken, limit: 60 }),
    [accounts, q, taken]
  );

  return (
    <Modal
      dir={dir} wide icon="🔑" z={1100}
      title={t({ en: "Login accounts", ar: "حسابات الدخول" })}
      onClose={onClose}
      footer={<Btn onClick={onClose}>{t({ en: "Close", ar: "إغلاق" })}</Btn>}
    >
      <Input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t({ en: "Search by name or username…", ar: "بحث بالاسم أو اسم المستخدم…" })}
        style={{ fontSize: 16, padding: "12px 14px" }}
      />

      <div className="wf-lbl" style={{ color: C.faint, fontWeight: 800, marginTop: -8 }}>
        {loading && results.length === 0
          ? t({ en: "Loading accounts…", ar: "عم نجيب الحسابات…" })
          : results.length >= 60
            ? t({ en: "First 60 shown — narrow your search", ar: "أول ٦٠ نتيجة — ضيّق البحث" })
            : `${results.length} ${t({ en: "results", ar: "نتيجة" })}`}
      </div>

      {results.length === 0 && !loading ? (
        <Empty
          icon="🔑"
          title={t({ en: "No matching account", ar: "ما في حساب مطابق" })}
          sub={t({
            en: "Only accounts that already exist in the Accounts Control Center are listed. Create the account there first, then come back and link it here.",
            ar: "بتظهر بس الحسابات الموجودة فعلاً بمركز إضافة الحسابات. اعمل الحساب هناك أولاً، وبعدين ارجع اربطه من هون.",
          })}
        />
      ) : (
        <div style={{ display: "grid", gap: 6, maxHeight: "48vh", overflow: "auto", paddingInlineEnd: 2 }}>
          {results.map((a) => (
            <button
              key={a.username}
              type="button"
              className="wf-row"
              disabled={a.taken}
              onClick={() => onPick(a)}
              style={{
                display: "flex", alignItems: "center", gap: 11, textAlign: "start",
                border: `1px solid ${C.lineSoft}`, borderRadius: 12, padding: "9px 12px",
                background: a.taken ? "#f8fafc" : "#fff", fontFamily: "inherit",
                cursor: a.taken ? "not-allowed" : "pointer", opacity: a.taken ? 0.6 : 1,
                color: C.ink, width: "100%",
              }}
            >
              <Avatar
                name={a.displayName}
                color={a.taken ? "#94a3b8" : C.violet}
                soft={a.taken ? "#f1f5f9" : "#f5f3ff"}
                size={36}
              />
              <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                <div className="wf-name" style={ELLIPSIS(900, "inherit")}>{a.displayName}</div>
                <div className="wf-lbl" style={{ ...ELLIPSIS(800, C.faint), marginTop: 2 }}>
                  @{a.username}
                  {a.isAdmin && ` · ${t({ en: "admin", ar: "أدمن" })}`}
                  {!a.isActive && ` · ${t({ en: "disabled", ar: "موقوف" })}`}
                </div>
              </div>
              {a.taken && (
                <Chip bg="#f1f5f9" fg="#64748b" bd="#e2e8f0" style={{ flexShrink: 0 }}>
                  {t({ en: "linked to", ar: "مربوط بـ" })} {personName(a.takenBy, isAr)}
                </Chip>
              )}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
