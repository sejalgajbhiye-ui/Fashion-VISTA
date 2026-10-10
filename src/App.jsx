import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FashionProvider } from './context/FashionContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { JourneyProgress } from './components/JourneyProgress';
import { Toast } from './components/Toast';
import { ScrollToTop } from './components/ScrollToTop';

// Pages
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
import { NotFound } from './pages/NotFound';

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <FashionProvider>
      <Router>
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
                <Route path="/recommendations" element={<Recommendations />} />
                <Route path="/try-existing" element={<TryExisting />} />
                <Route path="/shop-new" element={<ShopNew />} />
                <Route path="/try-on/upload" element={<UploadUserPhoto />} />
                <Route path="/try-on" element={<VirtualTryOn />} />
                <Route path="/analysis" element={<OutfitAnalysis />} />
                <Route path="/history" element={<History />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </main>
          <Footer />
          <Toast />
        </div>
      </Router>
    </FashionProvider>
  );
}
