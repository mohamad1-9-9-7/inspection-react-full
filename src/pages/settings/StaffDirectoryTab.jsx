// src/pages/settings/StaffDirectoryTab.jsx
//
// 👥 سجل الموظفين — من هو على نماذج الجودة، وأين يظهر اسمه تلقائياً.
//
// Replaces the hardcoded `DEFAULT_NAMES` array that used to live inside
// PersonalHygieneTab.js. People are imported from the company register
// (pages/ohc/OHCUpload → EMPLOYEES), so employee numbers and job titles are
// never typed by hand and never invented. Each person carries the list of forms
// they appear on automatically — QCS today, other branches as they get wired.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  COMPANY_DIRECTORY,
  DEFAULT_FORMS,
  QCS_COMPANY_BRANCHES,
  STAFF_FORMS,
  companyBranches,
  companyJobs,
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
  radius: 10,
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
  transition: "background .12s, border-color .12s, color .12s",
  border: `1px solid ${on ? tone : T.lineStrong}`,
  background: on ? tone : T.surface,
  color: on ? "#fff" : T.faint,
});

/* Row actions live in a fixed-width cell; without nowrap the shared Button
   wraps its label one character per line. */
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

/* ═════════════════════════════════════════════════════ pieces */

function Stat({ label, value, tone, hint }) {
  return (
    <div
      style={{
        flex: "1 1 130px",
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

/** Search box with a magnifier and a clear button. */
function SearchField({ value, onChange, placeholder, width = "100%" }) {
  return (
    <div style={{ position: "relative", width, flex: width === "100%" ? "1 1 220px" : undefined }}>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          insetInlineStart: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: T.faint,
          fontSize: 13,
          pointerEvents: "none",
        }}
      >
        🔍
      </span>
      <input
        style={{ ...fieldBase, width: "100%", paddingInlineStart: 34, paddingInlineEnd: value ? 32 : 12 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          style={{
            position: "absolute",
            insetInlineEnd: 8,
            top: "50%",
            transform: "translateY(-50%)",
            border: "none",
            background: "transparent",
            color: T.faint,
            fontWeight: 950,
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * Multi-select facet. A wall of 28 branch chips is unreadable, so the options
 * live behind one button: the label reports the current state, and the popover
 * carries its own search, counts, and select-all/clear.
 */
function Facet({ label, icon, options, selected, onChange, searchPlaceholder = "Search…", width = 210 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, q]);

  const active = selected.length > 0;
  const summary = !active
    ? `All ${label.toLowerCase()}`
    : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label || `1 ${label.toLowerCase()}`
      : `${selected.length} ${label.toLowerCase()}`;

  const toggle = (value) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <div ref={boxRef} style={{ position: "relative", width }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          ...fieldBase,
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          textAlign: "start",
          borderColor: active ? T.accent : T.lineStrong,
          background: active ? T.accentSoft : T.surface,
          color: active ? T.accent : T.ink,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 13 }}>{icon}</span>
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 12.5,
          }}
        >
          {summary}
        </span>
        <span aria-hidden="true" style={{ color: T.faint, fontSize: 10 }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 60,
            top: "calc(100% + 6px)",
            insetInlineStart: 0,
            width: Math.max(width, 280),
            background: T.surface,
            border: `1px solid ${T.lineStrong}`,
            borderRadius: T.radius,
            boxShadow: "0 18px 44px rgba(15,23,42,0.18)",
            padding: 10,
          }}
        >
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            style={{ ...fieldBase, width: "100%", minHeight: 34, fontSize: 12.5, marginBottom: 8 }}
          />

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => onChange(shown.map((o) => o.value))}
              style={{ ...pill(false), color: T.accent, borderColor: T.accent }}
            >
              Select shown
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              style={{ ...pill(false) }}
              disabled={!active}
            >
              Clear
            </button>
          </div>

          <div style={{ maxHeight: 260, overflowY: "auto", display: "grid", gap: 2 }}>
            {shown.map((o) => {
              const on = selected.includes(o.value);
              return (
                <label
                  key={o.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "6px 8px",
                    borderRadius: 7,
                    cursor: "pointer",
                    background: on ? T.accentSoft : "transparent",
                    fontWeight: 800,
                    fontSize: 12.5,
                    color: T.ink,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(o.value)}
                    style={{ width: 15, height: 15, accentColor: T.accent }}
                  />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {o.label}
                  </span>
                  {o.count != null && (
                    <span style={{ color: T.faint, fontWeight: 950, fontSize: 11 }}>{o.count}</span>
                  )}
                </label>
              );
            })}
            {!shown.length && (
              <div style={{ padding: 12, textAlign: "center", color: T.faint, fontWeight: 800, fontSize: 12.5 }}>
                Nothing matches “{q}”.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Segmented control — clearer than a dropdown for two or three states. */
function Segmented({ value, onChange, options }) {
  return (
    <div
      style={{
        display: "inline-flex",
        padding: 3,
        borderRadius: T.radius,
        border: `1px solid ${T.lineStrong}`,
        background: T.raised,
      }}
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              padding: "6px 13px",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              fontWeight: 950,
              fontSize: 12,
              whiteSpace: "nowrap",
              background: on ? T.surface : "transparent",
              color: on ? T.accent : T.muted,
              boxShadow: on ? "0 1px 4px rgba(15,23,42,0.12)" : "none",
            }}
          >
            {o.label}
            {o.count != null && (
              <span style={{ marginInlineStart: 6, color: on ? T.faint : T.faint, fontWeight: 900 }}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** One removable "what is currently filtered" pill. */
function ActivePill({ children, onRemove }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "4px 6px 4px 11px",
        borderRadius: 999,
        border: `1px solid ${T.accent}`,
        background: T.accentSoft,
        color: T.accent,
        fontWeight: 900,
        fontSize: 11.5,
        maxWidth: 260,
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove filter"
        style={{
          border: "none",
          background: "rgba(15,118,110,0.16)",
          color: T.accent,
          borderRadius: 999,
          width: 17,
          height: 17,
          lineHeight: 1,
          fontSize: 11,
          fontWeight: 950,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </span>
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

/* ═════════════════════════════════════════════════════ page */

export default function StaffDirectoryTab() {
  const [staff, setStaff] = useState(() => loadStaffCache());
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(null);

  /* Directory filters */
  const [q, setQ] = useState("");
  const [formFilter, setFormFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");

  /* Import filters */
  const [importOpen, setImportOpen] = useState(false);
  const [importQ, setImportQ] = useState("");
  const [importBranches, setImportBranches] = useState(() => QCS_COMPANY_BRANCHES);
  const [importJobs, setImportJobs] = useState([]);
  const [picked, setPicked] = useState(() => new Set());
  /* Deliberately empty: nobody goes on a form until it is ticked here. */
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

  /* Nothing to show yet — open the picker rather than an empty table. */
  const autoOpened = useRef(false);
  useEffect(() => {
    if (loading || autoOpened.current) return;
    autoOpened.current = true;
    if (!staff.length) setImportOpen(true);
  }, [loading, staff.length]);

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

  const takenNos = useMemo(() => new Set(staff.map((s) => normalizeEmpNo(s.empNo))), [staff]);

  /* ── Directory view ── */

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

  const filtered = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return staff.filter((s) => {
      if (statusFilter === "active" && s.active === false) return false;
      if (statusFilter === "inactive" && s.active !== false) return false;
      if (formFilter.length && !formFilter.some((k) => (s.forms || []).includes(k))) return false;
      if (terms.length) {
        const hay = `${s.empNo} ${s.name} ${s.job || ""}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [staff, q, formFilter, statusFilter]);

  const dirFiltersOn = q.trim() || formFilter.length || statusFilter !== "all";

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

  /** Applies one form to everything the current filter shows. */
  function bulkForm(formKey, on) {
    let next = staff;
    filtered.forEach((s) => {
      const has = (s.forms || []).includes(formKey);
      if (has === on) return;
      const forms = on ? [...(s.forms || []), formKey] : (s.forms || []).filter((f) => f !== formKey);
      next = upsertStaff(next, { ...s, forms });
    });
    if (next === staff) return;
    const f = STAFF_FORMS.find((x) => x.key === formKey);
    commit(next, `✅ ${on ? "Added" : "Removed"} ${filtered.length} employee(s) ${on ? "to" : "from"} ${f?.en}.`);
  }

  /* ── Import ── */

  const branchOptions = useMemo(
    () => companyBranches().map(({ branch, count }) => ({ value: branch, label: branch, count })),
    []
  );
  const jobOptions = useMemo(
    () => companyJobs(importBranches).map(({ job, count }) => ({ value: job, label: job, count })),
    [importBranches]
  );

  const importCandidates = useMemo(
    () =>
      searchCompany(importQ, {
        branches: importBranches,
        jobs: importJobs,
        exclude: takenNos,
      }),
    [importQ, importBranches, importJobs, takenNos]
  );

  const importFiltersOn = importQ.trim() || importBranches.length || importJobs.length;

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

  function clearImportFilters() {
    setImportQ("");
    setImportBranches([]);
    setImportJobs([]);
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

  const [form, setForm] = useState({ empNo: "", name: "", job: "", editingNo: "" });
  const [manualOpen, setManualOpen] = useState(false);
  const empNoRef = useRef(null);

  const resetForm = () => setForm({ empNo: "", name: "", job: "", editingNo: "" });

  async function submitManual() {
    const empNo = form.empNo.trim();
    const name = form.name.trim();
    const job = form.job.trim();
    if (!empNo || !name) {
      setMsg("❌ Employee number and name are both required.");
      return;
    }
    try {
      const existing = staff.find((s) => normalizeEmpNo(s.empNo) === normalizeEmpNo(form.editingNo));
      const next = form.editingNo
        ? renumberStaff(staff, form.editingNo, { ...existing, empNo, name, job })
        : upsertStaff(staff, { empNo, name, job, forms: DEFAULT_FORMS, active: true });
      const ok = await commit(next, form.editingNo ? `✅ Updated ${name}.` : `✅ Added ${name}.`);
      if (ok) {
        resetForm();
        setManualOpen(false);
      }
    } catch (e) {
      setMsg(`❌ ${e.message || e}`);
    }
  }

  function startEdit(person) {
    setForm({ empNo: person.empNo, name: person.name, job: person.job || "", editingNo: person.empNo });
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
        [
          esc(s.empNo),
          esc(s.name),
          esc(s.job),
          esc((s.forms || []).join("|")),
          esc(s.active === false ? "no" : "yes"),
        ].join(",")
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
        const cells = (line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).map((p) =>
          p.replace(/,$/, "").trim().replace(/^"|"$/g, "").replace(/""/g, '"')
        );
        const [empNo, name, job, formsRaw, activeRaw] = cells;
        if (!empNo || !name) { skipped++; continue; }
        next = upsertStaff(next, {
          empNo,
          name,
          job: job || "",
          forms: formsRaw ? formsRaw.split("|").filter(Boolean) : DEFAULT_FORMS,
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

  return (
    <div style={ui.page}>
      <PageHeader
        eyebrow="Data Tools"
        title="Staff Directory"
        subtitle="Who appears on the quality forms, and where. People come from the company register, so the number, the name and the job title always match — nothing is typed by hand."
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

      <input
        ref={csvRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        style={{ display: "none" }}
        onChange={importCsv}
      />

      <StatusMessage message={msg} />

      {!online && !loading && (
        <StatusMessage message="⚠️ Could not reach the server — showing the last cached list. Changes will not save until the connection is back." />
      )}

      {/* ═══════════ Import picker ═══════════ */}
      {importOpen && (
        <div style={{ ...ui.card, padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "16px 18px",
              background: "linear-gradient(135deg,#0f766e,#115e59)",
              color: "#fff",
            }}
          >
            <h3 style={{ margin: 0, fontWeight: 1000, fontSize: 16 }}>Add from the company register</h3>
            <p style={{ margin: "6px 0 0", fontSize: 12.5, fontWeight: 750, opacity: 0.9, lineHeight: 1.6 }}>
              {COMPANY_DIRECTORY.length} employees on file. Number, name and job title are copied
              across. Branch and job come from the company register and are not always updated after
              a transfer or promotion — the branch is only a filter, and the job stays editable here.
            </p>
          </div>

          <div style={{ padding: 18 }}>
            {/* ── Filter bar ── */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <SearchField
                value={importQ}
                onChange={setImportQ}
                placeholder="Search number, name, job or branch…"
              />
              <Facet
                label="branches"
                icon="🏢"
                options={branchOptions}
                selected={importBranches}
                onChange={setImportBranches}
                searchPlaceholder="Find a branch…"
                width={230}
              />
              <Facet
                label="job titles"
                icon="🧰"
                options={jobOptions}
                selected={importJobs}
                onChange={setImportJobs}
                searchPlaceholder="Find a job title…"
                width={200}
              />
            </div>

            {/* ── Presets ── */}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 950, color: T.faint, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Quick
              </span>
              <button
                type="button"
                style={pill(
                  importBranches.length === QCS_COMPANY_BRANCHES.length &&
                    QCS_COMPANY_BRANCHES.every((b) => importBranches.includes(b))
                )}
                onClick={() => { setImportBranches(QCS_COMPANY_BRANCHES); setImportJobs([]); }}
              >
                QCS site
              </button>
              <button
                type="button"
                style={pill(importJobs.length > 0 && importJobs.every((j) => /butcher/i.test(j)))}
                onClick={() =>
                  setImportJobs(jobOptions.filter((o) => /butcher/i.test(o.value)).map((o) => o.value))
                }
              >
                Butchery roles
              </button>
              <button
                type="button"
                style={pill(importJobs.length > 0 && importJobs.every((j) => /chef|kitchen|waiter|grill|shawerma/i.test(j)))}
                onClick={() =>
                  setImportJobs(
                    jobOptions.filter((o) => /chef|kitchen|waiter|grill|shawerma/i.test(o.value)).map((o) => o.value)
                  )
                }
              >
                Kitchen roles
              </button>
              {importFiltersOn && (
                <button type="button" style={{ ...pill(false), color: "#b91c1c", borderColor: "#fecaca" }} onClick={clearImportFilters}>
                  ✕ Clear filters
                </button>
              )}
            </div>

            {/* ── Applied filters ── */}
            {(importBranches.length > 0 || importJobs.length > 0) && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {importBranches.map((b) => (
                  <ActivePill key={`b-${b}`} onRemove={() => setImportBranches((p) => p.filter((x) => x !== b))}>
                    🏢 {b}
                  </ActivePill>
                ))}
                {importJobs.map((j) => (
                  <ActivePill key={`j-${j}`} onRemove={() => setImportJobs((p) => p.filter((x) => x !== j))}>
                    🧰 {j}
                  </ActivePill>
                ))}
              </div>
            )}

            {/* ── Results ── */}
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
                {importCandidates.length} available
                {picked.size ? ` · ${picked.size} selected` : ""}
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

            <div style={{ ...ui.tableWrap, maxHeight: 360 }}>
              <table style={ui.table}>
                <thead>
                  <tr>
                    <th style={{ ...ui.th, width: 44, position: "sticky", top: 0 }} />
                    <th style={{ ...ui.th, width: 84, position: "sticky", top: 0 }}>No</th>
                    <th style={{ ...ui.th, position: "sticky", top: 0 }}>Name</th>
                    <th style={{ ...ui.th, width: 176, position: "sticky", top: 0 }}>Job title</th>
                    <th style={{ ...ui.th, width: 200, position: "sticky", top: 0 }}>Branch on file</th>
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
                        {importFiltersOn
                          ? "No one matches these filters — widen them or clear them."
                          : "Everyone in the company register is already in the directory."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Assign + confirm ── */}
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: T.radius,
                border: `1px solid ${picked.size ? T.accent : T.line}`,
                background: picked.size ? T.accentSoft : T.raised,
              }}
            >
              <span style={{ ...ui.label, marginBottom: 8 }}>
                These employees will appear automatically in
              </span>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
                {STAFF_FORMS.map((f) => {
                  const on = importForms.includes(f.key);
                  return (
                    <button
                      key={f.key}
                      type="button"
                      style={pill(on)}
                      title={f.autoFills ? "Pre-fills a row per employee, every day" : "Suggested while typing"}
                      onClick={() =>
                        setImportForms((prev) => (on ? prev.filter((k) => k !== f.key) : [...prev, f.key]))
                      }
                    >
                      {f.branch} · {f.en}{f.autoFills ? " ⚡" : ""}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ color: T.muted, fontWeight: 850, fontSize: 12.5 }}>
                  {!picked.size
                    ? "Tick the employees you want above."
                    : !importForms.length
                      ? "⚠️ Choose at least one form — otherwise they are added but appear nowhere."
                      : `${picked.size} employee(s) → ${importForms.length} form(s).`}
                </span>
                <Button
                  tone="primary"
                  onClick={commitImport}
                  disabled={busy || !picked.size || !importForms.length}
                >
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
            display: "flex",
            alignItems: "center",
            gap: 9,
            width: "100%",
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            fontWeight: 1000,
            fontSize: 14,
            color: T.ink,
            textAlign: "start",
          }}
        >
          <span aria-hidden="true" style={{ color: T.faint, fontSize: 11 }}>{manualOpen ? "▾" : "▸"}</span>
          {form.editingNo ? `Editing ${form.name}` : "Add someone not in the company register"}
          <span style={{ marginInlineStart: "auto", color: T.faint, fontWeight: 800, fontSize: 12 }}>
            {manualOpen ? "" : "optional"}
          </span>
        </button>

        {manualOpen && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr 1fr auto",
              gap: 12,
              alignItems: "end",
              marginTop: 14,
            }}
          >
            <div>
              <label style={ui.label} htmlFor="staff-empno">Employee No</label>
              <input
                id="staff-empno"
                ref={empNoRef}
                style={{ ...fieldBase, width: "100%" }}
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
                style={{ ...fieldBase, width: "100%" }}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && submitManual()}
                placeholder="Full name"
              />
            </div>
            <div>
              <label style={ui.label} htmlFor="staff-job">Job Title</label>
              <input
                id="staff-job"
                list="staff-job-options"
                style={{ ...fieldBase, width: "100%" }}
                value={form.job}
                onChange={(e) => setForm((f) => ({ ...f, job: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && submitManual()}
                placeholder="e.g. Butcher"
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button tone="primary" onClick={submitManual} disabled={busy}>
                {form.editingNo ? "💾 Save" : "➕ Add"}
              </Button>
              {form.editingNo && (
                <Button tone="muted" onClick={() => { resetForm(); setManualOpen(false); }} disabled={busy}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <datalist id="staff-job-options">
        {companyJobs().map((j) => <option key={j.job} value={j.job} />)}
      </datalist>

      {/* ═══════════ The directory ═══════════ */}
      <div style={ui.card}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <Stat label="In the directory" value={staff.length} tone={T.ink} />
          <Stat label="Active" value={activeCount} tone={T.accent} hint="Listed on new forms" />
          {STAFF_FORMS.map((f) => (
            <Stat
              key={f.key}
              label={f.en}
              value={formCounts[f.key] || 0}
              tone={f.autoFills ? "#b45309" : "#475569"}
              hint={f.autoFills ? "Pre-fills a row per employee" : "Suggested while typing"}
            />
          ))}
        </div>

        <SectionTitle hint="Click a form cell to put someone on or off that form. Changes save immediately.">
          Directory
        </SectionTitle>

        {/* ── Filter bar ── */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <SearchField value={q} onChange={setQ} placeholder="Search number, name or job…" />
          <Facet
            label="forms"
            icon="📋"
            options={STAFF_FORMS.map((f) => ({
              value: f.key,
              label: `${f.en}${f.autoFills ? " ⚡" : ""}`,
              count: formCounts[f.key] || 0,
            }))}
            selected={formFilter}
            onChange={setFormFilter}
            searchPlaceholder="Find a form…"
            width={195}
          />
          <Segmented
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All", count: staff.length },
              { value: "active", label: "Active", count: activeCount },
              { value: "inactive", label: "Inactive", count: staff.length - activeCount },
            ]}
          />
          {dirFiltersOn && (
            <button
              type="button"
              style={{ ...pill(false), color: "#b91c1c", borderColor: "#fecaca" }}
              onClick={() => { setQ(""); setFormFilter([]); setStatusFilter("all"); }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* ── Bulk actions on the filtered set ── */}
        {dirFiltersOn && filtered.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              padding: "10px 12px",
              marginBottom: 12,
              borderRadius: T.radius,
              background: T.accentSoft,
              border: `1px solid ${T.accent}`,
            }}
          >
            <strong style={{ fontWeight: 1000, fontSize: 12.5, color: T.accent }}>
              {filtered.length} shown — apply to all:
            </strong>
            {STAFF_FORMS.map((f) => (
              <span key={f.key} style={{ display: "inline-flex", gap: 4 }}>
                <button type="button" style={pill(false)} disabled={busy} onClick={() => bulkForm(f.key, true)}>
                  + {f.en}
                </button>
                <button
                  type="button"
                  style={{ ...pill(false), color: "#b91c1c", borderColor: "#fecaca" }}
                  disabled={busy}
                  onClick={() => bulkForm(f.key, false)}
                >
                  −
                </button>
              </span>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 8, fontWeight: 1000, fontSize: 13 }}>
          {filtered.length} of {staff.length} employee{staff.length === 1 ? "" : "s"}
        </div>

        <div style={ui.tableWrap}>
          <table style={ui.table}>
            <thead>
              <tr>
                <th style={{ ...ui.th, width: 70 }}>No</th>
                <th style={{ ...ui.th, minWidth: 230 }}>Name &amp; job</th>
                {STAFF_FORMS.map((f) => (
                  <th key={f.key} style={{ ...ui.th, width: 112, textAlign: "center" }}>
                    {f.en}
                    {f.autoFills ? " ⚡" : ""}
                  </th>
                ))}
                <th style={{ ...ui.th, width: 160, textAlign: "end" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.empNo} style={{ opacity: s.active === false ? 0.55 : 1 }}>
                  <td style={{ ...ui.td, fontWeight: 1000, fontVariantNumeric: "tabular-nums" }}>{s.empNo}</td>

                  {/* Job sits under the name: it identifies the person without
                      costing a column the panel does not have room for. */}
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
                          padding: "2px 9px",
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 950,
                          letterSpacing: "0.04em",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          border: `1px solid ${s.active === false ? "#fcd34d" : "#a7f3d0"}`,
                          background: s.active === false ? "#fffbeb" : "#ecfdf5",
                          color: s.active === false ? "#b45309" : "#047857",
                        }}
                      >
                        {s.active === false ? "INACTIVE" : "ACTIVE"}
                      </button>
                    </div>
                    {s.job && (
                      <div style={{ color: T.faint, fontSize: 11.5, fontWeight: 800, marginTop: 2 }}>
                        {s.job}
                      </div>
                    )}
                  </td>

                  {/* One column per form: a whole roster reads straight down. */}
                  {STAFF_FORMS.map((f) => {
                    const on = (s.forms || []).includes(f.key);
                    return (
                      <td key={f.key} style={{ ...ui.td, textAlign: "center" }}>
                        <button
                          type="button"
                          style={pill(on)}
                          disabled={busy}
                          title={on ? `Remove ${s.name} from ${f.en}` : `Add ${s.name} to ${f.en}`}
                          onClick={() => toggleForm(s, f.key)}
                        >
                          {on ? "✔ on" : "off"}
                        </button>
                      </td>
                    );
                  })}

                  <td style={{ ...ui.td, textAlign: "end", whiteSpace: "nowrap" }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <Button tone="secondary" style={rowBtn} onClick={() => startEdit(s)} disabled={busy}>
                        Edit
                      </Button>
                      <Button
                        tone="danger"
                        style={rowBtn}
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
                  <td
                    colSpan={3 + STAFF_FORMS.length}
                    style={{ ...ui.td, textAlign: "center", color: T.muted, padding: 30 }}
                  >
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
          ⚡ <b>Personal Hygiene</b> pre-fills a row for every employee marked “on”, every day. The
          other two only suggest the person while typing — they never fill a row by themselves.{" "}
          <b>ACTIVE / INACTIVE</b> keeps someone in the history but drops them off new forms;{" "}
          <b>Delete</b> removes them from the directory. Reports already saved always keep the name
          and number they were saved with.
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
