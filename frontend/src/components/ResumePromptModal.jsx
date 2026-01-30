import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, X, ChevronRight, Sparkles } from 'lucide-react';
import GlassCard from './GlassCard';

export default function ResumePromptModal({ onClose }) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleGoToResume = () => {
    navigate('/student/resume');
    onClose();
  };

  const handleSkip = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={handleSkip}
      ></div>

      {/* Modal Content */}
      <div className={`relative z-10 w-full max-w-2xl transform transition-all duration-500 ${
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        <GlassCard className="p-0 overflow-hidden">
          {/* Gradient Header with Animation */}
          <div className="relative bg-gradient-to-br from-green-600 via-teal-600 to-cyan-700 p-8 pb-10 overflow-hidden">
            {/* Animated Background Orbs */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-green-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>

            {/* Close Button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-all transform hover:scale-110 active:scale-95"
            >
              <X size={24} />
            </button>

            {/* Icon with Animation */}
            <div className="relative flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-white rounded-full blur-xl opacity-50 animate-ping"></div>
                <div className="relative bg-white rounded-full p-6 shadow-2xl animate-bounce">
                  <FileText className="text-teal-600" size={56} />
                </div>
                {/* Sparkles */}
                <Sparkles className="absolute -top-2 -right-2 text-yellow-300 animate-pulse" size={24} />
                <Sparkles className="absolute -bottom-2 -left-2 text-yellow-300 animate-pulse" style={{ animationDelay: '0.5s' }} size={20} />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-4xl font-bold text-white text-center mb-3">
              Complete Your Resume
            </h2>
            <p className="text-xl text-white/90 text-center font-medium">
              Build your professional resume to stand out to recruiters
            </p>
          </div>

          {/* Content */}
          <div className="p-8 pt-8 relative z-10 bg-white rounded-t-2xl -mt-4">
            {/* Benefits */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-2 mr-3">
                  <CheckCircle size={24} className="text-white" />
                </div>
                Why Complete Your Resume?
              </h3>
              <div className="space-y-4">
                {[
                  'Have your resume ready when applying to jobs',
                  'Showcase your skills, projects, and experience',
                  'Officers and admins can download your resume',
                  'Stand out with a complete, professional resume'
                ].map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-100 transform transition-all hover:scale-105"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-full p-1">
                        <CheckCircle size={18} className="text-white" />
                      </div>
                    </div>
                    <p className="text-gray-800 font-semibold">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleGoToResume}
                className="flex-1 bg-gradient-to-r from-green-600 via-teal-600 to-cyan-600 hover:from-green-700 hover:via-teal-700 hover:to-cyan-700 text-white font-bold py-5 px-6 rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center space-x-3 group relative overflow-hidden"
              >
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                <span className="relative z-10 text-lg">Complete Resume Now</span>
                <ChevronRight size={24} className="relative z-10 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={handleSkip}
                className="sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-5 px-6 rounded-xl border-2 border-gray-300 transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                Skip for Now
              </button>
            </div>

            {/* Note */}
            <p className="text-center text-sm text-gray-600 mt-6 font-medium bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
              You can complete your resume anytime from the <strong>My Resume</strong> menu.
              <br />
              This popup will appear each time you login until your resume is filled.
            </p>
          </div>
        </GlassCard>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
