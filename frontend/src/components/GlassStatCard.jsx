import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function GlassStatCard({
  title,
  value,
  icon: Icon,
  gradient = 'from-blue-500 to-purple-600',
  link,
  description,
  badge,
  index = 0,
}) {
  const CardWrapper = link ? Link : 'div';
  const cardProps = link ? { to: link } : {};

  return (
    <CardWrapper
      {...cardProps}
      className="group relative bg-white rounded-2xl border border-gray-200 shadow-md p-6 min-h-[160px] flex flex-col justify-between hover:-translate-y-2 hover:shadow-xl transition-all duration-300 stagger-item"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Background Gradient Overlay (appears on hover) */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>

      {/* Content */}
      <div className="relative z-10">
        {/* Icon and Badge */}
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 bg-gradient-to-br ${gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {Icon && <Icon className="text-white" size={28} />}
          </div>
          {badge && (
            <span className="badge-primary text-xs">{badge}</span>
          )}
        </div>

        {/* Value */}
        <div className="mb-2">
          <h3 className="text-5xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </h3>
        </div>

        {/* Title */}
        <p className="text-lg font-semibold text-gray-800 mb-1">{title}</p>

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>

      {/* Link Arrow (appears on hover if link exists) */}
      {link && (
        <div className="relative z-10 flex items-center text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-4">
          <span className="text-sm font-medium mr-2">View Details</span>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
        </div>
      )}
    </CardWrapper>
  );
}
