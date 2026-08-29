// src/pages/mrp/MrpImageField.jsx
//
// 📷 صورة واحدة لعنصر واحد — منتقي مشترك للأصناف والأنواع والمناشئ والفئات.
//
// ليش موجود: أغلب الجزارين ما بيقروا. الاسم المكتوب على الكرت ما بيفيدهم،
// والصورة بتفيد. فكل شي بيختاره الجزار بالكشك (النوع · المنشأ · الفئة ·
// القطعة) لازم يقدر يحمل صورة.
//
// ⚠️ الرفع عبر `uploadImage` حصراً — الصورة بتروح على Cloudinary ومنخزّن
// الرابط (~٩٠ بايت) مش الملف. السيرفر بيرفض أي payload فيه base64 برد 400،
// فهاد مش تفضيل: نموذج بيخزّن الملف ما بيقدر يحفظ أصلاً.
//
// صورة وحدة لكل عنصر بالتصميم: `imageUrl` نصّ لا مصفوفة. الجزار بده يشوف
// «هاي هي القطعة»، لا معرض صور يتصفّحه وهو واقف على الميزان.

import React, { useRef, useState } from "react";
import { uploadImage } from "../../utils/imageUpload";

/**
 * @param value     رابط الصورة الحالي ("" = ما في)
 * @param onChange  (url) => void — بتنندَه بالرابط الجديد أو "" عند الحذف
 * @param size      قياس المربّع (٦٤ افتراضي؛ الصف الصغير بيستعمل ٤٠)
 * @param compact   صف مضغوط: زر واحد بلا عناوين — لصفوف الأنواع والمناشئ
 */
export default function MrpImageField({
  value, onChange, disabled, t, size = 64, compact = false, label,
}) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pick = () => { if (!disabled && !busy) fileRef.current?.click(); };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";               // نفس الملف مرّة تانية لازم يشتغل
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const url = await uploadImage(file, "mrp_item");
      onChange(url);
    } catch (ex) {
      setErr(ex?.message || t({ en: "Upload failed", ar: "فشل الرفع" }));
    } finally {
      setBusy(false);
    }
  };

  const box = {
    width: size, height: size, borderRadius: 12, flexShrink: 0,
    border: `1px ${value ? "solid" : "dashed"} ${value ? "#cfe0f0" : "#c3d6ea"}`,
    background: value ? "#fff" : "#f7fbff",
    display: "grid", placeItems: "center", overflow: "hidden",
    cursor: disabled ? "not-allowed" : "pointer", padding: 0,
  };

  const input = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      /* الكاميرا مباشرة على الجوال — المشرف واقف جنب القطعة، ما بدّو يصوّر
         وبعدين يفتّش عن الملف بالمعرض. */
      capture="environment"
      onChange={onFile}
      style={{ display: "none" }}
    />
  );

  if (compact) {
    return (
      <>
        {input}
        <button
          type="button"
          onClick={pick}
          disabled={disabled || busy}
          title={value
            ? t({ en: "Change the picture", ar: "تغيير الصورة" })
            : t({ en: "Add a picture", ar: "إضافة صورة" })}
          style={{ ...box, width: 34, height: 34, borderRadius: 10 }}
        >
          {busy
            ? "⏳"
            : value
              ? <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 15, opacity: 0.75 }}>📷</span>}
        </button>
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            title={t({ en: "Remove the picture", ar: "حذف الصورة" })}
            style={{
              border: "1px solid #f2c9c9", background: "#fff6f6", color: "#a12626",
              borderRadius: 10, width: 34, height: 34, cursor: "pointer", fontWeight: 900,
            }}
          >
            ✕
          </button>
        )}
      </>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      {label && (
        <span style={{ fontWeight: 800, fontSize: 13, color: "#3c5a75" }}>{label}</span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={pick} disabled={disabled || busy} style={box}>
          {busy
            ? "⏳"
            : value
              ? <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 22, opacity: 0.65 }}>📷</span>}
        </button>
        {input}

        <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={pick}
              disabled={disabled || busy}
              style={{
                border: "1px solid #cfe0f0", background: "#fff", color: "#1f6fd0",
                borderRadius: 10, padding: "7px 12px", fontWeight: 800,
                fontFamily: "inherit", cursor: disabled || busy ? "not-allowed" : "pointer",
              }}
            >
              {busy
                ? t({ en: "Uploading…", ar: "جارٍ الرفع…" })
                : value
                  ? t({ en: "Change picture", ar: "تغيير الصورة" })
                  : t({ en: "Add picture", ar: "إضافة صورة" })}
            </button>
            {value && !disabled && !busy && (
              <button
                type="button"
                onClick={() => onChange("")}
                style={{
                  border: "1px solid #f2c9c9", background: "#fff6f6", color: "#a12626",
                  borderRadius: 10, padding: "7px 12px", fontWeight: 800,
                  fontFamily: "inherit", cursor: "pointer",
                }}
              >
                {t({ en: "Remove", ar: "حذف" })}
              </button>
            )}
          </div>
          <span style={{ fontSize: 12, color: "#8aa3b8", fontWeight: 700, lineHeight: 1.6 }}>
            {t({
              en: "One picture. It is what the butcher sees on the kiosk instead of reading the name.",
              ar: "صورة وحدة. هي اللي بيشوفها الجزار بالكشك بدل ما يقرأ الاسم.",
            })}
          </span>
          {err && (
            <span style={{ fontSize: 12, color: "#a12626", fontWeight: 800 }}>⚠️ {err}</span>
          )}
        </div>
      </div>
    </div>
  );
}
