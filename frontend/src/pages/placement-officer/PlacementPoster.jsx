import { useState, useEffect } from 'react';
import { placementOfficerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';
import useSkeletonLoading from '../../hooks/useSkeletonLoading';
import useDeviceType from '../../hooks/useDeviceType';
import PosterPage from './poster/PosterPage';
import { Panel, PageHeading, SecondaryButton } from '../../components/officer/OfficerUI';
import {
  DesktopPosterSkeleton,
  TabletPosterSkeleton,
  MobilePosterSkeleton,
} from './poster/PosterSkeleton';

/**
 * PlacementPoster — container.
 *
 * Owns the stats fetch, the refresh and the PDF download; the presenter renders
 * what it is handed. The exported PDF is produced server-side and its design is
 * not touched here.
 */
export default function PlacementPoster() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const deviceType = useDeviceType();

  useEffect(() => {
    fetchStats(false);
  }, []);

  /**
   * `initial` decides which spinner this is.
   *
   * Refresh used to set the same `loading` flag the first load does, and
   * `useSkeletonLoading` turns that into the full-page skeleton — so pressing
   * "Refresh Stats" replaced the entire page, including the button just
   * pressed, and locked body scroll while it ran. A refresh now marks only
   * itself, and the figures stay on screen while they are being re-read.
   */
  const fetchStats = async (isRefresh = true) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await placementOfficerAPI.getPlacementPosterStats();
      setStats(response.data.data);
      if (isRefresh) toast.success('Figures refreshed');
    } catch (error) {
      toast.error('Failed to load placement poster statistics');
      console.error('Failed to load stats:', error);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  const handleRefreshStats = () => fetchStats(true);

  /*
   * One definition of "has a logo", used by the button, the readiness list and
   * nothing else.
   *
   * It was `college_logo_url !== null` for the checklist tick and the button's
   * disabled state, but a falsy check inside the click handler and on the
   * server. An empty string passed the first and failed the other two, which
   * showed a green tick beside an enabled button that returned a 400 the moment
   * it was pressed. Falsy everywhere now, matching the server.
   */
  const hasLogo = Boolean(stats?.college_logo_url);
  const hasPlacements = (stats?.total_students_placed || 0) > 0;
  const canGenerate = hasLogo && hasPlacements;

  const handleGeneratePoster = async () => {
    if (!stats) {
      toast.error('No placement data available');
      return;
    }

    if (!hasPlacements) {
      toast.error('No students placed yet. Cannot generate poster.');
      return;
    }

    if (!hasLogo) {
      toast.error('College logo is required. Please upload your college logo from your Profile page.');
      return;
    }

    try {
      setGenerating(true);
      const loadingToast = toast.loading('Generating placement poster PDF...');

      const response = await placementOfficerAPI.generatePlacementPoster();

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `Placement_Poster_${stats.college_name.replace(/\s+/g, '_')}_${
        stats.placement_year_start
      }-${stats.placement_year_end}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success('Placement poster generated successfully!');
    } catch (error) {
      console.error('Generate poster error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to generate placement poster';
      toast.error(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  const showSkeleton = useSkeletonLoading(loading);

  if (showSkeleton) {
    if (deviceType === 'mobile') return <MobilePosterSkeleton />;
    if (deviceType === 'tablet') return <TabletPosterSkeleton />;
    return <DesktopPosterSkeleton />;
  }

  if (!stats) {
    return (
      <div>
        <PageHeading
          title="Placement Poster"
          size={deviceType === 'mobile' ? 'sm' : 'md'}
        />
        <Panel>
          <div className="px-4 py-10 text-center">
            <AlertCircle size={28} className="mx-auto text-spc-bad mb-3" aria-hidden="true" />
            <p className="text-spc-sm font-bold text-spc-ink">
              Could not load your placement figures.
            </p>
            <p className="text-spc-xs text-spc-muted mt-1 mb-4">
              The page needs them before it can build a poster.
            </p>
            <SecondaryButton onClick={handleRefreshStats} disabled={refreshing}>
              {refreshing ? 'Trying…' : 'Try again'}
            </SecondaryButton>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <PosterPage
      layout={deviceType}
      stats={stats}
      hasLogo={hasLogo}
      hasPlacements={hasPlacements}
      canGenerate={canGenerate}
      generating={generating}
      refreshing={refreshing}
      onGenerate={handleGeneratePoster}
      onRefresh={handleRefreshStats}
    />
  );
}
