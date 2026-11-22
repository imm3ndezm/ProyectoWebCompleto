import { lazy, Suspense } from "react";
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import AdminLayout from "./components/layouts/AdminLayout";
import ProtectedRoute from "./context/ProtectedRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";
import RequireAccess, { Forbidden } from "./components/RequireAccess";
import { homePathFor, isAdminCentral, navigationFor } from "./auth/access";

import Login from "./pages/Auth/Login";
import { Loading } from "./components/ui/Feedback";

// Las pantallas se cargan bajo demanda: un EMPLEADO no descarga el código de
// Compras ni de Planilla.
const CajaProvider = lazy(() => import("./pages/Caja/CajaProvider"));
const TurnoPage = lazy(() => import("./pages/Caja/TurnoPage"));
const PosPage = lazy(() => import("./pages/Caja/PosPage"));
const ComprobantesPage = lazy(() =>
  import("./pages/Caja/ComprobantesPage").then((m) => ({ default: m.ComprobantesPage })),
);
const ComprobantePage = lazy(() =>
  import("./pages/Caja/ComprobantesPage").then((m) => ({ default: m.ComprobantePage })),
);
const InventarioPage = lazy(() => import("./pages/Inventario/InventarioPage"));
const MenuPage = lazy(() => import("./pages/Inventario/MenuPage"));
const ComprasPage = lazy(() => import("./pages/Compras/ComprasPage"));
const ProveedoresPage = lazy(() => import("./pages/Compras/ProveedoresPage"));
const ReportesPage = lazy(() => import("./pages/Reportes/ReportesPage"));
const EmpleadosPage = lazy(() => import("./pages/RRHH/EmpleadosPage"));
const PlanillaPage = lazy(() => import("./pages/RRHH/PlanillaPage"));

// Layout del panel con el perfil real, el menú según el rol y el cierre de sesión.
// Va dentro de AuthProvider y de ProtectedRoute, por eso `user` nunca es null.
function AppArea() {
  const { user, logout } = useAuth();

  async function handleLogout() {
    const result = await logout();
    if (!result.success) toast.error(result.error, { id: "logout-error" });
  }

  const workspace = {
    name: user.branchName ?? (isAdminCentral(user) ? "Administración central" : "Orígenes SV"),
  };

  return (
    <AdminLayout
      user={user}
      navigation={navigationFor(user)}
      home={homePathFor(user)}
      workspace={workspace}
      onLogout={handleLogout}
    >
      <Suspense fallback={<Loading label="Cargando pantalla…" />}>
        <Outlet />
      </Suspense>
    </AdminLayout>
  );
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={homePathFor(user)} replace />;
}

function NotFound() {
  return (
    <section className="mx-auto grid max-w-lg gap-3 py-10 text-center">
      <h2 className="os-title">Página no encontrada</h2>
      <Link to="/" className="os-link">Volver al inicio</Link>
    </section>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppArea />}>
              <Route index element={<HomeRedirect />} />
              {/* Compatibilidad con la ruta anterior del panel. */}
              <Route path="admin/*" element={<HomeRedirect />} />

              <Route path="caja" element={<RequireAccess section="caja"><CajaProvider /></RequireAccess>}>
                <Route index element={<TurnoPage />} />
                <Route path="pos" element={<RequireAccess section="pos"><PosPage /></RequireAccess>} />
                <Route path="comprobantes" element={<RequireAccess section="comprobantes"><ComprobantesPage /></RequireAccess>} />
                <Route path="comprobantes/:id" element={<RequireAccess section="comprobantes"><ComprobantePage /></RequireAccess>} />
              </Route>

              <Route path="inventario" element={<RequireAccess section="inventario"><InventarioPage /></RequireAccess>} />
              <Route path="menu" element={<RequireAccess section="menu"><MenuPage /></RequireAccess>} />
              <Route path="compras" element={<RequireAccess section="compras"><ComprasPage /></RequireAccess>} />
              <Route path="proveedores" element={<RequireAccess section="proveedores"><ProveedoresPage /></RequireAccess>} />
              <Route path="reportes" element={<RequireAccess section="reportes"><ReportesPage /></RequireAccess>} />
              <Route path="empleados" element={<RequireAccess section="empleados"><EmpleadosPage /></RequireAccess>} />
              <Route path="planilla" element={<RequireAccess section="planilla"><PlanillaPage /></RequireAccess>} />
              {/* Alias en español de negocio: Nómina = Planilla. */}
              <Route path="nomina" element={<RequireAccess section="planilla"><PlanillaPage /></RequireAccess>} />

              <Route path="sin-acceso" element={<Forbidden />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
