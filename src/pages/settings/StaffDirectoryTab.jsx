// src/pages/settings/StaffDirectoryTab.jsx
//
// 👥 سجل الموظفين — من هو على نماذج الجودة، وأين يظهر اسمه تلقائياً.
//
// Replaces the hardcoded `DEFAULT_NAMES` array that used to live inside
// PersonalHygieneTab.js. People are imported from the company directory
// (pages/ohc/OHCUpload → EMPLOYEES), so employee numbers are never typed by
// hand and never invented. Each person carries the list of forms they should
// appear on automatically — QCS today, the other branches as they get wired.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  COMPANY_DIRECTORY,
  DEFAULT_FORMS,
  QCS_COMPANY_BRANCHES,
  STAFF_FORMS,
  companyBranches,
  fetchStaff,
  loadStaffCache,
  normalizeEmpNo,
  removeStaff,
  renumberStaff,
  saveStaffCache,
  saveStaffList,
  searchCompany,
  upsertStaff,
} from "../monitor/branches/_shared/staffRegistry";
import { Button, ConfirmModal, PageHeader, StatusMessage, ui } from "./_shared/SettingsUIKit";

const chip = (on) => ({
  padding: "3px 9px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 950,
  border: `1px solid ${on ? "#0f766e" : "rgba(15,23,42,0.16)"}`,
  background: on ? "#0f766e" : "#fff",
  color: on ? "#fff" : "#64748b",
  cursor: "pointer",
  whiteSpace: "nowrap",
});

export default function StaffDirectoryTab() {
  const [staff, setStaff] = useState(() => loadStaffCache());
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(null);

  /* Import panel */
  const [importOpen, setImportOpen] = useState(false);
  const [importQ, setImportQ] = useState("");
  const [importBranches, setImportBranches] = useState(() => QCS_COMPANY_BRANCHES);
  const [picked, setPicked] = useState(() => new Set());
  const [importForms, setImportForms] = useState(() => DEFAULT_FORMS.slice());

  const importRef = useRef(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const server = await fetchStaff();
    if (Array.isArray(server)) {
      setStaff(server);
      saveStaffCache(server);
      setOnline(true);
    } else {
      setStaff(loadStaffCache());
      setOnline(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  /* Every write goes through here: change the list, push the whole thing, and
     roll back on failure so the screen never shows a save that did not land. */
  const commit = useCallback(async (next, successMsg) => {
    const previous = staff;
    setStaff(next);
    setBusy(true);
    setMsg("⏳ Saving…");
    try {
      const saved = await saveStaffList(next);
      setStaff(saved);
      setOnline(true);
      setMsg(successMsg);
      return true;
    } catch (e) {
      setStaff(previous);
      setMsg(`❌ ${e.message || e}`);
      return false;
    } finally {
      setBusy(false);
    }
  }, [staff]);

  const takenNos = useMemo(
    () => new Set(staff.map((s) => normalizeEmpNo(s.empNo))),
    [staff]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return staff;
    return staff.filter(
      (s) =>
        String(s.empNo).toLowerCase().includes(term) ||
        String(s.name).toLowerCase().includes(term)
    );
  }, [staff, q]);

  /* ── Per-person edits ── */

  function toggleForm(person, formKey) {
    const has = (person.forms || []).includes(formKey);
    const forms = has
      ? person.forms.filter((f) => f !== formKey)
      : [...(person.forms || []), formKey];
    commit(upsertStaff(staff, { ...person, forms }), `✅ Updated ${person.name}.`);
  }

  function toggleActive(person) {
    commit(
      upsertStaff(staff, { ...person, active: person.active === false }),
      `✅ ${person.name} is now ${person.active === false ? "active" : "inactive"}.`
    );
  }

  function remove(person) {
    setConfirmRemove(null);
    commit(removeStaff(staff, person.empNo), `✅ Removed ${person.name}.`);
  }

  /* ── Import from the company directory ── */

  const importCandidates = useMemo(
    () => searchCompany(importQ, { branches: importBranches, exclude: takenNos }),
    [importQ, importBranches, takenNos]
  );

  function togglePick(empNo) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(empNo)) next.delete(empNo);
      else next.add(empNo);
      return next;
    });
  }

  function pickAllShown() {
    setPicked((prev) => {
      const next = new Set(prev);
      importCandidates.forEach((c) => next.add(c.empNo));
      return next;
    });
  }

  async function commitImport() {
    if (!picked.size) {
      setMsg("❌ Select at least one employee.");
      return;
    }
    if (!importForms.length) {
      setMsg("❌ Choose at least one form for the selected employees.");
      return;
    }
    let next = staff;
    let added = 0;
    COMPANY_DIRECTORY.forEach((d) => {
      if (!picked.has(d.empNo)) return;
      next = upsertStaff(next, {
        empNo: d.empNo,
        name: d.name,
        forms: importForms,
        active: true,
      });
      added++;
    });
    const ok = await commit(next, `✅ Added ${added} employee(s).`);
    if (ok) {
      setPicked(new Set());
      setImportOpen(false);
    }
  }

  /* ── Manual add (for someone missing from the company directory) ── */
  const [form, setForm] = useState({ empNo: "", name: "", editingNo: "" });
  const empNoRef = useRef(null);

  const resetForm = () => {
    setForm({ empNo: "", name: "", editingNo: "" });
  };

  async function submitManual() {
    const empNo = form.empNo.trim();
    const name = form.name.trim();
    if (!empNo || !name) {
      setMsg("❌ Employee number and name are both required.");
      return;
    }
    try {
      const existing = staff.find(
        (s) => normalizeEmpNo(s.empNo) === normalizeEmpNo(form.editingNo)
      );
      const next = form.editingNo
        ? renumberStaff(staff, form.editingNo, {
            ...existing,
            empNo,
            name,
          })
        : upsertStaff(staff, { empNo, name, forms: DEFAULT_FORMS, active: true });
      const ok = await commit(next, form.editingNo ? `✅ Updated ${name}.` : `✅ Added ${name}.`);
      if (ok) resetForm();
    } catch (e) {
      setMsg(`❌ ${e.message || e}`);
    }
  }

  function startEdit(person) {
    setForm({ empNo: person.empNo, name: person.name, editingNo: person.empNo });
    setMsg("");
    empNoRef.current?.focus();
  }

  /* ── CSV ── */

  function exportCsv() {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = ["employee_no,employee_name,forms,active"];
    staff.forEach((s) => {
      lines.push(
        [esc(s.empNo), esc(s.name), esc((s.forms || []).join("|")), esc(s.active === false ? "no" : "yes")].join(",")
      );
    });
    const blob = new Blob([`﻿${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff_directory_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMsg("⏳ Reading…");
    try {
      const text = await file.text();
      const rows = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .filter((l) => !/^"?employee[_ ]?no/i.test(l));

      let next = staff;
      let added = 0;
      let skipped = 0;
      for (const line of rows) {
        const cells = (line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || [])
          .map((p) => p.replace(/,$/, "").trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
        const [empNo, name, formsRaw, activeRaw] = cells;
        if (!empNo || !name) { skipped++; continue; }
        const forms = formsRaw ? formsRaw.split("|").filter(Boolean) : DEFAULT_FORMS;
        next = upsertStaff(next, {
          empNo,
          name,
          forms,
          active: !/^no$/i.test(activeRaw || ""),
        });
        added++;
      }
      await commit(next, `✅ Imported ${added} employee(s)${skipped ? ` · ❌ ${skipped} skipped` : ""}.`);
    } catch (e) {
      setMsg(`❌ Import failed: ${e.message || e}`);
    } finally {
      if (event.target) event.target.value = "";
    }
  }

  const branchOptions = useMemo(() => companyBranches(), []);

  return (
    <div style={ui.page}>
      <PageHeader
        eyebrow="Data Tools"
        title="Staff Directory"
        subtitle="Who appears on the quality forms, and where. Employees are imported from the company register, so numbers are never typed by hand — the number and the name always match."
        actions={
          <>
            <Button tone="primary" onClick={() => setImportOpen((v) => !v)} disabled={busy}>
              {importOpen ? "✕ Close import" : "👥 Import employees"}
            </Button>
            <Button tone="secondary" onClick={() => importRef.current?.click()} disabled={busy}>
              ⬆ CSV
            </Button>
            <Button tone="secondary" onClick={exportCsv} disabled={!staff.length}>
              ⬇ CSV
            </Button>
            <Button tone="muted" onClick={reload} disabled={loading || busy}>
              {loading ? "⏳" : "↻"}
            </Button>
          </>
        }
      />

      <input
        ref={importRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        style={{ display: "none" }}
        onChange={importCsv}
      />

      <StatusMessage message={msg} />

      {!online && !loading && (
        <StatusMessage message="⚠️ Could not reach the server — showing the last cached list. Changes will not save until the connection is back." />
      )}

      {/* ═══ Import panel ═══ */}
      {importOpen && (
        <div style={ui.card}>
          <h3 style={{ margin: "0 0 4px", fontWeight: 1000 }}>Import from the company register</h3>
          <p style={{ margin: "0 0 14px", color: "#64748b", fontWeight: 750, lineHeight: 1.6 }}>
            {COMPANY_DIRECTORY.length} employees on file. The branch shown is the one recorded in
            the company register — it is not always up to date after a transfer, so treat it as a
            filter, not as the truth. What you set here is what the forms read.
          </p>

          <div style={{ marginBottom: 12 }}>
            <span style={ui.label}>Filter by company branch</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {branchOptions.map(({ branch, count }) => {
                const on = importBranches.includes(branch);
                return (
                  <button
                    key={branch}
                    type="button"
                    style={chip(on)}
                    onClick={() =>
                      setImportBranches((prev) =>
                        on ? prev.filter((b) => b !== branch) : [...prev, branch]
                      )
                    }
                  >
                    {branch} · {count}
                  </button>
                );
              })}
              {importBranches.length > 0 && (
                <button type="button" style={chip(false)} onClick={() => setImportBranches([])}>
                  ✕ clear filter
                </button>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <span style={ui.label}>These employees will appear automatically in</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STAFF_FORMS.map((f) => {
                const on = importForms.includes(f.key);
                return (
                  <button
                    key={f.key}
                    type="button"
                    style={chip(on)}
                    title={f.autoFills ? "Pre-fills a row per employee" : "Suggested in the picker"}
                    onClick={() =>
                      setImportForms((prev) =>
                        on ? prev.filter((k) => k !== f.key) : [...prev, f.key]
                      )
                    }
                  >
                    {f.branch} · {f.en}{f.autoFills ? " ⚡" : ""}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={ui.toolbar}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <strong style={{ fontWeight: 1000 }}>
                {picked.size} selected · {importCandidates.length} shown
              </strong>
              <Button tone="secondary" onClick={pickAllShown} disabled={!importCandidates.length}>
                Select all shown
              </Button>
              {picked.size > 0 && (
                <Button tone="muted" onClick={() => setPicked(new Set())}>Clear</Button>
              )}
            </div>
            <input
              style={{ ...ui.input, width: 280 }}
              value={importQ}
              onChange={(e) => setImportQ(e.target.value)}
              placeholder="Search number or name…"
            />
          </div>

          <div style={{ ...ui.tableWrap, maxHeight: 380 }}>
            <table style={ui.table}>
              <thead>
                <tr>
                  <th style={{ ...ui.th, width: 46 }} />
                  <th style={{ ...ui.th, width: 110 }}>No</th>
                  <th style={ui.th}>Name</th>
                  <th style={{ ...ui.th, width: 260 }}>Branch on file</th>
                </tr>
              </thead>
              <tbody>
                {importCandidates.map((d) => (
                  <tr
                    key={d.empNo}
                    onClick={() => togglePick(d.empNo)}
                    style={{ cursor: "pointer", background: picked.has(d.empNo) ? "#f0fdfa" : "transparent" }}
                  >
                    <td style={{ ...ui.td, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={picked.has(d.empNo)}
                        onChange={() => togglePick(d.empNo)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: 17, height: 17, accentColor: "#0f766e" }}
                      />
                    </td>
                    <td style={{ ...ui.td, fontWeight: 1000, fontVariantNumeric: "tabular-nums" }}>{d.empNo}</td>
                    <td style={ui.td}>{d.name}</td>
                    <td style={{ ...ui.td, color: "#94a3b8", fontSize: 12 }}>{d.branch || "—"}</td>
                  </tr>
                ))}
                {!importCandidates.length && (
                  <tr>
                    <td colSpan={4} style={{ ...ui.td, textAlign: "center", color: "#64748b" }}>
                      Everyone matching this filter is already in the directory.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <Button tone="primary" onClick={commitImport} disabled={busy || !picked.size}>
              ➕ Add {picked.size || ""} to the directory
            </Button>
          </div>
        </div>
      )}

      {/* ═══ Manual add / edit ═══ */}
      <div style={ui.subtleCard}>
        <span style={{ ...ui.label, marginBottom: 10 }}>
          {form.editingNo ? "Edit employee" : "Add someone not in the company register"}
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <label style={ui.label} htmlFor="staff-empno">Employee No</label>
            <input
              id="staff-empno"
              ref={empNoRef}
              style={ui.input}
              value={form.empNo}
              onChange={(e) => setForm((f) => ({ ...f, empNo: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && submitManual()}
              placeholder="e.g. 1042"
            />
          </div>
          <div>
            <label style={ui.label} htmlFor="staff-name">Employee Name</label>
            <input
              id="staff-name"
              style={ui.input}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && submitManual()}
              placeholder="Full name"
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button tone="primary" onClick={submitManual} disabled={busy}>
              {form.editingNo ? "💾 Save" : "➕ Add"}
            </Button>
            {form.editingNo && <Button tone="muted" onClick={resetForm} disabled={busy}>Cancel</Button>}
          </div>
        </div>
      </div>

      {/* ═══ The directory ═══ */}
      <div style={ui.card}>
        <div style={ui.toolbar}>
          <strong style={{ fontWeight: 1000 }}>
            {filtered.length} of {staff.length} employee{staff.length === 1 ? "" : "s"}
          </strong>
          <input
            style={{ ...ui.input, width: 280 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search number or name…"
          />
        </div>

        <div style={ui.tableWrap}>
          <table style={ui.table}>
            <thead>
              <tr>
                <th style={{ ...ui.th, width: 110 }}>No</th>
                <th style={ui.th}>Name</th>
                <th style={{ ...ui.th, width: 380 }}>Appears automatically in</th>
                <th style={{ ...ui.th, width: 220, textAlign: "end" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.empNo} style={{ opacity: s.active === false ? 0.5 : 1 }}>
                  <td style={{ ...ui.td, fontWeight: 1000, fontVariantNumeric: "tabular-nums" }}>{s.empNo}</td>
                  <td style={ui.td}>
                    {s.name}
                    {s.active === false && (
                      <span style={{ marginInlineStart: 8, fontSize: 11, color: "#94a3b8", fontWeight: 900 }}>
                        INACTIVE
                      </span>
                    )}
                  </td>
                  <td style={ui.td}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {STAFF_FORMS.map((f) => {
                        const on = (s.forms || []).includes(f.key);
                        return (
                          <button
                            key={f.key}
                            type="button"
                            style={chip(on)}
                            disabled={busy}
                            title={
                              f.autoFills
                                ? `${f.en} — pre-fills a row for this employee`
                                : `${f.en} — suggested in the picker`
                            }
                            onClick={() => toggleForm(s, f.key)}
                          >
                            {f.en}{f.autoFills ? " ⚡" : ""}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ ...ui.td, textAlign: "end" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <Button tone="secondary" onClick={() => startEdit(s)} disabled={busy}>Edit</Button>
                      <Button tone="muted" onClick={() => toggleActive(s)} disabled={busy}>
                        {s.active === false ? "Activate" : "Deactivate"}
                      </Button>
                      <Button
                        tone="danger"
                        onClick={() => setConfirmRemove(s)}
                        disabled={busy}
                        data-delete-action="true"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={4} style={{ ...ui.td, textAlign: "center", color: "#64748b" }}>
                    {loading
                      ? "Loading…"
                      : staff.length
                        ? "No employee matches this search."
                        : "No employees yet — use “Import employees” to pull them from the company register."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p style={{ margin: "12px 0 0", color: "#64748b", fontWeight: 750, fontSize: 12.5, lineHeight: 1.6 }}>
          ⚡ = the form pre-fills a row for every assigned employee. The others suggest the person in
          a picker. Deactivating keeps someone in the history without listing them on new forms.
        </p>
      </div>

      <ConfirmModal
        open={!!confirmRemove}
        title="Remove employee?"
        body={
          confirmRemove
            ? `${confirmRemove.name} (${confirmRemove.empNo}) will no longer appear on the quality forms. Reports already saved keep the name they were saved with. If they have only left temporarily, use Deactivate instead.`
            : ""
        }
        confirmText="Remove"
        onConfirm={() => remove(confirmRemove)}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
