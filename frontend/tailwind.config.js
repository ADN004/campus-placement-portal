/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ---------------------------------------------------------------------
      // SPC design system (student role). Everything below is ADDITIVE — no
      // existing key is redefined, so placement-officer and super-admin pages
      // are unaffected. Colours read the CSS custom properties declared in
      // index.css and keep Tailwind's opacity modifiers working
      // (e.g. bg-spc-teal/10, text-spc-muted).
      // ---------------------------------------------------------------------
      fontFamily: {
        satoshi: ['Satoshi', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'spc-display': ['1.75rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],      // 28 — phone page title
        'spc-display-lg': ['2.375rem', { lineHeight: '1.06', letterSpacing: '-0.034em' }], // 38 — desktop page title
        'spc-h1': ['1.375rem', { lineHeight: '1.15', letterSpacing: '-0.026em' }],        // 22
        'spc-h1-lg': ['1.625rem', { lineHeight: '1.15', letterSpacing: '-0.028em' }],     // 26
        'spc-h2': ['1.125rem', { lineHeight: '1.25', letterSpacing: '-0.016em' }],        // 18
        'spc-h3': ['1rem', { lineHeight: '1.35', letterSpacing: '-0.012em' }],            // 16
        'spc-body': ['0.96875rem', { lineHeight: '1.55' }],                               // 15.5
        'spc-sm': ['0.875rem', { lineHeight: '1.5' }],                                    // 14
        'spc-xs': ['0.8125rem', { lineHeight: '1.45' }],                                  // 13 — floor for body copy
        'spc-label': ['0.75rem', { lineHeight: '1.3', letterSpacing: '0.11em' }],         // 12 — hard minimum, caps only
        'spc-metric': ['1.875rem', { lineHeight: '1', letterSpacing: '-0.03em' }],        // 30
        'spc-metric-lg': ['2.25rem', { lineHeight: '1', letterSpacing: '-0.032em' }],     // 36
      },
      borderRadius: {
        'spc-sm': '10px',   // controls — buttons, inputs, chips
        spc: '14px',        // cards
        'spc-lg': '18px',   // panels, sheets
      },
      colors: {
        spc: {
          ground: 'rgb(var(--spc-ground) / <alpha-value>)',
          surface: 'rgb(var(--spc-surface) / <alpha-value>)',
          'surface-2': 'rgb(var(--spc-surface-2) / <alpha-value>)',
          line: 'rgb(var(--spc-line) / <alpha-value>)',
          'line-strong': 'rgb(var(--spc-line-strong) / <alpha-value>)',
          control: 'rgb(var(--spc-control) / <alpha-value>)',
          ink: 'rgb(var(--spc-ink) / <alpha-value>)',
          body: 'rgb(var(--spc-body) / <alpha-value>)',
          muted: 'rgb(var(--spc-muted) / <alpha-value>)',
          teal: 'rgb(var(--spc-teal) / <alpha-value>)',
          'teal-soft': 'rgb(var(--spc-teal-soft) / <alpha-value>)',
          'on-teal': 'rgb(var(--spc-on-teal) / <alpha-value>)',
          'on-teal-dim': 'rgb(var(--spc-on-teal-dim) / <alpha-value>)',
          brass: 'rgb(var(--spc-brass) / <alpha-value>)',
          'brass-soft': 'rgb(var(--spc-brass-soft) / <alpha-value>)',
          ok: 'rgb(var(--spc-ok) / <alpha-value>)',
          'ok-bg': 'rgb(var(--spc-ok-bg) / <alpha-value>)',
          warn: 'rgb(var(--spc-warn) / <alpha-value>)',
          'warn-bg': 'rgb(var(--spc-warn-bg) / <alpha-value>)',
          bad: 'rgb(var(--spc-bad) / <alpha-value>)',
          'bad-bg': 'rgb(var(--spc-bad-bg) / <alpha-value>)',
        },
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.05)',
          medium: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.1)',
          elevated: 'rgba(255, 255, 255, 0.15)',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 3s linear infinite',
        'gradient-x': 'gradient-x 15s ease infinite',
        'gradient-y': 'gradient-y 15s ease infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': {
            transform: 'translateY(0px) translateX(0px)',
          },
          '50%': {
            transform: 'translateY(-20px) translateX(10px)',
          },
        },
        glow: {
          '0%': {
            boxShadow: '0 0 5px rgba(59, 130, 246, 0.5), 0 0 10px rgba(59, 130, 246, 0.3)',
          },
          '100%': {
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.4)',
          },
        },
        shimmer: {
          '0%': {
            backgroundPosition: '-1000px 0',
          },
          '100%': {
            backgroundPosition: '1000px 0',
          },
        },
        'gradient-x': {
          '0%, 100%': {
            backgroundPosition: '0% 50%',
          },
          '50%': {
            backgroundPosition: '100% 50%',
          },
        },
        'gradient-y': {
          '0%, 100%': {
            backgroundPosition: '50% 0%',
          },
          '50%': {
            backgroundPosition: '50% 100%',
          },
        },
        'gradient-xy': {
          '0%, 100%': {
            backgroundPosition: '0% 0%',
          },
          '25%': {
            backgroundPosition: '100% 0%',
          },
          '50%': {
            backgroundPosition: '100% 100%',
          },
          '75%': {
            backgroundPosition: '0% 100%',
          },
        },
      },
    },
  },
  plugins: [],
}
