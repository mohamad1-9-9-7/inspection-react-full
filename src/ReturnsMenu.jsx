// src/ReturnsMenu.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArchive,
  FiArrowRight,
  FiBarChart2,
  FiClipboard,
  FiFilePlus,
  FiFolder,
  FiHome,
  FiPackage,
  FiSearch,
  FiTruck,
  FiUser,
} from "react-icons/fi";
import logo from "./assets/almawashi-logo.jpg";
import { isItemAllowed } from "./utils/sectionItems";

/* Design name: Al Mawashi Teal Dashboard */
const browseLinks = [
  { perm: "returns.browse", to: "/returns/browse", Icon: FiFolder, label: "Browse Returns Reports", ar: "عرض تقارير المرتجعات", tone: "teal" },
  { perm: "meatDaily.browse", to: "/meat-daily/browse", Icon: FiBarChart2, label: "Browse Meat Daily", ar: "عرض حالة اللحوم اليومية", tone: "blue" },
  { perm: "customerReturns.browse", to: "/returns-customers/browse", Icon: FiUser, label: "Browse Customer Returns", ar: "عرض مرتجعات العملاء", tone: "green" },
  { perm: "inventory.browse", to: "/inventory-daily/browse", Icon: FiPackage, label: "Browse Inventory Daily", ar: "عرض المخزون اليومي", tone: "cyan" },
  { perm: "enoc.browse", to: "/enoc-returns/browse-view", Icon: FiTruck, label: "Browse ENOC Returns", ar: "عرض مرتجعات ENOC", tone: "orange" },
];

const createLinks = [
  { perm: "returns.create", to: "/returns", Icon: FiFilePlus, label: "Create Returns Report", ar: "إنشاء تقرير مرتجعات", aria: "Create returns report", tone: "orange" },
  { perm: "meatDaily.create", to: "/meat-daily/input", Icon: FiClipboard, label: "Create Meat Daily Report", ar: "إنشاء حالة لحوم يومية", aria: "Create meat daily report", tone: "blue" },
  { perm: "customerReturns.create", to: "/returns-customers/new", Icon: FiUser, label: "Create Customer Returns", ar: "إنشاء مرتجعات عملاء", aria: "Create customer returns report", tone: "green" },
  { perm: "inventory.create", to: "/inventory-daily/input", Icon: FiArchive, label: "Create Inventory Daily Report", ar: "إنشاء مخزون يومي", aria: "Create inventory daily report", tone: "cyan" },
  { perm: "enoc.create", to: "/enoc-returns/input", Icon: FiTruck, label: "Create ENOC Returns Report", ar: "إنشاء تقرير ENOC", aria: "Create ENOC returns report", tone: "teal" },
];

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
}

function ModuleCard({ item, action }) {
  const Icon = item.Icon;
  return (
    <Link to={item.to} className="rm-card" aria-label={item.aria || item.label}>
      <div className={`rm-cardIcon rm-tone-${item.tone}`}>
        <Icon size={18} />
      </div>
      <div className="rm-cardBody">
        <div className="rm-cardTop">
          <span className="rm-chip">{action}</span>
        </div>
        <h3>{item.label}</h3>
        <p dir="rtl">{item.ar}</p>
      </div>
      <div className="rm-cardFoot">
        <span>{action === "Create" ? "Open form" : "Open reports"}</span>
        <FiArrowRight size={14} />
      </div>
    </Link>
  );
}

export default function ReturnsMenu() {
  const [query, setQuery] = useState("");
  const currentUser = getCurrentUser();
  const displayName = currentUser.displayName || currentUser.username || "User";
  const isAdmin = !!currentUser.isAdmin;

  const visibleBrowse = useMemo(
    () => browseLinks.filter((l) => isItemAllowed("returns", l.perm)),
    []
  );
  const visibleCreate = useMemo(
    () => createLinks.filter((l) => isItemAllowed("returns", l.perm)),
    []
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filterItems = (items) =>
    !normalizedQuery
      ? items
      : items.filter((item) =>
          `${item.label} ${item.ar}`.toLowerCase().includes(normalizedQuery)
        );

  const browseItems = filterItems(visibleBrowse);
  const createItems = filterItems(visibleCreate);
  const totalVisible = visibleBrowse.length + visibleCreate.length;
  const totalFiltered = browseItems.length + createItems.length;

  return (
    <main className="rm-page">
      <style>{`
        .rm-page{
          min-height:100vh;
          padding:14px clamp(12px,2.4vw,28px) 22px;
          background:linear-gradient(180deg,#f4f8f7 0%,#edf5f3 100%);
          color:#0f172a;
          font-family:Cairo,Arial,sans-serif;
          box-sizing:border-box;
        }
        .rm-shell{
          width:min(1180px,100%);
          margin:0 auto;
        }
        .rm-hero{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:18px;
          padding:18px clamp(16px,2vw,26px);
          border-radius:6px;
          background:linear-gradient(135deg,#123a49 0%,#0f766e 48%,#2aa8c4 100%);
          color:#fff;
          box-shadow:0 22px 50px rgba(15,23,42,.16);
        }
        .rm-brand{
          display:flex;
          align-items:center;
          gap:14px;
          min-width:0;
        }
        .rm-logo{
          width:58px;
          height:58px;
          object-fit:cover;
          border-radius:6px;
          border:1px solid rgba(255,255,255,.5);
          background:#fff;
          flex:0 0 auto;
        }
        .rm-titleBlock{min-width:0}
        .rm-kicker{
          font-size:12px;
          line-height:1.3;
          font-weight:900;
          opacity:.85;
          margin-bottom:4px;
        }
        .rm-title{
          margin:0;
          font-size:16px;
          line-height:1.35;
          font-weight:1000;
        }
        .rm-sub{
          margin:4px 0 0;
          color:rgba(255,255,255,.88);
          font-size:14px;
          line-height:1.45;
          font-weight:700;
        }
        .rm-userPanel{
          display:flex;
          gap:8px;
          align-items:stretch;
          flex-wrap:wrap;
          justify-content:flex-end;
        }
        .rm-userBox,.rm-topLink{
          min-height:38px;
          border:1px solid rgba(255,255,255,.26);
          background:rgba(255,255,255,.12);
          color:#fff;
          border-radius:5px;
          display:flex;
          align-items:center;
          gap:8px;
          padding:8px 10px;
          font-size:14px;
          font-weight:900;
          text-decoration:none;
          box-sizing:border-box;
        }
        .rm-avatar{
          width:30px;
          height:30px;
          border-radius:5px;
          display:grid;
          place-items:center;
          background:rgba(255,255,255,.18);
          border:1px solid rgba(255,255,255,.25);
          font-weight:1000;
        }
        .rm-toolbar{
          margin:14px 0;
          display:grid;
          grid-template-columns:minmax(0,1fr) auto auto;
          gap:10px;
          align-items:center;
        }
        .rm-search{
          display:flex;
          align-items:center;
          gap:8px;
          background:#fff;
          border:1px solid #dbe4e2;
          border-radius:6px;
          padding:9px 12px;
          box-shadow:0 10px 24px rgba(15,23,42,.05);
        }
        .rm-search input{
          width:100%;
          min-width:0;
          border:0;
          outline:0;
          font-family:inherit;
          font-size:14px;
          color:#0f172a;
          background:transparent;
        }
        .rm-stat{
          min-height:38px;
          border:1px solid #dbe4e2;
          background:#fff;
          border-radius:6px;
          padding:9px 12px;
          font-size:14px;
          font-weight:900;
          box-shadow:0 10px 24px rgba(15,23,42,.05);
          white-space:nowrap;
        }
        .rm-section{
          margin-top:14px;
        }
        .rm-sectionHead{
          display:flex;
          align-items:flex-end;
          justify-content:space-between;
          gap:10px;
          margin:0 0 10px;
        }
        .rm-sectionHead h2{
          margin:0;
          font-size:16px;
          line-height:1.35;
          font-weight:1000;
          color:#0f172a;
        }
        .rm-sectionHead span{
          color:#64748b;
          font-size:14px;
          font-weight:800;
        }
        .rm-grid{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:12px;
        }
        .rm-card{
          min-height:156px;
          display:flex;
          flex-direction:column;
          gap:12px;
          padding:14px;
          border:1px solid #dbe4e2;
          background:#fff;
          border-radius:6px;
          text-decoration:none;
          color:#0f172a;
          box-shadow:0 12px 30px rgba(15,23,42,.06);
          transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease;
        }
        .rm-card:hover{
          transform:translateY(-2px);
          border-color:#93c5bd;
          box-shadow:0 18px 36px rgba(15,23,42,.1);
        }
        .rm-cardIcon{
          width:38px;
          height:38px;
          border-radius:6px;
          display:grid;
          place-items:center;
          color:#fff;
          box-shadow:0 10px 20px rgba(15,23,42,.14);
        }
        .rm-tone-teal{background:linear-gradient(135deg,#0f766e,#14b8a6)}
        .rm-tone-blue{background:linear-gradient(135deg,#2563eb,#1d4ed8)}
        .rm-tone-green{background:linear-gradient(135deg,#10b981,#059669)}
        .rm-tone-cyan{background:linear-gradient(135deg,#0891b2,#06b6d4)}
        .rm-tone-orange{background:linear-gradient(135deg,#f97316,#ea580c)}
        .rm-cardBody{flex:1}
        .rm-cardTop{
          display:flex;
          justify-content:flex-end;
          margin-top:-42px;
          pointer-events:none;
        }
        .rm-chip{
          background:#f1f5f9;
          color:#334155;
          border-radius:999px;
          padding:5px 9px;
          font-size:12px;
          line-height:1;
          font-weight:1000;
        }
        .rm-card h3{
          margin:10px 0 6px;
          font-size:16px;
          line-height:1.35;
          font-weight:1000;
          color:#0f172a;
        }
        .rm-card p{
          margin:0;
          color:#475569;
          font-size:14px;
          line-height:1.5;
          font-weight:700;
        }
        .rm-cardFoot{
          border-top:1px solid #e5ecea;
          padding-top:10px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:8px;
          color:#0f766e;
          font-size:14px;
          font-weight:1000;
        }
        .rm-empty{
          background:#fff;
          border:1px dashed #cbd5e1;
          border-radius:6px;
          padding:18px;
          color:#475569;
          font-size:14px;
          font-weight:800;
          text-align:center;
        }
        .rm-footer{
          margin:18px 0 0;
          text-align:center;
          color:#64748b;
          font-size:12px;
          font-weight:800;
        }
        @media (max-width:900px){
          .rm-hero{align-items:flex-start; flex-direction:column}
          .rm-userPanel{justify-content:flex-start}
          .rm-toolbar{grid-template-columns:1fr 1fr}
          .rm-search{grid-column:1 / -1}
          .rm-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        }
        @media (max-width:560px){
          .rm-page{padding:10px 10px 18px}
          .rm-brand{align-items:flex-start}
          .rm-logo{width:48px;height:48px}
          .rm-userPanel,.rm-userBox,.rm-topLink{width:100%}
          .rm-toolbar{grid-template-columns:1fr}
          .rm-stat{white-space:normal}
          .rm-sectionHead{align-items:flex-start; flex-direction:column}
          .rm-grid{grid-template-columns:1fr}
          .rm-card{min-height:142px}
        }
      `}</style>

      <div className="rm-shell">
        <header className="rm-hero">
          <div className="rm-brand">
            <img className="rm-logo" src={logo} alt="Al Mawashi" />
            <div className="rm-titleBlock">
              <div className="rm-kicker">AL MAWASHI QMS</div>
              <h1 className="rm-title">Returns & Daily Status</h1>
              <p className="rm-sub">Returns, customer returns, meat status, inventory, and ENOC reports</p>
            </div>
          </div>

          <div className="rm-userPanel">
            <div className="rm-userBox">
              <span className="rm-avatar">{String(displayName || "U").slice(0, 1).toUpperCase()}</span>
              <span>{displayName}{isAdmin ? " · Admin" : ""}</span>
            </div>
            <Link className="rm-topLink" to="/named-dashboard">
              <FiHome size={15} />
              <span>Dashboard Home</span>
            </Link>
          </div>
        </header>

        <div className="rm-toolbar">
          <label className="rm-search">
            <FiSearch size={16} color="#64748b" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a returns section..."
            />
          </label>
          <div className="rm-stat">{totalVisible} Sections</div>
          <div className="rm-stat">{isAdmin ? "Admin" : "Assigned Access"}</div>
        </div>

        {totalVisible === 0 ? (
          <div className="rm-empty">
            No pages assigned to your account in this section. Contact your administrator.
          </div>
        ) : totalFiltered === 0 ? (
          <div className="rm-empty">No matching returns section found.</div>
        ) : (
          <>
            {browseItems.length > 0 && (
              <section className="rm-section" aria-label="Browse reports">
                <div className="rm-sectionHead">
                  <h2>Browse Reports</h2>
                  <span dir="rtl">عرض التقارير المحفوظة</span>
                </div>
                <div className="rm-grid">
                  {browseItems.map((item) => (
                    <ModuleCard key={item.perm} item={item} action="Browse" />
                  ))}
                </div>
              </section>
            )}

            {createItems.length > 0 && (
              <section className="rm-section" aria-label="Create reports">
                <div className="rm-sectionHead">
                  <h2>Create Reports</h2>
                  <span dir="rtl">إنشاء تقارير جديدة</span>
                </div>
                <div className="rm-grid">
                  {createItems.map((item) => (
                    <ModuleCard key={item.perm} item={item} action="Create" />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <div className="rm-footer">Built by Eng. Mohammed Abdullah</div>
      </div>
    </main>
  );
}
