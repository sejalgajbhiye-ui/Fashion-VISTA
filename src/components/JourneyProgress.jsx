import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';

export const JourneyProgress = () => {
  const location = useLocation();

  // Workflow steps mapping
  const steps = [
    { path: '/stylist', label: 'AI Stylist', number: '01' },
    { path: '/recommendations', label: 'Occasion Ensemble', number: '02' },
    { path: '/try-existing', label: 'Wardrobe Synergy', number: '03' },
    { path: '/shop-new', label: 'Missing Item', number: '04', optional: true },
    { path: '/analysis', label: 'Decision Analysis', number: '05' }
  ];

  // Only display on workflow routes
  const currentPath = location.pathname;
  const isWorkflowRoute = steps.some(s => s.path === currentPath);
  if (!isWorkflowRoute) return null;

  return (
    <div className="bg-[#FAF8F5] border-b border-taupe-200 py-2.5 px-4 overflow-x-auto">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs min-w-max gap-4">
        <div className="flex items-center gap-1.5 text-taupe-600 font-semibold tracking-wider uppercase text-[10px]">
          <span>Workflow:</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {steps.map((step, idx) => {
            const isActive = currentPath === step.path;
            const isCompleted = steps.findIndex(s => s.path === currentPath) > idx;

            return (
              <React.Fragment key={step.path}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-taupe-400 shrink-0" />}
                <Link
                  to={step.path}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors ${
                    isActive
                      ? 'bg-charcoal-900 text-cream-50 font-bold'
                      : isCompleted
                      ? 'text-charcoal-700 hover:text-black font-medium'
                      : 'text-taupe-500 hover:text-charcoal-600'
                  }`}
                >
                  <span className={`text-[10px] ${isActive ? 'text-cream-100' : 'text-taupe-500'}`}>
                    {step.number}
                  </span>
                  <span className="text-xs">{step.label}</span>
                </Link>
              </React.Fragment>
            );
          })}
        </div>
        <div className="hidden lg:block text-[11px] text-taupe-600 font-medium italic">
          "Check what I own before suggesting what I buy"
        </div>
      </div>
    </div>
  );
};
