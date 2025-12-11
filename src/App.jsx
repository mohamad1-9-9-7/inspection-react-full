// App.jsx
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { Suspense, lazy } from "react";

// Lazy imports
const Login = lazy(() => import("./pages/Login"));
const Inspection = lazy(() => import("./pages/Inspection"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SupervisorDashboard = lazy(() => import("./pages/Supervisor"));

const DailyMonitorDashboard = lazy(() =>
  import("./pages/monitor/DailyMonitorDashboard")
);
const QCSReport = lazy(() =>
  import("./pages/monitor/branches/QCSReport")
);

// 🆕 Internal Audit – Reports Viewer
const InternalAuditReportsView = lazy(() =>
  import("./pages/monitor/InternalAuditReportsView")
);

const POS19Layout = lazy(() =>
  import("./pages/monitor/branches/pos19/POS19Layout")
);
const POS24Layout = lazy(() =>
  import("./pages/monitor/branches/pos24/POS24Layout")
);
const POS26Layout = lazy(() =>
  import("./pages/monitor/branches/pos26/POS26Layout")
);
const POS15Layout = lazy(() =>
  import("./pages/monitor/branches/pos15/POS15Layout")
);

// 🆕 ✅ POS 10 — التبويبات (إدخال)
const POS10Layout = lazy(() =>
  import("./pages/monitor/branches/pos 10/POS10Layout")
);

// 🆕 ✅ POS 10 — عرض التقارير (Viewer)
const POS10ReportsView = lazy(() =>
  import("./pages/monitor/branches/pos 10/POS10ReportsView")
);

// 🆕 ✅ POS 11 — إدخال
const POS11Layout = lazy(() =>
  import("./pages/monitor/branches/POS 11/POS11Layout")
);

// 🆕 ✅ POS 11 — عرض (Views Tabs)
const POS11ReportsViewLayout = lazy(() =>
  import("./pages/monitor/branches/POS 11/POS11ReportsViewLayout")
);

// 🆕 ✅ POS 19 — Viewer Hub
const POS19DailyView = lazy(() =>
  import("./pages/monitor/branches/pos19/POS19DailyView")
);

// ✅ إدخال + عرض FTR1
const FTR1Report = lazy(() =>
  import("./pages/monitor/branches/ftr1/FTR1Report")
);
const FTR1ReportView = lazy(() =>
  import("./pages/monitor/branches/ftr1/FTR1ReportView")
);

// ✅ إدخال + عرض FTR2
const FTR2Report = lazy(() =>
  import("./pages/monitor/branches/ftr2/FTR2Report")
);
const FTR2ReportView = lazy(() =>
  import("./pages/monitor/branches/ftr2/FTR2ReportView")
);

const OHCUpload = lazy(() => import("./pages/ohc/OHCUpload"));
const OHCView = lazy(() => import("./pages/ohc/OHCView"));

const QCSRawMaterialInspection = lazy(() =>
  import("./pages/monitor/branches/shipment_recc/QCSRawMaterialInspection")
);
const QCSRawMaterialView = lazy(() =>
  import("./pages/admin/QCSRawMaterialView")
);

// 🆕 ✅ تقرير عام موحّد (All Reports Summary)
const AllReportsView = lazy(() =>
  import("./pages/admin/AllReportsView")
);

const Returns = lazy(() => import("./pages/Returns"));
const ReturnView = lazy(() => import("./pages/ReturnView"));
const BrowseReturns = lazy(() => import("./pages/BrowseReturns"));
const ReturnsMenu = lazy(() => import("./ReturnsMenu"));

const LoginKPI = lazy(() => import("./pages/LoginKPI"));
const KPIDashboard = lazy(() => import("./pages/KPIDashboard"));

// ✅ تم الإبقاء فقط على الإدخال والتقارير
const FinishedProductEntry = lazy(() =>
  import("./pages/finished/FinishedProductEntry")
);
const FinishedProductReports = lazy(() =>
  import("./pages/finished/FinishedProductReports")
);

// 🆕 سيارات
const CarIconPage = lazy(() =>
  import("./pages/car/pages/CarIcon")
);

// 🆕 صيانة
const MaintenanceRequests = lazy(() =>
  import("./pages/maintenance/MaintenanceRequests")
);
const MaintenanceHome = lazy(() =>
  import("./pages/maintenance/MaintenanceHome")
);
const BrowseMaintenanceRequests = lazy(() =>
  import("./pages/maintenance/BrowseMaintenanceRequests")
);

// 🆕 🍖 Meat Daily
const MeatDailyInput = lazy(() =>
  import("./pages/MeatDailyInput")
);
const MeatDailyView = lazy(() =>
  import("./pages/MeatDailyView")
);
const BrowseMeatDaily = lazy(() =>
  import("./pages/BrowseMeatDaily")
);

/* 🆕 Production */
const ProductionHub = lazy(() =>
  import("./pages/monitor/branches/production/ProductionHub")
);
const PersonalHygienePRDInput = lazy(() =>
  import("./pages/monitor/branches/production/PersonalHygienePRDInput")
);
const CleaningChecklistPRDInput = lazy(() =>
  import("./pages/monitor/branches/production/CleaningChecklistPRDInput")
);
const PRDDefrostingRecordInput = lazy(() =>
  import("./pages/monitor/branches/production/PRDDefrostingRecordInput")
);

// 🆕 ✅ عرض تقارير الإنتاج
const PRDReportsView = lazy(() =>
  import("./pages/monitor/branches/production/PRDReportsView")
);

/* 🆕 مرتجعات الزبائن */
const CustomerReturns = lazy(() =>
  import("./pages/CustomerReturns")
);
const CustomerReturnView = lazy(() =>
  import("./pages/CustomerReturnView")
);
const BrowseCustomerReturns = lazy(() =>
  import("./pages/BrowseCustomerReturns")
);

// 🆕 ✅ عرض تقارير POS 15 (التبويبات)
const POS15ReportsView = lazy(() =>
  import("./pages/monitor/branches/pos15/POS15ReportsView")
);

// 🆕 ✅ عرض تقارير النظافة الشخصية POS 15
const POS15PersonalHygieneView = lazy(() =>
  import("./pages/monitor/branches/pos15/POS15PersonalHygieneView")
);

// 🆕 ✅ Fresh Chicken (عرض + إدخال)
const FreshChickenReportsView = lazy(() =>
  import("./pages/monitor/branches/qcs/FreshChickenReportsView")
);
const FreshChickenInter = lazy(() =>
  import("./pages/monitor/branches/qcs/FreshChickenInter")
);

/* 🆕 ✅ QCS — تبويبات عرض فقط (الجديدة) */
const QCSReportsView = lazy(() =>
  import("./pages/monitor/branches/qcs/QCSReportsView")
);

/* 🆕 🧾 Inventory Daily (Store) — إدخال + عرض */
const InventoryDailyInput = lazy(() =>
  import("./pages/store/InventoryDailyInput")
);
const InventoryDailyBrowse = lazy(() =>
  import("./pages/store/InventoryDailyBrowse")
);

// 🆕 🎓 Training Certificates – BFS / PIC / EFST
const TrainingCertificatesUpload = lazy(() =>
  import("./pages/BFS PIC EFST/TrainingCertificatesUpload")
);
const TrainingCertificatesView = lazy(() =>
  import("./pages/BFS PIC EFST/TrainingCertificatesView")
);

/** حماية المسارات الخاصة */
function ProtectedRoute({ children }) {
  let isAuthed = false;
  try {
    const raw =
      typeof window !== "undefined"
        ? localStorage.getItem("currentUser")
        : null;
    isAuthed = !!(raw && JSON.parse(raw));
  } catch {
    isAuthed = false;
  }
  return isAuthed ? children : <Navigate to="/" replace />;
}

// صفحة مؤقتة لأي فرع /monitor/:slug
function BranchMonitorPage() {
  const { slug } = useParams();

  const prettyName = (s) => {
    if (!s) return "";
    if (s.toLowerCase() === "qcs") return "QCS";
    const m = s.match(/^([a-zA-Z]+)(\d+)$/);
    if (m) return `${m[1].toUpperCase()} ${m[2]}`;
    return s.toUpperCase();
  };

  return (
    <div
      style={{
        padding: "2rem",
        direction: "rtl",
        fontFamily: "Cairo, sans-serif",
      }}
    >
      <h2>📝 صفحة تقارير الفرع / Branch Reports Page: {prettyName(slug)}</h2>
      <p>
        هذه صفحة مؤقتة. يمكنك لاحقًا استبدالها بنموذج الفرع الحقيقي. / This is a
        temporary page; you can later replace it with the real branch form.
      </p>
    </div>
  );
}

// 404
function NotFound() {
  return (
    <div style={{ padding: 24, direction: "rtl" }}>
      الصفحة غير موجودة / Page not found
    </div>
  );
}

export default function App() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 24, direction: "rtl" }}>
          جارٍ التحميل… / Loading…
        </div>
      }
    >
      <Routes>
        {/* الجذر */}
        <Route path="/" element={<Login />} />
        <Route
          path="/inspection"
          element={
            <ProtectedRoute>
              <Inspection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supervisor"
          element={
            <ProtectedRoute>
              <SupervisorDashboard />
            </ProtectedRoute>
          }
        />

        {/* monitor/* */}
        <Route path="/monitor">
          <Route
            index
            element={
              <ProtectedRoute>
                <DailyMonitorDashboard />
              </ProtectedRoute>
            }
          />

          {/* 🆕 Internal Audit – Reports Viewer */}
          <Route
            path="internal-audit"
            element={
              <ProtectedRoute>
                <InternalAuditReportsView />
              </ProtectedRoute>
            }
          />

          {/* 🆕 FTR1 إدخال */}
          <Route
            path="ftr1"
            element={
              <ProtectedRoute>
                <FTR1Report />
              </ProtectedRoute>
            }
          />

          {/* 🆕 Production Hub + إدخالاته */}
          <Route
            path="production"
            element={
              <ProtectedRoute>
                <ProductionHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="production/personal-hygiene-prd/input"
            element={
              <ProtectedRoute>
                <PersonalHygienePRDInput />
              </ProtectedRoute>
            }
          />
          <Route
            path="production/cleaning-checklist-prd/input"
            element={
              <ProtectedRoute>
                <CleaningChecklistPRDInput />
              </ProtectedRoute>
            }
          />
          <Route
            path="production/prd-defrosting-record/input"
            element={
              <ProtectedRoute>
                <PRDDefrostingRecordInput />
              </ProtectedRoute>
            }
          />

          {/* موجودة سابقًا */}
          <Route
            path="qcs"
            element={
              <ProtectedRoute>
                <QCSReport />
              </ProtectedRoute>
            }
          />

          {/* ✅ POS — إدخال */}
          <Route
            path="pos19"
            element={
              <ProtectedRoute>
                <POS19Layout />
              </ProtectedRoute>
            }
          />
          <Route
            path="pos24"
            element={
              <ProtectedRoute>
                <POS24Layout />
              </ProtectedRoute>
            }
          />
          <Route
            path="pos26"
            element={
              <ProtectedRoute>
                <POS26Layout />
              </ProtectedRoute>
            }
          />
          <Route
            path="pos15"
            element={
              <ProtectedRoute>
                <POS15Layout />
              </ProtectedRoute>
            }
          />
          <Route
            path="pos10"
            element={
              <ProtectedRoute>
                <POS10Layout />
              </ProtectedRoute>
            }
          />
          <Route
            path="pos11"
            element={
              <ProtectedRoute>
                <POS11Layout />
              </ProtectedRoute>
            }
          />

          {/* ✅ POS 10 — Viewer (اختياري تحت monitor) */}
          <Route
            path="pos10/reports"
            element={
              <ProtectedRoute>
                <POS10ReportsView />
              </ProtectedRoute>
            }
          />

          {/* 🆕 عرض تقارير النظافة الشخصية POS15 */}
          <Route
            path="pos15/personal-hygiene"
            element={
              <ProtectedRoute>
                <POS15PersonalHygieneView />
              </ProtectedRoute>
            }
          />

          {/* FTR2 إدخال */}
          <Route
            path="ftr2"
            element={
              <ProtectedRoute>
                <FTR2Report />
              </ProtectedRoute>
            }
          />

          <Route
            path="qcs-raw-material-inspection"
            element={
              <ProtectedRoute>
                <QCSRawMaterialInspection />
              </ProtectedRoute>
            }
          />

          {/* 🆕 Fresh Chicken: صفحة الإدخال */}
          <Route
            path="branches/qcs/fresh-chicken-inter"
            element={
              <ProtectedRoute>
                <FreshChickenInter />
              </ProtectedRoute>
            }
          />

          {/* يُترك في النهاية */}
          <Route
            path=":slug"
            element={
              <ProtectedRoute>
                <BranchMonitorPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* admin/* */}
        <Route
          path="/admin/ftr1"
          element={
            <ProtectedRoute>
              <FTR1ReportView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ftr2"
          element={
            <ProtectedRoute>
              <FTR2ReportView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/production"
          element={
            <ProtectedRoute>
              <PRDReportsView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pos15"
          element={
            <ProtectedRoute>
              <POS15ReportsView />
            </ProtectedRoute>
          }
        />

        {/* 🆕 POS 19 — صفحة العرض */}
        <Route
          path="/admin/pos19"
          element={
            <ProtectedRoute>
              <POS19DailyView />
            </ProtectedRoute>
          }
        />

        {/* 🆕 POS 11 — صفحة العرض (Views Tabs) */}
        <Route
          path="/admin/pos11"
          element={
            <ProtectedRoute>
              <POS11ReportsViewLayout />
            </ProtectedRoute>
          }
        />

        {/* 🆕 POS 10 — صفحة العرض (Viewer) */}
        <Route
          path="/admin/pos10"
          element={
            <ProtectedRoute>
              <POS10ReportsView />
            </ProtectedRoute>
          }
        />

        {/* 🆕 Fresh Chicken: صفحة العرض (Viewer) */}
        <Route
          path="/admin/monitor/branches/qcs/fresh-chicken-reports"
          element={
            <ProtectedRoute>
              <FreshChickenReportsView />
            </ProtectedRoute>
          }
        />

        {/* 🆕 ✅ QCS — صفحة تبويبات العرض فقط */}
        <Route
          path="/admin/monitor/branches/qcs/reports"
          element={
            <ProtectedRoute>
              <QCSReportsView />
            </ProtectedRoute>
          }
        />
        {/* 🆕 Aliases */}
        <Route
          path="/admin/monitor/branches/qcs"
          element={
            <Navigate
              to="/admin/monitor/branches/qcs/reports"
              replace
            />
          }
        />
        <Route
          path="/admin/monitor/qcs"
          element={
            <ProtectedRoute>
              <QCSReportsView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/qcs"
          element={
            <ProtectedRoute>
              <QCSReportsView />
            </ProtectedRoute>
          }
        />

        {/* ohc/* */}
        <Route path="/ohc">
          <Route
            index
            element={
              <ProtectedRoute>
                <OHCUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="view"
            element={
              <ProtectedRoute>
                <OHCView />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* admin/QCS raw material view */}
        <Route
          path="/qcs-raw-material-view"
          element={
            <ProtectedRoute>
              <QCSRawMaterialView />
            </ProtectedRoute>
          }
        />

        {/* 🆕 ✅ All Reports Summary */}
        <Route
          path="/admin/all-reports-view"
          element={
            <ProtectedRoute>
              <AllReportsView />
            </ProtectedRoute>
          }
        />

        {/* returns/* */}
        <Route path="/returns">
          <Route
            index
            element={
              <ProtectedRoute>
                <Returns />
              </ProtectedRoute>
            }
          />
          <Route
            path="menu"
            element={
              <ProtectedRoute>
                <ReturnsMenu />
              </ProtectedRoute>
            }
          />
          <Route
            path="view"
            element={
              <ProtectedRoute>
                <ReturnView />
              </ProtectedRoute>
            }
          />
          <Route
            path="browse"
            element={
              <ProtectedRoute>
                <BrowseReturns />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* returns-customers/* */}
        <Route path="/returns-customers">
          <Route
            path="new"
            element={
              <ProtectedRoute>
                <CustomerReturns />
              </ProtectedRoute>
            }
          />
          <Route
            path="view"
            element={
              <ProtectedRoute>
                <CustomerReturnView />
              </ProtectedRoute>
            }
          />
          <Route
            path="browse"
            element={
              <ProtectedRoute>
                <BrowseCustomerReturns />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* meat-daily/* */}
        <Route path="/meat-daily">
          <Route
            path="input"
            element={
              <ProtectedRoute>
                <MeatDailyInput />
              </ProtectedRoute>
            }
          />
          <Route
            path="view"
            element={
              <ProtectedRoute>
                <MeatDailyView />
              </ProtectedRoute>
            }
          />
          <Route
            path="browse"
            element={
              <ProtectedRoute>
                <BrowseMeatDaily />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* inventory-daily/* */}
        <Route path="/inventory-daily">
          <Route
            path="input"
            element={
              <ProtectedRoute>
                <InventoryDailyInput />
              </ProtectedRoute>
            }
          />
          <Route
            path="browse"
            element={
              <ProtectedRoute>
                <InventoryDailyBrowse />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* KPI */}
        <Route path="/kpi-login" element={<LoginKPI />} />
        <Route
          path="/kpi"
          element={
            <ProtectedRoute>
              <KPIDashboard />
            </ProtectedRoute>
          }
        />

        {/* finished/* */}
        <Route path="/finished">
          <Route
            path="entry"
            element={
              <ProtectedRoute>
                <FinishedProductEntry />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute>
                <FinishedProductReports />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ✅ Aliases للمسارات القديمة */}
        <Route
          path="/finished-product-reports"
          element={
            <ProtectedRoute>
              <FinishedProductReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finished-product-entry"
          element={
            <ProtectedRoute>
              <FinishedProductEntry />
            </ProtectedRoute>
          }
        />

        {/* 🆕 مسار السيارات */}
        <Route
          path="/cars"
          element={
            <ProtectedRoute>
              <CarIconPage />
            </ProtectedRoute>
          }
        />

        {/* 🆕 مسار طلبات الصيانة */}
        <Route
          path="/maintenance-requests"
          element={
            <ProtectedRoute>
              <MaintenanceRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance-browse"
          element={
            <ProtectedRoute>
              <BrowseMaintenanceRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance-home"
          element={
            <ProtectedRoute>
              <MaintenanceHome />
            </ProtectedRoute>
          }
        />

        {/* 🆕 🎓 Training Certificates – BFS Card */}
        <Route
          path="/training-certificates"
          element={
            <ProtectedRoute>
              <TrainingCertificatesUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/training-certificates/view"
          element={
            <ProtectedRoute>
              <TrainingCertificatesView />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
