export default function SectionHeader({ title, icon: Icon, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <Icon className="text-white" size={24} />
          </div>
        )}
        <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
