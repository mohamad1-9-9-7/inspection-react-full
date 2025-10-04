// App.jsx
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { Suspense, lazy } from "react";

// Lazy imports
const Login = lazy(() => import("./pages/Login"));
const Inspection = lazy(() => import("./pages/Inspection"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SupervisorDashboard = lazy(() => import("./pages/Supervisor"));

const DailyMonitorDashboard = lazy(() => import("./pages/monitor/DailyMonitorDashboard"));
const QCSReport = lazy(() => import("./pages/monitor/branches/QCSReport"));

const POS19Layout = lazy(() => import("./pages/monitor/branches/pos19/POS19Layout"));
const POS24Layout = lazy(() => import("./pages/monitor/branches/pos24/POS24Layout"));
const POS26Layout = lazy(() => import("./pages/monitor/branches/pos26/POS26Layout"));
const POS15Layout = lazy(() => import("./pages/monitor/branches/pos15/POS15Layout"));

// ✅ إدخال + عرض FTR1
const FTR1Report = lazy(() => import("./pages/monitor/branches/ftr1/FTR1Report"));
const FTR1ReportView = lazy(() =>
  import("./pages/monitor/branches/ftr1/FTR1ReportView")
);

// ✅ إدخال + عرض FTR2
const FTR2Report = lazy(() => import("./pages/monitor/branches/ftr2/FTR2Report"));
const FTR2ReportView = lazy(() =>
  import("./pages/monitor/branches/ftr2/FTR2ReportView")
);

const OHCUpload = lazy(() => import("./pages/ohc/OHCUpload"));
const OHCView = lazy(() => import("./pages/ohc/OHCView"));

const QCSRawMaterialInspection = lazy(() =>
  import("./pages/monitor/branches/shipment_recc/QCSRawMaterialInspection")
);
const QCSRawMaterialView = lazy(() => import("./pages/admin/QCSRawMaterialView"));

const Returns = lazy(() => import("./pages/Returns"));
const ReturnView = lazy(() => import("./pages/ReturnView"));
const BrowseReturns = lazy(() => import("./pages/BrowseReturns"));
const ReturnsMenu = lazy(() => import("./ReturnsMenu"));

const LoginKPI = lazy(() => import("./pages/LoginKPI"));
const KPIDashboard = lazy(() => import("./pages/KPIDashboard"));

const FinishedProductsData = lazy(() =>
  import("./pages/finished/FinishedProductsData")
);
const FinishedProductEntry = lazy(() =>
  import("./pages/finished/FinishedProductEntry")
);
const FinishedProductReports = lazy(() =>
  import("./pages/finished/FinishedProductReports")
);

// 🆕 سيارات
const CarIconPage = lazy(() => import("./pages/car/pages/CarIcon"));

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
const MeatDailyInput = lazy(() => import("./pages/MeatDailyInput"));
const MeatDailyView = lazy(() => import("./pages/MeatDailyView"));
const BrowseMeatDaily = lazy(() => import("./pages/BrowseMeatDaily"));

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
const CustomerReturns = lazy(() => import("./pages/CustomerReturns"));
const CustomerReturnView = lazy(() => import("./pages/CustomerReturnView"));
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

/** حماية المسارات الخاصة */
function ProtectedRoute({ children }) {
  let isAuthed = false;
  try {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
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
      style={{ padding: "2rem", direction: "rtl", fontFamily: "Cairo, sans-serif" }}
    >
      <h2>
        📝 صفحة تقارير الفرع / Branch Reports Page: {prettyName(slug)}
      </h2>
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

          {/* ✅ POS — تبويبات داخلية */}
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

          {/* 🆕 Fresh Chicken: صفحة الإدخال (اختياري) */}
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

        {/* 🆕 Fresh Chicken: صفحة العرض (Viewer) */}
        <Route
          path="/admin/monitor/branches/qcs/fresh-chicken-reports"
          element={
            <ProtectedRoute>
              <FreshChickenReportsView />
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

        {/* 🆕 returns-customers/* */}
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

        {/* 🆕 meat-daily/* */}
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
            path="data"
            element={
              <ProtectedRoute>
                <FinishedProductsData />
              </ProtectedRoute>
            }
          />
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

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
