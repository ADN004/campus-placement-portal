import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { superAdminAPI, commonAPI } from '../../services/api';
import useSkeleton from '../../hooks/useSkeleton';
import useDeviceType from '../../hooks/useDeviceType';
import PosterBody from './poster/PosterBody';
import PosterSkeleton from './poster/PosterSkeleton';

/**
 * Placement Poster — container.
 *
 * All state, effects and handlers; `PosterBody` draws them. Both generate paths
 * — one college, and several — keep their endpoints, filenames, toasts and
 * refusals exactly as they were.
 *
 * The PDF the server produces is untouched. This page chooses what goes into it
 * and shows what will; the document itself is generated in
 * `backend/utils/pdfGenerator.js` and is out of scope for the redesign.
 */
export default function PlacementPoster() {
  const deviceType = useDeviceType();
  const [colleges, setColleges] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedColleges, setSelectedColleges] = useState([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingColleges, setLoadingColleges] = useState(true);
  const { showSkeleton } = useSkeleton(loadingColleges);
  const [loadingStats, setLoadingStats] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchColleges();
  }, []);

  useEffect(() => {
    if (selectedCollege) {
      fetchStats();
    } else {
      setStats(null);
    }
  }, [selectedCollege]);

  const fetchColleges = async () => {
    try {
      setLoadingColleges(true);
      const response = await commonAPI.getColleges();
      setColleges(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load colleges');
      console.error('Failed to load colleges:', error);
    } finally {
      setLoadingColleges(false);
    }
  };

  const fetchStats = async (showToast = false) => {
    if (!selectedCollege) return;

    try {
      setLoadingStats(true);
      const response = await superAdminAPI.getPlacementPosterStatsForCollege(selectedCollege);
      setStats(response.data.data);
      if (showToast) {
        toast.success('Statistics refreshed successfully');
      }
    } catch (error) {
      toast.error('Failed to load placement poster statistics');
      console.error('Failed to load stats:', error);
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleRefreshStats = async () => {
    await fetchStats(true);
  };

  const handleToggleCollege = (collegeId) => {
    setSelectedColleges((prev) => (prev.includes(collegeId)
      ? prev.filter((id) => id !== collegeId)
      : [...prev, collegeId]));
  };

  const handleSelectAll = () => {
    if (selectedColleges.length === colleges.length) {
      setSelectedColleges([]);
    } else {
      setSelectedColleges(colleges.map((c) => c.id));
    }
  };

  const toggleMultiSelectMode = () => {
    setMultiSelectMode(!multiSelectMode);
  };

  /** Saves a PDF the browser has already received. Shared by both paths. */
  const downloadPdf = (data, fileName) => {
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleGeneratePoster = async () => {
    if (multiSelectMode) {
      if (selectedColleges.length === 0) {
        toast.error('Please select at least one college');
        return;
      }

      try {
        setGenerating(true);
        const loadingToast = toast.loading(
          `Generating poster for ${selectedColleges.length} college(s)...`,
        );

        const response = await superAdminAPI.generateMultiCollegePlacementPoster(selectedColleges);

        downloadPdf(
          response.data,
          `Multi_College_Placement_Poster_${selectedColleges.length}_Colleges_${
            new Date().toISOString().split('T')[0]
          }.pdf`,
        );

        toast.dismiss(loadingToast);
        toast.success(
          `Placement poster generated for ${selectedColleges.length} college(s)!`,
        );
      } catch (error) {
        const errorMsg = error.response?.data?.message || 'Failed to generate placement poster';
        toast.error(errorMsg);
        console.error('Poster generation error:', error);
      } finally {
        setGenerating(false);
      }
      return;
    }

    if (!selectedCollege) {
      toast.error('Please select a college first');
      return;
    }

    if (!stats) {
      toast.error('No placement data available');
      return;
    }

    if (stats.total_students_placed === 0) {
      toast.error('No students placed yet. Cannot generate poster.');
      return;
    }

    try {
      setGenerating(true);
      const loadingToast = toast.loading('Generating placement poster PDF...');

      const response = await superAdminAPI.generatePlacementPosterForCollege(selectedCollege);

      downloadPdf(
        response.data,
        `Placement_Poster_${stats.college_name.replace(/\s+/g, '_')}_${
          stats.placement_year_start
        }-${stats.placement_year_end}_${new Date().toISOString().split('T')[0]}.pdf`,
      );

      toast.dismiss(loadingToast);
      toast.success('Placement poster generated successfully!');
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to generate placement poster';
      toast.error(errorMsg);
      console.error('Poster generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (showSkeleton) return <PosterSkeleton layout={deviceType} />;

  return (
    <PosterBody
      layout={deviceType}
      colleges={colleges}
      selectedCollege={selectedCollege}
      onSelectCollege={setSelectedCollege}
      selectedColleges={selectedColleges}
      onToggleCollege={handleToggleCollege}
      onSelectAll={handleSelectAll}
      multiSelectMode={multiSelectMode}
      onToggleMode={toggleMultiSelectMode}
      stats={stats}
      loadingStats={loadingStats}
      onRefreshStats={handleRefreshStats}
      generating={generating}
      onGenerate={handleGeneratePoster}
    />
  );
}
