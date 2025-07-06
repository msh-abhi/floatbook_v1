import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthForm } from './components/AuthForm';
import { CompanySetup } from './components/CompanySetup';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Rooms } from './pages/Rooms';
import { useAuth } from './hooks/useAuth';

// Lazy load other pages
const Bookings = React.lazy(() => import('./pages/Bookings').then(module => ({ default: module.Bookings })));
const Calendar = React.lazy(() => import('./pages/Calendar').then(module => ({ default: module.Calendar })));
const Settings = React.lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Reports = React.lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })));

function App() {
  const { user, loading, companyId } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  if (!companyId) {
    return <CompanySetup />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<Navigate to="/dashboard" replace />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="rooms" element={<Rooms />} />
          <Route 
            path="bookings" 
            element={
              <React.Suspense fallback={<div className="p-8"><div className="animate-pulse h-8 bg-gray-200 rounded w-64"></div></div>}>
                <Bookings />
              </React.Suspense>
            } 
          />
          <Route 
            path="calendar" 
            element={
              <React.Suspense fallback={<div className="p-8"><div className="animate-pulse h-8 bg-gray-200 rounded w-64"></div></div>}>
                <Calendar />
              </React.Suspense>
            } 
          />
          <Route
            path="reports"
            element={
              <React.Suspense fallback={<div className="p-8"><div className="animate-pulse h-8 bg-gray-200 rounded w-64"></div></div>}>
                <Reports />
              </React.Suspense>
            }
          />
          <Route 
            path="settings" 
            element={
              <React.Suspense fallback={<div className="p-8"><div className="animate-pulse h-8 bg-gray-200 rounded w-64"></div></div>}>
                <Settings />
              </React.Suspense>
            } 
          />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;