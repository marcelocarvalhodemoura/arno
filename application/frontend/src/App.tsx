import { useState, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { UserRole } from "@shared";
import Layout from "./components/Layout";
import SessionSplash from "./components/SessionSplash";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoadingProvider } from "./context/LoadingContext";
import { ToastProvider } from "./context/ToastContext";
import CashFlow from "./pages/CashFlow";
import Dashboard from "./pages/Dashboard";
import Fees from "./pages/Fees";
import Integration from "./pages/Integration";
import Login from "./pages/Login";
import Members from "./pages/Members";
import MovementTypes from "./pages/MovementTypes";
import Projects from "./pages/Projects";
import Reports from "./pages/Reports";
import Users from "./pages/Users";

function Guard({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const { user, role, ready } = useAuth();
  if (!ready) return <SessionSplash />;
  if (!user || !role) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(role)) {
    return <Navigate to={role === "tesoureiro" ? "/fluxo" : "/"} replace />;
  }
  return children;
}

function Shell() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(8);
  return (
    <Guard>
      <Layout year={year} month={month} setYear={setYear} setMonth={setMonth} />
    </Guard>
  );
}

function HomeRedirect() {
  const { role } = useAuth();
  return <Navigate to={role === "tesoureiro" ? "/fluxo" : "/"} replace />;
}

function AppRoutes() {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <SessionSplash />;
  }

  return (
    <AnimatePresence mode="wait">
      {user ? (
        <motion.div
          key="app"
          className="app-frame"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
        >
          <Routes location={location}>
            <Route element={<Shell />}>
              <Route
                index
                element={
                  <Guard roles={["admin"]}>
                    <Dashboard />
                  </Guard>
                }
              />
              <Route path="fluxo" element={<CashFlow />} />
              <Route path="integracao" element={<Integration />} />
              <Route path="tipos" element={<MovementTypes />} />
              <Route path="taxas" element={<Fees />} />
              <Route path="associados" element={<Members />} />
              <Route
                path="projetos"
                element={
                  <Guard roles={["admin"]}>
                    <Projects />
                  </Guard>
                }
              />
              <Route
                path="relatorios"
                element={
                  <Guard roles={["admin"]}>
                    <Reports />
                  </Guard>
                }
              />
              <Route
                path="usuarios"
                element={
                  <Guard roles={["admin"]}>
                    <Users />
                  </Guard>
                }
              />
            </Route>
            <Route path="login" element={<HomeRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      ) : (
        <motion.div
          key="login"
          className="app-frame"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
        >
          <Routes location={location}>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <LoadingProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ToastProvider>
        </LoadingProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
