import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  PageHeading,
  RefreshControl,
  StatBlock,
  ActionList,
  Panel,
  ResponsibilityList,
  HeadingSkeleton,
  StatBlockSkeleton,
  ListSkeleton,
  Bar,
} from './dashboardShared';

/**
 * Mobile (below `md`) presenter — a single column, ordered by what an officer
 * needs first: who am I, the numbers, the shortcuts, then reference.
 *
 * The old header alone cost roughly 200px here: a 96px gradient icon tile beside
 * a 48px title that wrapped to three lines before a single number was visible.
 * It is plain text now.
 *
 * All state, effects, API calls and handlers live in the container; this file
 * only renders what it is handed.
 */
export default function MobilePODashboard({
  collegeName,
  regionName,
  statCards,
  quickActions,
  lastRefreshed,
  autoRefreshEnabled,
  onToggleAutoRefresh,
  onManualRefresh,
  refreshing,
}) {
  // Purely visual disclosure. Six always-open rows of reference text is a wall
  // on a phone, and none of it is something you act on.
  const [responsibilitiesOpen, setResponsibilitiesOpen] = useState(false);

  return (
    <div className="pb-2">
      <PageHeading
        collegeName={collegeName}
        regionName={regionName}
        title="Dashboard"
        size="sm"
      />

      <div className="mb-6">
        <RefreshControl
          lastRefreshed={lastRefreshed}
          autoRefreshEnabled={autoRefreshEnabled}
          onToggle={onToggleAutoRefresh}
          onManualRefresh={onManualRefresh}
          refreshing={refreshing}
        />
      </div>

      <section className="mb-6">
        <StatBlock stats={statCards} columns={2} />
      </section>

      <section className="mb-6">
        <h2 className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-2">
          Quick actions
        </h2>
        <ActionList actions={quickActions} />
      </section>

      <section>
        <Panel>
          <button
            type="button"
            onClick={() => setResponsibilitiesOpen((open) => !open)}
            aria-expanded={responsibilitiesOpen}
            aria-controls="po-responsibilities"
            className="w-full min-h-[52px] flex items-center justify-between gap-2 px-4 py-3
              text-left active:bg-spc-surface-2 transition-colors"
          >
            <span className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted">
              What you can do here
            </span>
            <ChevronDown
              size={17}
              className={`text-spc-muted flex-shrink-0 transition-transform duration-200
                ${responsibilitiesOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {responsibilitiesOpen && (
            <div id="po-responsibilities" className="border-t border-spc-line">
              <ResponsibilityList />
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
}

/** Loading skeleton shaped like the mobile layout. */
export function MobilePODashboardSkeleton() {
  return (
    <div>
      <HeadingSkeleton size="sm" />
      <Bar className="h-11 w-52 mb-6" />
      <div className="mb-6">
        <StatBlockSkeleton columns={2} />
      </div>
      <Bar className="h-3 w-28 mb-2" />
      <ListSkeleton rows={3} />
    </div>
  );
}
