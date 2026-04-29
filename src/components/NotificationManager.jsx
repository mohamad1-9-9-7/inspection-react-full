// src/components/NotificationManager.jsx
// مدير عام يفحص بشكل دوري:
// - يجلب الإعدادات العامّة (الأدمن) كل 5 دقائق ويخزّنها كاش
// - يفحص كل دقيقة هل حان وقت التذكير اليومي ويرسله
import { useEffect } from "react";
import {
  getEffectiveSettings,
  sendNotification,
  shouldFireDailyReminderNow,
  markReminderFired,
  fetchGlobalSettings,
} from "../utils/notifications";

const REMINDER_CHECK_MS = 60_000;       // كل دقيقة
const GLOBAL_REFRESH_MS = 5 * 60_000;   // كل 5 دقائق

export default function NotificationManager() {
  useEffect(() => {
    let cancelled = false;

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
        if (!shouldFireDailyReminderNow()) return;
        const s = getEffectiveSettings();
        const ok = sendNotification("📋 تذكير يومي", {
          body: s.dailyReminderMessage || "ما تنسى تعبّي تقارير اليوم",
          tag: "daily-reminder",
        });
        if (ok) markReminderFired();
      } catch {}
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
