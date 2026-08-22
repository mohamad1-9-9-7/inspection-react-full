// src/pages/settings/StaffDirectoryTab.jsx
//
// 👥 سجل الموظفين — من هو على نماذج الجودة، وأين يظهر اسمه تلقائياً.
//
// Replaces the hardcoded `DEFAULT_NAMES` array that used to live inside
// PersonalHygieneTab.js. People come from the company register
// (pages/ohc/OHCUpload → EMPLOYEES), so number, name and job title are never
// typed by hand and never invented.
//
// A worker is put on specific SITE checklists — "Personal Hygiene" is not one
// form, every site keeps its own — see STAFF_FORMS in staffRegistry.js.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  COMPANY_DIRECTORY,
  QCS_COMPANY_BRANCHES,
  STAFF_FORMS,
  companyBranches,
  companyJobs,
  fetchStaff,
  formShortLabel,
  formsBySite,
  loadStaffCache,
  normalizeEmpNo,
  removeStaff,
  renumberStaff,
  saveStaffCache,
  saveStaffList,
  searchCompany,
  staffForm,
  upsertStaff,
} from "../monitor/branches/_shared/staffRegistry";
import FilterBar, { filterValues } from "./_shared/FilterBar";
import { Button, ConfirmModal, PageHeader, StatusMessage, ui } from "./_shared/SettingsUIKit";

/* ═════════════════════════════════════════════════════ tokens */

const T = {
  accent: "#0f766e",
  accentSoft: "#ecfdf5",
  ink: "#0f172a",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "rgba(15,23,42,0.10)",
  lineStrong: "rgba(15,23,42,0.16)",
  surface: "#ffffff",
  raised: "#f8fafc",
  warn: "#b45309",
  warnSoft: "#fffbeb",
  radius: 10,
};

const rowBtn = {
  minHeight: 30,
  padding: "4px 11px",
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const fieldBase = {
  minHeight: 40,
  padding: "8px 12px",
  borderRadius: T.radius,
  border: `1px solid ${T.lineStrong}`,
  background: T.surface,
  color: T.ink,
  fontWeight: 800,
  fontSize: 13.5,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const pill = (on, tone = T.accent) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 11px",
  borderRadius: 999,
  fontSize: 11.5,
  fontWeight: 950,
  lineHeight: 1.5,
  whiteSpace: "nowrap",
  cursor: "pointer",
  border: `1px solid ${on ? tone : T.lineStrong}`,
  background: on ? tone : T.surface,
  color: on ? "#fff" : T.faint,
});

/* ═════════════════════════════════════════════════════ pieces */

function Stat({ label, value, tone, hint }) {
  return (
    <div
      style={{
        flex: "1 1 120px",
        border: `1px solid ${T.line}`,
        borderRadius: T.radius,
        padding: "10px 14px",
        background: T.raised,
      }}
      title={hint || ""}
    >
      <div style={{ fontSize: 22, fontWeight: 1000, color: tone, lineHeight: 1.1 }}>{value}</div>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 950,
          color: T.muted,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginTop: 3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function SectionTitle({ children, hint }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontWeight: 1000, fontSize: 15.5, color: T.ink }}>{children}</h3>
      {hint && (
        <p style={{ margin: "5px 0 0", color: T.muted, fontWeight: 750, fontSize: 12.5, lineHeight: 1.6 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Grouped form checkboxes. With one checklist per site the list is long, so it
 * is grouped by site and never rendered as one flat wall of chips.
 */
function FormPicker({ selected, onToggle, onSetAll, compact }) {
  return (
    <div style={{ display: "grid", gap: compact ? 8 : 10 }}>
      {formsBySite().map(({ site, siteAr, forms }) => {
        const allOn = forms.every((f) => selected.includes(f.key));
        return (
          <div key={site}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 5,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 950,
                  color: T.faint,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {site} · {siteAr}
              </span>
              {onSetAll && (
                <button
                  type="button"
                  onClick={() => onSetAll(forms.map((f) => f.key), !allOn)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: T.accent,
                    fontWeight: 950,
                    fontSize: 10,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {allOn ? "none" : "all"}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {forms.map((f) => {
                const on = selected.includes(f.key);
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => onToggle(f.key)}
                    title={
                      (f.autoFills ? "Pre-fills a row per employee. " : "Suggested while typing. ") +
                      (f.wired ? "Connected." : "Not connected to this screen yet — the assignment is stored and takes effect when it is.")
                    }
                    style={{
                      ...pill(on),
                      opacity: f.wired ? 1 : 0.72,
                      borderStyle: f.wired ? "solid" : "dashed",
                    }}
                  >
                    {f.en}
                    {f.autoFills ? " ⚡" : ""}
                    {!f.wired && <span style={{ fontSize: 9, opacity: 0.85 }}>soon</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Compact cell: the badges a person carries, click to edit in a popover. */
function FormsCell({ person, onToggle, busy }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const forms = person.forms || [];
  const shown = forms.slice(0, 2);
  const extra = forms.length - shown.length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          flexWrap: "wrap",
          width: "100%",
          border: `1px dashed ${forms.length ? "transparent" : T.lineStrong}`,
          background: "transparent",
          borderRadius: 8,
          padding: "3px 5px",
          cursor: "pointer",
          textAlign: "start",
          fontFamily: "inherit",
        }}
      >
        {shown.map((k) => {
          const f = staffForm(k);
          return (
            <span
              key={k}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 950,
                whiteSpace: "nowrap",
                border: `1px solid ${f?.wired ? T.accent : T.lineStrong}`,
                background: f?.wired ? T.accentSoft : T.raised,
                color: f?.wired ? T.accent : T.muted,
              }}
            >
              {formShortLabel(k)}
              {f?.autoFills ? " ⚡" : ""}
            </span>
          );
        })}
        {extra > 0 && (
          <span style={{ fontSize: 10.5, fontWeight: 950, color: T.faint }}>+{extra}</span>
        )}
        {!forms.length && (
          <span style={{ fontSize: 11, fontWeight: 850, color: T.faint }}>+ assign…</span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 65,
            top: "calc(100% + 5px)",
            insetInlineStart: 0,
            width: 340,
            background: T.surface,
            border: `1px solid ${T.lineStrong}`,
            borderRadius: T.radius,
            boxShadow: "0 18px 44px rgba(15,23,42,0.20)",
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 1000, fontSize: 12.5, marginBottom: 10, color: T.ink }}>
            {person.name} appears in
          </div>
          <FormPicker
            compact
            selected={forms}
            onToggle={(key) => onToggle(person, key)}
            onSetAll={(keys, on) => keys.forEach((k) => {
              const has = forms.includes(k);
              if (has !== on) onToggle(person, k);
            })}
          />
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════ page */

export default function StaffDirectoryTab() {
  const [staff, setStaff] = useState(() => loadStaffCache());
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(null);

  /* Directory criteria */
  const [q, setQ] = useState("");
  const [dirFilters, setDirFilters] = useState([]);

  /* Picker criteria */
  const [importOpen, setImportOpen] = useState(false);
  const [importQ, setImportQ] = useState("");
  const [importFilters, setImportFilters] = useState(() =>
    QCS_COMPANY_BRANCHES.length ? [{ field: "branch", values: QCS_COMPANY_BRANCHES }] : []
  );
  const [picked, setPicked] = useState(() => new Set());
  /* Deliberately empty: nobody goes on a form until it is ticked. */
  const [importForms, setImportForms] = useState([]);

  const csvRef = useRef(null);

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

  const autoOpened = useRef(false);
  useEffect(() => {
    if (loading || autoOpened.current) return;
    autoOpened.current = true;
    if (!staff.length) setImportOpen(true);
  }, [loading, staff.length]);

  /* Change the list, push the whole thing, roll back on failure so the screen
     never shows a save that did not land. */
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

  const takenNos = useMemo(() => new Set(staff.map((s) => normalizeEmpNo(s.empNo))), [staff]);

  /* ── Counts ── */

  const activeCount = useMemo(() => staff.filter((s) => s.active !== false).length, [staff]);

  const formCounts = useMemo(() => {
    const counts = {};
    STAFF_FORMS.forEach((f) => {
      counts[f.key] = staff.filter(
        (s) => s.active !== false && (s.forms || []).includes(f.key)
      ).length;
    });
    return counts;
  }, [staff]);

  const assignedCount = useMemo(
    () => staff.filter((s) => (s.forms || []).length > 0).length,
    [staff]
  );

  /* ── Directory filtering ── */

  const dirFields = useMemo(
    () => [
      {
        key: "form",
        label: "Form",
        icon: "📋",
        options: STAFF_FORMS.map((f) => ({
          value: f.key,
          label: `${f.site} · ${f.en}${f.autoFills ? " ⚡" : ""}`,
          count: formCounts[f.key] || 0,
        })),
      },
      {
        key: "site",
        label: "Site",
        icon: "🏭",
        options: [...new Set(STAFF_FORMS.map((f) => f.site))].map((site) => ({
          value: site,
          label: site,
          count: staff.filter((s) =>
            (s.forms || []).some((k) => staffForm(k)?.site === site)
          ).length,
        })),
      },
      {
        key: "job",
        label: "Job",
        icon: "🧰",
        options: [...new Set(staff.map((s) => s.job).filter(Boolean))].map((job) => ({
          value: job,
          label: job,
          count: staff.filter((s) => s.job === job).length,
        })),
      },
      {
        key: "status",
        label: "Status",
        icon: "🔆",
        options: [
          { value: "active", label: "Active", count: activeCount },
          { value: "inactive", label: "Inactive", count: staff.length - activeCount },
          { value: "unassigned", label: "On no form", count: staff.length - assignedCount },
        ],
      },
    ],
    [staff, formCounts, activeCount, assignedCount]
  );

  const filtered = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const wantForms = filterValues(dirFilters, "form");
    const wantSites = filterValues(dirFilters, "site");
    const wantJobs = filterValues(dirFilters, "job");
    const wantStatus = filterValues(dirFilters, "status");

    return staff.filter((s) => {
      const forms = s.forms || [];
      if (wantForms.length && !wantForms.some((k) => forms.includes(k))) return false;
      if (wantSites.length && !forms.some((k) => wantSites.includes(staffForm(k)?.site))) return false;
      if (wantJobs.length && !wantJobs.includes(s.job)) return false;
      if (wantStatus.length) {
        const ok = wantStatus.some((st) =>
          st === "active" ? s.active !== false
            : st === "inactive" ? s.active === false
              : forms.length === 0
        );
        if (!ok) return false;
      }
      if (terms.length) {
        const hay = `${s.empNo} ${s.name} ${s.job || ""}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [staff, q, dirFilters]);

  const dirCriteria = dirFilters.length > 0 || !!q.trim();

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

  /** Applies one form to everything the filter currently shows. */
  function bulkForm(formKey, on) {
    let next = staff;
    filtered.forEach((s) => {
      const has = (s.forms || []).includes(formKey);
      if (has === on) return;
      const forms = on
        ? [...(s.forms || []), formKey]
        : (s.forms || []).filter((f) => f !== formKey);
      next = upsertStaff(next, { ...s, forms });
    });
    if (next === staff) return;
    commit(
      next,
      `✅ ${on ? "Added" : "Removed"} ${filtered.length} employee(s) ${on ? "to" : "from"} ${formShortLabel(formKey)}.`
    );
  }

  const [bulkOpen, setBulkOpen] = useState(false);

  /* ── Picker ── */

  const importFields = useMemo(() => {
    const branchSel = filterValues(importFilters, "branch");
    return [
      {
        key: "branch",
        label: "Branch",
        icon: "🏢",
        options: companyBranches().map(({ branch, count }) => ({
          value: branch,
          label: branch,
          count,
        })),
      },
      {
        key: "job",
        label: "Job",
        icon: "🧰",
        options: companyJobs(branchSel).map(({ job, count }) => ({
          value: job,
          label: job,
          count,
        })),
      },
    ];
  }, [importFilters]);

  const importCandidates = useMemo(
    () =>
      searchCompany(importQ, {
        branches: filterValues(importFilters, "branch"),
        jobs: filterValues(importFilters, "job"),
        exclude: takenNos,
      }),
    [importQ, importFilters, takenNos]
  );

  const importPresets = useMemo(() => {
    const jobsFor = (re) =>
      companyJobs().filter((j) => re.test(j.job)).map((j) => j.job);
    const qcs = [{ field: "branch", values: QCS_COMPANY_BRANCHES }];
    const sel = JSON.stringify(importFilters);
    const eq = (f) => JSON.stringify(f) === sel;
    return [
      {
        label: "QCS site",
        filters: qcs,
        on: eq(qcs),
        count: searchCompany("", { branches: QCS_COMPANY_BRANCHES, exclude: takenNos }).length,
      },
      {
        label: "Butchery roles",
        filters: [{ field: "job", values: jobsFor(/butcher/i) }],
        on: eq([{ field: "job", values: jobsFor(/butcher/i) }]),
      },
      {
        label: "Kitchen roles",
        filters: [{ field: "job", values: jobsFor(/chef|kitchen|waiter|grill|shawerma/i) }],
        on: eq([{ field: "job", values: jobsFor(/chef|kitchen|waiter|grill|shawerma/i) }]),
      },
    ];
  }, [importFilters, takenNos]);

  function togglePick(empNo) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(empNo)) next.delete(empNo);
      else next.add(empNo);
      return next;
    });
  }

  const allShownPicked =
    importCandidates.length > 0 && importCandidates.every((c) => picked.has(c.empNo));

  function toggleAllShown() {
    setPicked((prev) => {
      const next = new Set(prev);
      if (allShownPicked) importCandidates.forEach((c) => next.delete(c.empNo));
      else importCandidates.forEach((c) => next.add(c.empNo));
      return next;
    });
  }

  async function commitImport() {
    if (!picked.size || !importForms.length) return;
    let next = staff;
    let added = 0;
    COMPANY_DIRECTORY.forEach((d) => {
      if (!picked.has(d.empNo)) return;
      next = upsertStaff(next, {
        empNo: d.empNo,
        name: d.name,
        job: d.job,
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

  /* ── Manual add / edit ── */

  const [form, setForm] = useState({ empNo: "", name: "", job: "", forms: [], editingNo: "" });
  const [manualOpen, setManualOpen] = useState(false);
  const empNoRef = useRef(null);

  const resetForm = () => setForm({ empNo: "", name: "", job: "", forms: [], editingNo: "" });

  async function submitManual() {
    const empNo = form.empNo.trim();
    const name = form.name.trim();
    if (!empNo || !name) {
      setMsg("❌ Employee number and name are both required.");
      return;
    }
    try {
      const existing = staff.find((s) => normalizeEmpNo(s.empNo) === normalizeEmpNo(form.editingNo));
      const payload = { empNo, name, job: form.job.trim(), forms: form.forms, active: true };
      const next = form.editingNo
        ? renumberStaff(staff, form.editingNo, { ...existing, ...payload })
        : upsertStaff(staff, payload);
      const ok = await commit(next, form.editingNo ? `✅ Updated ${name}.` : `✅ Added ${name}.`);
      if (ok) { resetForm(); setManualOpen(false); }
    } catch (e) {
      setMsg(`❌ ${e.message || e}`);
    }
  }

  function startEdit(person) {
    setForm({
      empNo: person.empNo,
      name: person.name,
      job: person.job || "",
      forms: person.forms || [],
      editingNo: person.empNo,
    });
    setManualOpen(true);
    setMsg("");
    setTimeout(() => empNoRef.current?.focus(), 0);
  }

  /* ── CSV ── */

  function exportCsv() {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = ["employee_no,employee_name,job_title,forms,active"];
    staff.forEach((s) => {
      lines.push(
        [esc(s.empNo), esc(s.name), esc(s.job), esc((s.forms || []).join("|")), esc(s.active === false ? "no" : "yes")].join(",")
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
      const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
        .filter((l) => !/^"?employee[_ ]?no/i.test(l));

      let next = staff;
      let added = 0;
      let skipped = 0;
      for (const line of rows) {
        const cells = (line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).map((p) =>
          p.replace(/,$/, "").trim().replace(/^"|"$/g, "").replace(/""/g, '"')
        );
        const [empNo, name, job, formsRaw, activeRaw] = cells;
        if (!empNo || !name) { skipped++; continue; }
        next = upsertStaff(next, {
          empNo,
          name,
          job: job || "",
          forms: formsRaw ? formsRaw.split("|").filter(Boolean) : [],
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

  /* ═════════════════════════════════════════════════ render */

  const liveForms = STAFF_FORMS.filter((f) => f.wired);

  return (
    <div style={ui.page}>
      <PageHeader
        eyebrow="Data Tools"
        title="Staff Directory"
        subtitle="Who appears on the quality forms, and on which site's sheet. People come from the company register, so number, name and job title always match — nothing is typed by hand."
        actions={
          <>
            <Button tone="primary" onClick={() => setImportOpen((v) => !v)} disabled={busy}>
              {importOpen ? "✕ Close picker" : "👥 Add employees"}
            </Button>
            <Button tone="secondary" onClick={() => csvRef.current?.click()} disabled={busy}>
              ⬆ Import CSV
            </Button>
            <Button tone="secondary" onClick={exportCsv} disabled={!staff.length}>
              ⬇ Export CSV
            </Button>
            <Button tone="muted" onClick={reload} disabled={loading || busy}>
              {loading ? "⏳" : "↻ Refresh"}
            </Button>
          </>
        }
      />

      <input ref={csvRef} type="file" accept=".csv,text/csv,text/plain" style={{ display: "none" }} onChange={importCsv} />

      <StatusMessage message={msg} />

      {!online && !loading && (
        <StatusMessage message="⚠️ Could not reach the server — showing the last cached list. Changes will not save until the connection is back." />
      )}

      {/* ═══════════ Picker ═══════════ */}
      {importOpen && (
        <div style={{ ...ui.card, padding: 0, overflow: "visible" }}>
          <div
            style={{
              padding: "16px 18px",
              background: "linear-gradient(135deg,#0f766e,#115e59)",
              color: "#fff",
              borderRadius: "8px 8px 0 0",
            }}
          >
            <h3 style={{ margin: 0, fontWeight: 1000, fontSize: 16 }}>Add from the company register</h3>
            <p style={{ margin: "6px 0 0", fontSize: 12.5, fontWeight: 750, opacity: 0.9, lineHeight: 1.6 }}>
              {COMPANY_DIRECTORY.length} employees on file. Number, name and job title are copied
              across. Branch and job come from the company register and are not always updated after
              a transfer or promotion — the branch is only a filter, the job stays editable here.
            </p>
          </div>

          <div style={{ padding: 18 }}>
            <FilterBar
              fields={importFields}
              filters={importFilters}
              onFiltersChange={setImportFilters}
              query={importQ}
              onQueryChange={setImportQ}
              placeholder="Filter by branch or job, or search a name or number…"
              resultCount={importCandidates.length}
              resultNoun="available"
              presets={importPresets}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                margin: "14px 0 8px",
              }}
            >
              <strong style={{ fontWeight: 1000, fontSize: 13 }}>
                {picked.size ? `${picked.size} selected` : "Nothing selected yet"}
              </strong>
              <button
                type="button"
                onClick={toggleAllShown}
                disabled={!importCandidates.length}
                style={{ ...pill(allShownPicked), color: allShownPicked ? "#fff" : T.accent, borderColor: T.accent }}
              >
                {allShownPicked ? "✓ All shown selected" : `Select all ${importCandidates.length}`}
              </button>
            </div>

            <div style={{ ...ui.tableWrap, maxHeight: 340 }}>
              <table style={ui.table}>
                <thead>
                  <tr>
                    <th style={{ ...ui.th, width: 44 }} />
                    <th style={{ ...ui.th, width: 84 }}>No</th>
                    <th style={ui.th}>Name</th>
                    <th style={{ ...ui.th, width: 176 }}>Job title</th>
                    <th style={{ ...ui.th, width: 200 }}>Branch on file</th>
                  </tr>
                </thead>
                <tbody>
                  {importCandidates.map((d) => {
                    const on = picked.has(d.empNo);
                    return (
                      <tr
                        key={d.empNo}
                        onClick={() => togglePick(d.empNo)}
                        style={{ cursor: "pointer", background: on ? T.accentSoft : "transparent" }}
                      >
                        <td style={{ ...ui.td, textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => togglePick(d.empNo)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: 16, height: 16, accentColor: T.accent }}
                          />
                        </td>
                        <td style={{ ...ui.td, fontWeight: 1000, fontVariantNumeric: "tabular-nums" }}>{d.empNo}</td>
                        <td style={ui.td}>{d.name}</td>
                        <td style={{ ...ui.td, fontSize: 12.5 }}>{d.job || "—"}</td>
                        <td style={{ ...ui.td, color: T.faint, fontSize: 11.5 }}>{d.branch || "—"}</td>
                      </tr>
                    );
                  })}
                  {!importCandidates.length && (
                    <tr>
                      <td colSpan={5} style={{ ...ui.td, textAlign: "center", color: T.muted, padding: 26 }}>
                        {importFilters.length || importQ
                          ? "No one matches these filters — widen them or clear them."
                          : "Everyone in the company register is already in the directory."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: T.radius,
                border: `1px solid ${picked.size ? T.accent : T.line}`,
                background: picked.size ? T.accentSoft : T.raised,
              }}
            >
              <div style={{ ...ui.label, marginBottom: 10 }}>
                Put them on which sheet?
              </div>
              <FormPicker
                selected={importForms}
                onToggle={(key) =>
                  setImportForms((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
                }
                onSetAll={(keys, on) =>
                  setImportForms((prev) =>
                    on ? [...new Set([...prev, ...keys])] : prev.filter((k) => !keys.includes(k))
                  )
                }
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: `1px solid ${T.line}`,
                }}
              >
                <span style={{ color: T.muted, fontWeight: 850, fontSize: 12.5 }}>
                  {!picked.size
                    ? "Tick the employees you want above."
                    : !importForms.length
                      ? "⚠️ Choose at least one sheet — otherwise they are added but appear nowhere."
                      : `${picked.size} employee(s) → ${importForms.length} sheet(s).`}
                </span>
                <Button tone="primary" onClick={commitImport} disabled={busy || !picked.size || !importForms.length}>
                  ➕ Add {picked.size || ""} to the directory
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Manual add / edit ═══════════ */}
      <div style={ui.card}>
        <button
          type="button"
          onClick={() => { setManualOpen((v) => !v); if (manualOpen) resetForm(); }}
          style={{
            display: "flex", alignItems: "center", gap: 9, width: "100%",
            border: "none", background: "transparent", padding: 0, cursor: "pointer",
            fontWeight: 1000, fontSize: 14, color: T.ink, textAlign: "start",
          }}
        >
          <span aria-hidden="true" style={{ color: T.faint, fontSize: 11 }}>{manualOpen ? "▾" : "▸"}</span>
          {form.editingNo ? `Editing ${form.name}` : "Add someone not in the company register"}
          <span style={{ marginInlineStart: "auto", color: T.faint, fontWeight: 800, fontSize: 12 }}>
            {manualOpen ? "" : "optional"}
          </span>
        </button>

        {manualOpen && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr", gap: 12, marginTop: 14 }}>
              <div>
                <label style={ui.label} htmlFor="staff-empno">Employee No</label>
                <input
                  id="staff-empno" ref={empNoRef} style={{ ...fieldBase, width: "100%" }}
                  value={form.empNo}
                  onChange={(e) => setForm((f) => ({ ...f, empNo: e.target.value }))}
                  placeholder="e.g. 1042"
                />
              </div>
              <div>
                <label style={ui.label} htmlFor="staff-name">Employee Name</label>
                <input
                  id="staff-name" style={{ ...fieldBase, width: "100%" }}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label style={ui.label} htmlFor="staff-job">Job Title</label>
                <input
                  id="staff-job" list="staff-job-options" style={{ ...fieldBase, width: "100%" }}
                  value={form.job}
                  onChange={(e) => setForm((f) => ({ ...f, job: e.target.value }))}
                  placeholder="e.g. Butcher"
                />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ ...ui.label, marginBottom: 10 }}>Appears automatically in</div>
              <FormPicker
                selected={form.forms}
                onToggle={(key) =>
                  setForm((f) => ({
                    ...f,
                    forms: f.forms.includes(key) ? f.forms.filter((k) => k !== key) : [...f.forms, key],
                  }))
                }
                onSetAll={(keys, on) =>
                  setForm((f) => ({
                    ...f,
                    forms: on ? [...new Set([...f.forms, ...keys])] : f.forms.filter((k) => !keys.includes(k)),
                  }))
                }
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Button tone="primary" onClick={submitManual} disabled={busy}>
                {form.editingNo ? "💾 Save" : "➕ Add"}
              </Button>
              <Button tone="muted" onClick={() => { resetForm(); setManualOpen(false); }} disabled={busy}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>

      <datalist id="staff-job-options">
        {companyJobs().map((j) => <option key={j.job} value={j.job} />)}
      </datalist>

      {/* ═══════════ Directory ═══════════ */}
      <div style={ui.card}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <Stat label="In the directory" value={staff.length} tone={T.ink} />
          <Stat label="Active" value={activeCount} tone={T.accent} hint="Listed on new forms" />
          <Stat
            label="On no sheet"
            value={staff.length - assignedCount}
            tone={staff.length - assignedCount ? T.warn : T.faint}
            hint="Added but not assigned to any form — they appear nowhere"
          />
          {liveForms.map((f) => (
            <Stat
              key={f.key}
              label={`${f.site} ${f.en.replace("Personal Hygiene", "Hygiene").replace("Return to Work", "Return")}`}
              value={formCounts[f.key] || 0}
              tone={f.autoFills ? T.warn : "#475569"}
              hint={f.autoFills ? "Pre-fills a row per employee" : "Suggested while typing"}
            />
          ))}
        </div>

        <SectionTitle hint="Each site keeps its own Personal Hygiene sheet — click a person's badges to choose which ones they belong to. Changes save immediately.">
          Directory
        </SectionTitle>

        <FilterBar
          fields={dirFields}
          filters={dirFilters}
          onFiltersChange={setDirFilters}
          query={q}
          onQueryChange={setQ}
          placeholder="Filter by form, site, job or status — or search a name or number…"
          resultCount={filtered.length}
          resultNoun={`of ${staff.length}`}
        />

        {/* Bulk actions on the filtered set */}
        {dirCriteria && filtered.length > 0 && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: T.radius,
              background: T.accentSoft,
              border: `1px solid ${T.accent}`,
            }}
          >
            <button
              type="button"
              onClick={() => setBulkOpen((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                border: "none", background: "transparent", padding: 0, cursor: "pointer",
                fontWeight: 1000, fontSize: 12.5, color: T.accent, textAlign: "start",
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 10 }}>{bulkOpen ? "▾" : "▸"}</span>
              Apply a sheet to all {filtered.length} shown
            </button>

            {bulkOpen && (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {formsBySite().map(({ site, forms }) => (
                  <div key={site} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 10, fontWeight: 950, color: T.muted, minWidth: 78,
                        textTransform: "uppercase", letterSpacing: "0.05em",
                      }}
                    >
                      {site}
                    </span>
                    {forms.map((f) => (
                      <span key={f.key} style={{ display: "inline-flex", gap: 3 }}>
                        <button type="button" style={pill(false)} disabled={busy} onClick={() => bulkForm(f.key, true)}>
                          + {f.en.replace("Personal Hygiene", "Hygiene")}
                        </button>
                        <button
                          type="button"
                          style={{ ...pill(false), color: "#b91c1c", borderColor: "#fecaca" }}
                          disabled={busy}
                          onClick={() => bulkForm(f.key, false)}
                          title={`Remove all shown from ${formShortLabel(f.key)}`}
                        >
                          −
                        </button>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ ...ui.tableWrap, marginTop: 12, overflow: "visible" }}>
          <table style={ui.table}>
            <thead>
              <tr>
                <th style={{ ...ui.th, width: 70 }}>No</th>
                <th style={{ ...ui.th, minWidth: 210 }}>Name &amp; job</th>
                <th style={{ ...ui.th, minWidth: 260 }}>Appears automatically in</th>
                <th style={{ ...ui.th, width: 160, textAlign: "end" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.empNo} style={{ opacity: s.active === false ? 0.55 : 1 }}>
                  <td style={{ ...ui.td, fontWeight: 1000, fontVariantNumeric: "tabular-nums" }}>{s.empNo}</td>

                  <td style={ui.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                      <span>{s.name}</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleActive(s)}
                        title={
                          s.active === false
                            ? "Inactive — not listed on new forms. Click to reactivate."
                            : "Active. Click to take off new forms without deleting."
                        }
                        style={{
                          padding: "2px 9px", borderRadius: 999, fontSize: 10, fontWeight: 950,
                          letterSpacing: "0.04em", cursor: "pointer", whiteSpace: "nowrap",
                          border: `1px solid ${s.active === false ? "#fcd34d" : "#a7f3d0"}`,
                          background: s.active === false ? T.warnSoft : "#ecfdf5",
                          color: s.active === false ? T.warn : "#047857",
                        }}
                      >
                        {s.active === false ? "INACTIVE" : "ACTIVE"}
                      </button>
                    </div>
                    {s.job && (
                      <div style={{ color: T.faint, fontSize: 11.5, fontWeight: 800, marginTop: 2 }}>{s.job}</div>
                    )}
                  </td>

                  <td style={ui.td}>
                    <FormsCell person={s} onToggle={toggleForm} busy={busy} />
                  </td>

                  <td style={{ ...ui.td, textAlign: "end", whiteSpace: "nowrap" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <Button tone="secondary" style={rowBtn} onClick={() => startEdit(s)} disabled={busy}>Edit</Button>
                      <Button
                        tone="danger" style={rowBtn} onClick={() => setConfirmRemove(s)}
                        disabled={busy} data-delete-action="true"
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={4} style={{ ...ui.td, textAlign: "center", color: T.muted, padding: 30 }}>
                    {loading
                      ? "Loading…"
                      : !staff.length
                        ? "No employees yet — use “Add employees” to pick them from the company register."
                        : "No employee matches these filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p style={{ margin: "12px 0 0", color: T.muted, fontWeight: 750, fontSize: 12.5, lineHeight: 1.7 }}>
          ⚡ pre-fills a row for every assigned employee, every day — one sheet per site, so a worker
          belongs to their own site's checklist only. A <b>dashed “soon”</b> badge means that screen
          is not reading this directory yet; the assignment is stored and takes effect when it is.{" "}
          <b>ACTIVE / INACTIVE</b> keeps someone in the history but drops them off new forms.
          Reports already saved always keep the name and number they were saved with.
        </p>
      </div>

      <ConfirmModal
        open={!!confirmRemove}
        title="Remove employee?"
        body={
          confirmRemove
            ? `${confirmRemove.name} (${confirmRemove.empNo}) will no longer appear on the quality forms. Reports already saved keep the name they were saved with. If they have only left temporarily, use INACTIVE instead.`
            : ""
        }
        confirmText="Remove"
        onConfirm={() => remove(confirmRemove)}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
