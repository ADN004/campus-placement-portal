import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, Sparkles, Shield, TrendingUp } from 'lucide-react';

export default function RoleSelectionPage() {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'student',
      title: 'Student',
      description: 'Access your placement dashboard, apply for jobs, and manage your profile',
      icon: GraduationCap,
      color: 'from-blue-500 to-indigo-600',
      hoverColor: 'hover:from-blue-600 hover:to-indigo-700',
      path: '/login/student',
      features: ['View job opportunities', 'Track applications', 'Update profile']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>

        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-30"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .bg-grid-pattern {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>

      <div className="w-full max-w-6xl relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          {/* Logo Badge */}
          <div className="inline-block mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-2xl opacity-40 animate-pulse"></div>
            <div className="relative inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl shadow-2xl transform hover:scale-110 hover:rotate-6 transition-all duration-300">
              <GraduationCap className="text-white" size={56} />
              <div className="absolute -top-2 -right-2 bg-green-400 rounded-full p-2 shadow-lg animate-bounce">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="block text-white mb-2">Welcome to</span>
            <span className="block bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
              State Placement Cell
            </span>
          </h1>

          {/* Subtitle */}
          <div className="space-y-2">
            <p className="text-xl sm:text-2xl text-blue-100 font-semibold">
              Kerala Polytechnics
            </p>
            <p className="text-base sm:text-lg text-blue-200/80 max-w-2xl mx-auto">
              Your gateway to career opportunities and professional growth
            </p>
          </div>

          {/* Stats Bar */}
          <div className="mt-10 flex flex-wrap justify-center gap-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-green-300" />
                <div className="text-left">
                  <p className="text-2xl font-bold text-white">500+</p>
                  <p className="text-xs text-blue-200">Students Placed</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-blue-300" />
                <div className="text-left">
                  <p className="text-2xl font-bold text-white">100%</p>
                  <p className="text-xs text-blue-200">Secure Portal</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Student Login Card */}
        <div className="max-w-2xl mx-auto mb-10">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => navigate(role.path)}
                className="group relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 transform hover:scale-[1.02] p-12 text-center overflow-hidden w-full border border-white/20"
              >
                {/* Animated Border Glow */}
                <div className="absolute inset-0 rounded-3xl bg-white opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-xl"></div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full filter blur-3xl opacity-10 group-hover:opacity-20 transition-opacity -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-purple-500 to-blue-600 rounded-full filter blur-3xl opacity-10 group-hover:opacity-20 transition-opacity -ml-20 -mb-20"></div>

                <div className="relative z-10">
                  {/* Icon */}
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl mb-8 shadow-xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                    <Icon className="text-white" size={48} />
                  </div>

                  {/* Title */}
                  <h3 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-5 group-hover:scale-105 transition-transform">
                    {role.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-lg mb-8 leading-relaxed max-w-xl mx-auto">
                    {role.description}
                  </p>

                  {/* Features Grid */}
                  <div className="grid sm:grid-cols-3 gap-4 mb-10 max-w-2xl mx-auto">
                    {role.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-center sm:justify-start gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 group-hover:from-blue-100 group-hover:to-indigo-100 transition-all"
                      >
                        <div className="bg-green-500 rounded-full p-1 flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Login Button */}
                  <div className="inline-block w-full sm:w-auto">
                    <button className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-xl px-12 py-5 rounded-2xl shadow-xl hover:shadow-2xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3 group/btn relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                      <span className="relative z-10">Continue to Login</span>
                      <ArrowRight className="w-6 h-6 group-hover/btn:translate-x-2 transition-transform relative z-10" />
                    </button>
                  </div>

                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transform -skew-x-12 group-hover:translate-x-full transition-all duration-1000 pointer-events-none"></div>
                </div>
              </button>
            );
          })}
        </div>

        {/* New Student Registration */}
        <div className="text-center mb-10">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl p-8 inline-block border border-white/20 hover:bg-white/15 transition-all">
            <p className="text-white text-lg mb-5">
              <span className="font-bold text-xl">New Student?</span>
              <span className="block mt-2 text-blue-200">Join our placement portal and start your journey</span>
            </p>
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center justify-center px-10 py-4 border-2 border-white text-lg font-bold rounded-xl text-white bg-white/5 hover:bg-white hover:text-blue-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 group"
            >
              <GraduationCap className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform" />
              Register as Student
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4 text-green-300" />
            <p className="text-sm text-blue-200 font-medium">
              Secure Student Portal - Protected by Enterprise-Grade Security
            </p>
          </div>
          <p className="text-xs text-blue-300/60">
            State Placement Cell, Kerala Polytechnics - Empowering Students Since 1958
          </p>
        </div>
      </div>
    </div>
  );
}
