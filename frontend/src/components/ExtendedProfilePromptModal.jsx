import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, X, ChevronRight } from 'lucide-react';

export default function ExtendedProfilePromptModal({ onClose, profileCompletion }) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleGoToProfile = () => {
    navigate('/student/extended-profile');
    onClose();
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleSkip}
      ></div>

      {/* Modal */}
      <div className={`relative z-10 w-full max-w-md transform transition-all duration-400 ${
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1 transition-all"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-xl p-2.5">
                <FileText className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Complete Your Extended Profile</h2>
                <p className="text-sm text-white/80">Unlock all job opportunities</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Progress */}
            <div className="mb-4 bg-blue-50 p-3.5 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Current Progress</span>
                <span className="text-lg font-bold text-blue-600">{profileCompletion}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${profileCompletion}%` }}
                ></div>
              </div>
            </div>

            {/* Benefits */}
            <div className="mb-4 space-y-2">
              {[
                'Apply to jobs requiring additional details',
                'Get matched with better opportunities',
                'Stand out to recruiters',
                'Increase shortlisting chances'
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleGoToProfile}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span>Complete Profile</span>
                <ChevronRight size={18} />
              </button>
              <button
                onClick={handleSkip}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2.5 px-4 rounded-xl border border-gray-200 transition-all text-sm"
              >
                Skip
              </button>
            </div>

            {/* Tip */}
            <p className="text-center text-xs text-gray-500 mt-3">
              You can complete your profile anytime from the Extended Profile menu.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
