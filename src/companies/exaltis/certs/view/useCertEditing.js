// src/companies/exaltis/certs/view/useCertEditing.js
// Certificates view — inline edit, image replace, save, left-company toggle and delete.
// (Extracted from CertView.jsx — the code is unchanged.)
import { uploadImage } from "../../../../utils/imageUpload";
import { TYPE, getId, jsonFetch } from "./certViewModel";
import API_BASE from "../../../../config/api";

export function useCertEditing({ setEditDraft, setEditingRid, setMsg, editingRid, editDraft, raw, setSavingEdit, reload, setDeletingRid }) {
  function startEdit(row) {
    if (!row._rid) {
      alert("⚠️ Missing record id. Cannot edit this row.");
      return;
    }
    if (
      !window.confirm(
        "Enable edit mode for this certificate?\nهل تريد تعديل هذه الشهادة؟"
      )
    )
      return;

    const origPayload = row._record?.payload || row._record || {};

    setEditDraft({
      employeeNo: row.employeeNo || "",
      name: row.name || "",
      nationality: row.nationality || "",
      branch: row.branch || "",
      job: row.job || "",
      courseType: row.courseType || "",
      issueDate: row.issueDate || "",
      expiryDate: row.expiryDate || "",
      imageData: origPayload.imageUrl || origPayload.imageData || row.imageData || "",
      imageName: origPayload.imageName || "",
      imageType: origPayload.imageType || "",
    });
    setEditingRid(row._rid);
    setMsg("");
  }

  function cancelEdit() {
    setEditingRid(null);
    setEditDraft(null);
  }

  function updateEditField(key, value) {
    setEditDraft((prev) => ({ ...(prev || {}), [key]: value }));
  }

  // اختيار صورة جديدة أثناء التعديل
  async function handleEditImageSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!/^image\//.test(file.type)) {
      alert("Please select an image file.");
      return;
    }

    try {
      const compressed = await uploadImage(file, TYPE);
      setEditDraft((prev) => ({
        ...(prev || {}),
        imageData: compressed,
        imageName: file.name,
        imageType: "image/jpeg",
      }));
    } catch (err) {
      console.error("edit image compress error:", err);
      alert("Image processing failed. Try another image.");
    }
  }

  // حذف الصورة في وضع التعديل
  function handleRemoveEditImage() {
    if (
      !window.confirm(
        "Remove the certificate image for this record?\nحذف صورة الشهادة من هذا السجل؟"
      )
    )
      return;

    setEditDraft((prev) => ({
      ...(prev || {}),
      imageData: "",
      imageName: "",
      imageType: "",
    }));
  }

  // حفظ التعديل (PUT مع fallback POST + حذف القديم عند POST)
  async function saveEdit() {
    if (!editingRid || !editDraft) return;

    if (
      !window.confirm(
        "Save changes for this certificate?\nهل تريد حفظ التعديلات على هذه الشهادة؟"
      )
    )
      return;

    const rid = editingRid;
    const rec = raw.find((r) => getId(r) === rid);
    const origPayload = rec?.payload || rec || {};

    const payload = {
      ...origPayload,
      employeeNo: editDraft.employeeNo,
      name: editDraft.name,
      nationality: editDraft.nationality,
      branch: editDraft.branch,
      job: editDraft.job,
      courseType: editDraft.courseType,
      issueDate: editDraft.issueDate,
      expiryDate: editDraft.expiryDate || undefined,
      savedAt: new Date().toISOString(),
      // editDraft.imageData now carries a Cloudinary URL, so it is written to
      // imageUrl; imageData is blanked so no record keeps an embedded file.
      imageUrl: editDraft.imageData || undefined,
      imageData: "",
      imageName: editDraft.imageData
        ? editDraft.imageName || origPayload.imageName || "certificate.jpg"
        : undefined,
      imageType: editDraft.imageData
        ? editDraft.imageType || "image/jpeg"
        : undefined,
    };

    try {
      setSavingEdit(true);
      setMsg("");

      let ok = false;
      let status = 0;
      let data = null;
      let didUsePut = false;

      if (rid) {
        // محاولة تعديل السجل الحالي
        const putRes = await jsonFetch(
          `${API_BASE}/api/reports/${encodeURIComponent(rid)}`,
          {
            method: "PUT",
            body: JSON.stringify({ reporter: "sweets", type: TYPE, payload }),
          }
        );
        didUsePut = true;
        ok = putRes.ok;
        status = putRes.status;
        data = putRes.data;
      }

      // No POST+DELETE fallback: a failed PUT must surface, not quietly
      // clone the record (a failed DELETE would leave a duplicate).

      if (!ok) {
        const serverMsg =
          data?.message ||
          (status >= 500
            ? "Server error. Please try again later."
            : "Failed to save changes. Please check and try again.");
        setMsg(`Failed to save changes (HTTP ${status}). ${serverMsg}`);
        return;
      }

      await reload();
      setMsg("✅ Certificate updated successfully.");
      setEditingRid(null);
      setEditDraft(null);
    } catch (err) {
      console.error("saveEdit error:", err);
      setMsg(
        "Network error while saving changes. Please check your connection and try again."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  // Toggle Left Company in place (PUT on the same record)
  async function toggleLeftCompany(row) {
    if (!row?._rid) {
      alert("⚠️ Missing record id. Cannot update this row.");
      return;
    }
    const newVal = !row.leftCompany;
    const action = newVal
      ? "Mark as Left Company"
      : "Restore (Active Employee)";
    const note = newVal
      ? "This will hide the record from the main view & expiry alerts. Record stays in the database."
      : "This will return the record to the active list.";
    if (!window.confirm(`${action}?\n\n${note}`)) return;

    const rec = raw.find((r) => getId(r) === row._rid);
    const origPayload = rec?.payload || rec || {};
    const payload = {
      ...origPayload,
      leftCompany: newVal,
      savedAt: new Date().toISOString(),
    };

    try {
      setMsg("");
      let ok = false;
      let status = 0;
      let data = null;

      const putRes = await jsonFetch(
        `${API_BASE}/api/reports/${encodeURIComponent(row._rid)}`,
        { method: "PUT", body: JSON.stringify({ type: TYPE, payload }) }
      );
      ok = putRes.ok;
      status = putRes.status;
      data = putRes.data;

      if (!ok) {
        setMsg(
          `Failed to update (HTTP ${status}). ${data?.message || ""}`
        );
        return;
      }

      await reload();
      setMsg(
        newVal
          ? "✅ Marked as Left Company (hidden from main view)."
          : "✅ Restored as active employee."
      );
    } catch (err) {
      console.error("toggleLeftCompany error:", err);
      setMsg("❌ Network error while updating. Please try again.");
    }
  }

  // حذف شهادة
  async function handleDeleteCert(row) {
    const rid = row._rid;
    if (!rid) {
      alert("⚠️ Missing record id. Cannot delete this row.");
      return;
    }
    if (
      !window.confirm(
        "Are you sure you want to delete this certificate?\nهل تريد حذف هذه الشهادة؟"
      )
    )
      return;

    try {
      setDeletingRid(rid);
      setMsg("");
      const res = await fetch(
        `${API_BASE}/api/reports/${encodeURIComponent(rid)}`,
        { method: "DELETE" }
      );

      // 404 نعتبرها كأن السجل غير موجود أصلاً
      if (!res.ok && res.status !== 404) {
        throw new Error(`HTTP ${res.status}`);
      }

      await reload();
      setMsg("✅ Certificate deleted successfully.");
    } catch (err) {
      console.error("Delete certificate error:", err);
      setMsg("❌ Delete failed. Please try again.");
    } finally {
      setDeletingRid(null);
    }
  }
  return { startEdit, cancelEdit, updateEditField, handleEditImageSelect, handleRemoveEditImage, saveEdit, toggleLeftCompany, handleDeleteCert };
}
