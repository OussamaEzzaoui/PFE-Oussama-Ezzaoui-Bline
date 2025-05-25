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
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(window.innerWidth >= 768);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div>
      {/* Sidebar */}
      {isSidebarOpen && <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 p-3 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition-colors focus:outline-none"
          aria-label="Show sidebar"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      )}
      <main className={`main transition-all duration-300 ${isSidebarOpen ? 'ml-[250px]' : 'ml-0'}`}>{children}</main>
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
