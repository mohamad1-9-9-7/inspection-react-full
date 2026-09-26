// src/components/NotificationManager.jsx
// مدير عام يفحص بشكل دوري:
// - يجلب الإعدادات العامّة (الأدمن) كل 5 دقائق ويخزّنها كاش
// - يفحص كل دقيقة هل حان وقت التذكير اليومي ويرسله
// - يفحص كل دقيقة هل حان وقت تنبيه انتهاء الصلاحية ويرسله
import { useEffect } from "react";
import {
  getEffectiveSettings,
  sendNotification,
  shouldFireDailyReminderNow,
  markReminderFired,
  shouldFireExpiryAlertNow,
  markExpiryAlertFired,
  fetchGlobalSettings,
  isAdminUser,
  shouldRunCCPCheck,
  markCCPCheckRan,
  notifyCCPDeviation,
  markCCPDeviationNotified,
  isCCPDeviationNotified,
} from "../utils/notifications";
import { scanExpiry, summarize, pickAlertable } from "../utils/expiryTracker";
import API_BASE from "../config/api";

const REMINDER_CHECK_MS = 5 * 60_000;   // كل 5 دقائق (مخفّض لتقليل ضغط السيرفر)
const GLOBAL_REFRESH_MS = 15 * 60_000;  // كل 15 دقيقة

export default function NotificationManager() {
  useEffect(() => {
    let cancelled = false;
    let scanRunning = false;

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

    /* ===== فحص التذكير اليومي ===== */
    const tick = () => {
      try {
        if (shouldFireDailyReminderNow()) {
          const s = getEffectiveSettings();
          const ok = sendNotification("📋 تذكير يومي", {
            body: s.dailyReminderMessage || "ما تنسى تعبّي تقارير اليوم",
            tag: "daily-reminder",
          });
          if (ok) markReminderFired();
        }
      } catch {}

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

      /* ===== فحص تنبيه انتهاء الصلاحية ===== */
      try {
        /* Hidden tabs never scan: the scan pulls every tracked type with its
           full payload, and each call wakes Neon. The next visible tick runs it. */
        if (!scanRunning && !document.hidden && shouldFireExpiryAlertNow()) {
          // التنبيه يصل للأدمن فقط (تجنّب إزعاج المستخدمين)
          if (!isAdminUser()) return;
          scanRunning = true;
          const s = getEffectiveSettings();
          const enabledTypes = Object.entries(s.expiryEntities || {})
            .filter(([, on]) => on)
            .map(([t]) => t);
          const threshold = Number(s.expiryThresholdDays) || 30;
          scanExpiry({
            thresholds: {
              expired: 0,
              expiringSoon: threshold,
              expiring: Math.max(90, threshold * 3),
            },
            enabledTypes: enabledTypes.length ? enabledTypes : null,
            useCache: false,
          })
            .then((items) => {
              if (cancelled) return;
              const alertable = pickAlertable(items, threshold);
              if (!alertable.length) {
                markExpiryAlertFired();
                return;
              }
              const summary = summarize(alertable);
              const body =
                `منتهية: ${summary.expired} · ` +
                `قريبة الانتهاء: ${summary.expiringSoon + summary.expiring} ` +
                `(خلال ${threshold} يوم)`;
              sendNotification("⏰ تنبيه انتهاء صلاحية", {
                body,
                tag: "expiry-alert",
                onClickUrl: "/admin/expiry-center",
              });
              /* The day's scan is done whether or not the browser could show
                 the notification. Marking only on success meant a browser
                 without notification permission re-ran the full scan every
                 5 minutes until midnight — a retry can't grant a permission.
                 The results stay visible in the Expiry Center. */
              markExpiryAlertFired();
            })
            .catch(() => {})
            .finally(() => {
              scanRunning = false;
            });
        }
      } catch {
        scanRunning = false;
      }
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
