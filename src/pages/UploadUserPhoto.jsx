import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFashion } from '../context/FashionContext';
import { UploadBox } from '../components/UploadBox';
import { ImagePreview } from '../components/ImagePreview';
import { Button } from '../components/Button';
import { ArrowRight, UserCheck, CheckCircle2, Shield, Sparkles } from 'lucide-react';

export const UploadUserPhoto = () => {
  const navigate = useNavigate();
  const { userPhoto, setUserPhoto, showToast } = useFashion();

  const [currentPhoto, setCurrentPhoto] = useState(userPhoto);

  const samplePhoto = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80";

  const handleImageUploaded = (dataUrl) => {
    setCurrentPhoto(dataUrl);
    setUserPhoto(dataUrl);
    showToast("Photo uploaded successfully!", "success");
  };

  const handleReplace = () => {
    setCurrentPhoto(null);
    setUserPhoto(null);
  };

  const handleUseSample = () => {
    setCurrentPhoto(samplePhoto);
    setUserPhoto(samplePhoto);
    showToast("Loaded sample full-body portrait", "info");
  };

  const handleProceed = () => {
    if (!currentPhoto) {
      setUserPhoto(samplePhoto);
    }
    navigate('/try-on');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      
      {/* Header */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <span className="text-[11px] uppercase font-bold tracking-widest text-charcoal-500 bg-white px-3 py-1 rounded-full border border-taupe-200">
          Step 04 / Identity Calibration
        </span>
        <h1 className="editorial-heading text-3xl sm:text-4xl md:text-5xl font-semibold text-charcoal-900">
          See yourself in the outfit.
        </h1>
        <p className="text-sm text-charcoal-500">
          Upload a clear full-body photograph to evaluate proportions, draping, and contrast.
        </p>
      </div>

      {/* Upload & Preview Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-10 border border-taupe-200 shadow-card space-y-8">
        
        {currentPhoto ? (
          <div className="max-w-sm mx-auto space-y-4">
            <ImagePreview
              src={currentPhoto}
              alt="Uploaded User Photograph"
              onReplace={handleReplace}
              onRemove={handleReplace}
              aspectRatio="aspect-[3/4]"
              badge="Full-Body Calibrated"
            />
            <div className="p-3 bg-[#F4F9F5] rounded-xl border border-emerald-200 text-xs text-charcoal-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Full-body pose identified. Ready for virtual fitting.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <UploadBox
              title="Upload your photo"
              subtitle="Drag & drop or browse your computer for a clean portrait."
              onImageSelected={handleImageUploaded}
              requirements={[
                "Full body",
                "Good lighting",
                "Person clearly visible",
                "JPG / PNG",
                "Maximum 10 MB"
              ]}
            />
            
            {/* Quick Demo Helper */}
            <div className="text-center pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCurrentPhoto("/user_portrait.png");
                  setUserPhoto("/user_portrait.png");
                  showToast("Loaded First Photo (Flannel Shirt Portrait)!", "info");
                }}
                className="text-xs font-semibold text-charcoal-900 bg-taupe-100 hover:bg-taupe-200 px-3 py-1.5 rounded-full transition-colors inline-flex items-center gap-1.5 border border-taupe-300"
              >
                👤 Use First Photo (Flannel Portrait)
              </button>
              <button
                type="button"
                onClick={handleUseSample}
                className="text-xs font-semibold text-charcoal-700 underline hover:text-black inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-charcoal-700" /> Use studio demo photo
              </button>
            </div>
          </div>
        )}

        {/* Privacy Assurance */}
        <div className="p-4 bg-[#FAF8F5] rounded-xl border border-taupe-200 flex items-start gap-3 text-xs text-charcoal-600">
          <Shield className="w-4 h-4 text-taupe-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-charcoal-900">Privacy Notice:</strong> Your photo remains entirely local within your browser session and is never uploaded to public clouds or sold to third-party advertisers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-taupe-200">
          <Button
            variant="ghost"
            size="md"
            onClick={() => navigate('/try-existing')}
          >
            ← Back
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleProceed}
            iconRight={<ArrowRight className="w-4 h-4" />}
          >
            Continue to Try-On →
          </Button>
        </div>

      </div>

    </div>
  );
};
