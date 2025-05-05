import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Admin } from './pages/Admin';
import { SafetyReport } from './pages/SafetyReport';
import { ReportView } from './pages/ReportView';
import { NotFound } from './pages/NotFound';
import { MonthlySummary } from './components/MonthlySummary';
import { NewSafetyReport } from './pages/NewSafetyReport';
import { MyReports } from './pages/MyReports';
import { WeeklyReport } from './pages/WeeklyReport';

// Protected route wrapper
const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { user, isAdmin } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Layout wrapper with sidebar
const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-16 md:ml-64 p-4">{children}</main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <SafetyReport />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <NewSafetyReport />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/reports/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ReportView />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/stats/monthly"
            element={
              <ProtectedRoute>
                <Layout>
                  <MonthlySummary />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <Admin />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <MyReports />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/weekly-report"
            element={
              <ProtectedRoute>
                <Layout>
                  <WeeklyReport />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;