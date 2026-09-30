// src/companies/exaltis/reports/ncr/NcrEvidenceCard.jsx
// Non-conformance entry — Evidence photos (card 4).
// (Extracted from NonConformanceReportInput.jsx — the code is unchanged.)
import { Card } from "./ncrUi";
import { MAX_EVIDENCE_IMAGES, deleteImage } from "./ncrModel";
import { Bi } from "../bilingual";

export function NcrEvidenceCard({ evidenceImages, evidenceInputRef, evidenceBusy, setEvidenceImages, addEvidenceImagesFromFiles, evidenceMsg, removeEvidenceImageAt }) {
  return (
    <Card
      n="4"
      en="Evidence"
      ar="الأدلة والمرفقات"
      badge={`${evidenceImages.length}/${MAX_EVIDENCE_IMAGES} images · صور`}
      badgeCalm
    >
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          className="ncr-btn sky small"
          onClick={() => evidenceInputRef.current?.click()}
          disabled={evidenceBusy || evidenceImages.length >= MAX_EVIDENCE_IMAGES}
        >
          ⬆️ <Bi en="Upload images" ar="رفع الصور" />
        </button>
        <button
          type="button"
          className="ncr-btn ghost small"
          onClick={async () => {
            if (!evidenceImages.length) return;
            if (!window.confirm("Remove all evidence images? · حذف كل صور الأدلة؟")) return;
            const urls = evidenceImages;
            setEvidenceImages([]);
            for (const url of urls) {
              try { await deleteImage(url); } catch (e) { console.error("Clear all: failed to delete evidence image", url, e); }
            }
          }}
        >
          <Bi en="Clear all" ar="مسح الكل" />
        </button>
        <input
          ref={evidenceInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => addEvidenceImagesFromFiles(e.target.files)}
        />
        {evidenceMsg ? <div className="ncr-msg">{evidenceMsg}</div> : null}
      </div>

      {evidenceImages.length === 0 ? (
        <div className="ncr-empty" style={{ marginTop: 14 }}>
          No evidence images yet — لا توجد صور أدلة بعد
        </div>
      ) : (
        <div className="ncr-shots">
          {evidenceImages.map((src, i) => (
            <div className="ncr-shot" key={src + i}>
              <img src={src} alt={`evidence-${i + 1}`} />
              <div className="n">#{i + 1}</div>
              <button type="button" className="x" onClick={() => removeEvidenceImageAt(i)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
