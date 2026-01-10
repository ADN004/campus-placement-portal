export default function GlassCard({
  children,
  variant = 'default',
  hover = true,
  className = '',
  onClick,
  ...props
}) {
  const variantClasses = {
    default: 'bg-white rounded-2xl border border-gray-200 shadow-sm',
    elevated: 'bg-white rounded-2xl border border-gray-200 shadow-lg',
    accent: 'bg-white rounded-2xl border-2 border-blue-200',
  };

  const hoverClass = hover ? 'hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer' : '';
  const clickableClass = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`${variantClasses[variant]} ${hoverClass} ${clickableClass} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}
