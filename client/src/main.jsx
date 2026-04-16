import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GuidesPage from './pages/GuidesPage';
import GuideProfilePage from './pages/GuideProfilePage';
import BookingsPage from './pages/BookingsPage';
import GuideDashboardPage from './pages/GuideDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import NotificationsPage from './pages/NotificationsPage';

// Route guards
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9B9B9B' }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/guides" element={<GuidesPage />} />
        <Route path="/guides/:id" element={<GuideProfilePage />} />

        {/* Protected traveler routes */}
        <Route path="/bookings" element={
          <RequireAuth><RequireRole role="traveler"><BookingsPage /></RequireRole></RequireAuth>
        } />

        {/* Protected guide routes */}
        <Route path="/guide/dashboard" element={
          <RequireAuth><RequireRole role="guide"><GuideDashboardPage /></RequireRole></RequireAuth>
        } />

        {/* Protected admin routes */}
        <Route path="/admin/dashboard" element={
          <RequireAuth><RequireRole role="admin"><AdminDashboardPage /></RequireRole></RequireAuth>
        } />

        {/* Protected auth-only */}
        <Route path="/notifications" element={
          <RequireAuth><NotificationsPage /></RequireAuth>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'rgba(255,255,255,0.90)',
                backdropFilter: 'blur(16px)',
                color: '#1A1A1A',
                border: '1px solid rgba(242,101,34,0.12)',
                borderRadius: '12px',
                fontSize: '0.88rem',
                boxShadow: '0 8px 32px rgba(242,101,34,0.10)',
              },
              success: { iconTheme: { primary: '#1D9E75', secondary: '#fff' } },
              error: { iconTheme: { primary: '#DC3545', secondary: '#fff' } },
            }}
          />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
