import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Eye, EyeOff, ArrowLeft, Shield, BookOpen, Briefcase, AlertCircle } from 'lucide-react';

export default function StudentLoginPage() {
  const [prn, setPrn] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Send PRN as email field (backend handles this)
    const result = await login({ email: prn, password });

    setLoading(false);

    if (result.success) {
      // Verify it's actually a student
      if (result.user.role === 'student') {
        navigate('/student/dashboard');
      } else {
        // If not a student, show error
        setError('Invalid credentials for student login. Please check your PRN and password.');
      }
    } else {
      setError(result.message || 'Invalid PRN or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>

        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
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
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        .bg-grid-pattern {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>

      <div className="w-full max-w-6xl relative z-10 flex items-center justify-center gap-8">
        {/* Left Side - Welcome Section */}
        <div className="hidden lg:block flex-1 text-white space-y-8 pr-12">
          <div className="space-y-4">
            <div className="inline-block">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-full px-6 py-3 border border-white/20">
                <GraduationCap className="w-8 h-8" />
                <span className="font-bold text-xl">State Placement Cell</span>
              </div>
            </div>

            <h1 className="text-5xl font-bold leading-tight">
              Welcome Back,
              <br />
              <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
                Future Professional
              </span>
            </h1>

            <p className="text-xl text-blue-100 leading-relaxed">
              Access your placement dashboard and take the next step in your career journey
            </p>
          </div>

          {/* Feature Cards */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="bg-blue-500/20 p-3 rounded-xl">
                <Briefcase className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Job Opportunities</h3>
                <p className="text-blue-200 text-sm">Discover and apply for top placement opportunities</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="bg-indigo-500/20 p-3 rounded-xl">
                <BookOpen className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Track Progress</h3>
                <p className="text-blue-200 text-sm">Monitor your applications and interview schedules</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="bg-purple-500/20 p-3 rounded-xl">
                <Shield className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Secure Portal</h3>
                <p className="text-blue-200 text-sm">Your data is protected with enterprise-grade security</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-blue-200">
              Kerala Polytechnics - Empowering Students Since 1958
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-auto lg:min-w-[480px]">
          {/* Back Button */}
          <button
            onClick={() => navigate('/login')}
            className="mb-6 inline-flex items-center text-white/80 hover:text-white transition-colors group bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to home page</span>
          </button>

          {/* Login Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-12 border border-white/20 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full filter blur-3xl opacity-10 -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-purple-500 to-blue-600 rounded-full filter blur-3xl opacity-10 -ml-20 -mb-20"></div>

            <div className="relative">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl mb-5 shadow-xl transform hover:scale-110 hover:rotate-3 transition-all duration-300">
                  <GraduationCap className="text-white" size={40} />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
                  Student Login
                </h2>
                <p className="text-gray-600 font-medium">
                  State Placement Cell, Kerala Polytechnics
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Alert */}
                {error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start space-x-3 animate-shake">
                    <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <p className="text-red-800 font-semibold text-sm">{error}</p>
                    </div>
                  </div>
                )}

                {/* PRN Field */}
                <div className="space-y-2">
                  <label htmlFor="prn" className="block text-sm font-semibold text-gray-700 mb-2">
                    PRN (Permanent Registration Number)
                  </label>
                  <div className="relative group">
                    <input
                      id="prn"
                      type="text"
                      value={prn}
                      onChange={(e) => setPrn(e.target.value)}
                      placeholder="Enter your PRN"
                      className="w-full px-4 py-3.5 pr-12 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium bg-white/50 backdrop-blur-sm"
                      required
                      autoFocus
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Use your Permanent Registration Number to login
                  </p>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative group">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3.5 pr-12 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 font-medium bg-white/50 backdrop-blur-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-lg hover:bg-blue-50"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Default password is <code className="bg-blue-50 px-2 py-0.5 rounded text-blue-600 font-mono text-xs ml-1">123</code> (change after first login)
                  </p>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Logging in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2 relative z-10">
                      Login to Dashboard
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="mt-8 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-600 font-semibold">New Student?</span>
                  </div>
                </div>
              </div>

              {/* Register Button */}
              <Link
                to="/register"
                className="block w-full text-center px-6 py-3.5 border-2 border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100 font-bold rounded-xl transition-all shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] group"
              >
                <span className="flex items-center justify-center gap-2">
                  <GraduationCap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  Register as Student
                </span>
              </Link>

              {/* Security Notice */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500 p-1.5 rounded-lg mt-0.5">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-1">Secure Student Portal</p>
                    <p className="text-xs text-blue-700">
                      This login is exclusively for students. Use your PRN to access your account securely.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-6 text-center">
            <p className="text-sm text-white/60 font-medium">
              Protected by enterprise-grade security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
