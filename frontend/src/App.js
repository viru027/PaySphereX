// ============================================================
// src/App.js
// ============================================================
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppShell from "./components/layout/AppShell";
import LoadingScreen from "./components/ui/LoadingScreen";

// Lazy-loaded pages
const Login        = lazy(() => import("./pages/Login"));
const Dashboard    = lazy(() => import("./pages/Dashboard"));
const Employees    = lazy(() => import("./pages/Employees"));
const EmployeeDetail = lazy(() => import("./pages/EmployeeDetail"));
const Payroll      = lazy(() => import("./pages/Payroll"));
const PayslipDetail= lazy(() => import("./pages/PayslipDetail"));
const Leaves       = lazy(() => import("./pages/Leaves"));
const Attendance   = lazy(() => import("./pages/Attendance"));
const Analytics    = lazy(() => import("./pages/Analytics"));
const Profile      = lazy(() => import("./pages/Profile"));
const NotFound     = lazy(() => import("./pages/NotFound"));

// Protected Route wrapper
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

// Public Route (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user)    return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { fontFamily: "DM Sans, sans-serif", fontSize: "14px" },
          }}
        />
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

            {/* Protected inside AppShell */}
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"       element={<Dashboard />} />
              <Route path="/employees"       element={<ProtectedRoute roles={["admin","hr","manager"]}><Employees /></ProtectedRoute>} />
              <Route path="/employees/:id"   element={<EmployeeDetail />} />
              <Route path="/payroll"         element={<ProtectedRoute roles={["admin","hr"]}><Payroll /></ProtectedRoute>} />
              <Route path="/payroll/payslips/:id" element={<PayslipDetail />} />
              <Route path="/leaves"          element={<Leaves />} />
              <Route path="/attendance"      element={<Attendance />} />
              <Route path="/analytics"       element={<ProtectedRoute roles={["admin","hr","manager"]}><Analytics /></ProtectedRoute>} />
              <Route path="/profile"         element={<Profile />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
