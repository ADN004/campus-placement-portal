export default function PODashboardSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Header + Auto Refresh skeleton */}
      <div className="mb-2 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 bg-gray-200/70 rounded-3xl animate-pulse" />
          <div>
            <div className="h-10 w-72 bg-gray-200/70 rounded-xl animate-pulse mb-2" />
            <div className="h-6 w-64 bg-gray-200/50 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="h-10 w-48 bg-gray-200/50 rounded-xl animate-pulse" />
      </div>

      {/* 4 KPI stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/60 rounded-2xl border border-gray-200/50 p-6 min-h-[160px]">
            <div className="flex items-start justify-between mb-4">
              <div className="h-14 w-14 bg-gray-200/70 rounded-xl animate-pulse" />
            </div>
            <div className="h-12 w-20 bg-gray-200/70 rounded-lg animate-pulse mb-2" />
            <div className="h-5 w-32 bg-gray-200/70 rounded-lg animate-pulse mb-1" />
            <div className="h-4 w-40 bg-gray-200/50 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Quick Actions skeleton */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-12 w-12 bg-gray-200/70 rounded-2xl animate-pulse" />
          <div className="h-8 w-36 bg-gray-200/70 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/60 rounded-2xl border border-gray-200/50 p-6">
              <div className="flex items-start space-x-4 mb-4">
                <div className="h-14 w-14 bg-gray-200/70 rounded-xl animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-5 w-32 bg-gray-200/70 rounded-lg animate-pulse mb-2" />
                  <div className="h-4 w-full bg-gray-200/50 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Responsibilities skeleton */}
      <div className="bg-white/60 rounded-2xl border border-gray-200/50 p-8">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 bg-gray-200/70 rounded-2xl animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <div className="h-7 w-64 bg-gray-200/70 rounded-lg animate-pulse mb-4" />
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="h-4 w-full bg-gray-200/50 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
