// src/pages/mrp/MrpHub.jsx
//
// 🏭 وحدة التصنيع — الصفحة الرئيسية: مؤشّرات سريعة + مداخل الشاشات الخمس.

import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import {
  MRP_PAGES, S, CSS, Kpi, canOpenMrp,
} from "./mrpUi";
import {
  WO_TYPE, MOVE_TYPE, activeOnly, money, reorderAlerts, useMrpConfig, useRecords, woCost,
} from "./mrpApi";

export default function MrpHub() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  const { cfg, loading } = useMrpConfig();
  const { rows: workOrders } = useRecords(WO_TYPE);
  const { rows: moves } = useRecords(MOVE_TYPE);

  const pages = MRP_PAGES.filter((p) => canOpenMrp(p.id));

  const stats = useMemo(() => {
    const open = workOrders.filter((w) => w.status === "confirmed").length;
    const done = workOrders.filter((w) => w.status === "done");
    const producedValue = done.reduce((s, w) => s + woCost(w).total, 0);
    return {
      items: activeOnly(cfg.items).length,
      boms: activeOnly(cfg.boms).length,
      open,
      done: done.length,
      producedValue,
      alerts: reorderAlerts(cfg, workOrders, moves).length,
    };
  }, [cfg, workOrders, moves]);

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
                en: "Components, bills of materials, work orders and cost analytics",
                ar: "المكوّنات وقوائم المواد وأوامر التصنيع وتحليل التكاليف",
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
          <Kpi label={t({ en: "Active items", ar: "أصناف مفعّلة" })} value={stats.items} />
          <Kpi label={t({ en: "Active BOMs", ar: "قوائم مواد" })} value={stats.boms} />
          <Kpi
            label={t({ en: "Work orders in progress", ar: "أوامر قيد التصنيع" })}
            value={stats.open}
            color={stats.open ? "#b45309" : undefined}
          />
          <Kpi
            label={t({ en: "Low stock alerts", ar: "تنبيهات نفاد" })}
            value={stats.alerts}
            color={stats.alerts ? "#a12626" : "#047857"}
          />
          <Kpi
            label={t({ en: "Produced value", ar: "قيمة الإنتاج" })}
            value={money(stats.producedValue, 0)}
            foot={`AED · ${stats.done} ${t({ en: "finished orders", ar: "أمر منتهي" })}`}
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
