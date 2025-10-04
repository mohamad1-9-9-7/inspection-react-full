// src/pages/Returns.js

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/* ========= API BASE ========= */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
let fromVite;
try { fromVite = import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.RENDER_EXTERNAL_URL); }
catch { fromVite = undefined; }
const fromCRA = process.env?.REACT_APP_API_URL;
export const API_BASE = String(fromVite || fromCRA || API_ROOT_DEFAULT).replace(/\/$/, "");

/* ========= ثوابت ========= */
const BRANCHES = [
  "QCS",
  "POS 6","POS 7","POS 10","POS 11","POS 14","POS 15","POS 16","POS 17",
  "POS 18",
  "POS 19","POS 21","POS 24","POS 25",
  "POS 26",
  "POS 31",
  "POS 34",
  "POS 35",
  "POS 36",
  "POS 37","POS 38",
  "POS 41",
  "POS 42",
  "FTR 1",
  "FTR 2",
  "POS 43",
  "POS 44","POS 45",
  "فرع آخر... / Other branch"
];

const ACTIONS = [
  "Use in production",
  "Condemnation",
  "Use in kitchen",
  "Send to market",
  "Disposed",
  "Separated expired shelf",
  "Other..."
];

const QTY_TYPES = ["KG", "PCS", "أخرى / Other"];
const RETURNS_CREATE_PASSWORD = "9999";

/* ========= Helpers ========= */
function getToday(){ return new Date().toISOString().slice(0,10); }

/* ===== Helpers: Images API ===== */
async function uploadViaServer(file){
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, { method:"POST", body: fd });
  const data = await res.json().catch(()=>({}));
  if(!res.ok || !data.ok || !(data.optimized_url || data.url)){
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url;
}
async function deleteImage(url){
  if(!url) return;
  const res = await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, { method:"DELETE" });
  const data = await res.json().catch(()=>({}));
  if(!res.ok || !data?.ok) throw new Error(data?.error || "Delete image failed");
}
async function sendOneToServer({ reportDate, items }){
  const res = await fetch(`${API_BASE}/api/reports`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ reporter:"anonymous", type:"returns", payload:{ reportDate, items } })
  });
  if(!res.ok){ const t = await res.text(); throw new Error(`Server ${res.status}: ${t}`); }
  return res.json();
}

/* ================= Password Modal ================= */
function PasswordModal({ show, onSubmit, onClose, error }){
  const [password, setPassword] = useState("");
  useEffect(()=>{ if(show) setPassword(""); },[show]);
  if(!show) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(44,62,80,0.24)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,direction:"rtl"}}>
      <div style={{background:"#fff",padding:"2.2rem 2.5rem",borderRadius:17,minWidth:320,boxShadow:"0 4px 32px #2c3e5077",textAlign:"center",position:"relative",fontFamily:"Cairo,sans-serif"}}>
        <button onClick={onClose} style={{position:"absolute",top:10,left:15,fontSize:22,background:"transparent",border:"none",color:"#c0392b",cursor:"pointer"}}>✖</button>
        <div style={{fontWeight:"bold",fontSize:"1.18em",color:"#2980b9",marginBottom:14}}>🔒 كلمة سر إنشاء المرتجعات / Password required</div>
        <form onSubmit={(e)=>{e.preventDefault(); onSubmit(password);}}>
          <input
            type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4}
            autoComplete="off" autoCorrect="off" spellCheck={false} autoCapitalize="off" autoFocus
            placeholder="أدخل كلمة السر / Enter password"
            style={{width:"90%",padding:"11px",fontSize:"1.1em",border:"1.8px solid #b2babb",borderRadius:10,marginBottom:16,background:"#f4f6f7"}}
            value={password}
            onChange={(e)=> setPassword(e.target.value.replace(/\D/g,"").slice(0,4))}
            onKeyDown={(e)=> e.stopPropagation()}
          />
          <button type="submit" style={{width:"100%",background:"#884ea0",color:"#fff",border:"none",padding:"11px 0",borderRadius:8,fontWeight:"bold",fontSize:"1.13rem",marginBottom:10,cursor:"pointer",boxShadow:"0 2px 12px #d2b4de"}}>دخول / Sign in</button>
          {error && <div style={{color:"#c0392b",fontWeight:"bold",marginTop:5}}>{error}</div>}
        </form>
      </div>
    </div>
  );
}

/* ===== Images Manager Modal ===== */
function ImageManagerModal({ open, row, onClose, onAddImages, onRemoveImage }){
  const [previewSrc, setPreviewSrc] = useState("");
  const inputRef = useRef(null);
  useEffect(()=>{
    if(!open) setPreviewSrc("");
    const onEsc = (e)=>{ if(e.key==="Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return ()=> window.removeEventListener("keydown", onEsc);
  },[open,onClose]);
  if(!open) return null;
  const pick = ()=> inputRef.current?.click();
  const handleFiles = async (e)=>{
    const files = Array.from(e.target.files || []);
    if(!files.length) return;
    const urls = [];
    for(const f of files){ try{ urls.push(await uploadViaServer(f)); } catch(err){ console.error("upload failed:",err); } }
    if(urls.length) onAddImages(urls);
    e.target.value = "";
  };
  return (
    <div style={galleryBack} onClick={onClose}>
      <div style={galleryCard} onClick={(e)=> e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
          <div style={{fontWeight:900,fontSize:"1.05rem",color:"#0f172a"}}>🖼️ Product Images {row?.productName ? `— ${row.productName}` : ""}</div>
          <button onClick={onClose} style={galleryClose}>✕</button>
        </div>
        {previewSrc && (
          <div style={{marginTop:10,marginBottom:8}}>
            <img src={previewSrc} alt="preview" style={{maxWidth:"100%",maxHeight:700,borderRadius:15,boxShadow:"0 6px 18px rgba(0,0,0,.2)"}} />
          </div>
        )}
        <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10,marginBottom:8}}>
          <button onClick={pick} style={btnBlueModal}>⬆️ Upload images</button>
          <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{display:"none"}} />
          <div style={{fontSize:13,color:"#334155"}}>Unlimited images per item (server compresses automatically).</div>
        </div>
        <div style={thumbsWrap}>
          {(row?.images || []).length===0 ? <div style={{color:"#64748b"}}>No images yet.</div> :
            row.images.map((src,i)=>(
              <div key={i} style={thumbTile} title={`Image ${i+1}`}>
                <img src={src} alt={`img-${i}`} style={thumbImg} onClick={()=> setPreviewSrc(src)} />
                <button title="Remove" onClick={()=> onRemoveImage(i)} style={thumbRemove}>✕</button>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

/* ====================== الصفحة الرئيسية ====================== */
export default function Returns(){
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(true);
  const [modalError, setModalError] = useState("");
  const handleSubmitPassword = (val)=>{ if(val===RETURNS_CREATE_PASSWORD){ setModalOpen(false); setModalError(""); } else { setModalError("❌ كلمة السر غير صحيحة! / Wrong password!"); } };
  const handleCloseModal = ()=> navigate("/returns/menu",{ replace:true });

  const [reportDate, setReportDate] = useState(getToday());
  const [rows, setRows] = useState([{
    itemCode:"", productName:"", origin:"", butchery:"", customButchery:"",
    quantity:"", qtyType:"KG", customQtyType:"", expiry:"", remarks:"",
    action:"", customAction:"", images:[]
  }]);
  const [saveMsg, setSaveMsg] = useState("");
  const [saving, setSaving] = useState(false);

  /* ===== تحميل الأصناف من /public/data/items.json ===== */
  const [itemsAll, setItemsAll] = useState([]);   // [{item_code, description}]
  const [itemsLoadError, setItemsLoadError] = useState("");

  useEffect(()=>{
    const tryLoad = async ()=>{
      setItemsLoadError("");
      try{
        const r1 = await fetch("/data/items.json", { cache:"no-store" });
        if(r1.ok){
          const j = await r1.json();
          if(Array.isArray(j)) { setItemsAll(j); return; }
        }
      }catch(e){ /* continue */ }

      try{
        const base = (process.env.PUBLIC_URL || "").replace(/\/$/,"");
        const r2 = await fetch(`${base}/data/items.json`, { cache:"no-store" });
        if(r2.ok){
          const j = await r2.json();
          if(Array.isArray(j)) { setItemsAll(j); return; }
        }
        setItemsLoadError("⚠️ لم أستطع قراءة /data/items.json. تأكد من وجود الملف في public/data وفتح الرابط مباشرة بالمتصفح.");
      }catch(err){
        console.error("items load failed:", err);
        setItemsLoadError("⚠️ فشل تحميل ملف الأصناف.");
      }
    };
    tryLoad();
  },[]);

  /* ===== البحث المحلي + التطبيع ===== */
  const [itemHints, setItemHints] = useState({}); // { idx: [...] }
  const [hintSel, setHintSel] = useState({});     // { idx: selectedIndex }
  const [activeCell, setActiveCell] = useState({ row: null, field: null }); // أي خلية نشطة

  const normalize = (v) =>
    String(v ?? "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[-_()\/\\]/g, "");

  const localSearch = (q)=>{
    const s = normalize(q);
    if(!s) return itemsAll.slice(0,20);
    return itemsAll
      .filter(it=>{
        const code = normalize(it.item_code);
        const name = normalize(it.description);
        return code.startsWith(s) || code.includes(s) || name.includes(s);
      })
      .slice(0,20);
  };

  const showHintsFor = (idx,q)=>{
    const results = localSearch(q);
    setItemHints(h=>({ ...h, [idx]: results }));
    setHintSel(h=>({ ...h, [idx]: results.length ? 0 : -1 }));
    // لا اختيار تلقائي حتى لو نتيجة واحدة
  };

  const tryExactFill = (idx, field, value)=>{
    const s = normalize(value);
    if(!s) return;
    if(field==="itemCode"){
      const hit = itemsAll.find(it=> normalize(it.item_code) === s );
      if(hit){
        setRows(prev=> prev.map((r,i)=> i===idx ? { ...r, productName: hit.description } : r ));
        setItemHints(h=>({ ...h, [idx]: [] }));
      }
    }else if(field==="productName"){
      const hit = itemsAll.find(it=> normalize(it.description) === s );
      if(hit){
        setRows(prev=> prev.map((r,i)=> i===idx ? { ...r, itemCode: hit.item_code } : r ));
        setItemHints(h=>({ ...h, [idx]: [] }));
      }
    }
  };

  const pickItem = (idx,item)=>{
    setRows(prev=> prev.map((r,i)=> i===idx ? { ...r, itemCode:item.item_code, productName:item.description } : r ));
    setItemHints(h=>({ ...h, [idx]: [] }));
    setHintSel(h=>({ ...h, [idx]: -1 }));
    setActiveCell({ row: null, field: null }); // إغلاق القائمة
  };
  const pickFirstHint = (idx)=>{
    const list = itemHints[idx] || [];
    if(list.length) pickItem(idx, list[ hintSel[idx] ?? 0 ]);
  };

  const addRow = ()=> setRows(prev=> [...prev,{
    itemCode:"",productName:"",origin:"",butchery:"",customButchery:"",
    quantity:"",qtyType:"KG",customQtyType:"",expiry:"",remarks:"",
    action:"",customAction:"",images:[]
  }]);

  const removeRow = (index)=> setRows(rows.filter((_,idx)=> idx!==index));

  const handleChange = (idx, field, value)=>{
    const updated = [...rows];
    updated[idx][field] = value;

    if(field==="itemCode"){ showHintsFor(idx,value); tryExactFill(idx,"itemCode",value); }
    if(field==="productName"){ showHintsFor(idx,value); tryExactFill(idx,"productName",value); }

    if(field==="butchery" && value!=="فرع آخر... / Other branch") updated[idx].customButchery="";
    if(field==="action" && value!=="Other...") updated[idx].customAction="";
    if(field==="qtyType" && value!=="أخرى / Other") updated[idx].customQtyType="";
    setRows(updated);
  };

  /* ===== الصور ===== */
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageRowIndex, setImageRowIndex] = useState(-1);
  const openImagesFor = (idx)=>{ setImageRowIndex(idx); setImageModalOpen(true); };
  const closeImages = ()=> setImageModalOpen(false);

  const addImagesToRow = async (urls)=>{
    if(imageRowIndex<0) return;
    setRows(prev=> prev.map((r,i)=> i===imageRowIndex ? { ...r, images:[...(r.images||[]), ...urls] } : r ));
    setSaveMsg("✅ Images added."); setTimeout(()=> setSaveMsg(""),2000);
  };
  const removeImageFromRow = async (imgIndex)=>{
    if(imageRowIndex<0) return;
    try{
      const url = rows?.[imageRowIndex]?.images?.[imgIndex];
      if(url){ try{ await deleteImage(url); }catch{} }
      setRows(prev=> prev.map((r,i)=>{
        if(i!==imageRowIndex) return r;
        const next = Array.isArray(r.images)? [...r.images]:[];
        next.splice(imgIndex,1);
        return { ...r, images: next };
      }));
      setSaveMsg("✅ Image removed.");
    }catch(e){
      console.error(e);
      setSaveMsg("❌ Failed to remove image.");
    }finally{
      setTimeout(()=> setSaveMsg(""),2000);
    }
  };

  /* ===== الحفظ (معدّل لمنع حفظ الصفوف الفارغة) ===== */
  const handleSave = async ()=>{
    if(saving) return;

    // 1) تنظيف وتجهيز القيم
    const prepared = rows.map((r)=> {
      const q = Number(r.quantity);
      return {
        ...r,
        itemCode:(r.itemCode||"").trim(),
        productName:(r.productName||"").trim(),
        origin:(r.origin||"").trim(),
        butchery:(r.butchery||"").trim(),
        customButchery:(r.customButchery||"").trim(),
        // لا نحولها "0" إذا كانت فاضية — نخليها فارغة
        quantity: Number.isFinite(q) && q > 0 ? q : "",
        qtyType:(r.qtyType||"").trim(),
        customQtyType:(r.customQtyType||"").trim(),
        expiry:(r.expiry||"").trim(),
        remarks:(r.remarks||"").trim(),
        action:(r.action||"").trim(),
        customAction:(r.customAction||"").trim(),
        images:Array.isArray(r.images)? r.images:[]
      };
    });

    // 2) فلترة: لا نحفظ أي صف بدون (اسم منتج أو كود صنف) + لازم يكون فيه شيء مفيد إضافي
    const filtered = prepared.filter(r=>{
      const hasKey = !!(r.itemCode || r.productName);
      const hasMeaningful =
        r.origin ||
        r.butchery ||
        r.customButchery ||
        r.quantity !== "" ||          // كمية رقمية > 0
        r.expiry ||
        r.remarks ||
        r.action ||
        r.customAction ||
        (r.images && r.images.length > 0);
      return hasKey && hasMeaningful;
    });

    if(!filtered.length){
      setSaveMsg("لا يوجد صف صالح للحفظ. أضف كود الصنف أو اسم المنتج مع بيانات إضافية.");
      setTimeout(()=> setSaveMsg(""),2500);
      return;
    }

    try{
      setSaving(true);
      setSaveMsg("⏳ جاري الحفظ على السيرفر… / Saving to server…");
      const res = await sendOneToServer({ reportDate, items: filtered });
      setSaveMsg(`✅ تم الحفظ بنجاح. رقم المرجع: ${res?.id || "—"}`);
    }catch(err){
      setSaveMsg("❌ فشل الحفظ على السيرفر. حاول مجددًا. / Save failed. Please try again.");
      console.error(err);
    }finally{
      setSaving(false);
      setTimeout(()=> setSaveMsg(""),3500);
    }
  };

  if(modalOpen){
    return <PasswordModal show={modalOpen} onSubmit={handleSubmitPassword} onClose={handleCloseModal} error={modalError} />;
  }

  return (
    <div style={{fontFamily:"Cairo, sans-serif",padding:"2.5rem",background:"#f4f6fa",minHeight:"100vh",direction:"rtl"}}>
      <h2 style={{textAlign:"center",color:"#512e5f",marginBottom:"2.3rem",fontWeight:"bold"}}>🛒 سجل المرتجعات (Returns Register)</h2>

      {/* حالة تحميل الأصناف */}
      <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:10}}>
        <span style={{
          background: itemsAll.length? "#e8f5e9":"#ffebee",
          color: itemsAll.length? "#1b5e20":"#b71c1c",
          border:"1px solid #eee", padding:"6px 10px", borderRadius:10, fontWeight:700
        }}>
          Items loaded: {itemsAll.length}
        </span>
        {itemsLoadError && <span style={{color:"#b71c1c",fontWeight:700}}>{itemsLoadError}</span>}
      </div>

      {/* تاريخ */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginBottom:24,fontSize:"1.17em"}}>
        <span style={{background:"#884ea0",color:"#fff",padding:"9px 17px",borderRadius:14,boxShadow:"0 2px 10px #e8daef44",display:"flex",alignItems:"center",gap:9,fontWeight:"bold"}}>
          <span role="img" aria-label="calendar" style={{fontSize:22}}>📅</span>
          تاريخ إعداد التقرير / Report Date:
          <input type="date" value={reportDate} onChange={e=> setReportDate(e.target.value)}
            style={{marginRight:10,background:"#fcf6ff",border:"none",borderRadius:7,padding:"7px 14px",fontWeight:"bold",fontSize:"1em",color:"#512e5f",boxShadow:"0 1px 4px #e8daef44"}}
          />
        </span>
      </div>

      {/* أزرار */}
      <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:"1.2rem",marginBottom:20}}>
        <button onClick={handleSave} disabled={saving}
          style={{background:saving?"#7fbf9f":"#229954",color:"#fff",border:"none",borderRadius:14,fontWeight:"bold",fontSize:"1.08em",padding:"10px 32px",cursor:saving?"not-allowed":"pointer",boxShadow:"0 2px 8px #d4efdf"}}>
          {saving? "…Saving":"💾 حفظ / Save"}
        </button>
        <button onClick={()=> navigate("/returns/view")}
          style={{background:"#884ea0",color:"#fff",border:"none",borderRadius:14,fontWeight:"bold",fontSize:"1.08em",padding:"10px 32px",cursor:"pointer",boxShadow:"0 2px 8px #d2b4de"}}>
          📋 عرض التقارير / View Reports
        </button>
        {saveMsg && (
          <span style={{marginRight:18,fontWeight:"bold",color: saveMsg.startsWith("✅")?"#229954":(saveMsg.startsWith("⏳")?"#512e5f":"#c0392b"),fontSize:"1.05em"}}>
            {saveMsg}
          </span>
        )}
      </div>

      {/* جدول */}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", background:"#fff", borderRadius:16, boxShadow:"0 2px 16px #dcdcdc70", borderCollapse:"collapse", minWidth:1500 }}>
          <thead>
            <tr style={{ background:"#e8daef", color:"#512e5f" }}>
              <th style={th}>التسلسل / SL.NO</th>
              <th style={th}>كود الصنف / ITEM CODE</th>
              <th style={th}>اسم المنتج / PRODUCT NAME</th>
              <th style={th}>المنشأ / ORIGIN</th>
              <th style={th}>الفرع / BUTCHERY</th>
              <th style={th}>الكمية / QUANTITY</th>
              <th style={th}>نوع الكمية / QTY TYPE</th>
              <th style={th}>تاريخ الانتهاء / EXPIRY DATE</th>
              <th style={th}>ملاحظات / REMARKS</th>
              <th style={th}>الإجراء / ACTION</th>
              <th style={th}>الصور / IMAGES</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx)=>(
              <tr key={idx} style={{ background: idx%2 ? "#fcf3ff":"#fff" }}>
                <td style={td}>{idx+1}</td>

                {/* ITEM CODE */}
                <td style={tdRel}>
                  <input
                    style={input}
                    placeholder="اكتب الكود / Enter Item Code"
                    value={row.itemCode||""}
                    onChange={e=> handleChange(idx,"itemCode",e.target.value)}
                    onFocus={()=> { setActiveCell({ row: idx, field: "itemCode" }); showHintsFor(idx, row.itemCode||""); }}
                    onBlur={()=> setTimeout(()=> {
                      setActiveCell(c => (c.row===idx && c.field==="itemCode" ? { row:null, field:null } : c));
                    }, 120)}
                    onKeyDown={(e)=>{
                      const list = itemHints[idx] || [];
                      if(e.key==="Enter"){ e.preventDefault(); if(list.length) pickItem(idx, list[ hintSel[idx] ?? 0 ]); }
                      if(e.key==="ArrowDown" && list.length){ e.preventDefault(); setHintSel(h=>({ ...h, [idx]: Math.min((h[idx] ?? 0)+1, list.length-1) })); }
                      if(e.key==="ArrowUp" && list.length){ e.preventDefault(); setHintSel(h=>({ ...h, [idx]: Math.max((h[idx] ?? 0)-1, 0) })); }
                    }}
                  />
                  {(activeCell.row===idx && activeCell.field==="itemCode" && (itemHints[idx]?.length)) && (
                    <div style={hintBox}>
                      {itemHints[idx].map((it,k)=>(
                        <div
                          key={k}
                          onMouseDown={(e)=> e.preventDefault()}
                          onClick={()=> pickItem(idx,it)}
                          style={{ ...hintRow, background: (hintSel[idx] ?? 0)===k ? "#eef2ff" : "transparent" }}
                        >
                          <div style={{fontWeight:700}}>{it.item_code}</div>
                          <div style={{fontSize:12,color:"#475569"}}>{it.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </td>

                {/* PRODUCT NAME */}
                <td style={tdRel}>
                  <input
                    style={input}
                    placeholder="اكتب اسم المنتج / Enter product name"
                    value={row.productName}
                    onChange={e=> handleChange(idx,"productName",e.target.value)}
                    onFocus={()=> { setActiveCell({ row: idx, field: "productName" }); showHintsFor(idx, row.productName||""); }}
                    onBlur={()=> setTimeout(()=> {
                      setActiveCell(c => (c.row===idx && c.field==="productName" ? { row:null, field:null } : c));
                    }, 120)}
                    onKeyDown={(e)=>{
                      const list = itemHints[idx] || [];
                      if(e.key==="Enter"){ e.preventDefault(); if(list.length) pickItem(idx, list[ hintSel[idx] ?? 0 ]); }
                      if(e.key==="ArrowDown" && list.length){ e.preventDefault(); setHintSel(h=>({ ...h, [idx]: Math.min((h[idx] ?? 0)+1, list.length-1) })); }
                      if(e.key==="ArrowUp" && list.length){ e.preventDefault(); setHintSel(h=>({ ...h, [idx]: Math.max((h[idx] ?? 0)-1, 0) })); }
                    }}
                  />
                  {(activeCell.row===idx && activeCell.field==="productName" && (itemHints[idx]?.length) && !row.itemCode) && (
                    <div style={hintBox}>
                      {itemHints[idx].map((it,k)=>(
                        <div
                          key={k}
                          onMouseDown={(e)=> e.preventDefault()}
                          onClick={()=> pickItem(idx,it)}
                          style={{ ...hintRow, background: (hintSel[idx] ?? 0)===k ? "#eef2ff" : "transparent" }}
                        >
                          <div style={{fontWeight:700}}>{it.item_code}</div>
                          <div style={{fontSize:12,color:"#475569"}}>{it.description}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </td>

                {/* ORIGIN */}
                <td style={td}>
                  <input style={input} placeholder="اكتب المنشأ / Enter origin" value={row.origin} onChange={e=> handleChange(idx,"origin",e.target.value)} />
                </td>

                {/* BUTCHERY */}
                <td style={td}>
                  <select style={input} value={row.butchery} onChange={e=> handleChange(idx,"butchery",e.target.value)}>
                    <option value="">{`اختر الفرع / Select branch`}</option>
                    {BRANCHES.map(b=> <option key={b} value={b}>{b}</option>)}
                  </select>
                  {row.butchery==="فرع آخر... / Other branch" && (
                    <input style={{...input,marginTop:6}} placeholder="اكتب اسم الفرع / Enter branch name" value={row.customButchery} onChange={e=> handleChange(idx,"customButchery",e.target.value)} />
                  )}
                </td>

                {/* QUANTITY */}
                <td style={td}>
                  <input type="number" min="0" style={input} placeholder="ادخل الكمية / Enter quantity" value={row.quantity} onChange={e=> handleChange(idx,"quantity",e.target.value)} />
                </td>

                {/* QTY TYPE */}
                <td style={td}>
                  <select style={input} value={row.qtyType} onChange={e=> handleChange(idx,"qtyType",e.target.value)}>
                    {QTY_TYPES.map(q=> <option key={q} value={q}>{q}</option>)}
                  </select>
                  {row.qtyType==="أخرى / Other" && (
                    <input style={{...input,marginTop:6}} placeholder="اكتب النوع / Enter type" value={row.customQtyType} onChange={e=> handleChange(idx,"customQtyType",e.target.value)} />
                  )}
                </td>

                {/* EXPIRY */}
                <td style={td}>
                  <input type="date" style={input} placeholder="YYYY-MM-DD" value={row.expiry} onChange={e=> handleChange(idx,"expiry",e.target.value)} />
                </td>

                {/* REMARKS */}
                <td style={td}>
                  <input style={input} placeholder="اكتب ملاحظات / Enter remarks" value={row.remarks} onChange={e=> handleChange(idx,"remarks",e.target.value)} />
                </td>

                {/* ACTION */}
                <td style={td}>
                  <select style={input} value={row.action} onChange={e=> handleChange(idx,"action",e.target.value)}>
                    <option value="">{`Select action`}</option>
                    {ACTIONS.map(a=> <option key={a} value={a}>{a}</option>)}
                  </select>
                  {row.action==="Other..." && (
                    <input style={{...input,marginTop:6}} placeholder="Enter custom action" value={row.customAction} onChange={e=> handleChange(idx,"customAction",e.target.value)} />
                  )}
                </td>

                {/* صور */}
                <td style={td}>
                  <button onClick={()=> openImagesFor(idx)} style={btnImg} title="Manage images">🖼️ Images ({Array.isArray(row.images)? row.images.length:0})</button>
                </td>

                {/* حذف صف */}
                <td style={td}>
                  {rows.length>1 && (
                    <button onClick={()=> removeRow(idx)} style={{background:"#c0392b",color:"#fff",border:"none",borderRadius:8,fontWeight:"bold",fontSize:20,padding:"4px 12px",cursor:"pointer"}} title="حذف الصف / Delete row">✖</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{marginTop:"2rem",textAlign:"center"}}>
        <button onClick={addRow} style={{background:"#512e5f",color:"#fff",border:"none",borderRadius:14,fontWeight:"bold",fontSize:"1.13em",padding:"12px 35px",cursor:"pointer",boxShadow:"0 2px 8px #d2b4de"}}>➕ إضافة صف جديد / Add new row</button>
      </div>

      <ImageManagerModal
        open={imageModalOpen}
        row={imageRowIndex>=0 ? (rows?.[imageRowIndex]||{}) : null}
        onClose={closeImages}
        onAddImages={addImagesToRow}
        onRemoveImage={removeImageFromRow}
      />
    </div>
  );
}

/* ====== Styles ====== */
const th = { padding:"13px 7px", textAlign:"center", fontSize:"1.09em", fontWeight:"bold", borderBottom:"2px solid #c7a8dc" };
const td = { padding:"10px 6px", textAlign:"center", minWidth:120 };
const tdRel = { ...td, position:"relative", overflow:"visible" };
const input = { padding:"7px 8px", borderRadius:7, border:"1.5px solid #c7a8dc", background:"#fcf6ff", fontSize:"1em", minWidth:100 };
const btnImg = { background:"#2563eb", color:"#fff", border:"none", padding:"6px 12px", borderRadius:10, fontWeight:800, cursor:"pointer", boxShadow:"0 1px 6px #bfdbfe" };
const hintBox = { position:"absolute", top:"calc(100% + 4px)", right:6, left:6, background:"#fff", border:"1px solid #e5e7eb", borderRadius:8, boxShadow:"0 8px 20px rgba(0,0,0,.08)", zIndex:60, maxHeight:220, overflow:"auto" };
const hintRow = { padding:"8px 10px", cursor:"pointer" };

/* ====== Gallery modal styles ====== */
const galleryBack = { position:"fixed", inset:0, background:"rgba(15,23,42,.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999 };
const galleryCard = { width:"min(1400px, 100vw)", maxHeight:"80vh", overflow:"auto", background:"#fff", color:"#111", borderRadius:14, border:"1px solid #e5e7eb", padding:"14px 16px", boxShadow:"0 12px 32px rgba(0,0,0,.25)" };
const galleryClose = { background:"transparent", border:"none", color:"#111", fontWeight:900, cursor:"pointer", fontSize:18 };
const btnBlueModal = { background:"#2563eb", color:"#fff", border:"none", borderRadius:10, padding:"8px 14px", fontWeight:"bold", cursor:"pointer", boxShadow:"0 1px 6px #bfdbfe" };
const thumbsWrap = { marginTop:8, display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))", gap:10 };
const thumbTile = { position:"relative", border:"1px solid #e5e7eb", borderRadius:10, overflow:"hidden", background:"#f8fafc" };
const thumbImg = { width:"100%", height:150, objectFit:"cover", display:"block" };
const thumbRemove = { position:"absolute", top:6, right:6, background:"#ef4444", color:"#fff", border:"none", borderRadius:8, padding:"2px 8px", fontWeight:800, cursor:"pointer" };
