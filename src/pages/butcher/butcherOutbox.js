// src/pages/butcher/butcherOutbox.js
//
// 📤 صندوق الصادر — حفظ الجزار يشتغل حتى لو النت مقطوع.
// Offline outbox for the butcher kiosk: queue locally, sync when back online.
//
// ⚠️ السيرفر يبقى مصدر الحقيقة. هذا **طابور مؤقّت لا مخزن**:
//   • كل سجل يُحاول الذهاب للسيرفر فوراً.
//   • إذا فشل لسبب شبكة (أو خطأ سيرفر مؤقّت 5xx) يُحفظ محلياً ويُعاد لاحقاً.
//   • بمجرّد نجاح الإرسال يُمسح من المحلي — لا تبقى نسخة محلية أبداً.
//   • أخطاء البيانات (4xx) لا تُطبَّر: بيانات خاطئة لن تنجح مهما أعدنا.
//
// المزامنة تنطلق عند: عودة الإنترنت · فتح الشاشة · العودة للتبويب · كل دقيقة.

import { useCallback, useEffect, useState } from "react";
import API_BASE from "../../config/api";
import { TYPE } from "./butcherOptions";

const KEY = "butcher_outbox";          // طابور مؤقّت — يفرغ بالمزامنة
const EVT = "butcher_outbox_changed";
const SYNC_EVERY_MS = 60000;

/* ── قراءة/كتابة الطابور ── */

export function readQueue() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeQueue(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* الذاكرة ممتلئة — لا نُسقط التطبيق */ }
  try {
    window.dispatchEvent(new CustomEvent(EVT, { detail: list.length }));
  } catch { /* ignore */ }
}

/** إضافة سجل للطابور — يرجّع معرّفه المحلي. */
function enqueue(payload) {
  const item = {
    localId: `q_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    payload,
    queuedAt: new Date().toISOString(),
    tries: 0,
    lastError: "",
  };
  writeQueue([...readQueue(), item]);
  return item.localId;
}

/* ── الإرسال ── */

/** هل الخطأ يستحق إعادة المحاولة؟ الشبكة و5xx نعم، وأخطاء البيانات لا. */
class PermanentError extends Error {}

async function postOnce(payload, attempt = 0) {
  // reportDate = طابع وقت فريد حتى لا يصطدم بالفهرس الفريد (type, reportDate)
  const stamp = new Date(Date.now() + attempt).toISOString();
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      reporter: payload.employeeNo || "butcher",
      type: TYPE,
      payload: { ...payload, reportDate: stamp },
    }),
  });

  // الطابع محجوز — جرّب طابعاً غيره
  if (res.status === 409 && attempt < 5) return postOnce(payload, attempt + 1);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`Server ${res.status}: ${body}`);
    // 4xx = بيانات مرفوضة، إعادة المحاولة لن تفيد
    if (res.status >= 400 && res.status < 500) throw new PermanentError(err.message);
    throw err;
  }
  return res.json().catch(() => ({}));
}

/**
 * حفظ سجل: يحاول السيرفر، وإن تعذّر لسبب شبكة يضعه بالطابور.
 * يرجّع { synced: true } أو { synced: false, queued: true }.
 * يرمي الخطأ فقط إذا رفض السيرفر البيانات (لا فائدة من الطابور حينها).
 */
export async function saveOrQueue(payload) {
  try {
    await postOnce(payload);
    return { synced: true, queued: false };
  } catch (e) {
    if (e instanceof PermanentError) throw e;   // بيانات خاطئة — أظهر الخطأ
    enqueue(payload);                            // شبكة/سيرفر مؤقّت — أجّل
    return { synced: false, queued: true };
  }
}

let flushing = false;

/**
 * تفريغ الطابور — يمشي بالترتيب ويقف عند أول فشل شبكة
 * (لا فائدة من محاولة الباقي والنت مقطوع).
 * السجلات المرفوضة نهائياً تُسقط حتى لا تعلق للأبد.
 */
export async function flushQueue() {
  if (flushing) return { sent: 0, left: readQueue().length };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { sent: 0, left: readQueue().length };
  }

  flushing = true;
  let sent = 0;
  try {
    let queue = readQueue();
    while (queue.length) {
      const item = queue[0];
      try {
        await postOnce(item.payload);
        queue = queue.slice(1);       // نجح — اخرج من الطابور
        writeQueue(queue);
        sent += 1;
      } catch (e) {
        if (e instanceof PermanentError) {
          // مرفوض نهائياً — أسقطه وأكمل حتى لا يسدّ الطابور
          queue = queue.slice(1);
          writeQueue(queue);
          continue;
        }
        // فشل شبكة — سجّل المحاولة وتوقّف حتى المرّة الجاية
        queue = [
          { ...item, tries: (item.tries || 0) + 1, lastError: String(e?.message || e) },
          ...queue.slice(1),
        ];
        writeQueue(queue);
        break;
      }
    }
    return { sent, left: readQueue().length };
  } finally {
    flushing = false;
  }
}

/* ── الهوك ── */

/**
 * حالة الطابور الحيّة: عدد المعلّق، الاتصال، ومزامنة تلقائية.
 * تنطلق عند عودة الإنترنت، وفتح الشاشة، والعودة للتبويب، وكل دقيقة.
 */
export function useOutbox() {
  const [pending, setPending] = useState(() => readQueue().length);
  const [online, setOnline] = useState(
    () => (typeof navigator === "undefined" ? true : navigator.onLine !== false)
  );
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    if (!readQueue().length) return;
    setSyncing(true);
    try {
      await flushQueue();
    } finally {
      setSyncing(false);
      setPending(readQueue().length);
    }
  }, []);

  useEffect(() => {
    const onChange = (e) => setPending(
      typeof e?.detail === "number" ? e.detail : readQueue().length
    );
    const goOnline = () => { setOnline(true); sync(); };
    const goOffline = () => setOnline(false);
    const onVisible = () => { if (!document.hidden) sync(); };
    // تبويب آخر بنفس المتصفّح فرّغ الطابور
    const onStorage = (e) => { if (e.key === KEY) setPending(readQueue().length); };

    window.addEventListener(EVT, onChange);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);

    sync();                                        // محاولة عند الفتح
    const timer = window.setInterval(sync, SYNC_EVERY_MS);

    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [sync]);

  return { pending, online, syncing, sync };
}
