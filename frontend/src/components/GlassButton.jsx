export default function GlassButton({
  children,
  variant = 'default',
  size = 'md',
  icon: Icon,
  onClick,
  disabled = false,
  className = '',
  ...props
}) {
  const variantClasses = {
    default: 'glass-btn',
    primary: disabled
      ? 'bg-gray-300 text-gray-600 rounded-xl border-2 border-gray-400 shadow font-bold'
      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl border-2 border-blue-400 shadow-lg hover:shadow-2xl hover:from-blue-700 hover:to-indigo-700 hover:scale-105 hover:border-blue-300 transition-all duration-300 font-bold',
    secondary: 'bg-white/80 backdrop-blur-xl border-2 border-gray-300 text-gray-800 rounded-xl hover:bg-white hover:border-gray-400 hover:shadow-lg transition-all duration-300 font-medium',
    danger: 'bg-gradient-to-r from-red-500/30 to-rose-500/30 backdrop-blur-xl border border-red-400/40 text-white rounded-xl hover:from-red-500/40 hover:to-rose-500/40',
    success: 'bg-gradient-to-r from-emerald-500/30 to-green-500/30 backdrop-blur-xl border border-emerald-400/40 text-white rounded-xl hover:from-emerald-500/40 hover:to-green-500/40',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const disabledClasses = disabled
    ? 'cursor-not-allowed'
    : 'active:scale-95 hover:shadow-lg';

  return (
    <button
      className={`${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} font-medium transition-all duration-300 inline-flex items-center justify-center gap-2 ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />}
      {children}
    </button>
  );
}
