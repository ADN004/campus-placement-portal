import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GraduationCap, Building2, ShieldCheck, ArrowRight, Sparkles,
  Search, FileText, UserPlus, ChevronRight, Globe, TrendingUp, Award,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Counter hook — only runs when enabled
   ═══════════════════════════════════════════════════════ */
function useCountUp(target, duration = 2000, delay = 0, enabled = true) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) { setCount(0); return; }
    let raf;
    const timeout = setTimeout(() => {
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(timeout); if (raf) cancelAnimationFrame(raf); };
  }, [target, duration, delay, enabled]);
  return count;
}

/* ═══════════════════════════════════════════════════════
   Skeleton UI — matches real layout dimensions
   ═══════════════════════════════════════════════════════ */
function SkeletonBar({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />;
}

function SkeletonUI() {
  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10 sm:mb-14">
        <div className="flex justify-center mb-6">
          <div className="w-[76px] h-[76px] sm:w-[88px] sm:h-[88px] rounded-[22px] bg-white/[0.06] animate-pulse" />
        </div>
        <div className="space-y-3 flex flex-col items-center">
          <SkeletonBar className="h-10 sm:h-12 w-72 sm:w-96" />
          <SkeletonBar className="h-5 w-64 sm:w-80" />
          <SkeletonBar className="h-4 w-56 sm:w-72" />
          <SkeletonBar className="h-4 w-80 sm:w-[26rem]" />
        </div>
      </div>

      {/* Student card */}
      <div className="max-w-2xl mx-auto mb-4 rounded-[22px] border border-white/[0.06] bg-white/[0.03] p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.06] animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2.5">
            <SkeletonBar className="h-6 w-48" />
            <SkeletonBar className="h-4 w-64 sm:w-72" />
          </div>
        </div>
        <SkeletonBar className="h-[52px] sm:h-14 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-4">
          <SkeletonBar className="h-[60px] rounded-xl" />
          <SkeletonBar className="h-[60px] rounded-xl" />
          <SkeletonBar className="h-[60px] rounded-xl" />
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/[0.05]">
          <SkeletonBar className="h-12" />
          <SkeletonBar className="h-12" />
          <SkeletonBar className="h-12" />
        </div>
      </div>

      {/* Register */}
      <div className="flex flex-col items-center mb-12 sm:mb-16 mt-6 gap-3">
        <SkeletonBar className="h-4 w-48" />
        <SkeletonBar className="h-14 w-52 rounded-2xl" />
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-2xl mx-auto">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-white/[0.06] animate-pulse" />
            <SkeletonBar className="h-5 w-40" />
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="h-4 w-24 mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Animation presets — individual section use only
   ═══════════════════════════════════════════════════════ */
const ease = [0.16, 1, 0.3, 1];
const btnSpring = { type: 'spring', stiffness: 400, damping: 25 };

const GLOW_DEFAULT = '0 0 30px rgba(99,102,241,0.18), 0 0 60px rgba(99,102,241,0.08), 0 8px 24px rgba(0,0,0,0.25)';
const GLOW_HOVER   = '0 0 50px rgba(99,102,241,0.35), 0 0 100px rgba(99,102,241,0.15), 0 12px 40px rgba(0,0,0,0.3)';

/* ═══════════════════════════════════════════════════════
   CSS particles — fixed position, pure CSS animation
   ═══════════════════════════════════════════════════════ */
const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  x: 8 + Math.random() * 84,
  y: 8 + Math.random() * 84,
  size: 1 + Math.random() * 1.5,
  dur: 12 + Math.random() * 12,
  delay: Math.random() * 8,
  opacity: 0.08 + Math.random() * 0.14,
  dx: `${((Math.random() - 0.5) * 16).toFixed(1)}px`,
  dy: `${(-12 - Math.random() * 18).toFixed(1)}px`,
}));

/* ═══════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════ */
export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  /* Fake load — lets React settle + fonts/icons load */
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  /* Lock scroll while skeleton is visible */
  useEffect(() => {
    document.body.style.overflow = loading ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [loading]);

  /* Counters only start after loading finishes */
  const colleges  = useCountUp(60,    2000, 300,  !loading);
  const students  = useCountUp(10000, 2600, 500,  !loading);
  const companies = useCountUp(500,   2200, 700,  !loading);

  return (
    <div className="min-h-screen bg-[#070b1e] overflow-x-hidden">

      {/* Particle CSS — only animation using keyframes */}
      <style>{`
        @keyframes pdrift {
          0%, 100% { transform: translate(0,0); }
          50% { transform: translate(var(--dx), var(--dy)); }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════
           STATIC BACKGROUND — fixed, no framer-motion
         ═══════════════════════════════════════════════ */}
      <div className="fixed inset-0 pointer-events-none select-none z-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-[#070b1e] via-[#0c1339] to-[#0a0f2e]" />

        {/* Static gradient orbs — NO animation */}
        <div
          className="absolute rounded-full"
          style={{
            width: 600, height: 600, top: '-10%', right: '-5%',
            background: 'radial-gradient(circle, rgba(79,70,229,0.20) 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 500, height: 500, bottom: '-8%', left: '-10%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)',
            filter: 'blur(90px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 400, height: 400, top: '40%', left: '50%', marginLeft: -200,
            background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),' +
              'linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />

        {/* CSS-only particles — fixed, no layout impact */}
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="rounded-full bg-white/80"
            style={{
              position: 'fixed',
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: p.opacity,
              '--dx': p.dx,
              '--dy': p.dy,
              animation: `pdrift ${p.dur}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
              pointerEvents: 'none',
            }}
          />
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
           CONTENT — plain div, no motion wrapper
         ═══════════════════════════════════════════════ */}
      <div className="relative z-[1] min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
        <div className="w-full max-w-5xl mx-auto">

          {loading ? (
            /* ─── SKELETON ─── */
            <SkeletonUI />
          ) : (
            /* ─── REAL CONTENT — each section animates independently ─── */
            <div className="w-full max-w-3xl mx-auto">

              {/* ──────────── HEADER ──────────── */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease }}
                className="text-center mb-10 sm:mb-14"
              >
                <div className="inline-block mb-6 relative">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full blur-[50px] opacity-25 scale-[2.5]" />
                  <div className="relative w-[76px] h-[76px] sm:w-[88px] sm:h-[88px] bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-[22px] flex items-center justify-center shadow-2xl shadow-indigo-600/25 border border-white/[0.12]">
                    <GraduationCap className="text-white w-9 h-9 sm:w-10 sm:h-10" />
                    <div className="absolute -top-2 -right-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full p-[5px] shadow-lg shadow-amber-500/40">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight leading-none mb-3">
                  <span className="bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent">
                    State Placement Cell
                  </span>
                </h1>
                <p className="text-base sm:text-lg font-semibold text-blue-300/90 mb-1.5">
                  Directorate of Technical Education, Kerala
                </p>
                <p className="text-sm sm:text-base font-medium bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent mb-2">
                  A Smart Campus Placement Management System
                </p>
                <p className="text-slate-400/80 text-sm max-w-lg mx-auto leading-relaxed">
                  Connecting Students with Opportunities Across Kerala Polytechnic Colleges
                </p>
              </motion.div>

              {/* ──────────── STUDENT HERO CARD ──────────── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.6, ease }}
              >
                {/* Float wrapper — only y animation, will-change for GPU layer */}
                <motion.div
                  className="max-w-2xl mx-auto mb-4 rounded-[22px]"
                  style={{ willChange: 'transform', boxShadow: GLOW_DEFAULT }}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{
                    scale: 1.02,
                    boxShadow: GLOW_HOVER,
                    transition: { duration: 0.35, ease: 'easeOut' },
                  }}
                >
                  {/* Gradient border */}
                  <div className="p-[2px] rounded-[22px] bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500">
                    {/* Glass interior */}
                    <div className="bg-gradient-to-br from-[#0e1848]/[0.92] to-[#101440]/[0.94] backdrop-blur-xl rounded-[20px] p-6 sm:p-8 relative overflow-hidden">

                      {/* Static interior glow spots */}
                      <div className="absolute -top-20 -right-20 w-44 h-44 bg-indigo-500 rounded-full blur-[90px] opacity-[0.14] pointer-events-none" />
                      <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-blue-500 rounded-full blur-[90px] opacity-[0.12] pointer-events-none" />

                      <div className="relative z-10">
                        {/* Card header */}
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/25 border border-white/[0.12] flex-shrink-0">
                            <GraduationCap className="text-white w-7 h-7 sm:w-8 sm:h-8" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5 mb-1">
                              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                Student Login
                              </h2>
                              <span className="text-[10px] font-extrabold tracking-[0.12em] uppercase px-2.5 py-[3px] rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow-lg shadow-amber-500/20">
                                Most Used
                              </span>
                            </div>
                            <p className="text-slate-300/80 text-sm leading-relaxed">
                              Access your placement dashboard and career opportunities
                            </p>
                          </div>
                        </div>

                        {/* Primary CTA */}
                        <motion.button
                          onClick={() => navigate('/login/student')}
                          className="w-full py-4 sm:py-[18px] px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-base sm:text-lg font-bold rounded-2xl flex items-center justify-center gap-3 cursor-pointer shadow-lg shadow-indigo-600/25 border border-white/[0.08]"
                          whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(99,102,241,0.4), 0 8px 40px rgba(0,0,0,0.3)' }}
                          whileTap={{ scale: 0.97 }}
                          transition={btnSpring}
                        >
                          Sign In as Student
                          <ArrowRight className="w-5 h-5" />
                        </motion.button>

                        {/* Secondary action pills */}
                        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-4">
                          {[
                            { icon: Search, label: 'Browse Opportunities' },
                            { icon: FileText, label: 'Track Applications' },
                            { icon: UserPlus, label: 'Update Profile' },
                          ].map(({ icon: Icon, label }) => (
                            <motion.button
                              key={label}
                              onClick={() => navigate('/login/student')}
                              className="flex flex-col items-center gap-1.5 sm:gap-2 py-3 px-2 rounded-xl bg-white/[0.04] border border-white/[0.06] cursor-pointer"
                              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(129,140,248,0.2)' }}
                              whileTap={{ scale: 0.95 }}
                              transition={btnSpring}
                            >
                              <Icon className="w-4 h-4 text-indigo-300/70" />
                              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 text-center leading-tight">
                                {label}
                              </span>
                            </motion.button>
                          ))}
                        </div>

                        {/* Animated counters */}
                        <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/[0.07]">
                          {[
                            { val: colleges, suffix: '+', label: 'Colleges', icon: Globe },
                            { val: students, suffix: '+', label: 'Students Placed', sub: 'Every Year', icon: TrendingUp },
                            { val: companies, suffix: '+', label: 'Companies', icon: Award },
                          ].map(({ val, suffix, label, sub, icon: Icon }) => (
                            <div key={label} className="text-center">
                              <div className="flex items-center justify-center gap-1.5 mb-1">
                                <Icon className="w-3.5 h-3.5 text-indigo-400/70" />
                                <span className="text-lg sm:text-2xl font-extrabold bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
                                  {val.toLocaleString()}{suffix}
                                </span>
                              </div>
                              <span className="text-[10px] sm:text-xs text-slate-500 font-medium block">{label}</span>
                              {sub && <span className="text-[9px] sm:text-[10px] text-slate-600 block">{sub}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* ──────────── REGISTER CTA ──────────── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.5, ease }}
                className="text-center mb-12 sm:mb-16 mt-2"
              >
                <p className="text-slate-400 text-sm mb-4">
                  New student? Create your account
                </p>
                <div className="inline-block relative">
                  {/* Pulse ring — every ~10s */}
                  <motion.div
                    className="absolute -inset-1 rounded-2xl"
                    style={{ border: '2px solid rgba(16,185,129,0.35)' }}
                    animate={{ scale: [1, 1.1], opacity: [0.6, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 8.2, ease: 'easeOut' }}
                  />
                  <motion.button
                    onClick={() => navigate('/register')}
                    className="relative px-10 sm:px-12 py-4 sm:py-[18px] rounded-2xl font-bold text-base sm:text-lg cursor-pointer overflow-hidden"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={btnSpring}
                  >
                    {/* Gradient border */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 p-[2px]">
                      <div className="w-full h-full rounded-[14px] bg-[#070b1e]" />
                    </div>
                    {/* Subtle fill */}
                    <div className="absolute inset-[2px] rounded-[14px] bg-gradient-to-r from-emerald-500/[0.08] to-cyan-500/[0.08]" />
                    {/* Content */}
                    <span className="relative z-10 flex items-center gap-2.5 bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                      <UserPlus className="w-5 h-5 text-emerald-400" />
                      Register Now
                      <ChevronRight className="w-4 h-4 text-cyan-400" />
                    </span>
                  </motion.button>
                </div>
              </motion.div>

              {/* ──────────── ROLE CARDS ──────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-2xl mx-auto">
                {/* Placement Officer */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.36, duration: 0.5, ease }}
                  onClick={() => navigate('/login/officer')}
                  className="group relative bg-white/[0.025] backdrop-blur-xl border border-white/[0.06] hover:border-teal-400/30 rounded-2xl p-6 text-left overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                  whileHover={{ y: -4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-teal-500 rounded-full blur-[70px] opacity-0 group-hover:opacity-[0.12] transition-opacity duration-500" />
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/15 mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Building2 className="text-white" size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-teal-100 transition-colors duration-300">
                      Placement Officer
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-5">
                      Manage students, schedule drives, track placements
                    </p>
                    <div className="flex items-center gap-2 text-sm font-semibold text-teal-400/60 group-hover:text-teal-300 transition-colors duration-300">
                      Continue
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </div>
                </motion.button>

                {/* Super Admin */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.48, duration: 0.5, ease }}
                  onClick={() => navigate('/login/admin')}
                  className="group relative bg-white/[0.025] backdrop-blur-xl border border-white/[0.06] hover:border-purple-400/30 rounded-2xl p-6 text-left overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                  whileHover={{ y: -4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500 rounded-full blur-[70px] opacity-0 group-hover:opacity-[0.12] transition-opacity duration-500" />
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/15 mb-4 group-hover:scale-110 transition-transform duration-300">
                      <ShieldCheck className="text-white" size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-purple-100 transition-colors duration-300">
                      Super Admin
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-5">
                      Oversee colleges, manage officers, statewide analytics
                    </p>
                    <div className="flex items-center gap-2 text-sm font-semibold text-purple-400/60 group-hover:text-purple-300 transition-colors duration-300">
                      Continue
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* ──────────── FOOTER ──────────── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="mt-16 text-center"
              >
                <div className="inline-flex items-center gap-2.5 text-xs text-slate-600 tracking-wide">
                  <span className="w-8 h-px bg-slate-700/60" />
                  Powered by GPTC Palakkad
                  <span className="w-8 h-px bg-slate-700/60" />
                </div>
              </motion.div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
