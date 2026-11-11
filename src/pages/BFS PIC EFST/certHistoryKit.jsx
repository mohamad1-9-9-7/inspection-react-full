// D:\inspection-react-full\src\pages\BFS PIC EFST\certHistoryKit.jsx
//
// Training certificates — standard branch names, per-employee change history
// and the "transfer employee" flow.
//
// History lives INSIDE each certificate record: payload.history = [event…].
// An employee-level event (a transfer) is written to every certificate of that
// employee with the same event id, and the timeline de-duplicates by id — so
// deleting one certificate never loses the employee's transfer history.

import React, { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "../../utils/perms";
import { COMPANY_DIRECTORY, normalizeEmpNo } from "../monitor/branches/_shared/staffRegistry";

/* ===================== Branch names ===================== */
/** The owner's standard branch list (shown first wherever a branch is picked). */
export const MAIN_BRANCHES = [
  "AL QUASIS (STORE)",
  "FOOD TRUCK (MUSHRIF PARK) - FTR 1",
  "FOOD TRUCK (AL MAMZAR) - FTR 2",
  "AL WARQA KITCHEN",
  "ALBARSHA BUTCHERY (POS 15)",
  "AL AIN BUTCHERY (POS 14)",
];

/** Spelling variants found in saved records → the standard name. */
const BRANCH_ALIASES = {
  "al warqa kitchen": "AL WARQA KITCHEN",
  "al warka kitchen": "AL WARQA KITCHEN",
  "alwarqa kitchen": "AL WARQA KITCHEN",
  "al warqa": "AL WARQA KITCHEN",
  "al warka": "AL WARQA KITCHEN",
  "ftr 1": "FOOD TRUCK (MUSHRIF PARK) - FTR 1",
  "ftr1": "FOOD TRUCK (MUSHRIF PARK) - FTR 1",
  "ftr 2": "FOOD TRUCK (AL MAMZAR) - FTR 2",
  "ftr2": "FOOD TRUCK (AL MAMZAR) - FTR 2",
};
const squash = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
const KNOWN_BY_SQUASH = new Map();
[...MAIN_BRANCHES, ...COMPANY_DIRECTORY.map((d) => d.branch)].forEach((b) => {
  if (b && !KNOWN_BY_SQUASH.has(squash(b))) KNOWN_BY_SQUASH.set(squash(b), b);
});

/** Standard spelling of a branch name (unknown names are only trimmed). */
export function canonicalBranch(name) {
  const s = squash(name);
  if (!s) return "";
  return BRANCH_ALIASES[s] || KNOWN_BY_SQUASH.get(s) || String(name).trim().replace(/\s+/g, " ");
}

/** { main: [...], other: [...] } — main list first, then every other known branch. */
export function branchOptions(extra = []) {
  const main = new Set(MAIN_BRANCHES);
  const other = new Set();
  [...COMPANY_DIRECTORY.map((d) => d.branch), ...extra].forEach((b) => {
    const c = canonicalBranch(b);
    if (c && !main.has(c)) other.add(c);
  });
  return { main: MAIN_BRANCHES.slice(), other: Array.from(other).sort((a, b) => a.localeCompare(b)) };
}

/* ===================== History model ===================== */
export const HISTORY_FIELDS = [
  ["employeeNo", "Employee No"],
  ["name", "Name"],
  ["nationality", "Nationality"],
  ["branch", "Branch"],
  ["job", "Job Title"],
  ["courseType", "Course"],
  ["issueDate", "Issue Date"],
  ["expiryDate", "Expiry Date"],
  ["imageUrl", "Certificate image"],
  ["instituteImageUrl", "Institute certificate"],
];

export function currentActor() {
  const u = getCurrentUser() || {};
  return String(u.displayName || u.fullName || u.name || u.username || u.email || "Unknown").trim();
}

export const newEventId = () => `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

/** Field-by-field differences between two payloads (images reported as changed/removed, not as URLs). */
export function diffPayload(before = {}, after = {}) {
  const out = [];
  HISTORY_FIELDS.forEach(([k, label]) => {
    const a = String(before[k] ?? "").trim();
    const b = String(after[k] ?? "").trim();
    if (a === b) return;
    if (k === "imageUrl" || k === "instituteImageUrl") {
      out.push({ field: k, label, from: a ? "attached" : "—", to: b ? (a ? "replaced" : "attached") : "removed" });
    } else {
      out.push({ field: k, label, from: a, to: b });
    }
  });
  return out;
}

/** Returns payload with one more history event (never mutates). */
export function withEvent(payload, event) {
  const history = Array.isArray(payload?.history) ? payload.history : [];
  return {
    ...payload,
    history: [
      ...history,
      { id: newEventId(), at: new Date().toISOString(), by: currentActor(), ...event },
    ],
  };
}

export function employeeKeyOf(row) {
  const no = normalizeEmpNo(row?.employeeNo || "");
  return no ? `#${no}` : `n:${squash(row?.name)}`;
}

/** Merged, de-duplicated, newest-first timeline for one employee's certificate rows. */
export function buildTimeline(rows) {
  const seen = new Set();
  const out = [];
  rows.forEach((r) => {
    const hist = Array.isArray(r.history) ? r.history : [];
    hist.forEach((e) => {
      if (!e || seen.has(e.id)) return;
      seen.add(e.id);
      out.push({ ...e, course: e.course || (e.type === "transfer" ? "" : r.courseType) });
    });
    // every certificate has a "added" moment even if it predates the log
    if (!hist.some((e) => e.type === "created")) {
      // after renewals the ORIGINAL certificate dates live in the first archive entry
      const first = Array.isArray(r.renewals) && r.renewals.length ? r.renewals[0] : null;
      const issueDate = first ? first.prevIssueDate : r.issueDate;
      const expiryDate = first ? first.prevExpiryDate : r.expiryDate;
      const at = r.createdAt || (issueDate ? `${String(issueDate).slice(0, 10)}T00:00:00` : "") || r.savedAt;
      if (at)
        out.push({
          id: `created:${r._rid || r.idx}`,
          type: "created",
          at,
          by: "",
          course: r.courseType,
          issueDate,
          expiryDate,
          synthetic: true,
        });
    }
  });
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

/** Branch path over time, oldest → newest (from transfer events). */
export function branchPath(timeline, current) {
  const transfers = timeline.filter((e) => e.type === "transfer").slice().reverse();
  if (!transfers.length) return current ? [current] : [];
  const path = [transfers[0].fromBranch || "—"];
  transfers.forEach((t) => path.push(t.toBranch));
  if (current && path[path.length - 1] !== current) path.push(current);
  return path;
}

const fmtDate = (s) => {
  const d = String(s || "").slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || "—";
};
const fmtDateTime = (s) => {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const TRANSFER_REASONS = ["Operational need", "Current branch closed", "Employee request", "Promotion", "Temporary cover", "New branch opening", "Performance / disciplinary", "Other"];

/* ===================== Renewal ===================== */
/** Validity in years per course (same as the entry page). */
export const COURSE_YEARS = { BFS: 2, PIC: 5, EFST: 5 };

const addYearsIso = (iso, years) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return "";
  return new Date(Date.UTC(+m[1] + years, +m[2] - 1, +m[3])).toISOString().slice(0, 10);
};
const addDaysIso = (iso, days) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return "";
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + days * 864e5).toISOString().slice(0, 10);
};
const daysBetween = (a, b) => {
  const pa = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(a || "").slice(0, 10));
  const pb = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(b || "").slice(0, 10));
  if (!pa || !pb) return null;
  return Math.round((Date.UTC(+pb[1], +pb[2] - 1, +pb[3]) - Date.UTC(+pa[1], +pa[2] - 1, +pa[3])) / 864e5);
};

/** Suggested expiry for a renewal: course rule, else the previous certificate's validity length. */
export function suggestExpiry(row, issueDate) {
  const years = COURSE_YEARS[String(row?.courseType || "").toUpperCase()];
  if (years) return { expiry: addYearsIso(issueDate, years), basis: `${years}-year ${row.courseType} validity` };
  const len = daysBetween(row?.issueDate, row?.expiryDate);
  if (len && len > 0) return { expiry: addDaysIso(issueDate, len), basis: "same validity as the previous certificate" };
  return { expiry: "", basis: "" };
}

/**
 * Builds the renewed payload: new dates/images, the previous certificate kept in
 * payload.renewals[] (archive) and a "renewed" history event.
 */
export function renewPayload(orig, data) {
  const efst = String(orig.courseType || "").toUpperCase() === "EFST";
  const archive = {
    renewedAt: new Date().toISOString(),
    by: currentActor(),
    prevIssueDate: orig.issueDate || "",
    prevExpiryDate: orig.expiryDate || "",
    prevImageUrl: orig.imageUrl || (/^https?:/i.test(orig.imageData || "") ? orig.imageData : "") || "",
    prevInstituteImageUrl: orig.instituteImageUrl || "",
  };
  const next = {
    ...orig,
    issueDate: data.issueDate,
    expiryDate: data.expiryDate || undefined,
    imageUrl: data.imageUrl,
    imageData: "",
    imageName: data.imageName || "certificate.jpg",
    imageType: "image/jpeg",
    ...(efst
      ? { instituteImageUrl: data.instituteImageUrl || undefined, instituteImageName: data.instituteImageUrl ? data.instituteImageName || "institute.jpg" : undefined }
      : {}),
    savedAt: new Date().toISOString(),
    renewals: [...(Array.isArray(orig.renewals) ? orig.renewals : []), archive],
  };
  return withEvent(next, {
    type: "renewed",
    course: orig.courseType || "",
    note: data.note || "",
    prevImageUrl: archive.prevImageUrl,
    prevInstituteImageUrl: archive.prevInstituteImageUrl,
    changes: [
      { field: "issueDate", label: "Issue Date", from: archive.prevIssueDate, to: data.issueDate },
      { field: "expiryDate", label: "Expiry Date", from: archive.prevExpiryDate, to: data.expiryDate || "No expiry" },
    ],
  });
}

function ImageSlot({ label, required, url, busy, onPick, onClear }) {
  const [over, setOver] = useState(false);
  const inputId = useMemo(() => `rn_${Math.random().toString(36).slice(2)}`, []);
  return (
    <div
      className={`tch-slot${over ? " over" : ""}${url ? " has" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) onPick(f);
      }}
    >
      <div className="tch-slot-h">
        {label} {required ? <em>required</em> : <em className="opt">optional</em>}
      </div>
      {url ? (
        <div className="tch-slot-img">
          <img src={url} alt={label} />
          <div className="tch-slot-act">
            <a href={url} target="_blank" rel="noreferrer">
              Open ↗
            </a>
            <button type="button" onClick={onClear}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label htmlFor={inputId} className="tch-slot-drop">
          {busy ? "Uploading…" : "Drop the new certificate here or click to choose"}
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          e.target.value = "";
          if (f) onPick(f);
        }}
      />
    </div>
  );
}

export function RenewModal({ open, row, onClose, onConfirm, upload }) {
  const [issue, setIssue] = useState("");
  const [expiry, setExpiry] = useState("");
  const [noExpiry, setNoExpiry] = useState(false);
  const [touchedExpiry, setTouchedExpiry] = useState(false);
  const [img, setImg] = useState({ url: "", name: "" });
  const [inst, setInst] = useState({ url: "", name: "" });
  const [uploading, setUploading] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open && row) {
      const today = new Date().toISOString().slice(0, 10);
      setIssue(today);
      setExpiry(suggestExpiry(row, today).expiry);
      setNoExpiry(false);
      setTouchedExpiry(false);
      setImg({ url: "", name: "" });
      setInst({ url: "", name: "" });
      setNote("");
      setErr("");
    }
  }, [open, row]);

  if (!open || !row) return null;
  const efst = String(row.courseType || "").toUpperCase() === "EFST";
  const sug = suggestExpiry(row, issue);
  const prevRenewals = Array.isArray(row.renewals) ? row.renewals.length : 0;
  const daysOld = row.status?.days;

  function changeIssue(v) {
    setIssue(v);
    if (!touchedExpiry) setExpiry(suggestExpiry(row, v).expiry);
  }

  async function pick(file, slot) {
    if (!/^image\//.test(file.type)) return setErr("Please choose an image file.");
    setErr("");
    setUploading(slot);
    try {
      const url = await upload(file);
      if (slot === "inst") setInst({ url, name: file.name });
      else setImg({ url, name: file.name });
    } catch (e) {
      setErr("Image upload failed. Try another image.");
    } finally {
      setUploading("");
    }
  }

  async function submit() {
    const today = new Date().toISOString().slice(0, 10);
    if (!issue) return setErr("Enter the new issue date.");
    if (!noExpiry && !expiry) return setErr("Enter the new expiry date (or tick “No expiry”).");
    if (!noExpiry && expiry <= issue) return setErr("Expiry must be after the issue date.");
    if (!noExpiry && expiry < today) return setErr("The new expiry date is already in the past.");
    if (row.issueDate && issue < String(row.issueDate).slice(0, 10)) return setErr("The new issue date is older than the current certificate.");
    if (!img.url) return setErr("Attach the new certificate image.");
    setBusy(true);
    setErr("");
    try {
      await onConfirm({
        issueDate: issue,
        expiryDate: noExpiry ? "" : expiry,
        imageUrl: img.url,
        imageName: img.name,
        instituteImageUrl: inst.url,
        instituteImageName: inst.name,
        note: note.trim(),
      });
    } catch (e) {
      setErr(e?.message || "Renewal failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tch tch-overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()} dir="ltr" lang="en">
      <style>{TCH_CSS}</style>
      <div className="tch-dlg md" role="dialog" aria-modal="true" aria-label="Renew certificate">
        <header className="tch-head">
          <div className="tch-logo orange">↻</div>
          <div className="tch-grow">
            <div className="tch-title">Renew {row.courseType || ""} certificate</div>
            <div className="tch-sub">
              {row.name} · #{row.employeeNo || "—"} · {row.branch || "—"}
            </div>
          </div>
          <button type="button" className="tch-x" onClick={onClose} disabled={busy} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="tch-pad">
          <div className="tch-renew">
            <div className={`tch-rcard old s-${row.status?.key || "valid"}`}>
              <div className="tch-rcard-h">Current certificate</div>
              <div className="tch-rrow">
                <span>Issued</span>
                <b>{fmtDate(row.issueDate)}</b>
              </div>
              <div className="tch-rrow">
                <span>Expires</span>
                <b>{row.expiryDate ? fmtDate(row.expiryDate) : "No expiry"}</b>
              </div>
              <div className="tch-rbadge">
                {daysOld === null || daysOld === undefined ? row.status?.label : daysOld < 0 ? `Expired ${Math.abs(daysOld)} days ago` : `${daysOld} days left`}
              </div>
              <div className="tch-rnote">Moves to the archive — still visible in the employee history{prevRenewals ? ` (renewed ${prevRenewals}× before)` : ""}.</div>
            </div>
            <div className="tch-move-arrow">→</div>
            <div className="tch-rcard new">
              <div className="tch-rcard-h">New certificate</div>
              <label className="tch-field">
                <span>Issue date</span>
                <input type="date" className="tch-input" value={issue} onChange={(e) => changeIssue(e.target.value)} />
              </label>
              <label className="tch-field">
                <span>Expiry date</span>
                <input
                  type="date"
                  className="tch-input"
                  value={noExpiry ? "" : expiry}
                  disabled={noExpiry}
                  onChange={(e) => {
                    setTouchedExpiry(true);
                    setExpiry(e.target.value);
                  }}
                />
              </label>
              {sug.basis && !noExpiry && (
                <div className="tch-hintline">
                  {touchedExpiry && expiry !== sug.expiry ? (
                    <button
                      type="button"
                      className="tch-linkbtn"
                      onClick={() => {
                        setTouchedExpiry(false);
                        setExpiry(sug.expiry);
                      }}
                    >
                      ↺ Use {fmtDate(sug.expiry)} ({sug.basis})
                    </button>
                  ) : (
                    <>Auto: {sug.basis}</>
                  )}
                </div>
              )}
              <label className="tch-check">
                <input type="checkbox" checked={noExpiry} onChange={(e) => setNoExpiry(e.target.checked)} />
                No expiry
              </label>
            </div>
          </div>

          <div className={efst ? "tch-grid2" : ""}>
            <ImageSlot
              label={efst ? "Municipality certificate" : "Certificate image"}
              required
              url={img.url}
              busy={uploading === "main"}
              onPick={(f) => pick(f, "main")}
              onClear={() => setImg({ url: "", name: "" })}
            />
            {efst && (
              <ImageSlot label="Institute certificate" url={inst.url} busy={uploading === "inst"} onPick={(f) => pick(f, "inst")} onClear={() => setInst({ url: "", name: "" })} />
            )}
          </div>

          <label className="tch-field">
            <span>Note (optional)</span>
            <input className="tch-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. training centre, batch no." />
          </label>
          {err && <div className="tch-err">{err}</div>}
        </div>

        <footer className="tch-foot">
          <button type="button" className="tch-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="tch-btn orange" onClick={submit} disabled={busy || !!uploading}>
            {busy ? "Saving…" : "↻ Renew certificate"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ===================== Branch <select> ===================== */
export function BranchSelect({ value, onChange, extra = [], exclude, className, style, placeholder = "— Choose branch —" }) {
  const opts = useMemo(() => branchOptions(extra), [extra]);
  const skip = (b) => exclude && b === exclude;
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className} style={style}>
      <option value="">{placeholder}</option>
      <optgroup label="Main branches">
        {opts.main.filter((b) => !skip(b)).map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </optgroup>
      <optgroup label="Other company branches">
        {opts.other.filter((b) => !skip(b)).map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

/* ===================== Transfer dialog ===================== */
export function TransferModal({ open, employee, rows, allBranches, onClose, onConfirm }) {
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState(TRANSFER_REASONS[0]);
  const [note, setNote] = useState("");
  const [job, setJob] = useState("");
  const [changeJob, setChangeJob] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setTo("");
      setDate(new Date().toISOString().slice(0, 10));
      setReason(TRANSFER_REASONS[0]);
      setNote("");
      setJob(employee?.job || "");
      setChangeJob(false);
      setErr("");
    }
  }, [open, employee]);

  if (!open || !employee) return null;
  const from = employee.branch || "—";

  async function submit() {
    if (!to) return setErr("Choose the new branch.");
    if (to === employee.branch) return setErr("The employee is already in this branch.");
    if (!date) return setErr("Choose the effective date.");
    if (reason === "Other" && !note.trim()) return setErr("Write the reason.");
    setBusy(true);
    setErr("");
    try {
      await onConfirm({
        toBranch: to,
        fromBranch: employee.branch || "",
        effectiveDate: date,
        reason,
        note: note.trim(),
        newJob: changeJob && job.trim() && job.trim() !== employee.job ? job.trim() : "",
        oldJob: employee.job || "",
      });
    } catch (e) {
      setErr(e?.message || "Transfer failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tch tch-overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()} dir="ltr" lang="en">
      <style>{TCH_CSS}</style>
      <div className="tch-dlg sm" role="dialog" aria-modal="true" aria-label="Transfer employee">
        <header className="tch-head">
          <div className="tch-logo blue">⇄</div>
          <div className="tch-grow">
            <div className="tch-title">Transfer employee</div>
            <div className="tch-sub">
              {employee.name} · #{employee.employeeNo || "—"}
            </div>
          </div>
          <button type="button" className="tch-x" onClick={onClose} disabled={busy} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="tch-pad">
          <div className="tch-move">
            <div className="tch-move-box">
              <span>From</span>
              <b>{from}</b>
            </div>
            <div className="tch-move-arrow">→</div>
            <div className={`tch-move-box to${to ? "" : " empty"}`}>
              <span>To</span>
              <b>{to || "Choose below"}</b>
            </div>
          </div>

          <label className="tch-field">
            <span>New branch</span>
            <BranchSelect value={to} onChange={setTo} extra={allBranches} exclude={employee.branch} className="tch-input" />
          </label>

          <div className="tch-grid2">
            <label className="tch-field">
              <span>Effective date</span>
              <input type="date" className="tch-input" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="tch-field">
              <span>Reason</span>
              <select className="tch-input" value={reason} onChange={(e) => setReason(e.target.value)}>
                {TRANSFER_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="tch-field">
            <span>Note {reason === "Other" ? "(required)" : "(optional)"}</span>
            <textarea className="tch-input area" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. covering the food-truck season" />
          </label>

          <label className="tch-check">
            <input type="checkbox" checked={changeJob} onChange={(e) => setChangeJob(e.target.checked)} />
            Job title changes too
          </label>
          {changeJob && (
            <label className="tch-field">
              <span>New job title</span>
              <input className="tch-input" value={job} onChange={(e) => setJob(e.target.value)} />
            </label>
          )}

          <div className="tch-info">
            Updates <b>{rows.length}</b> certificate record{rows.length === 1 ? "" : "s"} of this employee ({rows.map((r) => r.courseType || "?").join(", ")}) and adds the move to the change history.
          </div>
          {err && <div className="tch-err">{err}</div>}
        </div>

        <footer className="tch-foot">
          <button type="button" className="tch-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="tch-btn primary" onClick={submit} disabled={busy}>
            {busy ? "Transferring…" : "⇄ Confirm transfer"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ===================== History drawer ===================== */
const EV_META = {
  transfer: { icon: "⇄", color: "#2563eb", label: "Transfer" },
  edit: { icon: "✎", color: "#0891b2", label: "Edit" },
  left: { icon: "⎋", color: "#b91c1c", label: "Left company" },
  restored: { icon: "↺", color: "#047857", label: "Restored" },
  created: { icon: "＋", color: "#7c3aed", label: "Added" },
  renewed: { icon: "↻", color: "#ea580c", label: "Renewed" },
  deleted: { icon: "🗑", color: "#64748b", label: "Deleted" },
  branch_fix: { icon: "Aa", color: "#a16207", label: "Name fix" },
};
const HISTORY_TABS = [
  ["all", "All"],
  ["transfer", "Transfers"],
  ["edit", "Edits"],
  ["status", "Status"],
  ["renewed", "Renewals"],
  ["created", "Certificates"],
];

/**
 * mode "employee": one person's timeline (rows = their certificate rows).
 * mode "all": every event across the register (rows = all rows).
 */
export function HistoryDrawer({ open, mode = "employee", rows, onClose, onTransfer, onOpenEmployee }) {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  useEffect(() => {
    if (open) {
      setTab("all");
      setQ("");
    }
  }, [open, mode, rows]);

  const timeline = useMemo(() => {
    if (!open) return [];
    if (mode === "employee") return buildTimeline(rows);
    // all: group per employee so shared transfer ids collapse, then flatten
    const groups = new Map();
    rows.forEach((r) => {
      const k = employeeKeyOf(r);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    });
    const out = [];
    groups.forEach((list) => {
      const head = list[0];
      buildTimeline(list)
        .filter((e) => !e.synthetic)
        .forEach((e) => out.push({ ...e, empName: head.name, empNo: head.employeeNo, empRow: head }));
    });
    return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }, [open, mode, rows]);

  if (!open) return null;

  const shown = timeline.filter((e) => {
    if (tab === "status" && !(e.type === "left" || e.type === "restored" || e.type === "deleted")) return false;
    if (tab !== "all" && tab !== "status" && e.type !== tab) return false;
    if (q) {
      const hay = [e.empName, e.empNo, e.by, e.course, e.fromBranch, e.toBranch, e.reason, e.note, ...(e.changes || []).map((c) => `${c.label} ${c.from} ${c.to}`)]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const emp = mode === "employee" ? rows.slice().sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))[0] : null;
  const path = emp ? branchPath(timeline, emp.branch) : [];
  const counts = timeline.reduce((o, e) => ((o[e.type] = (o[e.type] || 0) + 1), o), {});

  return (
    <div className="tch tch-overlay right" onMouseDown={(e) => e.target === e.currentTarget && onClose()} dir="ltr" lang="en">
      <style>{TCH_CSS}</style>
      <aside className="tch-drawer" role="dialog" aria-modal="true" aria-label="Change history">
        <header className="tch-head">
          <div className="tch-logo">🕘</div>
          <div className="tch-grow">
            <div className="tch-title">{mode === "employee" ? "Employee history" : "Change log"}</div>
            <div className="tch-sub">{mode === "employee" ? `${emp?.name || "—"} · #${emp?.employeeNo || "—"}` : `${timeline.length} recorded changes across the register`}</div>
          </div>
          <button type="button" className="tch-x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {emp && (
          <div className="tch-emp">
            <div className="tch-emp-grid">
              <div>
                <span>Current branch</span>
                <b>{emp.branch || "—"}</b>
              </div>
              <div>
                <span>Job title</span>
                <b>{emp.job || "—"}</b>
              </div>
              <div>
                <span>Nationality</span>
                <b>{emp.nationality || "—"}</b>
              </div>
              <div>
                <span>Status</span>
                <b className={emp.leftCompany ? "bad" : "good"}>{emp.leftCompany ? "Left company" : "Active"}</b>
              </div>
            </div>
            <div className="tch-certs">
              {rows.map((r) => (
                <span key={r._rid || r.idx} className={`tch-cert s-${r.status?.key || "valid"}`} title={`Expiry ${fmtDate(r.expiryDate)}`}>
                  {r.courseType || "?"} · {r.expiryDate ? fmtDate(r.expiryDate) : "no expiry"}
                </span>
              ))}
            </div>
            {path.length > 1 && (
              <div className="tch-path">
                <span className="tch-path-l">Branch path</span>
                {path.map((b, i) => (
                  <React.Fragment key={`${b}-${i}`}>
                    {i > 0 && <span className="tch-path-arrow">→</span>}
                    <span className={`tch-path-b${i === path.length - 1 ? " now" : ""}`}>{b}</span>
                  </React.Fragment>
                ))}
              </div>
            )}
            {onTransfer && !emp.leftCompany && (
              <button type="button" className="tch-btn primary block" onClick={() => onTransfer(emp)}>
                ⇄ Transfer to another branch
              </button>
            )}
          </div>
        )}

        <div className="tch-tools">
          <div className="tch-tabs">
            {HISTORY_TABS.map(([v, t]) => {
              const n = v === "all" ? timeline.length : v === "status" ? (counts.left || 0) + (counts.restored || 0) + (counts.deleted || 0) : counts[v] || 0;
              return (
                <button key={v} type="button" className={tab === v ? "on" : ""} onClick={() => setTab(v)}>
                  {t} <em>{n}</em>
                </button>
              );
            })}
          </div>
          <input className="tch-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={mode === "all" ? "Search employee, branch, user…" : "Search the history…"} />
        </div>

        <div className="tch-timeline">
          {shown.length === 0 && <div className="tch-empty">{timeline.length ? "Nothing matches." : "No changes recorded yet. New edits, transfers and status changes appear here."}</div>}
          {shown.map((e) => {
            const m = EV_META[e.type] || EV_META.edit;
            return (
              <div key={`${e.id}-${e.empNo || ""}`} className="tch-ev">
                <div className="tch-ev-dot" style={{ background: m.color }}>
                  {m.icon}
                </div>
                <div className="tch-ev-body">
                  <div className="tch-ev-top">
                    <b>{evTitle(e)}</b>
                    <span className="tch-ev-when">{e.synthetic ? fmtDate(e.at) : fmtDateTime(e.at)}</span>
                  </div>
                  {mode === "all" && (
                    <button type="button" className="tch-ev-emp" onClick={() => onOpenEmployee && onOpenEmployee(e.empRow)}>
                      {e.empName || "—"} · #{e.empNo || "—"}
                    </button>
                  )}
                  {e.type === "transfer" && (
                    <div className="tch-ev-move">
                      <span>{e.fromBranch || "—"}</span>
                      <span className="tch-path-arrow">→</span>
                      <span className="now">{e.toBranch}</span>
                    </div>
                  )}
                  {(e.changes || []).length > 0 && (
                    <table className="tch-diff">
                      <tbody>
                        {e.changes.map((c, i) => (
                          <tr key={i}>
                            <td>{c.label}</td>
                            <td className="from">{c.from || "—"}</td>
                            <td className="ar">→</td>
                            <td className="to">{c.to || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {e.type === "created" && (
                    <div className="tch-ev-meta">
                      Issued {fmtDate(e.issueDate)} · Expires {e.expiryDate ? fmtDate(e.expiryDate) : "—"}
                    </div>
                  )}
                  <div className="tch-ev-meta">
                    {e.type === "transfer" && e.effectiveDate && <span>Effective {fmtDate(e.effectiveDate)}</span>}
                    {e.reason && <span>{e.reason}</span>}
                    {e.by && <span>by {e.by}</span>}
                    {e.synthetic && <span>before the change log started</span>}
                  </div>
                  {e.note && <div className="tch-ev-note">“{e.note}”</div>}
                  {(e.prevImageUrl || e.prevInstituteImageUrl) && (
                    <div className="tch-ev-links">
                      {e.prevImageUrl && (
                        <a href={e.prevImageUrl} target="_blank" rel="noreferrer">
                          📄 Previous certificate ↗
                        </a>
                      )}
                      {e.prevInstituteImageUrl && (
                        <a href={e.prevInstituteImageUrl} target="_blank" rel="noreferrer">
                          📄 Previous institute certificate ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function evTitle(e) {
  const c = e.course ? ` ${e.course}` : "";
  switch (e.type) {
    case "transfer":
      return "Transferred to another branch";
    case "edit":
      return `${(e.course || "Certificate").trim()} certificate edited`;
    case "left":
      return `Marked as left company${c ? ` (${e.course})` : ""}`;
    case "restored":
      return `Restored as active${c ? ` (${e.course})` : ""}`;
    case "created":
      return `${(e.course || "").trim() || "Certificate"} certificate added`;
    case "renewed":
      return `${(e.course || "").trim() || "Certificate"} certificate renewed`;
    case "deleted":
      return `${(e.course || "").trim() || "A"} certificate deleted`;
    case "branch_fix":
      return "Branch name standardised";
    default:
      return "Change";
  }
}

/* ===================== styles ===================== */
const FS = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const TCH_CSS = `
.tch.tch-overlay{position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.5);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Inter,"Segoe UI",Tahoma,Arial,sans-serif;color:#0f172a}
.tch.tch-overlay.right{justify-content:flex-end;padding:0}
.tch *{box-sizing:border-box}
.tch .tch-dlg{width:min(560px,100%);max-height:100%;background:#fff;border-radius:18px;box-shadow:0 30px 80px rgba(2,6,23,.45);display:flex;flex-direction:column;overflow:hidden}
.tch .tch-drawer{width:min(560px,100%);height:100%;background:#f8fafc;box-shadow:-20px 0 60px rgba(2,6,23,.35);display:flex;flex-direction:column;animation:tchIn .18s ease-out}
@keyframes tchIn{from{transform:translateX(30px);opacity:.4}to{transform:none;opacity:1}}
.tch .tch-head{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid #e2e8f0;background:#fff}
.tch .tch-logo{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#6366f1,#4338ca);color:#fff;flex:none;font-weight:800}
.tch .tch-logo.blue{background:linear-gradient(135deg,#3b82f6,#1d4ed8)}
.tch .tch-logo.orange{background:linear-gradient(135deg,#fb923c,#ea580c)}
.tch .tch-dlg.md{width:min(720px,100%)}
.tch .tch-renew{display:grid;grid-template-columns:1fr auto 1.2fr;gap:12px;align-items:center}
.tch .tch-rcard{border:1px solid #e2e8f0;border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;min-width:0}
.tch .tch-rcard.old{background:#fff}
.tch .tch-rcard.new{border-color:#fdba74;background:#fff7ed}
.tch .tch-rcard-h{font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.05em}
.tch .tch-rrow{display:flex;justify-content:space-between;gap:8px}
.tch .tch-rrow span{color:#64748b}
.tch .tch-rbadge{align-self:flex-start;padding:3px 10px;border-radius:999px;font-weight:800;border:1px solid}
.tch .tch-rcard.s-expired .tch-rbadge{background:#fee2e2;color:#b91c1c;border-color:#fecaca}
.tch .tch-rcard.s-expiring_soon .tch-rbadge{background:#ffedd5;color:#c2410c;border-color:#fed7aa}
.tch .tch-rcard.s-expiring .tch-rbadge{background:#fef9c3;color:#a16207;border-color:#fde68a}
.tch .tch-rcard.s-valid .tch-rbadge,.tch .tch-rcard.s-no_expiry .tch-rbadge{background:#dcfce7;color:#15803d;border-color:#bbf7d0}
.tch .tch-rnote{color:#64748b}
.tch .tch-rcard.old.s-expired,.tch .tch-rcard.old.s-expiring_soon,.tch .tch-rcard.old.s-expiring,.tch .tch-rcard.old.s-valid,.tch .tch-rcard.old.s-no_expiry{background:#fff;color:#0f172a;border-color:#e2e8f0}
.tch .tch-hintline{color:#9a3412}
.tch .tch-linkbtn{border:0;background:transparent;color:#c2410c;font-weight:700;cursor:pointer;padding:0;text-decoration:underline}
.tch .tch-slot{border:1.5px dashed #cbd5e1;border-radius:14px;padding:10px;background:#f8fafc;display:flex;flex-direction:column;gap:8px}
.tch .tch-slot.over{border-color:#ea580c;background:#fff7ed}
.tch .tch-slot.has{border-style:solid;border-color:#86efac;background:#f0fdf4}
.tch .tch-slot-h{font-weight:700;color:#334155}
.tch .tch-slot-h em{font-style:normal;margin-left:6px;padding:1px 7px;border-radius:999px;background:#ffedd5;color:#c2410c;font-weight:800}
.tch .tch-slot-h em.opt{background:#f1f5f9;color:#64748b}
.tch .tch-slot-drop{display:grid;place-items:center;min-height:96px;border-radius:10px;background:#fff;color:#64748b;font-weight:600;cursor:pointer;text-align:center;padding:10px}
.tch .tch-slot-drop:hover{color:#c2410c}
.tch .tch-slot-img{display:flex;gap:10px;align-items:center}
.tch .tch-slot-img img{width:120px;height:84px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;background:#fff}
.tch .tch-slot-act{display:flex;flex-direction:column;gap:6px}
.tch .tch-slot-act a{color:#2563eb;font-weight:700}
.tch .tch-slot-act button{border:1px solid #fecaca;background:#fff;color:#b91c1c;border-radius:8px;padding:4px 10px;font-weight:700;cursor:pointer}
.tch .tch-btn.orange{background:linear-gradient(135deg,#fb923c,#ea580c);border:0;color:#fff}
.tch .tch-ev-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.tch .tch-ev-links a{color:#2563eb;font-weight:700;text-decoration:none;padding:3px 8px;border-radius:7px;background:#eff6ff}
.tch .tch-grow{flex:1;min-width:0}
.tch .tch-title{font-weight:800}
.tch .tch-sub{color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tch .tch-x{width:36px;height:36px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;color:#475569;cursor:pointer;flex:none}
.tch .tch-pad{padding:18px 20px;overflow:auto;display:flex;flex-direction:column;gap:12px}
.tch .tch-move{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center}
.tch .tch-move-box{border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;background:#f8fafc;display:flex;flex-direction:column;gap:2px;min-width:0}
.tch .tch-move-box span{color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.tch .tch-move-box b{overflow-wrap:anywhere}
.tch .tch-move-box.to{border-color:#93c5fd;background:#eff6ff}
.tch .tch-move-box.to b{color:#1d4ed8}
.tch .tch-move-box.empty b{color:#94a3b8;font-weight:600}
.tch .tch-move-arrow{width:34px;height:34px;border-radius:50%;background:#2563eb;color:#fff;display:grid;place-items:center;font-weight:800}
.tch .tch-field{display:flex;flex-direction:column;gap:6px}
.tch .tch-field>span{font-weight:700;color:#475569}
.tch .tch-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tch .tch-input{width:100%;height:40px;padding:0 12px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;outline:none}
.tch .tch-input.area{height:auto;padding:9px 12px;resize:vertical;font-family:inherit}
.tch .tch-input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
.tch .tch-check{display:flex;align-items:center;gap:8px;font-weight:600;color:#334155;cursor:pointer}
.tch .tch-info{padding:10px 12px;border-radius:10px;background:#f1f5f9;color:#334155}
.tch .tch-err{padding:9px 12px;border-radius:10px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-weight:700}
.tch .tch-foot{display:flex;justify-content:flex-end;gap:10px;padding:12px 20px;border-top:1px solid #e2e8f0;background:#fff}
.tch .tch-btn{height:40px;padding:0 16px;border-radius:10px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;font-weight:700;cursor:pointer;white-space:nowrap}
.tch .tch-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff}
.tch .tch-btn.primary:hover{background:#1d4ed8}
.tch .tch-btn.block{width:100%;margin-top:12px}
.tch .tch-btn:disabled{opacity:.55;cursor:not-allowed}
.tch .tch-emp{padding:14px 20px;background:#fff;border-bottom:1px solid #e2e8f0}
.tch .tch-emp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 14px}
.tch .tch-emp-grid div{display:flex;flex-direction:column;gap:2px;min-width:0}
.tch .tch-emp-grid span{color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.tch .tch-emp-grid b{overflow-wrap:anywhere}
.tch .tch-emp-grid b.good{color:#047857}
.tch .tch-emp-grid b.bad{color:#b91c1c}
.tch .tch-certs{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.tch .tch-cert{padding:4px 10px;border-radius:999px;font-weight:700;border:1px solid}
.tch .s-expired{background:#fee2e2;color:#b91c1c;border-color:#fecaca}
.tch .s-expiring_soon{background:#ffedd5;color:#c2410c;border-color:#fed7aa}
.tch .s-expiring{background:#fef9c3;color:#a16207;border-color:#fde68a}
.tch .s-valid{background:#dcfce7;color:#15803d;border-color:#bbf7d0}
.tch .s-no_expiry{background:#f3f4f6;color:#6b7280;border-color:#e5e7eb}
.tch .tch-path{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:12px;padding:10px;border-radius:12px;background:#f8fafc;border:1px dashed #cbd5e1}
.tch .tch-path-l{font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.05em;width:100%}
.tch .tch-path-b{padding:3px 9px;border-radius:8px;background:#fff;border:1px solid #e2e8f0;font-weight:600}
.tch .tch-path-b.now,.tch .now{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;font-weight:800}
.tch .tch-path-arrow{color:#94a3b8;font-weight:800}
.tch .tch-tools{padding:12px 20px;display:flex;flex-direction:column;gap:10px;background:#fff;border-bottom:1px solid #e2e8f0}
.tch .tch-tabs{display:flex;gap:4px;background:#f1f5f9;padding:3px;border-radius:11px;overflow-x:auto}
.tch .tch-tabs button{border:0;background:transparent;padding:6px 11px;border-radius:9px;font-weight:700;color:#475569;cursor:pointer;white-space:nowrap}
.tch .tch-tabs button em{font-style:normal;color:#94a3b8;margin-left:3px}
.tch .tch-tabs button.on{background:#fff;color:#1d4ed8;box-shadow:0 1px 4px rgba(15,23,42,.12)}
.tch .tch-timeline{flex:1;overflow:auto;padding:16px 20px 30px;position:relative}
.tch .tch-ev{position:relative;display:flex;gap:12px;padding-bottom:16px}
.tch .tch-ev:not(:last-child)::before{content:"";position:absolute;left:15px;top:32px;bottom:0;width:2px;background:#e2e8f0}
.tch .tch-ev-dot{width:32px;height:32px;border-radius:50%;color:#fff;display:grid;place-items:center;font-weight:800;flex:none;box-shadow:0 0 0 4px #f8fafc}
.tch .tch-ev-body{flex:1;min-width:0;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px}
.tch .tch-ev-top{display:flex;gap:8px;align-items:baseline;justify-content:space-between;flex-wrap:wrap}
.tch .tch-ev-when{color:#64748b;white-space:nowrap}
.tch .tch-ev-emp{margin-top:4px;border:0;background:#eef2ff;color:#4338ca;font-weight:700;border-radius:7px;padding:2px 8px;cursor:pointer}
.tch .tch-ev-move{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px}
.tch .tch-ev-move span:not(.tch-path-arrow){padding:3px 9px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600}
.tch .tch-diff{width:100%;border-collapse:collapse;margin-top:8px}
.tch .tch-diff td{padding:4px 6px;border-top:1px solid #f1f5f9;vertical-align:top;overflow-wrap:anywhere}
.tch .tch-diff td:first-child{color:#64748b;font-weight:700;white-space:nowrap}
.tch .tch-diff .from{color:#b91c1c;text-decoration:line-through;text-decoration-color:#fca5a5}
.tch .tch-diff .to{color:#047857;font-weight:700}
.tch .tch-diff .ar{color:#94a3b8;width:16px}
.tch .tch-ev-meta{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:6px;color:#64748b}
.tch .tch-ev-note{margin-top:6px;padding:6px 10px;border-left:3px solid #c7d2fe;background:#f8fafc;color:#334155;font-style:italic}
.tch .tch-empty{padding:30px 10px;text-align:center;color:#94a3b8;font-weight:600}
@media (max-width:640px){.tch .tch-renew{grid-template-columns:1fr}}
@media (max-width:560px){.tch .tch-grid2,.tch .tch-emp-grid{grid-template-columns:1fr}.tch .tch-move{grid-template-columns:1fr}.tch .tch-move-arrow{transform:rotate(90deg);justify-self:center}}
#root .tch, #root .tch *{font-size:${FS(14)}}
#root .tch .tch-title{font-size:${FS(18)}}
#root .tch .tch-sub, #root .tch .tch-ev-when, #root .tch .tch-ev-meta, #root .tch .tch-diff td{font-size:${FS(13)}}
#root .tch .tch-move-box span, #root .tch .tch-emp-grid span, #root .tch .tch-path-l, #root .tch .tch-tabs em{font-size:${FS(11.5)}}
#root .tch .tch-cert, #root .tch .tch-path-b{font-size:${FS(12.5)}}
`;
