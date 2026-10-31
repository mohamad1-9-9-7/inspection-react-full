// src/pages/monitor/internalAuditEvidence.js
// Where the photos of an internal multi-branch audit live. A finding keeps its
// own evidenceImgs / closedEvidenceImgs, but the branch uploads closure photos
// through the public evidence link, and those land in several older and newer
// shapes (public.submission.closedEvidenceUpdates, fields.*, legacy buckets).
// Shared by the View and the Excel backup so both show the same photos.

export function getImageUrl(img) {
  if (!img) return "";
  if (typeof img === "string") return img;
  if (typeof img === "object") {
    return (
      img.url ||
      img.optimized_url ||
      img.optimizedUrl ||
      img.secure_url ||
      img.secureUrl ||
      img.originalUrl ||
      img.original_url ||
      img.src ||
      img.href ||
      img.path ||
      getImageUrl(img.image) ||
      getImageUrl(img.file) ||
      ""
    );
  }
  return "";
}

export function collectImageUrls(source) {
  if (!source) return [];
  if (Array.isArray(source)) return source.flatMap(collectImageUrls);
  const direct = getImageUrl(source);
  if (direct) return [direct];
  if (typeof source !== "object") return [];
  const buckets = [
    source.images,
    source.closedEvidenceImgs,
    source.closedEvidenceImages,
    source.closedEvidence,
    source.evidenceImgs,
    source.attachments,
    source.fieldAttachments,
    source.files,
    source.urls,
    source.imageUrls,
    source.photoUrls,
    source.photos,
    source.image,
    source.file,
    source.attachment,
  ];
  return buckets.flatMap(collectImageUrls);
}

export function inferRowIndex(source, fallbackKey = "") {
  const direct =
    source?.rowIndex ??
    source?.rowIdx ??
    source?.ridx ??
    source?.index ??
    source?.itemIndex ??
    source?.findingIndex;
  const n = Number(direct);
  if (Number.isInteger(n) && n >= 0) return n;
  const text = [
    fallbackKey,
    source?.key,
    source?.name,
    source?.field,
    source?.fieldName,
    source?.id,
  ].filter(Boolean).join(" ");
  const match = /(?:row|item|finding|closedEvidence|closedEvidenceImgs|closed|evidence)[^\d]*(\d+)/i.exec(text);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function collectLegacyEvidenceItems(container) {
  if (!container || typeof container !== "object") return [];
  const out = [];
  const scan = (value, key = "") => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item, idx) => scan(item, `${key}.${idx}`));
      return;
    }
    if (typeof value !== "object") return;
    const rowIndex = inferRowIndex(value, key);
    const images = collectImageUrls(value);
    if (Number.isInteger(rowIndex) && images.length) {
      out.push({ rowIndex, images, note: String(value.note || value.notes || value.comment || "") });
    }
    Object.entries(value).forEach(([childKey, childValue]) => {
      const joined = key ? `${key}.${childKey}` : childKey;
      if (/(closed|corrective|closure|evidence|attachment|image|photo|url)/i.test(joined)) scan(childValue, joined);
    });
  };
  [
    ["fieldAttachments", container.fieldAttachments],
    ["attachments", container.attachments],
    ["closedEvidenceAttachments", container.closedEvidenceAttachments],
    ["closedEvidenceImgs", container.closedEvidenceImgs],
    ["closedEvidenceImages", container.closedEvidenceImages],
    ["closedEvidence", container.closedEvidence],
    ["closedEvidenceUpdates", container.closedEvidenceUpdates],
  ].forEach(([key, value]) => scan(value, key));
  return out;
}

export function getBranchEvidenceUpdates(payload = {}) {
  const sources = [
    payload?.public?.submission?.closedEvidenceUpdates,
    payload?.fields?.closedEvidenceUpdates,
    payload?.closedEvidenceUpdates,
  ].filter(Array.isArray);
  const legacySources = [
    payload?.fields,
    payload?.public?.submission,
    payload?.public,
    payload,
  ].flatMap(collectLegacyEvidenceItems);
  const byRow = new Map();
  [...sources.flat(), ...legacySources].forEach((item) => {
    const rowIndex = Number(item?.rowIndex);
    if (!Number.isInteger(rowIndex)) return;
    const existing = byRow.get(rowIndex) || { rowIndex, images: [], note: "" };
    const normalizedImages = collectImageUrls(item);
    byRow.set(rowIndex, {
      rowIndex,
      images: Array.from(new Set([...existing.images, ...normalizedImages])).filter(Boolean),
      note: String(item?.note || existing.note || ""),
    });
  });
  return Array.from(byRow.values());
}

export function getBranchEvidenceForRow(payload = {}, rowIndex) {
  const updates = getBranchEvidenceUpdates(payload);
  const found = updates.find((x) => Number(x?.rowIndex) === Number(rowIndex));
  return Array.isArray(found?.images) ? found.images.map((img) => getImageUrl(img)).filter(Boolean) : [];
}

export function getRowClosedEvidenceImages(row = {}) {
  return collectImageUrls({
    closedEvidenceImgs: row?.closedEvidenceImgs,
    closedEvidenceImages: row?.closedEvidenceImages,
    closedEvidence: row?.closedEvidence,
    closureEvidence: row?.closureEvidence,
    correctiveEvidence: row?.correctiveEvidence,
    correctiveEvidenceImgs: row?.correctiveEvidenceImgs,
    closedAttachments: row?.closedAttachments,
  });
}

export function getBranchEvidenceNoteForRow(payload = {}, rowIndex) {
  const updates = getBranchEvidenceUpdates(payload);
  const found = updates.find((x) => Number(x?.rowIndex) === Number(rowIndex));
  return String(found?.note || "");
}
