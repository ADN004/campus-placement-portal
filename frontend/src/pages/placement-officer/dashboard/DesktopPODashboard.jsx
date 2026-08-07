import {
  PageHeading,
  RefreshControl,
  StatBlock,
  ActionList,
  Panel,
  PanelHeading,
  ResponsibilityList,
  HeadingSkeleton,
  StatBlockSkeleton,
  ListSkeleton,
  Bar,
} from './dashboardShared';

/**
 * Desktop (`lg` and up) presenter — reworked, not preserved.
 *
 * The old wide layout alternated between a squeezed four-across strip of cards
 * and a full-width slab of six boxed bullet points, which is what made it feel
 * cramped and empty at the same time. This gives the page one rhythm: the ruled
 * stat block across the top, then a single two-thirds / one-third band so the
 * actions and the reference text sit side by side instead of stacking into
 * whitespace.
 */
export default function DesktopPODashboard({
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
  return (
    <div>
      <PageHeading
        collegeName={collegeName}
        regionName={regionName}
        title="Placement Officer Dashboard"
      >
        <RefreshControl
          lastRefreshed={lastRefreshed}
          autoRefreshEnabled={autoRefreshEnabled}
          onToggle={onToggleAutoRefresh}
          onManualRefresh={onManualRefresh}
          refreshing={refreshing}
        />
      </PageHeading>

      <section className="mb-8">
        <StatBlock stats={statCards} columns={4} />
      </section>

      <div className="grid grid-cols-3 gap-6">
        <section className="col-span-2 min-w-0">
          <h2 className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-2">
            Quick actions
          </h2>
          <ActionList actions={quickActions} />
        </section>

        <section className="col-span-1 min-w-0">
          <h2 className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-2">
            Reference
          </h2>
          <Panel>
            <PanelHeading>What you can do here</PanelHeading>
            <ResponsibilityList />
          </Panel>
        </section>
      </div>
    </div>
  );
}

/** Loading skeleton shaped like the desktop layout. */
export function DesktopPODashboardSkeleton() {
  return (
    <div>
      <HeadingSkeleton />
      <div className="mb-8">
        <StatBlockSkeleton columns={4} />
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 min-w-0">
          <Bar className="h-3 w-28 mb-2" />
          <ListSkeleton rows={3} />
        </div>
        <div className="col-span-1 min-w-0">
          <Bar className="h-3 w-24 mb-2" />
          <ListSkeleton rows={3} />
        </div>
      </div>
    </div>
  );
}
