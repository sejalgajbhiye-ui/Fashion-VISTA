import React from 'react';
import { AlertCircle, Sparkles, Home } from 'lucide-react';
import { Button } from './Button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Fashion VISTA caught error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('fashion_vista_recommendation');
      localStorage.removeItem('fashion_vista_all_outfits');
    } catch {
      // ignore
    }
    this.setState({ hasError: false, error: null });
    window.location.href = '/stylist';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-taupe-300 shadow-card text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-charcoal-400">
                Display Recovery
              </span>
              <h2 className="editorial-heading text-2xl font-bold text-charcoal-900 mt-1">
                Let's Refresh Your Curation
              </h2>
              <p className="text-sm text-charcoal-600 mt-2">
                We encountered an unexpected display issue while assembling this look. Click below to regenerate fresh outfits.
              </p>
            </div>
            <div className="space-y-3 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={this.handleReset}
                className="w-full justify-center"
                iconLeft={<Sparkles className="w-4 h-4" />}
              >
                Curate Fresh Outfits
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => { window.location.href = '/wardrobe'; }}
                className="w-full justify-center"
                iconLeft={<Home className="w-4 h-4" />}
              >
                Back to Wardrobe
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
