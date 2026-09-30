// src/companies/exaltis/ohc/view/useOhcRecordActions.js
// OHC view — record actions: outside-Dubai and left-company toggles, delete, inline edit, image replace/delete and the image modal.
// (Extracted from OHCView.jsx — the code is unchanged.)
import { jsonFetch, TYPE, toIsoYMD } from "./ohcViewModel";
import API_BASE from "../../../../config/api";
import { uploadImage } from "../../../../utils/imageUpload";

export function useOhcRecordActions({ filtered, setMsg, load, setEditingIndex, setEdit, setEditImage, editingIndex, edit, editImage, setModalImage, rows }) {
  async function toggleOutsideDubai(idx) {
    const row = filtered[idx];
    if (!row?._server?.id) return;

    const newVal = !row.outsideDubai;
    const action = newVal ? "Mark as Outside Dubai" : "Move back to Dubai";
    const note = newVal
      ? "This will hide the record from the main view and exempt it from expiry alerts."
      : "This will return the record to the active Dubai view.";

    if (!window.confirm(`${action}?\n\n${note}`)) return;

    setMsg({ type: "", text: "" });

    const base = row._server.rawPayload || {};
    const payload = {
      ...base,
      outsideDubai: newVal,
      // عند الانتقال خارج دبي نمسح حقول الشهادة (سترجع عند العودة)
      ...(newVal
        ? { expiryDate: "", result: "" }
        : {}),
      savedAt: new Date().toISOString(),
    };

    try {
      const createRes = await jsonFetch(`${API_BASE}/api/reports`, {
        method: "POST",
        body: JSON.stringify({
          reporter: "sweets",
          type: TYPE,
          payload,
        }),
      });
      if (!createRes.ok) {
        setMsg({
          type: "error",
          text: `Update failed (HTTP ${createRes.status}). ${
            createRes.data?.message || ""
          }`,
        });
        return;
      }
      await jsonFetch(`${API_BASE}/api/reports/${row._server.id}`, {
        method: "DELETE",
      });
      setMsg({
        type: "ok",
        text: newVal
          ? "Marked as Outside Dubai (hidden from main view)."
          : "Moved back to Dubai (visible in main view).",
      });
      await load();
    } catch (err) {
      console.error("toggleOutsideDubai error:", err);
      setMsg({
        type: "error",
        text: "Network error while updating. Please try again.",
      });
    }
  }

  // قلب حالة Left Company بسرعة
  async function toggleLeftCompany(idx) {
    const row = filtered[idx];
    if (!row?._server?.id) return;

    const newVal = !row.leftCompany;
    const action = newVal ? "Mark as Left Company" : "Restore (Active Employee)";
    const note = newVal
      ? "This will hide the record from the main view & exempt it from expiry alerts. The record stays in the database."
      : "This will return the record to the active list.";

    if (!window.confirm(`${action}?\n\n${note}`)) return;

    setMsg({ type: "", text: "" });

    const base = row._server.rawPayload || {};
    const payload = {
      ...base,
      leftCompany: newVal,
      ...(newVal ? { expiryDate: "", result: "" } : {}),
      savedAt: new Date().toISOString(),
    };

    try {
      const createRes = await jsonFetch(`${API_BASE}/api/reports`, {
        method: "POST",
        body: JSON.stringify({
          reporter: "sweets",
          type: TYPE,
          payload,
        }),
      });
      if (!createRes.ok) {
        setMsg({
          type: "error",
          text: `Update failed (HTTP ${createRes.status}). ${
            createRes.data?.message || ""
          }`,
        });
        return;
      }
      await jsonFetch(`${API_BASE}/api/reports/${row._server.id}`, {
        method: "DELETE",
      });
      setMsg({
        type: "ok",
        text: newVal
          ? "Marked as Left Company (hidden from main view)."
          : "Restored as active employee.",
      });
      await load();
    } catch (err) {
      console.error("toggleLeftCompany error:", err);
      setMsg({
        type: "error",
        text: "Network error while updating. Please try again.",
      });
    }
  }

  // Delete record
  async function handleDelete(idx) {
    const row = filtered[idx];
    if (!row?._server?.id) return;
    if (!window.confirm(`Delete certificate for "${row.name}"?`)) return;

    setMsg({ type: "", text: "" });
    try {
      const { ok, status, data } = await jsonFetch(
        `${API_BASE}/api/reports/${row._server.id}`,
        { method: "DELETE" }
      );
      if (!ok) {
        setMsg({
          type: "error",
          text: `Delete failed (HTTP ${status}). ${data?.message || ""}`,
        });
        return;
      }
      setMsg({ type: "ok", text: "Deleted successfully." });
      await load();
    } catch (err) {
      console.error("OHC delete error:", err);
      setMsg({
        type: "error",
        text: "Network error while deleting. Please try again.",
      });
    }
  }

  // Edit record
  function startEdit(idx) {
    const row = filtered[idx];
    setEditingIndex(idx);
    setEdit({
      name: row.name || "",
      nationality: row.nationality || "",
      job: row.job || "",
      expiryDate: row.expiryDate || "",
      result: row.result || "",
      branch: row.branch || "",
      outsideDubai: !!row.outsideDubai,
      leftCompany: !!row.leftCompany,
    });
    setEditImage(null);
    setMsg({ type: "", text: "" });
  }
  function cancelEdit() {
    setEditingIndex(null);
    setEditImage(null);
  }
  function setEditField(k, v) {
    setEdit((p) => ({ ...p, [k]: v }));
  }

  // اختيار صورة جديدة مع ضغط
  async function handleEditImageSelect(e) {
    const file = e.target.files && e.target.files[0];
    // تنظيف قيمة المدخل بحيث يمكن اختيار نفس الملف مرة أخرى لاحقاً
    e.target.value = "";
    if (!file) return;

    if (!file.type || !file.type.startsWith("image/")) {
      setMsg({
        type: "error",
        text: "Selected file is not an image.",
      });
      return;
    }

    try {
      // Cloudinary does the resize/compress (1280px, quality 80), so the file
      // goes up as-is and the record keeps only the returned URL.
      setMsg({ type: "ok", text: "⏳ Uploading image…" });
      const dataUrl = await uploadImage(file, "sweets_ohc_certificate");

      setEditImage({
        dataUrl,
        name: file.name,
        type: file.type || "image/jpeg",
      });
      setMsg({
        type: "ok",
        text: "Image loaded for update. Please click Save to apply changes.",
      });
    } catch (err) {
      console.error("Image upload error:", err);
      setMsg({
        type: "error",
        text: `Failed to upload image: ${err?.message || err}`,
      });
    }
  }

  // ==== Edit: PUT the same record (keeps its id; supports a new image) ====
  async function saveEdit() {
    const row = filtered[editingIndex];
    if (!row?._server?.id) return;

    // لو الموظف خارج دبي أو ترك الشركة: ما لازم expiryDate ولا result
    const exempt = edit.outsideDubai || edit.leftCompany;
    const required = exempt
      ? ["name", "nationality", "job", "branch"]
      : ["name", "nationality", "job", "expiryDate", "result", "branch"];
    for (const k of required) {
      if (!String(edit[k] || "").trim()) {
        setMsg({
          type: "error",
          text: "Please complete all required fields.",
        });
        return;
      }
    }

    let expiryIso = "";
    if (!exempt) {
      expiryIso = toIsoYMD(edit.expiryDate);
      if (!expiryIso) {
        setMsg({
          type: "error",
          text: "Invalid expiry date format. Please re-select the date.",
        });
        return;
      }
      const todayStr = new Date().toISOString().slice(0, 10);
      if (expiryIso < todayStr) {
        const cont = window.confirm(
          "This OHC certificate appears to be expired already.\nDo you still want to save these changes?"
        );
        if (!cont) return;
      }
    }

    // نحافظ على الـ payload الأصلي (يشمل الصورة الحالية) ونحدّث الحقول فقط
    const base = row._server.rawPayload || {};
    const payload = {
      ...base,
      appNo: row.appNo, // رقم الموظف ثابت
      name: edit.name,
      nationality: edit.nationality,
      job: edit.job,
      expiryDate: exempt ? "" : expiryIso,
      result: exempt ? "" : edit.result,
      branch: edit.branch,
      outsideDubai: !!edit.outsideDubai,
      leftCompany: !!edit.leftCompany,
      savedAt: new Date().toISOString(),
    };

    // لو تم اختيار صورة جديدة نستبدل حقول الصورة
    if (editImage && editImage.dataUrl) {
      payload.imageUrl = editImage.dataUrl; // رابط Cloudinary
      payload.imageData = ""; // ما عاد يُخزَّن الملف داخل الـ payload
      payload.imageName = editImage.name;
      payload.imageType = editImage.type;
    }

    try {
      // Update the same row in place. The old create-then-delete left a
      // duplicate behind whenever the delete failed, and changed the record id.
      const upd = await jsonFetch(`${API_BASE}/api/reports/${row._server.id}`, {
        method: "PUT",
        body: JSON.stringify({ reporter: "sweets", type: TYPE, payload }),
      });

      if (!upd.ok) {
        setMsg({
          type: "error",
          text: `Update failed (HTTP ${upd.status}). ${upd.data?.message || ""}`,
        });
        return;
      }

      setMsg({ type: "ok", text: "Updated successfully." });
      setEditingIndex(null);
      setEditImage(null);
      await load();
    } catch (err) {
      console.error("OHC update error:", err);
      setMsg({
        type: "error",
        text: "Network error while updating. Please try again.",
      });
    }
  }

  // ======= Image modal + remove image + download =======
  function openImage(r) {
    if (!r?.image) return;
    setModalImage({
      src: r.image,
      appNo: r.appNo || "",
      name: r.name || "",
      serverId: r._server?.id || null,
    });
  }

  function closeModal() {
    setModalImage(null);
  }

  async function handleDeleteImage(modal) {
    if (!modal?.serverId) return;
    const row = rows.find((r) => r._server?.id === modal.serverId);
    if (!row) return;

    if (
      !window.confirm(
        `Remove image for "${row.name}" (Employee Number: ${
          row.appNo || "N/A"
        })? This will keep the certificate data but delete the attached image.`
      )
    ) {
      return;
    }

    setMsg({ type: "", text: "" });

    const base = row._server.rawPayload || {};
    const payload = {
      ...base,
      imageData: "",
      imageUrl: "",
      imageName: "",
      imageType: "",
    };

    try {
      const { ok, status, data } = await jsonFetch(
        `${API_BASE}/api/reports/${row._server.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ payload }),
        }
      );

      if (!ok) {
        setMsg({
          type: "error",
          text: `Image remove failed (HTTP ${status}). ${data?.message || ""}`,
        });
        return;
      }

      setMsg({ type: "ok", text: "Image removed successfully." });
      setModalImage(null);
      await load();
    } catch (err) {
      console.error("OHC image delete error:", err);
      setMsg({
        type: "error",
        text: "Network error while removing image. Please try again.",
      });
    }
  }
  return { toggleOutsideDubai, toggleLeftCompany, handleDelete, startEdit, cancelEdit, setEditField, handleEditImageSelect, saveEdit, openImage, closeModal, handleDeleteImage };
}
