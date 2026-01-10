export default function GradientOrb({ color = 'blue', size = 'md', position, animationDuration = '6s', delay = '0s' }) {
  const sizeClasses = {
    sm: 'w-32 h-32',
    md: 'w-64 h-64',
    lg: 'w-96 h-96',
    xl: 'w-[32rem] h-[32rem]',
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    cyan: 'bg-cyan-500',
    indigo: 'bg-indigo-500',
    violet: 'bg-violet-500',
    fuchsia: 'bg-fuchsia-500',
  };

  // Convert position string to CSS object
  const getPositionStyle = () => {
    if (!position) return {};
    if (typeof position === 'object') return position;

    const positionMap = {
      'top-left': { top: '-10%', left: '-10%' },
      'top-right': { top: '-10%', right: '-10%' },
      'bottom-left': { bottom: '-10%', left: '-10%' },
      'bottom-right': { bottom: '-10%', right: '-10%' },
      'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      'top-center': { top: '-10%', left: '50%', transform: 'translateX(-50%)' },
      'bottom-center': { bottom: '-10%', left: '50%', transform: 'translateX(-50%)' },
    };

    return positionMap[position] || {};
  };

  return (
    <div
      className={`absolute ${sizeClasses[size]} ${colorClasses[color]} rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float`}
      style={{
        ...getPositionStyle(),
        animationDuration,
        animationDelay: delay,
      }}
    />
  );
}
