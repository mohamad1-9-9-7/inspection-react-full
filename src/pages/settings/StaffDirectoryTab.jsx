// src/pages/settings/StaffDirectoryTab.jsx
//
// Manage the QCS staff directory: employee number ⇄ employee name.
// It replaces the hardcoded `DEFAULT_NAMES` array that used to live inside
// PersonalHygieneTab.js, so adding or removing a worker no longer needs a
// code change and a deploy.
//
// The list feeds every form that asks for an employee — Personal Hygiene,
// Staff Sickness, Return to Work — through _shared/staffRegistry.js.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteStaff,
  fetchStaff,
  loadStaffCache,
  normalizeEmpNo,
  saveStaff,
  saveStaffCache,
} from "../monitor/branches/_shared/staffRegistry";
import { Button, ConfirmModal, PageHeader, StatusMessage, ui } from "./_shared/SettingsUIKit";

const emptyForm = { empNo: "", name: "", editingNo: "" };

export default function StaffDirectoryTab() {
  const [staff, setStaff] = useState(() => loadStaffCache());
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(null);

  const empNoRef = useRef(null);
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

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return staff;
    return staff.filter(
      (s) =>
        String(s.empNo).toLowerCase().includes(term) ||
        String(s.name).toLowerCase().includes(term)
    );
  }, [staff, q]);

  const resetForm = () => {
    setForm(emptyForm);
    empNoRef.current?.focus();
  };

  async function submit() {
    const empNo = form.empNo.trim();
    const name = form.name.trim();
    if (!empNo || !name) {
      setMsg("❌ Employee number and name are both required.");
      return;
    }
    // Catch the duplicate here so the user sees a clear message instead of a
    // 409 from the unique (scope, code) index.
    const clash = staff.find(
      (s) =>
        normalizeEmpNo(s.empNo) === normalizeEmpNo(empNo) &&
        normalizeEmpNo(s.empNo) !== normalizeEmpNo(form.editingNo)
    );
    if (clash) {
      setMsg(`❌ Employee number "${empNo}" is already used by ${clash.name}.`);
      return;
    }

    setBusy(true);
    setMsg("");
    try {
      const saved = await saveStaff({ empNo, name }, form.editingNo || "");
      setStaff((prev) => {
        const oldKey = normalizeEmpNo(form.editingNo || empNo);
        const next = [
          saved,
          ...prev.filter(
            (s) =>
              normalizeEmpNo(s.empNo) !== normalizeEmpNo(saved.empNo) &&
              normalizeEmpNo(s.empNo) !== oldKey
          ),
        ].sort((a, b) =>
          String(a.empNo).localeCompare(String(b.empNo), undefined, { numeric: true })
        );
        saveStaffCache(next);
        return next;
      });
      setOnline(true);
      setMsg(form.editingNo ? `✅ Updated ${saved.name}.` : `✅ Added ${saved.name}.`);
      resetForm();
    } catch (e) {
      setMsg(`❌ ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove(entry) {
    setConfirmRemove(null);
    setBusy(true);
    setMsg("");
    try {
      await deleteStaff(entry.empNo);
      setStaff((prev) => {
        const next = prev.filter(
          (s) => normalizeEmpNo(s.empNo) !== normalizeEmpNo(entry.empNo)
        );
        saveStaffCache(next);
        return next;
      });
      setMsg(`✅ Removed ${entry.name}.`);
      if (normalizeEmpNo(form.editingNo) === normalizeEmpNo(entry.empNo)) resetForm();
    } catch (e) {
      setMsg(`❌ ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(entry) {
    setForm({ empNo: entry.empNo, name: entry.name, editingNo: entry.empNo });
    setMsg("");
    empNoRef.current?.focus();
  }

  function exportCsv() {
    const lines = ["employee_no,employee_name"];
    staff.forEach((s) => {
      const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
      lines.push(`${esc(s.empNo)},${esc(s.name)}`);
    });
    const blob = new Blob([`﻿${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qcs_staff_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* Bulk import: one "number,name" pair per line. Existing numbers are updated
     rather than duplicated, so the same file can be re-imported safely. */
  async function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg("⏳ Importing…");
    let ok = 0;
    let failed = 0;
    try {
      const text = await file.text();
      const rows = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .filter((l) => !/^"?employee[_ ]?no/i.test(l));

      for (const line of rows) {
        const parts = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || [];
        const clean = parts
          .map((p) => p.replace(/,$/, "").trim().replace(/^"|"$/g, "").replace(/""/g, '"'))
          .filter((_, i) => i < 2);
        const [empNo, name] = clean;
        if (!empNo || !name) { failed++; continue; }
        try {
          await saveStaff({ empNo, name }, empNo);
          ok++;
        } catch {
          failed++;
        }
      }
      await reload();
      setMsg(`✅ Imported ${ok} employee(s)${failed ? ` · ❌ ${failed} skipped` : ""}.`);
    } catch (e) {
      setMsg(`❌ Import failed: ${e.message || e}`);
    } finally {
      setBusy(false);
      if (event.target) event.target.value = "";
    }
  }

  return (
    <div style={ui.page}>
      <PageHeader
        eyebrow="Data Tools"
        title="Staff Directory"
        subtitle="Employee numbers and names used by the QCS forms (Personal Hygiene, Staff Sickness, Return to Work). Typing a number in a form fills in the matching name automatically."
        actions={
          <>
            <Button tone="secondary" onClick={() => importRef.current?.click()} disabled={busy}>
              ⬆ Import CSV
            </Button>
            <Button tone="secondary" onClick={exportCsv} disabled={!staff.length}>
              ⬇ Export CSV
            </Button>
            <Button tone="muted" onClick={reload} disabled={loading || busy}>
              {loading ? "⏳ Loading…" : "↻ Refresh"}
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

      {/* Add / edit */}
      <div style={ui.subtleCard}>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <label style={ui.label} htmlFor="staff-empno">Employee No</label>
            <input
              id="staff-empno"
              ref={empNoRef}
              style={ui.input}
              value={form.empNo}
              onChange={(e) => setForm((f) => ({ ...f, empNo: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && submit()}
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
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="e.g. WELSON"
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button tone="primary" onClick={submit} disabled={busy}>
              {form.editingNo ? "💾 Save changes" : "➕ Add employee"}
            </Button>
            {form.editingNo && (
              <Button tone="muted" onClick={resetForm} disabled={busy}>Cancel</Button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
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
                <th style={{ ...ui.th, width: 140 }}>Employee No</th>
                <th style={ui.th}>Employee Name</th>
                <th style={{ ...ui.th, width: 190, textAlign: "end" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.empNo}>
                  <td style={{ ...ui.td, fontWeight: 1000, fontVariantNumeric: "tabular-nums" }}>{s.empNo}</td>
                  <td style={ui.td}>{s.name}</td>
                  <td style={{ ...ui.td, textAlign: "end" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <Button tone="secondary" onClick={() => startEdit(s)} disabled={busy}>Edit</Button>
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
                  <td colSpan={3} style={{ ...ui.td, textAlign: "center", color: "#64748b" }}>
                    {loading
                      ? "Loading…"
                      : staff.length
                        ? "No employee matches this search."
                        : "No employees yet — add the first one above, or import a CSV."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmRemove}
        title="Remove employee?"
        body={
          confirmRemove
            ? `${confirmRemove.name} (${confirmRemove.empNo}) will no longer appear in the QCS forms. Reports already saved keep the name they were saved with.`
            : ""
        }
        confirmText="Remove"
        onConfirm={() => remove(confirmRemove)}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
