// src/utils/notifications.js
// إدارة إعدادات الإشعارات (شخصية + عامّة من الأدمن) + إذن المتصفح + إرسال

const SETTINGS_KEY = "app_notification_settings_v1";    // شخصية لكل متصفح
const GLOBAL_CACHE_KEY = "app_notification_global_v1";  // كاش الإعدادات العامّة من السيرفر
const GLOBAL_TYPE = "admin_notification_config";        // نوع التقرير على السيرفر

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env?.REACT_APP_API_URL ||
     process.env?.VITE_API_URL ||
     process.env?.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const DEFAULTS = {
  enabled: false,
  dailyReminderEnabled: false,
  dailyReminderTime: "09:00", // HH:MM (24h)
  dailyReminderMessage: "ما تنسى تعبّي تقارير اليوم 📋",
  outOfRangeAlerts: false,
  // ===== تنبيهات انتهاء الصلاحية =====
  expiryAlertsEnabled: false,
  expiryAlertTime: "08:00",      // وقت الفحص اليومي
  expiryThresholdDays: 30,       // ينبّه إذا الأيام المتبقية ≤ هذا الرقم
  expiryEntities: {              // الكيانات المراد تتبّعها (true/false لكل نوع)
    training_certificate: true,
    ohc_certificate: true,
    licenses_contracts: true,
    municipality_inspection: true,
    pos10_calibration_log: true,
    pos11_calibration_log: true,
    pos15_calibration_log: true,
    ftr1_calibration_log: true,
    ftr2_calibration_log: true,
    ftr1_oil_calibration: true,
    ftr2_oil_calibration: true,
    mock_recall_drill: true,
  },
  lastReminderAt: 0,             // محلي فقط (لمنع التكرار باليوم)
  lastExpiryAlertAt: 0,          // محلي فقط (لمنع التكرار باليوم)
};

/* ================== Local (شخصي) ================== */
export function getLocalSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveLocalSettings(partial) {
  try {
    const current = getLocalSettings();
    const next = { ...current, ...partial };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    try { window.dispatchEvent(new CustomEvent("app:notification-settings-changed", { detail: next })); } catch {}
    return next;
  } catch {
    return getLocalSettings();
  }
}

/* alias للأسماء القديمة */
export const getNotificationSettings = getLocalSettings;
export const saveNotificationSettings = saveLocalSettings;

/* ================== أدمن check ================== */
export function isAdminUser() {
  try {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return false;
    const u = JSON.parse(raw);
    const uname = String(u?.username || "").toLowerCase();
    const role = String(u?.role || "").toLowerCase();
    return uname === "admin" || role === "admin";
  } catch {
    return false;
  }
}

/* ================== Global (من الأدمن، تنحفظ بالسيرفر) ================== */
export function getCachedGlobalSettings() {
  try {
    const raw = localStorage.getItem(GLOBAL_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function fetchGlobalSettings() {
  try {
    const res = await fetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(GLOBAL_TYPE)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return getCachedGlobalSettings();
    const json = await res.json().catch(() => null);
    const arr = Array.isArray(json) ? json : json?.data || [];
    if (!arr.length) return null;
    // أخذ الأحدث حسب savedAt
    arr.sort(
      (a, b) => (b?.payload?.savedAt || 0) - (a?.payload?.savedAt || 0)
    );
    const settings = arr[0]?.payload || null;
    if (settings) {
      try { localStorage.setItem(GLOBAL_CACHE_KEY, JSON.stringify(settings)); } catch {}
      try { window.dispatchEvent(new CustomEvent("app:notification-global-changed", { detail: settings })); } catch {}
    }
    return settings;
  } catch {
    return getCachedGlobalSettings();
  }
}

export async function saveGlobalSettings(partial) {
  if (!isAdminUser()) {
    throw new Error("صلاحية الأدمن مطلوبة لتعديل الإعدادات العامّة");
  }
  const current = getCachedGlobalSettings() || {};
  const payload = {
    ...DEFAULTS,
    ...current,
    ...partial,
    savedAt: Date.now(),
  };
  // حذف الحقول المحليّة فقط
  delete payload.lastReminderAt;
  delete payload.lastExpiryAlertAt;

  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "admin", type: GLOBAL_TYPE, payload }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  try { localStorage.setItem(GLOBAL_CACHE_KEY, JSON.stringify(payload)); } catch {}
  try { window.dispatchEvent(new CustomEvent("app:notification-global-changed", { detail: payload })); } catch {}
  return payload;
}

/**
 * الإعدادات الفعّالة:
 * - إذا الأدمن ضبط إعدادات عامّة → نستخدمها لكل المستخدمين
 * - وإلا → الإعدادات الشخصية (legacy)
 *
 * lastReminderAt دائمًا من الإعدادات المحلية (منع تكرار باليوم).
 */
export function getEffectiveSettings() {
  const local = getLocalSettings();
  const global = getCachedGlobalSettings();
  if (global) {
    return {
      ...DEFAULTS,
      ...global,
      lastReminderAt: local.lastReminderAt || 0,
      lastExpiryAlertAt: local.lastExpiryAlertAt || 0,
    };
  }
  return local;
}

/* ================== المتصفح ================== */
export function isBrowserNotificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPermissionStatus() {
  if (!isBrowserNotificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!isBrowserNotificationsSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/* ================== إرسال إشعار ================== */
export function sendNotification(title, options = {}) {
  const settings = getEffectiveSettings();
  if (!settings.enabled) return false;
  if (!isBrowserNotificationsSupported()) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const n = new Notification(title, {
      body: options.body || "",
      icon: options.icon || "/favicon.ico",
      tag: options.tag || undefined,
      silent: options.silent || false,
    });
    if (options.onClickUrl) {
      n.onclick = () => {
        try { window.focus(); window.location.href = options.onClickUrl; } catch {}
      };
    }
    return true;
  } catch {
    return false;
  }
}

export function notifyOutOfRange({ location, value, unit = "°C", min, max }) {
  const settings = getEffectiveSettings();
  if (!settings.enabled || !settings.outOfRangeAlerts) return false;
  const range =
    min !== undefined && max !== undefined
      ? ` (المسموح: ${min} إلى ${max}${unit})`
      : "";
  return sendNotification("⚠️ درجة حرارة خارج المجال", {
    body: `${location || "موقع غير محدد"}: ${value}${unit}${range}`,
    tag: `out-of-range-${location || "x"}`,
  });
}

/* ================== التذكير اليومي ================== */
function todayAt(hhmm) {
  const [hh, mm] = String(hhmm || "09:00")
    .split(":")
    .map((x) => parseInt(x, 10) || 0);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

export function shouldFireDailyReminderNow() {
  const settings = getEffectiveSettings();
  if (!settings.enabled || !settings.dailyReminderEnabled) return false;
  const target = todayAt(settings.dailyReminderTime).getTime();
  const now = Date.now();
  if (now < target || now > target + 60_000) return false;
  const last = settings.lastReminderAt || 0;
  const sameDay =
    new Date(last).toDateString() === new Date(now).toDateString();
  return !sameDay;
}

export function markReminderFired() {
  // دائمًا محليًا — منع التكرار لكل جهاز
  saveLocalSettings({ lastReminderAt: Date.now() });
}

/* ================== تنبيه انتهاء الصلاحية ================== */
export function shouldFireExpiryAlertNow() {
  const settings = getEffectiveSettings();
  if (!settings.enabled || !settings.expiryAlertsEnabled) return false;
  const target = todayAt(settings.expiryAlertTime || "08:00").getTime();
  const now = Date.now();
  if (now < target || now > target + 60_000) return false;
  const last = settings.lastExpiryAlertAt || 0;
  const sameDay =
    new Date(last).toDateString() === new Date(now).toDateString();
  return !sameDay;
}

export function markExpiryAlertFired() {
  saveLocalSettings({ lastExpiryAlertAt: Date.now() });
}
