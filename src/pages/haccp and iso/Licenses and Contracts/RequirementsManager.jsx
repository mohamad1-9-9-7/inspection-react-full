// src/pages/haccp and iso/Licenses and Contracts/RequirementsManager.jsx
//
// "Required documents" window: the licences and contracts a branch must have.
// Each line = kind (licence / contract) + name + where it applies (every
// branch, or only the ticked ones). The register shows every gap as a red
// "Missing" row with a one-click fix.
import React, { useState } from "react";
import { Modal, Btn } from "../_shared/pageKit";
import { newUid, currentActor, CORE_LICENSES, CONTRACT_TYPES } from "./licensesKit";
import { normalizeRequirements } from "./licensesBranches";

const L = {
  en: {
    title: "Required documents", hint: "A branch without one of these shows a red \"Missing\" alert in the register. A sub-branch is covered by its parent's licence.",
    license: "🪪 Licence", contract: "📄 Contract", kind: "Kind", name: "Name", namePhL: "e.g. Industrial License", namePhC: "e.g. Pest Control",
    allBranches: "All branches", someBranches: (n) => `${n} branch${n === 1 ? "" : "es"}`, pick: "Applies to", del: "Remove",
    add: "+ Add requirement", quick: "Quick add:", save: "Save", saving: "Saving…", cancel: "Cancel",
    none: "Nothing is required yet — add the licences and contracts every branch must have.",
    empty: "Every line needs a name.", fail: "Save failed: ", saved: "Required documents saved.",
    onlyThese: "Only these branches (none ticked = all):",
  },
  ar: {
    title: "المستندات الإلزامية", hint: "الفرع الذي ينقصه أحدها يظهر له تنبيه أحمر \"ناقص\" في السجل. الفرع التابع تغطيه رخصة الفرع الأب.",
    license: "🪪 رخصة", contract: "📄 عقد", kind: "النوع", name: "الاسم", namePhL: "مثال: رخصة صناعية", namePhC: "مثال: مكافحة حشرات",
    allBranches: "كل الفروع", someBranches: (n) => `${n} فرع`, pick: "ينطبق على", del: "إزالة",
    add: "+ إضافة مستند إلزامي", quick: "إضافة سريعة:", save: "حفظ", saving: "جارٍ الحفظ…", cancel: "إلغاء",
    none: "لا يوجد شيء إلزامي بعد — أضف الرخص والعقود التي يجب أن تكون لدى كل فرع.",
    empty: "كل سطر يحتاج اسماً.", fail: "فشل الحفظ: ", saved: "تم حفظ المستندات الإلزامية.",
    onlyThese: "هذه الفروع فقط (بدون تحديد = كل الفروع):",
  },
};

const QUICK = [
  ...CORE_LICENSES.map((n) => ({ kind: "license", name: n })),
  ...CONTRACT_TYPES.slice(0, 5).map((n) => ({ kind: "contract", name: n })),
];

/** requirements — saved list; branchNames — Manage branches list; sugg — buildSuggestions() */
export default function RequirementsManager({ lang, requirements, branchNames, sugg, onSave, onClose, onDone }) {
  const l = L[lang] || L.en;
  const [list, setList] = useState(() => requirements.map((r) => ({ ...r, branches: [...r.branches] })));
  const [open, setOpen] = useState(null); // id whose branch picker is open
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (id, patch) => { setErr(""); setList((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r))); };
  const has = (kind, name) => list.some((r) => r.kind === kind && r.name.trim().toLowerCase() === name.toLowerCase());
  const add = (kind = "license", name = "") => {
    const id = newUid("q");
    setList((p) => [...p, { id, kind, name, branches: [] }]);
    if (!name) setOpen(null);
  };
  const toggleBranch = (r, b) => set(r.id, { branches: r.branches.includes(b) ? r.branches.filter((x) => x !== b) : [...r.branches, b] });

  async function save() {
    if (list.some((r) => !r.name.trim())) { setErr(l.empty); return; }
    setBusy(true);
    try {
      await onSave(normalizeRequirements(list), currentActor());
      onDone(l.saved);
    } catch (e) {
      setErr(l.fail + (e?.message || e));
      setBusy(false);
    }
  }

  const licNames = (sugg?.licenseTypes || []).map((x) => x.value);
  const conNames = (sugg?.contractTypes || []).map((x) => x.value);

  return (
    <Modal open lang={lang} title={`📋 ${l.title}`} onClose={busy ? () => {} : onClose}
      actions={(
        <>
          <Btn onClick={onClose} disabled={busy}>{l.cancel}</Btn>
          <Btn kind="ok" onClick={save} disabled={busy}>{busy ? l.saving : `✓ ${l.save}`}</Btn>
        </>
      )}>
      <div className="pgk-hint">{l.hint}</div>
      <datalist id="lc-req-lic">{licNames.map((n) => <option key={n} value={n} />)}</datalist>
      <datalist id="lc-req-con">{conNames.map((n) => <option key={n} value={n} />)}</datalist>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span className="pgk-label" style={{ margin: 0 }}>{l.quick}</span>
        {QUICK.map((q) => {
          const on = has(q.kind, q.name);
          return (
            <button key={`${q.kind}:${q.name}`} type="button" className="pgk-btn sm" disabled={on} onClick={() => add(q.kind, q.name)}>
              {on ? "✓" : "+"} {q.kind === "license" ? "🪪" : "📄"} {q.name}
            </button>
          );
        })}
      </div>

      {!list.length && <div className="pgk-note">{l.none}</div>}
      <div style={{ display: "grid", gap: 8 }}>
        {list.map((r) => (
          <div key={r.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderInlineStart: `5px solid ${r.kind === "license" ? "#6366f1" : "#0ea5e9"}`, borderRadius: 12, padding: 10, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select className="pgk-in" value={r.kind} aria-label={l.kind} onChange={(e) => set(r.id, { kind: e.target.value })} style={{ flex: "0 0 150px" }}>
                <option value="license">{l.license}</option>
                <option value="contract">{l.contract}</option>
              </select>
              <input className="pgk-in" value={r.name} aria-label={l.name} list={r.kind === "license" ? "lc-req-lic" : "lc-req-con"}
                placeholder={r.kind === "license" ? l.namePhL : l.namePhC} onChange={(e) => set(r.id, { name: e.target.value })} style={{ flex: "1 1 200px", minWidth: 0 }} />
              <button type="button" className="pgk-btn sm" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}>
                📍 {r.branches.length ? l.someBranches(r.branches.length) : l.allBranches} ▾
              </button>
              <button type="button" className="pgk-btn sm danger" onClick={() => setList((p) => p.filter((x) => x.id !== r.id))}>🗑 {l.del}</button>
            </div>
            {open === r.id && (
              <div style={{ background: "#f8fbff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                <div className="pgk-label">{l.onlyThese}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {branchNames.map((b) => {
                    const on = r.branches.includes(b);
                    return (
                      <label key={b} style={{ display: "inline-flex", gap: 6, alignItems: "center", padding: "6px 10px", borderRadius: 999, cursor: "pointer", fontWeight: 700,
                        border: `1.5px solid ${on ? "#a5b4fc" : "#e2e8f0"}`, background: on ? "#eef2ff" : "#fff", color: on ? "#3730a3" : "#334155" }}>
                        <input type="checkbox" checked={on} onChange={() => toggleBranch(r, b)} />{b}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div><Btn kind="primary" onClick={() => add()}>{l.add}</Btn></div>
      {err && <div className="pgk-err">{err}</div>}
    </Modal>
  );
}
