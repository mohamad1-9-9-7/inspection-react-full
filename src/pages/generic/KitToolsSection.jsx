// src/pages/generic/KitToolsSection.jsx
// The rest of a kit company's home cards (OHC, external certificates — Settings
// is a hero-bar button) in the same grouped look as Daily Reports, plus —
// on a free trial only — the locked "more with a subscription" modules.

import React from "react";
import { HomeSection, HomeGroup, OpenCard, LockedCard } from "./HomeSection";
import { LOCKED_CARDS } from "../trial/LockedCards";

const firstHex = (s) => (String(s || "").match(/#[0-9a-f]{6}/i) || [])[0];

export default function KitToolsSection({ cards, showLocked, Two, accent, onOpen }) {
  const groups = [
    {
      id: "certs", icon: "🎓", color: "#7c3aed", label: "Certificates", labelAr: "الشهادات",
      items: cards.filter((c) => c.kind === "pair"),
    },
    {
      id: "company", icon: "🏢", color: "#475569", label: "Company", labelAr: "الشركة",
      items: cards.filter((c) => c.kind !== "pair"),
    },
  ].filter((g) => g.items.length);

  let n = 0;
  return (
    <HomeSection
      Two={Two}
      icon="🧰"
      logoBg="linear-gradient(135deg,#7c3aed,#475569)"
      bg="linear-gradient(180deg,#faf5ff 0%,#fff 46%)"
      title="Certificates & Tools"
      titleAr="الشهادات والأدوات"
      sub="Staff health cards, external certificates and company settings"
      subAr="البطاقات الصحية للموظفين والشهادات الخارجية وإعدادات الشركة"
    >
      {groups.map((g) => (
        <HomeGroup key={g.id} Two={Two} icon={g.icon} color={g.color} label={g.label} labelAr={g.labelAr} count={g.items.length}>
          {g.items.map((c) => (
            <OpenCard
              key={c.id}
              item={c}
              color={firstHex(c.grad) || g.color}
              accent={accent}
              index={n++}
              onOpen={() => onOpen(c)}
            />
          ))}
        </HomeGroup>
      ))}
      {showLocked && (
        <HomeGroup Two={Two} icon="🔒" color="#64748b" label="More with a subscription" labelAr="المزيد مع الاشتراك" count={LOCKED_CARDS.length}>
          {LOCKED_CARDS.map((c) => (
            <LockedCard
              key={c.id}
              item={{ ...c, desc: "Daily checks, records and reports for every branch, ready for any inspection.", descAr: "فحوصات وسجلات وتقارير يومية لكل فرع." }}
              color={firstHex(c.grad) || "#64748b"}
              accent={accent}
              index={n++}
              Two={Two}
            />
          ))}
        </HomeGroup>
      )}
    </HomeSection>
  );
}
