export default function FormPageSkeleton({ hasSidebar = true }) {
  return (
    <div className="min-h-screen">
      {/* Header skeleton */}
      <div className="mb-8 flex items-center gap-6">
        <div className="h-20 w-20 bg-gray-200/70 rounded-3xl animate-pulse" />
        <div>
          <div className="h-10 w-56 bg-gray-200/70 rounded-xl animate-pulse mb-2" />
          <div className="h-6 w-96 bg-gray-200/50 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Form layout */}
      <div className={`grid grid-cols-1 ${hasSidebar ? 'lg:grid-cols-3' : ''} gap-8`}>
        {/* Main form area */}
        <div className={hasSidebar ? 'lg:col-span-2' : ''}>
          <div className="bg-white/60 rounded-2xl border border-gray-200/50 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 bg-gray-200/70 rounded-xl animate-pulse" />
              <div>
                <div className="h-6 w-48 bg-gray-200/70 rounded-lg animate-pulse mb-1" />
                <div className="h-4 w-64 bg-gray-200/50 rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 w-28 bg-gray-200/70 rounded animate-pulse mb-2" />
                  <div className="h-12 w-full bg-gray-200/50 rounded-xl animate-pulse" />
                </div>
              ))}
            </div>
            <div className="mt-8">
              <div className="h-12 w-40 bg-gray-200/70 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {hasSidebar && (
          <div className="space-y-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white/60 rounded-2xl border border-gray-200/50 p-6">
                <div className="h-6 w-32 bg-gray-200/70 rounded-lg animate-pulse mb-4" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-gray-200/50 rounded-lg animate-pulse" />
                      <div className="h-4 flex-1 bg-gray-200/50 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
