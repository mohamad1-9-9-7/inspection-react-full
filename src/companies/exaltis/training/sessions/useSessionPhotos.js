// src/companies/exaltis/training/sessions/useSessionPhotos.js
// Training sessions — session photos (upload, remove, viewer).
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)
import { useState } from "react";
import { getId, updateReportOnServer, safeTitle, safeModule } from "../TrainingSessionsList.helpers";
import { MAX_PARTICIPANT_IMAGES, compressToFile } from "./participants";
import { uploadImage as uploadImageToServer } from "../../../../utils/imageUpload";

export function useSessionPhotos({ selected, setSelected }) {
  const [sessionImages, setSessionImages] = useState([]); // [{url, name}]
  const [uploadingSessionPhoto, setUploadingSessionPhoto] = useState(false);
  const [savingSessionPhotos, setSavingSessionPhotos] = useState(false);
  const [photoViewer, setPhotoViewer] = useState(null); // { title, images: [], startAt }

  const persistSessionImages = async (nextImages) => {
    if (!selected) return;
    const id = getId(selected);
    if (!id) return;
    setSavingSessionPhotos(true);
    try {
      const updated = {
        ...selected,
        payload: { ...(selected.payload || {}), images: nextImages },
      };
      await updateReportOnServer(id, updated);
      setSelected(updated);
      setSessionImages(nextImages);
    } catch (e) {
      console.error(e);
      alert(`Failed to save photos: ${String(e?.message || e)}`);
    } finally {
      setSavingSessionPhotos(false);
    }
  };

  const handleSessionImageUpload = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => /^image\//.test(f.type));
    if (!files.length) return;
    if (!selected) return;
    const room = MAX_PARTICIPANT_IMAGES - sessionImages.length;
    if (room <= 0) {
      alert(`Maximum ${MAX_PARTICIPANT_IMAGES} photos per session.`);
      return;
    }
    const toUpload = files.slice(0, room);
    setUploadingSessionPhoto(true);
    try {
      const uploaded = [];
      for (const f of toUpload) {
        const compressed = await compressToFile(f);
        const url = await uploadImageToServer(compressed, "sweets_training_session");
        if (url) uploaded.push({ url, name: f.name });
      }
      if (uploaded.length) {
        const next = [...sessionImages, ...uploaded].slice(0, MAX_PARTICIPANT_IMAGES);
        await persistSessionImages(next);
      }
    } catch (e) {
      console.error(e);
      alert(`Failed to upload photo: ${String(e?.message || e)}`);
    } finally {
      setUploadingSessionPhoto(false);
    }
  };

  const removeSessionImage = async (imgIdx) => {
    const next = sessionImages.filter((_, i) => i !== imgIdx);
    await persistSessionImages(next);
  };

  const openSessionPhotoViewer = (startAt = 0) => {
    if (!sessionImages.length) return;
    setPhotoViewer({
      title: `Session Photos — ${safeTitle(selected) || safeModule(selected) || ""}`,
      images: sessionImages,
      startAt,
    });
  };
  return { sessionImages, setSessionImages, uploadingSessionPhoto, savingSessionPhotos, photoViewer, setPhotoViewer, handleSessionImageUpload, removeSessionImage, openSessionPhotoViewer };
}
