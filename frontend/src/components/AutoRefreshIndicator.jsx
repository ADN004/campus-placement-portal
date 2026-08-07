import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Small indicator that shows auto-refresh status and allows manual refresh.
 *
 * `variant="officer"` renders the Register treatment; every other caller keeps
 * the original markup with its class strings unchanged.
 *
 * The officer branch also gives the two controls real hit areas. The originals
 * were a 22px icon button and a 20px-tall pill — fine beside a mouse, too small
 * for a thumb, and this sits at the top of the busiest screen in the role.
 */
export default function AutoRefreshIndicator({
  lastRefreshed,
  autoRefreshEnabled,
  onToggle,
  onManualRefresh,
  refreshing = false,
  variant,
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

  if (variant === 'officer') {
    return (
      <div className="flex items-center gap-1 flex-nowrap">
        <button
          type="button"
          onClick={onManualRefresh}
          disabled={refreshing}
          aria-label="Refresh now"
          title="Refresh now"
          className="inline-flex items-center justify-center w-11 h-11 flex-shrink-0
            rounded-spc-control text-spc-body hover:bg-spc-surface-2 hover:text-spc-ink
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : undefined} aria-hidden="true" />
        </button>

        <span className="text-xs text-spc-muted tabular-nums whitespace-nowrap hidden sm:inline">
          {refreshing ? 'Refreshing…' : `Updated ${timeAgo}`}
        </span>

        <button
          type="button"
          onClick={onToggle}
          aria-pressed={autoRefreshEnabled}
          title={
            autoRefreshEnabled
              ? 'Updating on its own. Click to stop.'
              : 'Not updating on its own. Click to start.'
          }
          className="inline-flex items-center gap-1.5 min-h-[44px] px-2.5 flex-shrink-0
            rounded-spc-control text-spc-xs font-bold text-spc-ink whitespace-nowrap
            hover:bg-spc-surface-2 transition-colors"
        >
          <span
            aria-hidden="true"
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              autoRefreshEnabled ? 'bg-spc-ok' : 'bg-spc-muted'
            }`}
          />
          {/* "Live"/"Paused" reads as a label for the data; these say what the
              button does to it, which is what a button should say. */}
          <span>{autoRefreshEnabled ? 'Updating' : 'Paused'}</span>
        </button>
      </div>
    );
  }

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
