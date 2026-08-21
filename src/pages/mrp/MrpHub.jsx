// src/pages/mrp/MrpHub.jsx
//
// 🏭 وحدة التصنيع — الصفحة الرئيسية: مؤشّرات سريعة + مدخلَي الشاشتين.
//
// الوحدة صفحتين فقط: الأصناف والمواد · قوائم التقطيع (BOM).

import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import {
  MRP_PAGES, S, CSS, Kpi, canOpenMrp,
} from "./mrpUi";
import { activeOnly, useMrpConfig } from "./mrpApi";

export default function MrpHub() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  const { cfg, loading } = useMrpConfig();

  const pages = MRP_PAGES.filter((p) => canOpenMrp(p.id));

  const stats = useMemo(() => {
    const items = cfg.items || [];
    const boms = cfg.boms || [];
    return {
      items: activeOnly(items).length,
      itemsOff: items.length - activeOnly(items).length,
      boms: activeOnly(boms).length,
      bomsOff: boms.length - activeOnly(boms).length,
      pathways: boms.reduce((s, b) => s + (b.pathways || []).length, 0),
    };
  }, [cfg]);

  return (
    <div dir={dir} className="mrp" style={S.page}>
      <style>{CSS}</style>

      <header style={S.top}>
        <div style={S.topStart}>
          <span style={S.topIcon}>🏭</span>
          <div style={{ minWidth: 0 }}>
            <div className="mrp-title" style={S.title}>
              {t({ en: "Manufacturing — BOM", ar: "التصنيع — قائمة المواد" })}
            </div>
            <div className="mrp-sub" style={S.sub}>
              {t({
                en: "Master items and the cutting BOMs the butchery kiosk runs on",
                ar: "سجل الأصناف وقوائم التقطيع اللي بيشتغل عليها كشك الملحمة",
              })}
            </div>
          </div>
        </div>
        <div style={S.topActions}>
          <LangToggle lang={lang} toggle={toggle} style={S.langBtn} />
          <button type="button" style={S.btn} onClick={() => navigate("/named-dashboard")}>
            {t({ en: "Home", ar: "الرئيسية" })}
          </button>
        </div>
      </header>

      <div style={{ ...S.main, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
        <div style={S.kpiRow}>
          <Kpi
            label={t({ en: "Active items", ar: "أصناف مفعّلة" })}
            value={stats.items}
            foot={stats.itemsOff
              ? `${stats.itemsOff} ${t({ en: "inactive", ar: "معطّل" })}`
              : undefined}
          />
          <Kpi
            label={t({ en: "Active BOMs", ar: "قوائم تقطيع مفعّلة" })}
            value={stats.boms}
            foot={stats.bomsOff
              ? `${stats.bomsOff} ${t({ en: "inactive", ar: "معطّلة" })}`
              : undefined}
          />
          <Kpi
            label={t({ en: "Pathways", ar: "المسارات" })}
            value={stats.pathways}
            foot={t({ en: "across all BOMs", ar: "بكل القوائم" })}
          />
        </div>

        {loading && (
          <div style={S.note}>{t({ en: "Loading…", ar: "جارٍ التحميل…" })}</div>
        )}

        <div style={S.grid}>
          {pages.map((p) => (
            <button
              key={p.id}
              type="button"
              style={cardStyle}
              onClick={() => navigate(p.to)}
            >
              <span style={iconStyle}>{p.icon}</span>
              <span style={{ fontWeight: 900, fontSize: 19 }}>{isAr ? p.ar : p.en}</span>
              <span style={{ ...S.hint, textAlign: "center" }}>{isAr ? p.arSub : p.enSub}</span>
            </button>
          ))}
        </div>

        {pages.length === 0 && (
          <div style={S.empty}>
            {t({
              en: "You do not have access to any manufacturing page.",
              ar: "لا توجد صلاحية لأي صفحة في وحدة التصنيع.",
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = {
  background: "#fff", border: "1px solid #e3edf7", borderRadius: 20,
  padding: "26px 16px", display: "flex", flexDirection: "column",
  alignItems: "center", gap: 9, cursor: "pointer", fontFamily: "inherit",
  color: "#0f2740", boxShadow: "0 10px 26px rgba(15,39,64,.05)",
};

const iconStyle = {
  width: 74, height: 74, borderRadius: 22, display: "grid", placeItems: "center",
  fontSize: 34, background: "linear-gradient(135deg,#0f766e,#115e59)", color: "#fff",
  marginBottom: 4,
};
