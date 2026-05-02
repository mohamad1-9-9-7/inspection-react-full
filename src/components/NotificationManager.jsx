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
} from "../utils/notifications";
import { scanExpiry, summarize, pickAlertable } from "../utils/expiryTracker";

const REMINDER_CHECK_MS = 60_000;       // كل دقيقة
const GLOBAL_REFRESH_MS = 5 * 60_000;   // كل 5 دقائق

export default function NotificationManager() {
  useEffect(() => {
    let cancelled = false;
    let scanRunning = false;

    /* ===== جلب الإعدادات العامّة (مرة الآن + دوريًا) ===== */
    const refreshGlobal = () => {
      if (cancelled) return;
      fetchGlobalSettings().catch(() => {});
    };
    refreshGlobal();
    const refreshId = setInterval(refreshGlobal, GLOBAL_REFRESH_MS);

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

      /* ===== فحص تنبيه انتهاء الصلاحية ===== */
      try {
        if (!scanRunning && shouldFireExpiryAlertNow()) {
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
              const ok = sendNotification("⏰ تنبيه انتهاء صلاحية", {
                body,
                tag: "expiry-alert",
                onClickUrl: "/admin/expiry-center",
              });
              if (ok) markExpiryAlertFired();
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
    };
  }, []);

  return null;
}
