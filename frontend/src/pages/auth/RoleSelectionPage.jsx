import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, Sparkles, Building2, ShieldCheck, Users, Briefcase, UserPlus } from 'lucide-react';

export default function RoleSelectionPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* --- Ambient background --- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-blue-600 rounded-full mix-blend-screen filter blur-[160px] opacity-15" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-indigo-600 rounded-full mix-blend-screen filter blur-[160px] opacity-15" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-purple-600 rounded-full mix-blend-screen filter blur-[140px] opacity-10" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Sparse floating dots */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-20"
            style={{
              top: `${10 + Math.random() * 80}%`,
              left: `${10 + Math.random() * 80}%`,
              animation: `float ${4 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          50% { transform: translateY(-18px) translateX(8px); opacity: 0.5; }
        }
        @keyframes subtle-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>

      <div className="w-full max-w-4xl relative z-10">
        {/* ====== Header ====== */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-block mb-5 relative">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-30 scale-150" />
            <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl shadow-2xl">
              <GraduationCap className="text-white" size={40} />
              <div className="absolute -top-1.5 -right-1.5 bg-emerald-400 rounded-full p-1 shadow-lg" style={{ animation: 'subtle-bounce 2s ease-in-out infinite' }}>
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-3">
            <span className="text-white">State Placement Cell</span>
          </h1>
          <p className="text-blue-200/90 text-base sm:text-lg font-medium">
            Directorate of Technical Education, Kerala
          </p>
          <p className="text-slate-400 text-sm mt-1.5 max-w-md mx-auto">
            Select your role to continue
          </p>
        </div>

        {/* ====== Student — Hero Card ====== */}
        <button
          onClick={() => navigate('/login/student')}
          className="group relative w-full max-w-2xl mx-auto block mb-5 rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.015] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          {/* Card background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />

          {/* Decorative circles */}
          <div className="absolute -right-10 -top-10 w-44 h-44 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />

          {/* Shimmer on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5 sm:gap-8 px-7 py-8 sm:py-9">
            {/* Icon block */}
            <div className="flex-shrink-0 w-20 h-20 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 group-hover:scale-105 transition-transform duration-300">
              <GraduationCap className="text-white" size={40} />
            </div>

            {/* Text */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-1.5">
                <h2 className="text-2xl sm:text-2xl font-bold text-white tracking-tight">
                  Student Login
                </h2>
                <span className="text-[10px] font-bold tracking-wider uppercase bg-amber-400/90 text-amber-950 px-2 py-0.5 rounded-full">
                  Most Used
                </span>
              </div>
              <p className="text-blue-100/80 text-sm leading-relaxed mb-4">
                Access your placement dashboard, apply for drives, and track your applications
              </p>
              {/* Feature pills */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                {[
                  { icon: Briefcase, label: 'Job Opportunities' },
                  { icon: Users, label: 'Track Applications' },
                  { icon: UserPlus, label: 'Update Profile' },
                ].map(({ icon: Ic, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 bg-white/10 border border-white/10 rounded-full px-3 py-1">
                    <Ic size={12} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0 hidden sm:flex items-center justify-center w-12 h-12 rounded-xl bg-white/15 border border-white/20 group-hover:bg-white/25 transition-all">
              <ArrowRight className="text-white w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </button>

        {/* "New student?" inline */}
        <p className="text-center text-sm text-slate-400 mb-8">
          New student?{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 decoration-blue-400/40 hover:decoration-blue-300/60 transition-colors"
          >
            Register here
          </button>
        </p>

        {/* ====== Officer & Admin — Compact Cards ====== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Placement Officer */}
          <button
            onClick={() => navigate('/login/officer')}
            className="group relative bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl border border-white/10 hover:border-emerald-400/30 rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500 rounded-full filter blur-3xl opacity-0 group-hover:opacity-10 transition-opacity -mr-10 -mt-10" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Building2 className="text-white" size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white mb-1 group-hover:text-emerald-100 transition-colors">
                  Placement Officer
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Manage students, schedule drives, and track college placements
                </p>
              </div>
              <ArrowRight className="flex-shrink-0 text-slate-500 group-hover:text-emerald-400 w-4 h-4 mt-1 group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>

          {/* Super Admin */}
          <button
            onClick={() => navigate('/login/admin')}
            className="group relative bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl border border-white/10 hover:border-purple-400/30 rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500 rounded-full filter blur-3xl opacity-0 group-hover:opacity-10 transition-opacity -mr-10 -mt-10" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <ShieldCheck className="text-white" size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white mb-1 group-hover:text-purple-100 transition-colors">
                  Super Admin
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Oversee all colleges, manage officers, and monitor statewide data
                </p>
              </div>
              <ArrowRight className="flex-shrink-0 text-slate-500 group-hover:text-purple-400 w-4 h-4 mt-1 group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>
        </div>

        {/* ====== Footer ====== */}
        <div className="mt-12 text-center">
          <p className="text-xs text-slate-500">
            State Placement Cell &middot; Directorate of Technical Education, Kerala
          </p>
        </div>
      </div>
    </div>
  );
}
