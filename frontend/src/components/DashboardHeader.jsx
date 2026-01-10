export default function DashboardHeader({ title, subtitle, icon: Icon }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-6">
        {/* Icon Container with Gradient */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
          <div className="relative p-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-xl">
            {Icon && <Icon className="text-white" size={48} />}
          </div>
        </div>

        {/* Title and Subtitle */}
        <div>
          <h1 className="text-5xl font-black bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent mb-2 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-full shadow-sm">
              <p className="text-gray-700 font-medium">{subtitle}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
