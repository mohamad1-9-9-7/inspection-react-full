// src/pages/workforce/WorkforceLog.jsx
//
// 🕰️ سجل الحركة — كل نقل وكل تغيير حالة، مين عملو وإيمتى وليش.
// السجل غير قابل للتعديل من الواجهة عمداً: قيمته الوحيدة أنه لا يُلمس.

import React, { useMemo, useState } from "react";
import { ROLES, personName, siteLabel, transferLog } from "./workforceConfig";
import { Btn, C, Card, Chip, Empty, Input, SectionHead, Select } from "./workforceUi";

const KIND = {
  transfer: { ar: "نقل",  en: "Transfer", bg: "#f5f3ff", fg: "#6d28d9", bd: "#ddd6fe", icon: "🔀" },
  status:   { ar: "حالة", en: "Status",   bg: "#fffbeb", fg: "#b45309", bd: "#fde68a", icon: "⏸️" },
};

const STATUS_LABEL = {
  active:    { ar: "نشط",   en: "Active" },
  suspended: { ar: "موقوف", en: "Suspended" },
  left:      { ar: "مغادر", en: "Left" },
};

export default function WorkforceLog({ scope, t, isAr }) {
  const { wf } = scope;

  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [days, setDays] = useState("90");

  const rows = useMemo(() => {
    const all = transferLog(wf);
    const cut = days === "all"
      ? ""
      : new Date(Date.now() - Number(days) * 864e5).toISOString();
    const needle = q.trim().toLowerCase();

    return all.filter((h) => {
      if (kind && h.kind !== kind) return false;
      if (cut && String(h.at) < cut) return false;
      if (needle) {
        const hay = `${h.empNo} ${h.name} ${h.nameEn} ${h.reason || ""} ${h.by || ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [wf, q, kind, days]);

  const label = (code) => (STATUS_LABEL[code] ? (isAr ? STATUS_LABEL[code].ar : STATUS_LABEL[code].en) : siteLabel(wf, code, isAr));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <SectionHead
        icon="🕰️"
        title={t({ en: "Movement log", ar: "سجل الحركة" })}
        sub={t({
          en: "Every transfer and status change, with who did it and why. Read-only by design.",
          ar: "كل نقل وكل تغيير حالة، مع مين عملو وليش. غير قابل للتعديل عمداً.",
        })}
      />

      <Card style={{ padding: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t({ en: "Search name, number, reason…", ar: "بحث بالاسم أو الرقم أو السبب…" })}
          style={{ flex: "1 1 240px", width: "auto" }}
        />
        <Select value={kind} onChange={(e) => setKind(e.target.value)} style={{ width: "auto", minWidth: 130 }}>
          <option value="">{t({ en: "All events", ar: "كل الحركات" })}</option>
          <option value="transfer">{t({ en: "Transfers", ar: "النقل" })}</option>
          <option value="status">{t({ en: "Status changes", ar: "تغيير الحالة" })}</option>
        </Select>
        <Select value={days} onChange={(e) => setDays(e.target.value)} style={{ width: "auto", minWidth: 130 }}>
          <option value="30">{t({ en: "Last 30 days", ar: "آخر ٣٠ يوم" })}</option>
          <option value="90">{t({ en: "Last 90 days", ar: "آخر ٩٠ يوم" })}</option>
          <option value="365">{t({ en: "Last year", ar: "آخر سنة" })}</option>
          <option value="all">{t({ en: "All time", ar: "الكل" })}</option>
        </Select>
        {(q || kind) && (
          <Btn onClick={() => { setQ(""); setKind(""); }}>✕ {t({ en: "Clear", ar: "مسح" })}</Btn>
        )}
        <Chip bg="#eef4fb" fg={C.mute} style={{ marginInlineStart: "auto" }}>
          {rows.length} {t({ en: "events", ar: "حركة" })}
        </Chip>
      </Card>

      {rows.length === 0 ? (
        <Empty
          icon="🕰️"
          title={t({ en: "Nothing logged yet", ar: "ما في حركات بعد" })}
          sub={t({
            en: "Transfers and suspensions show up here the moment they happen.",
            ar: "النقل والإيقاف بيظهروا هون أول ما يصيروا.",
          })}
        />
      ) : (
        <Card style={{ display: "grid", gap: 8 }}>
          {rows.map((h, i) => {
            const k = KIND[h.kind] || KIND.transfer;
            const role = ROLES.find((r) => r.id === h.role);
            return (
              <div
                key={`${h.personId}-${h.at}-${i}`}
                className="wf-row"
                style={{
                  display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
                  border: `1px solid ${C.lineSoft}`, borderRadius: 12, padding: "11px 12px",
                }}
              >
                <Chip bg={k.bg} fg={k.fg} bd={k.bd}>{k.icon} {isAr ? k.ar : k.en}</Chip>

                <div style={{ minWidth: 140 }}>
                  <div style={{ fontWeight: 900 }}>
                    {role?.icon} {personName(h, isAr)}
                  </div>
                  <div className="wf-lbl" style={{ color: C.faint, fontWeight: 800 }}>#{h.empNo}</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {h.from && <span style={{ fontWeight: 800, color: C.mute }}>{label(h.from)}</span>}
                  {h.from && h.to && <span style={{ color: C.faint, fontWeight: 900 }}>→</span>}
                  {h.to && <span style={{ fontWeight: 900 }}>{label(h.to)}</span>}
                </div>

                {h.reason && (
                  <span className="wf-sub" style={{ color: C.mute, fontWeight: 700, flex: "1 1 160px" }}>
                    « {h.reason} »
                  </span>
                )}

                <span
                  className="wf-lbl"
                  style={{ marginInlineStart: "auto", color: C.faint, fontWeight: 800, whiteSpace: "nowrap" }}
                >
                  {String(h.at).slice(0, 16).replace("T", " ")} · {h.by}
                </span>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
