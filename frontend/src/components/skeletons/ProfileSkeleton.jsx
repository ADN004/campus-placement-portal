export default function ProfileSkeleton() {
  return (
    <div className="min-h-screen pb-8">
      {/* Header skeleton */}
      <div className="mb-8 flex items-center gap-6">
        <div className="h-20 w-20 bg-gray-200/70 rounded-3xl animate-pulse" />
        <div>
          <div className="h-10 w-40 bg-gray-200/70 rounded-xl animate-pulse mb-2" />
          <div className="h-6 w-80 bg-gray-200/50 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form card */}
        <div className="lg:col-span-2">
          <div className="bg-white/60 rounded-2xl border border-gray-200/50 p-8">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-200/70 rounded-2xl animate-pulse" />
                <div className="h-7 w-48 bg-gray-200/70 rounded-lg animate-pulse" />
              </div>
              <div className="h-10 w-32 bg-gray-200/70 rounded-xl animate-pulse" />
            </div>
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 w-28 bg-gray-200/70 rounded animate-pulse mb-2" />
                  <div className="h-12 w-full bg-gray-200/50 rounded-xl animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar cards */}
        <div className="space-y-6">
          <div className="bg-white/60 rounded-2xl border border-gray-200/50 p-6">
            <div className="h-6 w-20 bg-gray-200/70 rounded-lg animate-pulse mb-4" />
            <div className="p-4 bg-gray-100/50 rounded-xl mb-4">
              <div className="h-4 w-full bg-gray-200/50 rounded animate-pulse mb-2" />
              <div className="h-4 w-3/4 bg-gray-200/50 rounded animate-pulse" />
            </div>
            <div className="h-12 w-full bg-gray-200/70 rounded-xl animate-pulse" />
          </div>

          <div className="bg-white/60 rounded-2xl border border-gray-200/50 p-6">
            <div className="h-6 w-44 bg-gray-200/70 rounded-lg animate-pulse mb-4" />
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="p-4 bg-gray-100/50 rounded-xl">
                  <div className="h-3 w-16 bg-gray-200/50 rounded animate-pulse mb-1" />
                  <div className="h-5 w-full bg-gray-200/70 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/60 rounded-2xl border border-gray-200/50 p-6">
            <div className="h-6 w-52 bg-gray-200/70 rounded-lg animate-pulse mb-3" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 w-full bg-gray-200/50 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
