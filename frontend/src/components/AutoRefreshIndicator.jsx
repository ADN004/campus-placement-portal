import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Small indicator that shows auto-refresh status and allows manual refresh.
 */
export default function AutoRefreshIndicator({
  lastRefreshed,
  autoRefreshEnabled,
  onToggle,
  onManualRefresh,
  refreshing = false,
}) {
  const [timeAgo, setTimeAgo] = useState('just now');

  useEffect(() => {
    const update = () => {
      const seconds = Math.floor((new Date() - lastRefreshed) / 1000);
      if (seconds < 10) setTimeAgo('just now');
      else if (seconds < 60) setTimeAgo(`${seconds}s ago`);
      else setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [lastRefreshed]);

  return (
    <div className="flex items-center gap-2 text-xs bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
      {/* Manual refresh button */}
      <button
        onClick={onManualRefresh}
        disabled={refreshing}
        className="p-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
        title="Refresh now"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
      </button>

      {/* Time ago */}
      <span className="text-gray-500 hidden sm:inline">
        {refreshing ? 'Refreshing...' : `Updated ${timeAgo}`}
      </span>

      {/* Auto-refresh toggle */}
      <button
        onClick={onToggle}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
          autoRefreshEnabled
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
        title={autoRefreshEnabled ? 'Auto-refresh is ON (click to disable)' : 'Auto-refresh is OFF (click to enable)'}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${autoRefreshEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
        {autoRefreshEnabled ? 'Live' : 'Paused'}
      </button>
    </div>
  );
}
