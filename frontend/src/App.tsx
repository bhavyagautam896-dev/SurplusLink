import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Toaster } from 'sonner';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DonorDashboard } from './pages/donor/DonorDashboard';
import { NgoFeedPage } from './pages/ngo/NgoFeedPage';
import { ClaimsPage } from './pages/claims/ClaimsPage';
import { AnalyticsPage } from './pages/dashboard/AnalyticsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
          <Toaster richColors position="top-right" />
          <Navbar />

          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />

              {/* Protected Donor Route */}
              <Route
                path="/donor"
                element={
                  <ProtectedRoute allowedRoles={['DONOR']}>
                    <DonorDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected NGO Route */}
              <Route
                path="/ngo"
                element={
                  <ProtectedRoute allowedRoles={['NGO']}>
                    <NgoFeedPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Claims & Pickups Route */}
              <Route
                path="/claims"
                element={
                  <ProtectedRoute allowedRoles={['DONOR', 'NGO', 'ADMIN']}>
                    <ClaimsPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
