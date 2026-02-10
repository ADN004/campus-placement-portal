export default function TablePageSkeleton({
  statCards = 0,
  tableColumns = 6,
  tableRows = 8,
  hasTabs = false,
  hasSearch = true,
  hasFilters = true,
}) {
  return (
    <div className="min-h-screen pb-8">
      {/* Header skeleton */}
      <div className="mb-8 flex items-center gap-6">
        <div className="h-20 w-20 bg-gray-200/70 rounded-3xl animate-pulse" />
        <div>
          <div className="h-10 w-56 bg-gray-200/70 rounded-xl animate-pulse mb-2" />
          <div className="h-6 w-80 bg-gray-200/50 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Stats row skeleton */}
      {statCards > 0 && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(statCards, 4)} gap-4 mb-6`}>
          {[...Array(statCards)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 w-24 bg-gray-200/70 rounded animate-pulse mb-2" />
                  <div className="h-9 w-16 bg-gray-200/70 rounded-lg animate-pulse" />
                </div>
                <div className="h-12 w-12 bg-gray-200/70 rounded-2xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs skeleton */}
      {hasTabs && (
        <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-2">
          <div className="flex space-x-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-1 h-11 bg-gray-200/60 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Search and filters skeleton */}
      {(hasSearch || hasFilters) && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {hasSearch && (
              <div className="flex-1 min-w-[200px] h-11 bg-gray-200/50 rounded-xl animate-pulse" />
            )}
            {hasFilters && (
              <>
                <div className="h-11 w-40 bg-gray-200/50 rounded-xl animate-pulse" />
                <div className="h-11 w-40 bg-gray-200/50 rounded-xl animate-pulse" />
              </>
            )}
          </div>
        </div>
      )}

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-6">
            {[...Array(tableColumns)].map((_, i) => (
              <div
                key={i}
                className={`h-4 bg-gray-200/70 rounded animate-pulse ${i === 0 ? 'w-32' : 'w-24'}`}
              />
            ))}
          </div>
        </div>
        {/* Table rows */}
        {[...Array(tableRows)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-gray-100 last:border-0">
            <div className="flex items-center gap-6">
              {[...Array(tableColumns)].map((_, j) => (
                <div
                  key={j}
                  className={`h-4 bg-gray-200/50 rounded animate-pulse ${
                    j === 0 ? 'w-36' : j === tableColumns - 1 ? 'w-20' : 'w-28'
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between mt-4">
        <div className="h-4 w-32 bg-gray-200/50 rounded animate-pulse" />
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 w-9 bg-gray-200/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
