// src/pages/Destruction/DisposalLog/CommentThread.jsx
//
// التعليقات — a short thread on one line of the reconciliation (a product's
// month, a day line, a month line). Unlike the one-shot "reviewed" note it is
// a conversation: the store manager asks, the branch answers, QA closes it.
// Stored by the parent in the shared config row, so everyone sees the same
// thread. Only the author can delete a comment.
//
// Photos (the voucher, the bin, the transfer note) go to Cloudinary through
// utils/imageUpload — never base64 into the payload. They are uploaded only
// when the comment is sent, so a photo picked and then removed is never
// stored; deleting a comment deletes its photos too.

import React, { useEffect, useRef, useState } from "react";
import { formatDMY } from "./disposalLogOptions";
import { deleteImage, thumbUrl, uploadImage } from "../../../utils/imageUpload";

const MAX_PHOTOS = 6;

function whoAmI() {
  try {
    const u = JSON.parse(localStorage.getItem("currentUser") || "{}");
    return u.displayName || u.username || "";
  } catch {
    return "";
  }
}

const when = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatDMY(d.toISOString().slice(0, 10))} ${hh}:${mm}`;
};

export function commentCount(comments, key) {
  return Array.isArray(comments?.[key]) ? comments[key].length : 0;
}

/** One comment as a line of text, photos as links — for Excel. */
export function commentsAsText(list) {
  return (Array.isArray(list) ? list : [])
    .map((c) => {
      const pics = Array.isArray(c.images) && c.images.length ? ` [${c.images.length} photo(s): ${c.images.join(" ")}]` : "";
      return `${c.by || "—"} (${formatDMY(String(c.at || "").slice(0, 10))}): ${c.text || ""}${pics}`;
    })
    .join(" | ");
}

const thumbBox = {
  width: 76, height: 76, borderRadius: 10, objectFit: "cover", display: "block",
  border: "1px solid #dbe4ee", background: "#f1f5f9",
};

export default function CommentThread({ title = "Comments — التعليقات", list, onAdd, onDelete }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]); // [{ file, url }]
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [zoom, setZoom] = useState("");
  const inputRef = useRef(null);
  const me = whoAmI();
  const items = Array.isArray(list) ? list : [];

  /* Free the local previews when they leave. */
  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  const addFiles = (incoming) => {
    const imgs = Array.from(incoming || []).filter((f) => f && /^image\//.test(f.type));
    if (!imgs.length) return;
    setErr("");
    setFiles((cur) => {
      const room = MAX_PHOTOS - cur.length;
      if (imgs.length > room) setErr(`Up to ${MAX_PHOTOS} photos per comment.`);
      return [...cur, ...imgs.slice(0, Math.max(0, room)).map((file) => ({ file, url: URL.createObjectURL(file) }))];
    });
  };

  const removeFile = (i) =>
    setFiles((cur) => {
      URL.revokeObjectURL(cur[i]?.url);
      return cur.filter((_, k) => k !== i);
    });

  const submit = async () => {
    const t = text.trim();
    if ((!t && !files.length) || busy) return;
    setErr("");
    let urls = [];
    try {
      if (files.length) {
        setBusy(`Uploading ${files.length} photo(s)…`);
        urls = await Promise.all(files.map((f) => uploadImage(f.file, "disposal_comment")));
      }
      setBusy("Saving…");
      const ok = await onAdd(t, urls);
      if (ok === false) throw new Error("The comment was not saved.");
      files.forEach((f) => URL.revokeObjectURL(f.url));
      setFiles([]);
      setText("");
    } catch (e) {
      /* Nothing points at photos of a comment that never saved. */
      urls.forEach((u) => deleteImage(u).catch(() => {}));
      setErr(e?.message || "Could not send the comment.");
    } finally {
      setBusy("");
    }
  };

  const remove = async (c) => {
    if (!window.confirm(c.images?.length ? "Delete this comment and its photos?" : "Delete this comment?")) return;
    setBusy("Deleting…");
    const ok = await onDelete(c.id);
    if (ok !== false) (c.images || []).forEach((u) => deleteImage(u).catch(() => {}));
    setBusy("");
  };

  return (
    <div
      style={{ border: "1px solid #e4ebf3", borderRadius: 12, padding: "10px 12px", background: "#fff" }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        if (!e.dataTransfer?.files?.length) return;
        e.preventDefault();
        addFiles(e.dataTransfer.files);
      }}
    >
      <strong style={{ display: "block", marginBottom: 6 }}>💬 {title} ({items.length})</strong>

      {items.length === 0 && <div className="dlx-muted" style={{ marginBottom: 6 }}>No comments yet.</div>}

      {items.map((c) => (
        <div
          key={c.id}
          style={{ borderInlineStart: "3px solid #a5f3fc", padding: "4px 10px", margin: "6px 0", background: "#f8fafc", borderRadius: 8 }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: "#0e7490", fontWeight: 900 }}>{c.by || "—"}</span>
            <span className="dlx-muted" style={{ margin: 0 }}>{when(c.at)}</span>
            {c.by && c.by === me && (
              <button
                type="button"
                className="dlx-iconBtn"
                style={{ marginInlineStart: "auto" }}
                title="Delete my comment"
                disabled={!!busy}
                onClick={() => remove(c)}
              >
                ✕
              </button>
            )}
          </div>
          {c.text && <div dir="auto" style={{ whiteSpace: "pre-wrap", fontWeight: 700, color: "#1e293b" }}>{c.text}</div>}
          {Array.isArray(c.images) && c.images.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {c.images.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setZoom(u)}
                  title="Open the photo"
                  style={{ padding: 0, border: 0, background: "transparent", cursor: "zoom-in" }}
                >
                  <img src={thumbUrl(u, 160)} alt="" loading="lazy" style={thumbBox} />
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {files.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {files.map((f, i) => (
            <div key={f.url} style={{ position: "relative" }}>
              <img src={f.url} alt="" style={thumbBox} />
              <button
                type="button"
                onClick={() => removeFile(i)}
                disabled={!!busy}
                title="Remove this photo"
                style={{
                  position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 999,
                  border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", cursor: "pointer",
                  lineHeight: "18px", padding: 0, fontWeight: 900,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 6, flexWrap: "wrap" }}>
        <textarea
          dir="auto"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const pics = Array.from(e.clipboardData?.files || []).filter((f) => /^image\//.test(f.type));
            if (pics.length) {
              e.preventDefault();
              addFiles(pics);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder="Write a comment… photos: 📷 button, paste, or drop here (Ctrl+Enter to send)"
          style={{
            flex: "1 1 260px", minWidth: 0, border: "1px solid #cfdbe8", borderRadius: 10, padding: "7px 10px",
            fontFamily: "inherit", resize: "vertical", background: "#fff", color: "#0f172a",
          }}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="dlx-btn dlx-soft"
          onClick={() => inputRef.current?.click()}
          disabled={!!busy || files.length >= MAX_PHOTOS}
          title={`Attach photos (up to ${MAX_PHOTOS})`}
        >
          📷 Photo{files.length ? ` (${files.length})` : ""}
        </button>
        <button
          type="button"
          className="dlx-btn dlx-primary"
          onClick={submit}
          disabled={!!busy || (!text.trim() && !files.length)}
        >
          {busy || "💬 Add"}
        </button>
      </div>
      {err && <div className="dlx-note dlx-noteErr" style={{ marginTop: 6 }}>{err}</div>}

      {zoom && (
        <div className="dlx-modalWrap" role="dialog" aria-modal="true" onClick={() => setZoom("")} style={{ cursor: "zoom-out" }}>
          <div style={{ position: "relative", maxWidth: "94vw", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
            <img src={zoom} alt="" style={{ maxWidth: "94vw", maxHeight: "84vh", borderRadius: 12, display: "block", background: "#fff" }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <a className="dlx-btn dlx-soft" href={zoom} target="_blank" rel="noreferrer">↗ Open full size</a>
              <button type="button" className="dlx-btn dlx-soft" onClick={() => setZoom("")}>✕ Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
