// src/components/NotificationManager.jsx
// مدير عام يفحص بشكل دوري:
// - يجلب الإعدادات العامّة (الأدمن) كل 15 دقيقة ويخزّنها كاش
// - يفحص انحرافات CCP الجديدة ويعرض إشعار متصفح
//
// The browser-side daily reminder and expiry scan were removed (Nov 2026):
// the server alerts do both now — 08:00 missed logs + expiries, e-mailed per
// branch (/alerts). Running them here too doubled the warnings and pulled
// every tracked report type into each admin browser.
import { useEffect } from "react";
import {
  fetchGlobalSettings,
  shouldRunCCPCheck,
  markCCPCheckRan,
  notifyCCPDeviation,
  markCCPDeviationNotified,
  isCCPDeviationNotified,
} from "../utils/notifications";
import API_BASE from "../config/api";

const REMINDER_CHECK_MS = 5 * 60_000;   // كل 5 دقائق (مخفّض لتقليل ضغط السيرفر)
const GLOBAL_REFRESH_MS = 15 * 60_000;  // كل 15 دقيقة

export default function NotificationManager() {
  useEffect(() => {
    let cancelled = false;

    /* ===== جلب الإعدادات العامّة (مرة الآن + دوريًا) ===== */
    /* التابات المخفية ما تعمل استعلامات — كل نداء بيصحّي داتابيس Neon من النوم
       وبيرفع فاتورة الـ compute. لما يرجع التاب ظاهر منحدّث فورًا. */
    const refreshGlobal = () => {
      if (cancelled || document.hidden) return;
      fetchGlobalSettings().catch(() => {});
    };
    refreshGlobal();
    const refreshId = setInterval(refreshGlobal, GLOBAL_REFRESH_MS);
    const onVisible = () => {
      if (!document.hidden) refreshGlobal();
    };
    document.addEventListener("visibilitychange", onVisible);

    const tick = () => {
      /* ===== 🆕 فحص دوري لانحرافات CCP ===== */
      /* بس لما التاب ظاهر — ما منعلّم markCCPCheckRan عند التخطي،
         فأول tick بعد رجوع التاب بيفحص فورًا. */
      try {
        if (!document.hidden && shouldRunCCPCheck()) {
          markCCPCheckRan();
          /* Only recent readings can be new deviations: a 7-day window (by the
             record's reportDate, filtered in SQL) instead of the whole log. */
          const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
          fetch(`${API_BASE}/api/reports?type=ccp_monitoring_record&from=${since}`, { cache: "no-store" })
            .then((r) => r.ok ? r.json() : [])
            .then((json) => {
              if (cancelled) return;
              const arr = Array.isArray(json) ? json : json?.data || [];
              // فقط آخر 50 سجل (نحتاج التحقق من الانحرافات الحديثة فقط)
              arr.sort((a, b) => {
                const da = a?.createdAt || a?.payload?.savedAt || "";
                const db = b?.createdAt || b?.payload?.savedAt || "";
                return da < db ? 1 : -1;
              });
              for (const it of arr.slice(0, 50)) {
                const p = it?.payload || {};
                if (p?.autoEval?.withinLimit !== false) continue; // ليس انحرافاً
                const id = it.id || it._id;
                if (!id || isCCPDeviationNotified(id)) continue;
                // أبلغ
                notifyCCPDeviation({
                  ccpName: p?.ccpSnapshot?.nameAr || p?.ccpSnapshot?.nameEn || p.ccpId,
                  reading: p?.reading?.value,
                  unit: p?.ccpSnapshot?.criticalLimit?.unit || "",
                  limit: p?.ccpSnapshot?.criticalLimit?.descAr || p?.ccpSnapshot?.criticalLimit?.descEn,
                  product: p?.product?.name,
                  batch: p?.product?.batch,
                  onClickUrl: "/haccp-iso/ccp-monitoring/view",
                });
                markCCPDeviationNotified(id);
              }
            })
            .catch(() => {});
        }
      } catch {}

    };
    tick();
    const tickId = setInterval(tick, REMINDER_CHECK_MS);

    return () => {
      cancelled = true;
      clearInterval(refreshId);
      clearInterval(tickId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
