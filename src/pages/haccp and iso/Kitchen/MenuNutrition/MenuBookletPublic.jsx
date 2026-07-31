// src/pages/haccp and iso/Kitchen/MenuNutrition/MenuBookletPublic.jsx
// 🔗 Public, login-free nutrient booklet — this is the page the menu QR code
// opens for guests. Read-only; shows only items that have complete data.

import React, { useEffect, useMemo, useState } from "react";
import { HaccpLangToggle } from "../../_shared/haccpI18n";
import { useKitchenLang } from "../kitchenI18n";
import { BASE_FONT_PX, Btn, FS, UI, card, layout, muted, shell } from "../kitchenUI";
import { itemStatus } from "./nutritionCalc";
import { loadItems } from "./menuStore";
import NutritionBooklet from "./NutritionBooklet";

export default function MenuBookletPublic() {
  const { t, lang, toggle, dir } = useKitchenLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadItems()
      .then((list) => alive && setItems(list))
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Guests should never see half-filled or inconsistent panels.
  const published = useMemo(
    () => items.filter((it) => itemStatus(it).status === "complete"),
    [items]
  );

  return (
    <main style={shell(dir, BASE_FONT_PX)}>
      <style>{`
        @media print {
          .kt-noprint { display: none !important; }
          .mn-panel, .mn-group { page-break-inside: avoid; }
        }
      `}</style>

      <div style={{ ...layout, width: "min(1180px, 100%)" }}>
        <header style={S.header}>
          <div>
            <div style={S.brandEn} dir="ltr">
              Bbayti Restaurant
            </div>
            <div style={S.brandAr} dir="rtl">
              مطعم بيتي
            </div>
          </div>
          <div className="kt-noprint" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <Btn variant="primary" onClick={() => window.print()}>
              {t("print")}
            </Btn>
          </div>
        </header>

        <div style={S.paper}>
          {loading && <div style={muted}>{t("loading")}</div>}
          {!loading && failed && <div style={muted}>{t("noData")}</div>}
          {!loading && !failed && (
            <NutritionBooklet items={published} t={t} heading={t("bookletHeading")} />
          )}
        </div>
      </div>
    </main>
  );
}

const S = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    padding: "20px 24px",
    background: UI.surface,
    borderRadius: UI.r.lg,
    border: `1px solid ${UI.line}`,
    boxShadow: UI.shadow.card,
    marginBottom: 20,
  },
  brandEn: { fontSize: FS.md, fontWeight: 900, color: UI.ink },
  brandAr: { fontSize: FS.sm, fontWeight: 800, color: UI.inkSoft, marginTop: 3 },
  paper: { ...card, padding: "clamp(18px, 2.4vw, 34px)", marginBottom: 0 },
};
