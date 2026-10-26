import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FashionProvider } from './context/FashionContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { JourneyProgress } from './components/JourneyProgress';
import { Toast } from './components/Toast';
import { ScrollToTop } from './components/ScrollToTop';

// Landing & Auth
import { AuthLanding } from './pages/AuthLanding';
import { ConfirmEmail } from './pages/ConfirmEmail';

// Dashboard Pages
import { Home } from './pages/Home';
import { Stylist } from './pages/Stylist';
import { Wardrobe } from './pages/Wardrobe';
import { Recommendations } from './pages/Recommendations';
import { TryExisting } from './pages/TryExisting';
import { ShopNew } from './pages/ShopNew';
import { UploadUserPhoto } from './pages/UploadUserPhoto';
import { VirtualTryOn } from './pages/VirtualTryOn';
import { OutfitAnalysis } from './pages/OutfitAnalysis';
import { History } from './pages/History';
import { Profile } from './pages/Profile';
import { WeeklyPlanner } from './pages/WeeklyPlanner';
import { NotFound } from './pages/NotFound';

import { ErrorBoundary } from './components/ErrorBoundary';

function MainAppContent() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-charcoal-900" />
          <span className="text-xs font-semibold tracking-wider uppercase text-charcoal-500">
            Loading Fashion VISTA...
          </span>
        </div>
      </div>
    );
  }

  // 1. Email confirmation page — accessible directly from phone or browser verification links
  if (location.pathname.startsWith('/auth/confirm')) {
    return (
      <>
        <ConfirmEmail />
        <Toast />
      </>
    );
  }

  // 2. If not authenticated or guest, show Login/Signup Landing Page first
  if (!isAuthenticated) {
    return (
      <>
        <AuthLanding />
        <Toast />
      </>
    );
  }

  // 3. Once authenticated or guest demo chosen, display the dashboard project
  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-charcoal-900 selection:bg-[#EAE0D1] selection:text-[#191919]">
        <Navbar />
        <JourneyProgress />
        <main className="flex-1">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/stylist" element={<Stylist />} />
              <Route path="/wardrobe" element={<Wardrobe />} />
              <Route path="/planner" element={<WeeklyPlanner />} />
              <Route path="/recommendations" element={<Recommendations />} />
              <Route path="/try-existing" element={<TryExisting />} />
              <Route path="/shop-new" element={<ShopNew />} />
              <Route path="/try-on/upload" element={<Navigate to="/recommendations" replace />} />
              <Route path="/try-on" element={<Navigate to="/recommendations" replace />} />
              <Route path="/analysis" element={<OutfitAnalysis />} />
              <Route path="/history" element={<History />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/auth/confirm" element={<ConfirmEmail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </main>
        <Footer />
        <Toast />
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FashionProvider>
        <Router>
          <MainAppContent />
        </Router>
      </FashionProvider>
    </AuthProvider>
  );
}
