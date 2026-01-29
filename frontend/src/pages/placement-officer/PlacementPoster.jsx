import { useState, useEffect } from 'react';
import { placementOfficerAPI } from '../../services/api';
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
  Calendar,
  RefreshCw,
} from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import GlassCard from '../../components/GlassCard';
import GlassStatCard from '../../components/GlassStatCard';
import GlassButton from '../../components/GlassButton';
import SectionHeader from '../../components/SectionHeader';

export default function PlacementPoster() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchStats(false);
  }, []);

  const fetchStats = async (showToast = true) => {
    try {
      setLoading(true);
      const response = await placementOfficerAPI.getPlacementPosterStats();
      setStats(response.data.data);
      if (showToast) {
        toast.success('Statistics refreshed successfully');
      }
    } catch (error) {
      toast.error('Failed to load placement poster statistics');
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStats = async () => {
    await fetchStats(true);
  };

  const handleGeneratePoster = async () => {
    if (!stats) {
      toast.error('No placement data available');
      return;
    }

    if (stats.total_students_placed === 0) {
      toast.error('No students placed yet. Cannot generate poster.');
      return;
    }

    if (!stats.college_logo_url) {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4 mx-auto"></div>
          <p className="text-gray-600 font-medium">Loading placement statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600">Unable to load placement statistics.</p>
        </GlassCard>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Students Placed',
      value: stats.total_students_placed || 0,
      icon: Users,
      gradient: 'from-green-500 to-emerald-600',
      description: 'Total students placed',
    },
    {
      title: 'Companies',
      value: stats.total_companies || 0,
      icon: Building2,
      gradient: 'from-blue-500 to-indigo-600',
      description: 'Recruiting companies',
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
  ];

  const isReady = stats.total_students_placed > 0;
  const hasLogo = stats.college_logo_url !== null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <DashboardHeader
          icon={FileImage}
          title="Placement Poster Generator"
          subtitle={`${stats.college_name} - Academic Year ${stats.placement_year_start}-${stats.placement_year_end}`}
        />
        <button
          onClick={handleRefreshStats}
          disabled={loading}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Stats</span>
        </button>
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
                    : 'College logo is not uploaded. Please upload your college logo from your Profile page.'}
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
                  Automatically determined from student joining dates: {stats.placement_year_start}-
                  {stats.placement_year_end}
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

      {/* Generate Button */}
      <div className="mb-8">
        <GlassCard variant="elevated" className="p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                <FileImage className="mr-3 text-blue-600" size={28} />
                Generate Placement Poster
              </h3>
              <p className="text-gray-600 font-medium">
                Click the button below to generate a professional PDF poster showcasing your
                college's placement achievements. The poster will include student photos, company
                logos, and package details organized by company.
              </p>
              {!hasLogo && (
                <div className="mt-4 flex items-start space-x-2 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={20} />
                  <p className="text-sm text-red-800 font-medium">
                    College logo is required to generate the placement poster. Please upload your
                    college logo from your Profile page before generating.
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
                disabled={!isReady || !hasLogo || generating}
                className="min-w-[200px]"
              >
                {generating ? 'Generating...' : 'Generate Poster'}
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      </div>

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
                <span>Each student appears with their photo, name, and branch</span>
              </li>
              <li className="flex items-start bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-300">
                <span className="mr-3 text-blue-600 text-xl">•</span>
                <span>The PDF is professionally formatted with your college branding</span>
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
