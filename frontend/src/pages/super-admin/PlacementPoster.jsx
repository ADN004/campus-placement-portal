import { useState, useEffect } from 'react';
import { superAdminAPI, commonAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  FileImage,
  Download,
  Users,
  Briefcase,
  TrendingUp,
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  School,
  RefreshCw,
} from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';
import GlassStatCard from '../../components/GlassStatCard';
import GlassButton from '../../components/GlassButton';
import SectionHeader from '../../components/SectionHeader';
import useSkeleton from '../../hooks/useSkeleton';
import AnimatedSection from '../../components/animation/AnimatedSection';
import FormPageSkeleton from '../../components/skeletons/FormPageSkeleton';

export default function PlacementPoster() {
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
    setSelectedColleges((prev) => {
      if (prev.includes(collegeId)) {
        return prev.filter((id) => id !== collegeId);
      } else {
        return [...prev, collegeId];
      }
    });
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
    setSelectedColleges([]);
    setSelectedCollege('');
    setStats(null);
  };

  const handleGeneratePoster = async () => {
    if (multiSelectMode) {
      // Multi-college mode
      if (selectedColleges.length === 0) {
        toast.error('Please select at least one college');
        return;
      }

      try {
        setGenerating(true);
        const loadingToast = toast.loading(
          `Generating combined placement poster for ${selectedColleges.length} college(s)...`
        );

        const response = await superAdminAPI.generateMultiCollegePlacementPoster(selectedColleges);

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `Multi_College_Placement_Poster_${selectedColleges.length}_Colleges_${
          new Date().toISOString().split('T')[0]
        }.pdf`;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        toast.dismiss(loadingToast);
        toast.success(
          `Combined placement poster for ${selectedColleges.length} college(s) generated successfully!`
        );
      } catch (error) {
        console.error('Generate multi-college poster error:', error);
        const errorMsg =
          error.response?.data?.message || 'Failed to generate multi-college placement poster';
        toast.error(errorMsg);
      } finally {
        setGenerating(false);
      }
    } else {
      // Single college mode
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
    }
  };

  if (showSkeleton) return <FormPageSkeleton hasSidebar={false} />;

  const statCards = stats
    ? [
        {
          title: 'Students Placed',
          value: stats.total_students_placed || 0,
          icon: Users,
          gradient: 'from-green-500 to-emerald-600',
          description: 'Total students placed',
        },
        {
          title: 'Companies',
          value: stats.recruiting_companies || stats.total_companies || 0,
          icon: Building2,
          gradient: 'from-blue-500 to-indigo-600',
          description: `Recruiting companies${stats.total_companies ? ` (${stats.total_companies} placed)` : ''}`,
        },
        {
          title: 'Highest Package',
          value: stats.highest_package ? `${stats.highest_package} LPA` : 'N/A',
          icon: TrendingUp,
          gradient: 'from-purple-500 to-pink-600',
          description: 'Best offer received',
        },
        {
          title: 'Average Package',
          value: stats.average_package ? `${stats.average_package} LPA` : 'N/A',
          icon: DollarSign,
          gradient: 'from-orange-500 to-red-600',
          description: 'Mean package',
        },
      ]
    : [];

  const isReady = stats && stats.total_students_placed > 0;
  const hasLogo = stats && stats.college_logo_url !== null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <AnimatedSection delay={0}>
        <DashboardHeader
          icon={FileImage}
          title="Placement Poster Generator"
          subtitle="Generate professional placement posters for any college"
        />
      </AnimatedSection>

      {/* College Selection */}
      <AnimatedSection delay={0.08}>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="Select College(s)" icon={School} />
          <button
            onClick={toggleMultiSelectMode}
            className={`px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${
              multiSelectMode
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                : 'bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700'
            }`}
          >
            {multiSelectMode ? 'Single College Mode' : 'Multi-College Mode'}
          </button>
        </div>

        <GlassCard variant="elevated" className="p-6">
          {!multiSelectMode ? (
            // Single College Selection Mode
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-2xl">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Choose a college to view placement statistics and generate poster
                </label>
                <select
                  value={selectedCollege}
                  onChange={(e) => setSelectedCollege(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium bg-white"
                >
                  <option value="">-- Select a College --</option>
                  {colleges.map((college) => (
                    <option key={college.id} value={college.id}>
                      {college.college_name} ({college.college_code})
                    </option>
                  ))}
                </select>
              </div>
              {selectedCollege && (
                <button
                  onClick={handleRefreshStats}
                  disabled={loadingStats}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={18} className={loadingStats ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              )}
            </div>
          ) : (
            // Multi-College Selection Mode
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-bold text-gray-700">
                  Select colleges to generate combined placement poster ({selectedColleges.length} selected)
                </label>
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  {selectedColleges.length === colleges.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
                {colleges.map((college) => (
                  <div
                    key={college.id}
                    onClick={() => handleToggleCollege(college.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 transform hover:scale-102 ${
                      selectedColleges.includes(college.id)
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-300 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedColleges.includes(college.id)}
                        onChange={() => {}}
                        className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{college.college_name}</h4>
                        <p className="text-sm text-gray-600 font-medium">Code: {college.college_code}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      </div>
      </AnimatedSection>

      {/* Loading State */}
      {loadingStats && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="spinner mb-4 mx-auto"></div>
            <p className="text-gray-600 font-medium">Loading placement statistics...</p>
          </div>
        </div>
      )}

      {/* Multi-College Generate Button (only in multi-select mode) */}
      {multiSelectMode && selectedColleges.length > 0 && (
        <AnimatedSection delay={0.24}>
        <div className="mb-8">
          <GlassCard variant="elevated" className="p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                  <FileImage className="mr-3 text-purple-600" size={28} />
                  Generate Combined Placement Poster
                </h3>
                <p className="text-gray-600 font-medium">
                  Click the button below to generate a combined professional PDF poster for{' '}
                  <span className="font-bold text-purple-600">{selectedColleges.length} selected college(s)</span>.
                  Each college's poster pages will be followed by its Excel-type student mapping table.
                </p>
                <div className="mt-4 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                  <p className="text-sm text-purple-800 font-medium">
                    The combined PDF will include: poster pages → Excel mapping table → next college → and so on.
                  </p>
                </div>
              </div>
              <div>
                <GlassButton
                  variant="primary"
                  size="lg"
                  icon={Download}
                  onClick={handleGeneratePoster}
                  disabled={generating}
                  className="min-w-[200px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {generating ? 'Generating...' : `Generate for ${selectedColleges.length} College(s)`}
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>
        </AnimatedSection>
      )}

      {/* Statistics and Content (only show when college is selected and not loading in single mode) */}
      {!multiSelectMode && selectedCollege && !loadingStats && stats && (
        <>
          {/* College Name Banner + Statistics Cards + Checklist + Company Breakdown */}
          <AnimatedSection delay={0.16}>
          {/* College Name Banner */}
          <div className="mb-6">
            <GlassCard variant="elevated" className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <School className="mr-3 text-blue-600" size={32} />
                {stats.college_name}
                <span className="ml-3 text-lg font-medium text-gray-600">
                  - Academic Year {stats.placement_year_start}-{stats.placement_year_end}
                </span>
              </h2>
            </GlassCard>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => (
              <GlassStatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                gradient={stat.gradient}
                description={stat.description}
                index={index}
              />
            ))}
          </div>

          {/* Pre-Generation Checklist */}
          <div className="mb-8">
            <SectionHeader title="Pre-Generation Checklist" icon={CheckCircle} />
            <GlassCard variant="elevated" className="p-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-4 p-4 bg-white rounded-xl border-2 border-gray-200">
                  {hasLogo ? (
                    <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={24} />
                  ) : (
                    <XCircle className="text-red-600 flex-shrink-0 mt-1" size={24} />
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">College Logo</h4>
                    <p className="text-sm text-gray-600 font-medium">
                      {hasLogo
                        ? 'College logo is available and will be included in the poster.'
                        : 'College logo is not available. Upload college logo in College Management section.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-white rounded-xl border-2 border-gray-200">
                  {isReady ? (
                    <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={24} />
                  ) : (
                    <XCircle className="text-red-600 flex-shrink-0 mt-1" size={24} />
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">Placement Data</h4>
                    <p className="text-sm text-gray-600 font-medium">
                      {isReady
                        ? `${stats.total_students_placed} students placed across ${stats.total_companies} companies. Ready to generate poster.`
                        : 'No placement data available. Mark students as "selected" in Job Applicants section to include them in the poster.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-white rounded-xl border-2 border-gray-200">
                  <CheckCircle className="text-blue-600 flex-shrink-0 mt-1" size={24} />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">Placement Year</h4>
                    <p className="text-sm text-gray-600 font-medium">
                      Automatically determined from student joining dates: {stats.placement_year_start}
                      -{stats.placement_year_end}
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Company-wise Breakdown */}
          {stats.company_breakdown && stats.company_breakdown.length > 0 && (
            <div className="mb-8">
              <SectionHeader title="Company-wise Breakdown" icon={Briefcase} />
              <GlassCard variant="elevated" className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      <tr>
                        <th className="px-6 py-4 text-left font-bold">Company Name</th>
                        <th className="px-6 py-4 text-left font-bold">Package (LPA)</th>
                        <th className="px-6 py-4 text-left font-bold">Students Placed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.company_breakdown.map((company, index) => (
                        <tr
                          key={index}
                          className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <td className="px-6 py-4 font-bold text-gray-900">{company.company_name}</td>
                          <td className="px-6 py-4 font-bold text-green-600 text-lg">{company.lpa}</td>
                          <td className="px-6 py-4 font-bold text-blue-600 text-lg">
                            {company.student_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          )}
          </AnimatedSection>

          {/* Generate Button */}
          <AnimatedSection delay={0.24}>
          <div className="mb-8">
            <GlassCard variant="elevated" className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                    <FileImage className="mr-3 text-blue-600" size={28} />
                    Generate Placement Poster
                  </h3>
                  <p className="text-gray-600 font-medium">
                    Click the button below to generate a professional PDF poster showcasing this
                    college's placement achievements. The poster will include student photos, company
                    logos, and package details organized by company.
                  </p>
                  {!hasLogo && (
                    <div className="mt-4 flex items-start space-x-2 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                      <AlertCircle className="text-yellow-600 flex-shrink-0 mt-1" size={20} />
                      <p className="text-sm text-yellow-800 font-medium">
                        Note: The poster will be generated without a college logo. For a professional
                        appearance, please upload the college logo from the College Management section.
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <GlassButton
                    variant="primary"
                    size="lg"
                    icon={Download}
                    onClick={handleGeneratePoster}
                    disabled={!isReady || generating}
                    className="min-w-[200px]"
                  >
                    {generating ? 'Generating...' : 'Generate Poster'}
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          </div>
          </AnimatedSection>
        </>
      )}

      {/* No College Selected or No Data */}
      {!multiSelectMode && !selectedCollege && !loadingStats && (
        <div className="flex items-center justify-center py-12">
          <GlassCard className="p-8 max-w-md text-center">
            <School className="mx-auto mb-4 text-blue-500" size={48} />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Select a College</h2>
            <p className="text-gray-600">Choose a college from the dropdown above to view placement statistics and generate a poster.</p>
          </GlassCard>
        </div>
      )}

      {multiSelectMode && selectedColleges.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <GlassCard className="p-8 max-w-md text-center">
            <School className="mx-auto mb-4 text-purple-500" size={48} />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Select Colleges</h2>
            <p className="text-gray-600">
              Select one or more colleges using the checkboxes above to generate a combined placement poster.
            </p>
          </GlassCard>
        </div>
      )}

      {!multiSelectMode && selectedCollege && !loadingStats && !stats && (
        <div className="flex items-center justify-center py-12">
          <GlassCard className="p-8 max-w-md text-center">
            <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Data Available</h2>
            <p className="text-gray-600">Unable to load placement statistics for this college.</p>
          </GlassCard>
        </div>
      )}

      {/* Information Card */}
      <GlassCard variant="elevated" className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
            <FileImage className="text-white" size={32} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-800 text-2xl mb-4">About Placement Posters</h4>
            <ul className="text-gray-700 space-y-3 font-medium">
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>
                  The poster includes all students with "selected" status and non-zero placement
                  packages
                </span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>Students are grouped by company and sorted by package (highest first)</span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>Each student appears with their photo, name, and branch on the poster pages</span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span className="font-bold text-purple-700">
                  NEW: Excel-type student mapping table is automatically added after poster pages with
                  detailed student information (PRN, Gender, Phone, Email, etc.)
                </span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span className="font-bold text-purple-700">
                  NEW: Multi-College Mode allows generating combined posters for multiple colleges in
                  a single PDF
                </span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>The PDF is professionally formatted with college branding</span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>
                  Update placement details in "Job Eligible Students" section before generating
                </span>
              </li>
            </ul>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
