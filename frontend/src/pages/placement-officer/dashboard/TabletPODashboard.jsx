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
 * Tablet (`md` up to below `lg`) presenter.
 *
 * Its own layout, not a stretched phone and not a shrunk desktop: everything
 * runs full width in one column, because at ~700px of content the desktop's
 * two-thirds/one-third band would squeeze both halves — but each block uses the
 * whole width rather than the phone's stacked, narrow rhythm. The stat block
 * goes four across, and the responsibilities split into two ruled columns,
 * neither of which the phone can do.
 *
 * Touch targets stay phone-sized. A tablet is a touch device, not a small
 * laptop.
 */
export default function TabletPODashboard({
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

      <section className="mb-7">
        <StatBlock stats={statCards} columns={4} />
      </section>

      <section className="mb-7">
        <h2 className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted mb-2">
          Quick actions
        </h2>
        <ActionList actions={quickActions} />
      </section>

      <section>
        <Panel>
          <PanelHeading>What you can do here</PanelHeading>
          <ResponsibilityList columns={2} />
        </Panel>
      </section>
    </div>
  );
}

/** Loading skeleton shaped like the tablet layout. */
export function TabletPODashboardSkeleton() {
  return (
    <div>
      <HeadingSkeleton />
      <div className="mb-7">
        <StatBlockSkeleton columns={4} />
      </div>
      <Bar className="h-3 w-28 mb-2" />
      <div className="mb-7">
        <ListSkeleton rows={3} />
      </div>
      <ListSkeleton rows={3} />
    </div>
  );
}
