// src/pages/monitor/branches/pos6/POS6CoolersTemperatureInput.jsx
//
// Temperature log where the branch decides its own layout: chillers and
// freezers are added one by one (every other branch hard-codes its unit list),
// and the reading times are editable too, because POS 6 has not settled on a
// round yet. Each unit carries its kind, so the accepted range and the
// out-of-range flagging follow the unit rather than a name-matching guess.
import React, { useEffect, useMemo, useRef, useState } from "react";
import PRDReportHeader from "../production/_shared/PRDReportHeader";
import { useLang } from "./pos6I18n";
import { BRANCH, TYPES, todayISO, useSaveReport } from "./pos6Api";
import FormShell, { GuidanceNote, SaveBar, SignatureFooter } from "../_shared/BranchFormShell";
import { GUIDANCE } from "./pos6Guidance";

/* Accepted range per unit kind. `max: null` means "no upper bound". */
export const RANGES = {
  chiller: { min: 0, max: 5, label: "0 °C … +5 °C" },
  freezer: { min: null, max: -18, label: "≤ −18 °C" },
};

const DEFAULT_SLOTS = ["08:00", "11:00", "14:00", "17:00", "20:00", "22:00"];

/* ── Local draft ───────────────────────────────────────────
   This sheet is filled across a whole shift, a reading at a time, so a closed
   tab or a reloaded browser at 4 PM would otherwise throw away the morning.
   The draft is a scratch copy on this device only: the server record is still
   the only one that counts, and it is deleted the moment a save succeeds. It
   is scoped to its report date, so yesterday's leftovers never bleed into
   today's sheet. */
const DRAFT_KEY = "pos6_coolers_draft_v1";

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const d = raw ? JSON.parse(raw) : null;
    return d && d.reportDate === todayISO() ? d : null;
  } catch {
    return null;
  }
}

function writeDraft(draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* quota — the server save still works */ }
}

function dropDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

let unitSeq = 0;
const makeUnit = (kind, name) => ({
  uid: `u${++unitSeq}`,
  kind,
  name,
  temps: {},
  remarks: "",
});

/** A reading outside its unit's range. Blank and non-numeric are not failures. */
export function isOutOfRange(kind, value) {
  const n = Number(value);
  if (value === "" || value === null || value === undefined || Number.isNaN(n)) return false;
  const r = RANGES[kind] || RANGES.chiller;
  if (r.min !== null && n < r.min) return true;
  if (r.max !== null && n > r.max) return true;
  return false;
}

export default function POS6CoolersTemperatureInput() {
  const { t, dir, isAr } = useLang();
  const { saving, opMsg, save } = useSaveReport();

  const draft = useRef(readDraft()).current;

  const [date, setDate] = useState(() => draft?.reportDate || todayISO());
  const [slots, setSlots] = useState(() => draft?.slots || DEFAULT_SLOTS);
  const [units, setUnits] = useState(() =>
    draft?.units?.length
      ? draft.units.map((u) => ({ ...u, uid: `${++unitSeq}` }))
      : [makeUnit("chiller", "Chiller 1")]
  );
  const [checkedBy, setCheckedBy] = useState(() => draft?.checkedBy || "");
  const [verifiedBy, setVerifiedBy] = useState(() => draft?.verifiedBy || "");
  const [draftAt, setDraftAt] = useState(() => draft?.at || null);
  const [restored, setRestored] = useState(Boolean(draft));

  /* Keep the draft a step behind the keystrokes rather than on every one. */
  useEffect(() => {
    const id = setTimeout(() => {
      writeDraft({
        reportDate: date,
        slots,
        units: units.map(({ uid, ...u }) => u),
        checkedBy,
        verifiedBy,
        at: Date.now(),
      });
      setDraftAt(Date.now());
    }, 600);
    return () => clearTimeout(id);
  }, [date, slots, units, checkedBy, verifiedBy]);

  const discardDraft = () => {
    dropDraft();
    setSlots(DEFAULT_SLOTS);
    setUnits([makeUnit("chiller", "Chiller 1")]);
    setCheckedBy("");
    setVerifiedBy("");
    setDraftAt(null);
    setRestored(false);
  };

  /* ── units ── */
  const addUnit = (kind) =>
    setUnits((prev) => {
      const n = prev.filter((u) => u.kind === kind).length + 1;
      const label = kind === "freezer" ? "Freezer" : "Chiller";
      return [...prev, makeUnit(kind, `${label} ${n}`)];
    });

  const removeUnit = (uid) => setUnits((prev) => prev.filter((u) => u.uid !== uid));

  const setUnitField = (uid, field, value) =>
    setUnits((prev) => prev.map((u) => (u.uid === uid ? { ...u, [field]: value } : u)));

  const setTemp = (uid, slot, value) =>
    setUnits((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, temps: { ...u.temps, [slot]: value } } : u))
    );

  /* ── time slots ── */
  const addSlot = () =>
    setSlots((prev) => {
      const next = `${String(6 + prev.length).padStart(2, "0")}:00`;
      return prev.includes(next) ? [...prev, ""] : [...prev, next];
    });

  const renameSlot = (idx, value) =>
    setSlots((prev) => prev.map((s, i) => (i === idx ? value : s)));

  const removeSlot = (idx) => {
    const slot = slots[idx];
    setSlots((prev) => prev.filter((_, i) => i !== idx));
    setUnits((prev) =>
      prev.map((u) => {
        const { [slot]: _dropped, ...rest } = u.temps;
        return { ...u, temps: rest };
      })
    );
  };

  /* ── stats ── */
  const stats = useMemo(() => {
    let readings = 0;
    let out = 0;
    let sum = 0;
    units.forEach((u) => {
      slots.forEach((s) => {
        const v = u.temps[s];
        const n = Number(v);
        if (v === "" || v === undefined || Number.isNaN(n)) return;
        readings += 1;
        sum += n;
        if (isOutOfRange(u.kind, v)) out += 1;
      });
    });
    return {
      readings,
      out,
      avg: readings ? (sum / readings).toFixed(1) : "—",
    };
  }, [units, slots]);

  const handleSave = async () => {
    if (!date) return alert("⚠️ " + t("hdr_report_date"));
    if (stats.readings === 0) return alert("⚠️ " + t("cl_req_unit"));
    if (!checkedBy.trim() || !verifiedBy.trim())
      return alert("⚠️ " + t("sig_checked_by") + " / " + t("sig_verified_by"));

    const ok = await save(TYPES.coolers, {
      branch: BRANCH,
      reportDate: date,
      slots,
      // uid is a client-side key only — it has no meaning once stored.
      units: units.map(({ uid, ...unit }) => unit),
      summary: stats,
      checkedBy,
      verifiedBy,
    });

    // The server now holds the day; the scratch copy has nothing left to protect.
    if (ok) {
      dropDraft();
      setDraftAt(null);
      setRestored(false);
    }
  };

  const alignStart = isAr ? "right" : "left";
  const draftTime = draftAt
    ? new Date(draftAt).toLocaleTimeString(isAr ? "ar-AE" : "en-GB", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <FormShell dir={dir}>
      <PRDReportHeader
        title="Coolers Temperatures"
        titleAr="سجل درجات حرارة البرادات"
        subtitle={t("cl_subtitle")}
        accent="#0284c7"
        fields={[
          { labelKey: "hdr_document_no", value: "FSMS/BR/F04" },
          { labelKey: "hdr_revision_no", value: "0" },
          { label: t("hdr_branch"),      value: BRANCH },
          { label: `${t("cl_chiller")} — ${t("cl_range")}`, value: RANGES.chiller.label },
          { label: `${t("cl_freezer")} — ${t("cl_range")}`, value: RANGES.freezer.label },
          { labelKey: "hdr_report_date", type: "date", value: date, onChange: setDate },
        ]}/>

      <GuidanceNote isAr={isAr} accent="#0284c7" items={GUIDANCE.coolers} />

      {draftAt && (
        <div className="ph-draft">
          <span className="ph-draft-dot" />
          <span className="ph-draft-text">
            <b>{restored ? t("dr_restored") : t("dr_saved")}</b>
            {draftTime ? " · " + draftTime : ""}
            <span className="ph-draft-note">{t("dr_note")}</span>
          </span>
          <button onClick={discardDraft} className="ph-btn ph-btn-ghost">
            {t("dr_discard")}
          </button>
        </div>
      )}

      <div className="ph-toolbar">
        <div className="ph-toolbar-note">{t("cl_subtitle")}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => addUnit("chiller")} className="ph-btn ph-btn-soft">
            + {t("cl_add_chiller")}
          </button>
          <button onClick={() => addUnit("freezer")} className="ph-btn ph-btn-amber">
            + {t("cl_add_freezer")}
          </button>
          <button onClick={addSlot} className="ph-btn ph-btn-ghost">
            + {t("cl_add_slot")}
          </button>
        </div>
      </div>

      <div className="ph-stats">
        <div className="ph-stat">
          <div className="ph-stat-label">{t("cl_unit")}</div>
          <div className="ph-stat-value">{units.length}</div>
        </div>
        <div className="ph-stat">
          <div className="ph-stat-label">{t("cl_readings")}</div>
          <div className="ph-stat-value">{stats.readings}</div>
        </div>
        <div className="ph-stat">
          <div className="ph-stat-label">{t("cl_avg")}</div>
          <div className="ph-stat-value">{stats.avg}</div>
        </div>
        <div className={`ph-stat ${stats.out ? "ph-stat-bad" : ""}`}>
          <div className="ph-stat-label">{t("cl_out_of_range")}</div>
          <div className="ph-stat-value">{stats.out}</div>
        </div>
      </div>

      {units.length === 0 ? (
        <div className="ph-empty">{t("cl_no_units")}</div>
      ) : (
        <div className="ph-table-wrap ph-scroll-x">
          <table className="ph-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>{t("ph_col_no")}</th>
                <th style={{ minWidth: 210, textAlign: alignStart }}>{t("cl_unit")}</th>
                {slots.map((slot, idx) => (
                  <th key={idx} style={{ minWidth: 104 }}>
                    <input
                      type="time"
                      value={slot}
                      onChange={(e) => renameSlot(idx, e.target.value)}
                      className="ph-input"
                      style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.25)" }}/>
                    <button
                      onClick={() => removeSlot(idx)}
                      className="ph-btn-icon ph-btn-danger no-print"
                      title={t("cl_remove_slot")}
                      style={{ marginTop: 4, width: 22, height: 20, fontSize: 13 }}
                      disabled={slots.length === 1}>
                      ×
                    </button>
                  </th>
                ))}
                <th style={{ minWidth: 200, textAlign: alignStart }}>{t("cl_remarks")}</th>
                <th style={{ width: 52 }} className="no-print" />
              </tr>
            </thead>
            <tbody>
              {units.map((u, i) => (
                <tr key={u.uid}>
                  <td className="ph-num">{i + 1}</td>
                  <td>
                    <div className="ph-unit-name">
                      <span className={`ph-tag ph-tag-${u.kind}`}>
                        {u.kind === "freezer" ? t("cl_freezer") : t("cl_chiller")}
                      </span>
                      <input
                        type="text"
                        value={u.name}
                        onChange={(e) => setUnitField(u.uid, "name", e.target.value)}
                        className="ph-input"/>
                    </div>
                  </td>

                  {slots.map((slot, idx) => {
                    const v = u.temps[slot] ?? "";
                    const bad = isOutOfRange(u.kind, v);
                    return (
                      <td key={idx}>
                        <input
                          type="number"
                          step="0.1"
                          value={v}
                          onChange={(e) => setTemp(u.uid, slot, e.target.value)}
                          className={`ph-input ph-temp ${bad ? "ph-temp-bad" : ""}`}
                          title={bad ? `${t("cl_out_of_range")} — ${RANGES[u.kind].label}` : ""}
                          placeholder="°C"/>
                      </td>
                    );
                  })}

                  <td>
                    <input
                      type="text"
                      value={u.remarks}
                      onChange={(e) => setUnitField(u.uid, "remarks", e.target.value)}
                      className="ph-input"
                      placeholder={t("ph_optional")}/>
                  </td>
                  <td className="no-print">
                    <button
                      onClick={() => removeUnit(u.uid)}
                      className="ph-btn-icon ph-btn-danger"
                      title={t("btn_remove")}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SignatureFooter
        t={t}
        checkedBy={checkedBy}
        setCheckedBy={setCheckedBy}
        verifiedBy={verifiedBy}
        setVerifiedBy={setVerifiedBy}/>
      <SaveBar t={t} opMsg={opMsg} saving={saving} onSave={handleSave} />
    </FormShell>
  );
}
