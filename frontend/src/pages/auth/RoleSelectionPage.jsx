import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, Sparkles, Shield, TrendingUp, Building2, ShieldCheck } from 'lucide-react';

export default function RoleSelectionPage() {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'officer',
      title: 'Placement Officer',
      description: 'Manage your college placements, students, and drive schedules',
      icon: Building2,
      gradient: 'from-emerald-500 to-teal-600',
      hoverGradient: 'hover:from-emerald-600 hover:to-teal-700',
      iconBg: 'from-emerald-500 to-teal-600',
      featuresBg: 'from-emerald-50 to-teal-50',
      featuresHoverBg: 'group-hover:from-emerald-100 group-hover:to-teal-100',
      glowColor: 'hover:shadow-emerald-500/20',
      path: '/login/officer',
      features: ['Manage students', 'Schedule drives', 'Track placements'],
    },
    {
      id: 'student',
      title: 'Student',
      description: 'Access your placement dashboard, apply for jobs, and manage your profile',
      icon: GraduationCap,
      gradient: 'from-blue-500 to-indigo-600',
      hoverGradient: 'hover:from-blue-600 hover:to-indigo-700',
      iconBg: 'from-blue-500 via-indigo-600 to-purple-600',
      featuresBg: 'from-blue-50 to-indigo-50',
      featuresHoverBg: 'group-hover:from-blue-100 group-hover:to-indigo-100',
      glowColor: 'hover:shadow-blue-500/20',
      path: '/login/student',
      features: ['View job opportunities', 'Track applications', 'Update profile'],
      primary: true,
    },
    {
      id: 'admin',
      title: 'Super Admin',
      description: 'Oversee all colleges, manage officers, and monitor placement activities',
      icon: ShieldCheck,
      gradient: 'from-purple-500 to-violet-600',
      hoverGradient: 'hover:from-purple-600 hover:to-violet-700',
      iconBg: 'from-purple-500 to-violet-600',
      featuresBg: 'from-purple-50 to-violet-50',
      featuresHoverBg: 'group-hover:from-purple-100 group-hover:to-violet-100',
      glowColor: 'hover:shadow-purple-500/20',
      path: '/login/admin',
      features: ['Manage all colleges', 'Monitor placements', 'System administration'],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
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
        <div className="text-center mb-12">
          <div className="inline-block mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-2xl opacity-40 animate-pulse"></div>
            <div className="relative inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl shadow-2xl transform hover:scale-110 hover:rotate-6 transition-all duration-300">
              <GraduationCap className="text-white" size={48} />
              <div className="absolute -top-2 -right-2 bg-green-400 rounded-full p-1.5 shadow-lg animate-bounce">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
            <span className="block text-white mb-1">Welcome to</span>
            <span className="block bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
              State Placement Cell
            </span>
          </h1>

          <div className="space-y-1.5">
            <p className="text-lg sm:text-xl text-blue-100 font-semibold">Kerala Polytechnics</p>
            <p className="text-sm sm:text-base text-blue-200/80 max-w-2xl mx-auto">
              Your gateway to career opportunities and professional growth
            </p>
          </div>

          {/* Stats Bar */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-5 py-3 border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-300" />
                <div className="text-left">
                  <p className="text-xl font-bold text-white">500+</p>
                  <p className="text-xs text-blue-200">Students Placed</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-5 py-3 border border-white/20 hover:bg-white/15 transition-all">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-300" />
                <div className="text-left">
                  <p className="text-xl font-bold text-white">100%</p>
                  <p className="text-xs text-blue-200">Secure Portal</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto mb-8">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => navigate(role.path)}
                className={`group relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl ${role.glowColor} transition-all duration-500 transform hover:scale-[1.03] hover:-translate-y-1 p-7 text-center overflow-hidden border border-white/20 ${
                  role.primary ? 'md:-mt-3 md:-mb-[-12px] ring-2 ring-blue-400/30 shadow-2xl' : ''
                }`}
              >
                {/* Decorative Background Glow */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${role.iconBg} rounded-full filter blur-3xl opacity-10 group-hover:opacity-20 transition-opacity -mr-16 -mt-16`}></div>
                <div className={`absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr ${role.iconBg} rounded-full filter blur-3xl opacity-5 group-hover:opacity-15 transition-opacity -ml-12 -mb-12`}></div>

                <div className="relative z-10">
                  {/* Primary Badge */}
                  {role.primary && (
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md">
                      POPULAR
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${role.iconBg} rounded-xl mb-4 shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    <Icon className="text-white" size={32} />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:scale-105 transition-transform">
                    {role.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-500 text-sm mb-5 leading-relaxed">{role.description}</p>

                  {/* Features */}
                  <div className="space-y-2 mb-6">
                    {role.features.map((feature, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2.5 bg-gradient-to-r ${role.featuresBg} ${role.featuresHoverBg} rounded-lg p-2.5 transition-all`}
                      >
                        <div className="bg-green-500 rounded-full p-0.5 flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Login Button */}
                  <div className={`bg-gradient-to-r ${role.gradient} ${role.hoverGradient} text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    <span className="relative z-10">Continue to Login</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
                  </div>
                </div>

                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-5 transform -skew-x-12 group-hover:translate-x-full transition-all duration-1000 pointer-events-none"></div>
              </button>
            );
          })}
        </div>

        {/* New Student Registration */}
        <div className="text-center mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl p-6 inline-block border border-white/20 hover:bg-white/15 transition-all">
            <p className="text-white text-base mb-4">
              <span className="font-bold text-lg">New Student?</span>
              <span className="block mt-1 text-blue-200 text-sm">Join our placement portal and start your journey</span>
            </p>
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-sm font-bold rounded-xl text-white bg-white/5 hover:bg-white hover:text-blue-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 group"
            >
              <GraduationCap className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
              Register as Student
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4 text-green-300" />
            <p className="text-sm text-blue-200 font-medium">
              Secure Portal - Protected by Enterprise-Grade Security
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
