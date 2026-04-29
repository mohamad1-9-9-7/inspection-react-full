// src/pages/settings/NotificationsTab.jsx
import React, { useEffect, useState } from "react";
import {
  isBrowserNotificationsSupported,
  getPermissionStatus,
  requestNotificationPermission,
  sendNotification,
  isAdminUser,
  getCachedGlobalSettings,
  fetchGlobalSettings,
  saveGlobalSettings,
  getEffectiveSettings,
} from "../../utils/notifications";

export default function NotificationsTab() {
  const [admin] = useState(isAdminUser());
  const [permission, setPermission] = useState(getPermissionStatus());
  const [global, setGlobal] = useState(getCachedGlobalSettings() || {
    enabled: false,
    dailyReminderEnabled: false,
    dailyReminderTime: "09:00",
    dailyReminderMessage: "ما تنسى تعبّي تقارير اليوم 📋",
    outOfRangeAlerts: false,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });

  // جلب الإعدادات العامّة من السيرفر عند فتح التبويبة
  useEffect(() => {
    let abort = false;
    (async () => {
      const g = await fetchGlobalSettings();
      if (!abort && g) setGlobal((prev) => ({ ...prev, ...g }));
      if (!abort) setLoading(false);
    })();
    return () => {
      abort = true;
    };
  }, []);

  // مزامنة حالة إذن المتصفح
  useEffect(() => {
    const i = setInterval(() => setPermission(getPermissionStatus()), 2000);
    return () => clearInterval(i);
  }, []);

  function update(partial) {
    setGlobal((prev) => ({ ...prev, ...partial }));
  }

  async function handleSaveGlobal() {
    if (!admin) return;
    setBusy(true);
    setMsg({ kind: "", text: "" });
    try {
      await saveGlobalSettings(global);
      setMsg({
        kind: "ok",
        text: "✅ تم حفظ الإعدادات العامّة. كل المستخدمين رح يطبّقوها.",
      });
    } catch (e) {
      setMsg({ kind: "err", text: `❌ فشل الحفظ: ${e?.message || e}` });
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestPermission() {
    setBusy(true);
    setMsg({ kind: "", text: "" });
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result === "granted") {
        setMsg({ kind: "ok", text: "✅ تم منح إذن الإشعارات" });
      } else if (result === "denied") {
        setMsg({
          kind: "err",
          text: "❌ تم رفض الإذن. لتفعيله: إعدادات المتصفح → الموقع → اسمح بالإشعارات.",
        });
      } else {
        setMsg({ kind: "info", text: "ℹ️ لم يتم اتخاذ قرار" });
      }
    } finally {
      setBusy(false);
    }
  }

  function handleTest() {
    const eff = getEffectiveSettings();
    if (!eff.enabled) {
      setMsg({
        kind: "err",
        text: admin
          ? "⚠️ فعّل الإشعارات أولاً واحفظ الإعدادات العامّة"
          : "⚠️ الإشعارات غير مفعّلة من قبل الأدمن",
      });
      return;
    }
    if (permission !== "granted") {
      setMsg({ kind: "err", text: "⚠️ امنح الإذن من المتصفح أولاً" });
      return;
    }
    const ok = sendNotification("🔔 اختبار الإشعارات", {
      body: "إذا وصلك هذا الإشعار فالإعداد صحيح ✅",
      tag: "test-notification",
    });
    setMsg({
      kind: ok ? "ok" : "err",
      text: ok ? "✅ تم إرسال إشعار اختبار" : "❌ فشل إرسال الإشعار",
    });
  }

  /* ================== UI helpers ================== */
  const card = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "1.25rem",
    marginBottom: 16,
  };
  const supportLabel = !isBrowserNotificationsSupported()
    ? { text: "❌ المتصفح لا يدعم الإشعارات", color: "#b91c1c" }
    : permission === "granted"
    ? { text: "✅ مسموح", color: "#065f46" }
    : permission === "denied"
    ? { text: "🚫 مرفوض (من المتصفح)", color: "#b91c1c" }
    : { text: "❓ بانتظار الإذن", color: "#92400e" };

  const Toggle = ({ checked, onChange, disabled }) => (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 48,
        height: 26,
        borderRadius: 999,
        border: "none",
        background: checked ? "#10b981" : "#d1d5db",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background .18s",
        flexShrink: 0,
      }}
      aria-pressed={checked}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          insetInlineStart: checked ? 25 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          transition: "inset-inline-start .18s",
          boxShadow: "0 2px 6px rgba(0,0,0,.2)",
        }}
      />
    </button>
  );

  const SettingRow = ({ title, description, control }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid #f3f4f6",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: "#0b1f4d" }}>{title}</div>
        {description && (
          <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 2 }}>{description}</div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );

  /* ================== ينتو الـUI ================== */
  return (
    <div>
      {/* مقدمة */}
      <div
        style={{
          ...card,
          background: admin
            ? "linear-gradient(135deg,#fef3c7,#fffbeb)"
            : "linear-gradient(135deg,#dbeafe,#eff6ff)",
          borderColor: admin ? "#fcd34d" : "#bfdbfe",
        }}
      >
        <div style={{ fontWeight: 800, color: admin ? "#92400e" : "#1e40af", marginBottom: 6 }}>
          {admin ? "👑 إعدادات الأدمن (تطبَّق على كل المستخدمين)" : "🔔 إعدادات الإشعارات"}
        </div>
        <div style={{ color: admin ? "#78350f" : "#1e3a8a", lineHeight: 1.7, fontSize: "0.92rem" }}>
          {admin
            ? "أي تعديل بتعمله هنا بينحفظ على السيرفر وبيتطبّق على كل المستخدمين تلقائيًا. الإذن من المتصفح يبقى لكل مستخدم لحاله."
            : "هذه الإعدادات يضبطها الأدمن مركزيًا. أنت بحاجة فقط لمنح إذن المتصفح ليصلك التنبيه."}
        </div>
      </div>

      {/* حالة الإذن (لكل المستخدمين) */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: 12, color: "#0b1f4d" }}>
          1) إذن المتصفح (شخصي لكل جهاز)
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: "0.9rem", color: "#374151" }}>الحالة الحالية:</div>
            <div style={{ fontWeight: 800, color: supportLabel.color, fontSize: "1.05rem", marginTop: 4 }}>
              {supportLabel.text}
            </div>
          </div>
          {isBrowserNotificationsSupported() && permission !== "granted" && (
            <button
              onClick={handleRequestPermission}
              disabled={busy || permission === "denied"}
              style={{
                background: "linear-gradient(180deg,#1e3a5f,#2d5a8e)",
                color: "#fff",
                border: "none",
                padding: "10px 18px",
                borderRadius: 10,
                cursor: permission === "denied" || busy ? "not-allowed" : "pointer",
                fontWeight: 800,
                opacity: permission === "denied" || busy ? 0.6 : 1,
              }}
            >
              {busy ? "⏳ جارٍ..." : "🔓 طلب الإذن"}
            </button>
          )}
        </div>
      </div>

      {/* الإعدادات (admin: قابل للتعديل، user: عرض فقط) */}
      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#0b1f4d" }}>
            2) الإعدادات العامّة {admin ? "(قابلة للتعديل)" : "(للعرض فقط)"}
          </div>
          {loading && <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>جارٍ تحميل من السيرفر…</div>}
        </div>

        <SettingRow
          title="🔔 تفعيل الإشعارات"
          description="المفتاح الرئيسي لكل المستخدمين"
          control={<Toggle checked={!!global.enabled} onChange={(v) => update({ enabled: v })} disabled={!admin} />}
        />

        <SettingRow
          title="📅 تذكير يومي"
          description="إشعار يومي لتعبئة التقارير"
          control={
            <Toggle
              checked={!!global.dailyReminderEnabled}
              onChange={(v) => update({ dailyReminderEnabled: v })}
              disabled={!admin || !global.enabled}
            />
          }
        />

        {global.dailyReminderEnabled && (
          <>
            <SettingRow
              title="⏰ وقت التذكير"
              description="بصيغة 24 ساعة (مثلاً 09:00)"
              control={
                <input
                  type="time"
                  value={global.dailyReminderTime || "09:00"}
                  onChange={(e) => update({ dailyReminderTime: e.target.value })}
                  disabled={!admin || !global.enabled}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: "1rem",
                    fontWeight: 700,
                    minWidth: 130,
                    background: !admin ? "#f3f4f6" : "#fff",
                  }}
                />
              }
            />
            <SettingRow
              title="✏️ نص التذكير"
              description="الرسالة اللي رح تظهر بالإشعار"
              control={
                <input
                  type="text"
                  value={global.dailyReminderMessage || ""}
                  onChange={(e) => update({ dailyReminderMessage: e.target.value })}
                  disabled={!admin || !global.enabled}
                  placeholder="مثال: ما تنسى تعبّي تقرير اليوم"
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: "0.95rem",
                    minWidth: 260,
                    background: !admin ? "#f3f4f6" : "#fff",
                  }}
                />
              }
            />
          </>
        )}

        <SettingRow
          title="⚠️ تنبيه عند درجة حرارة خارج المجال"
          description="إشعار فوري عند إدخال قراءة خارج النطاق المسموح"
          control={
            <Toggle
              checked={!!global.outOfRangeAlerts}
              onChange={(v) => update({ outOfRangeAlerts: v })}
              disabled={!admin || !global.enabled}
            />
          }
        />

        {admin && (
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={handleSaveGlobal}
              disabled={busy}
              style={{
                background: "linear-gradient(180deg,#10b981,#059669)",
                color: "#fff",
                border: "none",
                padding: "12px 22px",
                borderRadius: 10,
                cursor: busy ? "not-allowed" : "pointer",
                fontWeight: 800,
                fontSize: "0.95rem",
                opacity: busy ? 0.6 : 1,
                boxShadow: "0 4px 12px rgba(16,185,129,.25)",
              }}
            >
              {busy ? "⏳ جارٍ الحفظ..." : "💾 حفظ على السيرفر (يطبَّق على الجميع)"}
            </button>
          </div>
        )}
      </div>

      {/* اختبار */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: 8, color: "#0b1f4d" }}>
          3) اختبار
        </div>
        <div style={{ color: "#6b7280", marginBottom: 12, fontSize: "0.9rem" }}>
          يطلق إشعار اختبار يستخدم نفس الإعدادات العامّة المفعّلة.
        </div>
        <button
          onClick={handleTest}
          style={{
            background: "linear-gradient(180deg,#1e3a5f,#2d5a8e)",
            color: "#fff",
            border: "none",
            padding: "12px 22px",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 800,
            fontSize: "0.95rem",
            boxShadow: "0 4px 12px rgba(30,58,95,.25)",
          }}
        >
          🔔 إرسال إشعار اختبار
        </button>
      </div>

      {/* رسالة */}
      {msg.text && (
        <div
          style={{
            ...card,
            marginBottom: 0,
            background: msg.kind === "ok" ? "#ecfdf5" : msg.kind === "err" ? "#fef2f2" : "#eff6ff",
            borderColor: msg.kind === "ok" ? "#86efac" : msg.kind === "err" ? "#fca5a5" : "#bfdbfe",
            color: msg.kind === "ok" ? "#065f46" : msg.kind === "err" ? "#991b1b" : "#1e40af",
            fontWeight: 600,
          }}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}
