// src/pages/haccp and iso/Licenses and Contracts/BranchManager.jsx
//
// "Manage branches" window, opened from the register and the entry page.
// Add, rename, reorder and delete branches. A rename also moves the branch's
// existing records to the new name (logged in each record's history); a
// delete only removes the branch from the list — its documents stay in the
// register under the old name until they are moved or deleted.
import React, { useMemo, useState } from "react";
import { Modal, Btn } from "../_shared/pageKit";
import { safeArr, getId, diffPayloads, currentActor } from "./licensesKit";
import { writeRecord } from "./licensesNet";
import { normalizeBranches, branchRenames } from "./licensesBranches";
import { newUid } from "./licensesKit";

const L = {
  en: {
    title: "Manage branches", hint: "This list is used by the register and the entry page. A rename moves the branch's records too. A branch set \"under\" another (e.g. a food truck) works under that branch's licence.",
    under: "Belongs to", own: "Own licence", isParent: "Has sub-branches", underOf: (n) => `Under ${n}`,
    underHint: "Pick the branch whose licence this one works under",
    name: "Branch name", add: "+ Add", addPh: "New branch name", up: "Move up", down: "Move down", del: "Delete",
    docs: (n) => `${n} document${n === 1 ? "" : "s"}`, save: "Save", saving: "Saving…", cancel: "Cancel",
    dup: (n) => `"${n}" is already in the list.`, empty: "A branch name can't be empty.",
    confirmDel: (n, d) => `Delete "${n}" from the list?${d ? `\n\nIts ${d} document(s) stay in the register under this name.` : ""}`,
    confirmRename: (list, n) => `Rename ${list}?\n\n${n} record(s) will move to the new name.`,
    saved: "Branches saved.", fail: "Save failed: ", movedFail: (n) => `Branches saved, but ${n} record(s) could not be moved — try again.`,
  },
  ar: {
    title: "إدارة الفروع", hint: "هذه القائمة يستخدمها السجل وصفحة الإدخال. تغيير اسم الفرع ينقل سجلاته أيضاً. الفرع \"التابع\" لفرع آخر (مثل عربة طعام) يعمل تحت رخصة ذلك الفرع.",
    under: "تابع لـ", own: "رخصة مستقلة", isParent: "لديه فروع تابعة", underOf: (n) => `تابع لـ ${n}`,
    underHint: "اختر الفرع الذي يعمل هذا الفرع تحت رخصته",
    name: "اسم الفرع", add: "+ إضافة", addPh: "اسم فرع جديد", up: "للأعلى", down: "للأسفل", del: "حذف",
    docs: (n) => `${n} مستند`, save: "حفظ", saving: "جارٍ الحفظ…", cancel: "إلغاء",
    dup: (n) => `"${n}" موجود في القائمة.`, empty: "اسم الفرع لا يمكن أن يكون فارغاً.",
    confirmDel: (n, d) => `حذف "${n}" من القائمة؟${d ? `\n\nمستنداته (${d}) تبقى في السجل بهذا الاسم.` : ""}`,
    confirmRename: (list, n) => `تغيير اسم ${list}؟\n\nسيُنقل ${n} سجل إلى الاسم الجديد.`,
    saved: "تم حفظ الفروع.", fail: "فشل الحفظ: ", movedFail: (n) => `تم حفظ الفروع، لكن تعذّر نقل ${n} سجل — حاول مرة أخرى.`,
  },
};

const rowBtn = { minWidth: 36, height: 36, borderRadius: 9, border: "1px solid #cfe0f3", background: "#fff", cursor: "pointer", fontWeight: 800, color: "#1e3a5f" };

/**
 * branches — [{id,name}] as saved; reports — the licence records (for counts and renames)
 * onSave(list) — persists the list; onDone(msg) — after save (caller reloads + toasts)
 */
export default function BranchManager({ lang, branches, reports, onSave, onClose, onDone }) {
  const l = L[lang] || L.en;
  const [list, setList] = useState(() => branches.map((b) => ({ ...b })));
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const m = {};
    safeArr(reports).forEach((r) => {
      const p = r?.payload || {};
      const b = String(p.branch || "").trim();
      const n = (p.license?.name || p.license?.expiryDate ? 1 : 0) + safeArr(p.licenses).length + safeArr(p.contracts).length;
      m[b] = (m[b] || 0) + n;
    });
    return m;
  }, [reports]);

  const set = (id, name) => { setErr(""); setList((p) => p.map((b) => (b.id === id ? { ...b, name } : b))); };
  const setParent = (id, parentId) => setList((p) => p.map((b) => (b.id === id ? { ...b, parentId } : b)));
  const move = (i, d) => setList((p) => {
    const j = i + d;
    if (j < 0 || j >= p.length) return p;
    const n = p.slice(); [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const remove = (b) => {
    const orig = branches.find((x) => x.id === b.id)?.name || b.name;
    if (!window.confirm(l.confirmDel(b.name, counts[orig] || 0))) return;
    // its sub-branches become branches of their own
    setList((p) => p.filter((x) => x.id !== b.id).map((x) => (x.parentId === b.id ? { ...x, parentId: "" } : x)));
  };
  const add = () => {
    const name = draft.replace(/\s+/g, " ").trim();
    if (!name) return;
    if (list.some((b) => b.name.trim().toLowerCase() === name.toLowerCase())) { setErr(l.dup(name)); return; }
    setList((p) => [...p, { id: newUid("b"), name }]);
    setDraft(""); setErr("");
  };

  async function save() {
    if (list.some((b) => !b.name.trim())) { setErr(l.empty); return; }
    const names = list.map((b) => b.name.trim().toLowerCase());
    const dup = names.find((n, i) => names.indexOf(n) !== i);
    if (dup) { setErr(l.dup(list.find((b) => b.name.trim().toLowerCase() === dup).name)); return; }

    const renames = branchRenames(branches, list);
    const moving = safeArr(reports).filter((r) => renames.some((x) => x.from === String(r?.payload?.branch || "").trim()));
    if (renames.length && moving.length
      && !window.confirm(l.confirmRename(renames.map((x) => `"${x.from}" → "${x.to}"`).join(", "), moving.length))) return;

    setBusy(true);
    try {
      await onSave(normalizeBranches(list), currentActor());
      let failed = 0;
      for (const r of moving) {
        const old = r.payload || {};
        const to = renames.find((x) => x.from === String(old.branch || "").trim()).to;
        const next = { ...old, branch: to, savedAt: Date.now() };
        next.history = [...safeArr(old.history), ...diffPayloads(old, next)];
        try { await writeRecord(getId(r), next); } catch { failed += 1; }
      }
      onDone(failed ? l.movedFail(failed) : l.saved);
    } catch (e) {
      setErr(l.fail + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open narrow lang={lang} title={`🏢 ${l.title}`} onClose={busy ? () => {} : onClose}
      actions={(
        <>
          <Btn onClick={onClose} disabled={busy}>{l.cancel}</Btn>
          <Btn kind="ok" onClick={save} disabled={busy}>{busy ? l.saving : `✓ ${l.save}`}</Btn>
        </>
      )}>
      <div className="pgk-hint">{l.hint}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {list.map((b, i) => {
          const orig = branches.find((x) => x.id === b.id)?.name;
          const n = orig ? counts[orig] || 0 : 0;
          const isParent = list.some((x) => x.parentId === b.id);
          const parentChoices = list.filter((x) => x.id !== b.id && !x.parentId);
          return (
            <div key={b.id} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", background: b.parentId ? "#f8fbff" : "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 8, marginInlineStart: b.parentId ? 22 : 0 }}>
              <input className="pgk-in" value={b.name} aria-label={l.name} onChange={(e) => set(b.id, e.target.value)} style={{ flex: "1 1 180px", minWidth: 0 }} />
              <select className="pgk-in" value={b.parentId || ""} aria-label={l.under} title={isParent ? l.isParent : l.underHint}
                disabled={isParent} onChange={(e) => setParent(b.id, e.target.value)} style={{ flex: "0 1 190px", minWidth: 140 }}>
                <option value="">{isParent ? l.isParent : l.own}</option>
                {parentChoices.map((x) => <option key={x.id} value={x.id}>↳ {l.underOf(x.name)}</option>)}
              </select>
              {n > 0 && <span className="pgk-pill grey">{l.docs(n)}</span>}
              <button type="button" style={rowBtn} title={l.up} aria-label={l.up} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
              <button type="button" style={rowBtn} title={l.down} aria-label={l.down} disabled={i === list.length - 1} onClick={() => move(i, 1)}>↓</button>
              <button type="button" style={{ ...rowBtn, color: "#b91c1c", borderColor: "#fecaca", background: "#fff5f5" }} title={l.del} aria-label={l.del} onClick={() => remove(b)}>🗑</button>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="pgk-in" value={draft} placeholder={l.addPh} onChange={(e) => { setDraft(e.target.value); setErr(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} style={{ flex: 1 }} />
        <Btn kind="primary" onClick={add} disabled={!draft.trim()}>{l.add}</Btn>
      </div>
      {err && <div className="pgk-err">{err}</div>}
    </Modal>
  );
}
