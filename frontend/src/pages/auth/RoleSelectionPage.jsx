import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GraduationCap, Building2, ShieldCheck, ArrowRight, Sparkles,
  Search, FileText, UserPlus, ChevronRight, Globe, TrendingUp, Award,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Stable random data — computed once at module load
   ═══════════════════════════════════════════════════════ */
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 1 + Math.random() * 1.5,
  dur: 10 + Math.random() * 14,
  delay: Math.random() * 8,
  opacity: 0.08 + Math.random() * 0.18,
  driftY: -(15 + Math.random() * 30),
  driftX: (Math.random() - 0.5) * 20,
}));

const STARS = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  x: 8 + Math.random() * 84,
  y: 8 + Math.random() * 84,
  size: 2 + Math.random() * 2,
  dur: 3 + Math.random() * 3,
  delay: Math.random() * 5,
}));

/* ═══════════════════════════════════════════════════════
   useCountUp — smooth animated counter
   ═══════════════════════════════════════════════════════ */
function useCountUp(target, duration = 2000, delay = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
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
  }, [target, duration, delay]);
  return count;
}

/* ═══════════════════════════════════════════════════════
   Framer Motion Variants
   ═══════════════════════════════════════════════════════ */
const ease = [0.16, 1, 0.3, 1];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } },
};

const headerVariant = {
  hidden: { opacity: 0, y: -30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
};

const cardEntranceVariant = {
  hidden: { opacity: 0, scale: 0.95, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.7, ease } },
};

const slideUpVariant = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

const fadeVariant = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8 } },
};

const roleContainerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

/* ── Student card glow presets ── */
const GLOW_REST    = '0 0 40px rgba(99,102,241,0.20), 0 0 80px rgba(99,102,241,0.10), 0 8px 32px rgba(0,0,0,0.3)';
const GLOW_BREATHE = '0 0 65px rgba(99,102,241,0.35), 0 0 130px rgba(99,102,241,0.15), 0 8px 40px rgba(0,0,0,0.3)';
const GLOW_HOVER   = '0 0 80px rgba(99,102,241,0.45), 0 0 160px rgba(99,102,241,0.20), 0 12px 48px rgba(0,0,0,0.35)';

/* Spring config for buttons */
const btnSpring = { type: 'spring', stiffness: 400, damping: 25 };

/* ═══════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════ */
export default function RoleSelectionPage() {
  const navigate = useNavigate();

  const colleges  = useCountUp(60,    2000, 1200);
  const students  = useCountUp(10000, 2600, 1400);
  const companies = useCountUp(500,   2200, 1600);

  return (
    <div className="min-h-screen bg-[#070b1e] relative overflow-x-hidden">

      {/* ═══════════════════════════════════════════════
           BACKGROUND LAYER
         ═══════════════════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#070b1e] via-[#0c1339] to-[#0a0f2e]" />

        {/* ── Animated mesh-gradient orbs ── */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 700, height: 700, top: '-14%', right: '-8%',
            background: 'radial-gradient(circle, rgba(79,70,229,0.28) 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
          animate={{ x: [0, 50, -25, 0], y: [0, -35, 25, 0], scale: [1, 1.08, 0.94, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 600, height: 600, bottom: '-10%', left: '-12%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 70%)',
            filter: 'blur(90px)',
          }}
          animate={{ x: [0, -35, 30, 0], y: [0, 25, -20, 0], scale: [1, 0.96, 1.06, 1] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 450, height: 450, top: '40%', left: '50%', marginLeft: -225,
            background: 'radial-gradient(circle, rgba(139,92,246,0.20) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
          animate={{ x: [0, 30, -20, 0], y: [0, -20, 15, 0], scale: [1, 1.05, 0.97, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        />

        {/* ── Grid overlay ── */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),' +
              'linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />

        {/* ── Kerala-inspired wave shapes ── */}
        <motion.svg
          className="absolute bottom-0 left-0 w-full h-44 opacity-[0.025]"
          preserveAspectRatio="none" viewBox="0 0 1440 140"
          animate={{ x: [0, -30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M0,70 C180,140 420,0 720,70 C1020,140 1260,0 1440,70 L1440,140 L0,140Z" fill="white" />
          <path d="M0,90 C300,30 600,130 900,60 C1100,20 1300,100 1440,80 L1440,140 L0,140Z" fill="white" opacity="0.5" />
        </motion.svg>
        <motion.svg
          className="absolute top-0 right-0 w-full h-36 opacity-[0.018] rotate-180"
          preserveAspectRatio="none" viewBox="0 0 1440 120"
          animate={{ x: [0, 25, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M0,80 C360,20 720,100 1080,40 C1200,20 1380,80 1440,60 L1440,120 L0,120Z" fill="white" />
        </motion.svg>

        {/* ── Floating abstract shapes ── */}
        <motion.div
          className="absolute rounded-full"
          style={{ width: 96, height: 96, top: '12%', left: '6%', border: '1px solid rgba(255,255,255,0.04)' }}
          animate={{ y: [0, -16, 0], rotate: [0, 4, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute"
          style={{ width: 64, height: 64, top: '22%', right: '10%', border: '1px solid rgba(129,140,248,0.06)', borderRadius: 12 }}
          animate={{ y: [0, -14, 0], rotate: [45, 50, 45] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{ width: 56, height: 56, bottom: '18%', left: '14%', border: '1px solid rgba(96,165,250,0.05)' }}
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div
          className="absolute"
          style={{ width: 112, height: 112, bottom: '28%', right: '6%', border: '1px solid rgba(168,85,247,0.04)', borderRadius: 16 }}
          animate={{ y: [0, -18, 0], rotate: [12, 16, 12] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        />
        <motion.div
          className="absolute"
          style={{ width: 40, height: 40, top: '55%', left: '3%', border: '1px solid rgba(45,212,191,0.04)', borderRadius: 8 }}
          animate={{ y: [0, -10, 0], rotate: [30, 35, 30] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{ width: 80, height: 80, top: '8%', left: '45%', border: '1px solid rgba(139,92,246,0.04)' }}
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        />

        {/* ── Particles ── */}
        {PARTICLES.map((p) => (
          <motion.div
            key={`p-${p.id}`}
            className="absolute rounded-full bg-white/80"
            style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
            animate={{
              y: [0, p.driftY, 0],
              x: [0, p.driftX, 0],
              opacity: [p.opacity, p.opacity + 0.12, p.opacity],
            }}
            transition={{ duration: p.dur, repeat: Infinity, ease: 'easeInOut', delay: p.delay }}
          />
        ))}

        {/* ── Stars ── */}
        {STARS.map((s) => (
          <motion.div
            key={`s-${s.id}`}
            className="absolute rounded-full bg-indigo-200"
            style={{ width: s.size, height: s.size, left: `${s.x}%`, top: `${s.y}%` }}
            animate={{ opacity: [0.12, 0.55, 0.12], scale: [1, 1.5, 1] }}
            transition={{ duration: s.dur, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
          />
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
           CONTENT
         ═══════════════════════════════════════════════ */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16"
      >
        <div className="w-full max-w-3xl">

          {/* ────────────────────────────────────
               HEADER
             ──────────────────────────────────── */}
          <motion.div variants={headerVariant} className="text-center mb-10 sm:mb-14">
            {/* Logo mark */}
            <motion.div
              className="inline-block mb-6 relative"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="absolute inset-0 bg-indigo-500 rounded-full blur-[50px] opacity-25 scale-[2.5]" />
              <div className="relative w-[76px] h-[76px] sm:w-[88px] sm:h-[88px] bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-[22px] flex items-center justify-center shadow-2xl shadow-indigo-600/25 border border-white/[0.12]">
                <GraduationCap className="text-white w-9 h-9 sm:w-10 sm:h-10" />
                <motion.div
                  className="absolute -top-2 -right-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full p-[5px] shadow-lg shadow-amber-500/40"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="w-3 h-3 text-white" />
                </motion.div>
              </div>
            </motion.div>

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

          {/* ────────────────────────────────────
               STUDENT HERO CARD
             ──────────────────────────────────── */}
          <motion.div variants={cardEntranceVariant}>
            {/* Float + Breathe + Hover wrapper */}
            <motion.div
              className="max-w-2xl mx-auto mb-4 rounded-[22px] cursor-default"
              animate={{
                y: [0, -8, 0],
                scale: [1, 1.02, 1],
                boxShadow: [GLOW_REST, GLOW_BREATHE, GLOW_REST],
              }}
              transition={{
                y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
                scale: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
                boxShadow: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
              }}
              whileHover={{
                scale: 1.03,
                boxShadow: GLOW_HOVER,
                transition: { duration: 0.4, ease: 'easeOut' },
              }}
            >
              {/* Gradient border */}
              <div className="p-[2px] rounded-[22px] bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-500">
                {/* Glass interior — BRIGHT by default */}
                <div className="bg-gradient-to-br from-[#0e1848]/[0.92] to-[#101440]/[0.94] backdrop-blur-2xl rounded-[20px] p-6 sm:p-8 relative overflow-hidden">

                  {/* Shimmer sweep */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 4, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
                  />

                  {/* Interior glow spots — always visible for brightness */}
                  <div className="absolute -top-20 -right-20 w-44 h-44 bg-indigo-500 rounded-full blur-[90px] opacity-[0.14] pointer-events-none" />
                  <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-blue-500 rounded-full blur-[90px] opacity-[0.12] pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-purple-500 rounded-full blur-[80px] opacity-[0.07] pointer-events-none" />

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
                          {/* Shimmering badge */}
                          <span className="relative overflow-hidden rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2.5 py-[3px] shadow-lg shadow-amber-500/20">
                            <span className="relative z-10 text-[10px] font-extrabold tracking-[0.12em] uppercase text-amber-950">
                              Most Used
                            </span>
                            <motion.span
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                              animate={{ x: ['-100%', '200%'] }}
                              transition={{ duration: 2, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
                            />
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
                          whileHover={{ scale: 1.06, backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(129,140,248,0.2)' }}
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

          {/* ────────────────────────────────────
               REGISTER — PRIMARY SECONDARY CTA
             ──────────────────────────────────── */}
          <motion.div variants={slideUpVariant} className="text-center mb-12 sm:mb-16">
            <p className="text-slate-400 text-sm mb-4">
              New student? Create your account
            </p>
            <div className="inline-block relative">
              {/* Pulse ring — fires every ~10 seconds */}
              <motion.div
                className="absolute -inset-1 rounded-2xl"
                style={{ border: '2px solid rgba(16,185,129,0.35)' }}
                animate={{ scale: [1, 1.1], opacity: [0.6, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 8.2, ease: 'easeOut' }}
              />
              <motion.button
                onClick={() => navigate('/register')}
                className="relative px-10 sm:px-12 py-4 sm:py-[18px] rounded-2xl font-bold text-base sm:text-lg cursor-pointer overflow-hidden"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                transition={btnSpring}
              >
                {/* Gradient border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 p-[2px]">
                  <div className="w-full h-full rounded-[14px] bg-[#070b1e]" />
                </div>
                {/* Subtle gradient fill */}
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

          {/* ────────────────────────────────────
               ROLE SELECTION CARDS
             ──────────────────────────────────── */}
          <motion.div
            variants={roleContainerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-2xl mx-auto"
          >
            {/* Placement Officer */}
            <motion.button
              variants={slideUpVariant}
              onClick={() => navigate('/login/officer')}
              className="group relative bg-white/[0.025] backdrop-blur-xl border border-white/[0.06] hover:border-teal-400/30 rounded-2xl p-6 text-left overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              whileHover={{ y: -5, scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
              whileTap={{ scale: 0.98 }}
              transition={btnSpring}
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
              variants={slideUpVariant}
              onClick={() => navigate('/login/admin')}
              className="group relative bg-white/[0.025] backdrop-blur-xl border border-white/[0.06] hover:border-purple-400/30 rounded-2xl p-6 text-left overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              whileHover={{ y: -5, scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
              whileTap={{ scale: 0.98 }}
              transition={btnSpring}
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
          </motion.div>

          {/* ────────────────────────────────────
               FOOTER
             ──────────────────────────────────── */}
          <motion.div variants={fadeVariant} className="mt-16 text-center">
            <div className="inline-flex items-center gap-2.5 text-xs text-slate-600 tracking-wide">
              <span className="w-8 h-px bg-slate-700/60" />
              Powered by GPTC Palakkad
              <span className="w-8 h-px bg-slate-700/60" />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
